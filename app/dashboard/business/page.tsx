'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Package, Clock, CheckCircle, Receipt, AlertTriangle, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalDeliveries: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  totalInvoices: number;
  unpaidInvoices: number;
}

export default function BusinessDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    totalInvoices: 0,
    unpaidInvoices: 0,
  });
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Get business info
        const { data: business } = await supabase
          .from('businesses')
          .select('name')
          .eq('user_id', user.id)
          .single();

        if (business) {
          setBusinessName(business.name);
        }

        // Get business ID
        const { data: businessData } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!businessData) return;

        const businessId = businessData.id;

        // Get delivery stats
        const { data: deliveries } = await supabase
          .from('deliveries')
          .select('status')
          .eq('business_id', businessId);

        if (deliveries) {
          const total = deliveries.length;
          const pending = deliveries.filter(
            (d) => !['DELIVERED', 'FAILED'].includes(d.status)
          ).length;
          const completed = deliveries.filter(
            (d) => d.status === 'DELIVERED'
          ).length;

          setStats((prev) => ({
            ...prev,
            totalDeliveries: total,
            pendingDeliveries: pending,
            completedDeliveries: completed,
          }));
        }

        // Get invoice stats
        const { data: invoices } = await supabase
          .from('invoices')
          .select('status')
          .eq('business_id', businessId);

        if (invoices) {
          const total = invoices.length;
          const unpaid = invoices.filter((i) => i.status !== 'PAID').length;

          setStats((prev) => ({
            ...prev,
            totalInvoices: total,
            unpaidInvoices: unpaid,
          }));
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Deliveries',
      value: stats.totalDeliveries,
      icon: Package,
      color: 'bg-blue-500',
      href: '/dashboard/business/deliveries',
    },
    {
      title: 'Pending Deliveries',
      value: stats.pendingDeliveries,
      icon: Clock,
      color: 'bg-yellow-500',
      href: '/dashboard/business/deliveries?status=pending',
    },
    {
      title: 'Completed Deliveries',
      value: stats.completedDeliveries,
      icon: CheckCircle,
      color: 'bg-green-500',
      href: '/dashboard/business/deliveries?status=delivered',
    },
    {
      title: 'Total Invoices',
      value: stats.totalInvoices,
      icon: Receipt,
      color: 'bg-purple-500',
      href: '/dashboard/business/invoices',
    },
    {
      title: 'Unpaid Invoices',
      value: stats.unpaidInvoices,
      icon: AlertTriangle,
      color: 'bg-red-500',
      href: '/dashboard/business/invoices?status=unpaid',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {businessName || 'Business'}!
        </h1>
        <p className="text-gray-600 mt-2">
          Here&apos;s an overview of your delivery operations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{card.title}</p>
                <p className="text-3xl font-bold text-gray-900">{card.value}</p>
              </div>
              <div className={`${card.color} w-12 h-12 rounded-full flex items-center justify-center text-white`}>
                <card.icon className="w-6 h-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/dashboard/business/deliveries?action=create"
            className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded-md hover:bg-primary-dark transition-colors font-medium"
          >
            <Plus className="w-5 h-5" />
            <span>Create New Delivery</span>
          </Link>
          <Link
            href="/dashboard/business/deliveries"
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            View All Deliveries
          </Link>
          <Link
            href="/dashboard/business/invoices"
            className="bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 transition-colors font-medium"
          >
            View Invoices
          </Link>
        </div>
      </div>
    </div>
  );
}
