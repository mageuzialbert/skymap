'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { MapPin, Check, Loader2, LocateFixed } from 'lucide-react';
import Sheet from '@/components/common/Sheet';
import { useT } from '@/lib/i18n';
import { pillPrimary } from '@/lib/ui';

interface FullscreenMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  initialPosition?: { lat: number; lng: number } | null;
  title?: string;
}

const mapContainerStyle = { width: '100%', height: '100%' };

// Dar es Salaam.
const defaultCenter = { lat: -6.7924, lng: 39.2083 };

const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
};

/**
 * Drop a pin by moving the map under a fixed centre pin.
 *
 * The pin used to be `pointer-events-none` decoration next to a click-only
 * map, which meant hitting a small target with a thumb. Now the pin *is* the
 * selection: drag the map, and whatever settles under it is the address. That
 * is the native pattern and it needs no precision at all.
 *
 * Searching lives in the location sheet that opens this picker, so there is
 * deliberately no second search box here.
 */
export default function FullscreenMapPicker({
  isOpen,
  onClose,
  onSelect,
  initialPosition,
  title,
}: FullscreenMapPickerProps) {
  const t = useT();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [position, setPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const [address, setAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);

  // Each geocode is tagged so a slow earlier response cannot overwrite the
  // address for where the map has since settled.
  const requestRef = useRef(0);

  const resolveAddress = useCallback((lat: number, lng: number) => {
    const ticket = ++requestRef.current;
    setPosition({ lat, lng });
    setIsGeocoding(true);
    const fallback = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    new google.maps.Geocoder()
      .geocode({ location: { lat, lng } })
      .then((res) => {
        if (ticket !== requestRef.current) return;
        setAddress(res.results?.[0]?.formatted_address || fallback);
      })
      .catch(() => {
        if (ticket === requestRef.current) setAddress(fallback);
      })
      .finally(() => {
        if (ticket === requestRef.current) setIsGeocoding(false);
      });
  }, []);

  // Reset between openings so a previous pick never leaks into the next one.
  useEffect(() => {
    if (!isOpen) {
      requestRef.current++;
      setPosition(null);
      setAddress('');
      setIsGeocoding(false);
    }
  }, [isOpen]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (initialPosition) {
        map.setCenter(initialPosition);
        map.setZoom(16);
      }
    },
    [initialPosition]
  );

  // Fires once the map stops moving - one geocode per gesture, not per frame.
  const onIdle = useCallback(() => {
    const centre = mapRef.current?.getCenter();
    if (!centre) return;
    resolveAddress(centre.lat(), centre.lng());
  }, [resolveAddress]);

  const goToMyLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.panTo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        mapRef.current?.setZoom(17);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const confirm = () => {
    if (!position || !address) return;
    onSelect(address, position.lat, position.lng);
    onClose();
  };

  return (
    <Sheet
      open={isOpen}
      onClose={onClose}
      variant="fullscreen"
      layer="fullscreen"
      title={title || t('components.rideWizard.selectLocation')}
      footer={
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="min-w-0 flex-1 text-[15px] leading-snug text-gray-700">
              {isGeocoding ? (
                <span className="inline-flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('components.rideWizard.mapGettingAddress')}
                </span>
              ) : (
                address || t('components.rideWizard.mapMoveToSelect')
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={!address || isGeocoding}
            className={`${pillPrimary} h-12 w-full text-base`}
          >
            <Check className="h-5 w-5" />
            {t('components.rideWizard.mapConfirm')}
          </button>
        </div>
      }
    >
      <div className="relative h-full w-full">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={initialPosition || defaultCenter}
          zoom={initialPosition ? 16 : 13}
          options={mapOptions}
          onLoad={onMapLoad}
          onIdle={onIdle}
        />

        {/* The pin is the selection point. Its tip sits on the map centre, so
            it is nudged up by its own height. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
          <MapPin className="h-10 w-10 text-primary drop-shadow-md" fill="currentColor" strokeWidth={1.5} />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/40" />

        <button
          type="button"
          onClick={goToMyLocation}
          aria-label={t('components.rideWizard.useCurrentLocation')}
          className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-lg transition-colors active:bg-gray-100"
        >
          {locating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <LocateFixed className="h-5 w-5" />
          )}
        </button>
      </div>
    </Sheet>
  );
}
