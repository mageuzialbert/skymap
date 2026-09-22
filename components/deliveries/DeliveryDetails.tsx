'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLoadScript, GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import {
  AlertCircle,
  CalendarClock,
  ClipboardList,
  Loader2,
  MapPin,
  Navigation,
  Package,
  Phone,
  User,
} from 'lucide-react';
import ChatLauncher from '@/components/chat/ChatLauncher';
import ServiceBadge, { formatSchedule } from '@/components/common/ServiceBadge';
import { splitAddress } from '@/lib/address';
import { BUCKET_DOT, BUCKET_TEXT, statusBucket, statusLabelKey } from '@/lib/deliveryStatus';
import { useT } from '@/lib/i18n';
import { cardClass, sectionLabel } from '@/lib/ui';

interface Delivery {
  id: string;
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
  package_image_url?: string | null;
  service_type?: string | null;
  scheduled_pickup_at?: string | null;
  service_details?: string | null;
  status: string;
  created_at: string;
  assigned_rider?: {
    name: string;
    phone: string;
  } | null;
}

const mapContainerStyle = { width: '100%', height: '100%' };
const defaultCenter = { lat: -6.7924, lng: 39.2083 };

/**
 * One request, in full.
 *
 * Rebuilt as a single column: the old three-column grid only split at `lg`,
 * which the dashboard's max-w-3xl measure never reaches, so it was dead
 * responsive code that still cost a nested grid. Status now comes from the
 * shared helper rather than a sixth private colour map.
 */
export default function DeliveryDetails({ delivery }: { delivery: Delivery }) {
  const t = useT();
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

  const pickupLocation = useMemo(
    () =>
      delivery.pickup_latitude && delivery.pickup_longitude
        ? { lat: Number(delivery.pickup_latitude), lng: Number(delivery.pickup_longitude) }
        : null,
    [delivery.pickup_latitude, delivery.pickup_longitude]
  );

  const dropoffLocation = useMemo(
    () =>
      delivery.dropoff_latitude && delivery.dropoff_longitude
        ? { lat: Number(delivery.dropoff_latitude), lng: Number(delivery.dropoff_longitude) }
        : null,
    [delivery.dropoff_latitude, delivery.dropoff_longitude]
  );

  const mapCenter = useMemo(() => pickupLocation || defaultCenter, [pickupLocation]);

  useEffect(() => {
    if (!isLoaded || !pickupLocation || !dropoffLocation) return;
    new google.maps.DirectionsService().route(
      {
        origin: pickupLocation,
        destination: dropoffLocation,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) setDirections(result);
      }
    );
  }, [isLoaded, pickupLocation, dropoffLocation]);

  const tone = statusBucket(delivery.status);
  const created = new Date(delivery.created_at).toLocaleString([], {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const isDelivery = delivery.service_type === 'delivery' || !delivery.service_type;

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
        <p className="mt-1 text-[13px] text-gray-400">
          {t('components.deliveries.created')} {created}
        </p>
      </section>

      {/* Route */}
      <section>
        <h2 className={sectionLabel}>{t('components.deliveryDetails.routeMap')}</h2>
        <div className={`${cardClass} overflow-hidden`}>
          {loadError ? (
            <div className="flex items-start gap-2.5 bg-amber-50 p-4 text-[13px] text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{t('components.deliveryDetails.mapLoadError')}</span>
            </div>
          ) : !isLoaded ? (
            <div className="flex h-[220px] items-center justify-center bg-gray-50">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[220px] sm:h-[280px]">
              <GoogleMap
                mapContainerStyle={mapContainerStyle}
                zoom={12}
                center={mapCenter}
                options={{
                  disableDefaultUI: true,
                  zoomControl: true,
                  gestureHandling: 'cooperative',
                }}
              >
                {pickupLocation && <Marker position={pickupLocation} label="A" />}
                {dropoffLocation && <Marker position={dropoffLocation} label="B" />}
                {directions && <DirectionsRenderer directions={directions} />}
              </GoogleMap>
            </div>
          )}

          <Stop
            which="pickup"
            label={t('components.deliveries.pickup')}
            address={delivery.pickup_address}
            name={delivery.pickup_name}
            phone={delivery.pickup_phone}
          />
          <span className="ml-[3.25rem] block h-px bg-gray-100" />
          <Stop
            which="dropoff"
            label={t('components.deliveries.dropoff')}
            address={delivery.dropoff_address}
            name={delivery.dropoff_name}
            phone={delivery.dropoff_phone}
          />
        </div>
      </section>

      {delivery.service_details && (
        <section>
          <h2 className={sectionLabel}>{t('components.deliveryDetails.requestDetails')}</h2>
          <div className={`${cardClass} flex items-start gap-3 p-4 sm:p-5`}>
            <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
            <p className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
              {delivery.service_details}
            </p>
          </div>
        </section>
      )}

      {isDelivery && (
        <section>
          <h2 className={sectionLabel}>{t('components.deliveryDetails.packageInfo')}</h2>
          <div className={`${cardClass} p-4 sm:p-5`}>
            <div className="flex items-start gap-3">
              <Package className="mt-0.5 h-5 w-5 shrink-0 text-gray-400" />
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-[15px] leading-relaxed text-gray-800">
                {delivery.package_description || t('components.deliveryDetails.noDescription')}
              </p>
            </div>
            {delivery.package_image_url && (
              <a
                href={delivery.package_image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 block overflow-hidden rounded-xl border border-gray-200 bg-gray-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={delivery.package_image_url}
                  alt=""
                  className="max-h-64 w-full object-contain"
                />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Rider */}
      <section>
        <h2 className={sectionLabel}>{t('components.deliveryDetails.assignedRider')}</h2>
        <div className={`${cardClass} p-4 sm:p-5`}>
          {delivery.assigned_rider ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                  <User className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-gray-900">
                    {delivery.assigned_rider.name}
                  </span>
                  <a
                    href={`tel:${delivery.assigned_rider.phone}`}
                    className="mt-0.5 inline-flex items-center gap-1.5 text-[13px] font-medium text-primary"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {delivery.assigned_rider.phone}
                  </a>
                </span>
              </div>
              <ChatLauncher
                deliveryId={delivery.id}
                otherName={delivery.assigned_rider.name}
                label={t('components.deliveryDetails.chatWithRider')}
              />
            </div>
          ) : (
            <p className="py-2 text-center text-[15px] text-gray-500">
              {t('components.deliveryDetails.noRiderYet')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

/** One end of the journey: marker, address, and who is there. */
function Stop({
  which,
  label,
  address,
  name,
  phone,
}: {
  which: 'pickup' | 'dropoff';
  label: string;
  address: string;
  name?: string | null;
  phone?: string | null;
}) {
  const { title, detail } = splitAddress(address || '');
  const Icon = which === 'pickup' ? Navigation : MapPin;
  // The place picker stores "{name}, {address}", so the contact's name is often
  // already the headline - printing it again just repeats the line.
  const contact = name && name.trim() !== title.trim() ? name : '';
  return (
    <div className="flex items-start gap-3 px-4 py-3.5">
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
        {(contact || phone) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
            {contact && <span className="text-gray-700">{contact}</span>}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1.5 font-medium text-primary"
              >
                <Phone className="h-3.5 w-3.5" />
                {phone}
              </a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
