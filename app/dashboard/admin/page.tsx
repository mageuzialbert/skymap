'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import NavRowList from '@/components/common/NavRowList';
import StatStrip from '@/components/common/StatStrip';
import { getUserRole } from '@/lib/roles';
import { useNavItems } from '@/lib/navItems';
import { useT } from '@/lib/i18n';
import { pageTitle } from '@/lib/ui';

/**
 * The admin hub.
 *
 * It used to be fifteen hand-coloured tiles: a second, hand-maintained copy of
 * the navigation that had drifted from `lib/navItems.ts` - six routes were
 * reachable only from the grid, and Vehicles only from the nav. Both now come
 * from the same list.
 *
 * Home shows the sections an admin works in daily; the full index stays on the
 * Account tab, so the two are not the same screen.
 */
export default function AdminDashboard() {
  const router = useRouter();
  const t = useT();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; active: number; delivered: number } | null>(
    null
  );

  const navItems = useNavItems(role);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch('/api/staff/operations');
      if (!res.ok) return;
      const data = await res.json();
      // The endpoint nests these under `metrics`, and there is no
      // `completedDeliveries` key - it is `completedToday`. Reading them off
      // the root object made all three `undefined`, so the hub showed 0/0/0
      // no matter what the data said.
      setStats({
        total: data.metrics?.totalDeliveries ?? 0,
        active: data.metrics?.activeDeliveries ?? 0,
        delivered: data.metrics?.completedToday ?? 0,
      });
    } catch {
      // The hub still works without today's numbers.
    }
  }, []);

  useEffect(() => {
    (async () => {
      const userRole = await getUserRole();
      if (userRole !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      setLoading(false);
      loadStats();
    })();
  }, [router, loadStats]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageTitle}>{t('admin.dashboard.title')}</h1>
        <p className="mt-1 text-[15px] text-gray-500">{t('admin.dashboard.subtitle')}</p>
      </div>

      {stats && (
        <StatStrip
          stats={[
            {
              label: t('business.rides.status.all'),
              value: stats.total,
              href: '/dashboard/staff/deliveries',
            },
            {
              label: t('business.rides.status.active'),
              value: stats.active,
              href: '/dashboard/staff/deliveries',
            },
            {
              // `completedToday`, not an all-time total - the endpoint has no
              // all-time completed count, so the label has to say "today".
              label: t('staff.dashboard.completedToday'),
              value: stats.delivered,
              href: '/dashboard/staff/deliveries',
            },
          ]}
        />
      )}

      {/* Home is the working sections; Account carries the full index. */}
      <NavRowList
        items={navItems}
        only={['work', 'money', 'people']}
        exclude={new Set(['/dashboard/admin'])}
      />
    </div>
  );
}
