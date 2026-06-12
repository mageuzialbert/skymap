'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import en from './en.json';
import sw from './sw.json';

export type Locale = 'en' | 'sw';

export const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
];

const DICTIONARIES: Record<Locale, any> = { en, sw };
const STORAGE_KEY = 'skymap_locale';

// Resolve a dot-path key (e.g. "auth.registerTitle") from a nested dictionary object.
function resolveKey(dict: any, key: string): string | undefined {
  return key.split('.').reduce((acc, part) => (acc == null ? undefined : acc[part]), dict);
}

// Replace {{var}} placeholders with provided values.
function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{{${name}}}`
  );
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  // Hydrate from localStorage on mount (default English).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === 'en' || stored === 'sw') {
        setLocaleState(stored);
        document.documentElement.lang = stored;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next;
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      const value =
        resolveKey(DICTIONARIES[locale], key) ??
        resolveKey(DICTIONARIES.en, key) ?? // fall back to English
        key; // last resort: show the key itself
      return typeof value === 'string' ? interpolate(value, vars) : key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Safe fallback so components don't crash if rendered outside the provider.
    return {
      locale: 'en',
      setLocale: () => {},
      t: (key: string, vars?: Record<string, string | number>) => {
        const value = resolveKey(DICTIONARIES.en, key) ?? key;
        return typeof value === 'string' ? interpolate(value, vars) : key;
      },
    };
  }
  return ctx;
}

// Convenience hook returning just the translate function.
export function useT() {
  return useI18n().t;
}
