'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, Check, ChevronRight, Fuel, Loader2, Settings2, Snowflake, Users } from 'lucide-react';
import FieldGroup from '@/components/wizard/FieldGroup';
import LocationPicker from '@/components/common/LocationPicker';
import StepIndicator from '@/components/wizard/StepIndicator';
import StepShell from '@/components/wizard/StepShell';
import WizardFooter from '@/components/wizard/WizardFooter';
import { PickerField } from '@/components/client/DriverHireWizard';
import { useT } from '@/lib/i18n';
import { formatDateAndTime } from '@/lib/driverHire';
import type { BusinessProfile } from '@/lib/wizard/steps';
import { errorText, fieldLabel, inputClass, textareaClass } from '@/lib/ui';

/**
 * The vehicle categories a customer can rent. `label` is fixed English: it is
 * posted with the request and read raw on staff screens. What the customer
 * reads comes from vehicleHire.categories.<id>.
 */
const CATEGORIES = [
  { id: 'economy', label: 'Economy & Sedan' },
  { id: 'suv', label: 'SUV & 4x4' },
  { id: 'vans', label: 'Vans & Minivans' },
  { id: 'luxury', label: 'Luxury & Executive' },
  { id: 'pickup', label: 'Pickup & Utility Vehicles' },
] as const;
type CategoryId = (typeof CATEGORIES)[number]['id'];

const TRANSMISSIONS = ['automatic', 'manual', 'any'] as const;
const RENTAL_TYPES = [
  { id: 'self', label: 'Self drive (without driver)' },
  { id: 'driver', label: 'With driver' },
] as const;
const PURPOSES = [
  { id: 'personal', label: 'Personal use' },
  { id: 'business', label: 'Business' },
  { id: 'family', label: 'Family trip' },
  { id: 'tourism', label: 'Tourism / safari' },
  { id: 'event', label: 'Wedding or event' },
  { id: 'airport', label: 'Airport transfer' },
  { id: 'other', label: 'Other' },
] as const;

interface Place {
  address: string;
  latitude: number | null;
  longitude: number | null;
}
const emptyPlace: Place = { address: '', latitude: null, longitude: null };

interface Draft {
  category: CategoryId | '';
  pickup: Place;
  dropoff: Place;
  pickupDate: string;
  pickupTime: string;
  returnDate: string;
  returnTime: string;
  transmission: (typeof TRANSMISSIONS)[number];
  passengers: string;
  rentalType: (typeof RENTAL_TYPES)[number]['id'];
  purpose: string;
  requirements: string;
}

interface RentalVehicle {
  id: string;
  name: string;
  seats: number;
  transmission: 'automatic' | 'manual';
  fuel: string | null;
  has_ac: boolean;
  price_per_day: number;
  image_url: string | null;
}

const tzs = (n: number) => `TZS ${Math.round(n).toLocaleString('en-US')}`;

type Field = 'pickupLocation' | 'returnLocation' | 'pickupDate' | 'returnDate' | 'passengers';

function todayLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

function validate(d: Draft): { field: Field; code: string }[] {
  const out: { field: Field; code: string }[] = [];
  if (!d.pickup.address.trim()) out.push({ field: 'pickupLocation', code: 'pickupLocation' });
  if (!d.dropoff.address.trim()) out.push({ field: 'returnLocation', code: 'returnLocation' });
  const start = d.pickupDate && d.pickupTime ? new Date(`${d.pickupDate}T${d.pickupTime}`) : null;
  if (!start) out.push({ field: 'pickupDate', code: 'pickupDate' });
  else if (start.getTime() < Date.now()) out.push({ field: 'pickupDate', code: 'pickupPast' });
  const end = d.returnDate && d.returnTime ? new Date(`${d.returnDate}T${d.returnTime}`) : null;
  if (!end) out.push({ field: 'returnDate', code: 'returnDate' });
  else if (start && end.getTime() <= start.getTime()) out.push({ field: 'returnDate', code: 'returnBefore' });
  if (d.passengers && (Number(d.passengers) < 1 || Number(d.passengers) > 100)) {
    out.push({ field: 'passengers', code: 'passengers' });
  }
  return out;
}

