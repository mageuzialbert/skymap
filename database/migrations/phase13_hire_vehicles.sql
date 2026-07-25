-- Phase 13: Vehicle Hire — physical vehicle catalog (people vs load) + delivery links.
-- Idempotent; safe to re-run. Apply with:
--   node scripts/run-migrations.js database/migrations/phase13_hire_vehicles.sql

-- One row per physical hire vehicle (a specific truck / bus with its own driver).
CREATE TABLE IF NOT EXISTS hire_vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('people', 'load')),
  name TEXT NOT NULL,                 -- Fuso, Canter, Coaster, V8, ...
  capacity_value NUMERIC,             -- tons (load) or seats (people)
  capacity_unit TEXT,                 -- 'tons' | 'people'
  plate_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  color TEXT,
  image_url TEXT,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique (category, name) so the seed below is idempotent.
CREATE UNIQUE INDEX IF NOT EXISTS hire_vehicles_category_name_key
  ON hire_vehicles (category, name);

CREATE INDEX IF NOT EXISTS hire_vehicles_category_idx ON hire_vehicles (category);

-- Link a hire request to a chosen physical vehicle + remember the sub-category.
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS hire_vehicle_id UUID
  REFERENCES hire_vehicles(id) ON DELETE SET NULL;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS hire_category TEXT;

-- Seed the starter fleet (admin can edit plate/driver/color/capacity afterwards).
INSERT INTO hire_vehicles (category, name, capacity_value, capacity_unit, sort_order) VALUES
  ('load', 'Tank',         10, 'tons', 1),
  ('load', 'Container',    28, 'tons', 2),
  ('load', 'Semi Trailer', 30, 'tons', 3),
  ('load', 'Fuso',          7, 'tons', 4),
  ('load', 'Kirikuu',       5, 'tons', 5),
  ('load', 'Canter',        3, 'tons', 6),
  ('people', 'Special Hire (Coaster)', 30, 'people', 1),
  ('people', 'IST',                     4, 'people', 2),
  ('people', 'V8',                      6, 'people', 3),
  ('people', 'Noah',                    7, 'people', 4)
ON CONFLICT (category, name) DO NOTHING;
