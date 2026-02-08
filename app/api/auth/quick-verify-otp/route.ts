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
    const { phone, code, businessName, districtId, address, latitude, longitude } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'Phone and code are required' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let phoneNumber = phone.trim();
    if (!phoneNumber.startsWith('+255')) {
      phoneNumber = '+255' + phoneNumber.replace(/^\+?255?/, '').replace(/\D/g, '');
    } else {
      phoneNumber = '+255' + phoneNumber.replace(/^\+255/, '').replace(/\D/g, '');
    }

    // Verify OTP
    const { data: otpData, error: otpError } = await supabaseAdmin
      .from('otp_codes')
      .select('*')
      .eq('phone', phoneNumber)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpData) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await supabaseAdmin
      .from('otp_codes')
      .update({ used: true })
      .eq('id', otpData.id);

    // Check if user exists
    const { data: existingUser, error: userCheckError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('phone', phoneNumber)
      .single();

    let userId: string;
    let businessId: string | null = null;
    let email: string;

    if (userCheckError && userCheckError.code === 'PGRST116') {
      // User doesn't exist - create new user
      if (!businessName) {
        return NextResponse.json(
          { error: 'Business name is required for new users' },
          { status: 400 }
        );
      }

      // Generate email from phone (for Supabase auth requirement)
      email = `${phoneNumber.replace(/\+/g, '')}@kasicourier.local`;

      // Create auth user - email_confirm: false so placeholder email is not verified
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12), // Random password
        email_confirm: false, // Don't verify placeholder email - user should provide real email later
        user_metadata: {
          business_name: businessName,
          phone: phoneNumber,
          role: 'BUSINESS',
        },
      });

      if (authError || !authData.user) {
        return NextResponse.json(
          { error: authError?.message || 'Failed to create user' },
          { status: 400 }
        );
      }

      userId = authData.user.id;

      // Create user record with phone verified, email NOT verified (placeholder email)
      const { error: userError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: userId,
          name: businessName,
          email: email,
          phone: phoneNumber,
          role: 'BUSINESS',
          active: true,
          phone_verified: true, // Phone was verified via OTP
          email_verified: false, // Placeholder email should not be verified
        }, {
          onConflict: 'id'
        });

      if (userError) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: userError.message },
          { status: 500 }
        );
      }

      // Parse latitude and longitude
      let finalLatitude = null;
      let finalLongitude = null;
      if (latitude !== undefined && latitude !== null) {
        const lat = parseFloat(latitude);
        if (!isNaN(lat) && lat >= -90 && lat <= 90) {
          finalLatitude = lat;
        }
      }
      if (longitude !== undefined && longitude !== null) {
        const lng = parseFloat(longitude);
        if (!isNaN(lng) && lng >= -180 && lng <= 180) {
          finalLongitude = lng;
        }
      }

      // Create business record
      const { data: businessData, error: businessError } = await supabaseAdmin
        .from('businesses')
        .insert({
          name: businessName,
          phone: phoneNumber,
          user_id: userId,
          district_id: districtId || null,
          billing_cycle: 'WEEKLY',
          active: true,
          address: address || null,
          latitude: finalLatitude,
          longitude: finalLongitude,
        })
        .select('id')
        .single();

      if (businessError) {
        await supabaseAdmin.from('users').delete().eq('id', userId);
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return NextResponse.json(
          { error: businessError.message },
          { status: 500 }
        );
      }

      businessId = businessData.id;
    } else if (existingUser) {
      // User exists - verify and update phone_verified status
      userId = existingUser.id;
      email = existingUser.email || `${phoneNumber.replace(/\+/g, '')}@kasicourier.local`;

      // Mark phone as verified for existing user
      await supabaseAdmin
        .from('users')
        .update({ phone_verified: true })
        .eq('id', userId);

      // Get business ID if user is a business
      if (existingUser.role === 'BUSINESS') {
        const { data: businessData } = await supabaseAdmin
          .from('businesses')
          .select('id')
          .eq('user_id', userId)
          .single();

        businessId = businessData?.id || null;
      }
    } else {
      return NextResponse.json(
        { error: 'Failed to process user' },
        { status: 500 }
      );
    }

    // Create a session using temporary password method
    const tempPassword = Math.random().toString(36).slice(-16) + Math.random().toString(36).slice(-16) + 'A1!';
    
    // Update user with temp password and confirm email (required for signInWithPassword)
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { 
        password: tempPassword,
        email_confirm: true // Confirm email to allow sign-in
      }
    );
    
    if (updateError) {
      console.error('Error updating user for session:', updateError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    // Sign in with the temporary password to get session tokens
    const supabasePublic = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const { data: authData, error: signInError } = await supabasePublic.auth.signInWithPassword({
      email: email,
      password: tempPassword,
    });
    
    if (signInError || !authData?.session) {
      console.error('Error signing in for session:', signInError);
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      userId,
      businessId,
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
    });
  } catch (error) {
    console.error('Error in quick verify OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
