-- Phase 15: Vehicle Hire - the rental fleet a customer chooses from, with a
-- price per day. Separate from hire_vehicles (trucks/buses with their own
-- driver, used by the Heavy Freights flow).
-- Idempotent; safe to re-run. Apply with:
--   node scripts/run-migrations.js database/migrations/phase15_rental_vehicles.sql

CREATE TABLE IF NOT EXISTS rental_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('economy', 'suv', 'vans', 'luxury', 'pickup')),
  name TEXT NOT NULL UNIQUE,
  seats INTEGER NOT NULL DEFAULT 5,
  transmission TEXT NOT NULL DEFAULT 'automatic' CHECK (transmission IN ('automatic', 'manual')),
  fuel TEXT,                                -- Petrol, Diesel, Hybrid
  has_ac BOOLEAN NOT NULL DEFAULT true,
  price_per_day NUMERIC(12, 2) NOT NULL,    -- TZS
  image_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,     -- false = hidden from customers
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS rental_vehicles_category_idx ON rental_vehicles (category, active);

-- Read through the API only (service role); no direct browser access.
ALTER TABLE rental_vehicles ENABLE ROW LEVEL SECURITY;

-- Starter fleet. PRICES ARE EXAMPLES - replace them with the real rates.
INSERT INTO rental_vehicles (category, name, seats, transmission, fuel, has_ac, price_per_day, image_url, sort_order) VALUES
  ('economy', 'Toyota Corolla',            5, 'automatic', 'Petrol', true,  80000, '/services/hire/vehicles/corolla.webp',      1),
  ('suv',     'Toyota Harrier',            5, 'automatic', 'Petrol', true, 120000, '/services/hire/vehicles/harrier.webp',      1),
  ('suv',     'Toyota Land Cruiser Prado', 7, 'automatic', 'Diesel', true, 180000, '/services/hire/vehicles/prado.webp',        2),
  ('suv',     'Toyota Land Cruiser V8',    7, 'automatic', 'Diesel', true, 250000, '/services/hire/vehicles/land-cruiser.webp', 3),
  ('vans',    'Toyota Noah',               7, 'automatic', 'Petrol', true, 100000, '/services/hire/vehicles/noah.webp',         1),
  ('vans',    'Toyota Noah Hybrid',        7, 'automatic', 'Hybrid', true, 110000, '/services/hire/vehicles/noah-black.webp',   2),
  ('luxury',  'Mercedes-Benz S-Class',     4, 'automatic', 'Petrol', true, 400000, '/services/hire/vehicles/s-class.webp',      1),
  ('pickup',  'Toyota Hilux Double Cab',   5, 'manual',    'Diesel', true, 150000, '/services/hire/vehicles/hilux.webp',        1)
ON CONFLICT (name) DO NOTHING;
