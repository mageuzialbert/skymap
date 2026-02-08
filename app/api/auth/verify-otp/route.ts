import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role for admin operations
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
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    // Normalize phone number to ensure it matches what was stored
    let phoneNumber = phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    // Verify OTP - first check if any OTP exists for this phone
    const { data: allOtps, error: checkError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('phone', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(5);

    if (checkError) {
      console.error('Error checking OTPs:', checkError);
    } else {
      console.log(`Found ${allOtps?.length || 0} OTP records for ${phoneNumber}`);
      if (allOtps && allOtps.length > 0) {
        console.log('Recent OTPs:', allOtps.map(o => ({
          code: o.code,
          used: o.used,
          expires_at: o.expires_at,
          created_at: o.created_at
        })));
      }
    }

    // Verify OTP
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('phone', phoneNumber)
      .eq('code', code.toString())
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      console.error('OTP verification error:', otpError);
      console.error('Looking for phone:', phoneNumber, 'code:', code, 'code type:', typeof code);
      
      // Provide more specific error message
      if (otpError?.code === 'PGRST116') {
        // Check if OTP exists but is used or expired
        const { data: usedOtp } = await supabaseAdmin
          .from('otp_codes')
          .select('*')
          .eq('phone', phoneNumber)
          .eq('code', code.toString())
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (usedOtp) {
          if (usedOtp.used) {
            return NextResponse.json(
              { error: 'This verification code has already been used. Please request a new one.' },
              { status: 400 }
            );
          }
          if (new Date(usedOtp.expires_at) < new Date()) {
            return NextResponse.json(
              { error: 'This verification code has expired. Please request a new one.' },
              { status: 400 }
            );
          }
        }
      }
      
      return NextResponse.json(
        { error: 'Invalid or expired OTP. Please check the code and try again.' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpData.id);

    // Find user in users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phoneNumber)
      .single();

    if (userError || !userData || !userData.email) {
      return NextResponse.json(
        { error: 'User not found. Please register first.' },
        { status: 404 }
      );
    }

    // Find auth user by email
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === userData.email);

    if (!authUser) {
      return NextResponse.json(
        { error: 'Authentication user not found' },
        { status: 404 }
      );
    }

    // Create a session using temporary password method
    // Note: This will change the user's password, but it's necessary for OTP-based login
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16) + 'A1!';
    
    // First, ensure email is confirmed (required for signInWithPassword)
    // This is needed for users created via quick-order with unconfirmed placeholder emails
    const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      { 
        password: tempPassword,
        email_confirm: true // Confirm email to allow sign-in
      }
    );
    
    if (confirmError) {
      console.error('Error updating user:', confirmError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    const supabasePublic = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: authData, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email: userData.email,
      password: tempPassword,
    });
    
    if (signInError || !authData?.session) {
      console.error('Error signing in with temp password:', signInError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    const accessToken = authData.session.access_token;
    const refreshToken = authData.session.refresh_token;
    
    // Return the session tokens
    return NextResponse.json({
      success: true,
      userId: authUser.id,
      email: userData.email,
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
