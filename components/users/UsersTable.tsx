'use client';

import { Bike, Building2, IdCard, Shield, User } from 'lucide-react';
import { EmptyState, RecordList, RecordRow } from '@/components/common/RecordList';
import { useT } from '@/lib/i18n';
import { ROLE_TINT, activeDot, activeLabelKey, activeText, roleLabel } from '@/lib/userStatus';

interface UserData {
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

interface UsersTableProps {
  users: UserData[];
  onView?: (user: UserData) => void;
  onEdit?: (user: UserData) => void;
  onDeactivate?: (userId: string) => void;
  showActions?: boolean;
}

const roleIcons: Record<string, any> = {
  ADMIN: Shield,
  STAFF: User,
  RIDER: Bike,
  BUSINESS: Building2,
};

/**
 * The people list.
 *
 * Was an eight-column table plus a duplicated `md:hidden` card list, showing
 * the raw role enum and a hardcoded English "Active"/"Inactive". Roles and
 * states now come from `lib/userStatus`, so staff read the same words the
 * person themselves sees on their Account screen.
 */
export default function UsersTable({
  users,
  onView,
  onEdit,
  onDeactivate,
  showActions = true,
}: UsersTableProps) {
  const t = useT();

  if (users.length === 0) {
    return <EmptyState icon={User} title={t('components.users.noneFound')} />;
  }

  return (
    <RecordList>
      {users.map((user) => {
        const Icon = roleIcons[user.role] || User;
        return (
          <RecordRow
            key={user.id}
            onClick={onView ? () => onView(user) : undefined}
            leading={
              user.profile_picture_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.profile_picture_url}
                  alt=""
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                    ROLE_TINT[user.role] || 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
              )
            }
            title={user.name}
            trailing={roleLabel(user.role, t)}
            subtitle={user.phone || user.email}
            meta={
              user.license_number ? (
                <span className="inline-flex items-center gap-1">
                  <IdCard className="h-3.5 w-3.5" />
                  {user.license_number}
                </span>
              ) : undefined
            }
            status={{
              dot: activeDot(user.active),
              text: activeText(user.active),
              label: t(activeLabelKey(user.active)),
            }}
            actions={
              showActions && (
                <>
                  {onView && (
                    <Action onClick={() => onView(user)}>
                      {t('components.users.viewDetails')}
                    </Action>
                  )}
                  {onEdit && (
                    <Action onClick={() => onEdit(user)}>{t('components.users.editUser')}</Action>
                  )}
                  {onDeactivate && user.active && (
                    <Action onClick={() => onDeactivate(user.id)} tone="danger">
                      {t('components.users.deactivate')}
                    </Action>
                  )}
                </>
              )
            }
          />
        );
      })}
    </RecordList>
  );
}

function Action({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[2.25rem] items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
        tone === 'danger'
          ? 'border-red-200 text-red-600 active:bg-red-50'
          : 'border-gray-200 text-gray-700 active:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}
