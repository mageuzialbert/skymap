-- Phase 13b: Sample driver / plate / colour data for the seeded hire vehicles.
-- Idempotent: only fills a row when it has no plate yet, so real admin edits
-- are never overwritten. Apply with:
--   node scripts/run-migrations.js database/migrations/phase13b_hire_vehicles_sample_drivers.sql

UPDATE hire_vehicles AS h SET
  plate_number = v.plate_number,
  driver_name  = v.driver_name,
  driver_phone = v.driver_phone,
  color        = v.color
FROM (VALUES
  -- Load fleet
  ('load',   'Tank',                   'T145 DTA', 'Juma Athumani',    '+255713101010', 'Silver'),
  ('load',   'Container',              'T220 KLM', 'Said Mwinyi',      '+255714202020', 'Blue'),
  ('load',   'Semi Trailer',           'T330 XYZ', 'Emmanuel Kessy',   '+255715303030', 'Red'),
  ('load',   'Fuso',                   'T410 BCF', 'Hamisi Rajabu',    '+255716404040', 'White'),
  ('load',   'Kirikuu',                'T510 GHJ', 'Baraka Msigwa',    '+255717505050', 'Green'),
  ('load',   'Canter',                 'T610 PQR', 'Frank Massawe',    '+255718606060', 'White'),
  -- People fleet
  ('people', 'Special Hire (Coaster)', 'T700 CST', 'Rashid Juma',      '+255719707070', 'White'),
  ('people', 'IST',                    'T810 IST', 'Neema Joseph',     '+255720808080', 'Black'),
  ('people', 'V8',                     'T900 LX8', 'Godfrey Mushi',    '+255721909090', 'Black'),
  ('people', 'Noah',                   'T950 NOA', 'Amina Hassan',     '+255722910910', 'Silver')
) AS v(category, name, plate_number, driver_name, driver_phone, color)
WHERE h.category = v.category
  AND h.name = v.name
  AND (h.plate_number IS NULL OR h.plate_number = '');
