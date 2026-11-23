'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Check, CheckCircle2, User, X } from 'lucide-react';
import FieldGroup from '@/components/wizard/FieldGroup';
import LocationPicker from '@/components/common/LocationPicker';
import { OptionGroup, OptionRow } from '@/components/wizard/OptionGroup';
import StepIndicator from '@/components/wizard/StepIndicator';
import WizardFooter from '@/components/wizard/WizardFooter';
import { useT } from '@/lib/i18n';
import {
  TRANSMISSION_RULES,
  VEHICLE_CATEGORIES,
  VEHICLE_TYPES,
  formatClock,
  formatDate,
  formatDateAndTime,
  statusLabelKey,
  validateDriverRequest,
  type DriverRequestField,
  type DriverRequestInput,
  type VehicleCategory,
} from '@/lib/driverHire';
import type { BusinessProfile } from '@/lib/wizard/steps';
import {
  cardClass,
  errorText,
  fieldLabel,
  inputClass,
  pillGhost,
  pillPrimary,
  sectionLabel,
  textareaClass,
} from '@/lib/ui';

type StepId = 'category' | 'transmission' | 'when' | 'trip' | 'review';

/** Which fields each step is responsible for; Continue checks only these. */
const STEP_FIELDS: Record<StepId, DriverRequestField[]> = {
  category: ['category'],
  transmission: ['transmission'],
  when: ['departureDate', 'departureTime', 'returnDate', 'returnTime'],
  trip: ['pickup', 'destination', 'passengers'],
  review: [
    'category',
    'transmission',
    'departureDate',
    'departureTime',
    'returnDate',
    'returnTime',
    'pickup',
    'destination',
    'passengers',
  ],
};

const CATEGORY_IMAGE: Record<VehicleCategory, string> = {
  light: '/services/home/hire.webp',
  heavy: '/services/home/freight.webp',
};

interface Place {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface Draft {
  category: VehicleCategory | '';
  vehicleType: string;
  /** 'any' is the explicit "not sure / does not apply" answer. */
  transmission: 'manual' | 'automatic' | 'any' | '';
  departureDate: string;
  departureTime: string;
  returnDate: string;
  returnTime: string;
  pickup: Place;
  destination: Place;
  passengers: string;
  duration: string;
  info: string;
}

interface SubmittedRequest {
  id: string;
  reference_number: string;
  status: string;
  created_at: string;
}

const emptyPlace: Place = { address: '', latitude: null, longitude: null };

function todayLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

function toInput(d: Draft): DriverRequestInput & Record<string, unknown> {
  return {
    vehicle_category: d.category,
    vehicle_type: d.vehicleType || null,
    transmission_type: d.transmission === 'manual' || d.transmission === 'automatic' ? d.transmission : null,
    departure_date: d.departureDate,
    departure_time: d.departureTime,
    return_date: d.returnDate || null,
    return_time: d.returnDate && d.returnTime ? d.returnTime : d.returnTime || null,
    pickup_location: d.pickup.address,
    pickup_latitude: d.pickup.latitude,
    pickup_longitude: d.pickup.longitude,
    destination: d.destination.address,
    destination_latitude: d.destination.latitude,
    destination_longitude: d.destination.longitude,
    passenger_count: d.passengers.trim() === '' ? null : d.passengers.trim(),
    trip_duration: d.duration.trim() || null,
    additional_information: d.info.trim() || null,
  };
}

/**
 * Driver Hire: the customer owns the vehicle and asks for a professional
 * driver. Five steps - vehicle, transmission, when, trip, review - and then a
 * confirmation. Submitting creates a request for the team to review and call
 * about; nothing here picks a driver, quotes a price or takes a payment.
 */
export default function DriverHireWizard({
  profile,
  onExit,
}: {
  /** The signed-in business, used to prefill the pick-up. */
  profile: BusinessProfile | null;
  /** Back to the home screen. */
  onExit: () => void;
}) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  const [draft, setDraft] = useState<Draft>(() => ({
    category: '',
    vehicleType: '',
    transmission: '',
    departureDate: '',
    departureTime: '',
    returnDate: '',
    returnTime: '',
    pickup: { ...emptyPlace, address: profile?.address || '' },
    destination: { ...emptyPlace },
    passengers: '',
    duration: '',
    info: '',
  }));
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<SubmittedRequest | null>(null);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  // The profile can arrive after the first render; fill the pick-up only if
  // the customer has not typed one yet.
  useEffect(() => {
    if (profile?.address) {
      setDraft((d) =>
        d.pickup.address ? d : { ...d, pickup: { ...emptyPlace, address: profile.address } }
      );
    }
  }, [profile?.address]);

