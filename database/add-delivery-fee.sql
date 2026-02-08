-- Add delivery_fee column to deliveries table
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2);
