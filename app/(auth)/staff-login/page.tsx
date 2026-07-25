'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loginWithEmail } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, EyeOff, Home } from 'lucide-react';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { useT } from '@/lib/i18n';

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
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get user role to determine redirect
      const { data: { user } } = await supabase.auth.getUser();
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        {/* Top row: back to home + language switcher */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <Home className="w-4 h-4" />
            {t('common.backToHome')}
          </Link>
          <LanguageSwitcher />
        </div>

        {/* Logo/Branding */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo1.jpeg" alt="The Skymap" className="w-16 h-16 mx-auto mb-3 rounded-xl object-cover" />
          <h1 className="text-3xl font-bold text-primary mb-2">
            The SkayMap
          </h1>
          <p className="text-gray-600">{t('authx.staff.portalSubtitle')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('authx.staff.emailAddress')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="admin@theskymap.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('authx.login.passwordPlaceholder')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? t('authx.hidePassword') : t('authx.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className="text-right mt-1.5">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                {t('authx.forgotPassword')}
              </Link>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? t('common.signingIn') : t('common.signIn')}
          </button>
        </form>



        {/* Business Login Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('authx.staff.areYouBusiness')}{' '}
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
              {t('authx.staff.businessLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
