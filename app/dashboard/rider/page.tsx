'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, CheckCircle, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

interface Delivery {
  id: string;
  status: string;
  created_at: string;
  delivered_at: string | null;
}

export default function RiderDashboard() {
  const t = useT();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    assigned: 0,
    inProgress: 0,
    completedToday: 0,
  });
  const [recentDeliveries, setRecentDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'RIDER') {
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
      // Load deliveries
      const response = await fetch('/api/rider/deliveries?limit=10');
      if (response.ok) {
        const deliveries = await response.json();
        setRecentDeliveries(deliveries);

        // Calculate metrics
        const assigned = deliveries.filter((d: Delivery) => d.status === 'ASSIGNED').length;
        const inProgress = deliveries.filter((d: Delivery) => 
          ['PICKED_UP', 'IN_TRANSIT'].includes(d.status)
        ).length;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const completedToday = deliveries.filter((d: Delivery) => 
          d.status === 'DELIVERED' && 
          d.delivered_at && 
          new Date(d.delivered_at) >= today
        ).length;

        setMetrics({
          assigned,
          inProgress,
          completedToday,
        });
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
    <div className="pb-20">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('rider.dashboard.title')}</h1>
        <p className="text-gray-600 mt-1">{t('rider.dashboard.subtitle')}</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('rider.dashboard.assigned')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.assigned}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('rider.dashboard.inProgress')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.inProgress}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('rider.dashboard.completedToday')}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.completedToday}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">{t('rider.dashboard.quickActions')}</h2>
        <Link
          href="/dashboard/rider/jobs"
          className="block w-full bg-primary text-white text-center py-3 px-4 rounded-full hover:bg-primary-dark transition-colors font-medium"
        >
          {t('rider.dashboard.viewAllJobs')}
        </Link>
      </div>

      {/* Recent Deliveries */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">{t('rider.dashboard.recentDeliveries')}</h2>
          <Link
            href="/dashboard/rider/jobs"
            className="text-primary hover:text-primary-dark text-sm"
          >
            {t('rider.dashboard.viewAll')}
          </Link>
        </div>
        {recentDeliveries.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>{t('rider.dashboard.noDeliveries')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentDeliveries.slice(0, 5).map((delivery) => (
              <Link
                key={delivery.id}
                href={`/dashboard/rider/jobs/${delivery.id}`}
                className="block p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {t('rider.dashboard.deliveryNumber', { id: delivery.id.slice(0, 8) })}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(delivery.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      delivery.status === 'ASSIGNED'
                        ? 'bg-blue-100 text-blue-800'
                        : delivery.status === 'PICKED_UP' || delivery.status === 'IN_TRANSIT'
                        ? 'bg-orange-100 text-orange-800'
                        : delivery.status === 'DELIVERED'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {t(`rider.status.${delivery.status}`)}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
