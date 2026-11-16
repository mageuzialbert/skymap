'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  History,
  ChevronRight,
  ArrowRight,
  MapPinned,
  Plane,
  Ship,
  TrainFront,
  Bus,
  ShoppingBag,
  Building2,
  FileText,
  Car,
  Fuel,
  Truck,
} from 'lucide-react';
import ServiceIcon, { SERVICE_ICONS } from '@/components/common/ServiceIcon';
import type { ServiceTypeKey } from '@/lib/serviceTypes';
import { ACTIVE_STATUSES, statusLabelKey } from '@/lib/deliveryStatus';
import { splitAddress } from '@/lib/address';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';

export interface RecentDestination {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface ActiveDelivery {
  id: string;
  status: string;
  service_type: string | null;
  dropoff_name: string | null;
  dropoff_address: string | null;
}

// Well-known Dar es Salaam destinations offered as one-tap shortcuts. They
// carry no coordinates on purpose: the request flow resolves the address the
// same way it does for a past destination saved without them. Labels live
// under business.home.popular.<id>.
const POPULAR_LOCATIONS: { id: string; icon: any; address: string }[] = [
  { id: 'airport', icon: Plane, address: 'Julius Nyerere International Airport, Dar es Salaam' },
  { id: 'port', icon: Ship, address: 'Dar es Salaam Port, Dar es Salaam' },
  { id: 'sgr', icon: TrainFront, address: 'Dar es Salaam SGR Station, Dar es Salaam' },
  { id: 'busStand', icon: Bus, address: 'Magufuli Bus Terminal, Mbezi Luis, Dar es Salaam' },
  { id: 'kariakoo', icon: ShoppingBag, address: 'Kariakoo Market, Dar es Salaam' },
  { id: 'mlimani', icon: Building2, address: 'Mlimani City Mall, Sam Nujoma Rd, Dar es Salaam' },
];

/**
 * The six photo tiles on the home screen. The app has four request flows, so
 * two tiles share one: "Running Errands" opens the errand flow and "Heavy
 * Freights" opens vehicle hire. Labels live under business.home.tiles.<id>.
 */
// A tile shows either a line icon on the brand circle, or - when `iconImage`
// is set - a white glyph image in its place (for icons Lucide does not have).
const HOME_TILES: { id: string; service: ServiceTypeKey; icon?: any; iconImage?: string }[] = [
  { id: 'delivery', service: 'delivery', icon: SERVICE_ICONS.Package },
  { id: 'hire', service: 'hire', icon: Car },
  { id: 'ride', service: 'ride', iconImage: '/icons/services/driver-white.png' },
  { id: 'errands', service: 'errand', icon: FileText },
  { id: 'rider', service: 'errand', icon: Fuel },
  { id: 'freight', service: 'hire', icon: Truck },
];

/**
 * The client's home screen: see what is already on the road, pick a service,
 * jump straight to a destination, or reuse somewhere you sent to before.
 * Services are photo cards with a floating label; the live delivery block is
 * the one solid-colour surface on the screen.
 */
export default function ServiceHome({
  onChooseService,
  onPickRecent,
}: {
  onChooseService: (key: ServiceTypeKey) => void;
  /** The "Where to?" / "Later" bar was removed from this screen; the props
   *  stay optional so the wizard that passes them needs no change. */
  onWhereTo?: () => void;
  onScheduleLater?: () => void;
  onPickRecent: (d: RecentDestination) => void;
}) {
  const t = useT();
  const [recents, setRecents] = useState<RecentDestination[]>([]);
  const [active, setActive] = useState<ActiveDelivery[]>([]);

  // Recent drop-offs and anything still on the road come straight from the
  // browser client: RLS already limits `deliveries` to the signed-in user's
  // own business, so no API route is needed.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || !alive) return;

        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!business || !alive) return;

        const [{ data: history }, { data: onTheRoad }] = await Promise.all([
          supabase
            .from('deliveries')
            .select('dropoff_address, dropoff_latitude, dropoff_longitude, created_at')
            .eq('business_id', business.id)
            .not('dropoff_address', 'is', null)
            .order('created_at', { ascending: false })
            .limit(20),
          supabase
            .from('deliveries')
            .select('id, status, service_type, dropoff_name, dropoff_address')
            .eq('business_id', business.id)
            .in('status', ACTIVE_STATUSES)
            .order('created_at', { ascending: false })
            .limit(2),
        ]);
        if (!alive) return;

        setActive(onTheRoad || []);

