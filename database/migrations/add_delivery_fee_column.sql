-- Migration: Add delivery_fee column to deliveries table
-- This stores the delivery fee directly on the delivery record for easy reference
-- The fee is also tracked in the charges table for revenue calculations

ALTER TABLE deliveries 
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT NULL;

-- Add comment to clarify the column's purpose
COMMENT ON COLUMN deliveries.delivery_fee IS 'The delivery fee charged for this delivery. Also tracked in charges table for revenue.';
