'use client';

import { useState, useRef, useEffect } from 'react';
import { Loader2, ImagePlus, X, User as UserIcon, IdCard, Bike } from 'lucide-react';
import PermissionSelector from './PermissionSelector';
import { getDefaultPermissions } from '@/lib/permissions';
import { supabase } from '@/lib/supabase';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  profile_picture_url?: string | null;
  license_number?: string | null;
  vehicle_type_id?: string | null;
}

interface VehicleTypeOption {
  id: string;
  name: string;
  active: boolean;
}

interface UserFormProps {
  user?: User | null;
  initialPermissions?: string[];
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel: () => void;
  loading: boolean;
  error: string;
}

export interface UserFormData {
  name: string;
  email: string;
  phone: string;
  password?: string;
  role: 'STAFF' | 'RIDER';
  active: boolean;
  permissions: string[];
  profile_picture_url?: string | null;
  license_number?: string | null;
  vehicle_type_id?: string | null;
}

export default function UserForm({
  user,
  initialPermissions,
  onSubmit,
  onCancel,
  loading,
  error,
}: UserFormProps) {
  const initialRole = (user?.role as 'STAFF' | 'RIDER') || 'STAFF';

  const [formData, setFormData] = useState<UserFormData>({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    password: '',
    role: initialRole,
    active: user?.active ?? true,
    permissions: initialPermissions || getDefaultPermissions(initialRole),
    profile_picture_url: user?.profile_picture_url || null,
    license_number: user?.license_number || '',
    vehicle_type_id: user?.vehicle_type_id || null,
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<VehicleTypeOption[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load vehicle types so a rider can be assigned a means of transport.
  useEffect(() => {
    fetch('/api/admin/vehicles')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: VehicleTypeOption[]) => setVehicleTypes(Array.isArray(data) ? data : []))
      .catch(() => setVehicleTypes([]));
  }, []);

  const handleRoleChange = (newRole: 'STAFF' | 'RIDER') => {
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      permissions: !user ? getDefaultPermissions(newRole) : prev.permissions,
      // Clear rider-only fields if switching away from RIDER
      license_number: newRole === 'RIDER' ? prev.license_number : '',
      vehicle_type_id: newRole === 'RIDER' ? prev.vehicle_type_id : null,
    }));
  };

  const handlePictureSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image must be smaller than 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please choose an image file');
      return;
    }

    setUploadError('');
    setUploading(true);
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('user-profiles')
        .upload(fileName, file, { upsert: false });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data } = supabase.storage.from('user-profiles').getPublicUrl(fileName);
      setFormData((prev) => ({ ...prev, profile_picture_url: data.publicUrl }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemovePicture = () => {
    setFormData((prev) => ({ ...prev, profile_picture_url: null }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(formData);
  }

  const isRider = formData.role === 'RIDER';

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Profile picture */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Profile Picture</h3>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border border-gray-200 bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
            {formData.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={formData.profile_picture_url}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-8 h-8 text-gray-400" />
            )}
          </div>
          <div className="flex-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePictureSelect}
              className="hidden"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || loading}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-4 h-4" />
                    {formData.profile_picture_url ? 'Change photo' : 'Upload photo'}
                  </>
                )}
              </button>
              {formData.profile_picture_url && (
                <button
                  type="button"
                  onClick={handleRemovePicture}
                  disabled={uploading || loading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Remove
                </button>
              )}
            </div>
            <p className="mt-1.5 text-xs text-gray-500">PNG, JPG or WEBP. Max 5MB.</p>
            {uploadError && (
              <p className="mt-1 text-xs text-red-600">{uploadError}</p>
            )}
          </div>
        </div>
      </div>

      {/* Basic Information Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
              placeholder="+255759561311"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {!user ? '*' : ''}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!user}
              minLength={6}
              placeholder={user ? 'Leave empty to keep current password' : 'Minimum 6 characters'}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {user && (
              <p className="mt-1 text-xs text-gray-500">Leave empty to keep current password</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
            <select
              value={formData.role}
              onChange={(e) => handleRoleChange(e.target.value as 'STAFF' | 'RIDER')}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="STAFF">Staff</option>
              <option value="RIDER">Rider</option>
            </select>
          </div>

          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          {/* License number (rider only) */}
          {isRider && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rider License Number
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.license_number || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, license_number: e.target.value })
                  }
                  placeholder="e.g. TZ-LIC-12345678"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent font-mono"
                />
              </div>
            </div>
          )}

          {/* Vehicle type / means of transport (rider only) */}
          {isRider && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Means of Transport
              </label>
              <div className="relative">
                <Bike className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={formData.vehicle_type_id || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicle_type_id: e.target.value || null })
                  }
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="">Select vehicle type…</option>
                  {vehicleTypes
                    .filter((vt) => vt.active || vt.id === formData.vehicle_type_id)
                    .map((vt) => (
                      <option key={vt.id} value={vt.id}>
                        {vt.name}
                      </option>
                    ))}
                </select>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Determines which ride requests this rider can be assigned to.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Permissions Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">
          Access Permissions
          <span className="text-gray-500 font-normal ml-2">
            (Configure what this user can see and do)
          </span>
        </h3>
        <PermissionSelector
          role={formData.role}
          selectedPermissions={formData.permissions}
          onChange={(permissions) => setFormData({ ...formData, permissions })}
          disabled={loading}
        />
      </div>

      {/* Form Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <button
          type="submit"
          disabled={loading || uploading}
          className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