        // Most recent wins; the same place is often used many times over.
        const seen = new Set<string>();
        const unique: RecentDestination[] = [];
        for (const row of history || []) {
          const address = (row.dropoff_address || '').trim();
          if (!address || seen.has(address.toLowerCase())) continue;
          seen.add(address.toLowerCase());
          unique.push({
            address,
            latitude: row.dropoff_latitude != null ? Number(row.dropoff_latitude) : null,
            longitude: row.dropoff_longitude != null ? Number(row.dropoff_longitude) : null,
          });
          if (unique.length === 3) break;
        }
        setRecents(unique);
      } catch {
        // A missing history is not an error worth showing - the section just hides.
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Hero banner: the brand line over a dark wash, the rider photo on the
          right, and one yellow button that starts a package delivery. */}
      <section className="relative mb-3 h-32 overflow-hidden rounded-3xl bg-primary-dark shadow-lg shadow-slate-900/15">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/services/home/hero.webp"
          alt=""
          className="absolute inset-y-0 right-0 h-full w-[62%] object-cover object-top"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary-dark/85 via-45% to-transparent"
        />
        <div className="relative flex h-full max-w-[64%] flex-col justify-center pl-5">
          <p className="font-display font-extrabold leading-[1.05] tracking-tight text-white">
            <span className="block text-[19px]">{t('business.home.hero.line1')}</span>
            <span className="block text-[23px] text-yellow-400">{t('business.home.hero.line2')}</span>
          </p>
          <p className="mt-1 text-[12px] font-semibold text-white">
            {t('business.home.hero.tagline')}
          </p>
          <button
            type="button"
            onClick={() => onChooseService('delivery')}
            className="mt-2 inline-flex h-8 w-fit items-center gap-1.5 rounded-full bg-yellow-400 px-3.5 text-[13px] font-bold text-slate-900 shadow-md transition active:scale-[0.97]"
          >
            {t('business.home.hero.cta')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      {/* Anything already on the road. The pulsing dot is the only motion on
          this screen, and it is here because the state is genuinely live. */}
      {active.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 ml-1 text-[17px] font-semibold text-primary">
            {t('business.home.activeNow')}
          </h2>
          <ul className="overflow-hidden rounded-[28px] bg-primary text-white shadow-lg shadow-primary/20">
            {active.map((d, i) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/business/deliveries/${d.id}`}
                  className="flex min-h-[5rem] items-center gap-4 px-5 py-3 transition-colors active:bg-primary-dark"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <ServiceIcon serviceType={d.service_type} className="h-6 w-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[17px] font-semibold">
                      {d.dropoff_name || d.dropoff_address || t('business.home.whereTo')}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2 text-[15px] text-white/85">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/70 motion-reduce:hidden" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-300 ring-2 ring-white/80" />
                      </span>
                      {t(statusLabelKey(d.status))}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-[16px] font-medium">
                    {t('business.home.track')}
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </Link>
                {i < active.length - 1 && <span className="ml-[5.25rem] block h-px bg-white/15" />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Services: photo cards, two per row, each with a floating label. */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {HOME_TILES.map(({ id, service, icon: Icon, iconImage }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChooseService(service)}
            className="group overflow-hidden rounded-2xl bg-white text-left shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5 transition active:scale-[0.98]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/services/home/${id}.webp`}
              alt=""
              loading="lazy"
              // Height follows the screen: the three rows share whatever is
              // left after the banner, labels, tracking strip, popular row
              // and bottom bar (about 33rem), so the page fills a phone
              // without leaving a gap or needing a scroll.
              className="h-[clamp(3rem,calc((100dvh_-_33rem)_/_3),8rem)] w-full object-cover"
            />
            <span className="relative mx-1 -mt-2.5 mb-1 flex items-center gap-1.5 rounded-xl bg-white px-1.5 py-1 shadow-sm ring-1 ring-slate-900/5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-white">
                {iconImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={iconImage} alt="" className="h-[18px] w-[18px] object-contain" />
                ) : (
                  Icon && <Icon className="h-4 w-4" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {/* Name and subtitle each stay on one line so the label is a
                    slim strip and the photo above keeps its height. */}
                <span className="block truncate text-[12.5px] font-bold leading-tight tracking-tight text-slate-900">
                  {t(`business.home.tiles.${id}.label`)}
                </span>
                <span className="block truncate text-[10px] leading-tight text-slate-600">
                  {t(`business.home.tiles.${id}.tagline`)}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* Somewhere sent to before. Hidden entirely on a new account. */}
      {recents.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-1 ml-1 text-[15px] font-medium text-gray-500">
            {t('business.home.recent')}
          </h2>
          <ul>
            {recents.map((d) => {
              const { title, detail } = splitAddress(d.address);
              return (
                <li key={d.address}>
                  <button
                    type="button"
                    onClick={() => onPickRecent(d)}
                    className="flex min-h-[4rem] w-full items-center gap-4 rounded-2xl px-1 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gray-100 text-slate-700">
                      <History className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      {/* Place names run long ("Julius Nyerere International
                          Convention Centre"), so wrap to two lines rather than
                          cutting the name off mid-word. */}
                      <span className="block line-clamp-2 text-[16px] font-semibold leading-tight text-slate-900">
                        {title}
                      </span>
                      {detail && (
                        <span className="mt-0.5 block truncate text-[14px] text-gray-500">
                          {detail}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Track Your Order: one tap to the activity list, where every order
          and its live status is. */}
      <Link
        href="/dashboard/business/rides"
        className="mt-3 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-primary-dark to-primary px-3.5 py-2 text-white shadow-md shadow-slate-900/10 transition active:scale-[0.99]"
      >
        <MapPinned className="h-7 w-7 shrink-0" strokeWidth={1.5} />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold leading-tight">
            {t('business.home.trackOrder.title')}
          </span>
          <span className="mt-0.5 block text-[12px] leading-snug text-white/85">
            {t('business.home.trackOrder.subtitle')}
          </span>
        </span>
        <span className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white px-3 text-[13px] font-bold text-slate-900 shadow-sm">
          {t('business.home.trackOrder.cta')}
          <ArrowRight className="h-4 w-4" />
        </span>
      </Link>

      {/* Popular places, six across. Tapping one starts a request with that
          destination filled in, exactly like picking a recent one. */}
      <section className="mt-3">
        <h2 className="mb-1.5 flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
          <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
          {t('business.home.popular.heading')}
        </h2>
        <ul className="grid grid-cols-6 gap-1">
          {POPULAR_LOCATIONS.map(({ id, icon: Icon, address }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => onPickRecent({ address, latitude: null, longitude: null })}
                className="flex h-full min-h-[3.75rem] w-full flex-col items-center gap-0.5 rounded-xl bg-gray-100 px-0.5 py-1.5 text-center transition-colors active:bg-gray-200"
              >
                <Icon className="h-5 w-5 shrink-0 text-primary" strokeWidth={1.75} />
                <span className="text-[10.5px] font-medium leading-tight text-slate-800">
                  {t(`business.home.popular.${id}`)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
