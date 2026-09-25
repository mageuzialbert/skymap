'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import { Loader2, Plus, Edit, Trash2, Star, StarOff, FolderOpen } from 'lucide-react';
import FormSheet from '@/components/common/FormSheet';
import { EmptyState, RecordList, RecordRow } from '@/components/common/RecordList';
import { useT } from '@/lib/i18n';
import { activeDot, activeLabelKey, activeText } from '@/lib/userStatus';
import { fieldLabel, inputClass, pageTitle } from '@/lib/ui';

interface DeliveryPackage {
  id: string;
  name: string;
  description: string | null;
  fee_per_delivery: number;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface PackageFormData {
  name: string;
  description: string;
  fee_per_delivery: string;
  is_default: boolean;
  active: boolean;
}

export default function AdminDeliveryPackagesPage() {
  const router = useRouter();
  const t = useT();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<DeliveryPackage[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<DeliveryPackage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    fee_per_delivery: '',
    is_default: false,
    active: true,
  });

  useEffect(() => {
    async function checkRole() {
      const userRole = await getUserRole();
      if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
        router.push('/dashboard/business');
        return;
      }
      setRole(userRole);
      loadPackages();
    }
    checkRole();
  }, [router]);

  async function loadPackages() {
    try {
      const response = await fetch('/api/admin/delivery-packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Error loading packages:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleNewPackage() {
    setEditingPackage(null);
    setFormData({
      name: '',
      description: '',
      fee_per_delivery: '',
      is_default: false,
      active: true,
    });
    setError('');
    setShowForm(true);
  }

  function handleEdit(pkg: DeliveryPackage) {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      fee_per_delivery: pkg.fee_per_delivery.toString(),
      is_default: pkg.is_default,
      active: pkg.active,
    });
    setError('');
    setShowForm(true);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const fee = parseFloat(formData.fee_per_delivery);
      if (isNaN(fee) || fee < 0) {
        throw new Error(t('admin.deliveryPackages.feeError'));
      }

      const url = editingPackage
        ? `/api/admin/delivery-packages/${editingPackage.id}`
        : '/api/admin/delivery-packages';
      const method = editingPackage ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          fee_per_delivery: fee,
          is_default: formData.is_default,
          active: formData.active,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('admin.deliveryPackages.errSave'));
      }

      setShowForm(false);
      setEditingPackage(null);
      loadPackages();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.deliveryPackages.errSave'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(pkg: DeliveryPackage) {
    if (!confirm(pkg.active ? t('admin.deliveryPackages.confirmDeactivate') : t('admin.deliveryPackages.confirmDelete'))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/delivery-packages/${pkg.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || t('admin.deliveryPackages.errDelete'));
      }

      loadPackages();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.deliveryPackages.errDelete'));
    }
  }

  async function handleSetDefault(pkg: DeliveryPackage) {
    try {
      const response = await fetch(`/api/admin/delivery-packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_default: true }),
      });

      if (!response.ok) {
        throw new Error(t('admin.deliveryPackages.errSetDefault'));
      }

      loadPackages();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('admin.deliveryPackages.errSetDefault'));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className={pageTitle}>{t('admin.deliveryPackages.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.deliveryPackages.subtitle')}</p>
        </div>
        {role === 'ADMIN' && (
          <button
            onClick={handleNewPackage}
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">{t('admin.deliveryPackages.new')}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {packages.length === 0 ? (
        <EmptyState icon={FolderOpen} title={t('admin.deliveryPackages.empty')} />
      ) : (
        <RecordList>
          {packages.map((pkg) => (
            <RecordRow
              key={pkg.id}
              title={pkg.name}
              trailing={formatCurrency(pkg.fee_per_delivery)}
              subtitle={pkg.description || '—'}
              meta={
                pkg.is_default ? (
                  <span className="inline-flex items-center gap-1 text-amber-600">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    {t('admin.deliveryPackages.default')}
                  </span>
                ) : undefined
              }
              status={{
                dot: activeDot(pkg.active),
                text: activeText(pkg.active),
                label: t(activeLabelKey(pkg.active)),
              }}
              actions={
                role === 'ADMIN' && (
                  <>
                    {!pkg.is_default && (
                      <PackageAction onClick={() => handleSetDefault(pkg)}>
                        {t('admin.deliveryPackages.setAsDefault')}
                      </PackageAction>
                    )}
                    <PackageAction onClick={() => handleEdit(pkg)}>{t('common.edit')}</PackageAction>
                    <PackageAction onClick={() => handleDelete(pkg)} tone="danger">
                      {t('common.delete')}
                    </PackageAction>
                  </>
                )
              }
            />
          ))}
        </RecordList>
      )}

      <FormSheet
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingPackage(null);
          setError('');
        }}
        onSubmit={() => handleSubmit()}
        submitting={submitting}
        error={error}
        title={
          editingPackage
            ? t('admin.deliveryPackages.editTitle')
            : t('admin.deliveryPackages.newTitle')
        }
      >
              <div>
                <label className={fieldLabel}>
                  {t('admin.deliveryPackages.nameLabel')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className={inputClass}
                  placeholder={t('admin.deliveryPackages.namePlaceholder')}
                />
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.common.description')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={inputClass}
                  placeholder={t('admin.deliveryPackages.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className={fieldLabel}>
                  {t('admin.deliveryPackages.feeLabel')}
                </label>
                <input
                  type="number"
                  value={formData.fee_per_delivery}
                  onChange={(e) => setFormData({ ...formData, fee_per_delivery: e.target.value })}
                  required
                  step="0.01"
                  min="0"
                  className={inputClass}
                  placeholder={t('admin.deliveryPackages.feePlaceholder')}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="is_default" className="text-sm font-medium text-gray-700">
                  {t('admin.deliveryPackages.setDefaultCheckbox')}
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">
                  {t('admin.deliveryPackages.activeLabel')}
                </label>
              </div>

      </FormSheet>
    </div>
  );
}

/** A small secondary action under a package row. */
function PackageAction({
  children,
  onClick,
  tone,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-[2.25rem] items-center rounded-full border px-3 text-[13px] font-semibold transition-colors ${
        tone === 'danger'
          ? 'border-red-200 text-red-600 active:bg-red-50'
          : 'border-gray-200 text-gray-700 active:bg-gray-100'
      }`}
    >
      {children}
    </button>
  );
}
