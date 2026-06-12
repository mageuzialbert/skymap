-- Phase 1: Admin-managed home page videos (CMS)
-- Idempotent: safe to re-run.

-- Videos shown on the marketing landing page (video plays by default, falls
-- back to the image slideshow when there is no next video).
CREATE TABLE IF NOT EXISTS home_videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT,
  video_url TEXT NOT NULL,
  poster_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_home_videos_active ON home_videos(active);
CREATE INDEX IF NOT EXISTS idx_home_videos_order ON home_videos(order_index);

-- Public storage bucket for the video files (large size limit; videos are big).
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('home-videos', 'home-videos', true, 524288000) -- 500 MB
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 524288000;

-- Allow public read; allow service-role (used by API routes) to write.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'home_videos_public_read'
  ) THEN
    CREATE POLICY home_videos_public_read ON storage.objects
      FOR SELECT USING (bucket_id = 'home-videos');
  END IF;
END $$;

-- Seed the About Us copy (used by the landing page modal) if not already set.
INSERT INTO cms_content (key, content)
VALUES (
  'about_us',
  jsonb_build_object(
    'title', 'About Us',
    'description', E'The Sky Map is a smart transportation and delivery platform that connects people, parcels, and destinations quickly, safely, and efficiently.\n\nOur app provides on-demand delivery services for parcels, documents, and goods across the city. Users can request pickups and deliveries from airports, ports, railway stations, bus terminals, shopping centers, business hubs, and other locations, with real-time support from our trusted driver network.\n\nThe Sky Map also offers private transportation services, allowing users to book motorcycles, tuk-tuks (bajajis), or private cars for convenient travel. Simply enter your pickup and destination locations, choose your preferred vehicle, and a nearby driver will be assigned to your trip.\n\nOur mission is to simplify mobility and logistics through innovative technology, making transportation and delivery accessible, reliable, and seamless for everyone.\n\nThe Sky Map - Connecting People, Deliveries, and Destinations.',
    'features', jsonb_build_array()
  )
)
ON CONFLICT (key) DO NOTHING;
