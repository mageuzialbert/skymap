-- Add missing columns to businesses table matching source schema
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS postal_code TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS package_id UUID;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Create delivery_fee_packages if not exists (it should, but just in case)
CREATE TABLE IF NOT EXISTS delivery_fee_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  fee_per_delivery DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on delivery_fee_packages
ALTER TABLE delivery_fee_packages ENABLE ROW LEVEL SECURITY;

-- Add foreign key constraint for package_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_businesses_package'
  ) THEN
    ALTER TABLE businesses
    ADD CONSTRAINT fk_businesses_package
    FOREIGN KEY (package_id)
    REFERENCES delivery_fee_packages(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Policies for delivery_fee_packages (from rls.sql if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can read active packages') THEN
        CREATE POLICY "Public can read active packages" ON delivery_fee_packages FOR SELECT USING (active = true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin and Staff can read all packages') THEN
        CREATE POLICY "Admin and Staff can read all packages" ON delivery_fee_packages FOR SELECT USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF'))
        );
    END IF;
END $$;
