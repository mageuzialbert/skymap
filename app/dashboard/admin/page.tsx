'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, BarChart3, Image, FileText, Loader2, Settings, Receipt, CreditCard } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'ADMIN') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      setLoading(false);
    }
    checkRole();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const adminCards = [
    {
      title: 'Manage Businesses',
      description: 'View and manage all registered businesses',
      icon: Building2,
      href: '/dashboard/admin/businesses',
      color: 'bg-blue-500',
    },
    {
      title: 'Manage Users',
      description: 'View and manage all system users',
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'bg-green-500',
    },
    {
      title: 'Delivery Packages',
      description: 'Manage delivery fee packages',
      icon: Building2,
      href: '/dashboard/admin/delivery-packages',
      color: 'bg-cyan-500',
    },
    {
      title: 'Expense Categories',
      description: 'Manage expense categories',
      icon: FileText,
      href: '/dashboard/admin/expense-categories',
      color: 'bg-pink-500',
    },
    {
      title: 'Expenses',
      description: 'Track and manage platform expenses',
      icon: BarChart3,
      href: '/dashboard/admin/expenses',
      color: 'bg-red-500',
    },
    {
      title: 'Operations',
      description: 'View operations dashboard and metrics',
      icon: BarChart3,
      href: '/dashboard/staff/operations',
      color: 'bg-indigo-500',
    },
    {
      title: 'Financial Analytics',
      description: 'View revenue, expenses, profit, and financial data',
      icon: BarChart3,
      href: '/dashboard/staff/financial',
      color: 'bg-emerald-500',
    },
    {
      title: 'CMS - Sliders',
      description: 'Manage landing page slider images',
      icon: Image,
      href: '/dashboard/admin/cms/sliders',
      color: 'bg-purple-500',
    },
    {
      title: 'CMS - Content',
      description: 'Edit About Us and other CMS content',
      icon: FileText,
      href: '/dashboard/admin/cms/content',
      color: 'bg-orange-500',
    },
    {
      title: 'Company Profile',
      description: 'Manage company logo, contact info, and details',
      icon: Settings,
      href: '/dashboard/admin/company-profile',
      color: 'bg-teal-500',
    },
    {
      title: 'Invoice Management',
      description: 'View, create, and manage invoices and proforma invoices',
      icon: Receipt,
      href: '/dashboard/admin/invoices',
      color: 'bg-amber-500',
    },
    {
      title: 'Payment Instructions',
      description: 'Configure payment instructions for invoices',
      icon: CreditCard,
      href: '/dashboard/admin/payment-instructions',
      color: 'bg-violet-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-600 mb-8">Manage your logistics platform</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-start space-x-4">
              <div className={`${card.color} p-3 rounded-lg`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {card.title}
                </h3>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
