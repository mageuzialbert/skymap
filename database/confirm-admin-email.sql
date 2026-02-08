-- Script to confirm email for admin user
-- This will mark the email as confirmed in auth.users table

-- Option 1: Confirm email via Supabase Dashboard (Easiest)
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Find the user with email: mageuzi@ipab.co.tz
-- 3. Click on the user
-- 4. Look for "Email Confirmed" field
-- 5. If it shows "Not confirmed", click "Confirm Email" button or toggle

-- Option 2: Confirm email via SQL (Run this script)
UPDATE auth.users
SET 
  email_confirmed_at = NOW(),
  confirmed_at = NOW()
WHERE email = 'mageuzi@ipab.co.tz';

-- Verify email is confirmed
SELECT 
  id,
  email,
  email_confirmed_at,
  confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NOT NULL THEN 'Email Confirmed ✅'
    ELSE 'Email Not Confirmed ❌'
  END as status
FROM auth.users
WHERE email = 'mageuzi@ipab.co.tz';
