'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Clock, CheckCircle, Receipt, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { cardClass } from '@/lib/ui';

interface DashboardStats {
  totalDeliveries: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  totalInvoices: number;
  unpaidInvoices: number;
}

/**
 * Client stat cards (deliveries + invoices) - shown at the top of the Ride
 * History page. Loads its own counts so it can be dropped in anywhere.
 */
export default function OverviewStats() {
  const t = useT();
  const [stats, setStats] = useState<DashboardStats>({
    totalDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    totalInvoices: 0,
    unpaidInvoices: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: businessData } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!businessData) return;
        const businessId = businessData.id;

        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('status')
          .eq('business_id', businessId);
        if (deliveries) {
          setStats((prev) => ({
            ...prev,
            totalDeliveries: deliveries.length,
            pendingDeliveries: deliveries.filter((d) => !['DELIVERED', 'FAILED'].includes(d.status)).length,
            completedDeliveries: deliveries.filter((d) => d.status === 'DELIVERED').length,
          }));
        }

        const { data: invoices } = await supabase
          .from('invoices')
          .select('status')
          .eq('business_id', businessId);
        if (invoices) {
          setStats((prev) => ({
            ...prev,
            totalInvoices: invoices.length,
            unpaidInvoices: invoices.filter((i) => i.status !== 'PAID').length,
          }));
        }
      } catch (error) {
        console.error('Error loading stats:', error);
      }
    }
    load();
  }, []);

  const cards = [
    { title: t('business.overview.totalDeliveries'), value: stats.totalDeliveries, icon: Package, tint: 'bg-primary/10 text-primary', href: '/dashboard/business/rides' },
    { title: t('business.overview.pendingDeliveries'), value: stats.pendingDeliveries, icon: Clock, tint: 'bg-amber-100 text-amber-700', href: '/dashboard/business/rides' },
    { title: t('business.overview.completedDeliveries'), value: stats.completedDeliveries, icon: CheckCircle, tint: 'bg-emerald-100 text-emerald-700', href: '/dashboard/business/rides' },
    { title: t('business.overview.totalInvoices'), value: stats.totalInvoices, icon: Receipt, tint: 'bg-primary/10 text-primary', href: '/dashboard/business/invoices' },
    { title: t('business.overview.unpaidInvoices'), value: stats.unpaidInvoices, icon: AlertTriangle, tint: 'bg-rose-100 text-rose-700', href: '/dashboard/business/invoices' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 mb-6">
      {cards.map((card) => (
        <Link key={card.title} href={card.href} className={`${cardClass} p-4 transition-shadow hover:shadow-md`}>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs text-gray-500 mb-1 truncate">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            </div>
            <div className={`${card.tint} w-10 h-10 rounded-2xl flex items-center justify-center shrink-0`}>
              <card.icon className="w-5 h-5" />
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
