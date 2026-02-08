import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request: NextRequest) {
  try {
    const { phone, email, password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    if (!phone && !email) {
      return NextResponse.json(
        { error: 'Phone or email is required' },
        { status: 400 }
      );
    }

    let userEmail: string;

    if (email) {
      // Email-based login (for staff/admin/rider)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Invalid email format' },
          { status: 400 }
        );
      }
      userEmail = email.trim();
    } else {
      // Phone-based login (for businesses)
      // Normalize phone number
      let phoneNumber = phone.trim();
      if (!phoneNumber.startsWith('+255')) {
        phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
      } else {
        phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
      }

      // Look up email from phone number in users table
      const { data: userData, error: userError } = await supabaseAdmin
        .from('users')
        .select('email, id')
        .eq('phone', phoneNumber)
        .single();

      if (userError || !userData || !userData.email) {
        return NextResponse.json(
          { error: 'User not found. Please check your phone number.' },
          { status: 404 }
        );
      }

      userEmail = userData.email;
    }

    // Verify password by attempting to sign in
    // We'll use a regular supabase client for this (not admin) to verify password
    const supabasePublic = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: authData, error: authError } = await supabasePublic.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (authError || !authData.session) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Get user role for redirect information
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    // Return session tokens
    return NextResponse.json({
      success: true,
      user: authData.user,
      role: userData?.role || null,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    });
  } catch (error) {
    console.error('Error in password login:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
