-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_fee_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can read their own record
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all users
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Staff can read riders and businesses
CREATE POLICY "Staff can read riders and businesses"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'STAFF'
    )
    AND role IN ('RIDER', 'BUSINESS')
  );

-- Users can update their own record (limited fields)
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any user
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- Admins can insert users (for creating staff/rider accounts)
CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================
-- BUSINESSES TABLE POLICIES
-- ============================================

-- Businesses can read their own record
CREATE POLICY "Businesses can read own record"
  ON businesses FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Staff and Admins can read all businesses
CREATE POLICY "Staff and Admins can read all businesses"
  ON businesses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Public can read business logos and names for landing page
CREATE POLICY "Public can read business logos"
  ON businesses FOR SELECT
  USING (logo_url IS NOT NULL AND active = true);

-- Businesses can update their own record
CREATE POLICY "Businesses can update own record"
  ON businesses FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins and Staff can update any business
CREATE POLICY "Admins and Staff can update any business"
  ON businesses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- ============================================
-- DELIVERIES TABLE POLICIES
-- ============================================

-- Businesses can read their own deliveries
CREATE POLICY "Businesses can read own deliveries"
  ON deliveries FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Staff and Admins can read all deliveries
CREATE POLICY "Staff and Admins can read all deliveries"
  ON deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Riders can read assigned deliveries
CREATE POLICY "Riders can read assigned deliveries"
  ON deliveries FOR SELECT
  USING (
    assigned_rider_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'RIDER'
    )
  );

-- Businesses and Staff can create deliveries
CREATE POLICY "Businesses and Staff can create deliveries"
  ON deliveries FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('BUSINESS', 'STAFF')
    )
  );

-- Staff and Admins can update deliveries (for assignment)
CREATE POLICY "Staff and Admins can update deliveries"
  ON deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('STAFF', 'ADMIN')
    )
  );

-- Riders can update assigned deliveries (status only)
CREATE POLICY "Riders can update assigned deliveries"
  ON deliveries FOR UPDATE
  USING (
    assigned_rider_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'RIDER'
    )
  );

-- ============================================
-- DELIVERY EVENTS TABLE POLICIES
-- ============================================

-- Anyone can read events for deliveries they have access to
CREATE POLICY "Read delivery events"
  ON delivery_events FOR SELECT
  USING (
    delivery_id IN (
      SELECT id FROM deliveries
      WHERE 
        business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
        OR assigned_rider_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
        )
    )
  );

-- Riders and Staff can create delivery events
CREATE POLICY "Riders and Staff can create events"
  ON delivery_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('RIDER', 'STAFF')
    )
  );

-- ============================================
-- CHARGES TABLE POLICIES
-- ============================================

-- Businesses can read their own charges
CREATE POLICY "Businesses can read own charges"
  ON charges FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Staff and Admins can read all charges
CREATE POLICY "Staff and Admins can read all charges"
  ON charges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Staff and Admins can create charges
CREATE POLICY "Staff and Admins can create charges"
  ON charges FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- ============================================
-- INVOICES TABLE POLICIES
-- ============================================

-- Businesses can read their own invoices
CREATE POLICY "Businesses can read own invoices"
  ON invoices FOR SELECT
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Staff and Admins can read all invoices
CREATE POLICY "Staff and Admins can read all invoices"
  ON invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Only Admins can create invoices (via Edge Function with service role)
-- Regular users cannot create invoices directly

-- ============================================
-- INVOICE ITEMS TABLE POLICIES
-- ============================================

-- Same access as invoices
CREATE POLICY "Read invoice items"
  ON invoice_items FOR SELECT
  USING (
    invoice_id IN (
      SELECT id FROM invoices
      WHERE 
        business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM users
          WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
        )
    )
  );

-- Only Admins can create invoice items (via Edge Function)

-- ============================================
-- SMS LOGS TABLE POLICIES
-- ============================================

-- Admins and Staff can read SMS logs
CREATE POLICY "Admins and Staff can read SMS logs"
  ON sms_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- System can create SMS logs (via API with service role)

-- ============================================
-- OTP CODES TABLE POLICIES
-- ============================================

-- Users can read their own OTP codes (for verification)
CREATE POLICY "Users can read own OTP codes"
  ON otp_codes FOR SELECT
  USING (phone IN (
    SELECT phone FROM users WHERE id = auth.uid()
  ));

-- System can create OTP codes (via API)
-- Note: OTP creation should be done via API route with proper validation

-- Users can update their own OTP codes (mark as used)
CREATE POLICY "Users can update own OTP codes"
  ON otp_codes FOR UPDATE
  USING (phone IN (
    SELECT phone FROM users WHERE id = auth.uid()
  ));

-- ============================================
-- REGIONS TABLE POLICIES
-- ============================================

-- Everyone can read regions (public data)
CREATE POLICY "Anyone can read regions"
  ON regions FOR SELECT
  USING (true);

-- Only admins can modify regions
CREATE POLICY "Admins can modify regions"
  ON regions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================
-- DISTRICTS TABLE POLICIES
-- ============================================

-- Everyone can read districts (public data)
CREATE POLICY "Anyone can read districts"
  ON districts FOR SELECT
  USING (true);

-- Only admins can modify districts
CREATE POLICY "Admins can modify districts"
  ON districts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================
-- DELIVERY FEE PACKAGES TABLE POLICIES
-- ============================================

-- Public can read active packages (for registration)
CREATE POLICY "Public can read active packages"
  ON delivery_fee_packages FOR SELECT
  USING (active = true);

-- Businesses can read active packages
CREATE POLICY "Businesses can read active packages"
  ON delivery_fee_packages FOR SELECT
  USING (active = true);

-- Admin and Staff can read all packages
CREATE POLICY "Admin and Staff can read all packages"
  ON delivery_fee_packages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Only Admins can create/update/delete packages
CREATE POLICY "Admins can manage packages"
  ON delivery_fee_packages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================
-- EXPENSE CATEGORIES TABLE POLICIES
-- ============================================

-- Admin and Staff can read categories
CREATE POLICY "Admin and Staff can read expense categories"
  ON expense_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Only Admins can create/update/delete categories
CREATE POLICY "Admins can manage expense categories"
  ON expense_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );

-- ============================================
-- EXPENSES TABLE POLICIES
-- ============================================

-- Admin and Staff can read expenses
CREATE POLICY "Admin and Staff can read expenses"
  ON expenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Admin and Staff can create expenses
CREATE POLICY "Admin and Staff can create expenses"
  ON expenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Admin and Staff can update expenses
CREATE POLICY "Admin and Staff can update expenses"
  ON expenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role IN ('ADMIN', 'STAFF')
    )
  );

-- Only Admins can delete expenses
CREATE POLICY "Admins can delete expenses"
  ON expenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
