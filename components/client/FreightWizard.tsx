'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, ImagePlus, Loader2, X } from 'lucide-react';
import FieldGroup from '@/components/wizard/FieldGroup';
import LocationPicker from '@/components/common/LocationPicker';
import StepIndicator from '@/components/wizard/StepIndicator';
import StepShell from '@/components/wizard/StepShell';
import WizardFooter from '@/components/wizard/WizardFooter';
import { PickerField } from '@/components/client/DriverHireWizard';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { formatDateAndTime } from '@/lib/driverHire';
import type { BusinessProfile } from '@/lib/wizard/steps';
import { errorText, fieldLabel, inputClass, textareaClass } from '@/lib/ui';

/**
 * Heavy freight cargo categories. `label` is fixed English: it is posted with
 * the request and read raw on staff screens. What the customer reads comes
 * from freight.categories.<id>.
 */
const CATEGORIES = [
  { id: 'container', label: 'Container Transport' },
  { id: 'fuel', label: 'Fuel & Liquid Transport' },
  { id: 'machinery', label: 'Heavy Machinery Transport' },
  { id: 'tipper', label: 'Tipper Trucks' },
  { id: 'general', label: 'General Heavy Cargo' },
  { id: 'oversized', label: 'Oversized & Special Cargo' },
  { id: 'mixer', label: 'Concrete Mixer' },
  { id: 'coldchain', label: 'Cold Chain Transport' },
] as const;
type CategoryId = (typeof CATEGORIES)[number]['id'];

const TRUCKS = [
  { id: 'semi', label: 'Semi Trailer' },
  { id: 'container', label: 'Container Truck' },
  { id: 'tanker', label: 'Fuel Tanker' },
  { id: 'flatbed', label: 'Flatbed Truck' },
  { id: 'lowbed', label: 'Lowbed Trailer' },
  { id: 'tipper', label: 'Tipper Truck' },
  { id: 'mixer', label: 'Concrete Mixer' },
] as const;

const CONTAINERS = ['20', '40', 'other'] as const;

interface Place {
  address: string;
  latitude: number | null;
  longitude: number | null;
}
const emptyPlace: Place = { address: '', latitude: null, longitude: null };

interface Draft {
  category: CategoryId | '';
  description: string;
  weight: string;
  dimensions: string;
  container: (typeof CONTAINERS)[number] | '';
  pickup: Place;
  delivery: Place;
  date: string;
  time: string;
  truck: string;
  trucks: string;
  instructions: string;
}

type Field = 'description' | 'weight' | 'pickup' | 'delivery' | 'date' | 'trucks';

function todayLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 10);
}

function validate(d: Draft): { field: Field; code: string }[] {
  const out: { field: Field; code: string }[] = [];
  if (!d.description.trim()) out.push({ field: 'description', code: 'description' });
  if (!(parseFloat(d.weight) > 0)) out.push({ field: 'weight', code: 'weight' });
  if (!d.pickup.address.trim()) out.push({ field: 'pickup', code: 'pickup' });
  if (!d.delivery.address.trim()) out.push({ field: 'delivery', code: 'delivery' });
  if (!d.date) out.push({ field: 'date', code: 'date' });
  else if (d.date < todayLocal()) out.push({ field: 'date', code: 'datePast' });
  if (!(parseInt(d.trucks, 10) >= 1)) out.push({ field: 'trucks', code: 'trucks' });
  return out;
}

/**
 * Heavy Freight: pick what is being moved, describe the cargo and the route,
 * review, send. It is a request for a quotation - the price depends on the
 * cargo, distance and truck, so none is shown here. Fuel transport is one of
 * the categories rather than a service of its own.
 */
