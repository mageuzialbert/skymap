'use client';

import { useState, useRef, useEffect } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n, LOCALES, Locale } from '@/lib/i18n';

interface LanguageSwitcherProps {
  /** "light" for dark backgrounds, "dark" for light backgrounds (default). */
  variant?: 'light' | 'dark';
  className?: string;
}

export default function LanguageSwitcher({ variant = 'dark', className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0];
  const btnColor =
    variant === 'light'
      ? 'text-white bg-white/15 hover:bg-white/25'
      : 'text-gray-700 bg-gray-100 hover:bg-gray-200';

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${btnColor}`}
        aria-label="Change language"
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline">{current.flag} {current.label}</span>
        <span className="sm:hidden">{current.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2">
                <span>{l.flag}</span>
                <span>{l.label}</span>
              </span>
              {l.code === locale && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
