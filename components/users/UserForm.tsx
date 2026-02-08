'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import PermissionSelector from './PermissionSelector';
import { getDefaultPermissions } from '@/lib/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
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
  });

  // Update permissions when role changes (for new users)
  const handleRoleChange = (newRole: 'STAFF' | 'RIDER') => {
    setFormData(prev => ({
      ...prev,
      role: newRole,
      // Reset to default permissions for the new role if this is a new user
      // or if the user has no custom permissions yet
      permissions: !user ? getDefaultPermissions(newRole) : prev.permissions,
    }));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSubmit(formData);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Basic Information Section */}
      <div>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role *
            </label>
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
          disabled={loading}
          className="flex-1 bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? 'Saving...' : user ? 'Update User' : 'Create User'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
