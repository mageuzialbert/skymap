'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Home } from 'lucide-react';
import { loginWithPassword, sendOTP, verifyOTP, getDashboardPathForCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { normalizeTzPhone } from '@/lib/phone';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { useT } from '@/lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const t = useT();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // After login, return the user to where they were headed (set by middleware), else the dashboard.
  const getRedirectTarget = () => {
    if (typeof window === 'undefined') return '/dashboard/business';
    const target = new URLSearchParams(window.location.search).get('redirect');
    return target && target.startsWith('/') ? target : '/dashboard/business';
  };

  // Persistent auto-login: if a valid session already exists on this device,
  // skip the login form and go straight to the dashboard (works for PWA too).
  useEffect(() => {
    let active = true;
    getDashboardPathForCurrentUser()
      .then((path) => {
        if (!active || !path) return;
        const target = new URLSearchParams(window.location.search).get('redirect');
        router.replace(target && target.startsWith('/') ? target : path);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [router]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalize phone number (accepts 0-prefixed local numbers, e.g. 0658363646).
      const phoneNumber = normalizeTzPhone(phone);

      await loginWithPassword(phoneNumber, password);
      router.push(getRedirectTarget());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalize phone number (accepts 0-prefixed local numbers, e.g. 0658363646).
      const phoneNumber = normalizeTzPhone(phone);

      // Validate phone format
      const digitsAfter255 = phoneNumber.replace(/^\+255/, '');
      if (!phoneNumber.startsWith('+255') || digitsAfter255.length !== 9) {
        setError(t('authx.errors.invalidTzNumber'));
        setLoading(false);
        return;
      }

      const result = await sendOTP(phoneNumber);
      setPhone(phoneNumber); // Update phone with normalized value
      setOtpSent(true);
      
      // Show debug OTP in development
      if (result.debugOtp) {
        setError(t('authx.login.devCodeSent', { code: result.debugOtp }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.failedSendOtp'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Normalize phone number to match what was sent.
      const phoneNumber = normalizeTzPhone(phone);

      const result = await verifyOTP(phoneNumber, otp);
      
      if (!result.success) {
        throw new Error(t('authx.errors.failedVerifyOtp'));
      }
      
      // Wait a moment for session to be set
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verify session was created by checking multiple times
      let user = null;
      for (let i = 0; i < 5; i++) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          user = currentUser;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      if (!user) {
        throw new Error(t('authx.errors.sessionNotCreated'));
      }
      
      // Redirect to intended destination (or dashboard)
      router.push(getRedirectTarget());
      router.refresh(); // Force refresh to update auth state
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.invalidOtp'));
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
            The Skymap Logistics
          </h1>
          <p className="text-gray-600">{t('authx.login.subtitle')}</p>
        </div>

        {/* Login Method Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => {
              setLoginMethod('password');
              setOtpSent(false);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'password'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('common.password')}
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMethod('otp');
              setOtpSent(false);
              setError('');
            }}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              loginMethod === 'otp'
                ? 'bg-primary text-white'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t('authx.login.smsCode')}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Password Login Form */}
        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.phone')}
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('authx.login.phonePlaceholder')}
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
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('common.signingIn') : t('common.signIn')}
            </button>
          </form>
        )}

        {/* OTP Login Form */}
        {loginMethod === 'otp' && !otpSent && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <div>
              <label htmlFor="phone-otp" className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.phone')}
              </label>
              <input
                id="phone-otp"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder={t('authx.login.phonePlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('common.sending') : t('authx.login.sendVerificationCode')}
            </button>
          </form>
        )}

        {/* OTP Verification Form */}
        {loginMethod === 'otp' && otpSent && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <div>
              <label htmlFor="otp-code" className="block text-sm font-medium text-gray-700 mb-1">
                {t('authx.login.enterVerificationCode')}
              </label>
              <input
                id="otp-code"
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('authx.login.codeSentTo', { phone })}
              </p>
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-primary text-white py-2 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('authx.verifying') : t('authx.login.verifyAndSignIn')}
            </button>
            <button
              type="button"
              onClick={() => setOtpSent(false)}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              {t('auth.resendCode')}
            </button>
          </form>
        )}

        {/* Register Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('auth.noAccount')}{' '}
            <Link href="/register" className="text-primary hover:text-primary-dark font-medium">
              {t('authx.login.registerBusiness')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
