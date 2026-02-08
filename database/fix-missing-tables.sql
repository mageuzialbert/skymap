-- Fix schema issues for missing tables

-- 1. Fix CMS Content (Recreate with correct schema)
DROP TABLE IF EXISTS cms_content;

CREATE TABLE cms_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  content JSONB,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fix Slider Images (Add missing caption)
ALTER TABLE slider_images ADD COLUMN IF NOT EXISTS caption TEXT;
