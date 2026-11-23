'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { errorText, fieldLabel, inputClass } from '@/lib/ui';

interface LocationPickerProps {
  label: string;
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
  defaultLocation?: { lat: number; lng: number };
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  showMyLocation?: boolean;
  autoFocus?: boolean;
}
interface Place { formatted: string; lat: number; lon: number; place_id?: string }
const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';

export default function LocationPicker({ label, value, onChange, error, disabled = false, placeholder, showMyLocation = true, autoFocus = false }: LocationPickerProps) {
  const t = useT();
  const id = useId();
  const [query, setQuery] = useState(value);
  const [expanded, setExpanded] = useState(false);
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const locationRequest = useRef(0);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => { if (autoFocus) input.current?.focus(); }, [autoFocus]);
  useEffect(() => {
    const requests = locationRequest;
    return () => { requests.current += 1; };
  }, []);

  useEffect(() => {
    setResults([]); setActiveIndex(-1); setSearchError('');
    if (!expanded || disabled || !apiKey || query.trim().length < 3) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?${new URLSearchParams({ text: query.trim(), format: 'json', limit: '5', apiKey })}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Location search failed');
        const body = await response.json();
        if (!controller.signal.aborted) setResults(body.results || []);
      } catch {
        if (!controller.signal.aborted) setSearchError(t('components.rideWizard.geoapify.error'));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, expanded, disabled, t]);

  const pick = (place: Place) => {
    locationRequest.current += 1;
    setQuery(place.formatted);
    onChange(place.formatted, place.lat, place.lon);
    setExpanded(false);
    setResults([]);
    setLocating(false);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) { setSearchError(t('components.rideWizard.locationUnavailable')); return; }
    const ticket = ++locationRequest.current;
    setLocating(true); setSearchError('');
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`https://api.geoapify.com/v1/geocode/reverse?${new URLSearchParams({ lat: String(coords.latitude), lon: String(coords.longitude), format: 'json', apiKey })}`);
        if (!response.ok) throw new Error('Location lookup failed');
        const body = await response.json();
        if (ticket !== locationRequest.current) return;
        pick({ formatted: body.results?.[0]?.formatted || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`, lat: coords.latitude, lon: coords.longitude });
      } catch { if (ticket === locationRequest.current) setSearchError(t('components.rideWizard.geoapify.error')); }
      finally { if (ticket === locationRequest.current) setLocating(false); }
    }, () => {
      if (ticket !== locationRequest.current) return;
      setLocating(false); setSearchError(t('components.rideWizard.locationDenied'));
    }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <div onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setExpanded(false); }}>
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={expanded && results.length > 0}
          aria-controls={`${id}-results`}
          aria-activedescendant={expanded && activeIndex >= 0 ? `${id}-option-${activeIndex}` : undefined}
          aria-invalid={!!error}
          aria-describedby={error || searchError ? `${id}-error` : undefined}
          autoComplete="off"
          value={query}
          disabled={disabled}
          placeholder={placeholder || t('components.locationPicker.searchPlaceholder')}
          onFocus={() => setExpanded(true)}
          onChange={(event) => {
            locationRequest.current += 1;
            setLocating(false); setQuery(event.target.value); setExpanded(true);
            onChange(event.target.value, null, null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') { event.preventDefault(); setExpanded(false); }
            if (expanded && results.length && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
              event.preventDefault();
              setActiveIndex((index) => event.key === 'ArrowDown' ? (index + 1) % results.length : (index <= 0 ? results.length - 1 : index - 1));
            }
            if (expanded && event.key === 'Enter') {
              event.preventDefault();
              if (activeIndex >= 0 && results[activeIndex]) pick(results[activeIndex]);
            }
          }}
          className={`${inputClass} w-full pl-10 pr-10 ${error ? 'border-red-300' : ''}`}
        />
        {loading && <Loader2 aria-label={t('common.loading')} className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-primary" />}
      </div>
      {expanded && !disabled && apiKey && (
        <div className="mt-1 overflow-hidden rounded-xl border border-gray-200 bg-white">
          {showMyLocation && <button type="button" disabled={locating} onClick={useMyLocation} className="flex w-full items-center gap-2 p-3 text-left text-sm text-primary">{locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}{t('components.rideWizard.useCurrentLocation')}</button>}
          <ul id={`${id}-results`} role="listbox" aria-label={label}>
            {results.map((place, index) => <li key={place.place_id || index} id={`${id}-option-${index}`} role="option" aria-selected={activeIndex === index}>
              <button type="button" onClick={() => pick(place)} className={`flex w-full items-start gap-2 border-t border-gray-100 p-3 text-left text-sm hover:bg-gray-50 ${activeIndex === index ? 'bg-gray-100' : ''}`}><MapPin className="h-4 w-4 shrink-0 text-gray-400" />{place.formatted}</button>
            </li>)}
          </ul>
          {!loading && query.trim().length >= 3 && !results.length && !searchError && <p className="p-3 text-sm text-gray-500">{t('components.rideWizard.searchNoResults')}</p>}
          <p className="px-3 py-2 text-xs text-gray-500">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</p>
        </div>
      )}
      {(searchError || error) && <p id={`${id}-error`} role="alert" className={errorText}>{searchError || error}</p>}
    </div>
  );
}
