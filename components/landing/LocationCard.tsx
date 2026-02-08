'use client';

import { useState } from 'react';
import { MapPin, Phone, User, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import AddressInput from './AddressInput';
import { LocationState } from './types';

interface LocationCardProps {
  title: string;
  type: 'pickup' | 'dropoff';
  data: LocationState;
  onChange: (field: keyof LocationState, value: any) => void;
  isExpanded: boolean;
  onToggle: () => void;
  onPhoneBlur?: (phone: string) => void;
  onOpenMapPicker: () => void;
  isValid?: boolean;
  isCheckingPhone?: boolean;
}

export default function LocationCard({
  title,
  type,
  data,
  onChange,
  isExpanded,
  onToggle,
  onPhoneBlur,
  onOpenMapPicker,
  isValid = false,
  isCheckingPhone = false
}: LocationCardProps) {
  const iconColor = type === 'pickup' ? 'text-blue-500 bg-blue-100' : 'text-amber-500 bg-amber-100';

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}>
      {/* Header */}
      <button 
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 active:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${iconColor}`}>
            <MapPin className="w-5 h-5" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            {!isExpanded && data.address && (
              <p className="text-sm text-gray-500 truncate max-w-[180px]">{data.address}</p>
            )}
            {!isExpanded && !data.address && (
              <p className="text-sm text-gray-400">Tap to enter details</p>
            )}
          </div>
        </div>
        <div className={`p-1 rounded-full transition-colors ${isExpanded ? 'bg-primary/10' : ''}`}>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-primary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Address Input */}
          <AddressInput
            value={data.address}
            onChange={(address, lat, lng) => {
              onChange('address', address);
              onChange('latitude', lat);
              onChange('longitude', lng);
            }}
            onMapClick={onOpenMapPicker}
            placeholder={type === 'pickup' ? 'Pickup location' : 'Dropoff location'}
            icon={type}
          />

          {/* Phone & Name - Compact Row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="tel"
                value={data.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                onBlur={() => onPhoneBlur?.(data.phone)}
                placeholder="Phone"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              {isCheckingPhone && (
                <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-primary" />
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                value={data.name}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="Name"
                className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
