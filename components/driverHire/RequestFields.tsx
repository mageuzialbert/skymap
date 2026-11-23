'use client';

import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import {
  formatClock,
  formatDate,
  formatDateAndTime,
  statusLabelKey,
  statusTone,
} from '@/lib/driverHire';
import { cardClass, sectionLabel } from '@/lib/ui';

export interface DriverRequestRecord {
  id: string;
  reference_number: string;
  vehicle_category: 'light' | 'heavy';
  vehicle_type: string | null;
  transmission_type: 'manual' | 'automatic' | null;
  departure_date: string;
  departure_time: string;
  return_date: string | null;
  return_time: string | null;
  pickup_location: string;
  destination: string;
  passenger_count: number | null;
  trip_duration: string | null;
  additional_information: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

/** "23/11/2026, 14:30" for a stored timestamp. */
export function formatStampFull(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function StatusPill({ status }: { status: string }) {
  const t = useT();
  const tone = statusTone(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${tone.text}`}>
      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
      {t(statusLabelKey(status))}
    </span>
  );
}

/** A labelled card of label/value lines; empty values are left out. */
export function FieldCard({
  label,
  rows,
}: {
  label: string;
  rows: [string, ReactNode][];
}) {
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (shown.length === 0) return null;
  return (
    <section>
      <h2 className={sectionLabel}>{label}</h2>
      <dl className={`${cardClass} divide-y divide-gray-100 overflow-hidden`}>
        {shown.map(([k, v]) => (
          <div key={k} className="flex items-start gap-3 px-4 py-3">
            <dt className="w-28 shrink-0 text-[13px] text-gray-500">{k}</dt>
            <dd className="min-w-0 flex-1 whitespace-pre-line break-words text-[15px] text-gray-900">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/**
 * The vehicle and trip sections of a driver request, shared by the customer's
 * detail page and the admin sheet so both always show the same facts.
 */
export default function RequestFields({ request: r }: { request: DriverRequestRecord }) {
  const t = useT();
  return (
    <>
      <FieldCard
        label={t('driverHire.sections.vehicle')}
        rows={[
          [t('driverHire.fields.category'), t(`driverHire.categories.${r.vehicle_category}.title`)],
          [
            t('driverHire.fields.vehicleType'),
            r.vehicle_type,
          ],
          [
            t('driverHire.fields.transmission'),
            t(`driverHire.transmissions.${r.transmission_type || 'any'}.title`),
          ],
        ]}
      />
      <FieldCard
        label={t('driverHire.sections.trip')}
        rows={[
          [t('driverHire.fields.travelDate'), formatDate(r.departure_date)],
          [t('driverHire.fields.departureTime'), formatClock(r.departure_time)],
          [t('driverHire.fields.return'), formatDateAndTime(r.return_date, r.return_time)],
          [t('driverHire.fields.pickup'), r.pickup_location],
          [t('driverHire.fields.destination'), r.destination],
          [t('driverHire.fields.passengers'), r.passenger_count],
          [t('driverHire.fields.duration'), r.trip_duration],
          [t('driverHire.fields.info'), r.additional_information],
        ]}
      />
    </>
  );
}
