'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2,
  Phone,
  MessageCircle,
  Package,
  UserRound,
  Clock,
  ShoppingBag,
  MapPin,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

const SKYMAP_PHONE = '+255687371544';
const SKYMAP_WHATSAPP = '255687371544'; // wa.me format: digits only, no '+'

const SERVICES = [
  { icon: Package, label: 'Package Delivery', desc: 'Send parcels and documents across town, safely and fast.', tint: 'bg-primary/10 text-primary' },
  { icon: UserRound, label: 'Ride', desc: 'Get picked up and taken to your destination.', tint: 'bg-blue-100 text-blue-700' },
  { icon: Clock, label: 'Vehicle Hire', desc: 'Book a vehicle and rider for the hours you need.', tint: 'bg-purple-100 text-purple-700' },
  { icon: ShoppingBag, label: 'Errands', desc: 'Send a rider to buy or collect something for you.', tint: 'bg-amber-100 text-amber-700' },
];

const TRUST = [
  { icon: MapPin, label: 'Across Tanzania' },
  { icon: ShieldCheck, label: 'Trusted riders' },
  { icon: Headphones, label: 'In-app support' },
];

/**
 * Dedicated About Us page. Prefers admin-edited copy from cms_content (key
 * "about_us"); falls back to the translated default text. Branded hero +
 * services showcase + Login / Register CTAs.
 */
export default function AboutPage() {
  const t = useT();
  const [cms, setCms] = useState<{ title?: string; description?: string; features?: string[] } | null>(null);

  useEffect(() => {
    fetch('/api/cms/content?key=about_us')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const c = data?.content;
        setCms(c && typeof c === 'object' ? c : null);
      })
      .catch(() => setCms(null));
  }, []);

  const title = cms?.title || t('about.title');
  const body = cms?.description || t('about.body');
  const features = cms?.features || [];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-gray-900">{t('common.appName')}</span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to home</span>
          </Link>
        </div>
      </header>

      {/* Branded hero band */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-white">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-secondary/20 blur-2xl" />
        <div className="relative max-w-5xl mx-auto px-4 pt-12 pb-20 sm:pt-16 sm:pb-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur mb-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-10 h-10" />
          </div>
          <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase text-white/70 mb-3">
            About The Skymap
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">{title}</h1>
          <p className="mt-3 text-base sm:text-lg text-white/85 max-w-2xl mx-auto">
            Connecting people, deliveries, and destinations — your everyday transport partner across Tanzania.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {TRUST.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-sm text-white/85">
                <item.icon className="w-4 h-4 text-white/70" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4">
        {/* Services — overlap the hero */}
        <section className="-mt-12 sm:-mt-14 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {SERVICES.map((s) => (
              <div
                key={s.label}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 hover:shadow-md transition-shadow"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${s.tint}`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <h3 className="mt-3 text-sm sm:text-base font-bold text-gray-900">{s.label}</h3>
                <p className="mt-1 text-xs sm:text-[13px] text-gray-500 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Story / mission (admin-editable copy) */}
        <section className="mt-10 sm:mt-12 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <span className="inline-block text-xs font-bold tracking-[0.15em] uppercase text-primary mb-2">Our story</span>
            <article className="prose prose-gray max-w-none">
              {body.split('\n').map((para, i) =>
                para.trim() ? (
                  <p key={i} className="text-[15px] text-gray-700 leading-relaxed mb-4 last:mb-0">
                    {para}
                  </p>
                ) : null
              )}
            </article>
          </div>

          <aside className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 h-full">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Why choose us</h3>
              <ul className="space-y-3">
                {(features.length > 0
                  ? features
                  : [
                      'One app for rides, deliveries, hire and errands',
                      'Real-time chat with your rider and support',
                      'Choose your means of transport — boda, bajaj, car & more',
                      'Pay-as-you-go, no hidden fees',
                    ]
                ).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        {/* Final CTA band */}
        <section className="mt-12 mb-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-white p-7 sm:p-10 text-center">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-12 w-56 h-56 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-2xl sm:text-3xl font-extrabold">Ready to get moving?</h2>
            <p className="relative mt-2 text-white/85">Sign in or create a free account to request your first ride or delivery.</p>

            <div className="relative mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 py-3.5 bg-white text-primary text-base font-bold rounded-xl hover:bg-gray-50 active:scale-[0.98] transition cursor-pointer"
              >
                <UserPlus className="w-5 h-5" />
                <span>{t('common.register')}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 py-3.5 bg-white/10 ring-1 ring-white/40 text-white text-base font-bold rounded-xl hover:bg-white/20 active:scale-[0.98] transition cursor-pointer"
              >
                <LogIn className="w-5 h-5" />
                <span>{t('common.login')}</span>
              </Link>
            </div>

            <div className="relative mt-3 grid grid-cols-2 gap-3 max-w-md mx-auto">
              <a
                href={`tel:${SKYMAP_PHONE}`}
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>{t('landing.call')}</span>
              </a>
              <a
                href={`https://wa.me/${SKYMAP_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white/90 hover:text-white transition-colors cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>{t('landing.whatsapp')}</span>
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()} The Skymap — Connecting People, Deliveries, and Destinations.
          </p>
        </section>
      </div>
    </main>
  );
}
