-- Migration: Add PENDING_CONFIRMATION status for rider-created deliveries
-- This status is used when riders create deliveries that need staff/admin confirmation

-- Step 1: Drop the existing CHECK constraint on deliveries.status
ALTER TABLE deliveries DROP CONSTRAINT IF EXISTS deliveries_status_check;

-- Step 2: Add new CHECK constraint including PENDING_CONFIRMATION
ALTER TABLE deliveries ADD CONSTRAINT deliveries_status_check 
  CHECK (status IN ('CREATED', 'PENDING_CONFIRMATION', 'ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'FAILED', 'REJECTED'));

-- Add comment explaining the new status
COMMENT ON COLUMN deliveries.status IS 'Delivery status: CREATED (new), PENDING_CONFIRMATION (rider-created, awaiting approval), ASSIGNED (has rider), PICKED_UP, IN_TRANSIT, DELIVERED, FAILED, REJECTED (denied by staff)';
