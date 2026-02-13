-- Add package_image_url column to deliveries table
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS package_image_url TEXT;

-- Create storage bucket for order attachments if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-attachments', 'order-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public read access to order-attachments
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'order-attachments' );

-- Policy to allow anyone to upload to order-attachments (for landing page orders)
CREATE POLICY "Public Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'order-attachments' );
