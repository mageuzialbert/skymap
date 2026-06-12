-- Phase 11: Allow authenticated admins to upload/replace/remove home videos.
-- The 'home-videos' bucket only had a public-read policy, so client-direct
-- uploads failed with "new row violates row-level security policy". Idempotent.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='home_videos_auth_upload'
  ) THEN
    CREATE POLICY home_videos_auth_upload ON storage.objects
      FOR INSERT TO authenticated WITH CHECK (bucket_id = 'home-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='home_videos_auth_update'
  ) THEN
    CREATE POLICY home_videos_auth_update ON storage.objects
      FOR UPDATE TO authenticated USING (bucket_id = 'home-videos');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
      AND policyname='home_videos_auth_delete'
  ) THEN
    CREATE POLICY home_videos_auth_delete ON storage.objects
      FOR DELETE TO authenticated USING (bucket_id = 'home-videos');
  END IF;
END$$;
