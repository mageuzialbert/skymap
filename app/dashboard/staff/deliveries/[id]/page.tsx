'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { getUserRole } from '@/lib/roles';
import DeliveryDetails from '@/components/deliveries/DeliveryDetails';
import { useT } from '@/lib/i18n';

export default function StaffDeliveryDetailsPage({ params }: { params: { id: string } }) {
  const t = useT();
  const router = useRouter();
  const [delivery, setDelivery] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDelivery() {
      try {
        const userRole = await getUserRole();
        if (userRole !== 'STAFF' && userRole !== 'ADMIN') {
           // Redirect or show not authorized
           router.push('/dashboard/business');
           return;
        }

        const response = await fetch(`/api/staff/deliveries/${params.id}`);
        if (!response.ok) {
            throw new Error('Failed to fetch delivery');
        }
        const data = await response.json();
        setDelivery(data);

      } catch (err) {
        console.error('Error loading delivery:', err);
        setError(t('staff.deliveryDetail.loadFailed'));
      } finally {
        setLoading(false);
      }
    }
    loadDelivery();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !delivery) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">{error || t('staff.deliveryDetail.notFound')}</h2>
        <Link
          href="/dashboard/staff/deliveries"
          className="text-primary hover:underline flex items-center justify-center gap-2"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('staff.deliveryDetail.backToDeliveries')}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/dashboard/staff/deliveries"
        className="-ml-1 inline-flex min-h-[2.75rem] items-center gap-2 px-1 text-[15px] font-medium text-gray-500 transition-colors active:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        {t('staff.deliveryDetail.backToDeliveries')}
      </Link>

      <DeliveryDetails delivery={delivery} />
    </div>
  );
}
