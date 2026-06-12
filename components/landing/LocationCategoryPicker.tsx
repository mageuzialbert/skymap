'use client';

import { useEffect, useState } from 'react';
import { X, ChevronRight, MapPin, Loader2, ArrowLeft } from 'lucide-react';

interface Place {
  id: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface Category {
  id: string;
  key: string;
  name: string;
  icon: string | null;
  places: Place[];
}

interface LocationCategoryPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (address: string, lat: number | null, lng: number | null) => void;
  title?: string;
}

/**
 * "Suggestions" location option: pick a category (Bus Stand, Airport, Hospital…)
 * then a place. Returns the place's address + coordinates.
 */
export default function LocationCategoryPicker({
  isOpen,
  onClose,
  onSelect,
  title = 'Suggested places',
}: LocationCategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<Category | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setActiveCat(null);
    fetch('/api/places')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Category[]) => setCategories(Array.isArray(data) ? data : []))
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [onClose]);

  if (!isOpen) return null;

  function pickPlace(p: Place) {
    const address = p.address ? `${p.name}, ${p.address}` : p.name;
    onSelect(address, p.latitude != null ? Number(p.latitude) : null, p.longitude != null ? Number(p.longitude) : null);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85dvh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            {activeCat && (
              <button onClick={() => setActiveCat(null)} className="p-1 -ml-1 text-gray-500 hover:text-gray-800">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg font-bold text-gray-900">{activeCat ? activeCat.name : title}</h2>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500 hover:text-gray-800" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-10">No suggestions available.</p>
          ) : !activeCat ? (
            categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c)}
                disabled={c.places.length === 0}
                className="w-full flex items-center justify-between px-3 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                <span className="flex items-center gap-3 text-gray-800">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </span>
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-gray-400">({c.places.length})</span>
                </span>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </button>
            ))
          ) : (
            activeCat.places.map((p) => (
              <button
                key={p.id}
                onClick={() => pickPlace(p)}
                className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
              >
                <MapPin className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <span>
                  <span className="block font-medium text-gray-900">{p.name}</span>
                  {p.address && <span className="block text-xs text-gray-500">{p.address}</span>}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
