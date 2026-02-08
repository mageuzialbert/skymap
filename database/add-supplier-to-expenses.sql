-- Add supplier column to expenses table
-- This allows tracking where expenses/services were purchased

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS supplier TEXT;

-- Create index for faster filtering by supplier
CREATE INDEX IF NOT EXISTS idx_expenses_supplier ON expenses(supplier);
