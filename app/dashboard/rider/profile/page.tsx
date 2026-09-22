'use client';

import { useEffect, useState } from 'react';
import { Loader2, User as UserIcon, Phone, Mail, IdCard, Bike, CheckCircle2, Save, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useT } from '@/lib/i18n';
import Alert from '@/components/common/Alert';
import { cardClass, fieldLabel, inputClass, insetDivider, pageTitle, pillGhost, pillPrimary, sectionLabel } from '@/lib/ui';

interface RiderProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  active: boolean;
  profile_picture_url: string | null;
  license_number: string | null;
  vehicle_type_id: string | null;
}

export default function RiderProfilePage() {
  const t = useT();
  const [profile, setProfile] = useState<RiderProfile | null>(null);
  const [vehicleName, setVehicleName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single();
        if (userData) {
          setProfile(userData as RiderProfile);
          setPhoneInput(userData.phone || '');
          if (userData.vehicle_type_id) {
            const res = await fetch('/api/vehicle-types');
            if (res.ok) {
              const types = await res.json();
              const vt = (types as any[]).find((t) => t.id === userData.vehicle_type_id);
              setVehicleName(vt?.name || '');
            }
          }
        }
      } catch (err) {
        console.error('Error loading rider profile:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function savePhone() {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await fetch('/api/auth/update-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneInput }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('rider.profile.failedUpdatePhone'));
      setProfile((p) => (p ? { ...p, phone: data.phone } : p));
      setPhoneInput(data.phone);
      setEditingPhone(false);
      setSuccess(t('rider.profile.phoneUpdated'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('rider.profile.failedUpdatePhone'));
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

  if (!profile) {
    return <div className="text-center py-10 text-gray-500">{t('rider.profile.notFound')}</div>;
  }

  const ReadField = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
      <Icon className="w-5 h-5 text-gray-400 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900 break-words">{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div>
      <h1 className={`${pageTitle} mb-5`}>{t('rider.profile.title')}</h1>

      {error && (
        <Alert tone="error" className="mb-4">{error}</Alert>
      )}
      {success && (
        <Alert tone="success" className="mb-4">
          {success}
        </Alert>
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
          {profile.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profile_picture_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-9 h-9 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900 truncate">{profile.name || t('rider.profile.riderFallback')}</p>
          <span
            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              profile.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {profile.active ? t('rider.profile.active') : t('rider.profile.inactive')}
          </span>
        </div>
      </div>

      {/* Editable phone */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            {t('rider.profile.phoneNumber')}
          </p>
          {!editingPhone && (
            <button
              onClick={() => setEditingPhone(true)}
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
            >
              <Pencil className="w-4 h-4" />
              {t('common.edit')}
            </button>
          )}
        </div>
        {editingPhone ? (
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+255…"
              className={`${inputClass} flex-1`}
            />
            <div className="flex gap-2">
              <button
                onClick={savePhone}
                disabled={saving}
                className={pillPrimary}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('common.save')}
              </button>
              <button
                onClick={() => {
                  setEditingPhone(false);
                  setPhoneInput(profile.phone || '');
                  setError('');
                }}
                className={pillGhost}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900 mt-1">{profile.phone || '-'}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">{t('rider.profile.phoneHint')}</p>
      </div>

      {/* Read-only details */}
      <div className={`${cardClass} p-4 sm:p-5`}>
        <h2 className={sectionLabel}>{t('rider.profile.details')}</h2>
        <ReadField icon={UserIcon} label={t('rider.profile.name')} value={profile.name || ''} />
        <ReadField icon={Mail} label={t('rider.profile.email')} value={profile.email || ''} />
        <ReadField icon={IdCard} label={t('rider.profile.licenseNumber')} value={profile.license_number || ''} />
        <ReadField icon={Bike} label={t('rider.profile.meansOfTransport')} value={vehicleName} />
      </div>
    </div>
  );
}
