'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface PaymentInstructions {
  id: string;
  title: string;
  instructions: string;
  bank_name: string | null;
  account_name: string | null;
  account_number: string | null;
  swift_code: string | null;
  branch: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export default function AdminPaymentInstructionsPage() {
  const t = useT();
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: 'Payment Instructions',
    instructions: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    swift_code: '',
    branch: '',
    active: true,
  });

  useEffect(() => {
    loadInstructions();
  }, []);

  async function loadInstructions() {
    try {
      const response = await fetch('/api/admin/payment-instructions');
      if (!response.ok) throw new Error(t('admin.paymentInstructions.errLoad'));
      const data = await response.json();
      
      if (data) {
        setInstructions(data);
        setFormData({
          title: data.title || 'Payment Instructions',
          instructions: data.instructions || '',
          bank_name: data.bank_name || '',
          account_name: data.account_name || '',
          account_number: data.account_number || '',
          swift_code: data.swift_code || '',
          branch: data.branch || '',
          active: data.active !== undefined ? data.active : true,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.paymentInstructions.errLoad'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/admin/payment-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('admin.paymentInstructions.errSave'));
      }

      const data = await response.json();
      setInstructions(data);
      setSuccess(t('admin.paymentInstructions.success'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.paymentInstructions.errSave'));
    } finally {
      setSaving(false);
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('admin.paymentInstructions.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('admin.paymentInstructions.subtitle')}
      </p>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin.paymentInstructions.detailsHeading')}</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.titleLabel')}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.titlePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.instructionsLabel')}
              </label>
              <textarea
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                required
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.instructionsPlaceholder')}
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('admin.paymentInstructions.instructionsHelp')}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin.paymentInstructions.bankHeading')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.bankName')}
              </label>
              <input
                type="text"
                value={formData.bank_name}
                onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.bankName')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.accountName')}
              </label>
              <input
                type="text"
                value={formData.account_name}
                onChange={(e) => setFormData({ ...formData, account_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.accountNamePlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.accountNumber')}
              </label>
              <input
                type="text"
                value={formData.account_number}
                onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.accountNumber')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.swiftCode')}
              </label>
              <input
                type="text"
                value={formData.swift_code}
                onChange={(e) => setFormData({ ...formData, swift_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.swiftPlaceholder')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.paymentInstructions.branch')}
              </label>
              <input
                type="text"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.paymentInstructions.branchPlaceholder')}
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              {t('admin.paymentInstructions.activeCheckbox')}
            </label>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin.paymentInstructions.preview')}</h2>
          <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-2">{formData.title}</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap mb-4">{formData.instructions}</p>
            {(formData.bank_name || formData.account_name || formData.account_number) && (
              <div className="mt-4 pt-4 border-t border-gray-300">
                <p className="text-sm font-medium text-gray-900 mb-2">{t('admin.paymentInstructions.bankDetails')}</p>
                {formData.bank_name && <p className="text-sm text-gray-700">{t('admin.paymentInstructions.previewBank')} {formData.bank_name}</p>}
                {formData.account_name && <p className="text-sm text-gray-700">{t('admin.paymentInstructions.previewAccountName')} {formData.account_name}</p>}
                {formData.account_number && <p className="text-sm text-gray-700">{t('admin.paymentInstructions.previewAccountNumber')} {formData.account_number}</p>}
                {formData.swift_code && <p className="text-sm text-gray-700">{t('admin.paymentInstructions.previewSwift')} {formData.swift_code}</p>}
                {formData.branch && <p className="text-sm text-gray-700">{t('admin.paymentInstructions.previewBranch')} {formData.branch}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-6 py-2 rounded-full hover:bg-primary-dark transition-colors disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('common.saving')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{t('admin.paymentInstructions.save')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
