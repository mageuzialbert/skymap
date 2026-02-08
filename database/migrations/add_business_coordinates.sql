-- Add latitude and longitude columns to businesses table
-- Run this in Supabase SQL Editor

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8) DEFAULT NULL;

-- Add address column if it doesn't exist (some forms may need it)
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS address TEXT DEFAULT NULL;

-- Create index for geographic queries (optional, for future use)
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses(latitude, longitude);
