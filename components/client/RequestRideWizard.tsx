'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Package,
  UserRound,
  Clock,
  Send,
  MapPin,
  Phone,
  User,
  Truck,
  Users,
  Camera,
  X,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  CalendarClock,
} from 'lucide-react';
import { LocationState } from '@/components/landing/types';
import AddressInput from '@/components/landing/AddressInput';
import FullscreenMapPicker from '@/components/landing/FullscreenMapPicker';
import LocationCategoryPicker from '@/components/landing/LocationCategoryPicker';
import VehicleSelector from '@/components/landing/VehicleSelector';
import HireVehicleSelector, { type HireVehicleOption } from '@/components/client/HireVehicleSelector';
import CameraCapture from '@/components/common/CameraCapture';
import { supabase } from '@/lib/supabase';
import { SERVICE_TYPES, getServiceType, type ServiceTypeKey } from '@/lib/serviceTypes';
import { useT } from '@/lib/i18n';

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
  Send,
};

// Real service photos (same as the home page). Falls back to the Lucide icon.
const SERVICE_IMAGES: Record<string, string> = {
  errand: '/services/errand.webp',
  delivery: '/services/delivery.webp',
  ride: '/services/ride.webp',
  hire: '/services/hire.webp',
};

type StepId = 'purpose' | 'transport' | 'details' | 'errand' | 'hireVehicle' | 'hireDetails' | 'time';

// The step sequence depends on the chosen service. Errand ("Send a Rider") has
// no vehicle step; Hire replaces the vehicle-type step with the People/Load
// physical-vehicle picker + a supportive-info step.
function stepsFor(svc: ServiceTypeKey | null): StepId[] {
  if (!svc) return ['purpose'];
  if (svc === 'errand') return ['purpose', 'errand', 'time'];
  if (svc === 'hire') return ['purpose', 'hireVehicle', 'hireDetails', 'time'];
  return ['purpose', 'transport', 'details', 'time'];
}

