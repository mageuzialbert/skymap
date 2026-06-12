-- Phase 5: Multi-service request flow (general transporter).
-- Adds a service type, optional scheduled pickup time, and free-text service
-- details to deliveries; relaxes dropoff NOT NULLs (hire/errand have no recipient).
-- Idempotent: safe to re-run.

-- What kind of service this request is.
--   delivery | ride | hire | errand
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS service_type TEXT NOT NULL DEFAULT 'delivery';

-- NULL = "As soon as possible"; otherwise the customer's chosen pickup/start time.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS scheduled_pickup_at TIMESTAMP WITH TIME ZONE;

-- Multipurpose free text: ride note / hire duration + plan / errand shopping list + budget.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS service_details TEXT;

-- Constrain service_type to the four built-in services (guarded so re-runs don't error).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_service_type_check'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT deliveries_service_type_check
      CHECK (service_type IN ('delivery', 'ride', 'hire', 'errand'));
  END IF;
END$$;

-- Hire and errand requests have no recipient/dropoff, so these can be empty.
ALTER TABLE deliveries ALTER COLUMN dropoff_address DROP NOT NULL;
ALTER TABLE deliveries ALTER COLUMN dropoff_name DROP NOT NULL;
ALTER TABLE deliveries ALTER COLUMN dropoff_phone DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_deliveries_service_type ON deliveries(service_type);
