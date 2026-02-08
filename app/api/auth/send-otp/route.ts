import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOTPSMS } from '@/lib/sms';

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

// Generate a 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Validate phone format (should start with +255)
    if (!phone.startsWith('+255')) {
      return NextResponse.json(
        { error: 'Phone number must start with +255' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
    const otpCode = generateOTP();

    // Set expiration to 5 minutes from now
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Store OTP in database
    const { error: dbError } = await supabaseAdmin
      .from('otp_codes')
      .insert({
        phone: phone,
        code: otpCode,
        used: false,
        expires_at: expiresAt.toISOString(),
      });

    if (dbError) {
      console.error('Error storing OTP:', dbError);
      return NextResponse.json(
        { error: `Failed to generate OTP: ${dbError.message}. Please try again.` },
        { status: 500 }
      );
    }

    // Send OTP via iPAB SmartSMS
    const smsResult = await sendOTPSMS(phone, otpCode);

    if (!smsResult.success) {
      console.error('Error sending SMS:', smsResult.error);
      // Note: OTP is already stored, but SMS failed
      // We could delete it or leave it (user can request new one)
      return NextResponse.json(
        { 
          error: smsResult.error || 'Failed to send SMS. Please try again.',
          // In development, you might want to return the OTP for testing
          // Remove this in production!
          ...(process.env.NODE_ENV === 'development' && { debugOtp: otpCode })
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Verification code sent successfully',
      // In development, you might want to return the OTP for testing
      // Remove this in production!
      ...(process.env.NODE_ENV === 'development' && { debugOtp: otpCode })
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
