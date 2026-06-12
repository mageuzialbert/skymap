'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Loader2, Bike, Car, Truck, Zap } from 'lucide-react';

interface VehicleType {
  id: string;
  key: string;
  name: string;
  icon_url: string | null;
  price: number | null;
  active: boolean;
  sort_order: number;
}

const ICON_BY_KEY: Record<string, any> = {
  boda: Bike,
  bajaj: Truck,
  electric: Zap,
  car: Car,
};

async function readError(res: Response): Promise<string> {
  const text = await res.text().catch(() => '');
  if (!text) return `Request failed (HTTP ${res.status})`;
  try {
    return JSON.parse(text)?.error || `Request failed (HTTP ${res.status})`;
  } catch {
    return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
}

export default function AdminVehiclesPage() {
  const [vehicles, setVehicles] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<VehicleType | null>(null);
  const [formData, setFormData] = useState({
    key: '',
    name: '',
    icon_url: '',
    price: '',
    active: true,
    sort_order: 0,
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/admin/vehicles');
      if (!res.ok) throw new Error(await readError(res));
      setVehicles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load vehicle types');
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormData({ key: '', name: '', icon_url: '', price: '', active: true, sort_order: vehicles.length });
    setError('');
  }

  function startEdit(v: VehicleType) {
    setEditing(v);
    setFormData({
      key: v.key,
      name: v.name,
      icon_url: v.icon_url || '',
      price: v.price != null ? String(v.price) : '',
      active: v.active,
      sort_order: v.sort_order,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const payload = {
        key: formData.key || undefined,
        name: formData.name,
        icon_url: formData.icon_url || null,
        price: formData.price === '' ? null : formData.price,
        active: formData.active,
        sort_order: Number(formData.sort_order),
      };
      const res = editing
        ? await fetch(`/api/admin/vehicles/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await readError(res));
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save vehicle type');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this vehicle type?')) return;
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete vehicle type');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Means of Transport</h1>
          <p className="text-sm text-gray-500 mt-1">
            Boda, Bajaj, Electric, Car. Price is stored but currently hidden from clients.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            Add Vehicle Type
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg sm:text-xl font-semibold">
              {editing ? 'Edit Vehicle Type' : 'Add Vehicle Type'}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-2 -mr-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Boda (Motorcycle)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Key {editing ? '(read-only)' : '(optional)'}
                </label>
                <input
                  type="text"
                  value={formData.key}
                  disabled={!!editing}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="boda"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (TZS) — hidden from clients
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="Optional"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Icon URL (optional)</label>
              <input
                type="url"
                value={formData.icon_url}
                onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                placeholder="https://"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="flex items-center">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                <span className="ml-3 text-sm font-medium text-gray-700">Active</span>
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.name}
                className="flex-1 sm:flex-none bg-primary text-white px-6 py-2.5 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md divide-y divide-gray-200">
        {vehicles.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Bike className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No vehicle types yet.</p>
          </div>
        ) : (
          vehicles.map((v) => {
            const Icon = ICON_BY_KEY[v.key] || Car;
            return (
              <div key={v.id} className="p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {v.icon_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.icon_url} alt={v.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <Icon className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-medium text-gray-400">#{v.sort_order}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        v.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {v.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                  <p className="text-xs text-gray-500">
                    {v.key}
                    {v.price != null && ` • TZS ${Number(v.price).toLocaleString()} (hidden)`}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={() => startEdit(v)}
                      className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
