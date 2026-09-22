'use client';

import { useState, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { AlertCircle } from 'lucide-react';
import RequestRideWizard from '@/components/client/RequestRideWizard';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import type { BusinessProfile } from '@/lib/wizard/steps';
import { cardClass } from '@/lib/ui';
import { MAPS_API_KEY, MAPS_LIBRARIES } from '@/lib/maps';



/**
 * Loads Google Places and the signed-in business, then hands both to the
 * wizard. All request state lives in the wizard's reducer - keeping the
 * addresses up here meant a service switch could not reset them, which is how
 * a destination picked for a ride ended up on a vehicle hire.
 */
export default function RequestRidePage() {
  const t = useT();
  const apiKey = MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries: MAPS_LIBRARIES });

  const [profile, setProfile] = useState<BusinessProfile | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !alive) return;
      const { data: business } = await supabase
        .from('businesses')
        .select('name, phone, address')
        .eq('user_id', user.id)
        .single();
      if (business && alive) {
        setProfile({
          name: business.name || '',
          phone: business.phone || '',
          address: business.address || '',
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!apiKey || loadError) {
    return (
      <div className={`${cardClass} p-6`}>
        <div className="flex items-start gap-3 text-amber-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-[15px]">{t('business.requestRide.mapsNotConfigured')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <RequestRideWizard profile={profile} mapsLoading={!isLoaded} />
    </div>
  );
}
