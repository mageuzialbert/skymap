'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset, confirmPasswordReset } from '@/lib/auth';
import { useT } from '@/lib/i18n';
import AuthShell, {
  AuthField,
  PasswordField,
  AuthAlert,
  AuthActions,
  SubmitButton,
  ResendButton,
  ChannelPicker,
  inputBase,
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
      {error && <AuthAlert>{error}</AuthAlert>}
      {info && step !== 3 && <AuthAlert variant="success">{info}</AuthAlert>}

      {/* Step 1 - request a code */}
      {step === 1 && (
        <form onSubmit={handleSendCode} className="space-y-4">
          <ChannelPicker value={channel} onChange={setChannel} />

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

          <SubmitButton type="submit" loading={loading} loadingLabel={t('common.sending')}>
            {t('auth.sendCode')}
          </SubmitButton>
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
            <ResendButton onClick={() => handleSendCode()} disabled={loading} />
          </div>

          <PasswordField
            id="new-password"
            label={t('authx.forgot.newPassword')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            placeholder={t('authx.forgot.passwordPlaceholder8')}
          />

          <PasswordField
            id="confirm-password"
            label={t('authx.forgot.confirmNewPassword')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            placeholder={t('authx.forgot.confirmPlaceholder')}
          />

          <AuthActions
            onBack={() => {
              setStep(1);
              setError('');
              setInfo('');
            }}
          >
            <SubmitButton type="submit" loading={loading}>
              {t('authx.forgot.resetPassword')}
            </SubmitButton>
          </AuthActions>
        </form>
      )}

      {/* Step 3 - done */}
      {step === 3 && (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <p className="text-gray-700">{t('authx.forgot.doneMessage')}</p>
          <SubmitButton type="button" onClick={() => router.push(loginHref)}>
            {t('authx.forgot.goToLogin')}
          </SubmitButton>
        </div>
      )}
    </AuthShell>
  );
}
