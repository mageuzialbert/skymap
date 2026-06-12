'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Package,
  UserRound,
  Clock,
  ShoppingBag,
  MapPin,
  Phone,
  User,
  Truck,
  Camera,
  X,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
  ShieldCheck,
} from 'lucide-react';
import { LocationState } from '@/components/landing/types';
import AddressInput from '@/components/landing/AddressInput';
import FullscreenMapPicker from '@/components/landing/FullscreenMapPicker';
import LocationCategoryPicker from '@/components/landing/LocationCategoryPicker';
import VehicleSelector from '@/components/landing/VehicleSelector';
import CameraCapture from '@/components/common/CameraCapture';
import { supabase } from '@/lib/supabase';
import { SERVICE_TYPES, getServiceType, type ServiceTypeKey } from '@/lib/serviceTypes';

interface WizardProps {
  pickup: LocationState;
  dropoff: LocationState;
  onPickupChange: (field: keyof LocationState, value: any) => void;
  onDropoffChange: (field: keyof LocationState, value: any) => void;
  onPhoneBlur: (phone: string) => void;
  isCheckingPhone: boolean;
}

const SERVICE_ICONS: Record<string, any> = {
  Package,
  UserRound,
  Clock,
  ShoppingBag,
};

const STEPS = ['Purpose', 'Transport', 'Details', 'Time'];

