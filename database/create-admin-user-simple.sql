-- Simple script to create Admin user
-- Prerequisites: Auth user must be created first via Supabase Dashboard
-- 
-- Instructions:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Click "Add User" or "Invite User"
-- 3. Enter email: info@ipab.co.tz
-- 4. Set a password and confirm email
-- 5. Copy the User UID
-- 6. Replace 'YOUR_USER_ID_HERE' below with the actual UUID
-- 7. Run this script

-- Replace 'YOUR_USER_ID_HERE' with the UUID from auth.users
INSERT INTO users (id, name, email, phone, role, active, created_at)
VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with UUID from auth.users
  'Admin User',
  'info@ipab.co.tz',
  '+255759561313',
  'ADMIN',
  true,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET 
  name = 'Admin User',
  email = 'info@ipab.co.tz',
  phone = '+255759561313',
  role = 'ADMIN',
  active = true;

-- Verify the user was created
SELECT id, name, email, phone, role, active FROM users WHERE email = 'info@ipab.co.tz';
