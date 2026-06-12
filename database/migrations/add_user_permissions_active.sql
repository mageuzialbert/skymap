-- The live database has user_permissions.active, but database/permissions.sql
-- never defined it. Add it so the schema matches production.
ALTER TABLE user_permissions ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
