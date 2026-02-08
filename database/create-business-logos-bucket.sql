-- Create business-logos storage bucket for business logo uploads
-- Run this in Supabase SQL Editor

-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-logos',
  'business-logos',
  true, -- Public bucket so logos are accessible
  5242880, -- 5MB limit (5 * 1024 * 1024)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp'];

-- Create storage policy: Allow authenticated users to upload their own business logos
CREATE POLICY "Businesses can upload their own logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy: Allow authenticated users to update their own logos
CREATE POLICY "Businesses can update their own logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy: Allow authenticated users to delete their own logos
CREATE POLICY "Businesses can delete their own logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'business-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create storage policy: Allow public read access to all logos
CREATE POLICY "Public can read business logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'business-logos');

-- Note: The current implementation uses service role key for uploads,
-- so the folder-based policies above may not be needed.
-- However, they're good for future security if you switch to client-side uploads.
