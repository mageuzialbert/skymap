'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function VerificationBanner() {
  const [show, setShow] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(true);

  useEffect(() => {
    checkVerification();
  }, []);

  async function checkVerification() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('phone_verified')
        .eq('id', user.id)
        .single();

      if (userData && !userData.phone_verified) {
        setPhoneVerified(false);
        setShow(true);
      }
    } catch (err) {
      console.error('Error checking verification:', err);
    }
  }

  if (!show || phoneVerified) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <AlertTriangle className="h-5 w-5 text-yellow-400" />
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm text-yellow-700">
            <strong>Action Required:</strong> Your phone number is not verified. Please{' '}
            <Link href="/dashboard/business/verify" className="underline font-medium">
              verify your phone number
            </Link>{' '}
            to secure your account.
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setShow(false)}
            className="text-yellow-400 hover:text-yellow-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
