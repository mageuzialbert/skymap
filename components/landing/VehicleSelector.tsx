'use client';

import { useEffect, useState } from 'react';
import { Motorbike, Car, Zap, Loader2 } from 'lucide-react';
import Bajaj from '@/components/common/BajajIcon';
import { OptionRow } from '@/components/wizard/OptionGroup';
import { useT } from '@/lib/i18n';

export interface VehicleType {
  id: string;
  key: string;
  name: string;
  icon_url: string | null;
}

const ICON_BY_KEY: Record<string, any> = {
  boda: Motorbike,
  bajaj: Bajaj,
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
  const [types, setTypes] = useState<VehicleType[]>([]);
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
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (types.length === 0) {
    return <p className="py-2 text-[15px] text-gray-500">{t('components.rideWizard.noVehicles')}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {types.map((vt) => {
        const Icon = ICON_BY_KEY[vt.key] || Car;
        return (
          <OptionRow
            key={vt.id}
            selected={value === vt.id}
            onSelect={() => onChange(vt.id)}
            disabled={disabled}
            title={vt.name}
            imageUrl={vt.icon_url}
            imageFit="contain"
            icon={<Icon className="h-5 w-5" />}
          />
        );
      })}
    </div>
  );
}