/**
 * Vehicle Hire: pick a vehicle category, fill in the rental, review, send.
 * It is saved as a hire request for the team to match a vehicle to; there is
 * no vehicle search, price or payment on this side yet.
 */
export default function VehicleHireWizard({
  profile,
  onExit,
}: {
  profile: BusinessProfile | null;
  onExit: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  const [draft, setDraft] = useState<Draft>({
    category: '',
    pickup: { ...emptyPlace },
    dropoff: { ...emptyPlace },
    pickupDate: '',
    pickupTime: '',
    returnDate: '',
    returnTime: '',
    transmission: 'any',
    passengers: '',
    rentalType: 'self',
    purpose: '',
    requirements: '',
  });
  /** 0 = categories, 1 = booking form, 2 = available vehicles, 3 = review. */
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [vehicles, setVehicles] = useState<RentalVehicle[] | null>(null);
  const [vehicle, setVehicle] = useState<RentalVehicle | null>(null);
  const [needVehicle, setNeedVehicle] = useState(false);

  // Rental days, rounded up: 25 hours is two days.
  const days = useMemo(() => {
    if (!draft.pickupDate || !draft.pickupTime || !draft.returnDate || !draft.returnTime) return 0;
    const ms =
      new Date(`${draft.returnDate}T${draft.returnTime}`).getTime() -
      new Date(`${draft.pickupDate}T${draft.pickupTime}`).getTime();
    return ms > 0 ? Math.max(1, Math.ceil(ms / 86400000)) : 0;
  }, [draft.pickupDate, draft.pickupTime, draft.returnDate, draft.returnTime]);

  // Load the vehicles that match the form each time the list is opened.
  useEffect(() => {
    if (step !== 2) return;
    let alive = true;
    setVehicles(null);
    const sp = new URLSearchParams({ category: draft.category });
    if (draft.transmission !== 'any') sp.set('transmission', draft.transmission);
    if (draft.passengers) sp.set('passengers', draft.passengers);
    fetch(`/api/rental-vehicles?${sp}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => {
        if (!alive) return;
        const list: RentalVehicle[] = Array.isArray(rows) ? rows : [];
        setVehicles(list);
        setVehicle((v) => (v && list.some((x) => x.id === v.id) ? v : null));
      })
      .catch(() => alive && setVehicles([]));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const issues = useMemo(() => validate(draft), [draft]);
  const issueFor = (f: Field): string | null => {
    if (!showErrors) return null;
    const hit = issues.find((i) => i.field === f);
    return hit ? t(`vehicleHire.errors.${hit.code}`) : null;
  };

  useEffect(() => {
    rootRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  function go(to: number) {
    setError('');
    setShowErrors(false);
    setStep(to);
  }

  function next() {
    if (issues.length > 0) {
      setShowErrors(true);
      setStep(1);
      const first = issues[0].field;
      requestAnimationFrame(() => {
        rootRef.current
          ?.querySelector<HTMLElement>(`[data-field="${first}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return;
    }
    if (step === 1) go(2);
    else if (step === 2) {
      // With vehicles on offer one must be chosen; with none, the request
      // goes ahead and the team finds a vehicle.
      if (vehicles && vehicles.length > 0 && !vehicle) {
        setNeedVehicle(true);
        return;
      }
      go(3);
    } else submit();
  }

  const categoryLabel = CATEGORIES.find((c) => c.id === draft.category)?.label || '';
  const rentalLabel = RENTAL_TYPES.find((r) => r.id === draft.rentalType)?.label || '';
  const purposeLabel = PURPOSES.find((p) => p.id === draft.purpose)?.label || '';

  async function submit() {
    if (sending.current) return;
    sending.current = true;
    setError('');
    setSubmitting(true);
    try {
      // Staff read service_details raw, so these lines are fixed English.
      const details = [
        `Vehicle category: ${categoryLabel}`,
        vehicle && `Vehicle: ${vehicle.name}`,
        vehicle && `Price: ${tzs(vehicle.price_per_day)} / day`,
        vehicle && days > 0 && `Estimated total: ${tzs(vehicle.price_per_day * days)} (${days} day${days === 1 ? '' : 's'})`,
        `Rental type: ${rentalLabel}`,
        `Transmission: ${draft.transmission[0].toUpperCase()}${draft.transmission.slice(1)}`,
        `Pickup: ${formatDateAndTime(draft.pickupDate, draft.pickupTime)}`,
        `Return: ${formatDateAndTime(draft.returnDate, draft.returnTime)}`,
        draft.passengers && `Passengers: ${draft.passengers}`,
        purposeLabel && `Purpose: ${purposeLabel}`,
        draft.requirements.trim() && `Requirements: ${draft.requirements.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await fetch('/api/client/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: 'hire',
          hire_category: 'rental',
          pickup_address: draft.pickup.address,
          pickup_latitude: draft.pickup.latitude,
          pickup_longitude: draft.pickup.longitude,
          pickup_name: profile?.name || null,
          pickup_phone: profile?.phone || null,
          dropoff_address: draft.dropoff.address,
          dropoff_latitude: draft.dropoff.latitude,
          dropoff_longitude: draft.dropoff.longitude,
          scheduled_pickup_at: new Date(`${draft.pickupDate}T${draft.pickupTime}`).toISOString(),
          service_details: details,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error();
      router.push(
        data.deliveryId ? `/dashboard/business/deliveries/${data.deliveryId}` : '/dashboard/business/rides'
      );
      router.refresh();
    } catch {
      setError(t('vehicleHire.errors.submitFailed'));
      setSubmitting(false);
      sending.current = false;
    }
  }

  // ------------------------------------------------------- 1. categories
  if (step === 0) {
    return (
      <div ref={rootRef} className="mx-auto w-full max-w-md">
        <section className="relative mb-4 h-32 overflow-hidden rounded-3xl bg-primary-dark shadow-lg shadow-slate-900/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/services/hire/fleet.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-r from-primary-dark via-primary-dark/80 to-primary-dark/10"
          />
          <button
            type="button"
            onClick={onExit}
            aria-label={t('common.back')}
            className="absolute left-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur active:bg-white/30"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="relative flex h-full flex-col justify-end p-4">
            <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight text-white">
              {t('vehicleHire.title')}
            </h1>
            <p className="text-[13px] font-semibold text-yellow-400">{t('vehicleHire.tagline')}</p>
          </div>
        </section>

        <h2 className="mb-2 flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
          <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
          {t('vehicleHire.chooseCategory')}
        </h2>

        <ul className="space-y-3">
          {CATEGORIES.map(({ id }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  set({ category: id });
                  go(1);
                }}
                className="flex w-full items-stretch overflow-hidden rounded-2xl bg-white text-left shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5 transition active:scale-[0.99]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/services/hire/${id}.webp`}
                  alt=""
                  loading="lazy"
                  className="h-24 w-32 shrink-0 object-cover"
                />
                <span className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2">
                  <span className="block text-[15px] font-bold leading-tight text-slate-900">
                    {t(`vehicleHire.categories.${id}.title`)}
                  </span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-slate-600">
                    {t(`vehicleHire.categories.${id}.desc`)}
                  </span>
                </span>
                <ChevronRight className="mr-2 h-5 w-5 shrink-0 self-center text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hint =
    step === 2 && needVehicle && !vehicle
      ? t('vehicleHire.errors.chooseVehicle')
      : showErrors && issues.length > 0
        ? t(`vehicleHire.errors.${issues[0].code}`)
        : null;

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-md">
      <StepIndicator
        service="hire"
        steps={[
          { id: 'category', label: t('vehicleHire.chooseCategory') },
          { id: 'form', label: t('vehicleHire.formTitle') },
          { id: 'vehicles', label: t('vehicleHire.vehiclesTitle') },
          { id: 'review', label: t('vehicleHire.reviewTitle') },
        ]}
        current={step}
        onJump={(i) => go(i)}
      />

      {/* ------------------------------------------------ 2. booking form */}
      {step === 1 && (
        <StepShell service="hire" title={t('vehicleHire.formTitle')}>
          <FieldGroup label={t('vehicleHire.sections.rental')}>
            <div data-field="pickupLocation">
              <LocationPicker
                label={t('vehicleHire.fields.pickupLocation')}
                placeholder={t('vehicleHire.searchPlaceholder')}
                value={draft.pickup.address}
                onChange={(address, latitude, longitude) =>
                  set({ pickup: { address, latitude, longitude } })
                }
                error={issueFor('pickupLocation')}
              />
            </div>
            <div data-field="returnLocation">
              <LocationPicker
                showMyLocation={false}
                label={t('vehicleHire.fields.returnLocation')}
                placeholder={t('vehicleHire.searchPlaceholder')}
                value={draft.dropoff.address}
                onChange={(address, latitude, longitude) =>
                  set({ dropoff: { address, latitude, longitude } })
                }
                error={issueFor('returnLocation')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3" data-field="pickupDate">
              <div>
                <label className={fieldLabel} htmlFor="vhPickDate">
                  {t('vehicleHire.fields.pickupDate')}
                </label>
                <PickerField
                  id="vhPickDate"
                  type="date"
                  min={todayLocal()}
                  value={draft.pickupDate}
                  onChange={(v) => set({ pickupDate: v })}
                  invalid={!!issueFor('pickupDate')}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="vhPickTime">
                  {t('vehicleHire.fields.pickupTime')}
                </label>
                <PickerField
                  id="vhPickTime"
                  type="time"
                  value={draft.pickupTime}
                  onChange={(v) => set({ pickupTime: v })}
                  invalid={!!issueFor('pickupDate')}
                />
              </div>
            </div>
            {issueFor('pickupDate') && <p className={`${errorText} !mt-0`}>{issueFor('pickupDate')}</p>}
            <div className="grid grid-cols-2 gap-3" data-field="returnDate">
              <div>
                <label className={fieldLabel} htmlFor="vhRetDate">
                  {t('vehicleHire.fields.returnDate')}
                </label>
                <PickerField
                  id="vhRetDate"
                  type="date"
                  min={draft.pickupDate || todayLocal()}
                  value={draft.returnDate}
                  onChange={(v) => set({ returnDate: v })}
                  invalid={!!issueFor('returnDate')}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="vhRetTime">
                  {t('vehicleHire.fields.returnTime')}
                </label>
                <PickerField
                  id="vhRetTime"
                  type="time"
                  value={draft.returnTime}
                  onChange={(v) => set({ returnTime: v })}
                  invalid={!!issueFor('returnDate')}
                />
              </div>
            </div>
            {issueFor('returnDate') && <p className={`${errorText} !mt-0`}>{issueFor('returnDate')}</p>}
          </FieldGroup>

          <FieldGroup label={t('vehicleHire.sections.prefs')}>
            <div>
              <span className={fieldLabel}>{t('vehicleHire.fields.transmission')}</span>
              <Segmented
                options={TRANSMISSIONS.map((x) => ({ id: x, label: t(`vehicleHire.transmissions.${x}`) }))}
                value={draft.transmission}
                onChange={(v) => set({ transmission: v as Draft['transmission'] })}
              />
            </div>
            <div data-field="passengers">
              <label className={fieldLabel} htmlFor="vhPassengers">
                {t('vehicleHire.fields.passengers')}
              </label>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-400" />
                <input
                  id="vhPassengers"
                  inputMode="numeric"
                  value={draft.passengers}
                  onChange={(e) => set({ passengers: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  className={`${inputClass} pl-10 ${issueFor('passengers') ? 'border-red-300' : ''}`}
                />
              </div>
              {issueFor('passengers') && <p className={errorText}>{issueFor('passengers')}</p>}
            </div>
          </FieldGroup>

          <FieldGroup label={t('vehicleHire.sections.options')}>
            <div>
              <span className={fieldLabel}>{t('vehicleHire.fields.rentalType')}</span>
              <Segmented
                options={RENTAL_TYPES.map((r) => ({ id: r.id, label: t(`vehicleHire.rentalTypes.${r.id}`) }))}
                value={draft.rentalType}
                onChange={(v) => set({ rentalType: v as Draft['rentalType'] })}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="vhPurpose">
                {t('vehicleHire.fields.purpose')}
              </label>
              <select
                id="vhPurpose"
                value={draft.purpose}
                onChange={(e) => set({ purpose: e.target.value })}
                className={inputClass}
              >
                <option value="">{t('vehicleHire.purposeChoose')}</option>
                {PURPOSES.map(({ id }) => (
                  <option key={id} value={id}>
                    {t(`vehicleHire.purposes.${id}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={fieldLabel} htmlFor="vhReq">
                {t('vehicleHire.fields.requirements')}
              </label>
              <textarea
                id="vhReq"
                value={draft.requirements}
                onChange={(e) => set({ requirements: e.target.value.slice(0, 1000) })}
                className={textareaClass}
              />
            </div>
          </FieldGroup>
        </StepShell>
      )}

      {/* ------------------------------------------ 3. available vehicles */}
      {step === 2 && (
        <StepShell service="hire" title={t('vehicleHire.vehiclesTitle')}>
          {vehicles === null ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white px-5 py-8 text-center shadow-sm">
              <p className="text-[15px] font-semibold text-gray-900">{t('vehicleHire.noVehicles')}</p>
              <p className="mx-auto mt-1 max-w-xs text-[14px] text-gray-500">
                {t('vehicleHire.noVehiclesBody')}
              </p>
            </div>
          ) : (
            <ul role="radiogroup" className="space-y-4">
              {vehicles.map((v) => {
                const selected = vehicle?.id === v.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setVehicle(v)}
                      className={`relative block w-full overflow-hidden rounded-3xl bg-white text-left shadow-md shadow-slate-900/10 transition active:scale-[0.99] ${
                        selected ? 'ring-2 ring-primary' : 'ring-1 ring-slate-900/5'
                      }`}
                    >
                      <span className="relative block bg-gray-100">
                        {v.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={v.image_url} alt="" loading="lazy" className="h-40 w-full object-cover" />
                        )}
                        <span className="absolute left-3 top-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow">
                          {t('vehicleHire.available')}
                        </span>
                        <span
                          className={`absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full border-2 shadow-sm ${
                            selected ? 'border-white bg-primary text-white' : 'border-white bg-white/70'
                          }`}
                        >
                          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                        </span>
                      </span>
                      <span className="block px-4 pb-3.5 pt-3">
                        <span className="block text-[16px] font-bold leading-tight text-slate-900">
                          {v.name}
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5 text-[12px] font-medium text-slate-700">
                          {[
                            { Icon: Users, label: t('vehicleHire.seats', { n: v.seats }) },
                            { Icon: Settings2, label: t(`vehicleHire.transmissions.${v.transmission}`) },
                            ...(v.fuel ? [{ Icon: Fuel, label: v.fuel }] : []),
                            ...(v.has_ac ? [{ Icon: Snowflake, label: 'AC' }] : []),
                          ].map(({ Icon, label }) => (
                            <span
                              key={label}
                              className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1"
                            >
                              <Icon className="h-3.5 w-3.5 text-primary" />
                              {label}
                            </span>
                          ))}
                        </span>
                        <span className="mt-3 flex items-end justify-between gap-3">
                          <span>
                            <span className="text-[18px] font-extrabold tracking-tight text-primary-dark">
                              {tzs(v.price_per_day)}
                            </span>
                            <span className="text-[13px] text-gray-500"> {t('vehicleHire.perDay')}</span>
                          </span>
                          {days > 0 && (
                            <span className="text-right text-[12px] leading-tight text-gray-500">
                              {t('vehicleHire.daysTotal', { n: days })}
                              <span className="block text-[13px] font-bold text-slate-900">
                                {tzs(v.price_per_day * days)}
                              </span>
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </StepShell>
      )}

      {/* ------------------------------------------------------ 4. review */}
      {step === 3 && (
        <StepShell service="hire" title={t('vehicleHire.reviewTitle')}>
          <div className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={vehicle?.image_url || `/services/hire/${draft.category}.webp`}
              alt=""
              className="h-36 w-full object-cover"
            />
            <dl className="divide-y divide-gray-100">
              {(
                [
                  [t('vehicleHire.fields.category'), t(`vehicleHire.categories.${draft.category}.title`)],
                  [t('vehicleHire.fields.vehicle'), vehicle?.name || ''],
                  [
                    t('vehicleHire.fields.price'),
                    vehicle ? `${tzs(vehicle.price_per_day)} ${t('vehicleHire.perDay')}` : '',
                  ],
                  [
                    t('vehicleHire.fields.total'),
                    vehicle && days > 0
                      ? `${tzs(vehicle.price_per_day * days)}\n${t('vehicleHire.daysTotal', { n: days })}`
                      : '',
                  ],
                  [t('vehicleHire.fields.rentalType'), t(`vehicleHire.rentalTypes.${draft.rentalType}`)],
                  [
                    t('vehicleHire.fields.pickup'),
                    `${draft.pickup.address}\n${formatDateAndTime(draft.pickupDate, draft.pickupTime)}`,
                  ],
                  [
                    t('vehicleHire.fields.return'),
                    `${draft.dropoff.address}\n${formatDateAndTime(draft.returnDate, draft.returnTime)}`,
                  ],
                  [t('vehicleHire.fields.transmission'), t(`vehicleHire.transmissions.${draft.transmission}`)],
                  [t('vehicleHire.fields.passengers'), draft.passengers],
                  [t('vehicleHire.fields.purpose'), draft.purpose ? t(`vehicleHire.purposes.${draft.purpose}`) : ''],
                  [t('vehicleHire.fields.requirements'), draft.requirements.trim()],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex items-start gap-3 px-4 py-3">
                    <dt className="w-24 shrink-0 text-[13px] text-gray-500">{k}</dt>
                    <dd className="min-w-0 flex-1 whitespace-pre-line text-[15px] text-gray-900">{v}</dd>
                    <button
                      type="button"
                      onClick={() =>
                        go(
                          [t('vehicleHire.fields.vehicle'), t('vehicleHire.fields.price'), t('vehicleHire.fields.total')].includes(k)
                            ? 2
                            : 1
                        )
                      }
                      className="shrink-0 text-[13px] font-semibold text-primary active:text-primary-dark"
                    >
                      {t('vehicleHire.edit')}
                    </button>
                  </div>
                ))}
            </dl>
          </div>
        </StepShell>
      )}

      {error && (
        <div
          role="alert"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-[15px] text-red-700"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      <WizardFooter
        onBack={() => go(step - 1)}
        onNext={next}
        nextLabel={step === 3 ? t('vehicleHire.submit') : t('vehicleHire.continue')}
        loading={submitting}
        hint={hint}
      />
    </div>
  );
}

/** A row of equal buttons for a short either/or choice. */
function Segmented({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div role="radiogroup" className="flex gap-2">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.id)}
            className={`min-h-[2.75rem] flex-1 rounded-xl border px-2 text-[14px] font-semibold leading-tight transition-colors ${
              on
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 bg-white text-gray-700 active:bg-gray-100'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