export default function RequestRideWizard({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onPhoneBlur,
  isCheckingPhone,
}: WizardProps) {
  const router = useRouter();
  const t = useT();

  const [step, setStep] = useState(0);
  const [serviceType, setServiceType] = useState<ServiceTypeKey | null>(null);

  // Delivery / ride vehicle (vehicle_types catalog).
  const [vehicleTypeId, setVehicleTypeId] = useState<string | null>(null);
  const [vehicleName, setVehicleName] = useState<string>('');

  // Vehicle hire (physical vehicles).
  const [hireCategory, setHireCategory] = useState<'people' | 'load' | null>(null);
  const [hireVehicleId, setHireVehicleId] = useState<string | null>(null);
  const [hireVehicle, setHireVehicle] = useState<HireVehicleOption | null>(null);
  // Hire supportive info (item 8).
  const [hirePassengers, setHirePassengers] = useState('');
  const [hirePurpose, setHirePurpose] = useState('');
  const [hireWhen, setHireWhen] = useState('');
  const [hireLoadDesc, setHireLoadDesc] = useState('');
  const [hireWeight, setHireWeight] = useState('');
  const [hireNotes, setHireNotes] = useState('');

  // Delivery package + ride notes.
  const [packageDetails, setPackageDetails] = useState('');
  const [serviceDetails, setServiceDetails] = useState('');

  // Errand ("Send a Rider").
  const [errandReason, setErrandReason] = useState('');
  const [errandNotes, setErrandNotes] = useState('');

  // Scheduling
  const [scheduleLater, setScheduleLater] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pickers
  const [mapPickerOpen, setMapPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);
  const [locating, setLocating] = useState(false);

  // Camera/Image
  const [packageImage, setPackageImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = stepsFor(serviceType);
  const currentStep: StepId = steps[step] || 'purpose';
  const isLastStep = step === steps.length - 1;

  // Resolve the chosen delivery/ride vehicle's display name for the review step.
  useEffect(() => {
    if (!vehicleTypeId) {
      setVehicleName('');
      return;
    }
    fetch('/api/vehicle-types')
      .then((r) => (r.ok ? r.json() : []))
      .then((types: any[]) => {
        const vt = Array.isArray(types) ? types.find((x) => x.id === vehicleTypeId) : null;
        setVehicleName(vt?.name || '');
      })
      .catch(() => setVehicleName(''));
  }, [vehicleTypeId]);

  const svc = serviceType;
  const needsDropoff = svc === 'delivery' || svc === 'ride';
  const needsRecipient = svc === 'delivery';
  const needsPackage = svc === 'delivery';

  // Reset downstream state when the service changes so stale selections don't leak.
  const chooseService = (key: ServiceTypeKey) => {
    setServiceType(key);
    setVehicleTypeId(null);
    setHireCategory(null);
    setHireVehicleId(null);
    setHireVehicle(null);
  };

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
    switch (currentStep) {
      case 'purpose':
        return !!serviceType;
      case 'transport':
        return !!vehicleTypeId;
      case 'details':
        if (!pickup.address) return false;
        if (needsDropoff && !dropoff.address) return false;
        if (needsRecipient && !(dropoff.phone && dropoff.phone.length >= 9)) return false;
        return true;
      case 'errand':
        return !!pickup.address && !!dropoff.address && !!errandReason.trim();
      case 'hireVehicle':
        return !!hireCategory && !!hireVehicleId;
      case 'hireDetails':
        if (!pickup.address || !dropoff.address) return false;
        if (hireCategory === 'people' && !hirePassengers.trim()) return false;
        if (hireCategory === 'load' && !hireLoadDesc.trim()) return false;
        return true;
      default:
        return true;
    }
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

  // Capture the device's current position and reverse-geocode it into the pickup
  // field (Google-Maps-style "use my location").
  const useCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(t('components.rideWizard.locationUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onPickupChange('latitude', latitude);
        onPickupChange('longitude', longitude);
        const finish = (address: string) => {
          onPickupChange('address', address);
          setLocating(false);
        };
        try {
          const g = (window as any).google;
          if (g?.maps?.Geocoder) {
            new g.maps.Geocoder().geocode(
              { location: { lat: latitude, lng: longitude } },
              (results: any, status: string) => {
                if (status === 'OK' && results?.[0]) finish(results[0].formatted_address);
                else finish(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
              }
            );
          } else {
            finish(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
          }
        } catch {
          finish(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
      },
      () => {
        setError(t('components.rideWizard.locationDenied'));
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 50 * 1024 * 1024) {
        setError(t('components.rideWizard.imageTooLarge'));
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
      if (uploadError) throw new Error(t('components.rideWizard.uploadFailed'));
      const { data } = supabase.storage.from('order-attachments').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    }
  };

  // Assemble the human-readable supportive info for a hire request.
  const buildHireDetails = (): string => {
    const lines: string[] = [];
    if (hireCategory === 'people') {
      if (hirePassengers) lines.push(`${t('components.rideWizard.passengers')}: ${hirePassengers}`);
      if (hirePurpose) lines.push(`${t('components.rideWizard.tripPurpose')}: ${hirePurpose}`);
      if (hireWhen) lines.push(`${t('components.rideWizard.travelWhen')}: ${hireWhen}`);
    } else if (hireCategory === 'load') {
      if (hireLoadDesc) lines.push(`${t('components.rideWizard.loadDescription')}: ${hireLoadDesc}`);
      if (hireWeight) lines.push(`${t('components.rideWizard.approxWeight')}: ${hireWeight}`);
    }
    if (hireNotes) lines.push(hireNotes);
    return lines.join('\n');
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
        vehicle_type_id: svc === 'delivery' || svc === 'ride' ? vehicleTypeId : null,
        pickup_address: pickup.address,
        pickup_latitude: pickup.latitude,
        pickup_longitude: pickup.longitude,
        pickup_name: pickup.name,
        pickup_phone: pickup.phone ? normalizePhone(pickup.phone) : pickup.phone,
        scheduled_pickup_at: scheduleLater && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };

      if (svc === 'delivery') {
        payload.dropoff_address = dropoff.address;
        payload.dropoff_latitude = dropoff.latitude;
        payload.dropoff_longitude = dropoff.longitude;
        payload.dropoff_name = dropoff.name;
        payload.dropoff_phone = dropoff.phone ? normalizePhone(dropoff.phone) : dropoff.phone;
        payload.package_description = packageDetails || null;
        payload.package_image_url = packageImageUrl;
      } else if (svc === 'ride') {
        payload.dropoff_address = dropoff.address;
        payload.dropoff_latitude = dropoff.latitude;
        payload.dropoff_longitude = dropoff.longitude;
        payload.service_details = serviceDetails || null;
      } else if (svc === 'errand') {
        // Destination (where the rider should go) + optional contact there.
        payload.dropoff_address = dropoff.address;
        payload.dropoff_latitude = dropoff.latitude;
        payload.dropoff_longitude = dropoff.longitude;
        payload.dropoff_phone = dropoff.phone ? normalizePhone(dropoff.phone) : null;
        payload.service_details = errandReason || null;
        payload.package_description = errandNotes || null;
      } else if (svc === 'hire') {
        payload.hire_vehicle_id = hireVehicleId;
        payload.hire_category = hireCategory;
        payload.dropoff_address = dropoff.address || null;
        payload.dropoff_latitude = dropoff.latitude;
        payload.dropoff_longitude = dropoff.longitude;
        payload.service_details = buildHireDetails() || null;
      }

      const response = await fetch('/api/client/rides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('components.rideWizard.submitFailed'));

      setSuccess(t('components.rideWizard.submitted'));
      setTimeout(() => {
        router.push('/dashboard/business/rides');
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('components.rideWizard.submitFailed'));
      setLoading(false);
    }
  };

  const goNext = () => {
    setError('');
    if (!isLastStep) setStep((s) => s + 1);
  };
  const goBack = () => {
    setError('');
    if (step > 0) setStep((s) => s - 1);
  };

  const inputClass =
    'w-full h-11 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-50';
  const plainInput =
    'w-full h-11 px-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-50';

  const serviceDef = serviceType ? getServiceType(serviceType) : null;
  const serviceLabelText = serviceType ? t(`components.serviceTypes.${serviceType}.label`) : '-';
  const transportText =
    svc === 'hire' ? hireVehicle?.name || '-' : svc === 'errand' ? '-' : vehicleName || '-';

  return (
    <div>
      {/* ===== PURPOSE ===== */}
      {currentStep === 'purpose' && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">{t('components.rideWizard.whatNeed')}</h3>
          <div className="flex flex-col gap-3">
            {SERVICE_TYPES.map((s) => {
              const Icon = SERVICE_ICONS[s.icon] || Package;
              const selected = serviceType === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => chooseService(s.key)}
                  className={`flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                    selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  {SERVICE_IMAGES[s.key] ? (
                    <NextImage
                      src={SERVICE_IMAGES[s.key]}
                      alt=""
                      width={96}
                      height={96}
                      className={`w-12 h-12 rounded-full object-cover shrink-0 ring-2 ${
                        selected ? 'ring-primary' : 'ring-black/5'
                      }`}
                    />
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{t(s.labelKey)}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t(s.descriptionKey)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== TRANSPORT (delivery / ride) ===== */}
      {currentStep === 'transport' && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <header className="flex items-center gap-2.5 mb-4">
            <Truck className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {t('components.rideWizard.meansOfTransport')}
              </h3>
              <p className="text-xs text-gray-500">{t('components.rideWizard.chooseVehicle')}</p>
            </div>
          </header>
          <VehicleSelector value={vehicleTypeId} onChange={setVehicleTypeId} disabled={loading} />
        </section>
      )}

      {/* ===== HIRE VEHICLE (people / load + physical vehicle) ===== */}
      {currentStep === 'hireVehicle' && (
        <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <header className="flex items-center gap-2.5 mb-4">
            <Truck className="w-5 h-5 text-gray-400 shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-tight">
                {t('components.rideWizard.chooseHireVehicle')}
              </h3>
              <p className="text-xs text-gray-500">{t('components.rideWizard.choosePeopleOrLoad')}</p>
            </div>
          </header>

          <div className="grid grid-cols-2 gap-3 mb-5">
            {(['people', 'load'] as const).map((cat) => {
              const selected = hireCategory === cat;
              const Icon = cat === 'people' ? Users : Package;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setHireCategory(cat);
                    setHireVehicleId(null);
                    setHireVehicle(null);
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selected ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-primary/50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {cat === 'people'
                      ? t('components.rideWizard.carryPeople')
                      : t('components.rideWizard.carryLoads')}
                  </span>
                </button>
              );
            })}
          </div>

          {hireCategory && (
            <HireVehicleSelector
              category={hireCategory}
              value={hireVehicleId}
              onChange={(id, vehicle) => {
                setHireVehicleId(id);
                setHireVehicle(vehicle);
              }}
              disabled={loading}
            />
          )}
        </section>
      )}

      {/* ===== HIRE DETAILS (locations + supportive info) ===== */}
      {currentStep === 'hireDetails' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {t('components.rideWizard.tripRoute')}
                </h3>
                <p className="text-xs text-gray-500">{hireVehicle?.name || serviceDef?.label}</p>
              </div>
            </header>
            <div className="space-y-4">
              <LocationField
                which="pickup"
                loc={pickup}
                label={t('components.rideWizard.startLocation')}
                placeholder={t('components.rideWizard.typeOrPickMap')}
                onChange={onPickupChange}
                onMapClick={() => setMapPickerOpen('pickup')}
                onCategoryClick={() => setCategoryPickerOpen('pickup')}
                onUseCurrentLocation={useCurrentLocation}
                locating={locating}
              />
              <LocationField
                which="dropoff"
                loc={dropoff}
                label={t('components.rideWizard.destination')}
                placeholder={t('components.rideWizard.typeOrPickMap')}
                onChange={onDropoffChange}
                onMapClick={() => setMapPickerOpen('dropoff')}
                onCategoryClick={() => setCategoryPickerOpen('dropoff')}
              />
              <YourContact name={pickup.name} phone={pickup.phone} />
            </div>
          </section>

          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              {hireCategory === 'people' ? (
                <Users className="w-5 h-5 text-gray-400 shrink-0" />
              ) : (
                <Package className="w-5 h-5 text-gray-400 shrink-0" />
              )}
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {hireCategory === 'people'
                    ? t('components.rideWizard.peopleInfo')
                    : t('components.rideWizard.loadInfo')}
                </h3>
                <p className="text-xs text-gray-500">{t('components.rideWizard.helpsPlan')}</p>
              </div>
            </header>

            {hireCategory === 'people' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('components.rideWizard.passengers')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={hirePassengers}
                    onChange={(e) => setHirePassengers(e.target.value)}
                    placeholder="30"
                    className={plainInput}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('components.rideWizard.tripPurpose')}
                  </label>
                  <input
                    type="text"
                    value={hirePurpose}
                    onChange={(e) => setHirePurpose(e.target.value)}
                    placeholder={t('components.rideWizard.tripPurposePlaceholder')}
                    className={plainInput}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('components.rideWizard.travelWhen')}
                  </label>
                  <input
                    type="text"
                    value={hireWhen}
                    onChange={(e) => setHireWhen(e.target.value)}
                    placeholder={t('components.rideWizard.travelWhenPlaceholder')}
                    className={plainInput}
                    disabled={loading}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('components.rideWizard.loadDescription')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={hireLoadDesc}
                    onChange={(e) => setHireLoadDesc(e.target.value)}
                    placeholder={t('components.rideWizard.loadDescriptionPlaceholder')}
                    className={plainInput}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    {t('components.rideWizard.approxWeight')}
                  </label>
                  <input
                    type="text"
                    value={hireWeight}
                    onChange={(e) => setHireWeight(e.target.value)}
                    placeholder={t('components.rideWizard.approxWeightPlaceholder')}
                    className={plainInput}
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                {t('components.rideWizard.additionalInfo')}
              </label>
              <textarea
                value={hireNotes}
                onChange={(e) => setHireNotes(e.target.value)}
                rows={3}
                placeholder={t('components.rideWizard.hirePlaceholder')}
                className="w-full p-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
            </div>
          </section>
        </div>
      )}

      {/* ===== ERRAND (Send a Rider) ===== */}
      {currentStep === 'errand' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              <Send className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {t('components.rideWizard.errandTitle')}
                </h3>
                <p className="text-xs text-gray-500">{t('components.rideWizard.errandSubtitle')}</p>
              </div>
            </header>

            <div className="space-y-4">
              {/* (i) Where should the rider go */}
              <LocationField
                which="dropoff"
                loc={dropoff}
                label={t('components.rideWizard.errandWhereGo')}
                placeholder={t('components.rideWizard.errandWhereGoPlaceholder')}
                onChange={onDropoffChange}
                onMapClick={() => setMapPickerOpen('dropoff')}
                onCategoryClick={() => setCategoryPickerOpen('dropoff')}
              />

              {/* (ii) Reason */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('components.rideWizard.errandReason')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={errandReason}
                  onChange={(e) => setErrandReason(e.target.value)}
                  placeholder={t('components.rideWizard.errandReasonPlaceholder')}
                  className={plainInput}
                  disabled={loading}
                />
              </div>

              {/* (iii) Contact phone in that area (optional) */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('components.rideWizard.errandContact')}{' '}
                  <span className="text-gray-400">({t('common.optional')})</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="tel"
                    value={dropoff.phone}
                    onChange={(e) => onDropoffChange('phone', e.target.value)}
                    placeholder="0712 345 678"
                    className={inputClass}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* (iv) Your location */}
              <LocationField
                which="pickup"
                loc={pickup}
                label={t('components.rideWizard.errandYourLocation')}
                placeholder={t('components.rideWizard.typeOrPickMap')}
                onChange={onPickupChange}
                onMapClick={() => setMapPickerOpen('pickup')}
                onCategoryClick={() => setCategoryPickerOpen('pickup')}
                onUseCurrentLocation={useCurrentLocation}
                locating={locating}
              />

              <YourContact name={pickup.name} phone={pickup.phone} />

              {/* (v) Additional info */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  {t('components.rideWizard.additionalInfo')}
                </label>
                <textarea
                  value={errandNotes}
                  onChange={(e) => setErrandNotes(e.target.value)}
                  rows={3}
                  placeholder={t('components.rideWizard.errandNotesPlaceholder')}
                  className="w-full p-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ===== DETAILS (delivery / ride) ===== */}
      {currentStep === 'details' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">
                  {svc === 'delivery'
                    ? t('components.rideWizard.pickupDropoff')
                    : t('components.rideWizard.yourTrip')}
                </h3>
                <p className="text-xs text-gray-500">{serviceDef?.label}</p>
              </div>
            </header>

            <div className="space-y-4">
              <LocationField
                which="pickup"
                loc={pickup}
                label={t('components.rideWizard.pickupLocation')}
                placeholder={t('components.rideWizard.typeOrPickMap')}
                onChange={onPickupChange}
                onMapClick={() => setMapPickerOpen('pickup')}
                onCategoryClick={() => setCategoryPickerOpen('pickup')}
                onUseCurrentLocation={useCurrentLocation}
                locating={locating}
              />

              <YourContact name={pickup.name} phone={pickup.phone} />

              {needsDropoff && (
                <LocationField
                  which="dropoff"
                  loc={dropoff}
                  label={svc === 'ride' ? t('components.rideWizard.destination') : t('components.rideWizard.dropoffLocation')}
                  placeholder={t('components.rideWizard.typeOrPickMap')}
                  onChange={onDropoffChange}
                  onMapClick={() => setMapPickerOpen('dropoff')}
                  onCategoryClick={() => setCategoryPickerOpen('dropoff')}
                />
              )}

              {needsRecipient && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {t('components.rideWizard.recipientName')}
                    </label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={dropoff.name}
                        onChange={(e) => onDropoffChange('name', e.target.value)}
                        placeholder={t('components.rideWizard.recipientName')}
                        className={inputClass}
                        disabled={loading}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">
                      {t('components.rideWizard.recipientPhone')}
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        inputMode="tel"
                        value={dropoff.phone}
                        onChange={(e) => onDropoffChange('phone', e.target.value)}
                        onBlur={(e) => onPhoneBlur(e.target.value)}
                        placeholder="+255..."
                        className={inputClass}
                        disabled={loading}
                      />
                      {isCheckingPhone && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Delivery package */}
          {svc === 'delivery' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <header className="flex items-center gap-2.5 mb-4">
                <Package className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    {t('components.rideWizard.packageDetails')}
                  </h3>
                  <p className="text-xs text-gray-500">{t('common.optional')}</p>
                </div>
              </header>
              <div className="space-y-4">
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={packageDetails}
                    onChange={(e) => setPackageDetails(e.target.value)}
                    placeholder={t('components.rideWizard.packagePlaceholder')}
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
                      <span>{t('components.rideWizard.takePhoto')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={loading}
                      className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 hover:border-secondary-dark hover:bg-secondary/5 rounded-lg text-sm font-medium text-gray-600 hover:text-secondary-dark transition-all"
                    >
                      <ImagePlus className="w-6 h-6 text-gray-400" />
                      <span>{t('components.rideWizard.fromGallery')}</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative bg-gray-50 border border-gray-200 rounded-lg p-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imagePreview} alt="Package preview" className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{t('components.rideWizard.photoAttached')}</p>
                      <div className="mt-1.5 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setCameraOpen(true)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark"
                        >
                          <Camera className="w-3.5 h-3.5" /> {t('components.rideWizard.camera')}
                        </button>
                        <span className="w-px h-3 bg-gray-300" aria-hidden />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-dark hover:text-secondary"
                        >
                          <ImagePlus className="w-3.5 h-3.5" /> {t('components.rideWizard.gallery')}
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="self-start p-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 rounded-lg"
                      aria-label={t('components.rideWizard.removePhoto')}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Ride notes (optional) */}
          {svc === 'ride' && (
            <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
              <header className="flex items-center gap-2.5 mb-4">
                <UserRound className="w-5 h-5 text-gray-400 shrink-0" />
                <div>
                  <h3 className="text-base font-semibold text-gray-900 leading-tight">
                    {t('components.rideWizard.tripNotes')}
                  </h3>
                  <p className="text-xs text-gray-500">{t('common.optional')}</p>
                </div>
              </header>
              <textarea
                value={serviceDetails}
                onChange={(e) => setServiceDetails(e.target.value)}
                rows={4}
                placeholder={t('components.rideWizard.tripPlaceholder')}
                className="w-full p-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:bg-gray-50"
                disabled={loading}
              />
            </section>
          )}
        </div>
      )}

      {/* ===== TIME & REVIEW ===== */}
      {currentStep === 'time' && (
        <div className="space-y-5">
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <header className="flex items-center gap-2.5 mb-4">
              <CalendarClock className="w-5 h-5 text-gray-400 shrink-0" />
              <div>
                <h3 className="text-base font-semibold text-gray-900 leading-tight">{t('components.rideWizard.when')}</h3>
                <p className="text-xs text-gray-500">{t('components.rideWizard.chooseWhen')}</p>
              </div>
            </header>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setScheduleLater(false)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  !scheduleLater ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{t('components.rideWizard.asap')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('components.rideWizard.asapHint')}</p>
              </button>
              <button
                type="button"
                onClick={() => setScheduleLater(true)}
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  scheduleLater ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">{t('components.rideWizard.scheduleLater')}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t('components.rideWizard.pickDateTime')}</p>
              </button>
            </div>
            {scheduleLater && (
              <div className="mt-4">
                <label className="block text-xs font-medium text-gray-600 mb-1.5">{t('components.rideWizard.pickupDateTime')}</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full h-11 px-3 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={loading}
                />
              </div>
            )}
          </section>

          {/* Review */}
          <section className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-3">{t('components.rideWizard.review')}</h3>
            <dl className="space-y-2 text-sm">
              <ReviewRow label={t('components.rideWizard.service')} value={serviceLabelText} />
              {svc !== 'errand' && <ReviewRow label={t('components.rideWizard.transport')} value={transportText} />}
              <ReviewRow
                label={svc === 'errand' ? t('components.rideWizard.errandYourLocation') : t('components.rideWizard.start')}
                value={pickup.address || '-'}
              />
              {(needsDropoff || svc === 'errand' || svc === 'hire') && (
                <ReviewRow label={t('components.rideWizard.destination')} value={dropoff.address || '-'} />
              )}
              {needsRecipient && (
                <ReviewRow label={t('components.rideWizard.recipient')} value={`${dropoff.name || '-'} · ${dropoff.phone || '-'}`} />
              )}
              {svc === 'errand' && errandReason && (
                <ReviewRow label={t('components.rideWizard.errandReason')} value={errandReason} />
              )}
              {svc === 'hire' && buildHireDetails() && (
                <ReviewRow label={t('components.rideWizard.details')} value={buildHireDetails()} />
              )}
              {svc === 'ride' && serviceDetails && (
                <ReviewRow label={t('components.rideWizard.details')} value={serviceDetails} />
              )}
              <ReviewRow
                label={t('components.rideWizard.when')}
                value={scheduleLater && scheduledAt ? new Date(scheduledAt).toLocaleString() : t('components.rideWizard.asap')}
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
            className="inline-flex items-center gap-2 h-12 px-5 rounded-full border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-5 h-5" />
            {t('common.back')}
          </button>
        )}
        {!isLastStep ? (
          <button
            type="button"
            onClick={goNext}
            disabled={!canAdvance()}
            className={`ml-auto h-12 px-6 text-base font-semibold text-white rounded-full inline-flex items-center justify-center gap-2.5 transition-colors ${
              canAdvance() ? 'bg-primary hover:bg-primary-dark shadow-sm' : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <span>{t('components.quickOrder.continue')}</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="ml-auto h-12 px-6 text-base font-semibold text-white rounded-full inline-flex items-center justify-center gap-2.5 bg-primary hover:bg-primary-dark shadow-sm transition-colors disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('components.rideWizard.submitting')}</span>
              </>
            ) : (
              <>
                <span>{t('components.rideWizard.submitRequest')}</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        )}
      </div>

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
        title={mapPickerOpen === 'pickup' ? t('components.rideWizard.selectLocation') : t('components.rideWizard.selectDestination')}
      />
      <LocationCategoryPicker
        isOpen={categoryPickerOpen !== null}
        onClose={() => setCategoryPickerOpen(null)}
        onSelect={handleCategorySelect}
        title={categoryPickerOpen === 'pickup' ? t('components.rideWizard.suggestedPlaces') : t('components.rideWizard.suggestedDestinations')}
      />
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-gray-900 font-medium text-right break-words whitespace-pre-line">{value}</dd>
    </div>
  );
}

// Read-only contact pulled from the customer's profile (never re-captured).
function YourContact({ name, phone }: { name: string; phone: string }) {
  const t = useT();
  return (
    <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
      <p className="text-xs font-medium text-gray-500 mb-1">{t('components.rideWizard.yourContact')}</p>
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
  onUseCurrentLocation,
  locating,
}: {
  which: 'pickup' | 'dropoff';
  loc: LocationState;
  label: string;
  placeholder: string;
  onChange: (field: keyof LocationState, value: any) => void;
  onMapClick: () => void;
  onCategoryClick: () => void;
  onUseCurrentLocation?: () => void;
  locating?: boolean;
}) {
  const t = useT();
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
      <div className="mt-1.5 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onCategoryClick}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${accent}`}
        >
          <MapPin className="w-3.5 h-3.5" />
          {t('components.rideWizard.suggestions')}
        </button>
        {onUseCurrentLocation && (
          <button
            type="button"
            onClick={onUseCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-dark disabled:opacity-60"
          >
            {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            {t('components.rideWizard.useCurrentLocation')}
          </button>
        )}
      </div>
    </div>
  );
}
