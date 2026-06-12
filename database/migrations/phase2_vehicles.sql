-- Phase 2: Vehicle types, rider vehicle assignment, ride vehicle + rider-confirm.
-- Idempotent: safe to re-run.

-- Means of transport the client can choose (price stored but hidden in client UI for now).
CREATE TABLE IF NOT EXISTS vehicle_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,            -- boda | bajaj | electric | car
  name TEXT NOT NULL,
  icon_url TEXT,
  price DECIMAL(10, 2),                -- nullable; not shown to clients yet
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_types_active ON vehicle_types(active);

-- Seed the four standard means of transport (no-op if the key already exists).
INSERT INTO vehicle_types (key, name, sort_order) VALUES
  ('boda', 'Boda (Motorcycle)', 1),
  ('bajaj', 'Bajaj', 2),
  ('electric', 'Electric (3-wheeler)', 3),
  ('car', 'Car (Taxi)', 4)
ON CONFLICT (key) DO NOTHING;

-- Which vehicle a rider operates (rider-only). Lets the system count "registered"
-- means of transport per type for availability.
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_users_vehicle_type_id ON users(vehicle_type_id);

-- The vehicle a client requested for a ride, and the rider's acceptance marker.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS vehicle_type_id UUID REFERENCES vehicle_types(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS rider_confirmed_at TIMESTAMP WITH TIME ZONE;
CREATE INDEX IF NOT EXISTS idx_deliveries_vehicle_type_id ON deliveries(vehicle_type_id);

-- SMS templates introduced by the rider confirm/decline dispatch flow.
INSERT INTO sms_templates (event_key, audience, name, body, tags) VALUES
  ('ride_confirmed', 'client', 'Rider On The Way', 'Good news! {{rider_name}} accepted your ride {{delivery_id}} and is on the way. Contact: {{rider_phone}}', ARRAY['rider_name','delivery_id','rider_phone']),
  ('admin_ride_declined', 'admin', 'Ride Declined By Rider', 'Ride {{delivery_id}} for {{business_name}} was declined by the assigned rider and needs reassignment.', ARRAY['delivery_id','business_name'])
ON CONFLICT (event_key) DO NOTHING;
