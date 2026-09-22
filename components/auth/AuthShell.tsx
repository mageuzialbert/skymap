'use client';

import { ReactNode, useState } from 'react';
import Link from 'next/link';
import {
  Home,
  Truck,
  ShieldCheck,
  MapPin,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  MessageSquare,
  Mail,
} from 'lucide-react';
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

// ---------------------------------------------------------------------------
// Shared auth pieces. Every auth page composes these so the four screens stay
// visually and behaviourally identical - previously each page hand-rolled its
// own alert, password toggle, resend link and button row, which had drifted.
// ---------------------------------------------------------------------------

/** Inline status message. `error` and `success` cover the common cases; the
 *  `warning` tone is used for advisory notes such as "SMS is Tanzania only". */
export function AuthAlert({
  variant = 'error',
  flush = false,
  children,
}: {
  variant?: 'error' | 'success' | 'warning';
  /** Drop the bottom margin when the alert already sits in a spaced stack. */
  flush?: boolean;
  children: ReactNode;
}) {
  const tone = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-green-200 bg-green-50 text-green-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-800',
  }[variant];
  return (
    <div className={`${flush ? '' : 'mb-4'} rounded-xl border p-3 text-sm ${tone}`}>{children}</div>
  );
}

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

/** Password entry with the show/hide eye. Owns its own reveal state so every
 *  page gets the same toggle, icon and aria-label without repeating it. */
export function PasswordField({
  id,
  label,
  ...inputProps
}: { id: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <AuthField
      id={id}
      label={label}
      icon={Lock}
      type={show ? 'text' : 'password'}
      rightSlot={
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
          aria-label={show ? t('authx.hidePassword') : t('authx.showPassword')}
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      }
      {...inputProps}
    />
  );
}

/** Primary submit. Shows a spinner plus an optional busy label while working,
 *  and an optional trailing icon when idle. */
export function SubmitButton({
  loading = false,
  loadingLabel,
  icon: Icon,
  className = '',
  children,
  ...props
}: {
  loading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
  children: ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} disabled={loading || props.disabled} className={`${primaryBtn} ${className}`}>
      {loading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {children}
          {Icon && <Icon className="h-5 w-5" />}
        </>
      )}
    </button>
  );
}

/** Back + primary action on one row, each taking half the width. */
export function AuthActions({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <div className="flex gap-3">
      <button type="button" onClick={onBack} className={`flex-1 ${secondaryBtn}`}>
        <ArrowLeft className="h-4 w-4" />
        {t('common.back')}
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

/** Standalone "back" for steps where the primary action is conditional. */
export function BackLink({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900"
    >
      <ArrowLeft className="h-4 w-4" />
      {t('common.back')}
    </button>
  );
}

/** "Resend code" action, shown under an OTP input. */
export function ResendButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="mt-2 w-full text-sm font-medium text-primary transition-colors hover:text-primary-dark disabled:opacity-50"
    >
      {t('auth.resendCode')}
    </button>
  );
}

/** SMS / email delivery choice, shared by register and password reset. */
export function ChannelPicker({
  value,
  onChange,
  smsDisabled = false,
}: {
  value: 'sms' | 'email';
  onChange: (c: 'sms' | 'email') => void;
  smsDisabled?: boolean;
}) {
  const t = useT();
  const options = [
    { key: 'sms' as const, icon: MessageSquare, label: t('auth.channelSms'), disabled: smsDisabled },
    { key: 'email' as const, icon: Mail, label: t('auth.channelEmail'), disabled: false },
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map(({ key, icon: Icon, label, disabled }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          disabled={disabled}
          className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-colors ${
            value === key
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-gray-200 text-gray-600'
          } ${disabled ? 'cursor-not-allowed opacity-40' : 'hover:border-primary/60'}`}
        >
          <Icon className="h-5 w-5" />
          <span className="text-sm font-medium">{label}</span>
        </button>
      ))}
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
            href="/welcome"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-primary"
          >
            <Home className="h-4 w-4" />
            {t('common.backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="mx-auto my-auto w-full max-w-sm rounded-3xl border border-gray-200/80 bg-white/95 p-6 shadow-xl shadow-primary/10 sm:max-w-md sm:p-8 lg:max-w-md lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:py-6 lg:shadow-none">
          {/* Logo / heading */}
          <div className="mb-6 text-center sm:mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-cropped.webp"
              alt="The Skymap Logistics"
              className="mx-auto mb-3 h-auto w-28 object-contain sm:mb-4 sm:w-40 lg:w-44"
            />
            <h1 className="font-display text-xl font-bold text-gray-900 sm:text-2xl">{heading}</h1>
            {subtitle && <p className="mt-1 text-sm text-gray-500 sm:text-base">{subtitle}</p>}
          </div>

          {children}

          {footer && <div className="mt-6 text-center sm:mt-8">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
