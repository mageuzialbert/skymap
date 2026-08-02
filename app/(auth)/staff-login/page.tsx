'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from 'lucide-react';
import { useT } from '@/lib/i18n';
import AuthShell, { AuthField, primaryBtn } from '@/components/auth/AuthShell';

export default function StaffLoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginWithEmail(email, password);

      // Wait a moment for session to be set
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Get user role to determine redirect
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(t('authx.errors.failedGetSession'));
      }

      // Get user role from users table
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = userData?.role;

      // Redirect based on role
      if (role === 'ADMIN') {
        router.push('/dashboard/admin');
      } else if (role === 'STAFF') {
        router.push('/dashboard/staff');
      } else if (role === 'RIDER') {
        router.push('/dashboard/rider');
      } else {
        // If not staff/admin/rider, redirect to business login
        await supabase.auth.signOut();
        setError(t('authx.staff.staffOnly'));
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <p className="text-sm text-gray-600">
      {t('authx.staff.areYouBusiness')}{' '}
      <Link href="/login" className="font-semibold text-primary hover:text-primary-dark">
        {t('authx.staff.businessLogin')}
      </Link>
    </p>
  );

  return (
    <AuthShell heading={t('authx.login.welcome')} subtitle={t('authx.staff.portalSubtitle')} footer={footer}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <AuthField
          id="email"
          label={t('authx.staff.emailAddress')}
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="admin@theskymap.com"
        />
        <div>
          <AuthField
            id="password"
            label={t('common.password')}
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('authx.login.passwordPlaceholder')}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? t('authx.hidePassword') : t('authx.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t('authx.forgotPassword')}
            </Link>
          </div>
        </div>
        <button type="submit" disabled={loading} className={primaryBtn}>
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('common.signingIn')}
            </>
          ) : (
            <>
              {t('common.signIn')}
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}
