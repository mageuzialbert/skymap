'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUserRole } from '@/lib/roles';
import { Loader2, Plus, Edit, Trash2, Star, StarOff } from 'lucide-react';
import { useT } from '@/lib/i18n';

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('admin.deliveryPackages.title')}</h1>
          <p className="text-gray-600 mt-1">{t('admin.deliveryPackages.subtitle')}</p>
        </div>
        {role === 'ADMIN' && (
          <button
            onClick={handleNewPackage}
            className="bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            {t('admin.deliveryPackages.new')}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Packages Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.common.description')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.deliveryPackages.feePerDelivery')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('common.status')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('admin.deliveryPackages.default')}
              </th>
              {role === 'ADMIN' && (
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {packages.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  {t('admin.deliveryPackages.empty')}
                </td>
              </tr>
            ) : (
              packages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{pkg.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{pkg.description || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(pkg.fee_per_delivery)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        pkg.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {pkg.active ? t('admin.common.active') : t('admin.common.inactive')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {pkg.is_default ? (
                      <span className="inline-flex items-center gap-1 text-yellow-600">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{t('admin.deliveryPackages.default')}</span>
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  {role === 'ADMIN' && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {!pkg.is_default && (
                          <button
                            onClick={() => handleSetDefault(pkg)}
                            className="text-yellow-600 hover:text-yellow-800"
                            title={t('admin.deliveryPackages.setAsDefault')}
                          >
                            <StarOff className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEdit(pkg)}
                          className="text-blue-600 hover:text-blue-800"
                          title={t('common.edit')}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(pkg)}
                          className="text-red-600 hover:text-red-800"
                          title={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingPackage ? t('admin.deliveryPackages.editTitle') : t('admin.deliveryPackages.newTitle')}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.deliveryPackages.nameLabel')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('admin.deliveryPackages.namePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.common.description')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder={t('admin.deliveryPackages.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.deliveryPackages.feeLabel')}
                </label>
                <input
                  type="number"
                  value={formData.fee_per_delivery}
                  onChange={(e) => setFormData({ ...formData, fee_per_delivery: e.target.value })}
                  required
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent"
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingPackage(null);
                    setError('');
                  }}
                  disabled={submitting}
                  className="flex-1 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {submitting ? t('common.saving') : editingPackage ? t('admin.deliveryPackages.update') : t('admin.deliveryPackages.create')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
