'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Navigation, Package, Phone } from 'lucide-react';
import Alert from '@/components/common/Alert';
import { EmptyState, RecordList, RecordRow } from '@/components/common/RecordList';
import ServiceIcon from '@/components/common/ServiceIcon';
import StatStrip from '@/components/common/StatStrip';
import { canWorkRiderJobs, getUserRole } from '@/lib/roles';
import { splitAddress } from '@/lib/address';
import { BUCKET_DOT, BUCKET_TEXT, statusBucket, statusLabelKey } from '@/lib/deliveryStatus';
import { useT } from '@/lib/i18n';
import { formatTime } from '@/lib/time';
import { usePoll } from '@/lib/usePoll';
import { cardClass, pageTitle, pillGhost, pillPrimary, sectionLabel } from '@/lib/ui';

interface Delivery {
  id: string;
  status: string;
  service_type?: string | null;
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  dropoff_address: string;
  dropoff_name: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  rider_confirmed_at?: string | null;
  created_at: string;
  delivered_at: string | null;
  businesses?: { id: string; name: string; phone: string };
}

function mapsUrl(lat: number | null, lng: number | null, address: string) {
  const destination = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/**
 * The rider's home answers "what am I doing right now".
 *
 * It used to be three metric cards plus a Quick Actions card whose only link
 * was the Activity tab, permanently on screen. The job in hand is the thing
 * that matters, so it leads.
 */
export default function RiderDashboard() {
  const t = useT();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/rider/deliveries?limit=20');
      if (res.ok) setDeliveries(await res.json());
    } catch (error) {
      console.error('Error loading deliveries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const userRole = await getUserRole();
      if (!canWorkRiderJobs(userRole)) {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      load();
    })();
  }, [router, load]);

  usePoll(load, 30_000, canWorkRiderJobs(role));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const awaiting = deliveries.find((d) => d.status === 'ASSIGNED' && !d.rider_confirmed_at);
  const current = deliveries.find(
    (d) =>
      (d.status === 'ASSIGNED' && d.rider_confirmed_at) ||
      ['PICKED_UP', 'IN_TRANSIT'].includes(d.status)
  );

  const today = new Date().toDateString();
  const stats = [
    {
      label: t('rider.dashboard.assigned'),
      value: deliveries.filter((d) => d.status === 'ASSIGNED').length,
    },
    {
      label: t('rider.dashboard.inProgress'),
      value: deliveries.filter((d) => ['PICKED_UP', 'IN_TRANSIT'].includes(d.status)).length,
    },
    {
      label: t('rider.dashboard.completedToday'),
      value: deliveries.filter(
        (d) => d.status === 'DELIVERED' && d.delivered_at && new Date(d.delivered_at).toDateString() === today
      ).length,
    },
  ];

  // Where the current job is headed: the pickup until collected, then the drop-off.
  const heading = current
    ? current.status === 'ASSIGNED'
      ? {
          lat: current.pickup_latitude,
          lng: current.pickup_longitude,
          address: current.pickup_address,
        }
      : {
          lat: current.dropoff_latitude,
          lng: current.dropoff_longitude,
          address: current.dropoff_address,
        }
    : null;

  return (
    <div className="space-y-5">
      <h1 className={pageTitle}>{t('rider.dashboard.title')}</h1>

      {awaiting && (
        <Alert tone="info">
          <Link href={`/dashboard/rider/jobs/${awaiting.id}`} className="block">
            <span className="font-semibold underline">{t('rider.details.newRideTitle')}</span>
          </Link>
        </Alert>
      )}

      {current && heading && (
        <section>
          <h2 className={sectionLabel}>{t('rider.dashboard.currentJob')}</h2>
          <div className={`${cardClass} p-4 sm:p-5`}>
            <Link href={`/dashboard/rider/jobs/${current.id}`} className="block">
              <span
                className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                  BUCKET_TEXT[statusBucket(current.status)]
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[statusBucket(current.status)]}`}
                />
                {t(statusLabelKey(current.status))}
              </span>
              <p className="mt-2 text-[17px] font-semibold leading-snug text-gray-900">
                {splitAddress(heading.address).title}
              </p>
              <p className="mt-0.5 text-[13px] text-gray-500">
                {current.businesses?.name || t('rider.card.unknownBusiness')}
              </p>
            </Link>
            {/* Both actions on the same token, and big enough for a gloved thumb. */}
            <div className="mt-4 flex gap-2">
              {current.businesses?.phone && (
                <a
                  href={`tel:${current.businesses.phone}`}
                  className={`${pillGhost} h-12 flex-1 text-base`}
                >
                  <Phone className="h-5 w-5" />
                  {t('rider.details.call')}
                </a>
              )}
              <a
                href={mapsUrl(heading.lat, heading.lng, heading.address)}
                target="_blank"
                rel="noopener noreferrer"
                className={`${pillPrimary} h-12 flex-[2] text-base`}
              >
                <Navigation className="h-5 w-5" />
                {t('rider.details.navigate')}
              </a>
            </div>
          </div>
        </section>
      )}

      <StatStrip stats={stats} />

      <section>
        <h2 className={sectionLabel}>{t('rider.dashboard.recentDeliveries')}</h2>
        {deliveries.length === 0 ? (
          <EmptyState icon={Package} title={t('rider.dashboard.noDeliveries')} />
        ) : (
          <RecordList>
            {deliveries.slice(0, 5).map((d) => {
              const tone = statusBucket(d.status);
              return (
                <RecordRow
                  key={d.id}
                  href={`/dashboard/rider/jobs/${d.id}`}
                  leading={
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                      <ServiceIcon serviceType={d.service_type} className="h-[18px] w-[18px]" />
                    </span>
                  }
                  title={splitAddress(d.dropoff_name || d.dropoff_address || '').title}
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
        )}
      </section>
    </div>
  );
}
