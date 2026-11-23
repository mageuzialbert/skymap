'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import type { Map as LeafletMap } from 'leaflet';
import 'leaflet/dist/leaflet.css';
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

const geoapifyKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';
const defaultCenter = { lat: -6.7924, lng: 39.2083 };

/**
 * One request, in full.
 *
 * Rebuilt as a single column: the old three-column grid only split at `lg`,
 * which the dashboard's max-w-3xl measure never reaches, so it was dead
 * responsive code that still cost a nested grid. Status now comes from the
 * shared helper rather than a sixth private colour map.
 */
export default function DeliveryDetails({
  delivery,
  showServiceBadge = true,
}: {
  delivery: Delivery;
  /** The service pill beside the status. Staff need it to tell requests
   *  apart; the customer's own booking page leaves it off. */
  showServiceBadge?: boolean;
}) {
  const t = useT();
  const pickupLocation = useMemo(
    () =>
      delivery.pickup_latitude != null && delivery.pickup_longitude != null
        ? { lat: Number(delivery.pickup_latitude), lng: Number(delivery.pickup_longitude) }
        : null,
    [delivery.pickup_latitude, delivery.pickup_longitude]
  );

  const dropoffLocation = useMemo(
    () =>
      delivery.dropoff_latitude != null && delivery.dropoff_longitude != null
        ? { lat: Number(delivery.dropoff_latitude), lng: Number(delivery.dropoff_longitude) }
        : null,
    [delivery.dropoff_latitude, delivery.dropoff_longitude]
  );

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
          {showServiceBadge && <ServiceBadge serviceType={delivery.service_type} />}
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
          <GeoapifyRouteMap pickup={pickupLocation} dropoff={dropoffLocation} />

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
type RoutePoint = { lat: number; lng: number };

function GeoapifyRouteMap({ pickup, dropoff }: { pickup: RoutePoint | null; dropoff: RoutePoint | null }) {
  const t = useT();
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!geoapifyKey || !container.current) { setLoading(false); setFailed(true); return; }
    let cancelled = false;
    let map: LeafletMap | undefined;
    const controller = new AbortController();
    setLoading(true); setFailed(false);

    async function loadMap() {
      try {
        const L = await import('leaflet');
        if (cancelled || !container.current) return;
        const currentMap = L.map(container.current, { scrollWheelZoom: false }).setView(pickup || dropoff || defaultCenter, 13);
        map = currentMap;
        L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(geoapifyKey)}`, {
          maxZoom: 20,
          attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).on('tileerror', () => { if (!cancelled) setFailed(true); }).addTo(currentMap);
        const stops = [pickup, dropoff].filter((point): point is RoutePoint => point !== null);
        stops.forEach((point) => {
          L.circleMarker(point, { radius: 9, color: '#ffffff', weight: 3, fillColor: '#0b5a54', fillOpacity: 1 })
            .bindTooltip(point === pickup ? 'A' : 'B', { permanent: true, direction: 'top' }).addTo(currentMap);
        });
        if (stops.length === 2) currentMap.fitBounds(L.latLngBounds(stops), { padding: [30, 30], maxZoom: 16 });
        if (pickup && dropoff) {
          const params = new URLSearchParams({ waypoints: `${pickup.lat},${pickup.lng}|${dropoff.lat},${dropoff.lng}`, mode: 'drive', apiKey: geoapifyKey });
          const response = await fetch(`https://api.geoapify.com/v1/routing?${params}`, { signal: controller.signal });
          if (!response.ok) throw new Error('Route request failed');
          const route = await response.json();
          if (cancelled) return;
          if (!route.features?.length) throw new Error('Route unavailable');
          const line = L.geoJSON(route, { style: { color: '#0b5a54', weight: 5 } }).addTo(currentMap);
          currentMap.fitBounds(line.getBounds().extend(L.latLngBounds(stops)), { padding: [30, 30], maxZoom: 16 });
        }
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMap();
    return () => { cancelled = true; controller.abort(); map?.remove(); };
  }, [pickup, dropoff]);

  return (
    <>
      {failed && <div className="flex items-start gap-2.5 bg-amber-50 p-4 text-[13px] text-amber-800"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span>{t('components.deliveryDetails.mapLoadError')}</span></div>}
      <div className="relative z-0 h-[220px] sm:h-[280px]">
        <div ref={container} className="absolute inset-0" />
        {loading && <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-white/60"><Loader2 aria-label={t('common.loading')} className="h-8 w-8 animate-spin text-primary" /></div>}
      </div>
    </>
  );
}

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
