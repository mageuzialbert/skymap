'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  CheckCircle2,
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  Headphones,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

const SKYMAP_PHONE = '+255687371544';
const SKYMAP_WHATSAPP = '255687371544'; // wa.me format: digits only, no '+'

const SERVICES = [
  {
    img: '/services/delivery.webp',
    label: 'Package Delivery',
    desc: 'Send parcels and documents across town, safely and fast.',
  },
  {
    img: '/services/ride.webp',
    label: 'Ride',
    desc: 'Get picked up and taken to your destination.',
  },
  {
    img: '/services/hire.webp',
    label: 'Vehicle Hire',
    desc: 'Book a vehicle and rider for the hours you need.',
  },
  {
    img: '/services/errand.webp',
    label: 'Errands',
    desc: 'Send a rider to buy or collect something for you.',
  },
];

const TRUST = [
  { icon: MapPin, label: 'Across Tanzania' },
  { icon: ShieldCheck, label: 'Trusted riders' },
  { icon: Headphones, label: 'In-app support' },
];

/**
 * Dedicated About page. Prefers admin-edited copy from cms_content (key
 * "about_us"); falls back to the translated default text. Clean, modern,
 * mobile-first - consistent with the home/auth design (cropped logo, pill
 * buttons, wavy hero divider, real service photos).
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
    <main className="min-h-[100dvh] bg-gradient-to-b from-white to-primary/5">
      {/* Sticky top bar */}
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2.5">
          <Link href="/" className="flex items-center">
            <Image
              src="/logo-cropped.png"
              alt="The Skymap"
              width={686}
              height={339}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('common.backToHome')}</span>
          </Link>
        </div>
      </header>

      {/* Branded hero band with a wavy bottom divider */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-primary-dark text-white">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-secondary/20 blur-2xl" />

        <div className="relative mx-auto max-w-5xl px-4 pb-24 pt-12 text-center sm:pb-28 sm:pt-16">
          {/* Brand chip (white so the teal logo reads on the dark hero) */}
          <div className="mx-auto mb-5 inline-flex items-center rounded-2xl bg-white px-4 py-2 shadow-lg shadow-black/10">
            <Image
              src="/logo-cropped.png"
              alt="The Skymap"
              width={686}
              height={339}
              className="h-8 w-auto object-contain"
            />
          </div>

          <span className="mb-3 block text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
            {t('landing.aboutUs')} · {t('common.appName')}
          </span>
          <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-white/85 sm:text-lg">{t('common.tagline')}</p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {TRUST.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-1.5 text-sm text-white/85">
                <item.icon className="h-4 w-4 text-white/70" />
                {item.label}
              </span>
            ))}
          </div>
        </div>

        {/* Wavy divider into the content */}
        <svg
          className="absolute inset-x-0 bottom-0 block h-10 w-full sm:h-14"
          viewBox="0 0 1440 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path fill="#ffffff" d="M0,42 C240,92 480,8 720,44 C960,80 1200,16 1440,54 L1440,100 L0,100 Z" />
        </svg>
      </section>

      <div className="mx-auto max-w-5xl px-4">
        {/* Services */}
        <section className="pt-6 sm:pt-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {SERVICES.map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-gray-100 bg-white p-4 text-center shadow-sm transition-shadow hover:shadow-md sm:p-5"
              >
                <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full ring-1 ring-black/5 sm:h-20 sm:w-20">
                  <Image src={s.img} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <h3 className="mt-3 text-sm font-bold text-gray-900 sm:text-base">{s.label}</h3>
                <p className="mt-1 text-xs leading-snug text-gray-500 sm:text-[13px]">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Story / mission (admin-editable copy) */}
        <section className="mt-10 grid gap-6 sm:mt-12 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-[0.15em] text-primary">
              Our story
            </span>
            <div className="max-w-none">
              {body.split('\n').map((para, i) =>
                para.trim() ? (
                  <p key={i} className="mb-4 text-justify text-[15px] leading-relaxed text-gray-700 last:mb-0">
                    {para}
                  </p>
                ) : null
              )}
            </div>
          </div>

          <aside className="lg:col-span-2">
            <div className="h-full rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
              <h3 className="mb-3 text-sm font-bold text-gray-900">Why choose us</h3>
              <ul className="space-y-3">
                {(features.length > 0
                  ? features
                  : [
                      'One app for rides, deliveries, hire and errands',
                      'Real-time chat with your rider and support',
                      'Choose your means of transport - boda, bajaj, car & more',
                      'Pay-as-you-go, no hidden fees',
                    ]
                ).map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </section>

        {/* Final CTA band */}
        <section className="mb-12 mt-12">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-dark p-7 text-center text-white sm:p-10">
            <div aria-hidden className="pointer-events-none absolute -top-16 -right-12 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative text-2xl font-extrabold sm:text-3xl">Ready to get moving?</h2>
            <p className="relative mt-2 text-white/85">
              Create a free account or sign in to request your first ride or delivery.
            </p>

            <div className="relative mx-auto mt-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-full bg-white py-3.5 text-base font-bold text-primary transition hover:bg-gray-50 active:scale-[0.98]"
              >
                <span>{t('common.register')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-full bg-white/10 py-3.5 text-base font-bold text-white ring-1 ring-white/40 transition hover:bg-white/20 active:scale-[0.98]"
              >
                <Send className="h-5 w-5" />
                <span>{t('landing.request')}</span>
              </Link>
            </div>

            <div className="relative mx-auto mt-3 grid max-w-md grid-cols-2 gap-3">
              <a
                href={`tel:${SKYMAP_PHONE}`}
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4" />
                <span>{t('landing.call')}</span>
              </a>
              <a
                href={`https://wa.me/${SKYMAP_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:text-white"
              >
                <MessageCircle className="h-4 w-4" />
                <span>{t('landing.whatsapp')}</span>
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-gray-400">
            © {new Date().getFullYear()} The Skymap - Connecting People, Deliveries, and Destinations.
          </p>
        </section>
      </div>
    </main>
  );
}
