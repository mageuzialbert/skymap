'use client';

import { useState, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Loader2, MapPin, User, Phone, Package, ChevronLeft, ChevronRight, Check, AlertCircle } from 'lucide-react';
import LocationPicker from '@/components/common/LocationPicker';

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region_id: number;
}

interface DeliveryFormProps {
  onSubmit: (data: DeliveryFormData) => void;
  loading: boolean;
  error: string;
}

export interface DeliveryFormData {
  pickup_address: string;
  pickup_latitude: number | null;
  pickup_longitude: number | null;
  pickup_name: string;
  pickup_phone: string;
  pickup_region_id: number | null;
  pickup_district_id: number | null;
  dropoff_address: string;
  dropoff_latitude: number | null;
  dropoff_longitude: number | null;
  dropoff_name: string;
  dropoff_phone: string;
  dropoff_region_id: number | null;
  dropoff_district_id: number | null;
  package_description: string;
}

type FormStep = 'pickup' | 'dropoff' | 'review';

const STEPS: { key: FormStep; label: string; icon: React.ReactNode }[] = [
  { key: 'pickup', label: 'Pickup', icon: <MapPin className="w-4 h-4" /> },
  { key: 'dropoff', label: 'Drop-off', icon: <MapPin className="w-4 h-4" /> },
  { key: 'review', label: 'Review', icon: <Check className="w-4 h-4" /> },
];

