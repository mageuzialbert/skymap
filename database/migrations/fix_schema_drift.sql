-- Columns that exist in the production database but were never added by any
-- schema file. Required so a migrated/rebuilt DB matches production exactly.
ALTER TABLE cms_content   ADD COLUMN IF NOT EXISTS created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE slider_images ADD COLUMN IF NOT EXISTS title       TEXT;
ALTER TABLE slider_images ADD COLUMN IF NOT EXISTS description TEXT;
