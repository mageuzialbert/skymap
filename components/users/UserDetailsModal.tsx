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
import Sheet from '@/components/common/Sheet';
import { useT } from '@/lib/i18n';
import { ROLE_TINT, activeDot, activeLabelKey, activeText, roleLabel } from '@/lib/userStatus';

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
  const t = useT();
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
    new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  return (
    <Sheet open onClose={onClose} title={t('components.userDetails.title')}>
      <div className="p-4">
        <div>
          <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-gray-100">
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
              <h2 className="text-xl font-bold text-gray-900 truncate">{user.name || t('components.userDetails.unnamed')}</h2>
              <div className="mt-1 flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    ROLE_TINT[user.role] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Shield className="h-3 w-3" />
                  {roleLabel(user.role, t)}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${activeText(
                    user.active
                  )}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${activeDot(user.active)}`} />
                  {t(activeLabelKey(user.active))}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detail rows */}
        <div className="px-6 mt-5 space-y-3">
          <DetailRow icon={Mail} label={t('common.email')} value={user.email || '-'} />
          <DetailRow icon={Phone} label={t('components.userDetails.phone')} value={user.phone || '-'} />
          {user.role === 'RIDER' && (
            <DetailRow
              icon={IdCard}
              label={t('components.userDetails.licenseNumber')}
              value={user.license_number || <span className="text-gray-400 italic">{t('components.userDetails.notProvided')}</span>}
            />
          )}
          <DetailRow icon={Calendar} label={t('components.userDetails.joined')} value={formatDate(user.created_at)} />
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
              {t('common.edit')}
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
              {user.active ? t('components.users.deactivate') : t('components.users.activate')}
            </button>
          )}
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(user)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </Sheet>
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100">
        <Icon className="w-4 h-4 text-gray-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] text-gray-500">{label}</p>
        <p className="mt-0.5 break-words text-[15px] font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
