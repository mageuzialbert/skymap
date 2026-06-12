-- Phase 10: Self-service password reset. Idempotent.
-- Distinguishes OTP purpose (e.g. 'reset') so a code issued for password reset
-- can't be reused for registration/login and vice-versa.

ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS purpose TEXT;
