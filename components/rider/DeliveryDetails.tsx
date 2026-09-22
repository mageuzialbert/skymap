'use client';

import { useState } from 'react';
import {
  CalendarClock,
  ClipboardList,
  ExternalLink,
  MapPin,
  Navigation,
  Package,
  Phone,
  User,
} from 'lucide-react';
import StatusSheet from './StatusSheet';
import ChatLauncher from '@/components/chat/ChatLauncher';
import ActionBar from '@/components/common/ActionBar';
import Alert from '@/components/common/Alert';
import ServiceBadge, { formatSchedule } from '@/components/common/ServiceBadge';
import FieldGroup from '@/components/wizard/FieldGroup';
import { splitAddress } from '@/lib/address';
import { BUCKET_DOT, BUCKET_TEXT, statusBucket, statusLabelKey } from '@/lib/deliveryStatus';
import { useT } from '@/lib/i18n';
import { formatStamp } from '@/lib/time';
import { cardClass, pillGhost, pillPrimary, sectionLabel } from '@/lib/ui';

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
  package_image_url?: string | null;
  service_type?: string | null;
  scheduled_pickup_at?: string | null;
  service_details?: string | null;
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

interface DeliveryDetailsProps {
  delivery: Delivery;
  events?: DeliveryEvent[];
  onStatusUpdate: (status: string, note: string) => Promise<void>;
  onConfirm?: () => void;
  /** Opens the confirmation dialog; the page owns the decline itself. */
  onDecline?: () => void;
  loading?: boolean;
}

