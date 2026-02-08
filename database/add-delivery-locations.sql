-- Add missing location columns to deliveries table
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10, 8);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11, 8);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dropoff_latitude DECIMAL(10, 8);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS dropoff_longitude DECIMAL(11, 8);
