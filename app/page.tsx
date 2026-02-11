'use client';

import { useState, useRef, useEffect } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import LandingMap from '@/components/landing/LandingMap';
import OrderPanel from '@/components/landing/OrderPanel';
import HeroSlider from '@/components/landing/HeroSlider';
import SlideMenu from '@/components/landing/SlideMenu';
import Link from 'next/link';
import { LocationState } from '@/components/landing/types';
import { Loader2, Menu, Video, VolumeX } from 'lucide-react';

const libraries: ("places" | "geometry" | "drawing" | "visualization")[] = ['places'];

const initialLocation: LocationState = {
  address: '',
  latitude: null,
  longitude: null,
  name: '',
  phone: '',
};

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [pickup, setPickup] = useState<LocationState>(initialLocation);
  const [dropoff, setDropoff] = useState<LocationState>(initialLocation);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Autoplay audio on mount — if browser blocks, start on first user interaction
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tryPlay = () => {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    // Try immediate autoplay
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Browser blocked autoplay — start on first user interaction
      setIsPlaying(false);
      const startOnInteraction = () => {
        tryPlay();
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('touchstart', startOnInteraction);
      };
      document.addEventListener('click', startOnInteraction);
      document.addEventListener('touchstart', startOnInteraction);

      return () => {
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('touchstart', startOnInteraction);
      };
    });
  }, []);

  const handleToggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setIsPlaying(true));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

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

  // Fallback without maps
  if (!apiKey || loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary-dark p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="The Skaymap" className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">The Skaymap</h1>
          <p className="text-gray-600 mb-6">Fast, Reliable Delivery</p>
          
          {!apiKey && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-sm mb-4">
              Google Maps API key not configured.
            </div>
          )}
          
          <Link 
            href="/quick-order" 
            className="block w-full bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary-dark transition-colors"
          >
            Order Delivery
          </Link>
          <div className="mt-4 flex gap-4 justify-center">
            <Link href="/login" className="text-primary hover:underline">Login</Link>
            <Link href="/register" className="text-primary hover:underline">Register</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      {/* Slide Menu */}
      <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="fixed inset-0 overflow-hidden bg-gray-100">
        {/* Header - Minimal */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between pointer-events-none">
          {/* Menu Button */}
          <button 
            onClick={() => setMenuOpen(true)}
            className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg active:scale-95 transition-transform"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Logo - Centered */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon.svg" alt="The Skaymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-white drop-shadow-lg">The Skaymap</span>
          </div>

          {/* Audio Play/Pause Button */}
          <button
            onClick={handleToggleAudio}
            className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg active:scale-95 transition-transform"
            title={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <Video className="w-6 h-6 text-primary" />
            ) : (
              <VolumeX className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Promotions Slider - Prominent */}
        <div className="absolute top-16 left-3 right-3 z-10">
          <HeroSlider height="tall" />
        </div>

        {/* Map Background */}
        <LandingMap pickup={pickup} dropoff={dropoff} />

        {/* Floating Order Panel */}
        <OrderPanel 
          pickup={pickup}
          dropoff={dropoff}
          onPickupChange={handlePickupChange}
          onDropoffChange={handleDropoffChange}
          onPhoneBlur={handlePhoneBlur}
          isCheckingPhone={isCheckingPhone}
        />
        {/* Background Audio (loops until paused) — hosted on Supabase Storage */}
        <audio ref={audioRef} src="https://ergemtnsxdvbboyjxdyy.supabase.co/storage/v1/object/public/assets/audio/skymap-audio.mp3" preload="auto" loop />
      </main>
    </>
  );
}
