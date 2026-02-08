'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Loader2, Send, Mail, Phone, Pencil } from 'lucide-react';
import Link from 'next/link';

export default function BusinessVerifyPage() {
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
      setPhoneError('Phone number is required');
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
        throw new Error(data.error || 'Failed to send OTP');
      }

      setPhoneOtpSent(true);
      setPhoneSuccess('Verification code sent successfully! Please check your phone.');
      
      // In development, show the OTP code for testing
      if (data.debugOtp) {
        setPhoneSuccess(`Verification code sent! (Dev mode - Code: ${data.debugOtp})`);
      }
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Failed to send OTP');
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
        throw new Error(error.error || 'Invalid OTP');
      }

      // Reload verification status
      await loadVerificationStatus();
      setPhoneOtpSent(false);
      setPhoneOtp('');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Invalid OTP');
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
        throw new Error('Not authenticated');
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
          throw new Error(errorData.error || 'Failed to update email');
        }
      }

      // Send verification email using the updated email
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) throw error;

      setEmailSuccess('Verification email sent! Please check your inbox and click the verification link.');
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : 'Failed to send verification email');
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
        <h1 className="text-3xl font-bold text-gray-900">Verify Account</h1>
        <p className="text-gray-600 mt-2">
          Verify your phone number and email address to secure your account
        </p>
      </div>

      <div className="space-y-6">
        {/* Phone Verification */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Phone className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Phone Number Verification</h2>
            </div>
            {phoneVerified ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Verified</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Not Verified</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
              />
            </div>

            {!phoneVerified && (
              <>
                {!phoneOtpSent ? (
                  <button
                    onClick={handleSendPhoneOTP}
                    disabled={phoneSending || !phone}
                    className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    {phoneSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send Verification Code</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Enter Verification Code
                      </label>
                      <input
                        type="text"
                        value={phoneOtp}
                        onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleVerifyPhone}
                        disabled={phoneOtp.length !== 6 || phoneVerifying}
                        className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
                      >
                        {phoneVerifying ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            <span>Verify Phone</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setPhoneOtpSent(false);
                          setPhoneOtp('');
                          setPhoneError('');
                        }}
                        className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {phoneSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                    {phoneSuccess}
                  </div>
                )}
                {phoneError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                    {phoneError}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Email Verification */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-6 h-6 text-gray-700" />
              <h2 className="text-xl font-semibold text-gray-900">Email Verification</h2>
            </div>
            {emailVerified && !emailEditing ? (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Verified</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">Not Verified</span>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {((!emailVerified && email.endsWith('@kasicourier.local')) || emailEditing) && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
                {emailEditing 
                  ? 'Changing your email will require re-verification.'
                  : "You're using a placeholder email. Please enter your real email address to receive important updates."
                }
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex gap-2">
                {emailVerified && !emailEditing ? (
                  <>
                    <input
                      type="email"
                      value={email}
                      disabled
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                    <button
                      onClick={() => {
                        setOriginalEmail(email);
                        setEmailEditing(true);
                        setEmailError('');
                        setEmailSuccess('');
                      }}
                      className="flex items-center space-x-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
                    >
                      <Pencil className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </>
                ) : (
                  <>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                    {emailEditing && (
                      <button
                        onClick={() => {
                          setEmail(originalEmail);
                          setEmailEditing(false);
                          setEmailError('');
                          setEmailSuccess('');
                        }}
                        className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
                      >
                        Cancel
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
                  className="flex items-center space-x-2 bg-primary text-white px-6 py-2 rounded-md hover:bg-primary-dark transition-colors disabled:opacity-50 font-medium"
                >
                  {emailSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>{emailEditing ? 'Update & Verify Email' : 'Send Verification Email'}</span>
                    </>
                  )}
                </button>

                {emailError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                    {emailError}
                  </div>
                )}

                {emailSuccess && (
                  <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm">
                    {emailSuccess}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
