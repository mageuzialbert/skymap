-- Phase 13c: Sample images for the seeded hire vehicles.
-- Points each vehicle at a self-contained SVG under /public/hire-vehicles.
-- Idempotent: only sets an image when the row has none, so admin uploads are
-- never overwritten. Apply with:
--   node scripts/run-migrations.js database/migrations/phase13c_hire_vehicles_sample_images.sql

UPDATE hire_vehicles AS h SET image_url = v.image_url
FROM (VALUES
  ('load',   'Tank',                   '/hire-vehicles/tank.svg'),
  ('load',   'Container',              '/hire-vehicles/container.svg'),
  ('load',   'Semi Trailer',           '/hire-vehicles/semi-trailer.svg'),
  ('load',   'Fuso',                   '/hire-vehicles/fuso.svg'),
  ('load',   'Kirikuu',                '/hire-vehicles/kirikuu.svg'),
  ('load',   'Canter',                 '/hire-vehicles/canter.svg'),
  ('people', 'Special Hire (Coaster)', '/hire-vehicles/special-hire-coaster.svg'),
  ('people', 'IST',                    '/hire-vehicles/ist.svg'),
  ('people', 'V8',                     '/hire-vehicles/v8.svg'),
  ('people', 'Noah',                   '/hire-vehicles/noah.svg')
) AS v(category, name, image_url)
WHERE h.category = v.category
  AND h.name = v.name
  AND (h.image_url IS NULL OR h.image_url = '');
