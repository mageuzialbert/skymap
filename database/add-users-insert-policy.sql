-- Add INSERT policies for registration
-- Users can insert their own record during registration
CREATE POLICY "Users can insert own record"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Businesses can insert their own business record during registration
CREATE POLICY "Businesses can insert own business"
  ON businesses FOR INSERT
  WITH CHECK (user_id = auth.uid());
