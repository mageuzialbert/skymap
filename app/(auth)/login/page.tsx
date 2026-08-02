'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Phone, Lock, Loader2, ArrowRight, MessageSquare } from 'lucide-react';
import { loginWithPassword, sendOTP, verifyOTP, getDashboardPathForCurrentUser } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { normalizeTzPhone } from '@/lib/phone';
import { useT } from '@/lib/i18n';
import AuthShell, { AuthField, primaryBtn, otpInputClass } from '@/components/auth/AuthShell';

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
    if (typeof window === 'undefined') return '/dashboard/business/request-ride';
    const target = new URLSearchParams(window.location.search).get('redirect');
    return target && target.startsWith('/') ? target : '/dashboard/business/request-ride';
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
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Verify session was created by checking multiple times
      let user = null;
      for (let i = 0; i < 5; i++) {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (currentUser) {
          user = currentUser;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
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

  const passwordEye = (
    <button
      type="button"
      onClick={() => setShowPassword((s) => !s)}
      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
      aria-label={showPassword ? t('authx.hidePassword') : t('authx.showPassword')}
      tabIndex={-1}
    >
      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
    </button>
  );

  const footer = (
    <p className="text-sm text-gray-600">
      {t('auth.noAccount')}{' '}
      <Link href="/register" className="font-semibold text-primary hover:text-primary-dark">
        {t('authx.login.registerBusiness')}
      </Link>
    </p>
  );

  return (
    <AuthShell heading={t('authx.login.welcome')} subtitle={t('authx.login.subtitle')} footer={footer}>
      {/* Login method toggle */}
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => {
            setLoginMethod('password');
            setOtpSent(false);
            setError('');
          }}
          className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
            loginMethod === 'password' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
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
          className={`rounded-lg py-2.5 text-sm font-medium transition-colors ${
            loginMethod === 'otp' ? 'bg-white text-primary shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('authx.login.smsCode')}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Password login */}
      {loginMethod === 'password' && (
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <AuthField
            id="phone"
            label={t('common.phone')}
            icon={Phone}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder={t('authx.login.phonePlaceholder')}
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
              rightSlot={passwordEye}
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
      )}

      {/* OTP request */}
      {loginMethod === 'otp' && !otpSent && (
        <form onSubmit={handleSendOTP} className="space-y-4">
          <AuthField
            id="phone-otp"
            label={t('common.phone')}
            icon={Phone}
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            placeholder={t('authx.login.phonePlaceholder')}
          />
          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('common.sending')}
              </>
            ) : (
              <>
                <MessageSquare className="h-5 w-5" />
                {t('authx.login.sendVerificationCode')}
              </>
            )}
          </button>
        </form>
      )}

      {/* OTP verification */}
      {loginMethod === 'otp' && otpSent && (
        <form onSubmit={handleVerifyOTP} className="space-y-4">
          <div>
            <label htmlFor="otp-code" className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('authx.login.enterVerificationCode')}
            </label>
            <input
              id="otp-code"
              type="text"
              inputMode="numeric"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength={6}
              className={otpInputClass}
              placeholder="000000"
            />
            <p className="mt-2 text-xs text-gray-500">{t('authx.login.codeSentTo', { phone })}</p>
          </div>
          <button type="submit" disabled={loading || otp.length !== 6} className={primaryBtn}>
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t('authx.verifying')}
              </>
            ) : (
              <>
                {t('authx.login.verifyAndSignIn')}
                <ArrowRight className="h-5 w-5" />
              </>
            )}
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
    </AuthShell>
  );
}
