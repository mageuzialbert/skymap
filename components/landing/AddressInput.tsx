'use client';

import { useState, useRef, useEffect } from 'react';
import { MapPin, Map, Loader2 } from 'lucide-react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';

interface AddressInputProps {
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
  onMapClick: () => void;
  placeholder?: string;
  icon?: 'pickup' | 'dropoff';
}

export default function AddressInput({
  value,
  onChange,
  onMapClick,
  placeholder = 'Enter address...',
  icon = 'pickup'
}: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const {
    ready,
    value: searchValue,
    suggestions: { status, data },
    setValue: setSearchValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      componentRestrictions: { country: 'tz' },
    },
    debounce: 300,
    defaultValue: value,
  });

  // Sync with external value
  useEffect(() => {
    if (value !== searchValue) {
      setSearchValue(value, false);
    }
  }, [value, setSearchValue]);

  const handleSelect = async (address: string) => {
    setSearchValue(address, false);
    clearSuggestions();
    
    try {
      const results = await getGeocode({ address });
      const { lat, lng } = getLatLng(results[0]);
      onChange(address, lat, lng);
    } catch (error) {
      console.error('Error geocoding:', error);
      onChange(address, null, null);
    }
  };

  const iconColor = icon === 'pickup' ? 'text-blue-500' : 'text-amber-500';
  const iconBg = icon === 'pickup' ? 'bg-blue-50' : 'bg-amber-50';

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
        {/* Icon */}
        <div className={`p-3 ${iconBg}`}>
          <MapPin className={`w-5 h-5 ${iconColor}`} />
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          disabled={!ready}
          placeholder={placeholder}
          className="flex-1 py-3 pr-2 text-gray-900 placeholder-gray-400 focus:outline-none text-sm"
        />

        {/* Map Button */}
        <button
          type="button"
          onClick={onMapClick}
          className="p-3 text-gray-400 hover:text-primary hover:bg-gray-50 transition-colors"
          title="Select on map"
        >
          <Map className="w-5 h-5" />
        </button>
      </div>

      {/* Suggestions Dropdown */}
      {status === 'OK' && (
        <ul className="absolute z-50 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-xl max-h-48 overflow-auto">
          {data.map(({ place_id, description }) => (
            <li
              key={place_id}
              onClick={() => handleSelect(description)}
              className="px-4 py-3 hover:bg-gray-50 cursor-pointer text-sm text-gray-700 flex items-center gap-2 border-b border-gray-100 last:border-b-0 active:bg-gray-100"
            >
              <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="truncate">{description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
