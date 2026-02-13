'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadScript } from '@react-google-maps/api';
import PhoneVerification from '@/components/quick-order/PhoneVerification';
import DeliveryForm, { DeliveryFormData } from '@/components/quick-order/DeliveryForm';
import OrderProgress from '@/components/quick-order/OrderProgress';
import LocationPicker from '@/components/common/LocationPicker';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

type Step = 'phone' | 'delivery' | 'complete';

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region_id: number;
}

export default function QuickOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);
  
  // Location data
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLatitude, setBusinessLatitude] = useState<number | null>(null);
  const [businessLongitude, setBusinessLongitude] = useState<number | null>(null);

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  // Load regions on mount
  useEffect(() => {
    const loadRegions = async () => {
      try {
        const response = await fetch('/api/regions');
        if (response.ok) {
          const data = await response.json();
          setRegions(data);
        }
      } catch (err) {
        console.error('Error loading regions:', err);
      }
    };
    loadRegions();

    // Check for autoload data from landing page
    const params = new URLSearchParams(window.location.search);
    if (params.get('autoload') === 'true') {
      try {
        const storedOrder = localStorage.getItem('the_skaymap_temp_order');
        if (storedOrder) {
          const { pickup } = JSON.parse(storedOrder);
          if (pickup?.phone) {
            setPhone(pickup.phone);
            // Optionally trigger submit if we trust the phone
            // But better to let user confirm
          }
        }
      } catch (e) {
        console.error('Error loading stored order:', e);
      }
    }
  }, []);

  // Load districts when region changes
  useEffect(() => {
    const loadDistricts = async () => {
      if (!selectedRegionId) {
        setDistricts([]);
        setSelectedDistrictId(null);
        return;
      }
      
      setLoadingLocations(true);
      try {
        const response = await fetch(`/api/districts?region_id=${selectedRegionId}`);
        if (response.ok) {
          const data = await response.json();
          setDistricts(data);
        }
      } catch (err) {
        console.error('Error loading districts:', err);
      } finally {
        setLoadingLocations(false);
      }
    };
    loadDistricts();
  }, [selectedRegionId]);

  const handlePhoneSubmit = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Normalize phone
      let phoneNumber = phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
      } else {
        phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
      }

      // Check if phone exists
      const checkResponse = await fetch('/api/deliveries/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const checkData = await checkResponse.json();

      if (!checkResponse.ok) {
        throw new Error(checkData.error || 'Failed to check phone');
      }

      setIsNewUser(!checkData.exists);
      if (checkData.exists && checkData.businessId) {
        setBusinessId(checkData.businessId);
        setUserId(checkData.userId);
      }

      // Send OTP
      const otpResponse = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const otpData = await otpResponse.json();

      if (!otpResponse.ok) {
        throw new Error(otpData.error || 'Failed to send OTP');
      }

      setPhone(phoneNumber);
      setOtpSent(true);
      setSuccess('Verification code sent! Please check your phone.');
      
      // Show debug OTP in development
      if (otpData.debugOtp) {
        setSuccess(`Verification code sent! (Dev mode - Code: ${otpData.debugOtp})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerify = async (code: string) => {
    // Validate business name for new users before verification
    if (isNewUser && !businessName.trim()) {
      setError('Please enter your business name to continue');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/quick-verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          code,
          businessName: isNewUser ? businessName.trim() : undefined,
          districtId: isNewUser ? selectedDistrictId : undefined,
          address: isNewUser ? businessAddress : undefined,
          latitude: isNewUser ? businessLatitude : undefined,
          longitude: isNewUser ? businessLongitude : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      // Set session tokens
      if (data.accessToken && data.refreshToken) {
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });

        if (sessionError) {
          console.error('Session error:', sessionError);
          throw new Error('Failed to create session');
        }

        // Wait a moment for session to be set
        await new Promise(resolve => setTimeout(resolve, 300));

        // Verify session was created by checking multiple times
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
      } else {
        throw new Error('No session tokens received');
      }

      setUserId(data.userId);
      setBusinessId(data.businessId);
      setStep('delivery');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverySubmit = async (formData: DeliveryFormData) => {
    if (!businessId || !userId) {
      setError('Missing user information. Please start over.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/deliveries/quick-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          userId,
          ...formData,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create delivery');
      }

      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create delivery');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStep = () => {
    if (step === 'phone') return 1;
    if (step === 'delivery') return 2;
    return 3;
  };

  // Check if verify button should be disabled for new users
  const canVerify = !isNewUser || (businessName.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold text-primary">The Skymap</span>
            </Link>
            <Link
              href="/"
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="bg-white rounded-lg shadow-md p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Quick Order Delivery
          </h1>
          <p className="text-gray-600 mb-8">
            Order a delivery quickly. We&apos;ll verify your phone and create your account if needed.
          </p>

          <OrderProgress currentStep={getCurrentStep()} />

          {step === 'phone' && (
            <div className="space-y-6">
              {/* Phone input section */}
              {!otpSent ? (
                <form onSubmit={(e) => { e.preventDefault(); handlePhoneSubmit(); }} className="space-y-4">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+255759561311"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                      disabled={loading}
                    />
                    <p className="mt-1 text-sm text-gray-500">
                      Enter your phone number to continue
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !phone}
                    className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending code...</span>
                      </>
                    ) : (
                      'Send Verification Code'
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* New User Registration Form - shown when OTP is sent for new users */}
                  {isNewUser && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800 mb-4">
                        This phone number is not registered. Please provide your business details to create an account.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="Enter your business name"
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>

                        {/* Business Address with Google Maps */}
                        <div>
                          {loadError && (
                            <div className="mb-2 p-2 bg-amber-50 border border-amber-200 text-amber-700 rounded text-xs flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>Maps unavailable. Enter address manually.</span>
                            </div>
                          )}
                          {isLoaded ? (
                            <LocationPicker
                              label="Business Address"
                              value={businessAddress}
                              onChange={(address, lat, lng) => {
                                setBusinessAddress(address);
                                setBusinessLatitude(lat);
                                setBusinessLongitude(lng);
                              }}
                            />
                          ) : loadError ? (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Business Address
                              </label>
                              <input
                                type="text"
                                value={businessAddress}
                                onChange={(e) => setBusinessAddress(e.target.value)}
                                placeholder="Enter your business address"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center p-3">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              <span className="ml-2 text-gray-500 text-sm">Loading maps...</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Region
                            </label>
                            <select
                              value={selectedRegionId || ''}
                              onChange={(e) => setSelectedRegionId(e.target.value ? Number(e.target.value) : null)}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            >
                              <option value="">Select region</option>
                              {regions.map((region) => (
                                <option key={region.id} value={region.id}>
                                  {region.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              District
                            </label>
                            <select
                              value={selectedDistrictId || ''}
                              onChange={(e) => setSelectedDistrictId(e.target.value ? Number(e.target.value) : null)}
                              disabled={!selectedRegionId || loadingLocations}
                              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                            >
                              <option value="">Select district</option>
                              {districts.map((district) => (
                                <option key={district.id} value={district.id}>
                                  {district.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* OTP Verification Form */}
                  <form onSubmit={(e) => { e.preventDefault(); handleOTPVerify(otpCode); }} className="space-y-4">
                    <div>
                      <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        id="otp"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="123456"
                        required
                        maxLength={6}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg text-center tracking-widest"
                        disabled={loading}
                      />
                      <p className="mt-1 text-sm text-gray-500">
                        Enter the 6-digit code sent to {phone}
                      </p>
                    </div>

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                        {error}
                      </div>
                    )}

                    {success && (
                      <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
                        {success}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otpCode.length !== 6 || !canVerify}
                      className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        'Verify Code'
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOtpCode('');
                        handlePhoneSubmit();
                      }}
                      className="w-full text-gray-600 hover:text-gray-900 text-sm"
                      disabled={loading}
                    >
                      Resend code
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {step === 'delivery' && (
            <DeliveryForm
              onSubmit={handleDeliverySubmit}
              loading={loading}
              error={error}
            />
          )}

          {step === 'complete' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Delivery Created Successfully!
              </h2>
              <p className="text-gray-600 mb-6">
                Your delivery request has been submitted. Our team will process it shortly.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => {
                    router.push('/dashboard/business/deliveries');
                    router.refresh();
                  }}
                  className="bg-primary text-white font-semibold px-6 py-3 rounded-lg hover:bg-primary-dark transition-colors"
                >
                  View My Deliveries
                </button>
                <Link
                  href="/"
                  className="bg-gray-200 text-gray-700 font-semibold px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
