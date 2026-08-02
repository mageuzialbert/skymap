'use client';

import { useEffect, useState } from 'react';
import { Loader2, Truck, Users, Check } from 'lucide-react';
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
    return <p className="text-sm text-red-600 py-4">{error}</p>;
  }

  if (vehicles.length === 0) {
    return <p className="text-sm text-gray-500 py-6 text-center">{t('components.hireVehicles.none')}</p>;
  }

  const Icon = category === 'people' ? Users : Truck;

  return (
    <div className="flex flex-col gap-3">
      {vehicles.map((v) => {
        const selected = value === v.id;
        return (
          <button
            key={v.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(v.id, v)}
            className={`relative flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
              selected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-gray-200 hover:border-primary/50 cursor-pointer'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
                selected ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              {v.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.image_url} alt={v.name} className="w-full h-full object-cover" />
              ) : (
                <Icon className="w-6 h-6" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900 leading-tight">{v.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {v.capacity_value != null &&
                  t('components.hireVehicles.capacity', {
                    value: v.capacity_value,
                    unit: v.capacity_unit || '',
                  })}
                {v.color && ` • ${v.color}`}
              </p>
            </div>
            {selected && <Check className="w-5 h-5 text-primary shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
