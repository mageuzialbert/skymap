'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { canWorkRiderJobs, getUserRole } from '@/lib/roles';
import Alert from '@/components/common/Alert';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { usePoll } from '@/lib/usePoll';
import { pageTitle } from '@/lib/ui';
import DeliveryDetails from '@/components/rider/DeliveryDetails';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_name: string;
  pickup_phone: string;
  pickup_region_id: number | null;
  pickup_district_id: number | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_name: string;
  dropoff_phone: string;
  dropoff_region_id: number | null;
  dropoff_district_id: number | null;
  package_description: string | null;
  status: string;
  assigned_rider_id: string | null;
  rider_confirmed_at?: string | null;
  created_at: string;
  delivered_at: string | null;
  businesses?: {
    id: string;
    name: string;
    phone: string;
  };
}

interface DeliveryEvent {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
  created_by?: {
    id: string;
    name: string;
  };
}

export default function RiderJobDetailsPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const deliveryId = params.id as string;
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [events, setEvents] = useState<DeliveryEvent[]>([]);
  const [error, setError] = useState('');
  const [declining, setDeclining] = useState(false);

  const loadDeliveryDetails = useCallback(async () => {
    try {
      const deliveryResponse = await fetch(`/api/rider/deliveries/${deliveryId}`);
      if (deliveryResponse.ok) {
        setDelivery(await deliveryResponse.json());
      } else {
        setError(
          deliveryResponse.status === 404
            ? t('rider.jobDetail.notFound')
            : t('rider.jobDetail.failedLoad')
        );
      }

      // Load delivery events
      const eventsResponse = await fetch(`/api/deliveries/${deliveryId}/events`);
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
      }
    } catch (error) {
      console.error('Error loading delivery details:', error);
      setError(t('rider.jobDetail.failedLoadDetails'));
    } finally {
      setLoading(false);
    }
  }, [deliveryId, t]);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (!canWorkRiderJobs(userRole)) {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadDeliveryDetails();
    }
    checkRole();
  }, [router, deliveryId, loadDeliveryDetails]);

  // A status a dispatcher changes should appear without a reload.
  usePoll(loadDeliveryDetails, 30_000, canWorkRiderJobs(role) && !updating);

  async function handleStatusUpdate(status: string, note: string) {
    setUpdating(true);
    setError('');

    try {
      const response = await fetch(`/api/rider/deliveries/${deliveryId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('rider.jobDetail.failedUpdateStatus'));
      }

      // Reload delivery and events
      await loadDeliveryDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rider.jobDetail.failedUpdateStatus'));
      throw err;
    } finally {
      setUpdating(false);
    }
  }

  async function handleConfirm() {
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`/api/rider/deliveries/${deliveryId}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('rider.jobDetail.failedConfirm'));
      }
      await loadDeliveryDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rider.jobDetail.failedConfirm'));
    } finally {
      setUpdating(false);
    }
  }

  async function handleDecline() {
    setDeclining(false);
    setUpdating(true);
    setError('');
    try {
      const res = await fetch(`/api/rider/deliveries/${deliveryId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('rider.jobDetail.failedDecline'));
      }
      router.push('/dashboard/rider/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rider.jobDetail.failedDecline'));
      setUpdating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !delivery) {
    return (
      <div className="space-y-4">
        <Alert tone="error">{error}</Alert>
        <Link
          href="/dashboard/rider/jobs"
          className="-ml-1 inline-flex min-h-[2.75rem] items-center gap-2 px-1 text-[15px] font-medium text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('rider.jobDetail.backToJobs')}
        </Link>
      </div>
    );
  }

  if (!delivery) {
    return null;
  }

  return (
    <div>
      <Link
        href="/dashboard/rider/jobs"
        className="-ml-1 mb-3 inline-flex min-h-[2.75rem] items-center gap-2 px-1 text-[15px] font-medium text-gray-500 transition-colors active:text-gray-900"
      >
        <ArrowLeft className="h-5 w-5" />
        {t('rider.jobDetail.backToJobs')}
      </Link>
      <div className="mb-5">
        <h1 className={pageTitle}>{t('rider.jobDetail.title')}</h1>
        <p className="mt-1 text-[13px] text-gray-500">
          {t('rider.jobDetail.idLabel', { id: delivery.id.slice(0, 8) })}
        </p>
      </div>

      {error && <Alert tone="error" className="mb-4">{error}</Alert>}

      <DeliveryDetails
        delivery={delivery}
        events={events}
        onStatusUpdate={handleStatusUpdate}
        onConfirm={handleConfirm}
        onDecline={() => setDeclining(true)}
        loading={updating}
      />

      <ConfirmDialog
        isOpen={declining}
        tone="warning"
        title={t('rider.jobDetail.declineTitle')}
        message={t('rider.jobDetail.declineConfirm')}
        confirmLabel={t('rider.details.decline')}
        loading={updating}
        onConfirm={handleDecline}
        onCancel={() => setDeclining(false)}
      />
    </div>
  );
}
