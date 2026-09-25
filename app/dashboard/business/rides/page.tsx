'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Loader2, Plus, SlidersHorizontal, X, Package, ChevronRight, Receipt } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import ServiceIcon from '@/components/common/ServiceIcon';
import { statusBucket, statusLabelKey, BUCKET_DOT, BUCKET_TEXT } from '@/lib/deliveryStatus';
import { cardClass, chipCount, chipTrack, filterChip, inputClass, pageTitle, pillPrimary, stickyFilterBar } from '@/lib/ui';

interface Ride {
  id: string;
  pickup_address: string;
  pickup_name: string | null;
  dropoff_address: string | null;
  dropoff_name: string | null;
  status: string;
  service_type: string | null;
  vehicle_type_id: string | null;
  scheduled_pickup_at: string | null;
  created_at: string;
  delivered_at: string | null;
  delivery_fee?: number | null;
}

/** "All" plus the three shared status buckets, as the filter chips. */
type Bucket = 'ALL' | 'ACTIVE' | 'DONE' | 'FAILED';

function formatCurrency(v?: number | null) {
  if (v == null || v <= 0) return null;
  return new Intl.NumberFormat('en-TZ', {
    style: 'currency',
    currency: 'TZS',
    minimumFractionDigits: 0,
  }).format(v);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function RidesHistoryPage() {
  const t = useT();
  const [rides, setRides] = useState<Ride[]>([]);
  const [vehicleNames, setVehicleNames] = useState<Record<string, string>>({});
  const [unpaidInvoices, setUnpaidInvoices] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters. The chips carry the common case; the panel holds the date and
  // time ranges and stays shut until asked for.
  const [bucket, setBucket] = useState<Bucket>('ALL');
  const [panelOpen, setPanelOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [
          {
            data: { user },
          },
          vtRes,
        ] = await Promise.all([
          supabase.auth.getUser(),
          fetch('/api/vehicle-types').then((r) => (r.ok ? r.json() : [])),
        ]);

        const map: Record<string, string> = {};
        (Array.isArray(vtRes) ? vtRes : []).forEach((v: any) => (map[v.id] = v.name));
        setVehicleNames(map);

        if (!user) return;
        const { data: business } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();
        if (!business) return;

        const [{ data }, { data: invoices }] = await Promise.all([
          supabase
            .from('deliveries')
            .select('*')
            .eq('business_id', business.id)
            .order('created_at', { ascending: false }),
          supabase.from('invoices').select('status').eq('business_id', business.id),
        ]);
        setRides(data || []);
        setUnpaidInvoices((invoices || []).filter((i: any) => i.status !== 'PAID').length);
      } catch (err) {
        console.error('Error loading rides:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const counts = useMemo(() => {
    const c = { ALL: rides.length, ACTIVE: 0, DONE: 0, FAILED: 0 };
    rides.forEach((r) => (c[statusBucket(r.status)] += 1));
    return c;
  }, [rides]);

  const filtered = useMemo(() => {
    return rides.filter((r) => {
      if (bucket !== 'ALL' && statusBucket(r.status) !== bucket) return false;

      const d = new Date(r.created_at);
      if (dateFrom && d < new Date(`${dateFrom}T00:00:00`)) return false;
      if (dateTo && d > new Date(`${dateTo}T23:59:59`)) return false;

      if (timeFrom || timeTo) {
        const mins = d.getHours() * 60 + d.getMinutes();
        if (timeFrom) {
          const [h, m] = timeFrom.split(':').map(Number);
          if (mins < h * 60 + m) return false;
        }
        if (timeTo) {
          const [h, m] = timeTo.split(':').map(Number);
          if (mins > h * 60 + m) return false;
        }
      }
      return true;
    });
  }, [rides, bucket, dateFrom, dateTo, timeFrom, timeTo]);

  // Rides arrive newest first, so a single pass gives the day sections.
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const out: { key: string; label: string; rides: Ride[] }[] = [];
    for (const r of filtered) {
      const day = new Date(r.created_at);
      day.setHours(0, 0, 0, 0);
      const key = day.toDateString();
      if (out[out.length - 1]?.key !== key) {
        const label =
          day.getTime() === today.getTime()
            ? t('business.rides.today')
            : day.getTime() === yesterday.getTime()
              ? t('business.rides.yesterday')
              : day.toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  ...(day.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
                });
        out.push({ key, label, rides: [] });
      }
      out[out.length - 1].rides.push(r);
    }
    return out;
  }, [filtered, t]);

  const rangeFilters = Boolean(dateFrom || dateTo || timeFrom || timeTo);
  const anyFilters = rangeFilters || bucket !== 'ALL';

  function clearFilters() {
    setDateFrom('');
    setDateTo('');
    setTimeFrom('');
    setTimeTo('');
    setBucket('ALL');
  }

  const chips: { key: Bucket; label: string }[] = [
    { key: 'ALL', label: t('business.rides.status.all') },
    { key: 'ACTIVE', label: t('business.rides.status.active') },
    { key: 'DONE', label: t('business.rides.status.delivered') },
    { key: 'FAILED', label: t('business.rides.status.failed') },
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
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className={pageTitle}>{t('client.ridesHistory')}</h1>
        <Link href="/dashboard/business/request-ride" className={pillPrimary}>
          <Plus className="h-5 w-5" />
          <span className="hidden sm:inline">{t('client.requestRide')}</span>
        </Link>
      </div>

      {unpaidInvoices > 0 && (
        <Link
          href="/dashboard/business/invoices"
          className="mb-4 flex min-h-[3.25rem] items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-amber-900 transition-colors active:bg-amber-100"
        >
          <Receipt className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="flex-1 truncate text-[15px] font-medium">
            {t('business.rides.unpaidInvoices')}
          </span>
          <span className="shrink-0 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-bold">
            {unpaidInvoices}
          </span>
          <ChevronRight className="h-5 w-5 shrink-0 text-amber-400" />
        </Link>
      )}

      {/* Status chips stay in reach while the list scrolls. They carry the
          counts too, which is all the old stat grid was really saying. */}
      <div className={`${stickyFilterBar} flex items-center gap-2`}>
        <div className={`${chipTrack} flex-1`}>
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
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          aria-label={t('business.rides.moreFilters')}
          className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors ${
            panelOpen || rangeFilters
              ? 'border-gray-900 bg-gray-900 text-white'
              : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          <SlidersHorizontal className="h-[18px] w-[18px]" />
          {rangeFilters && !panelOpen && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-gray-50" />
          )}
        </button>
      </div>

      {panelOpen && (
        <div className={`${cardClass} mb-4 p-4`}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {t('business.rides.moreFilters')}
            </span>
            {anyFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 active:text-gray-900"
              >
                <X className="h-3.5 w-3.5" /> {t('business.rides.clear')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { label: t('business.rides.dateFrom'), type: 'date', value: dateFrom, set: setDateFrom },
              { label: t('business.rides.dateTo'), type: 'date', value: dateTo, set: setDateTo },
              { label: t('business.rides.timeFrom'), type: 'time', value: timeFrom, set: setTimeFrom },
              { label: t('business.rides.timeTo'), type: 'time', value: timeTo, set: setTimeTo },
            ].map((f) => (
              <label key={f.label} className="block">
                <span className="mb-1 block text-xs font-medium text-gray-600">{f.label}</span>
                <input
                  type={f.type}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  className={inputClass}
                />
              </label>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            {t('business.rides.showingCount', { shown: filtered.length, total: rides.length })}
          </p>
        </div>
      )}

      {days.length === 0 ? (
        <div className={`${cardClass} px-6 py-12 text-center`}>
          <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-base font-semibold text-gray-900">
            {anyFilters ? t('business.rides.emptyFiltered') : t('business.rides.emptyTitle')}
          </p>
          {!anyFilters && (
            <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500">
              {t('business.rides.emptyBody')}
            </p>
          )}
          <div className="mt-5">
            {anyFilters ? (
              <button type="button" onClick={clearFilters} className={pillPrimary}>
                {t('business.rides.clear')}
              </button>
            ) : (
              <Link href="/dashboard/business/request-ride" className={pillPrimary}>
                <Plus className="h-5 w-5" />
                {t('client.requestRide')}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {days.map((day) => (
            <section key={day.key}>
              <h2 className="mb-2 ml-1 text-[13px] font-semibold text-gray-500">{day.label}</h2>
              <div className={`${cardClass} overflow-hidden`}>
                <ul>
                  {day.rides.map((r, i) => {
                    const tone = statusBucket(r.status);
                    const destination =
                      r.dropoff_name || r.dropoff_address || r.pickup_name || r.pickup_address;
                    const origin = r.pickup_name || r.pickup_address;
                    const vehicle = r.vehicle_type_id ? vehicleNames[r.vehicle_type_id] : '';
                    const fee = formatCurrency(r.delivery_fee);
                    return (
                      <li key={r.id}>
                        <Link
                          href={`/dashboard/business/deliveries/${r.id}`}
                          className="flex gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 active:bg-gray-100"
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-700">
                            <ServiceIcon
                              serviceType={r.service_type}
                              className="h-[18px] w-[18px]"
                            />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-baseline gap-2">
                              <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-900">
                                {destination}
                              </span>
                              <span className="shrink-0 text-xs text-gray-400">
                                {formatTime(r.created_at)}
                              </span>
                            </span>
                            <span className="mt-0.5 block truncate text-[13px] text-gray-500">
                              {t('business.rides.from')} {origin}
                            </span>
                            <span className="mt-1.5 flex items-center gap-3">
                              <span
                                className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-medium ${BUCKET_TEXT[tone]}`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${BUCKET_DOT[tone]}`} />
                                {t(statusLabelKey(r.status))}
                              </span>
                              {vehicle && (
                                <span className="min-w-0 truncate text-xs text-gray-400">
                                  {vehicle}
                                </span>
                              )}
                              {fee && (
                                <span className="ml-auto shrink-0 text-xs font-semibold text-gray-900">
                                  {fee}
                                </span>
                              )}
                            </span>
                          </span>
                        </Link>
                        {i < day.rides.length - 1 && (
                          <span className="ml-[3.25rem] block h-px bg-gray-100" />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
