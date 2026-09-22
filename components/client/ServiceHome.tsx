'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, CalendarClock, History, ChevronRight } from 'lucide-react';
import ServiceIcon, { SERVICE_ICONS } from '@/components/common/ServiceIcon';
import { SERVICE_TYPES, type ServiceTypeKey } from '@/lib/serviceTypes';
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

/**
 * The client's home screen: see what is already on the road, pick a service,
 * jump straight to a destination, or reuse somewhere you sent to before.
 * Deliberately flat - tiles and rows sit on a tinted grey, with no shadows or
 * borders doing the separating. The one exception is the live delivery, which
 * is the only thing here that earns colour.
 */
export default function ServiceHome({
  onChooseService,
  onWhereTo,
  onScheduleLater,
  onPickRecent,
}: {
  onChooseService: (key: ServiceTypeKey) => void;
  onWhereTo: () => void;
  onScheduleLater: () => void;
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
      <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-gray-900">
        {t('business.home.heading')}
      </h1>

      {/* Anything already on the road. The pulsing dot is the only motion on
          this screen, and it is here because the state is genuinely live. */}
      {active.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 ml-1 text-[13px] font-semibold text-gray-500">
            {t('business.home.activeNow')}
          </h2>
          <ul className="overflow-hidden rounded-2xl bg-primary text-white">
            {active.map((d, i) => (
              <li key={d.id}>
                <Link
                  href={`/dashboard/business/deliveries/${d.id}`}
                  className="flex min-h-[4.5rem] items-center gap-3 px-4 py-3 transition-colors active:bg-primary-dark"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <ServiceIcon serviceType={d.service_type} className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {d.dropoff_name || d.dropoff_address || t('business.home.whereTo')}
                    </span>
                    <span className="mt-1 flex items-center gap-1.5 text-[13px] text-white/80">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70 motion-reduce:hidden" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
                      </span>
                      {t(statusLabelKey(d.status))}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-white/80">
                    {t('business.home.track')}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </Link>
                {i < active.length - 1 && <span className="ml-[3.5rem] block h-px bg-white/15" />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Services: two per row, name plus a short benefit line. */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {SERVICE_TYPES.map((s) => {
          const Icon = SERVICE_ICONS[s.icon] || SERVICE_ICONS.Package;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onChooseService(s.key)}
              className="flex min-h-[7rem] flex-col items-center justify-center gap-1 rounded-2xl bg-gray-100 px-3 py-4 text-center transition-colors hover:bg-gray-200/70 active:bg-gray-200"
            >
              <Icon className="h-9 w-9 text-gray-900" strokeWidth={1.5} />
              <span className="mt-1 text-[15px] font-semibold leading-tight text-gray-900">
                {t(s.labelKey)}
              </span>
              <span className="text-[13px] leading-tight text-gray-500">{t(s.taglineKey)}</span>
            </button>
          );
        })}
      </div>

      {/* Jump straight to a destination, or schedule it for later. */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gray-100 p-2 pl-4">
        <button
          type="button"
          onClick={onWhereTo}
          className="flex min-h-[2.75rem] flex-1 items-center gap-3 text-left"
        >
          <Search className="h-5 w-5 shrink-0 text-gray-900" />
          <span className="text-[17px] font-semibold text-gray-900">
            {t('business.home.whereTo')}
          </span>
        </button>
        <button
          type="button"
          onClick={onScheduleLater}
          className="inline-flex min-h-[2.75rem] shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-medium text-gray-900"
        >
          <CalendarClock className="h-4 w-4" />
          {t('business.home.later')}
        </button>
      </div>

      {/* Somewhere sent to before. Hidden entirely on a new account. */}
      {recents.length > 0 && (
        <section className="mt-5">
          <h2 className="mb-1 ml-1 text-[13px] font-semibold text-gray-500">
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
                    className="flex min-h-[4.5rem] w-full items-center gap-4 rounded-2xl px-1 text-left transition-colors hover:bg-gray-50 active:bg-gray-100"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                      <History className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      {/* Place names run long ("Julius Nyerere International
                          Convention Centre"), so wrap to two lines rather than
                          cutting the name off mid-word. */}
                      <span className="block line-clamp-2 text-[15px] font-semibold leading-tight text-gray-900">
                        {title}
                      </span>
                      {detail && (
                        <span className="mt-0.5 block truncate text-[13px] text-gray-500">
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
    </div>
  );
}
