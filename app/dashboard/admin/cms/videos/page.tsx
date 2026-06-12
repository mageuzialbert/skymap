'use client';

import { useEffect, useState, useRef } from 'react';
import { Plus, X, Loader2, Upload, Video as VideoIcon, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface HomeVideo {
  id: string;
  title: string | null;
  video_url: string;
  poster_url: string | null;
  order_index: number;
  active: boolean;
}

const VIDEO_BUCKET = 'home-videos';
const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_VIDEO = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

async function readError(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `Request failed (HTTP ${response.status})`;
  try {
    return JSON.parse(text)?.error || `Request failed (HTTP ${response.status})`;
  } catch {
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
}

// Upload a file directly to Supabase Storage (bypasses Next.js body limits).
async function uploadToBucket(file: File, prefix: string): Promise<string> {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
  const fileName = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from(VIDEO_BUCKET)
    .upload(fileName, file, { upsert: false, contentType: file.type });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(fileName);
  return data.publicUrl;
}

export default function AdminVideosPage() {
  const [videos, setVideos] = useState<HomeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HomeVideo | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    video_url: '',
    poster_url: '',
    order_index: 0,
    active: true,
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [posterFile, setPosterFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  async function loadVideos() {
    try {
      const res = await fetch('/api/admin/cms/videos');
      if (!res.ok) throw new Error(await readError(res));
      setVideos(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormData({ title: '', video_url: '', poster_url: '', order_index: videos.length, active: true });
    setVideoFile(null);
    setPosterFile(null);
    setError('');
  }

  function startEdit(v: HomeVideo) {
    setEditing(v);
    setFormData({
      title: v.title || '',
      video_url: v.video_url,
      poster_url: v.poster_url || '',
      order_index: v.order_index,
      active: v.active,
    });
    setVideoFile(null);
    setPosterFile(null);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      let videoUrl = formData.video_url;
      let posterUrl = formData.poster_url;

      if (videoFile) {
        setUploading(true);
        videoUrl = await uploadToBucket(videoFile, 'video');
      }
      if (posterFile) {
        setUploading(true);
        posterUrl = await uploadToBucket(posterFile, 'poster');
      }
      setUploading(false);

      if (!videoUrl) throw new Error('Please upload a video file');

      const payload = {
        title: formData.title || null,
        video_url: videoUrl,
        poster_url: posterUrl || null,
        order_index: formData.order_index,
        active: formData.active,
      };

      const res = editing
        ? await fetch(`/api/admin/cms/videos/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/cms/videos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await readError(res));

      resetForm();
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save video');
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this video?')) return;
    try {
      const res = await fetch(`/api/admin/cms/videos/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      loadVideos();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete video');
    }
  }

  function pickVideo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_VIDEO.includes(file.type)) {
      setError('Unsupported video type (use MP4, WebM, OGG, MOV)');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      setError('Video exceeds 500MB');
      return;
    }
    setError('');
    setVideoFile(file);
  }

  function pickPoster(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_IMAGE.includes(file.type)) {
      setError('Unsupported poster type (use JPEG, PNG, WebP)');
      return;
    }
    setError('');
    setPosterFile(file);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Landing Videos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Videos play first on the home page; the image slideshow shows when no video is set.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Add Video
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">{editing ? 'Edit Video' : 'Add New Video'}</h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-2 -mr-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Video file */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Video File *</label>
              {(videoFile || formData.video_url) && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                  <VideoIcon className="w-4 h-4 text-primary" />
                  <span className="truncate">{videoFile ? videoFile.name : formData.video_url}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg hover:border-primary hover:bg-primary/5 text-gray-600 hover:text-primary transition-colors w-full justify-center"
              >
                <Upload className="w-4 h-4" />
                {videoFile || formData.video_url ? 'Replace video' : 'Upload video (MP4, WebM — max 500MB)'}
              </button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                onChange={pickVideo}
                className="hidden"
              />
            </div>

            {/* Poster */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Poster Image (optional)</label>
              {(posterFile || formData.poster_url) && (
                <div className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  <span className="truncate">{posterFile ? posterFile.name : formData.poster_url}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => posterInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                {posterFile || formData.poster_url ? 'Replace poster' : 'Upload poster'}
              </button>
              <input
                ref={posterInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={pickPoster}
                className="hidden"
              />
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title (optional)</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Promo video"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            {/* Order + Active */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
                </label>
              </div>
            </div>

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
                disabled={submitting || uploading || (!videoFile && !formData.video_url)}
                className="flex-1 sm:flex-none bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {(submitting || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
                {uploading ? 'Uploading…' : submitting ? 'Saving…' : 'Save Video'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md divide-y divide-gray-200">
        {videos.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <VideoIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No videos yet. The image slideshow will be shown.</p>
          </div>
        ) : (
          videos.map((v) => (
            <div key={v.id} className="p-4 flex gap-4 items-center">
              <div className="w-28 h-16 rounded-lg overflow-hidden bg-gray-900 flex-shrink-0 flex items-center justify-center">
                {v.poster_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.poster_url} alt={v.title || 'Video'} className="w-full h-full object-cover" />
                ) : (
                  <VideoIcon className="w-6 h-6 text-white/70" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500">#{v.order_index}</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      v.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {v.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-900 truncate">{v.title || 'Untitled video'}</p>
                <div className="flex gap-4 mt-2">
                  <button
                    onClick={() => startEdit(v)}
                    className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
