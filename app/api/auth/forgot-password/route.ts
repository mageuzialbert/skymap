import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendOTPSMS } from '@/lib/sms';
import { sendOTPEmail } from '@/lib/email';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Normalize a phone number to international +255 (Tanzania) format.
function normalizePhone(input: string): string {
  let p = input.trim().replace(/[^\d+]/g, '');
  if (p.startsWith('+')) p = '+' + p.slice(1).replace(/\D/g, '');
  else p = p.replace(/\D/g, '');
  if (p.startsWith('0')) p = '+255' + p.slice(1);
  else if (p.startsWith('255')) p = '+' + p;
  else if (!p.startsWith('+')) p = '+255' + p;
  return p;
}

/**
 * Step 1 of forgot-password: send a reset code to an existing account by SMS or
 * Email. The code is stored with purpose='reset' so it can't be reused elsewhere.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const channel: 'sms' | 'email' = body.channel === 'email' ? 'email' : 'sms';

    let phone: string | null = null;
    let email: string | null = null;

    if (channel === 'sms') {
      if (!body.phone) {
        return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
      }
      phone = normalizePhone(body.phone);
      if (!phone.startsWith('+255')) {
        return NextResponse.json(
          { error: 'SMS verification only supports Tanzania (+255) numbers. Please use email instead.' },
          { status: 400 }
        );
      }
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!body.email || !emailRegex.test(body.email)) {
        return NextResponse.json({ error: 'A valid email address is required' }, { status: 400 });
      }
      email = body.email.trim().toLowerCase();
    }

    // The account must exist.
    const lookup = supabaseAdmin.from('users').select('id, active');
    const { data: userRow } = channel === 'sms'
      ? await lookup.eq('phone', phone).maybeSingle()
      : await lookup.ilike('email', email!).maybeSingle();

    if (!userRow) {
      return NextResponse.json(
        { error: `No account found with that ${channel === 'sms' ? 'phone number' : 'email address'}.` },
        { status: 404 }
      );
    }

    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    const { error: dbError } = await supabaseAdmin.from('otp_codes').insert({
      phone,
      email,
      channel,
      code,
      used: false,
      purpose: 'reset',
      expires_at: expiresAt.toISOString(),
    });

    if (dbError) {
      console.error('Error storing reset OTP:', dbError);
      return NextResponse.json({ error: 'Failed to generate reset code. Please try again.' }, { status: 500 });
    }

    const sendResult =
      channel === 'email' ? await sendOTPEmail(email!, code) : await sendOTPSMS(phone!, code);

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: sendResult.error || `Failed to send the reset code via ${channel}. Please try again.`,
          ...(process.env.NODE_ENV === 'development' && { debugOtp: code }),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      channel,
      message: 'Reset code sent successfully',
      ...(process.env.NODE_ENV === 'development' && { debugOtp: code }),
    });
  } catch (error) {
    console.error('Error in forgot-password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
