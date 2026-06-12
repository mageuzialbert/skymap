-- Phase 4: Allow larger package-image uploads. Idempotent.
-- Client uploads go directly to the 'order-attachments' bucket, so the bucket
-- limit is what matters (Next body limits don't apply).

UPDATE storage.buckets
SET file_size_limit = 52428800, -- 50 MB
    allowed_mime_types = ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif']
WHERE id = 'order-attachments';
