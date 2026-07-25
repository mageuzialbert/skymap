'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/lib/permissions-context';
import BusinessForm, { BusinessFormData } from '@/components/businesses/BusinessForm';
import { useT } from '@/lib/i18n';

export default function RiderRegisterBusinessPage() {
  const t = useT();
  const router = useRouter();
  const { role, hasPermission, loading: permissionsLoading } = usePermissions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check permissions
  const canAccess = role === 'ADMIN' || role === 'RIDER' && hasPermission('businesses.create');

  useEffect(() => {
    if (permissionsLoading) return;
    
    if (!canAccess) {
      router.push('/dashboard/rider');
      return;
    }
  }, [canAccess, permissionsLoading, router]);

  async function handleCreateBusiness(data: BusinessFormData) {
    setSubmitting(true);
    setError('');

    try {
      const createData: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        address: data.address || null,
        latitude: data.latitude,
        longitude: data.longitude,
        district_id: data.district_id,
      };

      if (data.delivery_fee.trim()) {
        const fee = parseFloat(data.delivery_fee);
        if (isNaN(fee) || fee < 0) {
          throw new Error(t('rider.registerBusiness.feePositive'));
        }
        createData.delivery_fee = fee;
      }

      const response = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('rider.registerBusiness.failed'));
      }

      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/rider');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rider.registerBusiness.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('rider.registerBusiness.registered')}</h2>
        <p className="text-gray-600">{t('rider.registerBusiness.successMsg')}</p>
        <p className="text-gray-500 text-sm mt-2">{t('rider.registerBusiness.redirecting')}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/rider"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('rider.registerBusiness.backToDashboard')}
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{t('rider.registerBusiness.title')}</h1>
        <p className="text-gray-600 mt-1">{t('rider.registerBusiness.subtitle')}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <BusinessForm
          onSubmit={handleCreateBusiness}
          onCancel={() => router.push('/dashboard/rider')}
          loading={submitting}
          error={error}
        />
      </div>
    </div>
  );
}
