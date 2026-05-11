-- =====================================================================
-- Rider profile fields + user-profiles storage bucket
-- Run this once in the Supabase SQL Editor.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT / DROP POLICY IF EXISTS).
-- =====================================================================

-- 1) Add profile_picture_url + license_number columns to users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT;

-- Optional: index license_number lookups (uncomment if you'll query by it)
-- CREATE INDEX IF NOT EXISTS idx_users_license_number ON users(license_number);

-- 2) Create the 'user-profiles' storage bucket (public, 5MB max, image MIME types)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-profiles',
  'user-profiles',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 3) Storage RLS policies for the bucket
DROP POLICY IF EXISTS "Authenticated can upload user-profiles" ON storage.objects;
CREATE POLICY "Authenticated can upload user-profiles"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-profiles');

DROP POLICY IF EXISTS "Authenticated can update user-profiles" ON storage.objects;
CREATE POLICY "Authenticated can update user-profiles"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-profiles')
WITH CHECK (bucket_id = 'user-profiles');

DROP POLICY IF EXISTS "Authenticated can delete user-profiles" ON storage.objects;
CREATE POLICY "Authenticated can delete user-profiles"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-profiles');

DROP POLICY IF EXISTS "Public can read user-profiles" ON storage.objects;
CREATE POLICY "Public can read user-profiles"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-profiles');
