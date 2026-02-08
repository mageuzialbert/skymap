-- Company Profile Table for storing company information
-- This is a single-row table that stores company details used in invoices and landing page

CREATE TABLE IF NOT EXISTS company_profile (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  logo_url TEXT,
  favicon_url TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  region TEXT,
  postal_code TEXT,
  website TEXT,
  tax_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint to ensure only one company profile exists
-- We'll use a fixed ID for the single row
DO $$
BEGIN
  -- Insert a default row if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM company_profile LIMIT 1) THEN
    INSERT INTO company_profile (id, company_name) 
    VALUES ('00000000-0000-0000-0000-000000000001', 'Skymap Logistics')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create a unique constraint on a computed column to ensure single row
-- Alternative approach: Use a check constraint
ALTER TABLE company_profile 
ADD CONSTRAINT single_company_profile 
CHECK (id = '00000000-0000-0000-0000-000000000001');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_profile_id ON company_profile(id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_company_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_profile_updated_at
  BEFORE UPDATE ON company_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_company_profile_updated_at();

-- Enable RLS
ALTER TABLE company_profile ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Public can read company profile (for landing page and invoices)
CREATE POLICY "Public can read company profile"
  ON company_profile FOR SELECT
  USING (true);

-- Admins can insert company profile
CREATE POLICY "Admins can insert company profile"
  ON company_profile FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update company profile
CREATE POLICY "Admins can update company profile"
  ON company_profile FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can delete company profile
CREATE POLICY "Admins can delete company profile"
  ON company_profile FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
