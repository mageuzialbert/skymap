-- Phase 1: Dual-channel OTP (SMS + email) and email logging.
-- Idempotent: safe to re-run.

-- Allow OTP codes to be keyed by email (for the email channel) as well as phone.
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS channel TEXT NOT NULL DEFAULT 'sms'
  CHECK (channel IN ('sms', 'email'));
-- Email-channel codes may not carry a phone, so phone is no longer mandatory.
ALTER TABLE otp_codes ALTER COLUMN phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_otp_codes_email ON otp_codes(email);

-- Mirror of sms_logs for email delivery attempts.
CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed')),
  provider_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
