'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, LogIn, UserPlus, CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';

const SKYMAP_PHONE = '+255687371544';
const SKYMAP_WHATSAPP = '255687371544'; // wa.me format: digits only, no '+'

/**
 * Dedicated About Us page. Prefers admin-edited copy from cms_content (key
 * "about_us"); falls back to the translated default text. Includes prominent
 * Login / Register CTAs.
 */
export default function AboutPage() {
  const t = useT();
  const [cms, setCms] = useState<{ title?: string; description?: string; features?: string[] } | null>(
    null
  );

  useEffect(() => {
    fetch('/api/cms/content?key=about_us')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        // cms_content.content is JSONB shaped { title, description, features[] }
        const c = data?.content;
        setCms(c && typeof c === 'object' ? c : null);
      })
      .catch(() => setCms(null));
  }, []);

  const title = cms?.title || t('about.title');
  const body = cms?.description || t('about.body');
  const features = cms?.features || [];

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary/10 via-white to-primary/5">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-gray-900">{t('common.appName')}</span>
          </div>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        {/* Hero header */}
        <div className="text-center mb-8 sm:mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-10 h-10" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">{title}</h1>
          <p className="mt-2 text-base text-gray-500">
            Connecting People, Deliveries, and Destinations.
          </p>
        </div>

        {/* Body */}
        <article className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="prose prose-gray max-w-none">
            {body.split('\n').map((para, i) =>
              para.trim() ? (
                <p key={i} className="text-[15px] text-gray-700 leading-relaxed mb-4 last:mb-0">
                  {para}
                </p>
              ) : null
            )}
          </div>

          {features.length > 0 && (
            <ul className="mt-6 grid sm:grid-cols-2 gap-3">
              {features.map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </article>

        {/* CTA section */}
        <section className="mt-8 sm:mt-10 text-center">
          <h2 className="text-xl font-bold text-gray-900">Ready to get moving?</h2>
          <p className="mt-1 text-sm text-gray-500">
            Sign in or create an account to request a ride or delivery.
          </p>
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
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

          {/* Contact */}
          <div className="mt-4 grid grid-cols-2 gap-3 max-w-md mx-auto">
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
        </section>
      </div>
    </main>
  );
}
