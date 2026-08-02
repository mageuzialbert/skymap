'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { Home, Truck, ShieldCheck, MapPin } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { useT } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Shared auth styles - single source of truth for the look of every auth page.
// ---------------------------------------------------------------------------
export const inputBase =
  'w-full h-12 rounded-full border border-gray-300 bg-white text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15';

export const primaryBtn =
  'w-full h-12 inline-flex items-center justify-center gap-2 rounded-full bg-primary text-white font-semibold shadow-lg shadow-primary/20 transition-colors hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed';

export const secondaryBtn =
  'h-12 inline-flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-5 font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-60 disabled:cursor-not-allowed';

export const otpInputClass =
  'w-full rounded-full border border-gray-300 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-gray-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15';

type LucideIcon = React.ComponentType<{ className?: string }>;

// A labelled text field with an optional leading icon and an optional right slot
// (e.g. a password show/hide button). Keeps every field visually consistent and
// wires the label to the input for accessibility.
export function AuthField({
  id,
  label,
  icon: Icon,
  rightSlot,
  className = '',
  ...inputProps
}: {
  id: string;
  label: string;
  icon?: LucideIcon;
  rightSlot?: ReactNode;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const pad = Icon ? (rightSlot ? 'pl-11 pr-11' : 'pl-11 pr-5') : rightSlot ? 'pl-5 pr-11' : 'px-5';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
            <Icon className="h-5 w-5" />
          </span>
        )}
        <input id={id} className={`${inputBase} ${pad} ${className}`} {...inputProps} />
        {rightSlot}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AuthShell - the two-column branded frame shared by every auth page.
// Desktop: teal brand panel + form panel. Mobile: form panel only.
// The <main> is the scroll container so tall multi-step forms scroll instead
// of clipping on small screens.
// ---------------------------------------------------------------------------
export default function AuthShell({
  heading,
  subtitle,
  children,
  footer,
}: {
  heading: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  const brandPoints = [
    { icon: Truck, label: t('authx.login.point1') },
    { icon: ShieldCheck, label: t('authx.login.point2') },
    { icon: MapPin, label: t('authx.login.point3') },
  ];

  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2 bg-white">
      {/* Brand panel - desktop only */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-primary text-white p-12">
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-20">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full border-[40px] border-white/40" />
          <div className="absolute -bottom-16 -right-16 h-96 w-96 rounded-full border-[32px] border-white/20" />
          <div className="absolute bottom-10 right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </div>

        <span className="relative z-10 text-2xl font-bold font-display">
          {t('common.appName')}
        </span>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl xl:text-5xl font-extrabold leading-tight">
            {t('authx.login.brandHeadline')}
          </h2>
          <p className="mt-4 text-lg text-white/80">{t('common.tagline')}</p>

          <ul className="mt-10 space-y-4">
            {brandPoints.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-white/90">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm text-white/60">
          © {new Date().getFullYear()} The Skymap Logistics
        </p>
      </aside>

      {/* Form panel - scroll container */}
      <main className="flex min-h-[100dvh] flex-col overflow-y-auto px-4 py-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:px-8 bg-gradient-to-br from-primary/5 via-white to-accent/5 lg:bg-none">
        {/* Top row: back to home + language switcher */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary"
          >
            <Home className="h-4 w-4" />
            {t('common.backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mx-auto my-auto w-full max-w-md py-6">
          {/* Logo / heading */}
          <div className="mb-8 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-cropped.webp"
              alt="The Skymap Logistics"
              className="mx-auto mb-4 h-auto w-40 object-contain sm:w-44"
            />
            <h1 className="font-display text-2xl font-bold text-gray-900">{heading}</h1>
            {subtitle && <p className="mt-1 text-gray-500">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-8 text-center">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