function mapsUrl(lat: number | null, lng: number | null, address: string) {
  const destination = lat && lng ? `${lat},${lng}` : encodeURIComponent(address);
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

/**
 * One job, for the rider who is doing it.
 *
 * The customer's version of this screen is a read-only record with a map; this
 * one is an action surface. What they share - the status header, the stop rows,
 * the package block - uses the same vocabulary, so the two read as one app.
 */
export default function DeliveryDetails({
  delivery,
  events = [],
  onStatusUpdate,
  onConfirm,
  onDecline,
  loading = false,
}: DeliveryDetailsProps) {
  const t = useT();
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);

  // A rider must accept an assigned ride before they can start it.
  const needsConfirm = delivery.status === 'ASSIGNED' && !delivery.rider_confirmed_at;
  const canUpdateStatus =
    (delivery.status === 'ASSIGNED' && !!delivery.rider_confirmed_at) ||
    ['PICKED_UP', 'IN_TRANSIT'].includes(delivery.status);

  // Where the rider is headed right now: the pickup until they have it, the
  // drop-off afterwards.
  const heading =
    delivery.status === 'ASSIGNED'
      ? {
          lat: delivery.pickup_latitude,
          lng: delivery.pickup_longitude,
          address: delivery.pickup_address,
          label: t('rider.details.navigateToPickup'),
        }
      : ['PICKED_UP', 'IN_TRANSIT'].includes(delivery.status)
        ? {
            lat: delivery.dropoff_latitude,
            lng: delivery.dropoff_longitude,
            address: delivery.dropoff_address,
            label: t('rider.details.navigateToDropoff'),
          }
        : null;

  const tone = statusBucket(delivery.status);

  return (
    <div className="space-y-5">
      {/* Where it stands */}
      <section className={`${cardClass} p-4 sm:p-5`}>
        <div className="flex flex-wrap items-center gap-2">
          <ServiceBadge serviceType={delivery.service_type} />
          <span
            className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${BUCKET_TEXT[tone]}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[tone]}`} />
            {t(statusLabelKey(delivery.status))}
          </span>
        </div>
        <p className="mt-3 flex items-center gap-2 text-[15px] text-gray-700">
          <CalendarClock className="h-4 w-4 shrink-0 text-gray-400" />
          {formatSchedule(delivery.scheduled_pickup_at)}
        </p>
      </section>

      {needsConfirm && (
        <Alert tone="info">
          <span className="font-semibold">{t('rider.details.newRideTitle')}</span>
          <span className="mt-0.5 block">{t('rider.details.newRideBody')}</span>
        </Alert>
      )}
      {delivery.status === 'PENDING_CONFIRMATION' && (
        <Alert tone="warning">
          <span className="font-semibold">{t('rider.details.awaitingTitle')}</span>
          <span className="mt-0.5 block">{t('rider.details.awaitingBody')}</span>
        </Alert>
      )}
      {delivery.status === 'REJECTED' && (
        <Alert tone="error">
          <span className="font-semibold">{t('rider.details.rejectedTitle')}</span>
          <span className="mt-0.5 block">{t('rider.details.rejectedBody')}</span>
        </Alert>
      )}

      {/* The one thing to do next. */}
      {heading && (
        <section className={`${cardClass} p-4 sm:p-5`}>
          <p className="text-[13px] text-gray-500">{heading.label}</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug text-gray-900">
            {splitAddress(heading.address).title}
          </p>
          <a
            href={mapsUrl(heading.lat, heading.lng, heading.address)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${pillPrimary} mt-4 h-12 w-full text-base`}
          >
            <Navigation className="h-5 w-5" />
            {t('rider.details.openInGoogleMaps')}
          </a>
        </section>
      )}

      {/* Who the job is for */}
      <FieldGroup label={t('rider.details.client')}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <User className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-gray-900">
              {delivery.businesses?.name || t('rider.details.unknown')}
            </span>
            {delivery.businesses?.phone && (
              <a
                href={`tel:${delivery.businesses.phone}`}
                className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
              >
                <Phone className="h-3.5 w-3.5" />
                {delivery.businesses.phone}
              </a>
            )}
          </span>
        </div>
        <ChatLauncher
          deliveryId={delivery.id}
          otherName={delivery.businesses?.name || t('rider.details.client')}
          label={t('rider.details.chatWithClient')}
        />
      </FieldGroup>

      {/* Both ends of the journey */}
      <section>
        <h2 className={sectionLabel}>{t('components.deliveryDetails.routeMap')}</h2>
        <div className={`${cardClass} overflow-hidden`}>
          <Stop
            which="pickup"
            label={t('rider.details.pickupLocation')}
            address={delivery.pickup_address}
            name={delivery.pickup_name}
            phone={delivery.pickup_phone}
            lat={delivery.pickup_latitude}
            lng={delivery.pickup_longitude}
          />
          {delivery.dropoff_address && (
            <>
              <span className="ml-[3.25rem] block h-px bg-gray-100" />
              <Stop
                which="dropoff"
                label={t('rider.details.dropoffLocation')}
                address={delivery.dropoff_address}
                name={delivery.dropoff_name}
                phone={delivery.dropoff_phone}
                lat={delivery.dropoff_latitude}
                lng={delivery.dropoff_longitude}
              />
            </>
          )}
        </div>
      </section>

      {delivery.service_details && (
        <section>
          <h2 className={sectionLabel}>{t('rider.details.requestDetails')}</h2>
          <div className={`${cardClass} flex items-start gap-3 p-4 sm:p-5`}>
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
              {delivery.service_details}
            </p>
          </div>
        </section>
      )}

      {(delivery.package_description || delivery.package_image_url) && (
        <section>
          <h2 className={sectionLabel}>{t('rider.details.packageDetails')}</h2>
          <div className={`${cardClass} p-4 sm:p-5`}>
            {delivery.package_description && (
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
                <p className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
                  {delivery.package_description}
                </p>
              </div>
            )}
            {delivery.package_image_url && (
              <a
                href={delivery.package_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`${pillGhost} mt-4 h-12 w-full text-base`}
              >
                <ExternalLink className="h-5 w-5" />
                {t('rider.details.viewFull')}
              </a>
            )}
          </div>
        </section>
      )}

      {events.length > 0 && (
        <section>
          <h2 className={sectionLabel}>{t('rider.details.deliveryTimeline')}</h2>
          <div className={`${cardClass} p-4 sm:p-5`}>
            <ol className="space-y-4">
              {events.map((event) => {
                const eventTone = statusBucket(event.status);
                return (
                  <li key={event.id} className="flex gap-3">
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${BUCKET_DOT[eventTone]}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-medium text-gray-900">
                        {t(statusLabelKey(event.status))}
                      </p>
                      <p className="mt-0.5 text-[13px] text-gray-500">
                        {formatStamp(event.created_at)}
                      </p>
                      {event.note && (
                        <p className="mt-1 text-[13px] text-gray-600">{event.note}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* Sticky, not fixed: a fixed bar here paints over the tab bar, which is
          a normal-flow sibling of the scrolling <main>. */}
      {needsConfirm && onConfirm && onDecline ? (
        <ActionBar>
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className={`${pillGhost} h-12 flex-1 text-base text-red-600`}
          >
            {t('rider.details.decline')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`${pillPrimary} h-12 flex-[2] text-base`}
          >
            {t('rider.details.confirmRide')}
          </button>
        </ActionBar>
      ) : canUpdateStatus ? (
        <ActionBar>
          <button
            type="button"
            onClick={() => setStatusSheetOpen(true)}
            disabled={loading}
            className={`${pillPrimary} h-12 w-full text-base`}
          >
            {t('rider.details.updateDeliveryStatus')}
          </button>
        </ActionBar>
      ) : null}

      <StatusSheet
        isOpen={statusSheetOpen}
        onClose={() => setStatusSheetOpen(false)}
        currentStatus={delivery.status}
        onUpdate={onStatusUpdate}
      />
    </div>
  );
}

/** One end of the journey, with the two things a rider does there. */
function Stop({
  which,
  label,
  address,
  name,
  phone,
  lat,
  lng,
}: {
  which: 'pickup' | 'dropoff';
  label: string;
  address: string;
  name?: string | null;
  phone?: string | null;
  lat: number | null;
  lng: number | null;
}) {
  const t = useT();
  const { title, detail } = splitAddress(address || '');
  const Icon = which === 'pickup' ? Navigation : MapPin;
  const contact = name && name.trim() !== title.trim() ? name : '';

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            which === 'pickup' ? 'bg-primary/10 text-primary' : 'bg-secondary/15 text-secondary-dark'
          }`}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-gray-500">{label}</p>
          <p className="mt-0.5 text-[15px] font-semibold leading-snug text-gray-900">{title}</p>
          {detail && <p className="mt-0.5 text-[13px] text-gray-500">{detail}</p>}
          {contact && <p className="mt-1 text-[13px] text-gray-700">{contact}</p>}
        </div>
      </div>
      {/* Both actions on the same token - these used to be a pill beside a
          rounded-lg button in the same row. */}
      <div className="mt-3 flex gap-2 pl-[3.25rem]">
        {phone && (
          <a href={`tel:${phone}`} className={`${pillGhost} h-11 flex-1 text-[15px]`}>
            <Phone className="h-4 w-4" />
            {t('rider.details.call')}
          </a>
        )}
        <a
          href={mapsUrl(lat, lng, address)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${pillGhost} h-11 flex-1 text-[15px]`}
        >
          <Navigation className="h-4 w-4" />
          {t('rider.details.navigate')}
        </a>
      </div>
    </div>
  );
}