  // A category with no transmission choices skips that question.
  const steps: StepId[] = useMemo(() => {
    const all: StepId[] = ['category', 'transmission', 'when', 'trip', 'review'];
    if (draft.category && TRANSMISSION_RULES[draft.category].options.length === 0) {
      return all.filter((s) => s !== 'transmission');
    }
    return all;
  }, [draft.category]);
  const current = steps[Math.min(step, steps.length - 1)];
  const isLast = step >= steps.length - 1;

  const issues = useMemo(() => {
    const all = validateDriverRequest(toInput(draft));
    return all.filter((i) => STEP_FIELDS[current].includes(i.field));
  }, [draft, current]);
  const issueFor = (field: DriverRequestField): string | null => {
    if (!showErrors) return null;
    const hit = issues.find((i) => i.field === field);
    return hit ? t(`driverHire.errors.${hit.code}`) : null;
  };

  // <main> is the scrolling element, not the document.
  useEffect(() => {
    rootRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step, done]);

  function go(to: number) {
    setError('');
    setShowErrors(false);
    setStep(to);
  }

  function next() {
    if (issues.length > 0) {
      setShowErrors(true);
      const first = issues[0].field;
      requestAnimationFrame(() => {
        rootRef.current
          ?.querySelector<HTMLElement>(`[data-field="${first}"]`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      });
      return;
    }
    if (!isLast) go(step + 1);
    else submit();
  }

  async function submit() {
    // The ref closes the gap before React re-renders the disabled button, so
    // a fast double tap cannot send the request twice.
    if (sending.current) return;
    sending.current = true;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/client/driver-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toInput(draft)),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const key = `driverHire.errors.${data.code}`;
        const translated = data.code ? t(key) : key;
        throw new Error(translated !== key ? translated : t('driverHire.errors.submitFailed'));
      }
      setDone(data.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('driverHire.errors.submitFailed'));
    } finally {
      setSubmitting(false);
      sending.current = false;
    }
  }

  // ------------------------------------------------------------ success
  if (done) {
    return (
      <div ref={rootRef} className="mx-auto w-full max-w-md pt-6">
        <div className={`${cardClass} px-5 py-8 text-center`}>
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" />
          </span>
          <h1 className="mt-4 font-display text-[22px] font-bold leading-tight tracking-tight text-gray-900">
            {t('driverHire.success.title')}
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-[15px] leading-snug text-gray-600">
            {t('driverHire.success.message')}
          </p>

          <dl className="mt-6 divide-y divide-gray-100 rounded-2xl border border-gray-100 text-left">
            {[
              [t('driverHire.fields.reference'), done.reference_number],
              [
                t('driverHire.fields.submitted'),
                new Date(done.created_at).toLocaleString('en-GB', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              ],
              [t('driverHire.fields.status'), t(statusLabelKey(done.status))],
            ].map(([label, value]) => (
              <div key={label} className="flex items-baseline gap-3 px-4 py-3">
                <dt className="w-32 shrink-0 text-[13px] text-gray-500">{label}</dt>
                <dd className="min-w-0 flex-1 text-[15px] font-semibold text-gray-900">{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-col gap-3">
            <Link href="/dashboard/business/driver-requests" className={`${pillPrimary} h-12 text-base`}>
              {t('driverHire.success.viewRequests')}
            </Link>
            <button type="button" onClick={onExit} className={`${pillGhost} h-12 text-base`}>
              {t('driverHire.success.backHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const rule = draft.category ? TRANSMISSION_RULES[draft.category] : null;
  const hint = showErrors && issues.length > 0 ? t(`driverHire.errors.${issues[0].code}`) : null;
  const edit = (id: StepId) => () => go(steps.indexOf(id));
  const vehicleTypeLabel = (value: string) => value;

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-md">
      <StepIndicator
        service="ride"
        steps={steps.map((id) => ({ id, label: t(`driverHire.steps.${id}.title`) }))}
        current={step}
        onJump={(i) => go(i)}
      />

      <header className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <User className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-gray-900">
            {t(`driverHire.steps.${current}.title`)}
          </h1>
        </div>
      </header>

      <div className="space-y-5">
        {/* ------------------------------------------------ 1. category */}
        {current === 'category' && (
          <>
            <div data-field="category" role="radiogroup" className="grid gap-3">
              {VEHICLE_CATEGORIES.map((cat) => {
                const selected = draft.category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() =>
                      set(
                        selected
                          ? {}
                          : { category: cat, vehicleType: '', transmission: '' }
                      )
                    }
                    className={`relative flex overflow-hidden rounded-2xl border text-left transition-colors ${
                      selected
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 bg-white active:bg-gray-50'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={CATEGORY_IMAGE[cat]}
                      alt=""
                      className="h-20 w-28 shrink-0 object-cover"
                    />
                    <span className="flex min-w-0 flex-1 items-center p-3 pr-9">
                      <span className="block text-[16px] font-bold leading-tight text-gray-900">
                        {t(`driverHire.categories.${cat}.title`)}
                      </span>
                    </span>
                    <span
                      className={`absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded-full border ${
                        selected ? 'border-primary bg-primary text-white' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                  </button>
                );
              })}
            </div>
            {issueFor('category') && <p className={errorText}>{issueFor('category')}</p>}

            {draft.category && (
              <section>
                <h2 className={sectionLabel}>{t('driverHire.vehicleTypeLabel')}</h2>
                <select
                  value={draft.vehicleType}
                  onChange={(e) => set({ vehicleType: e.target.value })}
                  aria-label={t('driverHire.vehicleTypeLabel')}
                  className={inputClass}
                >
                  <option value="">{t('driverHire.vehicleTypeChoose')}</option>
                  {VEHICLE_TYPES[draft.category].map(({ id, value }) => (
                    <option key={id} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </section>
            )}
          </>
        )}

        {/* -------------------------------------------- 2. transmission */}
        {current === 'transmission' && rule && (
          <div data-field="transmission">
            <OptionGroup columns={2}>
              {rule.options.map((tx) => (
                <OptionRow
                  key={tx}
                  selected={draft.transmission === tx}
                  onSelect={() => set({ transmission: tx })}
                  layout="tile"
                  icon={<span className="text-[15px] font-bold">{tx === 'manual' ? 'M' : 'A'}</span>}
                  title={t(`driverHire.transmissions.${tx}.title`)}
                />
              ))}
            </OptionGroup>
            {!rule.required && (
              <div className="mt-3">
                <OptionRow
                  selected={draft.transmission === 'any'}
                  onSelect={() => set({ transmission: 'any' })}
                  title={t('driverHire.transmissions.any.title')}
                />
              </div>
            )}
            {issueFor('transmission') && <p className={errorText}>{issueFor('transmission')}</p>}
          </div>
        )}

        {/* ---------------------------------------------------- 3. when */}
        {current === 'when' && (
          <>
            <FieldGroup label={t('driverHire.when.departure')}>
              <div className="grid grid-cols-2 gap-3">
                <div data-field="departureDate">
                  <label className={fieldLabel} htmlFor="dhDepDate">
                    {t('driverHire.fields.travelDate')}
                  </label>
                  <PickerField
                    id="dhDepDate"
                    type="date"
                    min={todayLocal()}
                    value={draft.departureDate}
                    onChange={(v) => set({ departureDate: v })}
                    invalid={!!issueFor('departureDate')}
                  />
                </div>
                <div data-field="departureTime">
                  <label className={fieldLabel} htmlFor="dhDepTime">
                    {t('driverHire.fields.departureTime')}
                  </label>
                  <PickerField
                    id="dhDepTime"
                    type="time"
                    value={draft.departureTime}
                    onChange={(v) => set({ departureTime: v })}
                    invalid={!!issueFor('departureTime')}
                  />
                </div>
              </div>
              {(issueFor('departureDate') || issueFor('departureTime')) && (
                <p className={`${errorText} !mt-0`}>
                  {issueFor('departureDate') || issueFor('departureTime')}
                </p>
              )}
            </FieldGroup>

            <FieldGroup label={t('driverHire.when.return')}>
              <div className="grid grid-cols-2 gap-3">
                <div data-field="returnDate">
                  <label className={fieldLabel} htmlFor="dhRetDate">
                    {t('driverHire.fields.returnDate')}
                  </label>
                  <PickerField
                    id="dhRetDate"
                    type="date"
                    min={draft.departureDate || todayLocal()}
                    value={draft.returnDate}
                    onChange={(v) => set(v ? { returnDate: v } : { returnDate: '', returnTime: '' })}
                    invalid={!!issueFor('returnDate')}
                    clearLabel={t('driverHire.clear')}
                  />
                </div>
                <div data-field="returnTime">
                  <label className={fieldLabel} htmlFor="dhRetTime">
                    {t('driverHire.fields.returnTime')}
                  </label>
                  <PickerField
                    id="dhRetTime"
                    type="time"
                    value={draft.returnTime}
                    onChange={(v) => set({ returnTime: v })}
                    invalid={!!issueFor('returnTime')}
                    clearLabel={t('driverHire.clear')}
                  />
                </div>
              </div>
              {(issueFor('returnDate') || issueFor('returnTime')) && (
                <p className={`${errorText} !mt-0`}>
                  {issueFor('returnDate') || issueFor('returnTime')}
                </p>
              )}
            </FieldGroup>
          </>
        )}

        {/* ---------------------------------------------------- 4. trip */}
        {current === 'trip' && (
          <>
            <FieldGroup>
              <div data-field="pickup">
                <LocationPicker
                  label={t('driverHire.fields.pickup')}
                  placeholder={t('driverHire.trip.searchPlaceholder')}
                  value={draft.pickup.address}
                  onChange={(address, latitude, longitude) =>
                    set({ pickup: { address, latitude, longitude } })
                  }
                  error={issueFor('pickup')}
                />
              </div>
              <div data-field="destination">
                <LocationPicker
                  showMyLocation={false}
                  label={t('driverHire.fields.destination')}
                  placeholder={t('driverHire.trip.searchPlaceholder')}
                  value={draft.destination.address}
                  onChange={(address, latitude, longitude) =>
                    set({ destination: { address, latitude, longitude } })
                  }
                  error={issueFor('destination')}
                />
              </div>
            </FieldGroup>

            <FieldGroup label={t('driverHire.trip.optional')}>
              <div className="grid grid-cols-2 gap-3">
                <div data-field="passengers">
                  <label className={fieldLabel} htmlFor="dhPassengers">
                    {t('driverHire.fields.passengers')}
                  </label>
                  <input
                    id="dhPassengers"
                    inputMode="numeric"
                    value={draft.passengers}
                    onChange={(e) => set({ passengers: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                    aria-invalid={issueFor('passengers') ? true : undefined}
                    className={`${inputClass} ${issueFor('passengers') ? 'border-red-300' : ''}`}
                  />
                </div>
                <div>
                  <label className={fieldLabel} htmlFor="dhDuration">
                    {t('driverHire.fields.duration')}
                  </label>
                  <input
                    id="dhDuration"
                    value={draft.duration}
                    onChange={(e) => set({ duration: e.target.value.slice(0, 120) })}
                    placeholder={t('driverHire.trip.durationPlaceholder')}
                    className={inputClass}
                  />
                </div>
              </div>
              {issueFor('passengers') && (
                <p className={`${errorText} !mt-0`}>{issueFor('passengers')}</p>
              )}
              <div>
                <label className={fieldLabel} htmlFor="dhInfo">
                  {t('driverHire.fields.info')}
                </label>
                <textarea
                  id="dhInfo"
                  value={draft.info}
                  onChange={(e) => set({ info: e.target.value.slice(0, 2000) })}
                  placeholder={t('driverHire.trip.infoPlaceholder')}
                  className={textareaClass}
                />
              </div>
            </FieldGroup>
          </>
        )}

        {/* -------------------------------------------------- 5. review */}
        {current === 'review' && (
          <>
            <FieldGroup padded={false}>
              <Row
                first
                label={t('driverHire.fields.category')}
                value={draft.category ? t(`driverHire.categories.${draft.category}.title`) : ''}
                onEdit={edit('category')}
              />
              <Row
                label={t('driverHire.fields.vehicleType')}
                value={draft.vehicleType ? vehicleTypeLabel(draft.vehicleType) : ''}
                onEdit={edit('category')}
              />
              {steps.includes('transmission') && (
                <Row
                  label={t('driverHire.fields.transmission')}
                  value={t(`driverHire.transmissions.${draft.transmission || 'any'}.title`)}
                  onEdit={edit('transmission')}
                />
              )}
              <Row
                label={t('driverHire.fields.travelDate')}
                value={formatDate(draft.departureDate)}
                onEdit={edit('when')}
              />
              <Row
                label={t('driverHire.fields.departureTime')}
                value={formatClock(draft.departureTime)}
                onEdit={edit('when')}
              />
              <Row
                label={t('driverHire.fields.return')}
                value={formatDateAndTime(draft.returnDate, draft.returnTime)}
                onEdit={edit('when')}
              />
              <Row
                label={t('driverHire.fields.pickup')}
                value={draft.pickup.address}
                onEdit={edit('trip')}
              />
              <Row
                label={t('driverHire.fields.destination')}
                value={draft.destination.address}
                onEdit={edit('trip')}
              />
              <Row
                label={t('driverHire.fields.passengers')}
                value={draft.passengers}
                onEdit={edit('trip')}
              />
              <Row
                label={t('driverHire.fields.duration')}
                value={draft.duration}
                onEdit={edit('trip')}
              />
              <Row
                label={t('driverHire.fields.info')}
                value={draft.info}
                onEdit={edit('trip')}
              />
            </FieldGroup>
          </>
        )}
      </div>

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
        onBack={step > 0 ? () => go(step - 1) : onExit}
        onNext={next}
        nextLabel={isLast ? t('driverHire.submit') : t('driverHire.continue')}
        loading={submitting}
        hint={hint}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/**
 * A date or time, shown our way (dd/mm/yyyy, 24-hour). The native input is
 * kept for its picker but made invisible and laid over a box that prints the
 * value, because a native date input uses the browser's own order.
 */
function PickerField({
  id,
  type,
  value,
  onChange,
  min,
  invalid,
  clearLabel,
}: {
  id: string;
  type: 'date' | 'time';
  value: string;
  onChange: (v: string) => void;
  min?: string;
  invalid?: boolean;
  /** Set for an optional field: shows a clear button with this label. */
  clearLabel?: string;
}) {
  const shown = type === 'date' ? formatDate(value) : formatClock(value);
  return (
    <div className="relative">
      <div
        aria-hidden
        className={`${inputClass} flex items-center !px-3 ${invalid ? 'border-red-300' : ''} ${
          value ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {shown || (type === 'date' ? 'dd/mm/yyyy' : '--:--')}
      </div>
      <input
        id={id}
        type={type}
        min={min}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* not allowed in this context - the native tap still works */
          }
        }}
        aria-invalid={invalid ? true : undefined}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      {clearLabel && value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={clearLabel}
          className="absolute right-0.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  onEdit,
  first = false,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  first?: boolean;
}) {
  const t = useT();
  if (!value) return null;
  return (
    <div className={`flex items-start gap-3 px-4 py-3 ${first ? '' : 'border-t border-gray-100'}`}>
      <span className="w-24 shrink-0 text-[13px] text-gray-500">{label}</span>
      <span className="min-w-0 flex-1 whitespace-pre-line text-[15px] text-gray-900">{value}</span>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[13px] font-semibold text-primary active:text-primary-dark"
      >
        {t('driverHire.edit')}
      </button>
    </div>
  );
}
