'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Mail, ArrowRight } from 'lucide-react';
import { useT } from '@/lib/i18n';
import AuthShell, {
  AuthField,
  PasswordField,
  AuthAlert,
  SubmitButton,
} from '@/components/auth/AuthShell';

export default function StaffLoginPage() {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      {error && <AuthAlert>{error}</AuthAlert>}

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
          <PasswordField
            id="password"
            label={t('common.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('authx.login.passwordPlaceholder')}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-sm text-primary hover:underline">
              {t('authx.forgotPassword')}
            </Link>
          </div>
        </div>
        <SubmitButton type="submit" loading={loading} loadingLabel={t('common.signingIn')} icon={ArrowRight}>
          {t('common.signIn')}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
