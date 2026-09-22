'use client';

import { useEffect, useState } from 'react';
import { Plus, X, Loader2, Motorbike, Car, Zap } from 'lucide-react';
import Bajaj from '@/components/common/BajajIcon';
import Alert from '@/components/common/Alert';
import FormSheet from '@/components/common/FormSheet';
import { useT } from '@/lib/i18n';
import { cardClass, fieldLabel, inputClass, pageTitle, pillPrimary } from '@/lib/ui';

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
  boda: Motorbike,
  bajaj: Bajaj,
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
  const t = useT();
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
      setError(err instanceof Error ? err.message : t('admin.vehicles.errLoad'));
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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
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
      setError(err instanceof Error ? err.message : t('admin.vehicles.errSave'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t('admin.vehicles.deleteConfirm'))) return;
    try {
      const res = await fetch(`/api/admin/vehicles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(await readError(res));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.vehicles.errDelete'));
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
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className={pageTitle}>{t('admin.vehicles.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('admin.vehicles.subtitle')}
          </p>
        </div>
        {(
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className={pillPrimary}
          >
            <Plus className="w-5 h-5" />
            {t('admin.vehicles.add')}
          </button>
        )}
      </div>

      {error && !showForm && (
        <Alert tone="error" className="mb-4">
          {error}
        </Alert>
      )}

      <FormSheet
        open={showForm}
        onClose={resetForm}
        onSubmit={() => handleSubmit()}
        submitting={submitting}
        title={editing ? t('admin.vehicles.editTitle') : t('admin.vehicles.addTitle')}
      >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={fieldLabel}>{t('admin.vehicles.nameLabel')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('admin.vehicles.namePlaceholder')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>
                  {editing ? t('admin.vehicles.keyReadonly') : t('admin.vehicles.keyOptional')}
                </label>
                <input
                  type="text"
                  value={formData.key}
                  disabled={!!editing}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                  placeholder="boda"
                  className={`${inputClass} disabled:bg-gray-100`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={fieldLabel}>
                  {t('admin.vehicles.priceLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder={t('common.optional')}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={fieldLabel}>{t('admin.vehicles.displayOrder')}</label>
                <input
                  type="number"
                  min={0}
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className={fieldLabel}>{t('admin.vehicles.iconUrl')}</label>
              <input
                type="url"
                value={formData.icon_url}
                onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                placeholder="https://"
                className={inputClass}
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

      </FormSheet>

      <div className={`${cardClass} divide-y divide-gray-100 overflow-hidden`}>
        {vehicles.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Motorbike className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">{t('admin.vehicles.empty')}</p>
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
                      {v.active ? t('admin.common.active') : t('admin.common.inactive')}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">{v.name}</p>
                  <p className="text-xs text-gray-500">
                    {v.key}
                    {v.price != null && ` • TZS ${Number(v.price).toLocaleString()} (${t('admin.vehicles.hiddenTag')})`}
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