export default function RequestRideWizard({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onPhoneBlur,
  isCheckingPhone,
}: WizardProps) {
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState<ServiceTypeKey | null>(null);
  const [vehicleTypeId, setVehicleTypeId] = useState<string | null>(null);
  const [vehicleName, setVehicleName] = useState<string>('');
  const [packageDetails, setPackageDetails] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');

  // Scheduling
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pickers
  const [mapPickerOpen, setMapPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);

  // Camera/Image
  const [packageImage, setPackageImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve the chosen vehicle's display name for the review step.
  useEffect(() => {
    if (!vehicleTypeId) {
      setVehicleName('');
      return;
    }
    fetch('/api/vehicle-types')
      .then((r) => (r.ok ? r.json() : []))
      .then((types: any[]) => {
        const vt = Array.isArray(types) ? types.find((t) => t.id === vehicleTypeId) : null;
        setVehicleName(vt?.name || '');
      })
      .catch(() => setVehicleName(''));
  }, [vehicleTypeId]);

  const svc = serviceType;
  const needsDropoff = svc === 'delivery' || svc === 'ride';
  const needsRecipient = svc === 'delivery';
  const needsPackage = svc === 'delivery';
  // Errand uses a required details field; ride/hire use an optional note.
  const detailsRequired = svc === 'errand';

  const normalizePhone = (phone: string): string => {
    let p = phone.trim();
    if (p.startsWith('+')) {
      p = '+' + p.replace(/\D/g, '');
      if (p.startsWith('+2550')) p = '+255' + p.substring(5);
      return p;
    }
    p = p.replace(/\D/g, '');
    if (!p) return '';
    if (p.startsWith('255')) {
      if (p.startsWith('2550')) return '+255' + p.substring(4);
      return '+' + p;
    }
    if (p.startsWith('0')) return '+255' + p.substring(1);
    return '+255' + p;
  };

  // Per-step "can advance" checks.
  const canAdvance = (): boolean => {
    if (step === 0) return !!serviceType;
    if (step === 1) return !!vehicleTypeId;
    if (step === 2) {
      if (!pickup.address) return false;
      if (needsDropoff && !dropoff.address) return false;
      if (needsRecipient && !(dropoff.phone && dropoff.phone.length >= 9)) return false;
      if (detailsRequired && !serviceDetails.trim()) return false;
      return true;
    }
    return true;
  };

  const handleMapSelect = (address: string, lat: number, lng: number) => {
    const change = mapPickerOpen === 'pickup' ? onPickupChange : onDropoffChange;
    if (!mapPickerOpen) return;
    change('address', address);
    change('latitude', lat);
    change('longitude', lng);
  };

  const handleCategorySelect = (address: string, lat: number | null, lng: number | null) => {
    const change = categoryPickerOpen === 'pickup' ? onPickupChange : onDropoffChange;
    if (!categoryPickerOpen) return;
    change('address', address);
    change('latitude', lat);
    change('longitude', lng);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setError('Image size too large (max 50MB)');
        return;
      }
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setPackageImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleCameraCapture = (file: File) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setPackageImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleRemoveImage = () => {
    setPackageImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadPackageImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('order-attachments').upload(fileName, file);
      if (uploadError) throw new Error('Failed to upload image');
      const { data } = supabase.storage.from('order-attachments').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      let packageImageUrl: string | null = null;
      if (packageImage) {
        packageImageUrl = await uploadPackageImage(packageImage);
      }

      const payload: Record<string, any> = {
        service_type: serviceType,
        vehicle_type_id: vehicleTypeId,
        pickup_address: pickup.address,
        pickup_latitude: pickup.latitude,
        pickup_longitude: pickup.longitude,
        pickup_name: pickup.name,
        pickup_phone: pickup.phone ? normalizePhone(pickup.phone) : pickup.phone,
        service_details: serviceDetails || null,
        scheduled_pickup_at: scheduleLater && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      if (needsDropoff) {
        payload.dropoff_address = dropoff.address;
        payload.dropoff_latitude = dropoff.latitude;
        payload.dropoff_longitude = dropoff.longitude;
      }
      if (needsRecipient) {
        payload.dropoff_name = dropoff.name;
        payload.dropoff_phone = dropoff.phone ? normalizePhone(dropoff.phone) : dropoff.phone;
      }
      if (needsPackage) {
        payload.package_description = packageDetails || null;
        payload.package_image_url = packageImageUrl;
      }

      const response = await fetch('/api/client/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to submit request');

      setSuccess('Request submitted! Redirecting…');
      setTimeout(() => {
        router.push('/dashboard/business/rides');
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
      setLoading(false);
    }
  };

  const goNext = () => {
    setError('');
    if (step < STEPS.length - 1) setStep((s) => s + 1);
  };
  const goBack = () => {
    setError('');
    if (step > 0) setStep((s) => s - 1);
  };

  const inputClass =
    'w-full h-11 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-50';

  const serviceDef = serviceType ? getServiceType(serviceType) : null;

  return (
    <div>
      {/* Stepper */}
      <div className="flex items-center mb-6">
        {STEPS.map((label, i) => {
          const active = i === step;
          const done = i < step;
          return (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                    done
                      ? 'bg-primary text-white'
                      : active
                      ? 'bg-primary/15 text-primary border-2 border-primary'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>
                <span
                  className={`text-xs font-medium hidden sm:inline ${
                    active ? 'text-gray-900' : 'text-gray-400'
                  }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${done ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* ===== STEP 1: PURPOSE ===== */}
      {step === 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-1">What do you need?</h3>
          <p className="text-xs text-gray-500 mb-4">Choose the kind of service you want.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SERVICE_TYPES.map((s) => {
              const Icon = SERVICE_ICONS[s.icon] || Package;
              const selected = serviceType === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setServiceType(s.key)}
                  className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                    selected
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{s.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{s.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== STEP 2: TRANSPORT ===== */}
      {step === 1 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <header className="flex items-center gap-2.5 mb-4">
            <Truck className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">Means of transport</h3>
              <p className="text-xs text-gray-500">Choose a vehicle - all options are available.</p>
            </div>
          </header>
          <VehicleSelector value={vehicleTypeId} onChange={setVehicleTypeId} disabled={loading} />
        </section>
      )}

      {/* ===== STEP 3: DETAILS (dynamic) ===== */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Locations / contact */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {svc === 'delivery'
                    ? 'Pickup & dropoff'
                    : svc === 'ride'
                    ? 'Your trip'
                    : svc === 'hire'
                    ? 'Where to start'
                    : 'Where to deliver'}
                </h3>
                <p className="text-xs text-gray-500">{serviceDef?.label}</p>
              </div>
            </header>

            <div className="space-y-4">
              <LocationField
                which="pickup"
                loc={pickup}
                label={
                  svc === 'hire'
                    ? 'Start location'
                    : svc === 'errand'
                    ? 'Your location (deliver to)'
                    : 'Pickup location'
                }
                placeholder="Type address or pick on map"
                onChange={onPickupChange}
                onMapClick={() => setMapPickerOpen('pickup')}
                onCategoryClick={() => setCategoryPickerOpen('pickup')}
              />

              <YourContact name={pickup.name} phone={pickup.phone} />

              {needsDropoff && (
                <LocationField
                  which="dropoff"
                  loc={dropoff}
                  label={svc === 'ride' ? 'Destination' : 'Dropoff location'}
                  placeholder="Type address or pick on map"
                  onChange={onDropoffChange}
                  onMapClick={() => setMapPickerOpen('dropoff')}
                  onCategoryClick={() => setCategoryPickerOpen('dropoff')}
                />
              )}

              {needsRecipient && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Recipient name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={dropoff.name}
                        onChange={(e) => onDropoffChange('name', e.target.value)}
                        placeholder="Recipient name"
                        className={inputClass}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Recipient phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        inputMode="tel"
                        value={dropoff.phone}
                        onChange={(e) => onDropoffChange('phone', e.target.value)}
                        placeholder="+255..."
                        className={inputClass}
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Service-specific details */}
          {svc === 'delivery' && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <header className="flex items-center gap-2.5 mb-4">
                <Package className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">Package details</h3>
                  <p className="text-xs text-gray-500">Optional</p>
                </div>
              </header>
              <div className="space-y-4">
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={packageDetails}
                    onChange={(e) => setPackageDetails(e.target.value)}
                    placeholder="e.g. Documents, small electronics"
                    className={inputClass}
                    disabled={loading}
                  />
                </div>

                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleImageSelect}
                />

                {!imagePreview ? (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setCameraOpen(true)}
                      disabled={loading}
                      className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary transition-all"
                    >
                      <Camera className="w-6 h-6 text-gray-400" />
                      <span>Take photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 hover:border-secondary-dark hover:bg-secondary/5 rounded-lg text-sm font-medium text-gray-600 hover:text-secondary-dark transition-all"
                    >
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span>From gallery</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Package preview" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">Photo attached</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCameraOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
                        >
                          <Camera className="w-3.5 h-3.5" /> Camera
                        </button>
                        <span className="w-px h-3 bg-gray-300" aria-hidden />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-dark hover:text-secondary"
                        >
                          <ImagePlus className="w-3.5 h-3.5" /> Gallery
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="self-start p-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 rounded-lg"
                      aria-label="Remove photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {svc !== 'delivery' && (
            <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <header className="flex items-center gap-2.5 mb-4">
                {svc === 'errand' ? (
                  <ShoppingBag className="w-5 h-5 text-gray-400 shrink-0" />
                ) : svc === 'hire' ? (
                  <Clock className="w-5 h-5 text-gray-400 shrink-0" />
                ) : (
                  <UserRound className="w-5 h-5 text-gray-400 shrink-0" />
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    {svc === 'errand'
                      ? 'What do you need?'
                      : svc === 'hire'
                      ? 'Duration & plan'
                      : 'Trip notes'}
                  </h3>
                  <p className="text-xs text-gray-500">{detailsRequired ? 'Required' : 'Optional'}</p>
                </div>
              </header>
              <textarea
                value={serviceDetails}
                onChange={(e) => setServiceDetails(e.target.value)}
                rows={4}
                placeholder={
                  svc === 'errand'
                    ? 'e.g. Buy 2 bags of cement from the hardware store. Budget ~50,000 TZS.'
                    : svc === 'hire'
                    ? 'e.g. Need the vehicle for about 5 hours to run several errands around town.'
                    : 'e.g. 2 passengers, some luggage.'
                }
                className="w-full p-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-50"
                disabled={loading}
              />
            </section>
          )}
        </div>
      )}

      {/* ===== STEP 4: TIME & REVIEW ===== */}
      {step === 3 && (
        <div className="space-y-5">
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              <CalendarClock className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">When?</h3>
                <p className="text-xs text-gray-500">Choose now or schedule for later.</p>
              </div>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleLater(false)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !scheduleLater ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">As soon as possible</p>
                <p className="text-xs text-gray-500 mt-0.5">A rider is assigned right away.</p>
              </button>
              <button
                type="button"
                onClick={() => setScheduleLater(true)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  scheduleLater ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">Schedule for later</p>
                <p className="text-xs text-gray-500 mt-0.5">Pick a date & time.</p>
              </button>
            </div>
            {scheduleLater && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Pickup date & time</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full h-11 px-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            )}
          </section>

          {/* Review */}
          <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">Review</h3>
            <dl className="space-y-2 text-sm">
              <ReviewRow label="Service" value={serviceDef?.label || '-'} />
              <ReviewRow label="Transport" value={vehicleName || '-'} />
              <ReviewRow
                label={svc === 'hire' ? 'Start' : svc === 'errand' ? 'Deliver to' : 'Pickup'}
                value={pickup.address || '-'}
              />
              {needsDropoff && <ReviewRow label="Destination" value={dropoff.address || '-'} />}
              {needsRecipient && (
                <ReviewRow label="Recipient" value={`${dropoff.name || '-'} · ${dropoff.phone || '-'}`} />
              )}
              {serviceDetails && <ReviewRow label="Details" value={serviceDetails} />}
              <ReviewRow
                label="When"
                value={scheduleLater && scheduledAt ? new Date(scheduledAt).toLocaleString() : 'As soon as possible'}
              />
            </dl>
          </section>
        </div>
      )}

      {/* ===== MESSAGES ===== */}
      {error && (
        <div role="alert" className="mt-5 flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}
      {success && (
        <div role="status" className="mt-5 flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="leading-snug">{success}</span>
        </div>
      )}

      {/* ===== NAV BUTTONS ===== */}
      <div className="mt-6 flex items-center gap-3">
        {step > 0 && (
          <button
            type="button"
            onClick={goBack}
            disabled={loading}
            className="inline-flex items-center gap-2 h-12 px-5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        )}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance()}
            className={`flex-1 h-12 px-6 text-base font-semibold text-white rounded-lg flex items-center justify-center gap-2.5 transition-colors ${
              canAdvance() ? 'bg-primary hover:bg-primary-dark shadow-sm' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <span>Continue</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 h-12 px-6 text-base font-semibold text-white rounded-lg flex items-center justify-center gap-2.5 bg-primary hover:bg-primary-dark shadow-sm transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Submitting…</span>
              </>
            ) : (
              <>
                <span>Submit request</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>

      <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1.5 mt-3">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Your request is sent to our team - your data is encrypted</span>
      </p>

      {/* Modals */}
      <CameraCapture isOpen={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
      <FullscreenMapPicker
        isOpen={mapPickerOpen !== null}
        onClose={() => setMapPickerOpen(null)}
        onSelect={handleMapSelect}
        initialPosition={
          mapPickerOpen === 'pickup' && pickup.latitude && pickup.longitude
            ? { lat: pickup.latitude, lng: pickup.longitude }
            : mapPickerOpen === 'dropoff' && dropoff.latitude && dropoff.longitude
            ? { lat: dropoff.latitude, lng: dropoff.longitude }
            : null
        }
        title={mapPickerOpen === 'pickup' ? 'Select location' : 'Select destination'}
      />
      <LocationCategoryPicker
        isOpen={categoryPickerOpen !== null}
        onClose={() => setCategoryPickerOpen(null)}
        onSelect={handleCategorySelect}
        title={categoryPickerOpen === 'pickup' ? 'Suggested places' : 'Suggested destinations'}
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 font-medium text-right break-words">{value}</dd>
    </div>
  );
}

// Read-only contact pulled from the customer's profile (never re-captured).
function YourContact({ name, phone }: { name: string; phone: string }) {
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500 mb-1">Your contact (from your profile)</p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-900">
        <span className="inline-flex items-center gap-1.5">
          <User className="w-4 h-4 text-gray-400" />
          {name || '-'}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Phone className="w-4 h-4 text-gray-400" />
          {phone || '-'}
        </span>
      </div>
    </div>
  );
}

// Module-scope so AddressInput keeps a stable identity (no remount/focus loss).
function LocationField({
  which,
  loc,
  label,
  placeholder,
  onChange,
  onMapClick,
  onCategoryClick,
}: {
  which: 'pickup' | 'dropoff';
  loc: LocationState;
  label: string;
  placeholder: string;
  onChange: (field: keyof LocationState, value: any) => void;
  onMapClick: () => void;
  onCategoryClick: () => void;
}) {
  const accent =
    which === 'pickup' ? 'text-primary hover:text-primary-dark' : 'text-secondary-dark hover:text-secondary';
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      <AddressInput
        value={loc.address}
        onChange={(address, lat, lng) => {
          onChange('address', address);
          onChange('latitude', lat);
          onChange('longitude', lng);
        }}
        onMapClick={onMapClick}
        placeholder={placeholder}
        icon={which}
      />
      <button
        type="button"
        onClick={onCategoryClick}
        className={`mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold ${accent}`}
      >
        <MapPin className="w-3.5 h-3.5" />
        Suggestions (bus stand, airport, hospital…)
      </button>
    </div>
  );
}
