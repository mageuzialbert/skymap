'use client';

import Link from 'next/link';
import { Info, Phone, MessageCircle, LogIn, UserPlus } from 'lucide-react';
import HeroMedia from '@/components/landing/HeroMedia';
import { useT } from '@/lib/i18n';

const SKYMAP_PHONE = '+255687371544';
const SKYMAP_WHATSAPP = '255687371544'; // wa.me format: digits only, no '+'

export default function Home() {
  const t = useT();

  return (
    <>
      <main className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-br from-primary/10 via-white to-primary/5">
        {/* Header - solid top bar */}
        <div className="relative z-30 shrink-0 p-3 flex items-center justify-between bg-white shadow-sm">
          {/* Logo */}
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-gray-900 drop-shadow-sm">{t('common.appName')}</span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/about"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">{t('landing.aboutUs')}</span>
            </Link>
          </div>
        </div>

        {/* Hero media (video by default, slideshow + voice fallback) */}
        <div className="relative flex-1 min-h-0 z-0">
          <HeroMedia height="fill" />
        </div>

        {/* Bottom CTA dock — Login / Register (auth required to use the platform) */}
        <div className="relative z-20 shrink-0 p-3 pb-5">
          <div className="space-y-2.5 max-w-2xl mx-auto">
            <div className="grid grid-cols-2 gap-2.5">
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 py-4 bg-primary text-white text-base font-bold rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform"
              >
                <LogIn className="w-5 h-5" />
                <span>{t('common.login')}</span>
              </Link>
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 py-4 bg-white border-2 border-primary text-primary text-base font-bold rounded-2xl active:scale-[0.98] transition-transform shadow-sm"
              >
                <UserPlus className="w-5 h-5" />
                <span>{t('common.register')}</span>
              </Link>
            </div>

            {/* Contact CTAs */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={`tel:${SKYMAP_PHONE}`}
                className="flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-2xl transition-colors hover:bg-gray-50 active:scale-[0.98] shadow-sm"
              >
                <Phone className="w-5 h-5" />
                <span>{t('landing.call')}</span>
              </a>
              <a
                href={`https://wa.me/${SKYMAP_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-2xl transition-colors active:scale-[0.98] shadow-sm"
              >
                <MessageCircle className="w-5 h-5" />
                <span>{t('landing.whatsapp')}</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
