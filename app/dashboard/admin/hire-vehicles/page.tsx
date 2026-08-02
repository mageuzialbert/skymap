'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Loader2, Truck, Users } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface HireVehicle {
  id: string;
  category: 'people' | 'load';
  name: string;
  capacity_value: number | null;
  capacity_unit: string | null;
  plate_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  color: string | null;
  image_url: string | null;
  description: string | null;
  active: boolean;
  sort_order: number;
}

const EMPTY = {
  category: 'load' as 'people' | 'load',
  name: '',
  capacity_value: '',
  capacity_unit: 'tons',
  plate_number: '',
  driver_name: '',
  driver_phone: '',
  color: '',
  image_url: '',
  description: '',
  active: true,
  sort_order: 0,
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

export default function AdminHireVehiclesPage() {
  const t = useT();
  const [vehicles, setVehicles] = useState<HireVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<HireVehicle | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/admin/hire-vehicles');
      if (!res.ok) throw new Error(await readError(res));
      setVehicles(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.hireVehicles.errLoad'));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setFormData({ ...EMPTY, sort_order: vehicles.length });
    setError('');
  }

  function startEdit(v: HireVehicle) {
    setEditing(v);
    setFormData({
      category: v.category,
      name: v.name,
      capacity_value: v.capacity_value != null ? String(v.capacity_value) : '',
      capacity_unit: v.capacity_unit || (v.category === 'people' ? 'people' : 'tons'),
      plate_number: v.plate_number || '',
      driver_name: v.driver_name || '',
      driver_phone: v.driver_phone || '',
      color: v.color || '',
      image_url: v.image_url || '',
      description: v.description || '',
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
        category: formData.category,
        name: formData.name,
        capacity_value: formData.capacity_value === '' ? null : formData.capacity_value,
        capacity_unit: formData.capacity_unit || null,
        plate_number: formData.plate_number || null,
        driver_name: formData.driver_name || null,
        driver_phone: formData.driver_phone || null,
        color: formData.color || null,
        image_url: formData.image_url || null,
        description: formData.description || null,
        active: formData.active,
        sort_order: Number(formData.sort_order),
      };
      const res = editing
        ? await fetch(`/api/admin/hire-vehicles/${editing.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/hire-vehicles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      if (!res.ok) throw new Error(await readError(res));
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.hireVehicles.errSave'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.hireVehicles.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/admin/hire-vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.hireVehicles.errDelete'));
    }
  }

  const inputCls =
    'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent';

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
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{t('admin.hireVehicles.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('admin.hireVehicles.subtitle')}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors w-full sm:w-auto justify-center"
          >
            <Plus className="w-5 h-5" />
            {t('admin.hireVehicles.add')}
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
              {editing ? t('admin.hireVehicles.editTitle') : t('admin.hireVehicles.addTitle')}
            </h2>
            <button onClick={resetForm} className="text-gray-500 hover:text-gray-700 p-2 -mr-2">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.category')}
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const category = e.target.value as 'people' | 'load';
                    setFormData((f) => ({
                      ...f,
                      category,
                      capacity_unit: category === 'people' ? 'people' : 'tons',
                    }));
                  }}
                  className={inputCls}
                >
                  <option value="load">{t('admin.hireVehicles.categoryLoad')}</option>
                  <option value="people">{t('admin.hireVehicles.categoryPeople')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.nameLabel')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('admin.hireVehicles.namePlaceholder')}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.capacity')}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.1"
                  value={formData.capacity_value}
                  onChange={(e) => setFormData({ ...formData, capacity_value: e.target.value })}
                  placeholder={formData.category === 'people' ? '30' : '7'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.capacityUnit')}
                </label>
                <input
                  type="text"
                  value={formData.capacity_unit}
                  onChange={(e) => setFormData({ ...formData, capacity_unit: e.target.value })}
                  placeholder={formData.category === 'people' ? 'people' : 'tons'}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.displayOrder')}
                </label>
                <input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.plateNumber')}
                </label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({ ...formData, plate_number: e.target.value })}
                  placeholder="T123 ABC"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.color')}
                </label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder={t('admin.hireVehicles.colorPlaceholder')}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.driverName')}
                </label>
                <input
                  type="text"
                  value={formData.driver_name}
                  onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.hireVehicles.driverPhone')}
                </label>
                <input
                  type="tel"
                  value={formData.driver_phone}
                  onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  placeholder="0712345678"
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.hireVehicles.imageUrl')}
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                placeholder="https://"
                className={inputCls}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.hireVehicles.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className={inputCls}
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
                <span className="ml-3 text-sm font-medium text-gray-700">{t('admin.common.active')}</span>
              </label>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none bg-gray-100 text-gray-700 px-6 py-2.5 rounded-full hover:bg-gray-200 transition-colors font-medium"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={submitting || !formData.name}
                className="flex-1 sm:flex-none bg-primary text-white px-6 py-2.5 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('common.save')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-md divide-y divide-gray-200">
        {vehicles.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Truck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('admin.hireVehicles.empty')}</p>
          </div>
        ) : (
          vehicles.map((v) => {
            const Icon = v.category === 'people' ? Users : Truck;
            return (
              <div key={v.id} className="p-4 flex gap-4 items-center">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {v.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={v.image_url} alt={v.name} className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Icon className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-xs font-medium text-gray-400">#{v.sort_order}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {v.category === 'people'
                        ? t('admin.hireVehicles.categoryPeople')
                        : t('admin.hireVehicles.categoryLoad')}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        v.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {v.active ? t('admin.common.active') : t('admin.common.inactive')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                  <p className="text-xs text-gray-500">
                    {v.capacity_value != null && `${v.capacity_value} ${v.capacity_unit || ''}`}
                    {v.plate_number && ` • ${v.plate_number}`}
                    {v.color && ` • ${v.color}`}
                    {v.driver_name && ` • ${v.driver_name}`}
                    {v.driver_phone && ` (${v.driver_phone})`}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <button
                      onClick={() => startEdit(v)}
                      className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
                    >
                      {t('common.delete')}
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
