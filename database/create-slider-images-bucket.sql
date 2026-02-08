-- Create slider-images storage bucket for homepage slider uploads
-- Run this in Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'slider-images',
  'slider-images',
  true, -- Public bucket so slider images are accessible on homepage
  10485760, -- 10MB limit (10 * 1024 * 1024) - larger for banner images
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 10485760,
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

-- Note: The API route uses service role key for uploads (admin-only access),
-- so RLS policies are secondary. The bucket being public allows the images
-- to be displayed on the homepage without authentication.
