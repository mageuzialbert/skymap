'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Mail, Loader2, ArrowLeft, Eye, EyeOff, UserRound, Lock } from 'lucide-react';
import { registerBusiness, sendVerificationCode } from '@/lib/auth';
import CountryCodeSelect from '@/components/common/CountryCodeSelect';
import { Country, DEFAULT_COUNTRY_CODE, getCountry } from '@/lib/countries';
import { useT } from '@/lib/i18n';
import AuthShell, {
  AuthField,
  inputBase,
  primaryBtn,
  secondaryBtn,
  otpInputClass,
} from '@/components/auth/AuthShell';

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
      setError(t('authx.errors.nameRequired'));
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError(t('authx.errors.invalidEmail'));
      return false;
    }
    return true;
  }

  function validateStep2() {
    setError('');
    const digits = formData.phone.replace(/\D/g, '');
    if (digits.length < 6 || digits.length > 15) {
      setError(t('authx.errors.invalidPhone'));
      return false;
    }
    if (formData.password.length < 6) {
      setError(t('authx.errors.passwordMin6'));
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError(t('authx.errors.passwordsMismatch'));
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

      // If SMS was unavailable, the server falls back to email. Switch the UI
      // to the channel that actually delivered so verification uses the right
      // identifier (email code, not phone).
      if (res.channel !== channel) setChannel(res.channel);

      const deliveredTo = res.channel === 'email' ? formData.email : fullPhone;
      setInfo(
        res.fallback && res.message
          ? `${res.message} (${deliveredTo})`
          : `${t('auth.codeSent')} (${deliveredTo})`
      );
      if (res.debugOtp) setInfo((prev) => `${prev} • Dev code: ${res.debugOtp}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.failedSendCode'));
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
      router.push('/dashboard/business/request-ride');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.registrationFailed'));
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

  const footer = (
    <p className="text-sm text-gray-600">
      {t('auth.alreadyHaveAccount')}{' '}
      <Link href="/login" className="font-semibold text-primary hover:text-primary-dark">
        {t('auth.signIn')}
      </Link>
    </p>
  );

  return (
    <AuthShell heading={t('auth.registerTitle')} subtitle={t('auth.registerSubtitle')} footer={footer}>
      {/* Step indicator */}
      <div className="mb-6 flex items-center justify-center">
        {[1, 2, 3].map((n, i) => (
          <div key={n} className="flex items-center">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                step >= n ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {n}
            </div>
            {i < 2 && <div className={`mx-1 h-1 w-12 ${step > n ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {info && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{info}</div>
      )}

      {/* Step 1: Business info */}
      {step === 1 && (
        <div className="space-y-4">
          <AuthField
            id="businessName"
            label={t('auth.businessName')}
            icon={UserRound}
            type="text"
            value={formData.businessName}
            onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            placeholder={t('authx.register.namePlaceholder')}
          />
          <AuthField
            id="email"
            label={t('common.email')}
            icon={Mail}
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder={t('authx.register.emailPlaceholder')}
          />
          <button type="button" onClick={() => validateStep1() && setStep(2)} className={primaryBtn}>
            {t('common.next')}
          </button>
        </div>
      )}

      {/* Step 2: Account */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('common.phone')}</label>
            <div className="flex items-stretch gap-2 [&_button]:h-12 [&_button]:!rounded-full">
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
                className={`${inputBase} min-w-0 flex-1 px-5`}
                placeholder={t('authx.register.phonePlaceholder')}
              />
            </div>
          </div>
          <AuthField
            id="password"
            label={t('common.password')}
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            minLength={6}
            placeholder={t('authx.register.passwordPlaceholder')}
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
          <AuthField
            id="confirmPassword"
            label={t('common.confirmPassword')}
            icon={Lock}
            type={showConfirm ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            minLength={6}
            placeholder={t('authx.register.confirmPlaceholder')}
            rightSlot={
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                aria-label={showConfirm ? t('authx.hidePassword') : t('authx.showPassword')}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setError('');
              }}
              className={`flex-1 ${secondaryBtn}`}
            >
              {t('common.back')}
            </button>
            <button type="button" onClick={goToVerify} className={primaryBtn}>
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
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-colors ${
                channel === 'sms' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600'
              } ${!isTanzania ? 'cursor-not-allowed opacity-40' : 'hover:border-primary/60'}`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">{t('auth.channelSms')}</span>
            </button>
            <button
              type="button"
              onClick={() => selectChannel('email')}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-colors ${
                channel === 'email'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-primary/60'
              }`}
            >
              <Mail className="h-5 w-5" />
              <span className="text-sm font-medium">{t('auth.channelEmail')}</span>
            </button>
          </div>

          {!isTanzania && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {t('auth.smsOnlyTz')}
            </div>
          )}

          {!codeSent ? (
            <button type="button" onClick={handleSendCode} disabled={sending} className={primaryBtn}>
              {sending && <Loader2 className="h-5 w-5 animate-spin" />}
              {t('auth.sendCode')}
            </button>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('auth.enterCode')}</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputMode="numeric"
                  maxLength={6}
                  className={otpInputClass}
                  placeholder="000000"
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleSendCode}
                  disabled={sending}
                  className="font-medium text-primary hover:text-primary-dark disabled:opacity-50"
                >
                  {t('auth.resendCode')}
                </button>
              </div>
              <button type="submit" disabled={loading} className={primaryBtn}>
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
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
            className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
