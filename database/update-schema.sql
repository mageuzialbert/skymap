-- Migration: Add regions, districts, and update businesses/deliveries tables
-- Run this AFTER running the main schema.sql

-- Add district_id to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL;

-- Add region and district IDs to deliveries table
ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS pickup_region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pickup_district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dropoff_region_id BIGINT REFERENCES regions(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS dropoff_district_id BIGINT REFERENCES districts(id) ON DELETE SET NULL;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_businesses_district_id ON businesses(district_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_region_id ON deliveries(pickup_region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_pickup_district_id ON deliveries(pickup_district_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_dropoff_region_id ON deliveries(dropoff_region_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_dropoff_district_id ON deliveries(dropoff_district_id);
