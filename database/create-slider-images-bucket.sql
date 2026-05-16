-- Create slider-images storage bucket for homepage slider uploads
-- Run this in Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slider-images',
  'slider-images',
  true, -- Public bucket so slider images are accessible on homepage
  52428800, -- 50MB limit (50 * 1024 * 1024) for high-resolution banner images
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- Create storage policy: Allow admins to upload slider images
-- Note: Uses service role key for uploads, but policy included for direct access if needed
CREATE POLICY "Admins can upload slider images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'slider-images'
);

-- Create storage policy: Allow admins to update slider images
CREATE POLICY "Admins can update slider images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'slider-images')
WITH CHECK (bucket_id = 'slider-images');

-- Create storage policy: Allow admins to delete slider images
CREATE POLICY "Admins can delete slider images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'slider-images');

-- Create storage policy: Allow public read access to all slider images
CREATE POLICY "Public can read slider images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'slider-images');

-- Note: Uploads happen client-side from the admin sliders page using the user's
-- authenticated session. The RLS policies above gate access. The bucket is public-read
-- so slider images are accessible on the homepage without authentication.
