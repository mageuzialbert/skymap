-- Add delivery_fee column to businesses if missing (schema cache error fix)
-- Run this in Supabase SQL Editor if you see: Could not find the 'delivery_fee' column of 'businesses' in the schema cache

ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT NULL;

-- Optional: refresh PostgREST schema cache (Supabase usually picks this up after DDL)
-- NOTIFY pgrst, 'reload schema';
