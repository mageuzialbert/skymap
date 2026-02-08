-- Automated script to create Admin user
-- This script will find the auth user by email and create the users table record
-- Make sure the auth user exists first!

-- Step 1: Ensure auth user exists (create via Supabase Dashboard if needed)
-- Email: mageuzi@ipab.co.tz
-- Password: [Set via dashboard]

-- Step 2: Run this script
DO $$
DECLARE
  auth_user_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Check if auth user exists
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'info@ipab.co.tz'
  LIMIT 1;

  IF auth_user_id IS NULL THEN
    RAISE EXCEPTION 'Auth user with email mageuzi@ipab.co.tz not found. Please create the auth user first:
    1. Go to Supabase Dashboard > Authentication > Users
    2. Click "Add User"
    3. Email: mageuzi@ipab.co.tz
    4. Set password and confirm email
    5. Then run this script again';
  END IF;

  -- Check if user record already exists
  SELECT EXISTS(SELECT 1 FROM users WHERE id = auth_user_id) INTO user_exists;

  IF user_exists THEN
    -- Update existing user to ADMIN
    UPDATE users
    SET 
      name = 'Admin User',
      email = 'mageuzi@ipab.co.tz',
      phone = '+255759561313',
      role = 'ADMIN',
      active = true
    WHERE id = auth_user_id;
    
    RAISE NOTICE 'Admin user updated successfully. User ID: %', auth_user_id;
  ELSE
    -- Insert new user record
    INSERT INTO users (id, name, email, phone, role, active, created_at)
    VALUES (
      auth_user_id,
      'Admin User',
      'mageuzi@ipab.co.tz',
      '+255759561313',
      'ADMIN',
      true,
      NOW()
    );
    
    RAISE NOTICE 'Admin user created successfully. User ID: %', auth_user_id;
  END IF;

END $$;

-- Verification
SELECT 
  u.id,
  u.name,
  u.email,
  u.phone,
  u.role,
  u.active,
  CASE 
    WHEN au.email_confirmed_at IS NOT NULL THEN 'Email Confirmed'
    ELSE 'Email Not Confirmed'
  END as email_status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'mageuzi@ipab.co.tz';
