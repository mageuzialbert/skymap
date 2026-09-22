'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import Link from 'next/link';
import DeliveriesTable from '@/components/deliveries/DeliveriesTable';
import StatStrip from '@/components/common/StatStrip';
import { useT } from '@/lib/i18n';
import { pageTitle, pillPrimary, sectionLabel } from '@/lib/ui';

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  pickup_name: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_name: string;
  dropoff_phone: string;
  package_description: string | null;
  status: string;
  assigned_rider_id: string | null;
  created_at: string;
  delivered_at: string | null;
  businesses?: {
    id: string;
    name: string;
    phone: string;
  };
  assigned_rider?: {
    id: string;
    name: string;
    phone: string;
  } | null;
}

export default function StaffDashboard() {
  const t = useT();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalDeliveries: 0,
    activeDeliveries: 0,
    todayDeliveries: 0,
    completedToday: 0,
    avgDeliveryTimeHours: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadDashboardData();
    }
    checkRole();
  }, [router]);

  async function loadDashboardData() {
    try {
      // Load operations data
      const opsResponse = await fetch('/api/staff/operations');
      if (opsResponse.ok) {
        const opsData = await opsResponse.json();
        setMetrics(opsData.metrics);
        setStatusCounts(opsData.statusCounts);
        setRecentDeliveries(opsData.recentDeliveries || []);
      }

      // Load recent deliveries
      const deliveriesResponse = await fetch('/api/staff/deliveries?limit=10');
      if (deliveriesResponse.ok) {
        const deliveriesData = await deliveriesResponse.json();
        setRecentDeliveries(deliveriesData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  // Work that needs a person: unassigned, and awaiting confirmation.
  const needsAssigning = statusCounts['CREATED'] || 0;
  const awaiting = statusCounts['PENDING_CONFIRMATION'] || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className={pageTitle}>{t('staff.dashboard.title')}</h1>
        <Link href="/dashboard/staff/deliveries?action=create" className={pillPrimary}>
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{t('staff.dashboard.createDelivery')}</span>
        </Link>
      </div>

      {/* The queues a dispatcher acts on, then the day's totals. The detailed
          breakdown lives on Operations rather than being duplicated here. */}
      <StatStrip
        stats={[
          {
            label: t('components.deliveries.unassigned'),
            value: needsAssigning,
            href: '/dashboard/staff/deliveries',
            tone: needsAssigning > 0 ? 'text-amber-600' : undefined,
          },
          {
            label: t('business.rides.status.pendingConfirmation'),
            value: awaiting,
            href: '/dashboard/staff/deliveries',
            tone: awaiting > 0 ? 'text-amber-600' : undefined,
          },
          {
            label: t('business.rides.status.active'),
            value: metrics.activeDeliveries,
            href: '/dashboard/staff/deliveries',
          },
          {
            label: t('staff.dashboard.completedToday'),
            value: metrics.completedToday,
          },
        ]}
      />

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className={`${sectionLabel} mb-0`}>{t('staff.dashboard.recentDeliveries')}</h2>
          <Link
            href="/dashboard/staff/deliveries"
            className="text-[13px] font-semibold text-primary"
          >
            {t('staff.dashboard.viewAll')}
          </Link>
        </div>
        <DeliveriesTable deliveries={recentDeliveries} showBusiness={true} showActions={false} />
      </section>
    </div>
  );
}
