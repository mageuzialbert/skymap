'use client';

import { useEffect, useState } from 'react';
import { Bike, Car, Truck, Zap, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';

export interface VehicleAvailability {
  id: string;
  key: string;
  name: string;
  icon_url: string | null;
}

const ICON_BY_KEY: Record<string, any> = {
  boda: Bike,
  bajaj: Truck,
  electric: Zap,
  car: Car,
};

interface VehicleSelectorProps {
  value: string | null;
  onChange: (vehicleTypeId: string) => void;
  disabled?: boolean;
}

/**
 * Client-facing means-of-transport picker. Price is intentionally hidden.
 * Every active vehicle type is always selectable - availability is handled by
 * admin dispatch, never blocking the customer from ordering.
 */
export default function VehicleSelector({ value, onChange, disabled }: VehicleSelectorProps) {
  const t = useT();
  const [types, setTypes] = useState<VehicleAvailability[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch('/api/vehicle-types')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: any[]) => {
        if (!active) return;
        // Only offer active types; historical/inactive types are still returned by
        // this endpoint for name lookups elsewhere.
        setTypes(Array.isArray(data) ? data.filter((t) => t.active !== false) : []);
      })
      .catch(() => active && setTypes([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (types.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-2">{t('ride.selectVehicle')} - no vehicle types configured.</p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {types.map((vt) => {
        const Icon = ICON_BY_KEY[vt.key] || Car;
        const selected = value === vt.id;
        return (
          <button
            key={vt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(vt.id)}
            className={`relative flex flex-col items-start gap-2 p-3.5 rounded-2xl border-2 text-left transition-all ${
              selected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-primary/50 cursor-pointer'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {vt.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={vt.icon_url} alt={vt.name} className="w-6 h-6 object-contain" />
              ) : (
                <Icon className="w-5 h-5" />
              )}
            </div>
            <span className="text-sm font-semibold text-gray-900 leading-tight">{vt.name}</span>
          </button>
        );
      })}
    </div>
  );
}
