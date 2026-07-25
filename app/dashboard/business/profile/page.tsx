'use client';

import { useEffect, useState } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { supabase } from '@/lib/supabase';
import { resetPassword } from '@/lib/auth';
import { Save, Loader2, Upload, X, Lock, AlertCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import LocationPicker from '@/components/common/LocationPicker';

interface BusinessProfile {
  name: string;
  phone: string;
  email: string;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  district_id: number | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Region {
  id: number;
  name: string;
}

interface District {
  id: number;
  name: string;
  region_id: number;
}

export default function BusinessProfilePage() {
  const t = useT();
  const [profile, setProfile] = useState<BusinessProfile>({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postal_code: '',
    district_id: null,
    logo_url: null,
    latitude: null,
    longitude: null,
  });
  const [regions, setRegions] = useState<Region[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places'],
  });

  useEffect(() => {
    loadProfile();
    loadRegions();
  }, []);

  // Load districts when region is selected
  useEffect(() => {
    if (selectedRegionId) {
      loadDistricts(selectedRegionId);
    } else {
      setDistricts([]);
    }
  }, [selectedRegionId]);

  async function loadProfile() {
    try {
      // First check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setError(t('business.profile.msg.sessionError'));
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.error('No active session');
        setError(t('business.profile.msg.noSession'));
        setLoading(false);
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        setError(t('business.profile.msg.authError'));
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.error('No user found');
        setError(t('business.profile.msg.userNotFound'));
        setLoading(false);
        return;
      }

      // Get business data
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (businessError) {
        console.error('Error fetching business:', businessError);
        // Don't throw - continue to load user data
      } else if (business) {
        // Store business ID for later use
        setBusinessId(business.id);
      }

      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        // Continue with what we have
      }

      // Get phone from multiple sources with fallbacks
      let phoneNumber = '';
      
      // Try users table first
      if (userData?.phone) {
        phoneNumber = userData.phone;
      }
      // Fallback to businesses table
      else if (business?.phone) {
        phoneNumber = business.phone;
      }
      // Fallback to user metadata
      else if (user.user_metadata?.phone) {
        phoneNumber = user.user_metadata.phone;
      }

      // Get email with fallbacks
      const emailAddress = userData?.email || user.email || '';

      // Get name with fallbacks
      const businessName = business?.name || userData?.name || user.user_metadata?.business_name || '';

      // Get address fields from business (these should be populated if they exist)
      const address = business?.address ?? '';
      const city = business?.city ?? '';
      const postalCode = business?.postal_code ?? '';
      const districtId = business?.district_id ?? null;
      const logoUrl = business?.logo_url ?? null;
      const latitude = business?.latitude ?? null;
      const longitude = business?.longitude ?? null;

      console.log('Loading profile - Business data:', {
        hasBusiness: !!business,
        address,
        city,
        postalCode,
        districtId,
        latitude,
        longitude,
      });

      setProfile({
        name: businessName,
        phone: phoneNumber,
        email: emailAddress,
        address: address,
        city: city,
        postal_code: postalCode,
        district_id: districtId,
        logo_url: logoUrl,
        latitude: latitude,
        longitude: longitude,
      });

      // Load districts for the region if district_id exists
      if (business?.district_id) {
        // Get district to find region_id
        const { data: district } = await supabase
          .from('districts')
          .select('region_id')
          .eq('id', business.district_id)
          .single();

        if (district) {
          // Set the selected region so the dropdown shows the correct value
          setSelectedRegionId(district.region_id);
          // Load districts for that region
          loadDistricts(district.region_id);
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      // Try to get at least basic info from auth user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Set minimal profile data
          setProfile({
            name: user.user_metadata?.business_name || '',
            phone: user.user_metadata?.phone || '',
            email: user.email || '',
            address: '',
            city: '',
            postal_code: '',
            district_id: null,
            logo_url: null,
            latitude: null,
            longitude: null,
          });
        } else {
          setError(t('business.profile.msg.loadFailed'));
        }
      } catch (authErr) {
        console.error('Error getting auth user in catch:', authErr);
        setError('Failed to load profile. Please try refreshing the page.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadRegions() {
    try {
      const response = await fetch('/api/regions');
      const data = await response.json();
      setRegions(data);
    } catch (err) {
      console.error('Error loading regions:', err);
    }
  }

  async function loadDistricts(regionId: number) {
    try {
      const response = await fetch(`/api/districts?region_id=${regionId}`);
      const data = await response.json();
      setDistricts(data);
    } catch (err) {
      console.error('Error loading districts:', err);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error(t('business.profile.msg.notAuthenticated'));

      // Use stored business ID, or query if not available
      let businessIdToUse = businessId;
      
      if (!businessIdToUse) {
        // Fallback: query for business ID
        const { data: business, error: businessQueryError } = await supabase
          .from('businesses')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (businessQueryError) {
          console.error('Error querying business:', businessQueryError);
          // Check if it's a "not found" error (PGRST116)
          if (businessQueryError.code === 'PGRST116' || businessQueryError.message?.includes('No rows')) {
            throw new Error(t('business.profile.msg.businessNotFound'));
          }
          throw new Error(`Failed to find business: ${businessQueryError.message}`);
        }

        if (!business) {
          throw new Error(t('business.profile.msg.businessNotFound'));
        }

        businessIdToUse = business.id;
        setBusinessId(business.id); // Store it for next time
      }

      // Update business
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          name: profile.name,
          address: profile.address || null,
          city: profile.city || null,
          postal_code: profile.postal_code || null,
          district_id: profile.district_id || null,
          latitude: profile.latitude,
          longitude: profile.longitude,
        })
        .eq('id', businessIdToUse);

      if (businessError) throw businessError;

      // Update user name
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: profile.name,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      setSuccess(t('business.profile.msg.profileUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('business.profile.msg.updateFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/businesses/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('business.profile.msg.uploadFailed'));
      }

      const data = await response.json();
      setProfile({ ...profile, logo_url: data.url });
      setSuccess(t('business.profile.msg.logoUploaded'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('business.profile.msg.uploadFailed'));
    } finally {
      setUploadingLogo(false);
      e.target.value = ''; // Reset input
    }
  }

  async function removeLogo() {
    if (!businessId) return;
    
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error } = await supabase
        .from('businesses')
        .update({ logo_url: null })
        .eq('id', businessId);
      
      if (error) throw error;
      
      setProfile({ ...profile, logo_url: null });
      setSuccess(t('business.profile.msg.logoRemoved'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('business.profile.msg.removeFailed'));
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    setResettingPassword(true);

    try {
      await resetPassword(newPassword, confirmPassword);
      setPasswordSuccess(t('business.profile.msg.passwordUpdated'));
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccess(''), 3000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : t('business.profile.msg.resetFailed'));
    } finally {
      setResettingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('business.profile.title')}</h1>
        <p className="text-gray-600 mt-2">
          {t('business.profile.subtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-md p-6 space-y-6">
        {/* Business Logo */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('business.profile.businessLogo')}</h2>
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('business.profile.logoImage')}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingLogo ? t('business.profile.uploading') : t('business.profile.uploadLogo')}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo || saving}
                    className="hidden"
                  />
                </label>
                {profile.logo_url && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    disabled={saving}
                    className="text-red-600 hover:text-red-800 text-sm disabled:opacity-50"
                  >
                    {t('business.profile.remove')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('business.profile.logoHint')}
              </p>
            </div>
            {profile.logo_url && (
              <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={profile.logo_url}
                    alt={t('business.profile.logoAlt')}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('business.profile.businessInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.businessName')}
              </label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.phoneNumber')}
              </label>
              <input
                type="tel"
                value={profile.phone}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('business.profile.phoneHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.emailAddress')}
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('business.profile.emailHint')}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('business.profile.addressInfo')}</h2>

          {loadError && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              <span>{t('business.profile.mapsLoadError')}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              {isLoaded ? (
                <LocationPicker
                  label={t('business.profile.businessAddress')}
                  value={profile.address || ''}
                  onChange={(address, lat, lng) => setProfile({ 
                    ...profile, 
                    address, 
                    latitude: lat, 
                    longitude: lng 
                  })}
                  defaultLocation={profile.latitude && profile.longitude ? { lat: profile.latitude, lng: profile.longitude } : undefined}
                />
              ) : loadError ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('business.profile.businessAddress')}
                  </label>
                  <input
                    type="text"
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder={t('business.profile.streetAddress')}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-gray-500 text-sm">{t('business.profile.loadingMaps')}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.city')}
              </label>
              <input
                type="text"
                value={profile.city || ''}
                onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('business.profile.city')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.postalCode')}
              </label>
              <input
                type="text"
                value={profile.postal_code || ''}
                onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('business.profile.postalCode')}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.region')}
              </label>
              <select
                value={selectedRegionId || ''}
                onChange={(e) => {
                  const regionId = e.target.value;
                  if (regionId) {
                    setSelectedRegionId(parseInt(regionId));
                    setProfile({ ...profile, district_id: null }); // Reset district when region changes
                  } else {
                    setSelectedRegionId(null);
                    setDistricts([]);
                    setProfile({ ...profile, district_id: null });
                  }
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">{t('business.profile.selectRegion')}</option>
                {regions.map(region => (
                  <option key={region.id} value={region.id}>
                    {region.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.district')}
              </label>
              <select
                value={profile.district_id || ''}
                onChange={(e) => setProfile({ ...profile, district_id: e.target.value ? parseInt(e.target.value) : null })}
                disabled={!selectedRegionId || districts.length === 0}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">{t('business.profile.selectDistrict')}</option>
                {districts.map(district => (
                  <option key={district.id} value={district.id}>
                    {district.name}
                  </option>
                ))}
              </select>
              {!selectedRegionId && (
                <p className="text-xs text-gray-500 mt-1">
                  {t('business.profile.selectRegionFirst')}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>{t('business.profile.saveChanges')}</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Password Reset Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {t('business.profile.passwordSettings')}
          </h2>
          <p className="text-gray-600 mt-1 text-sm">
            {t('business.profile.passwordDesc')}
          </p>
        </div>

        {passwordError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.newPassword')}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('business.profile.enterNewPassword')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('business.profile.passwordHint')}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.profile.confirmPasswordLabel')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('business.profile.confirmNewPassword')}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={resettingPassword || !newPassword || !confirmPassword}
              className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
            >
              {resettingPassword ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{t('business.profile.updating')}</span>
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  <span>{t('business.profile.updatePassword')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
