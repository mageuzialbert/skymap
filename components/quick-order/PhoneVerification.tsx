'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PhoneVerificationProps {
  phone: string;
  setPhone: (phone: string) => void;
  onPhoneSubmit: () => void;
  onOTPVerify: (code: string) => void;
  loading: boolean;
  otpSent: boolean;
  otpCode: string;
  setOtpCode: (code: string) => void;
  error: string;
  success: string;
}

export default function PhoneVerification({
  phone,
  setPhone,
  onPhoneSubmit,
  onOTPVerify,
  loading,
  otpSent,
  otpCode,
  setOtpCode,
  error,
  success,
}: PhoneVerificationProps) {
  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onPhoneSubmit();
  };

  const handleOTPSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOTPVerify(otpCode);
  };

  return (
    <div className="space-y-6">
      {!otpSent ? (
        <form onSubmit={handlePhoneSubmit} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255759561311"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter your phone number to continue
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !phone}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending code...</span>
              </>
            ) : (
              'Send Verification Code'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleOTPSubmit} className="space-y-4">
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
              Verification Code
            </label>
            <input
              type="text"
              id="otp"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              required
              maxLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg text-center tracking-widest"
              disabled={loading}
            />
            <p className="mt-1 text-sm text-gray-500">
              Enter the 6-digit code sent to {phone}
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full bg-primary text-white font-semibold py-3 rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              'Verify Code'
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setOtpCode('');
              onPhoneSubmit();
            }}
            className="w-full text-gray-600 hover:text-gray-900 text-sm"
            disabled={loading}
          >
            Resend code
          </button>
        </form>
      )}
    </div>
  );
}
