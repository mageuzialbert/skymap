'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Send, Package, UserRound, Clock } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { getDashboardPathForCurrentUser } from '@/lib/auth';
import { SERVICE_TYPES } from '@/lib/serviceTypes';
import { useT } from '@/lib/i18n';

// Map the serviceTypes icon names to their Lucide components (same pattern the
// About page uses). Keeps lib/serviceTypes.ts free of JSX imports.
const SERVICE_ICONS = {
  Send,
  Package,
  UserRound,
  Clock,
  ShoppingBag: Package,
} as const;

// Relevant self-hosted photos per service (see scripts/gen-service-images.js).
// A tile with no entry here falls back to its Lucide icon.
const SERVICE_IMAGES: Record<string, string> = {
  errand: '/services/errand.webp',
  delivery: '/services/delivery.webp',
  ride: '/services/ride.webp',
  hire: '/services/hire.webp',
};

export default function Home() {
  const t = useT();
  const router = useRouter();

  // Persistent auto-login: if a session already exists on this device/browser
  // (including an installed PWA), skip the landing page and go straight to the
  // user's dashboard.
  useEffect(() => {
    let active = true;
    getDashboardPathForCurrentUser()
      .then((path) => {
        if (active && path) router.replace(path);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="fixed inset-0 flex flex-col overflow-hidden bg-gradient-to-br from-primary/10 via-white to-primary/5">
      {/* Header - solid top bar */}
      <div className="relative z-30 shrink-0 p-3 flex items-center justify-between bg-white shadow-sm">
        {/* Logo (cropped mark + wordmark, same asset as the login page) */}
        <Image
          src="/logo-cropped.webp"
          alt="The Skymap"
          width={686}
          height={339}
          priority
          className="h-10 w-auto object-contain sm:h-12"
        />

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Link
            href="/about"
            className="px-3 py-1.5 rounded-full text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {t('landing.aboutUs')}
          </Link>
        </div>

        {/* Faded brand-gradient separator under the header (app-header accent) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-primary via-primary-light to-secondary" />
      </div>

      {/* Hero - delivery-rider background with a legible headline overlay.
          The teal gradient is the always-present base; the photo layers over it
          (object-cover), then a scrim keeps the headline readable. */}
      <div className="relative z-0 min-h-0 flex-1 bg-gradient-to-br from-primary via-primary-dark to-primary">
        <Image
          src="/hero/rider.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Legibility scrim */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/25 to-black/40" />

        {/* Headline / tagline overlay (top, centered) */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10">
          <div className="px-4 pt-8 pb-20 text-center sm:pt-12">
            <h1 className="font-display text-2xl font-extrabold leading-tight text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)] sm:text-4xl md:text-5xl">
              {t('landing.heroTitle')}
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-medium text-white/90 drop-shadow-[0_1px_8px_rgba(0,0,0,0.7)] sm:mt-3 sm:text-lg">
              {t('common.tagline')}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom dock - an app-style bottom sheet that "waves" up into the hero
          photo, separated by a gradient fade + wavy SVG divider. */}
      <div className="relative z-20 -mt-6 shrink-0 bg-gradient-to-b from-white to-primary/5 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.12)]">
        {/* Wavy divider + gradient fade, sitting directly above the sheet */}
        <div className="pointer-events-none absolute inset-x-0 bottom-full" aria-hidden="true">
          <div className="h-10 w-full bg-gradient-to-t from-white/70 to-transparent" />
          <svg
            className="-mb-px block h-11 w-full"
            viewBox="0 0 1440 100"
            preserveAspectRatio="none"
          >
            <path
              fill="#ffffff"
              d="M0,62 C240,8 480,8 720,44 C960,80 1200,80 1440,34 L1440,100 L0,100 Z"
            />
          </svg>
        </div>

        {/* Drag handle (bottom-sheet affordance) */}
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300" />

        <div className="mx-auto w-full max-w-2xl">
          {/* Services showcase */}
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
            {t('landing.servicesTitle')}
          </p>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {SERVICE_TYPES.map((s) => {
              const Icon = SERVICE_ICONS[s.icon as keyof typeof SERVICE_ICONS] ?? Package;
              return (
                <div
                  key={s.key}
                  className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-100 bg-gray-50/80 px-1 py-2.5 text-center sm:py-3"
                >
                  {SERVICE_IMAGES[s.key] ? (
                    <Image
                      src={SERVICE_IMAGES[s.key]}
                      alt=""
                      width={112}
                      height={112}
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-black/5 sm:h-14 sm:w-14"
                    />
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary sm:h-11 sm:w-11">
                      <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </span>
                  )}
                  <span className="text-[10px] font-medium leading-tight text-gray-700 sm:text-xs">
                    {t(s.labelKey)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* CTAs */}
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-base font-bold text-white shadow-lg shadow-primary/30 transition-transform active:scale-[0.98]"
            >
              <span>{t('common.register')}</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-full border-2 border-primary bg-white py-3.5 text-base font-bold text-primary transition-colors hover:bg-primary/5 active:scale-[0.98]"
            >
              <Send className="h-5 w-5" />
              <span>{t('landing.request')}</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
