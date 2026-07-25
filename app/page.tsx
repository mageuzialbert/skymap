'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import HeroMedia from '@/components/landing/HeroMedia';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { getDashboardPathForCurrentUser } from '@/lib/auth';
import { useT } from '@/lib/i18n';

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
            <LanguageSwitcher />
            <Link
              href="/about"
              className="px-3 py-1.5 rounded-lg text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              {t('landing.aboutUs')}
            </Link>
          </div>
        </div>

        {/* Hero media (video by default, slideshow + voice fallback) */}
        <div className="relative flex-1 min-h-0 z-0">
          <HeroMedia height="fill" />
        </div>

        {/* Bottom CTA dock - Login only (auth required to use the platform) */}
        <div className="relative z-20 shrink-0 p-3 pb-5">
          <div className="max-w-2xl mx-auto">
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 py-4 bg-primary text-white text-base font-bold rounded-2xl shadow-xl shadow-primary/30 active:scale-[0.98] transition-transform"
            >
              <LogIn className="w-5 h-5" />
              <span>{t('common.login')}</span>
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
