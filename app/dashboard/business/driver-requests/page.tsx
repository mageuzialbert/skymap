'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Plus, User } from 'lucide-react';
import Alert from '@/components/common/Alert';
import { EmptyState, RecordList, RecordRow } from '@/components/common/RecordList';
import { useT } from '@/lib/i18n';
import { formatDateAndTime, statusLabelKey, statusTone } from '@/lib/driverHire';
import { pageTitle, pillPrimary } from '@/lib/ui';

interface DriverRequest {
  id: string;
  reference_number: string;
  vehicle_category: 'light' | 'heavy';
  departure_date: string;
  departure_time: string;
  pickup_location: string;
  destination: string;
  status: string;
  created_at: string;
}

/** The customer's own driver requests, newest first. */
export default function DriverRequestsPage() {
  const t = useT();
  const [rows, setRows] = useState<DriverRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/client/driver-requests');
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (alive) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setError(t('driverHire.list.loadFailed'));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-4">
        <h1 className={pageTitle}>{t('driverHire.list.title')}</h1>
        <p className="mt-1 text-[15px] text-gray-500">{t('driverHire.list.subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4">
          <Alert tone="error">{error}</Alert>
        </div>
      )}

      {rows.length === 0 && !error ? (
        <EmptyState
          icon={User}
          title={t('driverHire.list.emptyTitle')}
          body={t('driverHire.list.emptyBody')}
          action={
            <Link href="/dashboard/business/request-ride" className={pillPrimary}>
              <Plus className="h-5 w-5" />
              {t('driverHire.list.newRequest')}
            </Link>
          }
        />
      ) : (
        <RecordList>
          {rows.map((r) => (
            <RecordRow
              key={r.id}
              href={`/dashboard/business/driver-requests/${r.id}`}
              leading={
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                  <User className="h-[18px] w-[18px]" />
                </span>
              }
              title={r.destination || t(`driverHire.categories.${r.vehicle_category}.title`)}
              trailing={r.reference_number}
              subtitle={r.pickup_location ? `${t('driverHire.list.from')} ${r.pickup_location}` : undefined}
              meta={formatDateAndTime(r.departure_date, r.departure_time)}
              status={{ ...statusTone(r.status), label: t(statusLabelKey(r.status)) }}
            />
          ))}
        </RecordList>
      )}
    </div>
  );
}
