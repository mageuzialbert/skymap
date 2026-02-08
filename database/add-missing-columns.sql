-- Add missing columns to businesses table matching source schema

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS package_id UUID; -- References delivery_fee_packages? If exists.
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS logo_url TEXT; -- Just in case

-- If package_id refs a table, we should add constraint, but let's keep it simple for data migration first.
-- If delivery_fee_packages table exists, we can add FK later.
