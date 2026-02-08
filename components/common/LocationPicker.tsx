'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from 'use-places-autocomplete';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  label: string;
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
  defaultLocation?: { lat: number; lng: number };
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

const mapContainerStyle = {
  width: '100%',
  height: '300px',
  borderRadius: '0.5rem',
};

const defaultCenter = {
  lat: -6.7924, // Dar es Salaam center (approx)
  lng: 39.2083,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  streetViewControl: false,
};

export default function LocationPicker({
  label,
  value,
  onChange,
  defaultLocation,
  error,
  disabled = false,
  placeholder,
}: LocationPickerProps) {
  const [markerPosition, setMarkerPosition] = useState<google.maps.LatLngLiteral | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const {
    ready,
    value: searchValue,
    suggestions: { status, data },
    setValue: setSearchValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      // Define search scope if needed (e.g., Tanzania)
      componentRestrictions: { country: 'tz' },
    },
    debounce: 300,
    defaultValue: value,
  });

  // Sync internal search value with prop value if it changes externally
  useEffect(() => {
    if (value !== searchValue) {
        // Only update if significantly different to avoid loops, 
        // but typically usePlacesAutocomplete manages this.
        // We'll trust the prop for initial load or external resets.
        setSearchValue(value, false);
    }
  }, [value, setSearchValue]);

  const handleSelect = async (address: string) => {
    setSearchValue(address, false);
    clearSuggestions();

    try {
      const results = await getGeocode({ address });
      const { lat, lng } = getLatLng(results[0]);
      
      setMarkerPosition({ lat, lng });
      mapRef.current?.panTo({ lat, lng });
      mapRef.current?.setZoom(15);
      
      onChange(address, lat, lng);
    } catch (error) {
      console.error('Error selecting location:', error);
    }
  };

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    if (disabled || !e.latLng) return;
    
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    
    setMarkerPosition({ lat, lng });
    
    // Optional: Reverse geocode to get address from click
    try {
        const geocoder = new google.maps.Geocoder();
        const response = await geocoder.geocode({ location: { lat, lng } });
        if (response.results[0]) {
            const address = response.results[0].formatted_address;
            setSearchValue(address, false);
            onChange(address, lat, lng);
        } else {
             // Just update coords if no address found
            onChange(searchValue, lat, lng);
        }
    } catch (err) {
        console.error("Geocoding failed", err);
        // Still update coords
        onChange(searchValue, lat, lng);
    }
  };

  const onMapLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    if (defaultLocation) {
        setMarkerPosition(defaultLocation);
        map.panTo(defaultLocation);
    } else if (!markerPosition) {
        // If no value, center map but don't set marker
    }
  };

  return (
    <div className="space-y-2">
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MapPin className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          disabled={!ready || disabled}
          className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
            error ? 'border-red-300 focus:ring-red-200' : 'border-gray-300'
          }`}
          placeholder={placeholder || "Search address..."}
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
             {!ready && <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />}
        </div>
        
        {/* Suggestions Dropdown */}
        {status === "OK" && (
          <ul className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {data.map(({ place_id, description }) => (
              <li
                key={place_id}
                onClick={() => handleSelect(description)}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2"
              >
                <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span>{description}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Google Map */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          zoom={13}
          center={markerPosition || defaultCenter}
          options={mapOptions}
          onClick={handleMapClick}
          onLoad={onMapLoad}
        >
          {markerPosition && <Marker position={markerPosition} />}
        </GoogleMap>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
