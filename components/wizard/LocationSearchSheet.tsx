'use client';

import { useEffect, useRef, useState } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { ArrowLeft, ChevronRight, Loader2, LocateFixed, Map, MapPin, Search } from 'lucide-react';
import Sheet from '@/components/common/Sheet';
import { splitAddress } from '@/lib/address';
import { useT } from '@/lib/i18n';
import { rowClass } from '@/lib/ui';

interface Place {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Category {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  places: Place[];
}

/**
 * One surface for answering "which place?".
 *
 * It replaces three separate things: a pair of 16px text links under the old
 * address field, a second sheet for browsing suggested places, and an absolutely
 * positioned autocomplete dropdown that rendered off-screen once the soft
 * keyboard was up. The search field is pinned at the top of the sheet, above
 * the keyboard, and everything else is a 56px row.
 */
export default function LocationSearchSheet({
  open,
  onClose,
  onPick,
  onOpenMap,
  title,
  showMyLocation = true,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (address: string, lat: number | null, lng: number | null) => void;
  /** Hands over to the map picker to drop a pin instead. */
  onOpenMap: () => void;
  title: string;
  /** Only the pickup field offers "use my location". */
  showMyLocation?: boolean;
}) {
  const t = useT();
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCat, setActiveCat] = useState<Category | null>(null);
  const [loadingPlaces, setLoadingPlaces] = useState(true);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ready,
    value,
    setValue,
    suggestions: { status, data },
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { componentRestrictions: { country: 'tz' } },
    debounce: 300,
  });

  useEffect(() => {
    if (!open) return;
    setActiveCat(null);
    setError('');
    setValue('', false);
    clearSuggestions();
    setLoadingPlaces(true);
    fetch('/api/places')
      .then((r) => (r.ok ? r.json() : []))
      .then((rows: Category[]) => setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => setCategories([]))
      .finally(() => setLoadingPlaces(false));
    // Focus the field so the keyboard is already up when the sheet lands.
    const id = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(id);
    // setValue / clearSuggestions are stable enough here; re-running on every
    // render of the autocomplete hook would refetch the places list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function pickSuggestion(description: string) {
    onPick(description, null, null);
    try {
      const results = await getGeocode({ address: description });
      const { lat, lng } = getLatLng(results[0]);
      onPick(description, lat, lng);
    } catch {
      // The address is already set; only the coordinates are missing, and
      // dispatch can still work from the text.
    }
    onClose();
  }

  function pickPlace(p: Place) {
    const address = p.address ? `${p.name}, ${p.address}` : p.name;
    onPick(
      address,
      p.latitude != null ? Number(p.latitude) : null,
      p.longitude != null ? Number(p.longitude) : null
    );
    onClose();
  }

  function useMyLocation() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError(t('components.rideWizard.locationUnavailable'));
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const results = await getGeocode({ location: { lat: latitude, lng: longitude } });
          address = results[0]?.formatted_address || address;
        } catch {
          // Keep the coordinates as the address - still usable by dispatch.
        }
        setLocating(false);
        onPick(address, latitude, longitude);
        onClose();
      },
      () => {
        setLocating(false);
        setError(t('components.rideWizard.locationDenied'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const searching = value.trim().length > 0;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={activeCat ? activeCat.name : title}
      headerRight={
        activeCat ? (
          <button
            type="button"
            onClick={() => setActiveCat(null)}
            aria-label={t('common.back')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 active:bg-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        ) : undefined
      }
    >
      {!activeCat && (
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white px-4 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={!ready}
              placeholder={t('components.rideWizard.searchPlaceholder')}
              className="h-12 w-full rounded-xl border border-gray-300 bg-white pl-11 pr-4 text-gray-900 placeholder:text-gray-400 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </div>
          {error && <p className="mt-2 text-[13px] text-red-600">{error}</p>}
        </div>
      )}

      <div className="p-2">
        {activeCat ? (
          activeCat.places.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pickPlace(p)}
              className={`${rowClass} w-full rounded-xl text-left`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                <MapPin className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-gray-900">{p.name}</span>
                {p.address && (
                  <span className="mt-0.5 block truncate text-[13px] text-gray-500">{p.address}</span>
                )}
              </span>
            </button>
          ))
        ) : searching ? (
          status === 'OK' && data.length > 0 ? (
            data.map(({ place_id, description }) => {
              const { title: name, detail } = splitAddress(description);
              return (
                <button
                  key={place_id}
                  type="button"
                  onClick={() => pickSuggestion(description)}
                  className={`${rowClass} w-full rounded-xl text-left`}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-gray-900">{name}</span>
                    {detail && (
                      <span className="mt-0.5 block truncate text-[13px] text-gray-500">{detail}</span>
                    )}
                  </span>
                </button>
              );
            })
          ) : (
            <p className="py-10 text-center text-[15px] text-gray-500">
              {t('components.rideWizard.searchNoResults')}
            </p>
          )
        ) : (
          <>
            {showMyLocation && (
              <button
                type="button"
                onClick={useMyLocation}
                disabled={locating}
                className={`${rowClass} w-full rounded-xl text-left disabled:opacity-60`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {locating ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LocateFixed className="h-5 w-5" />
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">
                  {t('components.rideWizard.useCurrentLocation')}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={onOpenMap}
              className={`${rowClass} w-full rounded-xl text-left`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Map className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-gray-900">
                {t('components.rideWizard.pickOnMap')}
              </span>
            </button>

            {loadingPlaces ? (
              <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : categories.length > 0 ? (
              <>
                <h3 className="mb-1 ml-3 mt-4 text-[13px] font-semibold text-gray-500">
                  {t('components.rideWizard.suggestedPlaces')}
                </h3>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCat(c)}
                    disabled={c.places.length === 0}
                    className={`${rowClass} w-full rounded-xl disabled:opacity-40`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
                      <MapPin className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-[15px] font-medium text-gray-900">
                      {c.name}
                    </span>
                    <span className="shrink-0 text-[13px] text-gray-400">{c.places.length}</span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
                  </button>
                ))}
              </>
            ) : null}
          </>
        )}
      </div>
    </Sheet>
  );
}
