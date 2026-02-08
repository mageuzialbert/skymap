'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { usePermissions } from '@/lib/permissions-context';
import DeliveryForm, { DeliveryFormData } from '@/components/deliveries/DeliveryForm';

export default function RiderCreateDeliveryPage() {
  const router = useRouter();
  const { role, hasPermission, loading: permissionsLoading } = usePermissions();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Check permissions
  const canAccess = role === 'ADMIN' || role === 'RIDER' && hasPermission('deliveries.create');

  useEffect(() => {
    if (permissionsLoading) return;
    
    if (!canAccess) {
      router.push('/dashboard/rider');
      return;
    }
  }, [canAccess, permissionsLoading, router]);

  async function handleCreateDelivery(data: DeliveryFormData) {
    if (!data.business_id) {
      setError('Please select a business');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/staff/deliveries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create delivery');
      }

      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push('/dashboard/rider');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delivery');
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
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Created!</h2>
        <p className="text-gray-600">Redirecting to dashboard...</p>
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
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create New Delivery</h1>
        <p className="text-gray-600 mt-1">Fill in the details below to create a new delivery order</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <DeliveryForm
          onSubmit={handleCreateDelivery}
          onCancel={() => router.push('/dashboard/rider')}
          loading={submitting}
          error={error}
          showBusinessSelector={true}
          showDeliveryFee={true}
        />
      </div>
    </div>
  );
}
