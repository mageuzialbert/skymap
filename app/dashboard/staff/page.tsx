'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Clock, CheckCircle, TrendingUp, Plus, UserCheck, Loader2, Receipt } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import Link from 'next/link';
import DeliveriesTable from '@/components/deliveries/DeliveriesTable';
import { useT } from '@/lib/i18n';

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

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('staff.dashboard.title')}</h1>
        <Link
          href="/dashboard/staff/deliveries?action=create"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('staff.dashboard.createDelivery')}
        </Link>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('staff.dashboard.totalDeliveries')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.totalDeliveries}</p>
            </div>
            <Package className="w-8 h-8 text-primary" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('staff.dashboard.pendingAssignments')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {statusCounts.CREATED || 0}
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('staff.dashboard.inTransit')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {(statusCounts.IN_TRANSIT || 0) + (statusCounts.PICKED_UP || 0)}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('staff.dashboard.completedToday')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.completedToday}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('staff.dashboard.deliveriesByStatus')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="text-center">
              <p className="text-sm text-gray-600 mb-1">{status.replace('_', ' ')}</p>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('staff.dashboard.quickActions')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/staff/invoices/create"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-primary hover:bg-primary/5 transition-colors"
          >
            <Receipt className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-semibold text-gray-900">{t('staff.dashboard.createInvoice')}</h3>
              <p className="text-sm text-gray-600">{t('staff.dashboard.createInvoiceDesc')}</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('staff.dashboard.recentDeliveries')}</h2>
          <Link
            href="/dashboard/staff/deliveries"
            className="text-primary hover:text-primary-dark text-sm"
          >
            {t('staff.dashboard.viewAll')}
          </Link>
        </div>
        <DeliveriesTable
          deliveries={recentDeliveries}
          showBusiness={true}
          showActions={false}
        />
      </div>
    </div>
  );
}
