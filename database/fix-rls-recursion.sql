-- Fix RLS infinite recursion on users table
-- The issue: Policies on "users" table SELECT from "users" to check roles,
-- causing infinite recursion when a user tries to read from users table.

-- Solution: Create a SECURITY DEFINER function that bypasses RLS to get user role

-- Step 1: Create a helper function to get the current user's role
-- This function runs with elevated privileges (SECURITY DEFINER) and bypasses RLS
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- Step 2: Drop the problematic policies on users table
DROP POLICY IF EXISTS "Users can read own record" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Staff can read riders and businesses" ON users;
DROP POLICY IF EXISTS "Users can update own record" ON users;
DROP POLICY IF EXISTS "Admins can update any user" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Step 3: Recreate policies using the helper function

-- Users can read their own record (no recursion here)
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users (using the safe function)
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (public.get_my_role() = 'ADMIN');

-- Staff can read riders and businesses (using the safe function)
CREATE POLICY "Staff can read riders and businesses"
  ON users FOR SELECT
  USING (
    public.get_my_role() = 'STAFF'
    AND role IN ('RIDER', 'BUSINESS')
  );

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (public.get_my_role() = 'ADMIN');

-- Admins can insert users
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (public.get_my_role() = 'ADMIN');

-- Done! The login should now work correctly.
