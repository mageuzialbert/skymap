'use client';

import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Camera, CheckCircle2, ImagePlus, Loader2, Package, Users, X } from 'lucide-react';
import CameraCapture from '@/components/common/CameraCapture';
import ServiceBadge from '@/components/common/ServiceBadge';
import VehicleSelector from '@/components/landing/VehicleSelector';
import HireVehicleSelector from '@/components/client/HireVehicleSelector';
import ServiceHome from '@/components/client/ServiceHome';
import ErrandMenu, { ERRAND_TYPES } from '@/components/client/ErrandMenu';
import DriverHireWizard from '@/components/client/DriverHireWizard';
import VehicleHireWizard from '@/components/client/VehicleHireWizard';
import FreightWizard from '@/components/client/FreightWizard';
import ContactCard from '@/components/wizard/ContactCard';
import FieldGroup from '@/components/wizard/FieldGroup';
import LocationPicker from '@/components/common/LocationPicker';
import { OptionGroup, OptionRow } from '@/components/wizard/OptionGroup';
import StepIndicator from '@/components/wizard/StepIndicator';
import StepShell from '@/components/wizard/StepShell';
import WizardFooter from '@/components/wizard/WizardFooter';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import { getServiceType, type ServiceTypeKey } from '@/lib/serviceTypes';
import { draftReducer } from '@/lib/wizard/reducer';
import {
  buildHireDetails,
  buildPayload,
  freshDraft,
  stepsFor,
  validateStep,
  type BusinessProfile,
  type RequestDraft,
  type StepId,
} from '@/lib/wizard/steps';
import { cardClass, errorText, fieldLabel, inputClass, textareaClass } from '@/lib/ui';

interface WizardProps {
  /** The signed-in business, used to prefill the pick-up. */
  profile: BusinessProfile | null;
}

/** A datetime-local value for "now", so the scheduler cannot offer the past. */
function nowLocal(): string {
  const d = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return d.toISOString().slice(0, 16);
}

