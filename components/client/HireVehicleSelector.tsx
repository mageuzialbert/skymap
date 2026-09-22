'use client';

import { useEffect, useState } from 'react';
import { Loader2, Truck, Users } from 'lucide-react';
import { OptionRow } from '@/components/wizard/OptionGroup';
import { useT } from '@/lib/i18n';

export interface HireVehicleOption {
  id: string;
  category: 'people' | 'load';
  name: string;
  capacity_value: number | null;
  capacity_unit: string | null;
  color: string | null;
  image_url: string | null;
  description: string | null;
}

interface Props {
  category: 'people' | 'load';
  value: string | null;
  onChange: (id: string, vehicle: HireVehicleOption) => void;
  disabled?: boolean;
}

// Single-column list of physical hire vehicles for the chosen category.
// Sensitive details (plate/driver/phone) are intentionally NOT shown here - // they are only revealed to the customer once the order is confirmed.
export default function HireVehicleSelector({ category, value, onChange, disabled }: Props) {
  const t = useT();
  const [vehicles, setVehicles] = useState<HireVehicleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/hire-vehicles?category=${category}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('load failed'))))
      .then((data: HireVehicleOption[]) => {
        if (!active) return;
        setVehicles(Array.isArray(data) ? data : []);
      })
      .catch(() => active && setError(t('components.hireVehicles.loadError')))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, t]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-[15px] text-red-600">{error}</p>;
  }

  if (vehicles.length === 0) {
    return (
      <p className="py-6 text-center text-[15px] text-gray-500">
        {t('components.hireVehicles.none')}
      </p>
    );
  }

  const Icon = category === 'people' ? Users : Truck;

  return (
    <div className="flex flex-col gap-3">
      {vehicles.map((v) => {
        // Capacity, colour and description are all optional in the catalogue,
        // so build the line from whatever is actually there - it used to lead
        // with a stray bullet when capacity was missing. `description` was
        // fetched and never shown at all.
        const parts = [
          v.capacity_value != null
            ? t('components.hireVehicles.capacity', {
                value: v.capacity_value,
                unit: v.capacity_unit || '',
              })
            : '',
          v.color || '',
          v.description || '',
        ].filter(Boolean);
        return (
          <OptionRow
            key={v.id}
            selected={value === v.id}
            onSelect={() => onChange(v.id, v)}
            disabled={disabled}
            title={v.name}
            subtitle={parts.join(', ') || null}
            imageUrl={v.image_url}
            icon={<Icon className="h-5 w-5" />}
          />
        );
      })}
    </div>
  );
}
