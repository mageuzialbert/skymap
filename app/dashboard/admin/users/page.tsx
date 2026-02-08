'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import { usePermissions } from '@/lib/permissions-context';
import UsersTable from '@/components/users/UsersTable';
import UserForm, { UserFormData } from '@/components/users/UserForm';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
  permissions?: string[];
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { role: currentRole, hasPermission, hasModuleAccess, loading: permissionsLoading } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  // Check if user can access this page
  const canAccess = currentRole === 'ADMIN' || hasModuleAccess('users');
  const canCreate = currentRole === 'ADMIN' || hasPermission('users.create');
  const canEdit = currentRole === 'ADMIN' || hasPermission('users.update');
  const canDelete = currentRole === 'ADMIN' || hasPermission('users.delete');

  useEffect(() => {
    if (permissionsLoading) return;
    
    if (!canAccess) {
      router.push('/dashboard/business');
      return;
    }
    
    loadUsers();
  }, [canAccess, permissionsLoading, router]);

  async function loadUsers() {
    try {
      const response = await fetch('/api/admin/users?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserPermissions(userId: string) {
    setLoadingPermissions(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setEditingPermissions(data.permissions || []);
      }
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setEditingPermissions([]);
    } finally {
      setLoadingPermissions(false);
    }
  }

  async function handleSubmit(data: UserFormData) {
    setSubmitting(true);
    setError('');

    try {
      if (editingUser) {
        // Update user
        const response = await fetch(`/api/admin/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update user');
        }
      } else {
        // Create user
        const response = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create user');
        }
      }

      setShowForm(false);
      setEditingUser(null);
      setEditingPermissions([]);
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(userId: string) {
    if (!confirm('Are you sure you want to deactivate this user?')) return;

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to deactivate user');
      }

      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to deactivate user');
    }
  }

  async function handleEdit(user: User) {
    setEditingUser(user);
    setShowForm(true);
    // Load user permissions when editing
    await loadUserPermissions(user.id);
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Filter to show only STAFF and RIDER users
  const staffAndRiders = users.filter((u) => u.role === 'STAFF' || u.role === 'RIDER');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        {!showForm && canCreate && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingUser(null);
              setEditingPermissions([]);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create User
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingUser ? 'Edit User' : 'Create New User'}
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setEditingUser(null);
                setEditingPermissions([]);
                setError('');
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {loadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="ml-2 text-gray-600">Loading permissions...</span>
            </div>
          ) : (
            <UserForm
              user={editingUser}
              initialPermissions={editingUser ? editingPermissions : undefined}
              onSubmit={handleSubmit}
              onCancel={() => {
                setShowForm(false);
                setEditingUser(null);
                setEditingPermissions([]);
                setError('');
              }}
              loading={submitting}
              error={error}
            />
          )}
        </div>
      )}

      <UsersTable
        users={staffAndRiders}
        onEdit={canEdit ? handleEdit : undefined}
        onDeactivate={canDelete ? handleDeactivate : undefined}
        showActions={canEdit || canDelete}
      />
    </div>
  );
}
