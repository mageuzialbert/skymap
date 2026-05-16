'use client';

import { useState, useRef, useEffect } from 'react';
import HeroSlider from '@/components/landing/HeroSlider';
import SlideMenu from '@/components/landing/SlideMenu';
import Link from 'next/link';
import { Menu, Volume2, VolumeX, Phone, MessageCircle, Package, ArrowRight } from 'lucide-react';

const SKYMAP_PHONE = '+255687371544';
const SKYMAP_WHATSAPP = '255687371544'; // wa.me format: digits only, no '+'

export default function Home() {
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

    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
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

  return (
    <>
      {/* Slide Menu */}
      <SlideMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="fixed inset-0 overflow-hidden bg-gradient-to-br from-primary/10 via-white to-primary/5">
        {/* Header - Minimal */}
        <div className="absolute top-0 left-0 right-0 z-20 p-3 flex items-center justify-between pointer-events-none">
          {/* Menu Button */}
          <button
            onClick={() => setMenuOpen(true)}
            className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg active:scale-95 transition-transform"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-gray-700" />
          </button>

          {/* Logo - Centered */}
          <div className="pointer-events-auto flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-gray-900 drop-shadow-sm">The Skymap</span>
          </div>

          {/* Audio Play/Pause Button */}
          <button
            onClick={handleToggleAudio}
            className="pointer-events-auto p-2.5 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg active:scale-95 transition-transform"
            title={isPlaying ? 'Pause audio' : 'Play audio'}
            aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          >
            {isPlaying ? (
              <Volume2 className="w-6 h-6 text-primary" />
            ) : (
              <VolumeX className="w-6 h-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Hero Slider - Starts below the top bar, extends to the bottom (behind the CTA overlay) */}
        <div className="absolute inset-x-0 top-16 bottom-0 z-0">
          <HeroSlider height="fill" />
        </div>

        {/* Subtle dark fade at the bottom for CTA legibility over any slider image */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-64 z-10 bg-gradient-to-t from-black/70 via-black/30 to-transparent"
        />

        {/* Bottom CTA - Glass overlay on slider */}
        <div className="absolute bottom-0 left-0 right-0 z-20 p-3 pb-5">
          <div className="space-y-2.5 max-w-2xl mx-auto">
            {/* Primary CTA: Order Delivery */}
            <Link
              href="/order"
              className="flex items-center justify-center gap-2 w-full py-4 bg-primary text-white text-base font-bold rounded-2xl shadow-xl shadow-black/30 active:scale-[0.98] transition-transform"
            >
              <Package className="w-5 h-5" />
              <span>Order Delivery</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            {/* Contact CTAs - glassmorphism */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={`tel:${SKYMAP_PHONE}`}
                className="flex items-center justify-center gap-2 py-3 bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/30 text-white font-semibold rounded-2xl transition-colors active:scale-[0.98] shadow-lg shadow-black/20"
              >
                <Phone className="w-5 h-5" />
                <span>Call</span>
              </a>
              <a
                href={`https://wa.me/${SKYMAP_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-green-500/30 hover:bg-green-500/50 backdrop-blur-md border border-white/30 text-white font-semibold rounded-2xl transition-colors active:scale-[0.98] shadow-lg shadow-black/20"
              >
                <MessageCircle className="w-5 h-5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>
        </div>

        {/* Background Audio (loops until paused) — hosted on Supabase Storage */}
        <audio
          ref={audioRef}
          src="https://ergemtnsxdvbboyjxdyy.supabase.co/storage/v1/object/public/assets/audio/skymap-audio.mp3"
          preload="auto"
          loop
        />
      </main>
    </>
  );
}
