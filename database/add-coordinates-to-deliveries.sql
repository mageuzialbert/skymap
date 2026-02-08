-- Add coordinate columns to deliveries table
ALTER TABLE deliveries
ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS dropoff_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS dropoff_longitude DECIMAL(11, 8);
