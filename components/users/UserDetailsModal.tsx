'use client';

import { useEffect } from 'react';
import {
  X,
  Mail,
  Phone,
  IdCard,
  Calendar,
  Shield,
  Edit,
  Trash2,
  Power,
  PowerOff,
  User as UserIcon,
} from 'lucide-react';

export interface RiderUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  active: boolean;
  created_at: string;
  profile_picture_url?: string | null;
  license_number?: string | null;
}

interface UserDetailsModalProps {
  isOpen: boolean;
  user: RiderUser | null;
  canEdit?: boolean;
  canDelete?: boolean;
  onClose: () => void;
  onEdit?: (user: RiderUser) => void;
  onToggleActive?: (user: RiderUser) => void;
  onDelete?: (user: RiderUser) => void;
}

const roleColors: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
  STAFF: 'bg-blue-100 text-blue-800 border-blue-200',
  RIDER: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  BUSINESS: 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function UserDetailsModal({
  isOpen,
  user,
  canEdit,
  canDelete,
  onClose,
  onEdit,
  onToggleActive,
  onDelete,
}: UserDetailsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* gradient header strip */}
        <div className="relative h-24 bg-gradient-to-br from-primary via-primary-light to-primary-dark">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar overlapping the header */}
        <div className="px-6 -mt-12">
          <div className="relative w-24 h-24 rounded-2xl border-4 border-white bg-gray-100 shadow-lg overflow-hidden">
            {user.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profile_picture_url}
                alt={user.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <UserIcon className="w-10 h-10 text-gray-400" />
              </div>
            )}
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-gray-900 truncate">{user.name || 'Unnamed user'}</h2>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${roleColors[user.role] || roleColors.STAFF}`}
                >
                  <Shield className="w-3 h-3" />
                  {user.role}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                    user.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {user.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="px-6 mt-5 space-y-3">
          <DetailRow icon={Mail} label="Email" value={user.email || '-'} />
          <DetailRow icon={Phone} label="Phone" value={user.phone || '-'} />
          {user.role === 'RIDER' && (
            <DetailRow
              icon={IdCard}
              label="License number"
              value={user.license_number || <span className="text-gray-400 italic">Not provided</span>}
            />
          )}
          <DetailRow icon={Calendar} label="Joined" value={formatDate(user.created_at)} />
        </div>

        {/* Action buttons */}
        <div className="mt-6 px-6 pb-6 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
          {canEdit && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(user)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/15 rounded-lg transition-colors cursor-pointer"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          )}
          {canEdit && onToggleActive && (
            <button
              type="button"
              onClick={() => onToggleActive(user)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer ${
                user.active
                  ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                  : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {user.active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              {user.active ? 'Deactivate' : 'Activate'}
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(user)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}
