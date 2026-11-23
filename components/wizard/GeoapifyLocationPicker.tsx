'use client';

import { useEffect, useRef, useState } from 'react';
import type { Map as LeafletMap, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, LocateFixed, MapPin } from 'lucide-react';
import Sheet from '@/components/common/Sheet';
import { useT } from '@/lib/i18n';
import { inputClass, pillPrimary } from '@/lib/ui';

const apiKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY || '';
interface Place { formatted: string; lat: number; lon: number; place_id?: string }
function loadLeaflet() {
  return import('leaflet');
}
async function geocode(kind: 'autocomplete' | 'reverse', params: Record<string, string>, signal?: AbortSignal): Promise<Place[]> {
  const response = await fetch(`https://api.geoapify.com/v1/geocode/${kind}?${new URLSearchParams({ ...params, format: 'json', apiKey })}`, { signal });
  if (!response.ok) throw new Error('Location service unavailable');
  const body = await response.json();
  return body.results || [];
}

export default function GeoapifyLocationPicker({ open, onClose, onPick, title, initialPosition, showMyLocation, showMap = true }: {
  open: boolean;
  onClose: () => void;
  onPick: (address: string, lat: number, lng: number) => void;
  title: string;
  initialPosition: { lat: number; lng: number } | null;
  showMyLocation: boolean;
  showMap?: boolean;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [selected, setSelected] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const request = useRef({ version: 0 });
  const initial = useRef(initialPosition);
  initial.current = initialPosition;

  useEffect(() => {
    if (!open || !apiKey) return;
    const tickets = request.current;
    let cancelled = false;
    let reverseController: AbortController | undefined;
    let timer: ReturnType<typeof setTimeout>;
    setQuery(''); setResults([]); setSelected(null); setError(''); setLoading(false);
    if (!showMap) return;
    loadLeaflet().then((L) => {
      if (cancelled || !container.current) return;
      const m = L.map(container.current).setView(initial.current || { lat: -6.7924, lng: 39.2083 }, initial.current ? 16 : 13);
      map.current = m;
      L.tileLayer(`https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(apiKey)}`, {
        maxZoom: 20,
        attribution: 'Powered by <a href="https://www.geoapify.com/">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(m);
      const resolve = () => {
        clearTimeout(timer); reverseController?.abort();
        const ticket = ++request.current.version;
        setSelected(null);
        timer = setTimeout(async () => {
          const center = m.getCenter();
          reverseController = new AbortController();
          try {
            const places = await geocode('reverse', { lat: String(center.lat), lon: String(center.lng) }, reverseController.signal);
            if (!cancelled && ticket === request.current.version) setSelected({ formatted: places[0]?.formatted || `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`, lat: center.lat, lon: center.lng });
          } catch (e) {
            if (!cancelled && ticket === request.current.version && !reverseController.signal.aborted) setError(t('components.rideWizard.geoapify.error'));
          }
        }, 400);
      };
      m.on('movestart', () => { ++request.current.version; setSelected(null); });
      m.on('moveend', resolve);
      m.on('click', (event: LeafletMouseEvent) => m.panTo(event.latlng));
      resolve();
      m.invalidateSize();
    }).catch(() => { if (!cancelled) setError(t('components.rideWizard.geoapify.error')); });
    return () => { cancelled = true; ++tickets.version; clearTimeout(timer); reverseController?.abort(); map.current?.remove(); map.current = null; };
  }, [open, showMap, t]);

  useEffect(() => {
    if (!open || !apiKey || query.trim().length < 3) { setResults([]); setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true); setResults([]); setError('');
    const timer = setTimeout(async () => {
      try {
        const places = await geocode('autocomplete', { text: query.trim(), limit: '5' }, controller.signal);
        if (!controller.signal.aborted) setResults(places);
      } catch {
        if (!controller.signal.aborted) setError(t('components.rideWizard.geoapify.error'));
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, query, t]);

  const useMyLocation = () => {
    if (!navigator.geolocation) { setError(t('components.rideWizard.locationUnavailable')); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      if (showMap) {
        map.current?.setView([coords.latitude, coords.longitude], 17);
        setLocating(false);
        return;
      }
      try {
        const places = await geocode('reverse', { lat: String(coords.latitude), lon: String(coords.longitude) });
        onPick(places[0]?.formatted || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`, coords.latitude, coords.longitude);
        onClose();
      } catch { setError(t('components.rideWizard.geoapify.error')); }
      finally { setLocating(false); }
    }, () => { setLocating(false); setError(t('components.rideWizard.locationDenied')); }, { enableHighAccuracy: true, timeout: 10000 });
  };

  return (
    <Sheet open={open} onClose={onClose} title={title} variant="fullscreen" layer="fullscreen" footer={apiKey && showMap ? (
      <div className="space-y-3">
        <p className="text-sm text-gray-700">{selected?.formatted || t('components.rideWizard.mapMoveToSelect')}</p>
        <button type="button" className={`${pillPrimary} h-12 w-full`} disabled={!selected} onClick={() => { if (selected) { onPick(selected.formatted, selected.lat, selected.lon); onClose(); } }}>{t('components.rideWizard.mapConfirm')}</button>
      </div>
    ) : undefined}>
      {apiKey ? (
        <div className="flex h-full min-h-[24rem] flex-col">
          <div className="shrink-0 p-3">
            <input aria-label={title} className={`${inputClass} w-full`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('components.rideWizard.searchPlaceholder')} />
            {loading && <Loader2 aria-label={t('common.loading')} className="mt-2 h-5 w-5 animate-spin" />}
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
            {!loading && query.trim().length >= 3 && !results.length && !error && <p className="mt-2 text-sm text-gray-500">{t('components.rideWizard.searchNoResults')}</p>}
            {!showMap && showMyLocation && <button type="button" disabled={locating} onClick={useMyLocation} className="mt-2 flex items-center gap-2 p-3 text-sm text-primary">{locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}{t('components.rideWizard.useCurrentLocation')}</button>}
            <ul className={showMap ? "max-h-48 overflow-y-auto" : ""}>{results.map((place, i) => <li key={place.place_id || i}><button type="button" className="w-full border-b p-3 text-left text-sm" onClick={() => { if (!showMap) { onPick(place.formatted, place.lat, place.lon); onClose(); return; } ++request.current.version; map.current?.setView([place.lat, place.lon], 16); setSelected(place); }}>{place.formatted}</button></li>)}</ul>
            <p className="mt-1 text-xs text-gray-500">Powered by <a href="https://www.geoapify.com/" target="_blank" rel="noreferrer">Geoapify</a> · © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors</p>
          </div>
          {showMap && <div className="relative z-0 min-h-64 flex-1">
            <div ref={container} className="absolute inset-0" />
            <MapPin className="pointer-events-none absolute left-1/2 top-1/2 z-[500] h-10 w-10 -translate-x-1/2 -translate-y-full text-primary" fill="currentColor" />
            {showMyLocation && <button type="button" disabled={locating} onClick={useMyLocation} aria-label={t('components.rideWizard.useCurrentLocation')} className="absolute bottom-8 right-3 z-[500] rounded-full bg-white p-3 shadow">{locating ? <Loader2 className="h-5 w-5 animate-spin" /> : <LocateFixed className="h-5 w-5" />}</button>}
          </div>}
        </div>
      ) : null}
    </Sheet>
  );
}
