import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// SMTP configuration (custom email provider via nodemailer).
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
// Accept either SMTP_PASS or SMTP_PASSWORD.
const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD;
// Default the From address to the authenticated mailbox (most SMTP hosts, e.g.
// Titan, reject a From that doesn't match the authenticated domain).
const SMTP_FROM =
  process.env.SMTP_FROM ||
  (SMTP_USER ? `The Skymap <${SMTP_USER}>` : 'The Skymap <no-reply@theskymap.com>');
// secure=true for port 465 (implicit TLS); otherwise STARTTLS on 587.
const SMTP_SECURE = process.env.SMTP_SECURE === 'true' || SMTP_PORT === 465;

function getSupabaseAdmin() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return transporter;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email via the configured SMTP server. Logs every attempt to email_logs.
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<EmailResult> {
  const tx = getTransporter();
  if (!tx) {
    console.error('SMTP is not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
    return { success: false, error: 'Email service not configured' };
  }

  let result: EmailResult;
  try {
    const info = await tx.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ' '),
    });
    result = { success: true, messageId: info.messageId };
  } catch (error) {
    result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }

  // Log the attempt (best-effort).
  try {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from('email_logs').insert({
      to_email: to,
      subject,
      status: result.success ? 'success' : 'failed',
      provider_response: result.success ? result.messageId || 'sent' : result.error || 'unknown error',
    });
  } catch (logErr) {
    console.error('Failed to log email:', logErr);
  }

  return result;
}

/**
 * Wrap a plain notification message in a simple branded HTML email.
 */
export function wrapEmail(title: string, body: string): string {
  const paragraphs = body
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;color:#333;">${l}</p>`)
    .join('');
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 8px;">
      <div style="background:#0b5a54;padding:16px 20px;border-radius:12px 12px 0 0;">
        <span style="color:#fff;font-size:18px;font-weight:bold;">The Skymap</span>
      </div>
      <div style="border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px;padding:20px;">
        <h2 style="margin:0 0 12px;font-size:18px;color:#0b5a54;">${title}</h2>
        ${paragraphs}
      </div>
      <p style="text-align:center;color:#999;font-size:12px;margin-top:16px;">
        The Skymap — Connecting People, Deliveries, and Destinations.
      </p>
    </div>
  `;
}

/**
 * Send a 6-digit verification code by email.
 */
export async function sendOTPEmail(email: string, code: string): Promise<EmailResult> {
  const subject = 'Your The Skymap verification code';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #0b5a54;">The Skymap</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0b5a54;">${code}</p>
      <p style="color: #666;">This code is valid for 5 minutes. If you didn't request it, you can ignore this email.</p>
    </div>
  `;
  return sendEmail(email, subject, html, `Your The Skymap verification code is: ${code}. Valid for 5 minutes.`);
}
