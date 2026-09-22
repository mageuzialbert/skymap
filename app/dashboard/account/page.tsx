'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Globe, LogOut } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { getCurrentUser, logout } from '@/lib/auth';
import { getUserRole } from '@/lib/roles';
import {
  useNavItems,
  NAV_GROUP_ORDER,
  NAV_GROUP_LABEL_KEYS,
  NAV_GROUP_TINTS,
  NAV_PRIMARY_TINT,
  type NavItem,
} from '@/lib/navItems';
import { useI18n, LOCALES } from '@/lib/i18n';
import { cardClass } from '@/lib/ui';

const KNOWN_ROLES = ['BUSINESS', 'RIDER', 'STAFF', 'ADMIN'];

/** Two letters for the avatar: initials of a business name, or the first two
 *  characters of an email's local part. */
function initialsOf(name: string): string {
  const base = name.split('@')[0].replace(/[_.-]+/g, ' ').trim();
  if (!base) return '?';
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Row({ item, tint }: { item: NavItem; tint: string }) {
  return (
    <Link
      href={item.href}
      className="flex min-h-[3.5rem] items-center gap-3 px-4 transition-colors hover:bg-gray-50 active:bg-gray-100"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <item.icon className="h-[18px] w-[18px]" />
      </span>
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">
        {item.label}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
    </Link>
  );
}

/** Hairline between rows, inset to start under the label like a native list. */
function RowDivider() {
  return <span className="ml-[3.25rem] block h-px bg-gray-100" />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2 ml-1 text-[13px] font-semibold text-gray-500">{children}</h2>;
}

/**
 * Everything that is not Home or Activity. With the sidebar gone this is the
 * only route to the rest of the app, so it has to work for every role -
 * particularly ADMIN and STAFF, who have no profile page of their own and can
 * see a dozen destinations here. Those are grouped into sections, and the chip
 * colour marks the section rather than cycling by position.
 */
export default function AccountPage() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [confirmingSignOut, setConfirmingSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const navItems = useNavItems(role);

  useEffect(() => {
    let active = true;
    (async () => {
      const current = await getCurrentUser();
      if (!active) return;
      setUser(current);
      const r = await getUserRole();
      if (active) setRole(r);
    })();
    return () => {
      active = false;
    };
  }, []);

  // The two destinations that already have their own tab.
  const tabHrefs = new Set(
    [
      role === 'BUSINESS'
        ? '/dashboard/business/request-ride'
        : role === 'RIDER'
          ? '/dashboard/rider'
          : role === 'STAFF'
            ? '/dashboard/staff'
            : '/dashboard/admin',
      role === 'BUSINESS'
        ? '/dashboard/business/rides'
        : role === 'RIDER'
          ? '/dashboard/rider/jobs'
          : '/dashboard/staff/deliveries',
    ].filter(Boolean) as string[]
  );
  const items = navItems.filter((i) => !tabHrefs.has(i.href));

  // Ungrouped items are the role's most-used destination and sit on their own
  // above the sections. "Your account" is always rendered last, with the
  // language row in it, so preferences have a home for every role.
  const ungrouped = items.filter((i) => !i.group);
  const grouped = items.reduce<Record<string, NavItem[]>>((acc, i) => {
    if (!i.group) return acc;
    (acc[i.group] ||= []).push(i);
    return acc;
  }, {});
  const sections = NAV_GROUP_ORDER.filter((g) => g !== 'account' && grouped[g]?.length);
  const accountItems = grouped.account || [];

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // Sign-out failing shouldn't strand the user on a dead screen; the login
      // page will bounce them back if the session somehow survived.
    }
    router.push('/login');
  };

  const displayName = user?.user_metadata?.business_name || user?.email || '';
  const email = user?.email || '';
  const roleLabel = role ? (KNOWN_ROLES.includes(role) ? t(`account.roles.${role}`) : role) : '';

  return (
    <div className="space-y-6 pb-2">
      {/* Who you are signed in as. The negative margins cancel the dashboard
          layout's own p-4 / sm:p-6 so this panel runs edge to edge and meets
          the app bar - keep them in step if that padding changes. */}
      <header className="-mx-4 -mt-4 rounded-b-3xl bg-primary px-4 pb-7 pt-6 text-white sm:-mx-6 sm:-mt-6 sm:px-6">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/15 font-display text-lg font-bold ring-1 ring-white/25">
              {initialsOf(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-bold leading-tight">
                {displayName || '—'}
              </p>
              {roleLabel && <p className="mt-1 truncate text-sm text-white/85">{roleLabel}</p>}
              {email && email !== displayName && (
                <p className="truncate text-[13px] text-white/70">{email}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex animate-pulse items-center gap-4">
            <span className="h-14 w-14 shrink-0 rounded-full bg-white/15" />
            <div className="min-w-0 flex-1 space-y-2">
              <span className="block h-5 w-40 max-w-full rounded bg-white/15" />
              <span className="block h-4 w-24 rounded bg-white/10" />
            </div>
          </div>
        )}
      </header>

      {ungrouped.length > 0 && (
        <section className={`${cardClass} overflow-hidden`}>
          <ul>
            {ungrouped.map((item, i) => (
              <li key={item.href}>
                <Row item={item} tint={NAV_PRIMARY_TINT} />
                {i < ungrouped.length - 1 && <RowDivider />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {sections.map((g) => (
        <section key={g}>
          <SectionTitle>{t(NAV_GROUP_LABEL_KEYS[g])}</SectionTitle>
          <div className={`${cardClass} overflow-hidden`}>
            <ul>
              {grouped[g].map((item, i) => (
                <li key={item.href}>
                  <Row item={item} tint={NAV_GROUP_TINTS[g]} />
                  {i < grouped[g].length - 1 && <RowDivider />}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ))}

      {/* Your account: the role's own pages, plus preferences. */}
      <section>
        <SectionTitle>{t(NAV_GROUP_LABEL_KEYS.account)}</SectionTitle>
        <div className={`${cardClass} overflow-hidden`}>
          <ul>
            {accountItems.map((item) => (
              <li key={item.href}>
                <Row item={item} tint={NAV_GROUP_TINTS.account} />
                <RowDivider />
              </li>
            ))}
            <li className="flex min-h-[3.5rem] items-center gap-3 px-4">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${NAV_GROUP_TINTS.account}`}
              >
                <Globe className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">
                {t('common.language')}
              </span>
              {/* Both languages fit, so show them: two taps beat a dropdown. */}
              <div className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 p-1">
                {LOCALES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLocale(l.code)}
                    aria-pressed={locale === l.code}
                    aria-label={l.label}
                    className={`rounded-full px-2.5 py-1.5 text-[13px] font-semibold transition-colors ${
                      locale === l.code
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    <span aria-hidden>{l.flag}</span> <span className="uppercase">{l.code}</span>
                  </button>
                ))}
              </div>
            </li>
          </ul>
        </div>
      </section>

      <button
        type="button"
        onClick={() => setConfirmingSignOut(true)}
        className={`${cardClass} flex min-h-[3.5rem] w-full items-center justify-center gap-2 px-4 text-[15px] font-semibold text-red-600 transition-colors hover:bg-red-50 active:bg-red-100`}
      >
        <LogOut className="h-5 w-5" />
        {t('common.logout')}
      </button>

      <p className="pt-1 text-center text-[13px] text-gray-400">{t('common.appName')}</p>

      <ConfirmDialog
        isOpen={confirmingSignOut}
        tone="danger"
        title={t('account.signOutTitle')}
        message={t('account.signOutMessage')}
        confirmLabel={t('common.logout')}
        loading={signingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmingSignOut(false)}
      />
    </div>
  );
}
