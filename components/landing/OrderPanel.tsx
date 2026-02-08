'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Package } from 'lucide-react';
import { LocationState } from './types';
import LocationCard from './LocationCard';
import FullscreenMapPicker from './FullscreenMapPicker';

interface OrderPanelProps {
  pickup: LocationState;
  dropoff: LocationState;
  onPickupChange: (field: keyof LocationState, value: any) => void;
  onDropoffChange: (field: keyof LocationState, value: any) => void;
  onPhoneBlur: (phone: string) => void;
  isCheckingPhone: boolean;
}

export default function OrderPanel({
  pickup,
  dropoff,
  onPickupChange,
  onDropoffChange,
  onPhoneBlur,
  isCheckingPhone
}: OrderPanelProps) {
  const router = useRouter();
  const [expandedSection, setExpandedSection] = useState<'pickup' | 'dropoff'>('pickup');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mapPickerOpen, setMapPickerOpen] = useState<'pickup' | 'dropoff' | null>(null);

  // Validation
  const isPickupValid = !!(pickup.address && pickup.phone && pickup.phone.length >= 10);
  const isDropoffValid = !!(dropoff.address && dropoff.phone && dropoff.phone.length >= 10);
  const canContinue = isPickupValid && isDropoffValid;

  const handleContinue = async () => {
    if (!canContinue) return;
    
    setIsSubmitting(true);
    
    try {
      const orderData = { pickup, dropoff };
      localStorage.setItem('skymap_temp_order', JSON.stringify(orderData));
      router.push('/quick-order?autoload=true');
    } catch (error) {
      console.error('Error proceeding:', error);
      setIsSubmitting(false);
    }
  };

  const handleMapSelect = (address: string, lat: number, lng: number) => {
    if (mapPickerOpen === 'pickup') {
      onPickupChange('address', address);
      onPickupChange('latitude', lat);
      onPickupChange('longitude', lng);
    } else if (mapPickerOpen === 'dropoff') {
      onDropoffChange('address', address);
      onDropoffChange('latitude', lat);
      onDropoffChange('longitude', lng);
    }
  };

  return (
    <>
      {/* Main Panel */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.12)] z-10">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Cards Container */}
        <div className="px-4 pb-4 space-y-3 max-h-[55vh] overflow-y-auto">
          <LocationCard
            title="Pickup Details"
            type="pickup"
            data={pickup}
            onChange={onPickupChange}
            isExpanded={expandedSection === 'pickup'}
            onToggle={() => setExpandedSection(expandedSection === 'pickup' ? 'dropoff' : 'pickup')}
            onPhoneBlur={onPhoneBlur}
            onOpenMapPicker={() => setMapPickerOpen('pickup')}
            isValid={isPickupValid}
            isCheckingPhone={isCheckingPhone}
          />

          <LocationCard
            title="Dropoff Details"
            type="dropoff"
            data={dropoff}
            onChange={onDropoffChange}
            isExpanded={expandedSection === 'dropoff'}
            onToggle={() => setExpandedSection(expandedSection === 'dropoff' ? 'pickup' : 'dropoff')}
            onOpenMapPicker={() => setMapPickerOpen('dropoff')}
            isValid={isDropoffValid}
          />

          {/* Package Details - Compact */}
          <div className="relative">
            <input
              type="text"
              placeholder="Package details (optional)"
              className="w-full pl-11 pr-4 py-3 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50"
            />
            <Package className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* CTA Button - Fixed at bottom of panel */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleContinue}
            disabled={!canContinue || isSubmitting}
            className={`w-full py-4 text-base font-bold text-white rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
              canContinue
                ? 'bg-primary shadow-lg shadow-primary/30' 
                : 'bg-gray-300'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Fullscreen Map Picker */}
      <FullscreenMapPicker
        isOpen={mapPickerOpen !== null}
        onClose={() => setMapPickerOpen(null)}
        onSelect={handleMapSelect}
        initialPosition={
          mapPickerOpen === 'pickup' && pickup.latitude && pickup.longitude
            ? { lat: pickup.latitude, lng: pickup.longitude }
            : mapPickerOpen === 'dropoff' && dropoff.latitude && dropoff.longitude
            ? { lat: dropoff.latitude, lng: dropoff.longitude }
            : null
        }
        title={mapPickerOpen === 'pickup' ? 'Select Pickup Location' : 'Select Dropoff Location'}
      />
    </>
  );
}
