-- Invoice System Enhancements
-- Adds support for manual invoice creation, proforma invoices, and payment instructions

-- ============================================
-- UPDATE INVOICES TABLE
-- ============================================

-- Add new columns to invoices table
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS invoice_type TEXT DEFAULT 'INVOICE' CHECK (invoice_type IN ('INVOICE', 'PROFORMA'));

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS due_date DATE;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update status check constraint to include PROFORMA
-- First, drop the existing constraint if it exists
ALTER TABLE invoices
DROP CONSTRAINT IF EXISTS invoices_status_check;

-- Add new constraint with PROFORMA status
ALTER TABLE invoices
ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('DRAFT', 'PROFORMA', 'SENT', 'PAID', 'CANCELLED'));

-- ============================================
-- PAYMENT INSTRUCTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS payment_instructions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL DEFAULT 'Payment Instructions',
  instructions TEXT NOT NULL,
  bank_name TEXT,
  account_name TEXT,
  account_number TEXT,
  swift_code TEXT,
  branch TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraint to ensure only one active payment instruction set exists
-- We'll use a fixed ID for the single row
DO $$
BEGIN
  -- Insert a default row if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM payment_instructions LIMIT 1) THEN
    INSERT INTO payment_instructions (id, title, instructions) 
    VALUES ('00000000-0000-0000-0000-000000000002', 'Payment Instructions', 'Please make payment using the details below.')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create a unique constraint to ensure single row
ALTER TABLE payment_instructions 
ADD CONSTRAINT single_payment_instructions 
CHECK (id = '00000000-0000-0000-0000-000000000002');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_instructions_id ON payment_instructions(id);
CREATE INDEX IF NOT EXISTS idx_payment_instructions_active ON payment_instructions(active);

-- Update trigger
CREATE OR REPLACE FUNCTION update_payment_instructions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_payment_instructions_updated_at
  BEFORE UPDATE ON payment_instructions
  FOR EACH ROW
  EXECUTE FUNCTION update_payment_instructions_updated_at();

-- ============================================
-- ENABLE RLS
-- ============================================

ALTER TABLE payment_instructions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR PAYMENT INSTRUCTIONS
-- ============================================

-- Public can read payment instructions (for invoices)
CREATE POLICY "Public can read payment instructions"
  ON payment_instructions FOR SELECT
  USING (true);

-- Admins can insert payment instructions
CREATE POLICY "Admins can insert payment instructions"
  ON payment_instructions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can update payment instructions
CREATE POLICY "Admins can update payment instructions"
  ON payment_instructions FOR UPDATE
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

-- Admins can delete payment instructions
CREATE POLICY "Admins can delete payment instructions"
  ON payment_instructions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================
-- UPDATE INVOICE ITEMS TABLE (if needed)
-- ============================================

-- Add created_at to invoice_items if it doesn't exist (for ordering)
ALTER TABLE invoice_items
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
