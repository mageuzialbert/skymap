'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Package, MapPin, Phone, User, ShieldCheck, Camera, X, Image as ImageIcon, Truck, CheckCircle2, AlertCircle, ImagePlus } from 'lucide-react';
import { LocationState } from './types';
import AddressInput from './AddressInput';
import FullscreenMapPicker from './FullscreenMapPicker';
import CameraCapture from '@/components/common/CameraCapture';
import { supabase } from '@/lib/supabase';

interface OrderPanelProps {
  pickup: LocationState;
  dropoff: LocationState;
  onPickupChange: (field: keyof LocationState, value: any) => void;
  onDropoffChange: (field: keyof LocationState, value: any) => void;
  onPhoneBlur: (phone: string) => void;
  isCheckingPhone: boolean;
  variant?: 'sheet' | 'page';
}

export default function OrderPanel({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onPhoneBlur,
  isCheckingPhone,
  variant = 'sheet',
}: OrderPanelProps) {
  const isPage = variant === 'page';
  const router = useRouter();
  const [mapPickerOpen, setMapPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);
  const [packageDetails, setPackageDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Camera/Image state
  const [packageImage, setPackageImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCameraCapture = (file: File) => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setPackageImage(file);
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  // --- OTP state (kept for later activation) ---
  // const [phase, setPhase] = useState<'form' | 'otp' | 'submitting'>('form');
  // const [otpCode, setOtpCode] = useState('');
  // const [normalizedPhone, setNormalizedPhone] = useState('');

  // Validation
  const isPickupValid = !!(pickup.address && pickup.phone && pickup.phone.length >= 10);
  const isDropoffValid = !!(dropoff.address && dropoff.phone && dropoff.phone.length >= 10);
  const canSubmit = isPickupValid && isDropoffValid;

  // Normalize phone number helper
  const normalizePhone = (phone: string): string => {
    let p = phone.trim();
    
    // If the number starts with '+' we assume a country code is provided
    if (p.startsWith('+')) {
      p = '+' + p.replace(/\D/g, '');
      // Remove leading zero after +255
      if (p.startsWith('+2550')) {
        p = '+255' + p.substring(5);
      }
      return p;
    }
    
    // Clean all non-digits
    p = p.replace(/\D/g, '');
    if (!p) return '';
    
    // If it starts with 255 (Tanzania country code without +)
    if (p.startsWith('255')) {
      if (p.startsWith('2550')) {
        return '+255' + p.substring(4);
      }
      return '+' + p;
    }
    
    // If it starts with 0 (Local format)
    if (p.startsWith('0')) {
      return '+255' + p.substring(1);
    }
    
    // Fallback: no country code provided
    return '+255' + p;
  };

  // Submit order directly (no OTP verification for now)
  const handleSubmitOrder = async () => {
    if (!canSubmit) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const phoneNumber = normalizePhone(pickup.phone);

      // Upload image if selected
      let packageImageUrl = null;
      if (packageImage) {
        packageImageUrl = await uploadPackageImage(packageImage);
      }

      // --- OTP flow (skipped for now, will activate later) ---
      // const otpResponse = await fetch('/api/auth/send-otp', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ phone: phoneNumber }),
      // });
      // const otpData = await otpResponse.json();
      // if (!otpResponse.ok) throw new Error(otpData.error || 'Failed to send verification code');
      // setPhase('otp');
      // setNormalizedPhone(phoneNumber);
      // return;

      // Call landing-order API directly (no OTP code needed)
      const response = await fetch('/api/deliveries/landing-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneNumber,
          code: '', // OTP skipped for now
          pickup_address: pickup.address,
          pickup_latitude: pickup.latitude,
          pickup_longitude: pickup.longitude,
          pickup_name: pickup.name,
          pickup_phone: normalizePhone(pickup.phone),
          dropoff_address: dropoff.address,
          dropoff_latitude: dropoff.latitude,
          dropoff_longitude: dropoff.longitude,
          dropoff_name: dropoff.name,
          dropoff_phone: normalizePhone(dropoff.phone),
          package_description: packageDetails,
          package_image_url: packageImageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Set session tokens
      if (data.accessToken && data.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Failed to create session');
        }

        // Wait for session to be set
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify session
        let user = null;
        for (let i = 0; i < 5; i++) {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            user = currentUser;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (!user) {
          throw new Error('Session was not created. Please try again.');
        }
      }

      setSuccess('Order created! Redirecting to your dashboard...');

      // Redirect to dashboard
      setTimeout(() => {
        router.push('/dashboard/business/deliveries');
        router.refresh();
      }, 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create order');
      setLoading(false);
    }
  };

  // --- OTP verification handler (kept for later activation) ---
  // const handleVerifyOTP = async () => { ... };
  // const handleResendOTP = async () => { ... };

  const handleMapSelect = (address: string, lat: number, lng: number) => {
    if (mapPickerOpen === 'pickup') {
      onPickupChange('address', address);
      onPickupChange('latitude', lat);
      onPickupChange('longitude', lng);
    } else if (mapPickerOpen === 'dropoff') {
      onDropoffChange('address', address);
      onDropoffChange('latitude', lat);
      onDropoffChange('longitude', lng);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size too large (max 5MB)');
        return;
      }
      setPackageImage(file);
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      setError('');
    }
  };

  const handleRemoveImage = () => {
    setPackageImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPackageImage = async (file: File): Promise<string | null> => {
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('order-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload image');
      }

      const { data } = supabase.storage
        .from('order-attachments')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <>
      {isPage ? (
        /* ============= PREMIUM PAGE VARIANT ============= */
        <div className="space-y-4 lg:space-y-6">
          {/* === Pickup + Dropoff: stacked on mobile, side-by-side on desktop === */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* ===== PICKUP CARD ===== */}
          <section className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(11,90,84,0.06)] p-5 sm:p-6">
            {/* gradient accent strip */}
            <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-primary via-primary-light to-primary/40 rounded-b-full" />

            <header className="flex items-center gap-3 mb-5">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center shadow-lg shadow-primary/30">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-primary">1</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-primary/70">Origin</p>
                <h3 className="text-base font-bold text-gray-900 leading-tight">Pickup Details</h3>
              </div>
            </header>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Pickup location</label>
                <AddressInput
                  value={pickup.address}
                  onChange={(address, lat, lng) => {
                    onPickupChange('address', address);
                    onPickupChange('latitude', lat);
                    onPickupChange('longitude', lng);
                  }}
                  onMapClick={() => setMapPickerOpen('pickup')}
                  placeholder="Search or pick on map"
                  icon="pickup"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pickup-phone" className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="pickup-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={pickup.phone}
                      onChange={(e) => onPickupChange('phone', e.target.value)}
                      onBlur={() => onPhoneBlur(pickup.phone)}
                      placeholder="+255..."
                      className="w-full h-11 pl-10 pr-9 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:bg-gray-50"
                      disabled={loading}
                    />
                    {isCheckingPhone && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="pickup-name" className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="pickup-name"
                      type="text"
                      autoComplete="name"
                      value={pickup.name}
                      onChange={(e) => onPickupChange('name', e.target.value)}
                      placeholder="Sender name"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:bg-gray-50"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ===== JOURNEY CONNECTOR (mobile only) ===== */}
          <div className="lg:hidden relative flex items-center justify-center -my-2 z-10" aria-hidden>
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
            <div className="relative bg-white rounded-full p-2.5 border border-gray-100 shadow-md">
              <Truck className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* ===== DROPOFF CARD ===== */}
          <section className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(245,158,11,0.07)] p-5 sm:p-6">
            <div className="absolute top-0 left-6 right-6 h-1 bg-gradient-to-r from-secondary via-secondary-light to-secondary/40 rounded-b-full" />

            <header className="flex items-center gap-3 mb-5">
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-secondary to-secondary-dark flex items-center justify-center shadow-lg shadow-secondary/30">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-gray-100 flex items-center justify-center text-[10px] font-bold text-secondary-dark">2</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-secondary-dark/80">Destination</p>
                <h3 className="text-base font-bold text-gray-900 leading-tight">Dropoff Details</h3>
              </div>
            </header>

            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Dropoff location</label>
                <AddressInput
                  value={dropoff.address}
                  onChange={(address, lat, lng) => {
                    onDropoffChange('address', address);
                    onDropoffChange('latitude', lat);
                    onDropoffChange('longitude', lng);
                  }}
                  onMapClick={() => setMapPickerOpen('dropoff')}
                  placeholder="Search or pick on map"
                  icon="dropoff"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="dropoff-phone" className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="dropoff-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={dropoff.phone}
                      onChange={(e) => onDropoffChange('phone', e.target.value)}
                      placeholder="+255..."
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all disabled:bg-gray-50"
                      disabled={loading}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="dropoff-name" className="block text-xs font-semibold text-gray-700 mb-1.5">Name</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      id="dropoff-name"
                      type="text"
                      autoComplete="name"
                      value={dropoff.name}
                      onChange={(e) => onDropoffChange('name', e.target.value)}
                      placeholder="Recipient name"
                      className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-secondary/40 focus:border-secondary transition-all disabled:bg-gray-50"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>
          </div>
          {/* === /Pickup+Dropoff grid === */}

          {/* ===== PACKAGE CARD ===== */}
          <section className="relative bg-white rounded-2xl border border-gray-100 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-5 sm:p-6">
            <header className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center shadow-lg shadow-gray-900/20">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-500">Optional</p>
                  <h3 className="text-base font-bold text-gray-900 leading-tight">Package Details</h3>
                </div>
              </div>
            </header>

            <div className="space-y-3.5">
              <div>
                <label htmlFor="package-details" className="block text-xs font-semibold text-gray-700 mb-1.5">Description</label>
                <div className="relative">
                  <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="package-details"
                    type="text"
                    value={packageDetails}
                    onChange={(e) => setPackageDetails(e.target.value)}
                    placeholder="e.g. Documents, small electronics"
                    className="w-full h-11 pl-10 pr-3 text-sm text-gray-900 placeholder-gray-400 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all disabled:bg-gray-50"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Hidden file input (gallery picker) */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageSelect}
              />

              {/* Photo capture zone */}
              {!imagePreview ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCameraOpen(true)}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 hover:border-primary hover:bg-primary/5 rounded-xl text-sm font-medium text-gray-600 hover:text-primary transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Camera className="w-5 h-5 text-primary" />
                    </div>
                    <span>Take photo</span>
                    <span className="text-[10px] text-gray-400 -mt-0.5">Use camera</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={loading}
                    className="flex flex-col items-center justify-center gap-2 py-5 border-2 border-dashed border-gray-200 hover:border-secondary-dark hover:bg-secondary/5 rounded-xl text-sm font-medium text-gray-600 hover:text-secondary-dark transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full bg-secondary/15 flex items-center justify-center">
                      <ImagePlus className="w-5 h-5 text-secondary-dark" />
                    </div>
                    <span>From gallery</span>
                    <span className="text-[10px] text-gray-400 -mt-0.5">Choose file</span>
                  </button>
                </div>
              ) : (
                <div className="relative bg-gray-50 border border-gray-200 rounded-xl p-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Package preview"
                    className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">Photo attached</p>
                    <p className="text-xs text-gray-500 mt-0.5">Replace using:</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCameraOpen(true)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark transition-colors cursor-pointer"
                        disabled={loading}
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Camera
                      </button>
                      <span className="w-px h-3 bg-gray-300" aria-hidden />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-dark hover:text-secondary transition-colors cursor-pointer"
                        disabled={loading}
                      >
                        <ImagePlus className="w-3.5 h-3.5" />
                        Gallery
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="self-start p-1.5 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 text-gray-500 rounded-lg transition-colors cursor-pointer"
                    disabled={loading}
                    aria-label="Remove photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ===== MESSAGES ===== */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}
          {success && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-sm"
            >
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{success}</span>
            </div>
          )}

          {/* ===== SUBMIT CTA ===== */}
          <button
            onClick={handleSubmitOrder}
            disabled={!canSubmit || loading}
            className={`w-full h-14 px-6 text-base font-bold text-white rounded-2xl flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98] ${
              canSubmit && !loading
                ? 'bg-gradient-to-r from-primary to-primary-dark hover:from-primary-dark hover:to-primary shadow-xl shadow-primary/30 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating order...</span>
              </>
            ) : (
              <>
                <span>Submit Order</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* trust footnote */}
          <p className="text-center text-xs text-gray-500 flex items-center justify-center gap-1.5 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Secure delivery — your data is encrypted</span>
          </p>
        </div>
      ) : (
      /* ============= SHEET VARIANT (unchanged) ============= */
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] z-10">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Scrollable Form */}
        <div className="px-4 pb-4 space-y-4 max-h-[60vh] overflow-y-auto">

          {/* === PICKUP SECTION === */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-100">
                <MapPin className="w-4 h-4 text-blue-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Pickup Details</h3>
            </div>

            <div className="space-y-2">
              <AddressInput
                value={pickup.address}
                onChange={(address, lat, lng) => {
                  onPickupChange('address', address);
                  onPickupChange('latitude', lat);
                  onPickupChange('longitude', lng);
                }}
                onMapClick={() => setMapPickerOpen('pickup')}
                placeholder="Pickup location"
                icon="pickup"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="tel"
                    value={pickup.phone}
                    onChange={(e) => onPickupChange('phone', e.target.value)}
                    onBlur={() => onPhoneBlur(pickup.phone)}
                    placeholder="Phone"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  {isCheckingPhone && (
                    <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-primary" />
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={pickup.name}
                    onChange={(e) => onPickupChange('name', e.target.value)}
                    placeholder="Name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <ArrowRight className="w-4 h-4 text-gray-300" />
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* === DROPOFF SECTION === */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-amber-100">
                <MapPin className="w-4 h-4 text-amber-500" />
              </div>
              <h3 className="text-sm font-semibold text-gray-700">Dropoff Details</h3>
            </div>

            <div className="space-y-2">
              <AddressInput
                value={dropoff.address}
                onChange={(address, lat, lng) => {
                  onDropoffChange('address', address);
                  onDropoffChange('latitude', lat);
                  onDropoffChange('longitude', lng);
                }}
                onMapClick={() => setMapPickerOpen('dropoff')}
                placeholder="Dropoff location"
                icon="dropoff"
              />

              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="tel"
                    value={dropoff.phone}
                    onChange={(e) => onDropoffChange('phone', e.target.value)}
                    placeholder="Phone"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                  <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={dropoff.name}
                    onChange={(e) => onDropoffChange('name', e.target.value)}
                    placeholder="Name"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                    disabled={loading}
                  />
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Package Details */}
          {/* Package Details & Camera */}
          <div className="space-y-2">
            <div className="relative">
              <input
                type="text"
                value={packageDetails}
                onChange={(e) => setPackageDetails(e.target.value)}
                placeholder="Package details (optional)"
                className="w-full pl-11 pr-12 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
                disabled={loading}
              />
              <Package className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
              
              {/* Hidden file input */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                ref={fileInputRef}
                className="hidden"
                onChange={handleImageSelect}
              />
              
              {/* Camera Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute right-3 top-2.5 p-1.5 bg-gray-200 rounded-lg hover:bg-gray-300 text-gray-600 transition-colors"
                title="Take photo of package"
                disabled={loading}
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Image Preview */}
            {imagePreview && (
              <div className="relative inline-block mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={imagePreview} 
                  alt="Package preview" 
                  className="h-20 w-auto rounded-lg border border-gray-200 object-cover shadow-sm"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition-colors"
                  disabled={loading}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          {/* --- OTP Section (hidden for now, will activate later) --- */}
          {/* {phase !== 'form' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-blue-800">Verify your phone number</p>
              </div>
              <p className="text-xs text-blue-600">Enter the 6-digit code sent to {normalizedPhone}</p>
              <input type="text" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" maxLength={6} className="w-full px-4 py-3 border border-blue-300 rounded-xl text-lg text-center tracking-widest bg-white" disabled={loading} autoFocus />
              <button type="button" onClick={handleResendOTP} className="text-xs text-blue-600 hover:text-blue-800 underline" disabled={loading}>Resend code</button>
            </div>
          )} */}
        </div>

        {/* Messages */}
        {(error || success) && (
          <div className="px-4 pb-2">
            {error && (
              <div className="p-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                {success}
              </div>
            )}
          </div>
        )}

        {/* CTA Button - Submit Order directly */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleSubmitOrder}
            disabled={!canSubmit || loading}
            className={`w-full py-4 text-base font-bold text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              canSubmit
                ? 'bg-primary shadow-lg shadow-primary/30'
                : 'bg-gray-300'
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Creating order...</span>
              </>
            ) : (
              <>
                <span>Submit Order</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* --- OTP verify button (hidden for now) --- */}
          {/* {phase !== 'form' && (
            <button onClick={handleVerifyOTP} disabled={otpCode.length !== 6 || loading} className="...">
              Verify & Create Order
            </button>
          )} */}
        </div>
      </div>
      )}

      {/* Live Camera Capture Modal */}
      <CameraCapture
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Fullscreen Map Picker */}
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
        title={mapPickerOpen === 'pickup' ? 'Select Pickup Location' : 'Select Dropoff Location'}
      />
    </>
  );
}
