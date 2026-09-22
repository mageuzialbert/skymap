'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package } from 'lucide-react';
import { getUserRole } from '@/lib/roles';
import DeliveryCard from '@/components/rider/DeliveryCard';
import { useT } from '@/lib/i18n';
import { statusBucket } from '@/lib/deliveryStatus';
import { cardClass, chipCount, chipTrack, filterChip, pageTitle, stickyFilterBar } from '@/lib/ui';

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_name: string;
  pickup_phone: string;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_name: string;
  dropoff_phone: string;
  package_description: string | null;
  status: string;
  created_at: string;
  businesses?: {
    id: string;
    name: string;
    phone: string;
  };
}

/** Same buckets the client's Activity list uses, so a rider filters with one
 *  tap instead of picking an exact status. */
type Bucket = 'ALL' | 'ACTIVE' | 'DONE' | 'FAILED';

export default function RiderJobsPage() {
  const t = useT();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [bucket, setBucket] = useState<Bucket>('ALL');

  // One fetch, filtered in the browser: switching buckets is instant and the
  // counts on the chips stay honest.
  const loadDeliveries = useCallback(async () => {
    try {
      const response = await fetch('/api/rider/deliveries?limit=1000');
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data);
      }
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'RIDER') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
    }
    checkRole();
  }, [router]);

  useEffect(() => {
    if (role === 'RIDER') {
      loadDeliveries();
    }
  }, [role, loadDeliveries]);

  const counts = useMemo(() => {
    const c = { ALL: deliveries.length, ACTIVE: 0, DONE: 0, FAILED: 0 };
    deliveries.forEach((d) => (c[statusBucket(d.status)] += 1));
    return c;
  }, [deliveries]);

  const filtered = useMemo(
    () => (bucket === 'ALL' ? deliveries : deliveries.filter((d) => statusBucket(d.status) === bucket)),
    [deliveries, bucket]
  );

  const chips: { key: Bucket; label: string }[] = [
    { key: 'ALL', label: t('rider.jobs.buckets.all') },
    { key: 'ACTIVE', label: t('rider.jobs.buckets.active') },
    { key: 'DONE', label: t('rider.jobs.buckets.delivered') },
    { key: 'FAILED', label: t('rider.jobs.buckets.failed') },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className={pageTitle}>{t('rider.jobs.title')}</h1>
        <p className="mt-1 text-gray-600">{t('rider.jobs.subtitle')}</p>
      </div>

      {/* Chips stay in reach while the job list scrolls. */}
      <div className={stickyFilterBar}>
        <div className={chipTrack}>
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => setBucket(c.key)}
              aria-pressed={bucket === c.key}
              className={filterChip(bucket === c.key)}
            >
              {c.label}
              <span className={chipCount(bucket === c.key)}>{counts[c.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-semibold text-gray-900">{t('rider.jobs.noneFound')}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
            {bucket === 'ALL' ? t('rider.jobs.noneAssigned') : t('rider.jobs.noneFiltered')}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((delivery) => (
            <DeliveryCard key={delivery.id} delivery={delivery} />
          ))}
        </div>
      )}
    </div>
  );
}
