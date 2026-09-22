'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package } from 'lucide-react';
import { canWorkRiderJobs, getUserRole } from '@/lib/roles';
import { EmptyState, ListToolbar, RecordList, RecordRow } from '@/components/common/RecordList';
import ServiceIcon from '@/components/common/ServiceIcon';
import { useT } from '@/lib/i18n';
import { splitAddress } from '@/lib/address';
import { BUCKET_DOT, BUCKET_TEXT, statusBucket, statusLabelKey } from '@/lib/deliveryStatus';
import { formatTime, groupByDay } from '@/lib/time';
import { usePoll } from '@/lib/usePoll';
import { pageTitle, sectionLabel } from '@/lib/ui';

interface Delivery {
  id: string;
  business_id: string;
  pickup_address: string;
  dropoff_address: string;
  dropoff_name: string;
  status: string;
  service_type?: string | null;
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
      if (response.ok) setDeliveries(await response.json());
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (!canWorkRiderJobs(userRole)) {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
    }
    checkRole();
  }, [router]);

  useEffect(() => {
    if (canWorkRiderJobs(role)) loadDeliveries();
  }, [role, loadDeliveries]);

  // A job assigned while the app is open should appear without a reload.
  usePoll(loadDeliveries, 30_000, canWorkRiderJobs(role));

  const counts = useMemo(() => {
    const c = { ALL: deliveries.length, ACTIVE: 0, DONE: 0, FAILED: 0 };
    deliveries.forEach((d) => (c[statusBucket(d.status)] += 1));
    return c;
  }, [deliveries]);

  const filtered = useMemo(
    () => (bucket === 'ALL' ? deliveries : deliveries.filter((d) => statusBucket(d.status) === bucket)),
    [deliveries, bucket]
  );

  // Riders work in days; an ungrouped list of sixty rows is unreadable.
  const days = useMemo(() => groupByDay(filtered, (d) => d.created_at, t), [filtered, t]);

  const chips = [
    { key: 'ALL' as const, label: t('business.rides.status.all'), count: counts.ALL },
    { key: 'ACTIVE' as const, label: t('business.rides.status.active'), count: counts.ACTIVE },
    { key: 'DONE' as const, label: t('business.rides.status.delivered'), count: counts.DONE },
    { key: 'FAILED' as const, label: t('business.rides.status.failed'), count: counts.FAILED },
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
        <p className="mt-1 text-[15px] text-gray-500">{t('rider.jobs.subtitle')}</p>
      </div>

      <ListToolbar chips={chips} active={bucket} onChange={setBucket} />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Package}
          title={t('rider.jobs.noneFound')}
          body={bucket === 'ALL' ? t('rider.jobs.noneAssigned') : t('rider.jobs.noneFiltered')}
        />
      ) : (
        <div className="space-y-5">
          {days.map((day) => (
            <section key={day.key}>
              <h2 className={sectionLabel}>{day.label}</h2>
              <RecordList>
                {day.rows.map((d) => {
                  const tone = statusBucket(d.status);
                  const destination = splitAddress(d.dropoff_name || d.dropoff_address || '').title;
                  return (
                    <RecordRow
                      key={d.id}
                      href={`/dashboard/rider/jobs/${d.id}`}
                      leading={
                        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                          <ServiceIcon serviceType={d.service_type} className="h-[18px] w-[18px]" />
                        </span>
                      }
                      title={destination || t('rider.card.dropoff')}
                      trailing={formatTime(d.created_at)}
                      subtitle={d.businesses?.name || t('rider.card.unknownBusiness')}
                      status={{
                        dot: BUCKET_DOT[tone],
                        text: BUCKET_TEXT[tone],
                        label: t(statusLabelKey(d.status)),
                      }}
                    />
                  );
                })}
              </RecordList>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
