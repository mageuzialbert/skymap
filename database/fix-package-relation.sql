-- Fix missing relationship between businesses and delivery_fee_packages
-- This resolves the "Could not find a relationship" error in the API

-- 1. Ensure the referenced table exists
CREATE TABLE IF NOT EXISTS delivery_fee_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  fee_per_delivery DECIMAL(10, 2) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add the Foreign Key Constraint
-- We first check if it exists to avoid errors on re-run
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_businesses_package'
  ) THEN
    -- Make sure the column exists first
    ALTER TABLE businesses ADD COLUMN IF NOT EXISTS package_id UUID;
    
    -- Add the constraint
    ALTER TABLE businesses
    ADD CONSTRAINT fk_businesses_package
    FOREIGN KEY (package_id)
    REFERENCES delivery_fee_packages(id)
    ON DELETE SET NULL;
    
    RAISE NOTICE 'Added fk_businesses_package constraint';
  ELSE
    RAISE NOTICE 'Constraint fk_businesses_package already exists';
  END IF;
END $$;

-- 3. Verify RLS policies on the packages table (needed for API access)
ALTER TABLE delivery_fee_packages ENABLE ROW LEVEL SECURITY;

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

-- 4. Create a default package if none exists (prevents dropdown errors if empty)
INSERT INTO delivery_fee_packages (name, fee_per_delivery, description, is_default)
SELECT 'Standard Delivery', 2000, 'Standard delivery fee', true
WHERE NOT EXISTS (SELECT 1 FROM delivery_fee_packages);
