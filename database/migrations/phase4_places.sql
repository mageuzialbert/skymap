-- Phase 4: Seeded place categories + places for the "Suggestions" location option.
-- Idempotent. No admin UI - curated seed (edit via SQL later).

CREATE TABLE IF NOT EXISTS place_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS places (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  category_id UUID NOT NULL REFERENCES place_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_places_category ON places(category_id);
CREATE INDEX IF NOT EXISTS idx_places_active ON places(active);

INSERT INTO place_categories (key, name, icon, sort_order) VALUES
  ('bus_stand', 'Bus Stand', 'bus', 1),
  ('airport', 'Airport', 'plane', 2),
  ('hospital', 'Hospital', 'hospital', 3),
  ('market', 'Market', 'shopping-bag', 4),
  ('shopping_centre', 'Shopping Centre', 'store', 5),
  ('port', 'Port', 'anchor', 6),
  ('railway_station', 'Railway Station', 'train', 7)
ON CONFLICT (key) DO NOTHING;

-- Seed representative Dar es Salaam places (approximate coordinates; users can fine-tune on the map).
INSERT INTO places (key, category_id, name, address, latitude, longitude, sort_order)
SELECT v.key, c.id, v.name, v.address, v.lat, v.lng, v.sort_order
FROM (VALUES
  ('ubungo_terminal', 'bus_stand', 'Ubungo Bus Terminal', 'Ubungo, Dar es Salaam', -6.78690, 39.23300, 1),
  ('magufuli_terminal', 'bus_stand', 'Magufuli Bus Terminal (Mbezi)', 'Mbezi Luis, Dar es Salaam', -6.72000, 39.15000, 2),
  ('kariakoo_stand', 'bus_stand', 'Kariakoo Bus Stand', 'Kariakoo, Dar es Salaam', -6.81700, 39.27200, 3),
  ('jnia', 'airport', 'Julius Nyerere International Airport', 'Kipawa, Dar es Salaam', -6.87810, 39.20260, 1),
  ('muhimbili', 'hospital', 'Muhimbili National Hospital', 'Upanga, Dar es Salaam', -6.80500, 39.27000, 1),
  ('aga_khan', 'hospital', 'Aga Khan Hospital', 'Upanga, Dar es Salaam', -6.81230, 39.28800, 2),
  ('regency', 'hospital', 'Regency Medical Centre', 'Upanga, Dar es Salaam', -6.81600, 39.28300, 3),
  ('kariakoo_market', 'market', 'Kariakoo Market', 'Kariakoo, Dar es Salaam', -6.81700, 39.27600, 1),
  ('kisutu_market', 'market', 'Kisutu Market', 'Kisutu, Dar es Salaam', -6.81700, 39.28800, 2),
  ('mlimani_city', 'shopping_centre', 'Mlimani City Mall', 'Sam Nujoma Rd, Dar es Salaam', -6.77100, 39.24000, 1),
  ('mwenge', 'shopping_centre', 'Mwenge Shopping Area', 'Mwenge, Dar es Salaam', -6.76300, 39.22200, 2),
  ('dar_port', 'port', 'Dar es Salaam Port', 'Kurasini, Dar es Salaam', -6.83400, 39.29600, 1),
  ('tazara_station', 'railway_station', 'TAZARA Railway Station', 'Nelson Mandela Rd, Dar es Salaam', -6.87000, 39.23600, 1),
  ('central_station', 'railway_station', 'Dar Central Railway Station', 'Sokoine Dr, Dar es Salaam', -6.81600, 39.28900, 2)
) AS v(key, cat_key, name, address, lat, lng, sort_order)
JOIN place_categories c ON c.key = v.cat_key
ON CONFLICT (key) DO NOTHING;
