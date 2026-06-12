'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Mail, Loader2, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { registerBusiness, sendVerificationCode } from '@/lib/auth';
import CountryCodeSelect from '@/components/common/CountryCodeSelect';
import { Country, DEFAULT_COUNTRY_CODE, getCountry } from '@/lib/countries';
import { useT } from '@/lib/i18n';

type Channel = 'sms' | 'email';

export default function RegisterPage() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState(1); // 1 = Business Info, 2 = Account, 3 = Verify
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    countryCode: DEFAULT_COUNTRY_CODE, // ISO2, e.g. "TZ"
    phone: '', // national digits only (no dial code)
    password: '',
    confirmPassword: '',
  });
  const [channel, setChannel] = useState<Channel>('sms');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const country = getCountry(formData.countryCode);
  const isTanzania = country.dialCode === '+255';
  const fullPhone = `${country.dialCode}${formData.phone.replace(/\D/g, '')}`;

  function validateStep1() {
    setError('');
    if (!formData.businessName.trim()) {
      setError('Name is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    return true;
  }

  function validateStep2() {
    setError('');
    const digits = formData.phone.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 15) {
      setError('Please enter a valid phone number (6–15 digits).');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  }

  function goToVerify() {
    if (!validateStep2()) return;
    // Non-+255 numbers can only verify by email.
    setChannel(isTanzania ? 'sms' : 'email');
    setCodeSent(false);
    setCode('');
    setError('');
    setInfo('');
    setStep(3);
  }

  async function handleSendCode() {
    setError('');
    setInfo('');
    setSending(true);
    try {
      const res = await sendVerificationCode({
        channel,
        phone: fullPhone,
        email: formData.email,
      });
      setCodeSent(true);
      setInfo(
        channel === 'email'
          ? `${t('auth.codeSent')} (${formData.email})`
          : `${t('auth.codeSent')} (${fullPhone})`
      );
      if (res.debugOtp) setInfo((prev) => `${prev} • Dev code: ${res.debugOtp}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send verification code');
    } finally {
      setSending(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.replace(/\D/g, '').length !== 6) {
      setError(t('auth.enterCode'));
      return;
    }
    setLoading(true);
    try {
      await registerBusiness({
        businessName: formData.businessName,
        email: formData.email,
        phone: fullPhone,
        password: formData.password,
        channel,
        code,
      });
      router.push('/dashboard/business');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  function selectChannel(next: Channel) {
    if (next === 'sms' && !isTanzania) return; // blocked for non-+255
    setChannel(next);
    setCodeSent(false);
    setCode('');
    setInfo('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center mb-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-primary">{t('common.appName')}</span>
          </Link>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('auth.registerTitle')}</h1>
          <p className="text-gray-600 text-sm mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-6">
          {[1, 2, 3].map((n, i) => (
            <div key={n} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                  step >= n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {n}
              </div>
              {i < 2 && <div className={`w-12 h-1 mx-1 ${step > n ? 'bg-primary' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
        )}
        {info && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
            {info}
          </div>
        )}

        {/* Step 1: Business info */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.businessName')}</label>
              <input
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Your name or business"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.email')}</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>
            <button
              type="button"
              onClick={() => validateStep1() && setStep(2)}
              className="w-full bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors font-medium"
            >
              {t('common.next')}
            </button>
          </div>
        )}

        {/* Step 2: Account */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.phone')}</label>
              <div className="flex">
                <CountryCodeSelect
                  value={formData.countryCode}
                  onChange={(c: Country) => setFormData({ ...formData, countryCode: c.code })}
                />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 15) })
                  }
                  inputMode="numeric"
                  maxLength={15}
                  className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  minLength={6}
                  className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="At least 6 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('common.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  minLength={6}
                  className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setError('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2.5 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={goToVerify}
                className="flex-1 bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors font-medium"
              >
                {t('common.next')}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 3 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-sm text-gray-600">{t('auth.verifyChannel')}</p>

            {/* Channel choice */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => selectChannel('sms')}
                disabled={!isTanzania}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                  channel === 'sms'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600'
                } ${!isTanzania ? 'opacity-40 cursor-not-allowed' : 'hover:border-primary/60'}`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm font-medium">{t('auth.channelSms')}</span>
              </button>
              <button
                type="button"
                onClick={() => selectChannel('email')}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                  channel === 'email'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-gray-200 text-gray-600 hover:border-primary/60'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium">{t('auth.channelEmail')}</span>
              </button>
            </div>

            {!isTanzania && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-md text-xs">
                {t('auth.smsOnlyTz')}
              </div>
            )}

            {!codeSent ? (
              <button
                type="button"
                onClick={handleSendCode}
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
              >
                {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                {t('auth.sendCode')}
              </button>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.enterCode')}</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    maxLength={6}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg tracking-[0.4em]"
                    placeholder="------"
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={handleSendCode}
                    disabled={sending}
                    className="text-primary hover:text-primary-dark font-medium disabled:opacity-50"
                  >
                    {t('auth.resendCode')}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('auth.verify')} & {t('common.register')}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                setStep(2);
                setError('');
                setInfo('');
              }}
              className="w-full flex items-center justify-center gap-1.5 text-gray-600 text-sm hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              {t('common.back')}
            </button>
          </form>
        )}

        {/* Login link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
