import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOTPSMS } from '@/lib/sms';
import { sendOTPEmail } from '@/lib/email';

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
    const body = await request.json();
    const channel: 'sms' | 'email' = body.channel === 'email' ? 'email' : 'sms';
    const phone: string | undefined = body.phone;
    const email: string | undefined = body.email;

    // SMS only works for Tanzanian (+255) numbers.
    if (channel === 'sms') {
      if (!phone) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
      }
      if (!phone.startsWith('+255')) {
        return NextResponse.json(
          { error: 'SMS verification only supports Tanzania (+255) numbers. Please verify by email instead.' },
          { status: 400 }
        );
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
      }
    }

    const otpCode = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Store the OTP keyed by the channel's identifier.
    const { error: dbError } = await supabaseAdmin.from('otp_codes').insert({
      phone: phone || null,
      email: channel === 'email' ? email : null,
      channel,
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

    // Send via the chosen channel.
    const sendResult =
      channel === 'email' ? await sendOTPEmail(email!, otpCode) : await sendOTPSMS(phone!, otpCode);

    if (!sendResult.success) {
      console.error(`Error sending OTP via ${channel}:`, sendResult.error);
      return NextResponse.json(
        {
          error: sendResult.error || `Failed to send verification code via ${channel}. Please try again.`,
          ...(process.env.NODE_ENV === 'development' && { debugOtp: otpCode }),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      channel,
      message: 'Verification code sent successfully',
      ...(process.env.NODE_ENV === 'development' && { debugOtp: otpCode }),
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
