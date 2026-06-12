import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export type OtpChannel = 'sms' | 'email';

/**
 * Verify a one-time code for a given channel + identifier and mark it used.
 * - For 'sms', identifier is the phone number (must match what was stored).
 * - For 'email', identifier is the email address.
 *
 * Returns { valid: true } on success, otherwise { valid: false, error }.
 */
export async function verifyOtpCode(
  channel: OtpChannel,
  identifier: string,
  code: string
): Promise<{ valid: boolean; error?: string }> {
  if (!identifier || !code) {
    return { valid: false, error: 'Verification code is required' };
  }

  const column = channel === 'email' ? 'email' : 'phone';

  const { data: otp, error } = await supabaseAdmin
    .from('otp_codes')
    .select('*')
    .eq('channel', channel)
    .eq(column, identifier)
    .eq('code', code.toString())
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !otp) {
    return { valid: false, error: 'Invalid or expired verification code' };
  }

  await supabaseAdmin.from('otp_codes').update({ used: true }).eq('id', otp.id);
  return { valid: true };
}
