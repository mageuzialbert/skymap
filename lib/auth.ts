import { supabase } from './supabase';

export interface RegisterData {
  businessName: string;
  email: string;
  phone: string;
  password: string;
  districtId?: number;
  packageId?: string;
}

export interface LoginData {
  phone: string;
  password?: string;
  otp?: string;
}

export async function registerBusiness(data: RegisterData) {
  // Use server-side API route to handle registration (bypasses RLS)
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      businessName: data.businessName,
      email: data.email,
      phone: data.phone,
      password: data.password,
      districtId: data.districtId,
      packageId: data.packageId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Registration failed');
  }

  const result = await response.json();
  
  // After successful registration, sign in the user
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (signInError) {
    // Registration succeeded but sign-in failed - user will need to sign in manually
    throw new Error('Registration successful, but automatic sign-in failed. Please sign in manually.');
  }

  return { user: signInData.user, session: signInData.session };
}

export async function loginWithPassword(phone: string, password: string) {
  // Normalize phone number
  let phoneNumber = phone.trim();
  if (!phoneNumber.startsWith('+255')) {
    phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
  } else {
    phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
  }

  // Call API route to handle login (bypasses RLS)
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneNumber, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();

  // Set session if we have tokens
  if (result.accessToken && result.refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    return { user: result.user, session: sessionData };
  }

  return result;
}

export async function loginWithEmail(email: string, password: string) {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email format');
  }

  // Call API route to handle email-based login
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }

  const result = await response.json();

  // Set session if we have tokens
  if (result.accessToken && result.refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });

    if (sessionError) {
      throw new Error('Failed to create session');
    }

    return { user: result.user, session: sessionData };
  }

  return result;
}

export async function sendOTP(phone: string) {
  // Normalize phone number
  let phoneNumber = phone.trim();
  if (!phoneNumber.startsWith('+255')) {
    phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
  } else {
    phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
  }

  // Call API route to generate and send OTP
  const response = await fetch('/api/auth/send-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneNumber }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send OTP');
  }

  const data = await response.json();
  return { success: true, debugOtp: data.debugOtp };
}

export async function verifyOTP(phone: string, code: string) {
  // Normalize phone number
  let phoneNumber = phone.trim();
  if (!phoneNumber.startsWith('+255')) {
    phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
  } else {
    phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
  }

  // Call server API route to verify OTP and create session
  const response = await fetch('/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: phoneNumber, code }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify OTP');
  }

  const result = await response.json();
  
  // If we have tokens, set the session
  if (result.accessToken && result.refreshToken) {
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
    });

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error(`Failed to create session: ${sessionError.message}`);
    }

    if (!sessionData?.session) {
      throw new Error('Session was not created properly');
    }

    return { success: true, session: sessionData.session, user: sessionData.user };
  }

  throw new Error('No session tokens received from server');
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}

export async function resetPassword(newPassword: string, confirmPassword: string) {
  // Validation
  if (!newPassword || !confirmPassword) {
    throw new Error('New password and confirmation are required');
  }

  if (newPassword !== confirmPassword) {
    throw new Error('Passwords do not match');
  }

  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  // Call API route to reset password
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword, confirmPassword }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to reset password');
  }

  const result = await response.json();
  return result;
}
