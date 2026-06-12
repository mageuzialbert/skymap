'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';
import { usePermissions } from '@/lib/permissions-context';
import UsersTable from '@/components/users/UsersTable';
import UserForm, { UserFormData } from '@/components/users/UserForm';
import UserDetailsModal, { RiderUser } from '@/components/users/UserDetailsModal';
import ConfirmDialog from '@/components/common/ConfirmDialog';

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
  permissions?: string[];
  profile_picture_url?: string | null;
  license_number?: string | null;
  vehicle_type_id?: string | null;
}

type ConfirmAction =
  | { kind: 'toggleActive'; user: User }
  | { kind: 'softDelete'; userId: string }
  | { kind: 'hardDelete'; user: User };

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

  const [detailsUser, setDetailsUser] = useState<User | null>(null);

  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

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
    } catch (err) {
      console.error('Error loading users:', err);
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
    } catch (err) {
      console.error('Error loading user permissions:', err);
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

  async function handleEdit(user: User) {
    setEditingUser(user);
    setShowForm(true);
    setDetailsUser(null);
    await loadUserPermissions(user.id);
  }

  function handleView(user: User) {
    setDetailsUser(user);
  }

  function handleAskToggleActive(user: User) {
    setDetailsUser(null);
    setConfirm({ kind: 'toggleActive', user });
  }

  function handleAskDelete(user: User) {
    setDetailsUser(null);
    setConfirm({ kind: 'hardDelete', user });
  }

  function handleAskSoftDelete(userId: string) {
    setConfirm({ kind: 'softDelete', userId });
  }

  async function executeConfirm() {
    if (!confirm) return;
    setConfirmLoading(true);
    try {
      if (confirm.kind === 'toggleActive') {
        const u = confirm.user;
        const response = await fetch(`/api/admin/users/${u.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ active: !u.active }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update status');
        }
      } else if (confirm.kind === 'softDelete') {
        const response = await fetch(`/api/admin/users/${confirm.userId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to deactivate user');
        }
      } else if (confirm.kind === 'hardDelete') {
        const response = await fetch(`/api/admin/users/${confirm.user.id}?hard=true`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete user');
        }
      }
      setConfirm(null);
      loadUsers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setConfirmLoading(false);
    }
  }

  if (loading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Filter to show only STAFF and RIDER users (riders + supporting staff)
  const staffAndRiders = users.filter((u) => u.role === 'STAFF' || u.role === 'RIDER');

  // Build confirm dialog props
  const getConfirmProps = () => {
    if (!confirm) return null;
    if (confirm.kind === 'toggleActive') {
      const u = confirm.user;
      return {
        title: u.active ? 'Deactivate user?' : 'Activate user?',
        message: u.active
          ? `${u.name} will no longer be able to sign in or appear in active lists. You can re-activate them at any time.`
          : `${u.name} will be able to sign in again and appear in active lists.`,
        confirmLabel: u.active ? 'Deactivate' : 'Activate',
        tone: u.active ? ('warning' as const) : ('info' as const),
      };
    }
    if (confirm.kind === 'softDelete') {
      return {
        title: 'Deactivate user?',
        message: 'This user will be marked inactive. They can be reactivated later from this page.',
        confirmLabel: 'Deactivate',
        tone: 'warning' as const,
      };
    }
    return {
      title: `Permanently delete ${confirm.user.name}?`,
      message:
        "This will permanently remove this rider's account, login credentials and profile data. This action cannot be undone.",
      confirmLabel: 'Delete permanently',
      tone: 'danger' as const,
    };
  };

  const confirmProps = getConfirmProps();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Riders & Staff</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage rider accounts, profile photos and license numbers.
          </p>
        </div>
        {!showForm && canCreate && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditingUser(null);
              setEditingPermissions([]);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Add Rider / Staff
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
              className="text-gray-500 hover:text-gray-700 cursor-pointer"
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
        onView={handleView}
        onEdit={canEdit ? handleEdit : undefined}
        onDeactivate={canDelete ? handleAskSoftDelete : undefined}
        showActions={canEdit || canDelete}
      />

      <UserDetailsModal
        isOpen={!!detailsUser}
        user={detailsUser as RiderUser}
        canEdit={canEdit}
        canDelete={canDelete}
        onClose={() => setDetailsUser(null)}
        onEdit={(u) => handleEdit(u as User)}
        onToggleActive={(u) => handleAskToggleActive(u as User)}
        onDelete={(u) => handleAskDelete(u as User)}
      />

      {confirmProps && (
        <ConfirmDialog
          isOpen={!!confirm}
          title={confirmProps.title}
          message={confirmProps.message}
          confirmLabel={confirmProps.confirmLabel}
          tone={confirmProps.tone}
          loading={confirmLoading}
          onConfirm={executeConfirm}
          onCancel={() => !confirmLoading && setConfirm(null)}
        />
      )}
    </div>
  );
}
