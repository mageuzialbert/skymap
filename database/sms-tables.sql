-- SMS Templates table
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_key TEXT UNIQUE NOT NULL,
  audience TEXT NOT NULL CHECK (audience IN ('client', 'admin', 'rider')),
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS Broadcasts table (custom SMS sends)
CREATE TABLE IF NOT EXISTS sms_broadcasts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject TEXT,
  body TEXT NOT NULL,
  recipient_type TEXT NOT NULL CHECK (recipient_type IN ('all_clients', 'selected')),
  recipient_ids TEXT[] DEFAULT '{}',
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_broadcasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage SMS templates"
  ON sms_templates FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Admins can manage SMS broadcasts"
  ON sms_broadcasts FOR ALL
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'ADMIN'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sms_templates_event_key ON sms_templates(event_key);
CREATE INDEX IF NOT EXISTS idx_sms_templates_audience ON sms_templates(audience);
CREATE INDEX IF NOT EXISTS idx_sms_broadcasts_created_at ON sms_broadcasts(created_at);

-- Seed default templates
INSERT INTO sms_templates (event_key, audience, name, body, tags) VALUES
  ('client_registration', 'client', 'New Client Registration', 'Welcome to The Skymap, {{client_name}}! Your account is ready. Track your deliveries anytime.', ARRAY['client_name']),
  ('order_arrived_dropoff', 'client', 'Order Arrived at Drop-off', 'Hi {{client_name}}, your delivery has arrived at {{dropoff_address}}. Please be ready to receive it.', ARRAY['client_name', 'dropoff_address']),
  ('order_complete_thanks', 'client', 'Order Complete - Thank You', 'Thank you {{client_name}} for using The Skymap! Your delivery {{delivery_id}} is complete. We appreciate your business.', ARRAY['client_name', 'delivery_id']),
  ('admin_new_order', 'admin', 'New Delivery Order', 'New delivery order {{delivery_id}} received from {{business_name}}.', ARRAY['delivery_id', 'business_name']),
  ('admin_new_business', 'admin', 'New Business Registration', 'New business registered: {{business_name}}, Phone: {{business_phone}}.', ARRAY['business_name', 'business_phone']),
  ('admin_order_complete', 'admin', 'Delivery Order Complete', 'Delivery {{delivery_id}} for {{business_name}} has been completed successfully.', ARRAY['delivery_id', 'business_name']),
  ('rider_new_assignment', 'rider', 'New Order Assignment', 'New delivery assigned to you! Pickup: {{pickup_address}}. Drop-off: {{dropoff_address}}. Open app for details.', ARRAY['pickup_address', 'dropoff_address']),
  ('delivery_fee_updated', 'client', 'Delivery Fee Updated', 'Delivery available! Fee: {{amount}}. From: {{pickup_address}} To: {{dropoff_address}}', ARRAY['amount', 'pickup_address', 'dropoff_address'])
ON CONFLICT (event_key) DO NOTHING;
