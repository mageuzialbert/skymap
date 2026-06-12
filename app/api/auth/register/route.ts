import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyOtpCode, OtpChannel } from '@/lib/otp-server';

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
    const { businessName, email, phone, password, districtId, packageId, channel, code } =
      await request.json();

    // Validation
    if (!businessName || !email || !phone || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Normalize the international phone (keep the country's dial code; do not force +255).
    const phoneNumber = '+' + phone.trim().replace(/^\+/, '').replace(/\D/g, '');
    if (phoneNumber.replace(/\D/g, '').length < 8) {
      return NextResponse.json(
        { error: 'Please enter a valid phone number' },
        { status: 400 }
      );
    }

    // Require a verified OTP (SMS for +255, email for everyone) before creating the account.
    const otpChannel: OtpChannel = channel === 'email' ? 'email' : 'sms';
    const identifier = otpChannel === 'email' ? email : phoneNumber;
    const { valid, error: otpErr } = await verifyOtpCode(otpChannel, identifier, code);
    if (!valid) {
      return NextResponse.json({ error: otpErr || 'Invalid or expired verification code' }, { status: 400 });
    }

    // Create auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for MVP
      user_metadata: {
        business_name: businessName,
        phone: phoneNumber,
        role: 'BUSINESS',
      },
    });

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // The trigger should have already created the user record
    // Use UPSERT to handle both cases: if trigger created it, update it; if not, insert it
    const { error: userError } = await supabaseAdmin
      .from('users')
      .upsert({
        id: authData.user.id,
        name: businessName,
        email: email,
        phone: phoneNumber,
        role: 'BUSINESS',
        active: true,
        phone_verified: otpChannel === 'sms',
        email_verified: otpChannel === 'email',
      }, {
        onConflict: 'id'
      });

    if (userError) {
      // Rollback: delete auth user if users table operation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      );
    }

    // Get default package if packageId not provided
    let finalPackageId = packageId;
    if (!finalPackageId) {
      const { data: defaultPackage } = await supabaseAdmin
        .from('delivery_fee_packages')
        .select('id')
        .eq('is_default', true)
        .eq('active', true)
        .single();
      
      if (defaultPackage) {
        finalPackageId = defaultPackage.id;
      }
    }

    // Create business record
    const { error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: businessName,
        phone: phoneNumber,
        user_id: authData.user.id,
        district_id: districtId || null,
        package_id: finalPackageId || null,
        billing_cycle: 'WEEKLY',
        active: true,
      });

    if (businessError) {
      // Rollback: delete user records if business creation fails
      await supabaseAdmin.from('users').delete().eq('id', authData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: businessError.message },
        { status: 500 }
      );
    }

    // Notify admin of the new business, and welcome the client (SMS + Email).
    try {
      const { notifyEvent } = await import('@/lib/notify');
      await notifyEvent('admin_new_business', {}, {
        business_name: businessName,
        business_phone: phoneNumber,
      });
      await notifyEvent(
        'client_registration',
        { phone: phoneNumber, email },
        { client_name: businessName }
      );
    } catch (notifyErr) {
      console.error('Failed to send registration notifications:', notifyErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Registration successful. Please sign in.',
      userId: authData.user.id,
    });
  } catch (error) {
    console.error('Error registering business:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
