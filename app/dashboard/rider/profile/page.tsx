'use client';

import { useEffect, useState } from 'react';
import { Loader2, User as UserIcon, Phone, Mail, IdCard, Bike, CheckCircle2, Save, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';

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
      if (!res.ok) throw new Error(data.error || 'Failed to update phone');
      setProfile((p) => (p ? { ...p, phone: data.phone } : p));
      setPhoneInput(data.phone);
      setEditingPhone(false);
      setSuccess('Phone number updated.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update phone');
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
    return <div className="text-center py-10 text-gray-500">Profile not found.</div>;
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">My Profile</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
          {profile.profile_picture_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.profile_picture_url} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <UserIcon className="w-9 h-9 text-gray-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-gray-900 truncate">{profile.name || 'Rider'}</p>
          <span
            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              profile.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {profile.active ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Editable phone */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Phone Number
          </p>
          {!editingPhone && (
            <button
              onClick={() => setEditingPhone(true)}
              className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
        {editingPhone ? (
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              type="tel"
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value)}
              placeholder="+255759561311"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="flex gap-2">
              <button
                onClick={savePhone}
                disabled={saving}
                className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => {
                  setEditingPhone(false);
                  setPhoneInput(profile.phone || '');
                  setError('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm font-medium text-gray-900 mt-1">{profile.phone || '-'}</p>
        )}
        <p className="text-xs text-gray-400 mt-2">This is the only detail you can change. Contact admin for other changes.</p>
      </div>

      {/* Read-only details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-2">Details</h2>
        <ReadField icon={UserIcon} label="Name" value={profile.name || ''} />
        <ReadField icon={Mail} label="Email" value={profile.email || ''} />
        <ReadField icon={IdCard} label="License Number" value={profile.license_number || ''} />
        <ReadField icon={Bike} label="Means of Transport" value={vehicleName} />
      </div>
    </div>
  );
}
