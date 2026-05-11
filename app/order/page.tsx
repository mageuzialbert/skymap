'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLoadScript } from '@react-google-maps/api';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import OrderPanel from '@/components/landing/OrderPanel';
import { LocationState } from '@/components/landing/types';

const libraries: ('places' | 'geometry' | 'drawing' | 'visualization')[] = ['places'];

const SKYMAP_PHONE = '+255687371544';
const SKYMAP_NAME = 'The Skymap';

const initialPickup: LocationState = {
  address: '',
  latitude: null,
  longitude: null,
  name: SKYMAP_NAME,
  phone: SKYMAP_PHONE,
};

const initialDropoff: LocationState = {
  address: '',
  latitude: null,
  longitude: null,
  name: '',
  phone: '',
};

export default function OrderPage() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [pickup, setPickup] = useState<LocationState>(initialPickup);
  const [dropoff, setDropoff] = useState<LocationState>(initialDropoff);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);

  const handlePickupChange = (field: keyof LocationState, value: any) => {
    setPickup(prev => ({ ...prev, [field]: value }));
  };

  const handleDropoffChange = (field: keyof LocationState, value: any) => {
    setDropoff(prev => ({ ...prev, [field]: value }));
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

  if (!apiKey || loadError) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white rounded-2xl shadow p-6 max-w-md w-full text-center">
          <p className="text-amber-700 mb-4">
            Google Maps is not configured. Address selection requires it.
          </p>
          <Link href="/" className="text-primary hover:underline">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-primary/5 pb-16 overflow-hidden">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -right-24 w-80 h-80 rounded-full bg-primary/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 -left-32 w-72 h-72 rounded-full bg-secondary/10 blur-3xl"
      />

      {/* Sticky glass header */}
      <header className="sticky top-0 z-30 bg-white/75 backdrop-blur-xl border-b border-gray-200/60">
        <div className="flex items-center gap-3 px-3 sm:px-4 py-3 max-w-5xl mx-auto">
          <Link
            href="/"
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 active:scale-95 transition-transform cursor-pointer"
            aria-label="Back to home"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-gray-900 leading-tight truncate">New Delivery</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">Pickup → Dropoff</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast & Reliable</span>
          </div>
        </div>
      </header>

      {/* Hero strip */}
      <section className="relative max-w-5xl mx-auto px-3 sm:px-4 pt-6 pb-5">
        <div className="flex items-start gap-3">
          <div className="hidden sm:block w-1 self-stretch rounded-full bg-gradient-to-b from-primary via-primary-light to-secondary" />
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 leading-tight">
              Schedule your delivery
            </h2>
            <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">
              Tell us where to pick up and drop off — we&apos;ll handle the rest.
            </p>
          </div>
        </div>
      </section>

      {/* Form */}
      <div className="relative max-w-5xl mx-auto px-3 sm:px-4">
        <OrderPanel
          variant="page"
          pickup={pickup}
          dropoff={dropoff}
          onPickupChange={handlePickupChange}
          onDropoffChange={handleDropoffChange}
          onPhoneBlur={handlePhoneBlur}
          isCheckingPhone={isCheckingPhone}
        />
      </div>
    </main>
  );
}
