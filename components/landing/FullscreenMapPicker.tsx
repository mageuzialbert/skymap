'use client';

import { useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { X, MapPin, Check, Search, Loader2 } from 'lucide-react';

interface FullscreenMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number, lng: number) => void;
  initialPosition?: { lat: number; lng: number } | null;
  title?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const defaultCenter = {
  lat: -6.7924,
  lng: 39.2083,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

export default function FullscreenMapPicker({
  isOpen,
  onClose,
  onSelect,
  initialPosition,
  title = 'Select Location'
}: FullscreenMapPickerProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(
    initialPosition || null
  );
  const [address, setAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Update marker when initial position changes
  useEffect(() => {
    if (initialPosition) {
      setMarkerPosition(initialPosition);
    }
  }, [initialPosition]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    setMarkerPosition({ lat, lng });
    setIsGeocoding(true);
    
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results[0]) {
        setAddress(response.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Geocoding failed:', error);
      setAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    } finally {
      setIsGeocoding(false);
    }
  }, []);

  const handleConfirm = () => {
    if (markerPosition && address) {
      onSelect(address, markerPosition.lat, markerPosition.lng);
      onClose();
    }
  };

  const onMapLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    if (initialPosition) {
      mapInstance.panTo(initialPosition);
      mapInstance.setZoom(15);
    }
  }, [initialPosition]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-primary text-white safe-area-inset-top">
        <button onClick={onClose} className="p-2 -ml-2">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={initialPosition || defaultCenter}
          zoom={13}
          options={mapOptions}
          onClick={handleMapClick}
          onLoad={onMapLoad}
        >
          {markerPosition && (
            <Marker 
              position={markerPosition}
              animation={google.maps.Animation.DROP}
            />
          )}
        </GoogleMap>

        {/* Center Crosshair Hint */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-16 h-16 border-2 border-primary/30 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-primary rounded-full" />
          </div>
        </div>

        {/* Instruction */}
        <div className="absolute top-4 left-4 right-4">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-3 text-center">
            <p className="text-sm text-gray-600">
              <MapPin className="w-4 h-4 inline mr-1 text-primary" />
              Tap on the map to select a location
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-white border-t border-gray-200 p-4 safe-area-inset-bottom">
        {markerPosition ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {isGeocoding ? (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Getting address...</span>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 line-clamp-2">{address}</p>
                )}
              </div>
            </div>
            <button
              onClick={handleConfirm}
              disabled={!address || isGeocoding}
              className="w-full py-4 bg-primary text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
            >
              <Check className="w-5 h-5" />
              Confirm Location
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">
            Select a location on the map
          </p>
        )}
      </div>
    </div>
  );
}
