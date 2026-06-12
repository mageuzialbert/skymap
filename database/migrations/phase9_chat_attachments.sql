-- Phase 9: Rich chat attachments (image/video/audio/file/location) for both
-- the per-delivery chat (chat_messages) and the general chat (direct_messages).
-- Idempotent.

-- One flexible JSONB per message:
--   { type:'image'|'video'|'audio'|'file'|'location', url?, name?, mime?, size?, duration?, lat?, lng? }
ALTER TABLE chat_messages   ADD COLUMN IF NOT EXISTS attachment JSONB;
ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS attachment JSONB;

-- Attachment-only messages have no text.
ALTER TABLE chat_messages   ALTER COLUMN body DROP NOT NULL;
ALTER TABLE direct_messages ALTER COLUMN body DROP NOT NULL;

-- Public bucket for chat attachments (random/unguessable keys; 50 MB/file).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-attachments',
  'chat-attachments',
  true,
  52428800,
  ARRAY[
    'image/jpeg','image/jpg','image/png','image/webp','image/gif','image/heic','image/heif',
    'application/pdf',
    'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain','text/csv',
    'audio/webm','audio/ogg','audio/mpeg','audio/mp4','audio/wav','audio/aac',
    'video/mp4','video/webm','video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage policies: public read, authenticated upload (guarded, idempotent).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='chat_attachments_public_read'
  ) THEN
    CREATE POLICY chat_attachments_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'chat-attachments');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='chat_attachments_auth_upload'
  ) THEN
    CREATE POLICY chat_attachments_auth_upload ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'chat-attachments');
  END IF;
END $$;
