'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Mail, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react';
import { requestPasswordReset, confirmPasswordReset } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import AuthShell, {
  AuthField,
  inputBase,
  primaryBtn,
  secondaryBtn,
  otpInputClass,
} from '@/components/auth/AuthShell';

type Channel = 'sms' | 'email';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const t = useT();
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1=request, 2=reset, 3=done
  const [channel, setChannel] = useState<Channel>('email');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [resetRole, setResetRole] = useState<string | null>(null);

  const buildPhone = () => '+255' + phone.replace(/\D/g, '').replace(/^255/, '').replace(/^0/, '');

  async function handleSendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await requestPasswordReset({
        channel,
        phone: channel === 'sms' ? buildPhone() : undefined,
        email: channel === 'email' ? email.trim() : undefined,
      });
      setInfo(
        (channel === 'sms' ? t('authx.forgot.codeSentPhone') : t('authx.forgot.codeSentEmail')) +
          (res.debugOtp ? ` (dev code: ${res.debugOtp})` : '')
      );
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.failedSendResetCode'));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) return setError(t('auth.enterCode'));
    if (password.length < 8) return setError(t('authx.errors.passwordMin8'));
    if (password !== confirm) return setError(t('authx.errors.passwordsMismatch'));
    setLoading(true);
    try {
      const res = await confirmPasswordReset({
        channel,
        phone: channel === 'sms' ? buildPhone() : undefined,
        email: channel === 'email' ? email.trim() : undefined,
        code,
        newPassword: password,
        confirmPassword: confirm,
      });
      setResetRole(res.role);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('authx.errors.failedResetPassword'));
    } finally {
      setLoading(false);
    }
  }

  const loginHref = resetRole && ['ADMIN', 'STAFF', 'RIDER'].includes(resetRole) ? '/staff-login' : '/login';

  const subtitle =
    step === 1 ? t('authx.forgot.subtitle1') : step === 2 ? t('authx.forgot.subtitle2') : t('authx.forgot.subtitle3');

  const footer =
    step !== 3 ? (
      <p className="text-sm text-gray-600">
        {t('authx.forgot.rememberedIt')}{' '}
        <Link href="/login" className="font-semibold text-primary hover:text-primary-dark">
          {t('authx.forgot.backToLogin')}
        </Link>
      </p>
    ) : undefined;

  return (
    <AuthShell heading={t('authx.forgot.title')} subtitle={subtitle} footer={footer}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {info && step !== 3 && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{info}</div>
      )}

      {/* Step 1 - request a code */}
      {step === 1 && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setChannel('sms')}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-colors ${
                channel === 'sms'
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-gray-200 text-gray-600 hover:border-primary/60'
              }`}
            >
              <MessageSquare className="h-5 w-5" />
              <span className="text-sm font-medium">{t('auth.channelSms')}</span>
            </button>
            <button
              type="button"
              onClick={() => setChannel('email')}
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

          {channel === 'sms' ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">{t('common.phone')}</label>
              <div className="flex items-stretch gap-2">
                <span className="inline-flex items-center rounded-full border border-gray-300 bg-gray-50 px-4 text-sm text-gray-600">
                  +255
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                  required
                  className={`${inputBase} min-w-0 flex-1 px-5`}
                  placeholder={t('authx.forgot.phonePlaceholder')}
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">{t('authx.forgot.smsTzNote')}</p>
            </div>
          ) : (
            <AuthField
              id="reset-email"
              label={t('authx.forgot.emailAddress')}
              icon={Mail}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder={t('authx.forgot.emailPlaceholder')}
            />
          )}

          <button type="submit" disabled={loading} className={primaryBtn}>
            {loading && <Loader2 className="h-5 w-5 animate-spin" />}
            {t('auth.sendCode')}
          </button>
        </form>
      )}

      {/* Step 2 - verify + set new password */}
      {step === 2 && (
        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              {t('authx.forgot.verificationCode')}
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              className={otpInputClass}
              placeholder="000000"
            />
            <button
              type="button"
              onClick={() => handleSendCode()}
              disabled={loading}
              className="mt-1.5 text-xs text-primary hover:underline disabled:opacity-50"
            >
              {t('auth.resendCode')}
            </button>
          </div>

          <AuthField
            id="new-password"
            label={t('authx.forgot.newPassword')}
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder={t('authx.forgot.passwordPlaceholder8')}
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
            id="confirm-password"
            label={t('authx.forgot.confirmNewPassword')}
            icon={Lock}
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            placeholder={t('authx.forgot.confirmPlaceholder')}
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
                setInfo('');
              }}
              className={secondaryBtn}
            >
              <ArrowLeft className="h-4 w-4" />
              {t('common.back')}
            </button>
            <button type="submit" disabled={loading} className={primaryBtn}>
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {t('authx.forgot.resetPassword')}
            </button>
          </div>
        </form>
      )}

      {/* Step 3 - done */}
      {step === 3 && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <p className="text-gray-700">{t('authx.forgot.doneMessage')}</p>
          <button onClick={() => router.push(loginHref)} className={primaryBtn}>
            {t('authx.forgot.goToLogin')}
          </button>
        </div>
      )}
    </AuthShell>
  );
}