export default function RequestRideWizard({ profile }: WizardProps) {
  const router = useRouter();
  const t = useT();
  const rootRef = useRef<HTMLDivElement>(null);

  const [draft, dispatch] = useReducer(draftReducer, null, () => freshDraft(profile));

  // Transient UI state, deliberately outside the draft: none of it survives a
  // service switch or belongs in the payload.
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingPhone, setCheckingPhone] = useState(false);
  // The Running Errands menu sits between Home and the errand request.
  const [errandMenu, setErrandMenu] = useState(false);
  // Find a Driver is its own request flow (the customer's vehicle, our driver).
  const [driverHire, setDriverHire] = useState(false);
  // Vehicle Hire (renting a vehicle) is its own flow too.
  const [vehicleHire, setVehicleHire] = useState(false);
  const [freight, setFreight] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = stepsFor(draft.service);
  const currentStep: StepId | undefined = steps[draft.step];
  const isLastStep = draft.step === steps.length - 1;
  const svc = draft.service;

  useEffect(() => {
    if (profile) dispatch({ type: 'SET_PROFILE', profile });
  }, [profile]);

  // Resolve the chosen vehicle's name for the summary.
  useEffect(() => {
    if (!draft.vehicleTypeId) return;
    let alive = true;
    fetch('/api/vehicle-types')
      .then((r) => (r.ok ? r.json() : []))
      .then((types: any[]) => {
        if (!alive) return;
        const match = Array.isArray(types) ? types.find((x) => x.id === draft.vehicleTypeId) : null;
        dispatch({ type: 'SET_FIELD', patch: { vehicleName: match?.name || '' } });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [draft.vehicleTypeId]);

  // Clear the one-time destination focus request after the field mounts.
  useEffect(() => {
    if (draft.focusDropoff) {
      dispatch({ type: 'SET_FIELD', patch: { focusDropoff: false } });
    }
  }, [draft.focusDropoff]);

  // <main> is the scrolling element, not the document, so window.scrollTo would
  // silently do nothing here.
  useEffect(() => {
    rootRef.current?.closest('main')?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [draft.step, draft.service, errandMenu]);

  const issues = useMemo(
    () => (currentStep ? validateStep(currentStep, draft) : []),
    [currentStep, draft]
  );
  const issueFor = (field: string): string | null => {
    if (!draft.showErrors) return null;
    const hit = issues.find((i) => i.field === field);
    return hit ? t(hit.messageKey) : null;
  };

  const set = (patch: Partial<RequestDraft>) => dispatch({ type: 'SET_FIELD', patch });

  function chooseService(service: ServiceTypeKey, seed?: Partial<RequestDraft>) {
    setError('');
    dispatch({ type: 'SELECT_SERVICE', service, seed });
  }

  /** Look up a returning recipient by phone and prefill their name. */
  async function lookupRecipient(phone: string) {
    if (!phone || phone.replace(/\D/g, '').length < 9) return;
    setCheckingPhone(true);
    try {
      const res = await fetch('/api/deliveries/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (res.ok) {
        const data = await res.json();
        // The name belongs to the *recipient*. This used to be written into the
        // pick-up name, overwriting the sender's own business name.
        if (data.exists && data.name && !draft.dropoff.name) {
          dispatch({ type: 'SET_LOCATION', which: 'dropoff', patch: { name: data.name } });
        }
      }
    } catch {
      // A failed lookup is only a missed convenience.
    } finally {
      setCheckingPhone(false);
    }
  }

  /** Photos upload as soon as they are chosen, so a slow or failed upload is
   *  visible here instead of silently dropping the photo at submit time. */
  async function attachPhoto(file: File) {
    if (file.size > 50 * 1024 * 1024) {
      setError(t('components.rideWizard.imageTooLarge'));
      return;
    }
    setError('');
    const previewUrl = URL.createObjectURL(file);
    dispatch({ type: 'SET_PHOTO', photo: { file, previewUrl, uploadedUrl: null } });
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const name = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('order-attachments').upload(name, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from('order-attachments').getPublicUrl(name);
      dispatch({ type: 'SET_PHOTO', photo: { file, previewUrl, uploadedUrl: data.publicUrl } });
    } catch {
      setError(t('components.rideWizard.uploadFailed'));
      dispatch({ type: 'SET_PHOTO', photo: null });
    } finally {
      setUploading(false);
    }
  }

  function goNext() {
    if (issues.length > 0) {
      dispatch({ type: 'SHOW_ERRORS' });
      const first = issues[0];
      requestAnimationFrame(() => {
        const el = rootRef.current?.querySelector<HTMLElement>(`[data-field="${first.field}"]`);
        el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        el?.focus?.();
      });
      return;
    }
    setError('');
    if (!isLastStep) dispatch({ type: 'GO', step: draft.step + 1 });
    else submit();
  }

  /**
   * The API returns an English sentence plus a `code`. Translate the code when
   * we know it - a Swahili customer used to get the raw English back.
   * Field-level codes live under `errors.`, the rest under `serverErrors.`.
   */
  function serverMessage(data: { code?: string; error?: string }): string {
    for (const group of ['errors', 'serverErrors']) {
      if (!data.code) break;
      const key = `components.rideWizard.${group}.${data.code}`;
      const translated = t(key);
      if (translated !== key) return translated;
    }
    return data.error || t('components.rideWizard.submitFailed');
  }

  async function submit() {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/client/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(draft)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(serverMessage(data));
      setSuccess(t('components.rideWizard.submitted'));
      router.push(
        data.deliveryId ? `/dashboard/business/deliveries/${data.deliveryId}` : '/dashboard/business/rides'
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('components.rideWizard.submitFailed'));
      setSubmitting(false);
    }
  }

  /** Leave the request and reopen the errand list, to pick a different kind.
   *  The request starts over, as it does when going back to Home. */
  function backToErrandMenu() {
    dispatch({ type: 'RESTART' });
    setErrandMenu(true);
  }

  // ---------------------------------------------------------------- home
  if ((!svc || !currentStep) && freight) {
    return (
      <div ref={rootRef} className="w-full">
        <FreightWizard profile={profile} onExit={() => setFreight(false)} />
      </div>
    );
  }

  if ((!svc || !currentStep) && vehicleHire) {
    return (
      <div ref={rootRef} className="w-full">
        <VehicleHireWizard profile={profile} onExit={() => setVehicleHire(false)} />
      </div>
    );
  }

  if ((!svc || !currentStep) && driverHire) {
    return (
      <div ref={rootRef} className="w-full">
        <DriverHireWizard profile={profile} onExit={() => setDriverHire(false)} />
      </div>
    );
  }

  if ((!svc || !currentStep) && errandMenu) {
    return (
      <div ref={rootRef} className="mx-auto w-full max-w-md">
        <ErrandMenu
          onBack={() => setErrandMenu(false)}
          onChoose={(label) => {
            setErrandMenu(false);
            chooseService('errand', { errandType: label });
          }}
        />
      </div>
    );
  }

  if (!svc || !currentStep) {
    return (
      <div ref={rootRef} className="mx-auto w-full max-w-md">
        <ServiceHome
          onChooseService={(key) => chooseService(key)}
          onOpenErrands={() => setErrandMenu(true)}
          onOpenDriverHire={() => setDriverHire(true)}
          onOpenVehicleHire={() => setVehicleHire(true)}
          onOpenFreight={() => setFreight(true)}
          onWhereTo={() => chooseService('ride', { focusDropoff: true })}
          onScheduleLater={() => chooseService('ride', { scheduleLater: true })}
          onPickRecent={(d) =>
            chooseService('ride', {
              dropoff: {
                address: d.address,
                latitude: d.latitude,
                longitude: d.longitude,
                name: '',
                phone: '',
              },
            })
          }
        />
      </div>
    );
  }

  const stepLabels = steps.map((id) => ({ id, label: t(`components.rideWizard.steps.${id}`) }));
  const copy = (k: string) => t(`components.rideWizard.svc.${svc}.${k}`);
  const hint = draft.showErrors && issues.length > 0 ? t(issues[0].messageKey) : null;

  // An errand started from the Running Errands menu follows that booking
  // form: describe the task first, then where, with the destination optional
  // and a priority on the last step. The plain errand flow is unchanged.
  const typedErrand = svc === 'errand' && !!draft.errandType;
  const errandTypeId = ERRAND_TYPES.find((e) => e.label === draft.errandType)?.id;
  const errandFields =
    svc === 'errand' ? (
            <FieldGroup
              label={t(typedErrand ? 'business.home.errands.form.describe' : 'components.rideWizard.group.errand')}
            >
              <div>
                <label className={fieldLabel} htmlFor="errandReason">
                  {t(typedErrand ? 'business.home.errands.form.describeLabel' : 'components.rideWizard.errandReason')}
                </label>
                <textarea
                  id="errandReason"
                  data-field="errandReason"
                  value={draft.errandReason}
                  onChange={(e) => set({ errandReason: e.target.value })}
                  placeholder={t(
                    typedErrand
                      ? 'business.home.errands.form.describePlaceholder'
                      : 'components.rideWizard.errandReasonPlaceholder'
                  )}
                  aria-invalid={issueFor('errandReason') ? true : undefined}
                  className={`${textareaClass} ${issueFor('errandReason') ? 'border-red-300' : ''}`}
                  disabled={submitting}
                />
                {issueFor('errandReason') && <p className={errorText}>{issueFor('errandReason')}</p>}
              </div>
              {/* The photo was never compulsory, but nothing said so. */}
              <p className={`${fieldLabel} !mb-0`}>{t('business.home.errands.form.photoOptional')}</p>
              <PhotoField
                photo={draft.photo}
                uploading={uploading}
                onPick={() => fileInputRef.current?.click()}
                onCamera={() => setCameraOpen(true)}
                onRemove={() => dispatch({ type: 'SET_PHOTO', photo: null })}
              />
            </FieldGroup>
    ) : null;

  return (
    <div ref={rootRef} className="mx-auto w-full max-w-md">
      <StepIndicator
        service={svc}
        steps={stepLabels}
        current={draft.step}
        onJump={(i) => dispatch({ type: 'GO', step: i })}
      />

      {/* ------------------------------------------------------------ where */}
      {currentStep === 'where' && (
        <StepShell
          service={svc}
          title={
            typedErrand && errandTypeId
              ? t(`business.home.errands.types.${errandTypeId}.title`)
              : copy('whereTitle')
          }
          subtitle={
            svc === 'delivery'
              ? undefined
              : typedErrand
                ? t('business.home.errands.form.subtitle')
                : copy('whereSubtitle')
          }
          compact={svc === 'delivery'}
        >
          {typedErrand && errandFields}
          <FieldGroup compact={svc === 'delivery'}>
            <LocationPicker
              label={t(
                typedErrand
                  ? 'business.home.errands.form.start'
                  : 'components.rideWizard.pickupLocation'
              )}
              placeholder={t('components.rideWizard.searchPlaceholder')}
              value={draft.pickup.address}
              onChange={(address, latitude, longitude) => dispatch({ type: 'SET_LOCATION', which: 'pickup', patch: { address, latitude, longitude } })}
              disabled={submitting}
              error={issueFor('pickup')}
            />
            <LocationPicker
              showMyLocation={false}
              autoFocus={draft.focusDropoff}
              label={t(
                typedErrand
                  ? 'business.home.errands.form.destination'
                  : svc === 'errand'
                  ? 'components.rideWizard.errandWhereGo'
                  : svc === 'delivery'
                    ? 'components.rideWizard.dropoffLocation'
                    : 'components.rideWizard.destination'
              )}
              placeholder={t('components.rideWizard.searchPlaceholder')}
              value={draft.dropoff.address}
              onChange={(address, latitude, longitude) => dispatch({ type: 'SET_LOCATION', which: 'dropoff', patch: { address, latitude, longitude } })}
              disabled={submitting}
              error={issueFor('dropoff')}
            />
          {svc === 'delivery' && (
            <>
              <div>
                <label className={fieldLabel} htmlFor="recipientName">
                  {t('components.rideWizard.recipientName')}
                </label>
                <input
                  id="recipientName"
                  value={draft.dropoff.name}
                  onChange={(e) =>
                    dispatch({ type: 'SET_LOCATION', which: 'dropoff', patch: { name: e.target.value } })
                  }
                  className={inputClass}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="recipientPhone">
                  {t('components.rideWizard.recipientPhone')}
                </label>
                <div className="relative">
                  <input
                    id="recipientPhone"
                    data-field="recipientPhone"
                    type="tel"
                    inputMode="tel"
                    value={draft.dropoff.phone}
                    onChange={(e) =>
                      dispatch({
                        type: 'SET_LOCATION',
                        which: 'dropoff',
                        patch: { phone: e.target.value },
                      })
                    }
                    onBlur={(e) => lookupRecipient(e.target.value)}
                    placeholder="+255…"
                    aria-invalid={issueFor('recipientPhone') ? true : undefined}
                    className={`${inputClass} ${issueFor('recipientPhone') ? 'border-red-300' : ''}`}
                    disabled={submitting}
                  />
                  {checkingPhone && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
                  )}
                </div>
                {issueFor('recipientPhone') && (
                  <p className={errorText}>{issueFor('recipientPhone')}</p>
                )}
              </div>
            </>
          )}

          {svc === 'delivery' && (
            <>
              <TextField
                id="packageDetails"
                label={t('components.rideWizard.packageDetails')}
                value={draft.packageDetails}
                onChange={(v) => set({ packageDetails: v })}
                placeholder={t('components.rideWizard.packagePlaceholder')}
                disabled={submitting}
              />
              <PhotoField
                photo={draft.photo}
                uploading={uploading}
                onPick={() => fileInputRef.current?.click()}
                onCamera={() => setCameraOpen(true)}
                onRemove={() => dispatch({ type: 'SET_PHOTO', photo: null })}
              />
            </>
          )}
          </FieldGroup>

          {typedErrand && (
            <>
              <FieldGroup label={t('business.home.errands.form.schedule')}>
                <div>
                  <label className={fieldLabel} htmlFor="errandWhen">
                    {t('business.home.errands.form.when')}
                  </label>
                  <DateTimeField
                    id="errandWhen"
                    value={draft.scheduledAt}
                    onChange={(v) => set({ scheduledAt: v })}
                    invalid={!!issueFor('scheduledAt')}
                    disabled={submitting}
                    clearable
                  />
                  {issueFor('scheduledAt') ? (
                    <p className={errorText}>{issueFor('scheduledAt')}</p>
                  ) : (
                    <p className="mt-1 text-[13px] text-gray-500">
                      {t('business.home.errands.form.whenHint')}
                    </p>
                  )}
                </div>
              </FieldGroup>

              <OptionGroup label={t('business.home.errands.form.priority')}>
                {(['normal', 'urgent', 'scheduled'] as const).map((p) => (
                  <OptionRow
                    key={p}
                    selected={draft.errandPriority === p}
                    onSelect={() => set({ errandPriority: p })}
                    disabled={submitting}
                    title={t(`business.home.errands.form.priorities.${p}.title`)}
                    subtitle={t(`business.home.errands.form.priorities.${p}.subtitle`)}
                  />
                ))}
              </OptionGroup>
            </>
          )}

          {!typedErrand && errandFields}

          {svc !== 'delivery' && (
            <FieldGroup label={t('components.rideWizard.group.sendingFrom')}>
              <ContactCard name={draft.pickup.name} phone={draft.pickup.phone} />
            </FieldGroup>
          )}
        </StepShell>
      )}

      {/* ---------------------------------------------------------- details */}
      {currentStep === 'details' && (
        <StepShell service={svc} title={copy('detailsTitle')} subtitle={copy('detailsSubtitle')}>
          {svc === 'ride' && (
            <div data-field="vehicle">
              <FieldGroup label={t('components.rideWizard.group.vehicle')} padded={false}>
                <div className="p-3">
                  <VehicleSelector
                    value={draft.vehicleTypeId}
                    onChange={(id) => set({ vehicleTypeId: id })}
                    disabled={submitting}
                  />
                </div>
              </FieldGroup>
              {issueFor('vehicle') && <p className={errorText}>{issueFor('vehicle')}</p>}
            </div>
          )}

          {svc === 'hire' && (
            <>
              <div data-field="hireCategory">
                <OptionGroup label={t('components.rideWizard.choosePeopleOrLoad')} columns={2}>
                  {(['people', 'load'] as const).map((cat) => (
                    <OptionRow
                      key={cat}
                      selected={draft.hireCategory === cat}
                      onSelect={() =>
                        set({ hireCategory: cat, hireVehicleId: null, hireVehicle: null })
                      }
                      disabled={submitting}
                      layout="tile"
                      icon={cat === 'people' ? <Users className="h-5 w-5" /> : <Package className="h-5 w-5" />}
                      title={t(
                        cat === 'people'
                          ? 'components.rideWizard.carryPeople'
                          : 'components.rideWizard.carryLoads'
                      )}
                    />
                  ))}
                </OptionGroup>
                {issueFor('hireCategory') && <p className={errorText}>{issueFor('hireCategory')}</p>}
              </div>

              {draft.hireCategory && (
                <div data-field="hireVehicle">
                  <FieldGroup label={t('components.rideWizard.group.vehicle')} padded={false}>
                    <div className="p-3">
                      <HireVehicleSelector
                        category={draft.hireCategory}
                        value={draft.hireVehicleId}
                        onChange={(id, vehicle) => set({ hireVehicleId: id, hireVehicle: vehicle })}
                        disabled={submitting}
                      />
                    </div>
                  </FieldGroup>
                  {issueFor('hireVehicle') && <p className={errorText}>{issueFor('hireVehicle')}</p>}
                </div>
              )}

              {draft.hireCategory === 'people' && (
                <FieldGroup label={t('components.rideWizard.group.people')}>
                  <TextField
                    id="hirePurpose"
                    label={t('components.rideWizard.tripPurpose')}
                    value={draft.hirePurpose}
                    onChange={(v) => set({ hirePurpose: v })}
                    placeholder={t('components.rideWizard.tripPurposePlaceholder')}
                    disabled={submitting}
                  />
                </FieldGroup>
              )}

              {draft.hireCategory === 'load' && (
                <FieldGroup label={t('components.rideWizard.group.load')}>
                  <TextField
                    id="hireLoadDesc"
                    label={t('components.rideWizard.loadDescription')}
                    value={draft.hireLoadDesc}
                    onChange={(v) => set({ hireLoadDesc: v })}
                    placeholder={t('components.rideWizard.loadDescriptionPlaceholder')}
                    error={issueFor('hireLoadDesc')}
                    disabled={submitting}
                  />
                  <TextField
                    id="hireWeight"
                    label={t('components.rideWizard.approxWeight')}
                    value={draft.hireWeight}
                    onChange={(v) => set({ hireWeight: v })}
                    placeholder={t('components.rideWizard.approxWeightPlaceholder')}
                    disabled={submitting}
                  />
                </FieldGroup>
              )}

              {draft.hireCategory && (
                <FieldGroup label={t('components.rideWizard.group.notes')}>
                  <textarea
                    value={draft.hireNotes}
                    onChange={(e) => set({ hireNotes: e.target.value })}
                    placeholder={t('components.rideWizard.hirePlaceholder')}
                    className={textareaClass}
                    disabled={submitting}
                  />
                </FieldGroup>
              )}
            </>
          )}



          {svc === 'ride' && (
            <FieldGroup label={t('components.rideWizard.group.notes')}>
              <textarea
                value={draft.serviceDetails}
                onChange={(e) => set({ serviceDetails: e.target.value })}
                placeholder={t('components.rideWizard.tripPlaceholder')}
                className={textareaClass}
                disabled={submitting}
              />
            </FieldGroup>
          )}
        </StepShell>
      )}

      {/* ---------------------------------------------------------- confirm */}
      {currentStep === 'confirm' && (
        <StepShell
          service={svc}
          title={t('components.rideWizard.confirmTitle')}
          subtitle={t('components.rideWizard.confirmSubtitle')}
        >
          <div data-field="scheduledAt">
            {/* A menu-started errand sets its schedule and priority on the
                first page, so there is nothing to ask here. */}
            {typedErrand ? null : (
            <OptionGroup label={t('components.rideWizard.group.schedule')} columns={2}>
              {([false, true] as const).map((later) => (
                <OptionRow
                  key={String(later)}
                  selected={draft.scheduleLater === later}
                  onSelect={() => set({ scheduleLater: later })}
                  disabled={submitting}
                  layout="tile"
                  title={t(
                    later ? 'components.rideWizard.scheduleLater' : 'components.rideWizard.asap'
                  )}
                />
              ))}
            </OptionGroup>
            )}
            {draft.scheduleLater && (
              <div className="mt-3">
                <DateTimeField
                  value={draft.scheduledAt}
                  onChange={(v) => set({ scheduledAt: v })}
                  invalid={!!issueFor('scheduledAt')}
                  disabled={submitting}
                />
                {issueFor('scheduledAt') && <p className={errorText}>{issueFor('scheduledAt')}</p>}
              </div>
            )}
          </div>

          <FieldGroup label={t('components.rideWizard.group.summary')} padded={false}>
            <div className="px-4 py-3">
              <ServiceBadge serviceType={svc} />
            </div>
            <SummaryRow
              label={t('components.rideWizard.group.pickup')}
              value={draft.pickup.address}
              onEdit={() => dispatch({ type: 'GO', step: 0 })}
              editLabel={t('components.rideWizard.editStep')}
            />
            <SummaryRow
              label={t(
                svc === 'delivery'
                  ? 'components.rideWizard.group.dropoff'
                  : 'components.rideWizard.group.destination'
              )}
              value={draft.dropoff.address}
              onEdit={() => dispatch({ type: 'GO', step: 0 })}
              editLabel={t('components.rideWizard.editStep')}
            />
            {svc === 'delivery' && (
              <SummaryRow
                label={t('components.rideWizard.group.recipient')}
                value={[draft.dropoff.name, draft.dropoff.phone].filter(Boolean).join(' · ')}
                onEdit={() => dispatch({ type: 'GO', step: 0 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {(svc === 'ride' || svc === 'hire') && (
              <SummaryRow
                label={t('components.rideWizard.group.vehicle')}
                value={svc === 'hire' ? draft.hireVehicle?.name || '' : draft.vehicleName}
                onEdit={() => dispatch({ type: 'GO', step: 1 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {svc === 'errand' && (
              <SummaryRow
                label={t('business.home.errands.typeLabel')}
                value={draft.errandType}
                onEdit={backToErrandMenu}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {typedErrand && (
              <SummaryRow
                label={t('business.home.errands.form.priority')}
                value={t(`business.home.errands.form.priorities.${draft.errandPriority}.title`)}
                onEdit={() => dispatch({ type: 'GO', step: 0 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {typedErrand && draft.scheduledAt && (
              <SummaryRow
                label={t('business.home.errands.form.schedule')}
                value={formatDateTime(draft.scheduledAt)}
                onEdit={() => dispatch({ type: 'GO', step: 0 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {svc === 'errand' && (
              <SummaryRow
                label={t('components.rideWizard.group.errand')}
                value={draft.errandReason}
                onEdit={() => dispatch({ type: 'GO', step: 0 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {svc === 'hire' && (
              <SummaryRow
                label={t(
                  draft.hireCategory === 'load'
                    ? 'components.rideWizard.group.load'
                    : 'components.rideWizard.group.people'
                )}
                value={buildHireDetails(draft)}
                onEdit={() => dispatch({ type: 'GO', step: 1 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
            {svc === 'ride' && draft.serviceDetails && (
              <SummaryRow
                label={t('components.rideWizard.group.notes')}
                value={draft.serviceDetails}
                onEdit={() => dispatch({ type: 'GO', step: 1 })}
                editLabel={t('components.rideWizard.editStep')}
              />
            )}
          </FieldGroup>
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
      {success && (
        <div
          role="status"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-[15px] text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <span className="leading-snug">{success}</span>
        </div>
      )}

      <WizardFooter
        onBack={
          draft.step > 0
            ? () => dispatch({ type: 'GO', step: draft.step - 1 })
            : draft.errandType
              ? backToErrandMenu
              : () => dispatch({ type: 'RESTART' })
        }
        onNext={goNext}
        nextLabel={
          isLastStep
            ? t('components.rideWizard.submitRequest')
            : t('components.quickOrder.continue')
        }
        loading={submitting}
        hint={hint}
      />

      {/* --------------------------------------------------------- pickers */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) attachPhoto(file);
          e.target.value = '';
        }}
      />
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={(file) => attachPhoto(file)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */

/** "2026-11-23T14:30" -> "23/11/2026 14:30". Plain string slicing, so the
 *  time zone cannot shift the day. */
function formatDateTime(value: string): string {
  const [date, time = ''] = value.split('T');
  const [y, m, d] = date.split('-');
  return y && m && d ? `${d}/${m}/${y} ${time.slice(0, 5)}`.trim() : '';
}

/**
 * Date and time, always shown as dd/mm/yyyy.
 *
 * A native datetime input prints the date in the browser's own order (often
 * mm/dd/yyyy) and that cannot be changed. So the native input is kept for its
 * picker but made invisible, laid over a box that shows the value in our
 * format; tapping the box opens the picker.
 */
function DateTimeField({
  id,
  value,
  onChange,
  invalid,
  disabled,
  clearable = false,
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  /** Show a clear button, for a date that is optional. */
  clearable?: boolean;
}) {
  const t = useT();
  return (
    <div className="relative" data-field="scheduledAt">
      <div
        aria-hidden
        className={`${inputClass} flex items-center ${invalid ? 'border-red-300' : ''} ${
          value ? 'text-gray-900' : 'text-gray-400'
        }`}
      >
        {value ? formatDateTime(value) : 'dd/mm/yyyy --:--'}
      </div>
      <input
        id={id}
        type="datetime-local"
        min={nowLocal()}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => {
          // Desktop browsers focus the hidden field's segments instead of
          // opening the picker unless asked to.
          try {
            e.currentTarget.showPicker?.();
          } catch {
            /* not allowed in this context - the native tap still works */
          }
        }}
        aria-invalid={invalid ? true : undefined}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        disabled={disabled}
      />
      {clearable && value && !disabled && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label={t('business.home.errands.form.clearDate')}
          className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-gray-500 active:bg-gray-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: 'numeric' | 'tel' | 'text';
  error?: string | null;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className={fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        data-field={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        className={`${inputClass} ${error ? 'border-red-300' : ''}`}
        disabled={disabled}
      />
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}

function PhotoField({
  photo,
  uploading,
  onPick,
  onCamera,
  onRemove,
}: {
  photo: RequestDraft['photo'];
  uploading: boolean;
  onPick: () => void;
  onCamera: () => void;
  onRemove: () => void;
}) {
  const t = useT();
  if (photo) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.previewUrl}
          alt=""
          className="h-16 w-16 shrink-0 rounded-lg object-cover"
        />
        <span className="min-w-0 flex-1 text-[13px] text-gray-600">
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('components.rideWizard.submitting')}
            </span>
          ) : (
            t('components.rideWizard.photoAttached')
          )}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('components.rideWizard.removePhoto')}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors active:bg-gray-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3">
      {[
        { onClick: onCamera, icon: Camera, label: t('components.rideWizard.takePhoto') },
        { onClick: onPick, icon: ImagePlus, label: t('components.rideWizard.fromGallery') },
      ].map(({ onClick, icon: Icon, label }) => (
        <button
          key={label}
          type="button"
          onClick={onClick}
          className="flex min-h-[3.5rem] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white text-[15px] font-medium text-gray-700 transition-colors active:bg-gray-50"
        >
          <Icon className="h-5 w-5 text-gray-400" />
          {label}
        </button>
      ))}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  onEdit,
  editLabel,
}: {
  label: string;
  value: string;
  onEdit: () => void;
  editLabel: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 border-t border-gray-100 px-4 py-3">
      <span className="w-24 shrink-0 text-[13px] text-gray-500">{label}</span>
      <span className="min-w-0 flex-1 whitespace-pre-line text-[15px] text-gray-900">{value}</span>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-[13px] font-semibold text-primary active:text-primary-dark"
      >
        {editLabel}
      </button>
    </div>
  );
}
