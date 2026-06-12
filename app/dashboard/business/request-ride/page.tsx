'use client';

import { useState, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { Loader2, AlertCircle } from 'lucide-react';
import RequestRideWizard from '@/components/client/RequestRideWizard';
import { LocationState } from '@/components/landing/types';
import { supabase } from '@/lib/supabase';

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

const initialPickup: LocationState = {
  address: '',
  latitude: null,
  longitude: null,
  name: '',
  phone: '',
};

const initialDropoff: LocationState = {
  address: '',
  latitude: null,
  longitude: null,
  name: '',
  phone: '',
};

export default function RequestRidePage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [pickup, setPickup] = useState<LocationState>(initialPickup);
  const [dropoff, setDropoff] = useState<LocationState>(initialDropoff);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  // Prefill pickup with the authenticated client's own business details.
  useEffect(() => {
    let active = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !active) return;
      const { data: business } = await supabase
        .from('businesses')
        .select('name, phone, address')
        .eq('user_id', user.id)
        .single();
      if (business && active) {
        setPickup((prev) => ({
          ...prev,
          name: prev.name || business.name || '',
          phone: prev.phone || business.phone || '',
          address: prev.address || business.address || '',
        }));
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handlePickupChange = (field: keyof LocationState, value: any) => {
    setPickup((prev) => ({ ...prev, [field]: value }));
  };

  const handleDropoffChange = (field: keyof LocationState, value: any) => {
    setDropoff((prev) => ({ ...prev, [field]: value }));
  };

  const handlePhoneBlur = async (phone: string) => {
    if (!phone || phone.length < 10) return;
    setIsCheckingPhone(true);
    try {
      const response = await fetch('/api/deliveries/check-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.exists && data.name) {
          handlePickupChange('name', data.name);
        }
      }
    } catch (error) {
      console.error('Error checking phone:', error);
    } finally {
      setIsCheckingPhone(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Request</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose a service and tell us the details — we&apos;ll handle the rest.
        </p>
      </div>

      {!apiKey || loadError ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-3 text-amber-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p className="text-sm">
              Google Maps is not configured. Address selection requires it. Please contact support.
            </p>
          </div>
        </div>
      ) : !isLoaded ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 flex items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <RequestRideWizard
          pickup={pickup}
          dropoff={dropoff}
          onPickupChange={handlePickupChange}
          onDropoffChange={handleDropoffChange}
          onPhoneBlur={handlePhoneBlur}
          isCheckingPhone={isCheckingPhone}
        />
      )}
    </div>
  );
}
