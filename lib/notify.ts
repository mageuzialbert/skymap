import { createClient } from '@supabase/supabase-js';
import { sendSMS } from '@/lib/sms';
import { sendEmail, wrapEmail } from '@/lib/email';

const ADMIN_PROFILE_ID = '00000000-0000-0000-0000-000000000001';

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface NotifyRecipient {
  phone?: string | null;
  email?: string | null;
  name?: string | null;
}

/**
 * Notify a recipient about an event over BOTH SMS and Email using a single
 * `sms_templates` row as the source of truth (SMS body = email body; the
 * template `name` is the email subject). Best-effort: failures on either
 * channel are caught and never block the caller.
 *
 * For `audience='admin'` templates, the admin phone + email are auto-resolved
 * from `company_profile` when not supplied.
 */
export async function notifyEvent(
  eventKey: string,
  recipient: NotifyRecipient = {},
  tags: Record<string, string> = {}
): Promise<void> {
  try {
    const admin = getSupabaseAdmin();

    const { data: template, error } = await admin
      .from('sms_templates')
      .select('*')
      .eq('event_key', eventKey)
      .single();

    if (error || !template) {
      console.warn(`Notification template not found for event: ${eventKey}`);
      return;
    }
    if (!template.active) return;

    let phone = recipient.phone || undefined;
    let email = recipient.email || undefined;

    // Admin-audience: pull missing contact from the company profile.
    if (template.audience === 'admin' && (!phone || !email)) {
      const { data: profile } = await admin
        .from('company_profile')
        .select('phone, email')
        .eq('id', ADMIN_PROFILE_ID)
        .single();
      if (!phone) phone = profile?.phone || undefined;
      if (!email) email = profile?.email || undefined;
    }

    // Substitute {{tags}} into the template body.
    let message: string = template.body;
    for (const [key, value] of Object.entries(tags)) {
      message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value ?? '');
    }
    const subject: string = template.name || 'The Skymap notification';

    const jobs: Promise<unknown>[] = [];
    if (phone) jobs.push(sendSMS(phone, message));
    if (email) jobs.push(sendEmail(email, subject, wrapEmail(subject, message)));

    if (jobs.length === 0) {
      console.warn(`No recipient phone/email for event "${eventKey}".`);
      return;
    }

    await Promise.allSettled(jobs);
  } catch (err) {
    console.error(`Error sending notifications for "${eventKey}":`, err);
  }
}
