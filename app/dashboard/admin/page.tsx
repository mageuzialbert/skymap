'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Users, BarChart3, Image, FileText, Loader2, Settings, Receipt, CreditCard, MessageSquare, Truck } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import { useRouter } from 'next/navigation';
import { useT } from '@/lib/i18n';

export default function AdminDashboard() {
  const router = useRouter();
  const t = useT();
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
      title: t('admin.cards.businesses.title'),
      description: t('admin.cards.businesses.desc'),
      icon: Building2,
      href: '/dashboard/admin/businesses',
      color: 'bg-blue-500',
    },
    {
      title: t('admin.cards.users.title'),
      description: t('admin.cards.users.desc'),
      icon: Users,
      href: '/dashboard/admin/users',
      color: 'bg-green-500',
    },
    {
      title: t('admin.cards.deliveryPackages.title'),
      description: t('admin.cards.deliveryPackages.desc'),
      icon: Building2,
      href: '/dashboard/admin/delivery-packages',
      color: 'bg-cyan-500',
    },
    {
      title: t('admin.cards.hireVehicles.title'),
      description: t('admin.cards.hireVehicles.desc'),
      icon: Truck,
      href: '/dashboard/admin/hire-vehicles',
      color: 'bg-orange-500',
    },
    {
      title: t('admin.cards.expenseCategories.title'),
      description: t('admin.cards.expenseCategories.desc'),
      icon: FileText,
      href: '/dashboard/admin/expense-categories',
      color: 'bg-pink-500',
    },
    {
      title: t('admin.cards.expenses.title'),
      description: t('admin.cards.expenses.desc'),
      icon: BarChart3,
      href: '/dashboard/admin/expenses',
      color: 'bg-red-500',
    },
    {
      title: t('admin.cards.operations.title'),
      description: t('admin.cards.operations.desc'),
      icon: BarChart3,
      href: '/dashboard/staff/operations',
      color: 'bg-indigo-500',
    },
    {
      title: t('admin.cards.financial.title'),
      description: t('admin.cards.financial.desc'),
      icon: BarChart3,
      href: '/dashboard/staff/financial',
      color: 'bg-emerald-500',
    },
    {
      title: t('admin.cards.sliders.title'),
      description: t('admin.cards.sliders.desc'),
      icon: Image,
      href: '/dashboard/admin/cms/sliders',
      color: 'bg-purple-500',
    },
    {
      title: t('admin.cards.content.title'),
      description: t('admin.cards.content.desc'),
      icon: FileText,
      href: '/dashboard/admin/cms/content',
      color: 'bg-orange-500',
    },
    {
      title: t('admin.cards.companyProfile.title'),
      description: t('admin.cards.companyProfile.desc'),
      icon: Settings,
      href: '/dashboard/admin/company-profile',
      color: 'bg-teal-500',
    },
    {
      title: t('admin.cards.invoices.title'),
      description: t('admin.cards.invoices.desc'),
      icon: Receipt,
      href: '/dashboard/admin/invoices',
      color: 'bg-amber-500',
    },
    {
      title: t('admin.cards.paymentInstructions.title'),
      description: t('admin.cards.paymentInstructions.desc'),
      icon: CreditCard,
      href: '/dashboard/admin/payment-instructions',
      color: 'bg-violet-500',
    },
    {
      title: t('admin.cards.smsTemplates.title'),
      description: t('admin.cards.smsTemplates.desc'),
      icon: MessageSquare,
      href: '/dashboard/admin/sms/templates',
      color: 'bg-sky-500',
    },
    {
      title: t('admin.cards.sendSms.title'),
      description: t('admin.cards.sendSms.desc'),
      icon: MessageSquare,
      href: '/dashboard/admin/sms/send',
      color: 'bg-rose-500',
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.dashboard.title')}</h1>
      <p className="text-gray-600 mb-8">{t('admin.dashboard.subtitle')}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 hover:shadow-lg transition-shadow"
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
