'use client';

import { useState, useEffect } from 'react';
import RequestRideWizard from '@/components/client/RequestRideWizard';
import { supabase } from '@/lib/supabase';
import type { BusinessProfile } from '@/lib/wizard/steps';



/**
 * Loads the signed-in business and passes its profile to the wizard. All request state lives in the wizard's reducer - keeping the
 * addresses up here meant a service switch could not reset them, which is how
 * a destination picked for a ride ended up on a vehicle hire.
 */
export default function RequestRidePage() {

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


  return (
    <div className="w-full">
      <RequestRideWizard profile={profile} />
    </div>
  );
}