export default function DeliveryForm({ onSubmit, loading, error }: DeliveryFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('pickup');
  const [regions, setRegions] = useState<Region[]>([]);
  const [pickupDistricts, setPickupDistricts] = useState<District[]>([]);
  const [dropoffDistricts, setDropoffDistricts] = useState<District[]>([]);
  const [loadingRegions, setLoadingRegions] = useState(true);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  const [formData, setFormData] = useState<DeliveryFormData>({
    pickup_address: '',
    pickup_latitude: null,
    pickup_longitude: null,
    pickup_name: '',
    pickup_phone: '',
    pickup_region_id: null,
    pickup_district_id: null,
    dropoff_address: '',
    dropoff_latitude: null,
    dropoff_longitude: null,
    dropoff_name: '',
    dropoff_phone: '',
    dropoff_region_id: null,
    dropoff_district_id: null,
    package_description: '',
  });

  // Load regions
  useEffect(() => {
    async function loadRegions() {
      try {
        const response = await fetch('/api/regions');
        if (response.ok) {
          const data = await response.json();
          setRegions(data);
        }
      } catch (error) {
        console.error('Error loading regions:', error);
      } finally {
        setLoadingRegions(false);
      }
    }
    loadRegions();
  }, []);

  // Load pickup districts
  useEffect(() => {
    async function loadPickupDistricts() {
      if (!formData.pickup_region_id) {
        setPickupDistricts([]);
        return;
      }

      try {
        const response = await fetch(`/api/districts?region_id=${formData.pickup_region_id}`);
        if (response.ok) {
          const data = await response.json();
          setPickupDistricts(data);
        }
      } catch (error) {
        console.error('Error loading districts:', error);
      }
    }
    loadPickupDistricts();
  }, [formData.pickup_region_id]);

  // Load dropoff districts
  useEffect(() => {
    async function loadDropoffDistricts() {
      if (!formData.dropoff_region_id) {
        setDropoffDistricts([]);
        return;
      }

      try {
        const response = await fetch(`/api/districts?region_id=${formData.dropoff_region_id}`);
        if (response.ok) {
          const data = await response.json();
          setDropoffDistricts(data);
        }
      } catch (error) {
        console.error('Error loading districts:', error);
      }
    }
    loadDropoffDistricts();
  }, [formData.dropoff_region_id]);

  const validatePickupStep = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.pickup_name.trim()) {
      errors.pickup_name = 'Contact name is required';
    }
    if (!formData.pickup_phone.trim()) {
      errors.pickup_phone = 'Phone number is required';
    }
    if (!formData.pickup_address.trim()) {
      errors.pickup_address = 'Address is required';
    }
    
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDropoffStep = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.dropoff_name.trim()) {
      errors.dropoff_name = 'Recipient name is required';
    }
    if (!formData.dropoff_phone.trim()) {
      errors.dropoff_phone = 'Phone number is required';
    }
    if (!formData.dropoff_address.trim()) {
      errors.dropoff_address = 'Address is required';
    }
    
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 'pickup') {
      if (validatePickupStep()) {
        setCurrentStep('dropoff');
        setStepErrors({});
      }
    } else if (currentStep === 'dropoff') {
      if (validateDropoffStep()) {
        setCurrentStep('review');
        setStepErrors({});
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 'dropoff') {
      setCurrentStep('pickup');
    } else if (currentStep === 'review') {
      setCurrentStep('dropoff');
    }
    setStepErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getCurrentStepIndex = () => STEPS.findIndex(s => s.key === currentStep);

  const inputClass = "w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-base";
  const labelClass = "block text-sm font-medium text-gray-700 mb-2";

  return (
    <div className="space-y-6">
      {/* Step Progress Indicator */}
      <div className="flex items-center justify-between px-2">
        {STEPS.map((step, index) => {
          const isActive = step.key === currentStep;
          const isComplete = getCurrentStepIndex() > index;
          
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isComplete
                      ? 'bg-primary text-white'
                      : isActive
                      ? 'bg-primary text-white ring-4 ring-primary/20'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {isComplete ? <Check className="w-5 h-5" /> : step.icon}
                </div>
                <span
                  className={`mt-2 text-xs font-medium ${
                    isActive || isComplete ? 'text-primary' : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 sm:w-20 h-1 mx-2 rounded-full transition-all ${
                    isComplete ? 'bg-primary' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Map Loading Status */}
      {loadError && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>Map features unavailable. You can still enter addresses manually.</span>
        </div>
      )}

      {!isLoaded && !loadError && (
        <div className="flex items-center justify-center p-4 bg-gray-50 rounded-xl">
          <Loader2 className="w-5 h-5 animate-spin text-primary mr-2" />
          <span className="text-gray-500 text-sm">Loading map...</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: Pickup Details */}
        {currentStep === 'pickup' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="p-2.5 bg-green-100 rounded-xl">
                <MapPin className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Pickup Details</h3>
                <p className="text-sm text-gray-500">Where should we pick up?</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Contact Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.pickup_name}
                onChange={(e) => setFormData({ ...formData, pickup_name: e.target.value })}
                placeholder="Who to pick up from"
                className={`${inputClass} ${stepErrors.pickup_name ? 'border-red-300 focus:ring-red-200' : ''}`}
              />
              {stepErrors.pickup_name && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.pickup_name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Phone Number <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="tel"
                value={formData.pickup_phone}
                onChange={(e) => setFormData({ ...formData, pickup_phone: e.target.value })}
                placeholder="+255759561311"
                className={`${inputClass} ${stepErrors.pickup_phone ? 'border-red-300 focus:ring-red-200' : ''}`}
              />
              {stepErrors.pickup_phone && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.pickup_phone}</p>
              )}
            </div>

            <div>
              {isLoaded ? (
                <LocationPicker
                  label="Pickup Address *"
                  value={formData.pickup_address}
                  onChange={(address, lat, lng) =>
                    setFormData({
                      ...formData,
                      pickup_address: address,
                      pickup_latitude: lat,
                      pickup_longitude: lng,
                    })
                  }
                  error={stepErrors.pickup_address}
                />
              ) : (
                <>
                  <label className={labelClass}>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Address <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.pickup_address}
                    onChange={(e) => setFormData({ ...formData, pickup_address: e.target.value })}
                    placeholder="Street address, building, landmark..."
                    className={`${inputClass} ${stepErrors.pickup_address ? 'border-red-300 focus:ring-red-200' : ''}`}
                  />
                  {stepErrors.pickup_address && (
                    <p className="mt-1 text-sm text-red-600">{stepErrors.pickup_address}</p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Region</label>
                <select
                  value={formData.pickup_region_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pickup_region_id: e.target.value ? Number(e.target.value) : null,
                      pickup_district_id: null,
                    })
                  }
                  disabled={loadingRegions}
                  className={inputClass}
                >
                  <option value="">Select Region</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>District</label>
                <select
                  value={formData.pickup_district_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pickup_district_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  disabled={!formData.pickup_region_id}
                  className={inputClass}
                >
                  <option value="">Select District</option>
                  {pickupDistricts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Drop-off Details */}
        {currentStep === 'dropoff' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="p-2.5 bg-blue-100 rounded-xl">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Drop-off Details</h3>
                <p className="text-sm text-gray-500">Where should we deliver?</p>
              </div>
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  Recipient Name <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                value={formData.dropoff_name}
                onChange={(e) => setFormData({ ...formData, dropoff_name: e.target.value })}
                placeholder="Who to deliver to"
                className={`${inputClass} ${stepErrors.dropoff_name ? 'border-red-300 focus:ring-red-200' : ''}`}
              />
              {stepErrors.dropoff_name && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.dropoff_name}</p>
              )}
            </div>

            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  Phone Number <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="tel"
                value={formData.dropoff_phone}
                onChange={(e) => setFormData({ ...formData, dropoff_phone: e.target.value })}
                placeholder="+255759561311"
                className={`${inputClass} ${stepErrors.dropoff_phone ? 'border-red-300 focus:ring-red-200' : ''}`}
              />
              {stepErrors.dropoff_phone && (
                <p className="mt-1 text-sm text-red-600">{stepErrors.dropoff_phone}</p>
              )}
            </div>

            <div>
              {isLoaded ? (
                <LocationPicker
                  label="Drop-off Address *"
                  value={formData.dropoff_address}
                  onChange={(address, lat, lng) =>
                    setFormData({
                      ...formData,
                      dropoff_address: address,
                      dropoff_latitude: lat,
                      dropoff_longitude: lng,
                    })
                  }
                  error={stepErrors.dropoff_address}
                />
              ) : (
                <>
                  <label className={labelClass}>
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      Address <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <input
                    type="text"
                    value={formData.dropoff_address}
                    onChange={(e) => setFormData({ ...formData, dropoff_address: e.target.value })}
                    placeholder="Street address, building, landmark..."
                    className={`${inputClass} ${stepErrors.dropoff_address ? 'border-red-300 focus:ring-red-200' : ''}`}
                  />
                  {stepErrors.dropoff_address && (
                    <p className="mt-1 text-sm text-red-600">{stepErrors.dropoff_address}</p>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Region</label>
                <select
                  value={formData.dropoff_region_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dropoff_region_id: e.target.value ? Number(e.target.value) : null,
                      dropoff_district_id: null,
                    })
                  }
                  disabled={loadingRegions}
                  className={inputClass}
                >
                  <option value="">Select Region</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>District</label>
                <select
                  value={formData.dropoff_district_id || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dropoff_district_id: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  disabled={!formData.dropoff_region_id}
                  className={inputClass}
                >
                  <option value="">Select District</option>
                  {dropoffDistricts.map((district) => (
                    <option key={district.id} value={district.id}>
                      {district.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {currentStep === 'review' && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Review & Submit</h3>
                <p className="text-sm text-gray-500">Confirm your delivery details</p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="space-y-4">
              {/* Pickup Summary */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                <div className="flex items-center gap-2 text-green-700 font-medium mb-3">
                  <div className="w-6 h-6 bg-green-200 rounded-full flex items-center justify-center text-xs font-bold">A</div>
                  Pickup
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-900 font-medium">{formData.pickup_name}</p>
                  <p className="text-gray-600">{formData.pickup_phone}</p>
                  <p className="text-gray-600">{formData.pickup_address}</p>
                  {formData.pickup_latitude && formData.pickup_longitude && (
                    <p className="text-xs text-green-600">
                      Location pinned on map
                    </p>
                  )}
                </div>
              </div>

              {/* Dropoff Summary */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-medium mb-3">
                  <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold">B</div>
                  Drop-off
                </div>
                <div className="space-y-1.5 text-sm">
                  <p className="text-gray-900 font-medium">{formData.dropoff_name}</p>
                  <p className="text-gray-600">{formData.dropoff_phone}</p>
                  <p className="text-gray-600">{formData.dropoff_address}</p>
                  {formData.dropoff_latitude && formData.dropoff_longitude && (
                    <p className="text-xs text-blue-600">
                      Location pinned on map
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Package Description */}
            <div>
              <label className={labelClass}>
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  Package Description (Optional)
                </span>
              </label>
              <textarea
                value={formData.package_description}
                onChange={(e) => setFormData({ ...formData, package_description: e.target.value })}
                rows={3}
                placeholder="Describe your package (e.g., documents, food, electronics...)"
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>
        )}

        {/* Navigation Buttons - Sticky on Mobile */}
        <div className="sticky bottom-0 left-0 right-0 bg-white pt-6 pb-2 -mx-6 px-6 md:mx-0 md:px-0 border-t border-gray-100 mt-6">
          <div className="flex gap-3">
            {currentStep !== 'pickup' && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 sm:flex-none px-6 py-3.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
              >
                <ChevronLeft className="w-5 h-5" />
                <span className="hidden sm:inline">Back</span>
              </button>
            )}

            {currentStep !== 'review' ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex-1 bg-primary text-white px-6 py-3.5 rounded-xl hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2"
              >
                <span>Continue</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-primary text-white px-6 py-3.5 rounded-xl hover:bg-primary-dark transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Create Delivery</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
