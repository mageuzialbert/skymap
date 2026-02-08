-- User Permissions Schema
-- This table stores granular permissions for STAFF and RIDER users

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, permission)
);

-- Index for fast permission lookups by user
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- Index for checking specific permissions
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

-- RLS Policies for user_permissions table
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Admins can do everything with permissions
CREATE POLICY "Admins can manage all permissions"
  ON user_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'ADMIN'
    )
  );

-- Users can read their own permissions
CREATE POLICY "Users can view own permissions"
  ON user_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Comment on table
COMMENT ON TABLE user_permissions IS 'Stores granular permissions for STAFF and RIDER users';
COMMENT ON COLUMN user_permissions.permission IS 'Permission string in format: module.action (e.g., invoices.create)';
