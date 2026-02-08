-- Trigger to automatically create user record when auth user is created
-- This ensures the users table stays in sync with auth.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table if not exists
  INSERT INTO public.users (id, name, email, phone, role, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'business_name', NULL),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'BUSINESS'),
    true
  )
  ON CONFLICT (id) DO UPDATE
  SET
    name = COALESCE(NEW.raw_user_meta_data->>'business_name', users.name),
    email = COALESCE(NEW.email, users.email),
    phone = COALESCE(NEW.raw_user_meta_data->>'phone', users.phone),
    role = COALESCE(NEW.raw_user_meta_data->>'role', users.role);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update user name from business name
CREATE OR REPLACE FUNCTION public.update_user_name_from_business()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET name = NEW.name
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to sync business name to user name
CREATE TRIGGER on_business_name_update
  AFTER INSERT OR UPDATE OF name ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_name_from_business();

-- Function to create delivery event on status change
CREATE OR REPLACE FUNCTION public.create_delivery_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create event if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.delivery_events (delivery_id, status, created_by)
    VALUES (NEW.id, NEW.status, NEW.assigned_rider_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create delivery events
CREATE TRIGGER on_delivery_status_change
  AFTER UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.create_delivery_event();

-- Function to set delivered_at timestamp
CREATE OR REPLACE FUNCTION public.set_delivered_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'DELIVERED' AND OLD.status != 'DELIVERED' THEN
    NEW.delivered_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to set delivered_at
CREATE TRIGGER on_delivery_delivered
  BEFORE UPDATE OF status ON public.deliveries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_delivered_at();
