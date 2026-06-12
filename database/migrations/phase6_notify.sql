-- Phase 6: Notification coverage - a couple of client-facing templates so the
-- key moments are covered over both SMS and Email (same template drives both
-- channels via lib/notify.ts). Idempotent.

INSERT INTO sms_templates (event_key, audience, name, body, tags) VALUES
  ('client_order_received', 'client', 'Request Received',
   'Hi {{client_name}}, we received your Skymap {{service_label}} request {{delivery_id}}. Our team is arranging a rider and will update you shortly.',
   ARRAY['client_name','service_label','delivery_id']),
  ('client_rider_assigned', 'client', 'Rider Assigned',
   'Good news! A rider has been assigned to your Skymap request {{delivery_id}} and will confirm shortly.',
   ARRAY['delivery_id']),
  ('client_registration', 'client', 'Welcome to The Skymap',
   'Welcome to The Skymap, {{client_name}}! Your account is ready. You can now request rides, deliveries, hire and errands from your dashboard.',
   ARRAY['client_name'])
ON CONFLICT (event_key) DO NOTHING;
