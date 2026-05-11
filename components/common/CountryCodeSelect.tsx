'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { COUNTRIES, Country, flagUrl, getCountry } from '@/lib/countries';

interface Props {
  value: string;
  onChange: (country: Country) => void;
  disabled?: boolean;
}

export default function CountryCodeSelect({ value, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = getCountry(value);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.dialCode.replace('+', '').includes(q.replace('+', '')) ||
      c.code.toLowerCase().includes(q)
    );
  }, [search]);

  // Focus search field when opening
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    } else {
      setSearch('');
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const handleSelect = (c: Country) => {
    onChange(c);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <img
          src={flagUrl(selected.code)}
          alt={selected.name}
          className="w-5 h-auto rounded-sm"
          loading="lazy"
        />
        <span className="font-medium">{selected.dialCode}</span>
        <svg className="w-3 h-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg left-0">
          <div className="p-2 border-b border-gray-100">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search country or code..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
          <ul ref={listRef} className="max-h-64 overflow-y-auto py-1" role="listbox">
            {filtered.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-gray-500">
                No countries found
              </li>
            )}
            {filtered.map(c => (
              <li
                key={c.code}
                role="option"
                aria-selected={c.code === selected.code}
                onClick={() => handleSelect(c)}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 ${
                  c.code === selected.code ? 'bg-primary/5 font-medium' : ''
                }`}
              >
                <img
                  src={flagUrl(c.code)}
                  alt={c.name}
                  className="w-5 h-auto rounded-sm flex-shrink-0"
                  loading="lazy"
                />
                <span className="flex-1 truncate text-gray-800">{c.name}</span>
                <span className="text-gray-500">{c.dialCode}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
