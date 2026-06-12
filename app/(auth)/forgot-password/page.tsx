'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MessageSquare, Mail, Loader2, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset, confirmPasswordReset } from '@/lib/auth';

type Channel = 'sms' | 'email';

export default function ForgotPasswordPage() {
  const router = useRouter();
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
        `We sent a 6-digit code to your ${channel === 'sms' ? 'phone' : 'email'}.` +
          (res.debugOtp ? ` (dev code: ${res.debugOtp})` : '')
      );
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (code.length !== 6) return setError('Enter the 6-digit code');
    if (password.length < 8) return setError('Password must be at least 8 characters');
    if (password !== confirm) return setError('Passwords do not match');
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
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  }

  const loginHref = resetRole && ['ADMIN', 'STAFF', 'RIDER'].includes(resetRole) ? '/staff-login' : '/login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center mb-4">
          <Link href="/" className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/logo.png" alt="The Skymap" className="w-8 h-8" />
            <span className="text-lg font-bold text-primary">The Skymap</span>
          </Link>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reset your password</h1>
          <p className="text-gray-600 text-sm mt-1">
            {step === 1 && 'Choose how to receive your reset code.'}
            {step === 2 && 'Enter the code and your new password.'}
            {step === 3 && 'All done!'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>
        )}
        {info && step !== 3 && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">{info}</div>
        )}

        {/* Step 1 — request a code */}
        {step === 1 && (
          <form onSubmit={handleSendCode} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                  channel === 'sms' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary/60'
                }`}
              >
                <MessageSquare className="w-5 h-5" />
                <span className="text-sm font-medium">SMS</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 transition-colors ${
                  channel === 'email' ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-primary/60'
                }`}
              >
                <Mail className="w-5 h-5" />
                <span className="text-sm font-medium">Email</span>
              </button>
            </div>

            {channel === 'sms' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 border-gray-300 rounded-l-md text-gray-600 text-sm">
                    +255
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    required
                    className="flex-1 min-w-0 px-4 py-2 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="7XX XXX XXX"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">SMS codes are available for Tanzania (+255) numbers.</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="you@example.com"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send code
            </button>
          </form>
        )}

        {/* Step 2 — verify + set new password */}
        {step === 2 && (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Verification code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent text-center text-lg tracking-[0.4em]"
                placeholder="------"
              />
              <button
                type="button"
                onClick={() => handleSendCode()}
                disabled={loading}
                className="text-xs text-primary hover:underline mt-1.5 disabled:opacity-50"
              >
                Resend code
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="At least 8 characters"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  minLength={8}
                  className="w-full px-4 py-2 pr-11 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Re-enter your new password"
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
                  setInfo('');
                }}
                className="flex items-center justify-center gap-1 bg-gray-100 text-gray-700 py-2.5 px-4 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Reset password
              </button>
            </div>
          </form>
        )}

        {/* Step 3 — done */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <p className="text-gray-700">
              Your password has been reset. You can now sign in with your new password.
            </p>
            <button
              onClick={() => router.push(loginHref)}
              className="w-full bg-primary text-white py-2.5 px-4 rounded-md hover:bg-primary-dark transition-colors font-medium"
            >
              Go to login
            </button>
          </div>
        )}

        {step !== 3 && (
          <div className="text-center mt-6 text-sm text-gray-600">
            Remembered it?{' '}
            <Link href="/login" className="text-primary font-medium hover:underline">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
