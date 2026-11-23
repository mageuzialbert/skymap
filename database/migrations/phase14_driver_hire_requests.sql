-- Phase 14: Driver Hire - a customer who owns a vehicle asks for a professional
-- driver. This is a request, not a booking: the admin team reviews it and
-- phones the customer. Nothing here touches the deliveries tables.
-- Idempotent; safe to re-run. Apply with:
--   node scripts/run-migrations.js database/migrations/phase14_driver_hire_requests.sql

CREATE TABLE IF NOT EXISTS driver_hire_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT NOT NULL UNIQUE,              -- e.g. DH-261123-7KQ4
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  vehicle_category TEXT NOT NULL CHECK (vehicle_category IN ('light', 'heavy')),
  vehicle_type TEXT,                                  -- Sedan, Fuel tanker, ... (optional)
  transmission_type TEXT CHECK (transmission_type IN ('manual', 'automatic')),

  -- Wall-clock date and time as the customer entered them (Tanzania time).
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  return_date DATE,
  return_time TIME,

  pickup_location TEXT NOT NULL,
  pickup_latitude DOUBLE PRECISION,
  pickup_longitude DOUBLE PRECISION,
  destination TEXT NOT NULL,
  destination_latitude DOUBLE PRECISION,
  destination_longitude DOUBLE PRECISION,

  passenger_count INTEGER CHECK (passenger_count IS NULL OR passenger_count >= 0),
  trip_duration TEXT,
  additional_information TEXT,

  status TEXT NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
    'SUBMITTED', 'UNDER_REVIEW', 'CONTACTED', 'DRIVER_ARRANGEMENT',
    'CONFIRMED', 'COMPLETED', 'CANCELLED'
  )),
  admin_notes TEXT,                                   -- internal; never sent to the customer

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS driver_hire_requests_customer_idx
  ON driver_hire_requests (customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS driver_hire_requests_status_idx
  ON driver_hire_requests (status);
CREATE INDEX IF NOT EXISTS driver_hire_requests_departure_idx
  ON driver_hire_requests (departure_date);
CREATE INDEX IF NOT EXISTS driver_hire_requests_created_idx
  ON driver_hire_requests (created_at DESC);

-- One row per status change (the first row records the submission itself).
CREATE TABLE IF NOT EXISTS driver_hire_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_id UUID NOT NULL REFERENCES driver_hire_requests(id) ON DELETE CASCADE,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS driver_hire_status_history_request_idx
  ON driver_hire_status_history (request_id, created_at);

-- Row level security on, with no policies: these tables hold customer phone
-- numbers and trip plans, so the browser (anon/authenticated keys) gets no
-- direct access at all. Every read and write goes through the API routes,
-- which check the caller and use the service role.
ALTER TABLE driver_hire_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_hire_status_history ENABLE ROW LEVEL SECURITY;

-- Notification templates (SMS + email share one body, see lib/notify.ts).
INSERT INTO sms_templates (event_key, audience, name, body, tags) VALUES
  ('admin_new_driver_request', 'admin', 'New Driver Request',
   'New Skymap driver request {{reference}} from {{client_name}} ({{client_phone}}). Travel date: {{travel_date}}. Please review and call the customer.',
   ARRAY['reference','client_name','client_phone','travel_date']),
  ('client_driver_request_received', 'client', 'Driver Request Received',
   'Hi {{client_name}}, we received your Skymap driver request {{reference}}. Our team will review it and call you to discuss driver options.',
   ARRAY['client_name','reference']),
  ('client_driver_request_status', 'client', 'Driver Request Update',
   'Skymap driver request {{reference}}: {{status_label}}.',
   ARRAY['reference','status_label'])
ON CONFLICT (event_key) DO NOTHING;
