import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyOtpCode } from '@/lib/otp-server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

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
 * Step 2 of forgot-password: verify the reset code and set a new password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const channel: 'sms' | 'email' = body.channel === 'email' ? 'email' : 'sms';
    const { code, newPassword, confirmPassword } = body;

    if (!newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'New password and confirmation are required' }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    const identifier = channel === 'sms' ? normalizePhone(body.phone || '') : (body.email || '').trim().toLowerCase();
    if (!identifier) {
      return NextResponse.json({ error: 'Phone or email is required' }, { status: 400 });
    }

    // Verify the reset code (must have purpose='reset').
    const { valid, error: otpError } = await verifyOtpCode(channel, identifier, code, 'reset');
    if (!valid) {
      return NextResponse.json({ error: otpError || 'Invalid or expired code' }, { status: 400 });
    }

    // Resolve the account.
    const lookup = supabaseAdmin.from('users').select('id, role');
    const { data: userRow } = channel === 'sms'
      ? await lookup.eq('phone', identifier).maybeSingle()
      : await lookup.ilike('email', identifier).maybeSingle();

    if (!userRow) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userRow.id, {
      password: newPassword,
    });
    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json({ error: updateError.message || 'Failed to update password' }, { status: 500 });
    }

    return NextResponse.json({ success: true, role: userRow.role, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
