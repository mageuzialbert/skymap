'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2, Send, Mail, Phone, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import Alert from '@/components/common/Alert';
import { cardClass, inputClass, pageTitle, pillGhost, pillPrimary, sectionTitle } from '@/lib/ui';

export default function BusinessVerifyPage() {
  const t = useT();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Phone verification
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneSending, setPhoneSending] = useState(false);
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [phoneSuccess, setPhoneSuccess] = useState('');
  
  // Email verification
  const [emailSending, setEmailSending] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailEditing, setEmailEditing] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');

  useEffect(() => {
    loadVerificationStatus();
  }, []);

  async function loadVerificationStatus() {
    try {
      // First check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Session error:', sessionError);
        setLoading(false);
        return;
      }
      
      if (!session) {
        console.error('No active session');
        setLoading(false);
        return;
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('Auth error:', authError);
        setLoading(false);
        return;
      }
      
      if (!user) {
        console.error('No user found');
        setLoading(false);
        return;
      }

      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('phone, email, phone_verified, email_verified')
        .eq('id', user.id)
        .single();

      // Get phone from businesses table as fallback
      let phoneFromBusiness = '';
      try {
        const { data: business } = await supabase
          .from('businesses')
          .select('phone')
          .eq('user_id', user.id)
          .single();
        
        if (business?.phone) {
          phoneFromBusiness = business.phone;
        }
      } catch (err) {
        console.error('Error fetching business phone:', err);
      }

      // Get phone from user metadata as another fallback
      const phoneFromMetadata = user.user_metadata?.phone || '';

      if (userError) {
        console.error('Error fetching user data:', userError);
        // Still try to set email and phone from fallbacks
        setEmail(user.email || '');
        setPhone(phoneFromBusiness || phoneFromMetadata || '');
        setPhoneVerified(false);
        setEmailVerified(false);
        setLoading(false);
        return;
      }

      // Set phone and email from users table, with fallbacks
      if (userData) {
        setPhone(userData.phone || phoneFromBusiness || phoneFromMetadata || '');
        setEmail(userData.email || user.email || '');
        setPhoneVerified(userData.phone_verified || false);
        setEmailVerified(userData.email_verified || false);
      } else {
        // Fallback to auth user data and business table
        setEmail(user.email || '');
        setPhone(phoneFromBusiness || phoneFromMetadata || '');
        setPhoneVerified(false);
        setEmailVerified(false);
      }
    } catch (err) {
      console.error('Error loading verification status:', err);
      // On error, at least try to get email from auth
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setEmail(user.email || '');
        }
      } catch (authErr) {
        console.error('Error getting auth user:', authErr);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSendPhoneOTP() {
    setPhoneError('');
    setPhoneSuccess('');
    setPhoneOtpSent(false);
    setPhoneSending(true);

    if (!phone) {
      setPhoneError(t('business.verify.msg.phoneRequired'));
      setPhoneSending(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || t('business.verify.msg.sendOtpFailed'));
      }

      setPhoneOtpSent(true);
      setPhoneSuccess(t('business.verify.msg.codeSentSuccess'));

      // In development, show the OTP code for testing
      if (data.debugOtp) {
        setPhoneSuccess(t('business.verify.msg.codeSentDev', { code: data.debugOtp }));
      }
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : t('business.verify.msg.sendOtpFailed'));
    } finally {
      setPhoneSending(false);
    }
  }

  async function handleVerifyPhone() {
    setPhoneError('');
    setPhoneVerifying(true);

    try {
      const response = await fetch('/api/auth/verify-phone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: phoneOtp }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('business.verify.msg.invalidOtp'));
      }

      // Reload verification status
      await loadVerificationStatus();
      setPhoneOtpSent(false);
      setPhoneOtp('');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : t('business.verify.msg.invalidOtp'));
    } finally {
      setPhoneVerifying(false);
    }
  }

  async function handleSendEmailVerification() {
    setEmailError('');
    setEmailSuccess('');
    setEmailSending(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error(t('business.verify.msg.notAuthenticated'));
      }

      // If email was changed, update it first via API
      const currentAuthEmail = user.email || '';
      if (email !== currentAuthEmail) {
        const updateResponse = await fetch('/api/auth/update-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, newEmail: email }),
        });

        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(errorData.error || t('business.verify.msg.updateEmailFailed'));
        }
      }

      // Send verification email using the updated email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      setEmailSuccess(t('business.verify.msg.emailSentSuccess'));
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : t('business.verify.msg.sendEmailFailed'));
    } finally {
      setEmailSending(false);
    }
  }

  // Check email verification status periodically
  useEffect(() => {
    if (!emailVerified) {
      const interval = setInterval(async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            // Check if email is confirmed
            if (user.email_confirmed_at) {
              // Update email_verified in users table
              const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id }),
              });
              
              if (response.ok) {
                await loadVerificationStatus();
              }
            }
          }
        } catch (err) {
          console.error('Error checking email verification:', err);
        }
      }, 5000); // Check every 5 seconds

      return () => clearInterval(interval);
    }
  }, [emailVerified]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className={pageTitle}>{t('business.verify.title')}</h1>
        <p className="text-gray-600 mt-2">
          {t('business.verify.subtitle')}
        </p>
      </div>

      <div className="space-y-6">
        {/* Phone Verification */}
        <div className={`${cardClass} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-6 h-6 text-gray-700" />
              <h2 className={sectionTitle}>{t('business.verify.phoneVerification')}</h2>
            </div>
            {phoneVerified ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{t('business.verify.verified')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{t('business.verify.notVerified')}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.verify.phoneNumber')}
              </label>
              <input
                type="tel"
                value={phone}
                disabled
                className={`${inputClass} bg-gray-50 text-gray-500`}
              />
            </div>

            {!phoneVerified && (
              <>
                {!phoneOtpSent ? (
                  <button
                    onClick={handleSendPhoneOTP}
                    disabled={phoneSending || !phone}
                    className={pillPrimary}
                  >
                    {phoneSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>{t('common.sending')}</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>{t('business.verify.sendCode')}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t('business.verify.enterCode')}
                      </label>
                      <input
                        type="text"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className={inputClass}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyPhone}
                        disabled={phoneOtp.length !== 6 || phoneVerifying}
                        className={pillPrimary}
                      >
                        {phoneVerifying ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>{t('business.verify.verifying')}</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>{t('business.verify.verifyPhone')}</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPhoneOtpSent(false);
                          setPhoneOtp('');
                          setPhoneError('');
                        }}
                        className={pillGhost}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </div>
                )}

                {phoneSuccess && (
                  <Alert tone="success">{phoneSuccess}</Alert>
                )}
                {phoneError && (
                  <Alert tone="error">{phoneError}</Alert>
                )}
              </>
            )}
          </div>
        </div>

        {/* Email Verification */}
        <div className={`${cardClass} p-4 sm:p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-gray-700" />
              <h2 className={sectionTitle}>{t('business.verify.emailVerification')}</h2>
            </div>
            {emailVerified && !emailEditing ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">{t('business.verify.verified')}</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{t('business.verify.notVerified')}</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {((!emailVerified && email.endsWith('@kasicourier.local')) || emailEditing) && (
              <Alert tone="warning">
                {emailEditing
                  ? t('business.verify.emailChangeWarning')
                  : t('business.verify.placeholderEmailWarning')
                }
              </Alert>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('business.verify.emailAddress')}
              </label>
              <div className="flex gap-2">
                {emailVerified && !emailEditing ? (
                  <>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className={`${inputClass} flex-1 bg-gray-50 text-gray-500`}
                    />
                    <button
                      onClick={() => {
                        setOriginalEmail(email);
                        setEmailEditing(true);
                        setEmailError('');
                        setEmailSuccess('');
                      }}
                      className={pillGhost}
                    >
                      <Pencil className="w-4 h-4" />
                      <span>{t('common.edit')}</span>
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('business.verify.enterEmail')}
                      className={`${inputClass} flex-1`}
                    />
                    {emailEditing && (
                      <button
                        onClick={() => {
                          setEmail(originalEmail);
                          setEmailEditing(false);
                          setEmailError('');
                          setEmailSuccess('');
                        }}
                        className={pillGhost}
                      >
                        {t('common.cancel')}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {(!emailVerified || emailEditing) && (
              <>
                <button
                  onClick={async () => {
                    await handleSendEmailVerification();
                    if (!emailError) {
                      setEmailEditing(false);
                      setEmailVerified(false);
                    }
                  }}
                  disabled={emailSending || !email || email.endsWith('@kasicourier.local')}
                  className={pillPrimary}
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('common.sending')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{emailEditing ? t('business.verify.updateVerifyEmail') : t('business.verify.sendVerificationEmail')}</span>
                    </>
                  )}
                </button>

                {emailError && (
                  <Alert tone="error">{emailError}</Alert>
                )}

                {emailSuccess && (
                  <Alert tone="success">{emailSuccess}</Alert>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
