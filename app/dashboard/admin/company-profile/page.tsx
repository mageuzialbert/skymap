'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Upload, X, Image as ImageIcon } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface CompanyProfile {
  id: string;
  company_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  website: string | null;
  tax_id: string | null;
  created_at: string;
  updated_at: string;
}

export default function AdminCompanyProfilePage() {
  const t = useT();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    company_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    region: '',
    postal_code: '',
    website: '',
    tax_id: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const response = await fetch('/api/admin/company-profile');
      if (!response.ok) throw new Error(t('admin.companyProfile.errLoad'));
      const data = await response.json();
      
      if (data) {
        setProfile(data);
        setFormData({
          company_name: data.company_name || '',
          phone: data.phone || '',
          email: data.email || '',
          address: data.address || '',
          city: data.city || '',
          region: data.region || '',
          postal_code: data.postal_code || '',
          website: data.website || '',
          tax_id: data.tax_id || '',
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.companyProfile.errLoad'));
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
      const response = await fetch('/api/admin/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          logo_url: profile?.logo_url || null,
          favicon_url: profile?.favicon_url || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('admin.companyProfile.errSave'));
      }

      const data = await response.json();
      setProfile(data);
      setSuccess(t('admin.companyProfile.success'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.companyProfile.errSave'));
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingLogo(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/company-profile/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('admin.companyProfile.errUploadLogo'));
      }

      const data = await response.json();
      setProfile(data.profile);
      setSuccess(t('admin.companyProfile.logoSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.companyProfile.errUploadLogo'));
    } finally {
      setUploadingLogo(false);
      e.target.value = ''; // Reset input
    }
  }

  async function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setSuccess('');
    setUploadingFavicon(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/admin/company-profile/upload-favicon', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t('admin.companyProfile.errUploadFavicon'));
      }

      const data = await response.json();
      setProfile(data.profile);
      setSuccess(t('admin.companyProfile.faviconSuccess'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('admin.companyProfile.errUploadFavicon'));
    } finally {
      setUploadingFavicon(false);
      e.target.value = ''; // Reset input
    }
  }

  function removeLogo() {
    if (!profile) return;
    setProfile({ ...profile, logo_url: null });
    setFormData({ ...formData }); // Trigger re-render
  }

  function removeFavicon() {
    if (!profile) return;
    setProfile({ ...profile, favicon_url: null });
    setFormData({ ...formData }); // Trigger re-render
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
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t('admin.companyProfile.title')}</h1>
      <p className="text-gray-600 mb-6">
        {t('admin.companyProfile.subtitle')}
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
        {/* Company Logo */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin.companyProfile.logoHeading')}</h2>
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.companyProfile.logoImageLabel')}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingLogo ? t('admin.common.uploading') : t('admin.companyProfile.uploadLogo')}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                {profile?.logo_url && (
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    {t('admin.common.remove')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('admin.companyProfile.logoHelp')}
              </p>
            </div>
            {profile?.logo_url && (
              <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={profile.logo_url}
                    alt={t('admin.companyProfile.logoAlt')}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Favicon */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin.companyProfile.faviconHeading')}</h2>
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('admin.companyProfile.faviconFileLabel')}
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-full hover:bg-primary-dark transition-colors cursor-pointer disabled:opacity-50">
                  <Upload className="w-4 h-4" />
                  <span>{uploadingFavicon ? t('admin.common.uploading') : t('admin.companyProfile.uploadFavicon')}</span>
                  <input
                    type="file"
                    accept=".ico,.png,.svg"
                    onChange={handleFaviconUpload}
                    disabled={uploadingFavicon}
                    className="hidden"
                  />
                </label>
                {profile?.favicon_url && (
                  <button
                    type="button"
                    onClick={removeFavicon}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    {t('admin.common.remove')}
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {t('admin.companyProfile.faviconHelp')}
              </p>
            </div>
            {profile?.favicon_url && (
              <div className="flex-shrink-0">
                <div className="w-16 h-16 border-2 border-gray-200 rounded-lg overflow-hidden bg-gray-50 flex items-center justify-center">
                  <img
                    src={profile.favicon_url}
                    alt={t('admin.companyProfile.faviconAlt')}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Company Information */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">{t('admin.companyProfile.infoHeading')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.companyName')}
              </label>
              <input
                type="text"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.phone')}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.email')}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.addressLabel')}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.cityLabel')}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.regionLabel')}
              </label>
              <input
                type="text"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.postalCode')}
              </label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.websiteLabel')}
              </label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.companyProfile.taxId')}
              </label>
              <input
                type="text"
                value={formData.tax_id}
                onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('admin.companyProfile.taxIdPlaceholder')}
              />
            </div>
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
                <span>{t('admin.companyProfile.save')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
