-- ==============================================================================
-- DEVICE SECURITY & TRUSTED DEVICES
-- ==============================================================================

-- 1. Create User Devices table to track trusted devices
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, device_id)
);

-- 2. Enable RLS
ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

-- Users can only view and update their own trusted devices
CREATE POLICY "Users can manage their own devices."
  ON public.user_devices FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. Security Function: Log Device
-- A secure RPC function that records a device login, or creates it if it doesn't exist
CREATE OR REPLACE FUNCTION public.log_device_login(p_device_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_devices (user_id, device_id, last_login)
  VALUES (auth.uid(), p_device_id, now())
  ON CONFLICT (user_id, device_id) 
  DO UPDATE SET last_login = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_device_login(TEXT) FROM PUBLIC;
