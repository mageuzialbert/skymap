-- Delivery Fee Packages Schema
-- This file creates the delivery_fee_packages table and adds package_id to businesses table

-- Create delivery_fee_packages table
CREATE TABLE IF NOT EXISTS delivery_fee_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  fee_per_delivery DECIMAL(10, 2) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add package_id column to businesses table
ALTER TABLE businesses 
ADD COLUMN IF NOT EXISTS package_id UUID REFERENCES delivery_fee_packages(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_delivery_fee_packages_active ON delivery_fee_packages(active);
CREATE INDEX IF NOT EXISTS idx_delivery_fee_packages_default ON delivery_fee_packages(is_default);
CREATE INDEX IF NOT EXISTS idx_businesses_package_id ON businesses(package_id);

-- Seed 3 default packages
INSERT INTO delivery_fee_packages (name, description, fee_per_delivery, is_default, active) VALUES
  ('Starter', '<10 parcels per week', 5000.00, true, true),
  ('Growth', '10-50 parcels per week', 4000.00, false, true),
  ('Enterprise', '50+ parcels per week', 3500.00, false, true)
ON CONFLICT DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_delivery_fee_packages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER delivery_fee_packages_updated_at
  BEFORE UPDATE ON delivery_fee_packages
  FOR EACH ROW
  EXECUTE FUNCTION update_delivery_fee_packages_updated_at();

-- Migrate existing businesses to default package
-- Set package_id for businesses that don't have one
UPDATE businesses
SET package_id = (
  SELECT id FROM delivery_fee_packages WHERE is_default = true LIMIT 1
)
WHERE package_id IS NULL;
