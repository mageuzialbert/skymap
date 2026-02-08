-- Script to create an Admin user
-- Email: info@ipab.co.tz
-- Phone: +255759561313
-- Password: Set via Supabase Auth Dashboard or use the password reset flow

-- Step 1: Create the auth user in Supabase Auth
-- Note: This needs to be done via Supabase Dashboard or Admin API
-- Go to Supabase Dashboard > Authentication > Users > Add User
-- Or use the Supabase Admin API

-- Step 2: After creating the auth user, get the user ID from auth.users table
-- Then run this script to create the user record with ADMIN role

-- First, let's check if the user already exists in auth.users
-- You'll need to replace 'USER_ID_FROM_AUTH' with the actual UUID from auth.users

-- Option A: If you already have the auth user ID
-- Replace 'USER_ID_FROM_AUTH' with the actual UUID from auth.users table
/*
INSERT INTO users (id, name, email, phone, role, active, created_at)
VALUES (
  'USER_ID_FROM_AUTH',  -- Replace with actual UUID from auth.users
  'Admin User',
  'info@ipab.co.tz',
  '+255759561313',
  'ADMIN',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  role = 'ADMIN',
  active = true;
*/

-- Option B: Complete script using Supabase Admin API approach
-- This script assumes you'll create the auth user first, then run the INSERT

-- Step 1: Create auth user (do this via Supabase Dashboard or Admin API)
-- Email: info@ipab.co.tz
-- Password: [Set a secure password]
-- Email confirmed: true

-- Step 2: After auth user is created, find the user ID
-- Run this query in Supabase SQL Editor to find the user:
SELECT id, email FROM auth.users WHERE email = 'info@ipab.co.tz';

-- Step 3: Use the ID from above query and run this INSERT:
-- (Replace 'YOUR_AUTH_USER_ID_HERE' with the actual UUID)

DO $$
DECLARE
  auth_user_id UUID;
BEGIN
  -- Get the auth user ID
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'info@ipab.co.tz'
  LIMIT 1;

  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email info@ipab.co.tz not found. Please create the auth user first via Supabase Dashboard.';
  END IF;

  -- Insert or update the user record
  INSERT INTO users (id, name, email, phone, role, active, created_at)
  VALUES (
    auth_user_id,
    'Admin User',
    'info@ipab.co.tz',
    '+255759561313',
    'ADMIN',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    role = 'ADMIN',
    active = true;

  RAISE NOTICE 'Admin user created/updated successfully with ID: %', auth_user_id;
END $$;

-- Verification query - run this to verify the admin user was created
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  u.role,
  u.active,
  au.email_confirmed_at
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'info@ipab.co.tz' OR u.phone = '+255759561313';
