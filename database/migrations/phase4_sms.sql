-- Phase 4: Additional SMS templates for ride status transitions. Idempotent.

INSERT INTO sms_templates (event_key, audience, name, body, tags) VALUES
  ('client_order_picked_up', 'client', 'Ride Picked Up',
   'Your Skymap ride {{delivery_id}} has been picked up by {{rider_name}} and is on the way.',
   ARRAY['delivery_id','rider_name']),
  ('client_in_transit', 'client', 'Ride In Transit',
   'Your Skymap ride {{delivery_id}} is now in transit to the destination.',
   ARRAY['delivery_id']),
  ('client_order_failed', 'client', 'Ride Not Completed',
   'We are sorry — your Skymap ride {{delivery_id}} could not be completed. Our team will contact you shortly.',
   ARRAY['delivery_id']),
  ('admin_order_failed', 'admin', 'Ride Failed',
   'Ride {{delivery_id}} for {{business_name}} was marked FAILED by the rider.',
   ARRAY['delivery_id','business_name'])
ON CONFLICT (event_key) DO NOTHING;