export default function FreightWizard({
  profile,
  onExit,
}: {
  profile: BusinessProfile | null;
  onExit: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sending = useRef(false);

  const [draft, setDraft] = useState<Draft>({
    category: '',
    description: '',
    weight: '',
    dimensions: '',
    container: '',
    pickup: { ...emptyPlace },
    delivery: { ...emptyPlace },
    date: '',
    time: '',
    truck: '',
    trucks: '1',
    instructions: '',
  });
  /** 0 = services, 1 = booking form, 2 = review. */
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<{ preview: string; url: string | null } | null>(null);
  const [uploading, setUploading] = useState(false);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const issues = useMemo(() => validate(draft), [draft]);
  const issueFor = (f: Field): string | null => {
    if (!showErrors) return null;
    const hit = issues.find((i) => i.field === f);
    return hit ? t(`freight.errors.${hit.code}`) : null;
  };

  useEffect(() => {
    rootRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  function go(to: number) {
    setError('');
    setShowErrors(false);
    setStep(to);
  }

  /** Same bucket and naming as the delivery photo, uploaded as soon as chosen. */
  async function attachPhoto(file: File) {
    setError('');
    const preview = URL.createObjectURL(file);
    setPhoto({ preview, url: null });
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('order-attachments').upload(name, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('order-attachments').getPublicUrl(name);
      setPhoto({ preview, url: data.publicUrl });
    } catch {
      setPhoto(null);
      setError(t('freight.errors.uploadFailed'));
    } finally {
      setUploading(false);
    }
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
    if (uploading) return;
    if (step === 1) go(2);
    else submit();
  }

  const categoryLabel = CATEGORIES.find((c) => c.id === draft.category)?.label || '';
  const truckLabel = TRUCKS.find((x) => x.id === draft.truck)?.label || '';
  const isContainer = draft.category === 'container';

  async function submit() {
    if (sending.current) return;
    sending.current = true;
    setError('');
    setSubmitting(true);
    try {
      // Staff read service_details raw, so these lines are fixed English.
      const details = [
        `Heavy freight: ${categoryLabel}`,
        `Cargo: ${draft.description.trim()}`,
        `Estimated weight: ${draft.weight} tonnes`,
        draft.dimensions.trim() && `Dimensions: ${draft.dimensions.trim()}`,
        isContainer && draft.container && `Container size: ${draft.container === 'other' ? 'Other' : `${draft.container} FT`}`,
        `Transport date: ${formatDateAndTime(draft.date, draft.time)}`,
        `Preferred truck: ${truckLabel || 'Not sure'}`,
        `Number of trucks: ${parseInt(draft.trucks, 10)}`,
        draft.instructions.trim() && `Instructions: ${draft.instructions.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');

      const res = await fetch('/api/client/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service_type: 'hire',
          hire_category: 'freight',
          pickup_address: draft.pickup.address,
          pickup_latitude: draft.pickup.latitude,
          pickup_longitude: draft.pickup.longitude,
          pickup_name: profile?.name || null,
          pickup_phone: profile?.phone || null,
          dropoff_address: draft.delivery.address,
          dropoff_latitude: draft.delivery.latitude,
          dropoff_longitude: draft.delivery.longitude,
          package_description: draft.description.trim(),
          package_image_url: photo?.url || null,
          scheduled_pickup_at: new Date(`${draft.date}T${draft.time || '08:00'}`).toISOString(),
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
      setError(t('freight.errors.submitFailed'));
      setSubmitting(false);
      sending.current = false;
    }
  }

  // --------------------------------------------------------- 1. services
  if (step === 0) {
    return (
      <div ref={rootRef} className="mx-auto w-full max-w-md">
        <section className="relative mb-4 h-36 overflow-hidden rounded-3xl bg-primary-dark shadow-lg shadow-slate-900/15">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/services/freight/hero.webp"
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-t from-primary-dark via-primary-dark/70 to-primary-dark/10"
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
              {t('freight.title')}
            </h1>
            <p className="text-[13px] font-semibold text-yellow-400">{t('freight.tagline')}</p>
          </div>
        </section>

        <h2 className="mb-2 flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
          <span aria-hidden className="h-4 w-1 rounded-full bg-primary" />
          {t('freight.services')}
        </h2>

        <ul className="grid grid-cols-2 gap-3">
          {CATEGORIES.map(({ id }) => (
            <li key={id}>
              <button
                type="button"
                onClick={() => {
                  set({ category: id, container: id === 'container' ? draft.container : '' });
                  go(1);
                }}
                className="flex h-full w-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5 transition active:scale-[0.98]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/services/freight/${id}.webp${id === 'fuel' || id === 'general' || id === 'coldchain' || id === 'mixer' ? '?v=2' : ''}`}
                  alt=""
                  loading="lazy"
                  className="h-24 w-full object-cover"
                />
                <span className="block px-2.5 py-2">
                  <span className="block text-[13.5px] font-bold leading-tight text-slate-900">
                    {t(`freight.categories.${id}.title`)}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] leading-snug text-slate-600">
                    {t(`freight.categories.${id}.desc`)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const hint = showErrors && issues.length > 0 ? t(`freight.errors.${issues[0].code}`) : null;

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-md">
      <StepIndicator
        service="hire"
        steps={[
          { id: 'services', label: t('freight.services') },
          { id: 'form', label: t('freight.formTitle') },
          { id: 'review', label: t('freight.reviewTitle') },
        ]}
        current={step}
        onJump={(i) => go(i)}
      />

      {/* ------------------------------------------------ 2. booking form */}
      {step === 1 && (
        <StepShell
          service="hire"
          title={t('freight.formTitle')}
          subtitle={draft.category ? t(`freight.categories.${draft.category}.title`) : undefined}
        >
          <FieldGroup label={t('freight.sections.cargo')}>
            <div data-field="description">
              <label className={fieldLabel} htmlFor="frDesc">
                {t('freight.fields.description')}
              </label>
              <textarea
                id="frDesc"
                value={draft.description}
                onChange={(e) => set({ description: e.target.value.slice(0, 1000) })}
                className={`${textareaClass} ${issueFor('description') ? 'border-red-300' : ''}`}
              />
              {issueFor('description') && <p className={errorText}>{issueFor('description')}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div data-field="weight">
                <label className={fieldLabel} htmlFor="frWeight">
                  {t('freight.fields.weight')}
                </label>
                <input
                  id="frWeight"
                  inputMode="decimal"
                  value={draft.weight}
                  onChange={(e) => set({ weight: e.target.value.replace(/[^\d.]/g, '').slice(0, 7) })}
                  className={`${inputClass} ${issueFor('weight') ? 'border-red-300' : ''}`}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="frDim">
                  {t('freight.fields.dimensions')}
                </label>
                <input
                  id="frDim"
                  value={draft.dimensions}
                  onChange={(e) => set({ dimensions: e.target.value.slice(0, 80) })}
                  placeholder={t('freight.dimensionsPlaceholder')}
                  className={inputClass}
                />
              </div>
            </div>
            {issueFor('weight') && <p className={`${errorText} !mt-0`}>{issueFor('weight')}</p>}
            {isContainer && (
              <div>
                <span className={fieldLabel}>{t('freight.fields.container')}</span>
                <div role="radiogroup" className="flex gap-2">
                  {CONTAINERS.map((c) => {
                    const on = draft.container === c;
                    return (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => set({ container: on ? '' : c })}
                        className={`min-h-[2.75rem] flex-1 rounded-xl border px-2 text-[14px] font-semibold transition-colors ${
                          on
                            ? 'border-primary bg-primary text-white'
                            : 'border-gray-300 bg-white text-gray-700 active:bg-gray-100'
                        }`}
                      >
                        {t(`freight.containers.${c}`)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </FieldGroup>

          <FieldGroup label={t('freight.sections.route')}>
            <div data-field="pickup">
              <LocationPicker
                label={t('freight.fields.pickup')}
                placeholder={t('freight.searchPlaceholder')}
                value={draft.pickup.address}
                onChange={(address, latitude, longitude) =>
                  set({ pickup: { address, latitude, longitude } })
                }
                error={issueFor('pickup')}
              />
            </div>
            <div data-field="delivery">
              <LocationPicker
                showMyLocation={false}
                label={t('freight.fields.delivery')}
                placeholder={t('freight.searchPlaceholder')}
                value={draft.delivery.address}
                onChange={(address, latitude, longitude) =>
                  set({ delivery: { address, latitude, longitude } })
                }
                error={issueFor('delivery')}
              />
            </div>
            <div className="grid grid-cols-2 gap-3" data-field="date">
              <div>
                <label className={fieldLabel} htmlFor="frDate">
                  {t('freight.fields.date')}
                </label>
                <PickerField
                  id="frDate"
                  type="date"
                  min={todayLocal()}
                  value={draft.date}
                  onChange={(v) => set({ date: v })}
                  invalid={!!issueFor('date')}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="frTime">
                  {t('freight.fields.time')}
                </label>
                <PickerField
                  id="frTime"
                  type="time"
                  value={draft.time}
                  onChange={(v) => set({ time: v })}
                />
              </div>
            </div>
            {issueFor('date') && <p className={`${errorText} !mt-0`}>{issueFor('date')}</p>}
          </FieldGroup>

          <FieldGroup label={t('freight.sections.truck')}>
            <div className="grid grid-cols-[1fr_6.5rem] gap-3">
              <div>
                <label className={fieldLabel} htmlFor="frTruck">
                  {t('freight.fields.truckType')}
                </label>
                <select
                  id="frTruck"
                  value={draft.truck}
                  onChange={(e) => set({ truck: e.target.value })}
                  className={inputClass}
                >
                  <option value="">{t('freight.truckChoose')}</option>
                  {TRUCKS.map(({ id }) => (
                    <option key={id} value={id}>
                      {t(`freight.trucks.${id}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div data-field="trucks">
                <label className={fieldLabel} htmlFor="frTrucks">
                  {t('freight.fields.trucks')}
                </label>
                <input
                  id="frTrucks"
                  inputMode="numeric"
                  value={draft.trucks}
                  onChange={(e) => set({ trucks: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                  className={`${inputClass} ${issueFor('trucks') ? 'border-red-300' : ''}`}
                />
              </div>
            </div>
            {issueFor('trucks') && <p className={`${errorText} !mt-0`}>{issueFor('trucks')}</p>}
          </FieldGroup>

          <FieldGroup label={t('freight.sections.extra')}>
            <div>
              <span className={fieldLabel}>{t('freight.fields.photo')}</span>
              {photo ? (
                <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.preview} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0 flex-1 text-[13px] text-gray-600">
                    {uploading && (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('freight.uploading')}
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPhoto(null)}
                    aria-label={t('freight.removePhoto')}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 active:bg-gray-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-white text-[15px] font-medium text-gray-700 active:bg-gray-50"
                >
                  <ImagePlus className="h-5 w-5 text-gray-400" />
                  {t('freight.addPhoto')}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) attachPhoto(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="frInstr">
                {t('freight.fields.instructions')}
              </label>
              <textarea
                id="frInstr"
                value={draft.instructions}
                onChange={(e) => set({ instructions: e.target.value.slice(0, 1000) })}
                className={textareaClass}
              />
            </div>
          </FieldGroup>
        </StepShell>
      )}

      {/* ------------------------------------------------------ 3. review */}
      {step === 2 && (
        <StepShell service="hire" title={t('freight.reviewTitle')}>
          <div className="overflow-hidden rounded-2xl bg-white shadow-md shadow-slate-900/10 ring-1 ring-slate-900/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo?.preview || `/services/freight/${draft.category}.webp`}
              alt=""
              className="h-36 w-full object-cover"
            />
            <dl className="divide-y divide-gray-100">
              {(
                [
                  [t('freight.fields.category'), draft.category ? t(`freight.categories.${draft.category}.title`) : ''],
                  [t('freight.fields.description'), draft.description.trim()],
                  [t('freight.fields.weight'), draft.weight],
                  [t('freight.fields.dimensions'), draft.dimensions.trim()],
                  [
                    t('freight.fields.container'),
                    isContainer && draft.container ? t(`freight.containers.${draft.container}`) : '',
                  ],
                  [t('freight.fields.pickup'), draft.pickup.address],
                  [t('freight.fields.delivery'), draft.delivery.address],
                  [t('freight.fields.when'), formatDateAndTime(draft.date, draft.time)],
                  [
                    t('freight.fields.truckType'),
                    draft.truck ? t(`freight.trucks.${draft.truck}`) : t('freight.truckChoose'),
                  ],
                  [t('freight.fields.trucks'), draft.trucks],
                  [t('freight.fields.instructions'), draft.instructions.trim()],
                ] as [string, string][]
              )
                .filter(([, v]) => v)
                .map(([k, v], i) => (
                  <div key={k} className="flex items-start gap-3 px-4 py-3">
                    <dt className="w-24 shrink-0 text-[13px] text-gray-500">{k}</dt>
                    <dd className="min-w-0 flex-1 whitespace-pre-line text-[15px] text-gray-900">{v}</dd>
                    <button
                      type="button"
                      onClick={() => go(i === 0 ? 0 : 1)}
                      className="shrink-0 text-[13px] font-semibold text-primary active:text-primary-dark"
                    >
                      {t('freight.edit')}
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
        nextLabel={step === 2 ? t('freight.submit') : t('freight.continue')}
        loading={submitting}
        hint={hint}
      />
    </div>
  );
}
