'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Plus, X, Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Slider {
  id: string;
  image_url: string;
  caption: string | null;
  cta_text: string | null;
  cta_link: string | null;
  order_index: number;
  active: boolean;
}

interface PendingFile {
  file: File;
  previewUrl: string;
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const SLIDER_BUCKET = 'slider-images';

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `Request failed (HTTP ${response.status})`;
  try {
    const data = JSON.parse(text);
    return data?.error || `Request failed (HTTP ${response.status})`;
  } catch {
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
}

export default function AdminSlidersPage() {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSlider, setEditingSlider] = useState<Slider | null>(null);
  const [formData, setFormData] = useState({
    image_url: '',
    caption: '',
    cta_text: '',
    cta_link: '',
    order_index: 0,
    active: true,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // File upload states
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditMode = editingSlider !== null;
  const isBatchMode = !isEditMode && pendingFiles.length > 1;

  useEffect(() => {
    loadSliders();
  }, []);

  // Clean up preview object URLs when component unmounts or files change
  useEffect(() => {
    return () => {
      pendingFiles.forEach((pf) => {
        if (pf.previewUrl.startsWith('blob:')) URL.revokeObjectURL(pf.previewUrl);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSliders() {
    try {
      const response = await fetch('/api/admin/cms/sliders');
      if (!response.ok) throw new Error(await readError(response));
      const data = await response.json();
      setSliders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sliders');
    } finally {
      setLoading(false);
    }
  }

  // Validate and add files to the pending queue
  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      const files = Array.from(incoming);
      if (!files.length) return;

      setError('');

      const valid: PendingFile[] = [];
      const errors: string[] = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          errors.push(`${file.name}: unsupported type (use JPEG, PNG, or WebP)`);
          continue;
        }
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: exceeds 50MB`);
          continue;
        }
        valid.push({ file, previewUrl: URL.createObjectURL(file) });
      }

      setPendingFiles((prev) => {
        const limit = isEditMode ? 1 : MAX_FILES;
        // In edit mode, a new selection replaces the existing one; revoke its URL first.
        if (isEditMode) {
          prev.forEach((pf) => {
            if (pf.previewUrl.startsWith('blob:')) URL.revokeObjectURL(pf.previewUrl);
          });
          return valid.slice(0, 1);
        }
        const next = [...prev, ...valid];
        if (next.length > limit) {
          // Revoke object URLs of overflow files we drop
          next.slice(limit).forEach((pf) => {
            if (pf.previewUrl.startsWith('blob:')) URL.revokeObjectURL(pf.previewUrl);
          });
          errors.push(`Only the first ${limit} images were added (max ${limit} per upload).`);
          return next.slice(0, limit);
        }
        return next;
      });

      if (errors.length) setError(errors.join(' • '));
    },
    [isEditMode]
  );

  const removeFile = (index: number) => {
    setPendingFiles((prev) => {
      const target = prev[index];
      if (target && target.previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Upload a single file directly to Supabase Storage (bypasses Next.js body limits)
  const uploadOne = async (file: File): Promise<string> => {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `slider-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from(SLIDER_BUCKET)
      .upload(fileName, file, { upsert: false, contentType: file.type });

    if (uploadErr) throw new Error(uploadErr.message);

    const { data } = supabase.storage.from(SLIDER_BUCKET).getPublicUrl(fileName);
    return data.publicUrl;
  };

  const clearPendingFiles = () => {
    pendingFiles.forEach((pf) => {
      if (pf.previewUrl.startsWith('blob:')) URL.revokeObjectURL(pf.previewUrl);
    });
    setPendingFiles([]);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      // EDIT MODE — single slider, optional new image
      if (editingSlider) {
        let imageUrl = formData.image_url;
        if (pendingFiles[0]) {
          setUploading(true);
          setUploadProgress({ current: 0, total: 1 });
          imageUrl = await uploadOne(pendingFiles[0].file);
          setUploadProgress({ current: 1, total: 1 });
          setUploading(false);
        }
        if (!imageUrl) throw new Error('Please upload an image');

        const response = await fetch(`/api/admin/cms/sliders/${editingSlider.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, image_url: imageUrl }),
        });
        if (!response.ok) throw new Error(await readError(response));
      } else {
        // CREATE MODE — one or many sliders
        if (pendingFiles.length === 0) throw new Error('Please select at least one image');

        setUploading(true);
        setUploadProgress({ current: 0, total: pendingFiles.length });

        for (let i = 0; i < pendingFiles.length; i++) {
          const url = await uploadOne(pendingFiles[i].file);
          setUploadProgress({ current: i + 1, total: pendingFiles.length });

          const isBatch = pendingFiles.length > 1;
          const response = await fetch('/api/admin/cms/sliders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: url,
              // In batch mode caption/cta would be ambiguous; leave empty so the
              // admin can edit each slider individually afterward.
              caption: isBatch ? null : formData.caption || null,
              cta_text: isBatch ? null : formData.cta_text || null,
              cta_link: isBatch ? null : formData.cta_link || null,
              order_index: formData.order_index + i,
              active: formData.active,
            }),
          });
          if (!response.ok) throw new Error(await readError(response));
        }
        setUploading(false);
      }

      // Reset form
      setShowForm(false);
      setEditingSlider(null);
      setFormData({
        image_url: '',
        caption: '',
        cta_text: '',
        cta_link: '',
        order_index: 0,
        active: true,
      });
      clearPendingFiles();
      loadSliders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save slider');
    } finally {
      setSubmitting(false);
      setUploading(false);
      setUploadProgress({ current: 0, total: 0 });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this slider?')) return;
    try {
      const response = await fetch(`/api/admin/cms/sliders/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await readError(response));
      loadSliders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete slider');
    }
  }

  function startEdit(slider: Slider) {
    setEditingSlider(slider);
    setFormData({
      image_url: slider.image_url,
      caption: slider.caption || '',
      cta_text: slider.cta_text || '',
      cta_link: slider.cta_link || '',
      order_index: slider.order_index,
      active: slider.active,
    });
    clearPendingFiles();
    setShowForm(true);
  }

  function resetForm() {
    setShowForm(false);
    setEditingSlider(null);
    setFormData({
      image_url: '',
      caption: '',
      cta_text: '',
      cta_link: '',
      order_index: sliders.length,
      active: true,
    });
    clearPendingFiles();
    setError('');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Determine what to show in the image area
  const showExistingImage = isEditMode && pendingFiles.length === 0 && formData.image_url;
  const remainingSlots = isEditMode ? 0 : MAX_FILES - pendingFiles.length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Sliders</h1>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Add Slider
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">
              {editingSlider ? 'Edit Slider' : 'Add New Slider'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700 p-2 -mr-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slider Image{isEditMode ? '' : 's'} *
              </label>

              {/* Existing image in edit mode (no new file picked) */}
              {showExistingImage && (
                <div className="relative rounded-xl overflow-hidden bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.image_url}
                    alt="Current"
                    className="w-full h-48 sm:h-64 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <Upload className="w-4 h-4" />
                      Replace
                    </button>
                  </div>
                </div>
              )}

              {/* Selected files grid */}
              {pendingFiles.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {pendingFiles.map((pf, i) => (
                    <div
                      key={`${pf.file.name}-${i}`}
                      className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={pf.previewUrl}
                        alt={pf.file.name}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="absolute top-1.5 right-1.5 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                        <p className="text-[10px] text-white truncate">{pf.file.name}</p>
                      </div>
                    </div>
                  ))}

                  {/* Add more tile (create mode only, while under limit) */}
                  {!isEditMode && remainingSlots > 0 && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-primary hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-1 text-gray-500 hover:text-primary"
                    >
                      <Plus className="w-6 h-6" />
                      <span className="text-xs font-medium">Add more</span>
                      <span className="text-[10px]">{remainingSlots} left</span>
                    </button>
                  )}
                </div>
              )}

              {/* Empty dropzone (no existing image, no pending files) */}
              {!showExistingImage && pendingFiles.length === 0 && (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-8 sm:p-12 text-center cursor-pointer
                    transition-all duration-200 ease-out
                    ${
                      isDragging
                        ? 'border-primary bg-primary/5 scale-[1.02]'
                        : 'border-gray-300 hover:border-primary hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className={`
                        w-14 h-14 rounded-full flex items-center justify-center
                        ${isDragging ? 'bg-primary/20' : 'bg-gray-100'}
                        transition-colors
                      `}
                    >
                      <ImageIcon
                        className={`w-7 h-7 ${isDragging ? 'text-primary' : 'text-gray-400'}`}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {isDragging
                          ? 'Drop image here'
                          : isEditMode
                          ? 'Click to upload or drag and drop'
                          : `Click to upload or drag and drop (up to ${MAX_FILES})`}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">JPEG, PNG or WebP (max 50MB each)</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hidden file input — allows multiple in create mode */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                multiple={!isEditMode}
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Upload progress */}
              {uploading && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600">
                      Uploading {uploadProgress.current} of {uploadProgress.total}…
                    </span>
                    <span className="text-primary font-medium">
                      {uploadProgress.total > 0
                        ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width:
                          uploadProgress.total > 0
                            ? `${(uploadProgress.current / uploadProgress.total) * 100}%`
                            : '0%',
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Batch-mode notice */}
              {isBatchMode && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs">
                  Batch mode: {pendingFiles.length} sliders will be created starting at order{' '}
                  #{formData.order_index}. Captions and CTAs are skipped — you can add them by
                  editing each slider individually after upload.
                </div>
              )}
            </div>

            {/* Caption — single-image only */}
            {!isBatchMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Caption</label>
                <input
                  type="text"
                  value={formData.caption}
                  onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
                  placeholder="Enter slider caption"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                />
              </div>
            )}

            {/* CTA Fields — single-image only */}
            {!isBatchMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CTA Button Text
                  </label>
                  <input
                    type="text"
                    value={formData.cta_text}
                    onChange={(e) => setFormData({ ...formData, cta_text: e.target.value })}
                    placeholder="e.g., Learn More"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CTA Link URL
                  </label>
                  <input
                    type="url"
                    value={formData.cta_link}
                    onChange={(e) => setFormData({ ...formData, cta_link: e.target.value })}
                    placeholder="https://"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                  />
                </div>
              </div>
            )}

            {/* Order and Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isBatchMode ? 'Starting Display Order' : 'Display Order'}
                </label>
                <input
                  type="number"
                  value={formData.order_index}
                  onChange={(e) =>
                    setFormData({ ...formData, order_index: Number(e.target.value) })
                  }
                  min={0}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting ||
                  uploading ||
                  (!editingSlider && pendingFiles.length === 0) ||
                  (editingSlider !== null && pendingFiles.length === 0 && !formData.image_url)
                }
                className="flex-1 sm:flex-none bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {(submitting || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading
                  ? `Uploading ${uploadProgress.current}/${uploadProgress.total}…`
                  : submitting
                  ? 'Saving...'
                  : isBatchMode
                  ? `Save ${pendingFiles.length} Sliders`
                  : 'Save Slider'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Slider List - Card layout for mobile, table for desktop */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Caption</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sliders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No sliders found. Add your first slider!</p>
                  </td>
                </tr>
              ) : (
                sliders.map((slider) => (
                  <tr key={slider.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      #{slider.order_index}
                    </td>
                    <td className="px-6 py-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slider.image_url}
                        alt={slider.caption || 'Slider'}
                        className="w-28 h-16 object-cover rounded-lg"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                      {slider.caption || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          slider.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {slider.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => startEdit(slider)}
                        className="text-primary hover:text-primary-dark mr-4 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(slider.id)}
                        className="text-red-600 hover:text-red-800 transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {sliders.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No sliders found. Add your first slider!</p>
            </div>
          ) : (
            sliders.map((slider) => (
              <div key={slider.id} className="p-4">
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slider.image_url}
                    alt={slider.caption || 'Slider'}
                    className="w-24 h-16 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-500">#{slider.order_index}</span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          slider.active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {slider.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900 truncate">
                      {slider.caption || 'No caption'}
                    </p>
                    <div className="flex gap-4 mt-2">
                      <button
                        onClick={() => startEdit(slider)}
                        className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(slider.id)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
