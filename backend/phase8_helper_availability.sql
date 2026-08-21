-- ==============================================================================
-- PHASE 8: HELPER AVAILABILITY SYSTEM
-- ==============================================================================

-- 1. Update Profiles Table for Availability Tracking
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS available_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS current_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS current_lng DOUBLE PRECISION;

-- 2. Create RPC to easily toggle availability
CREATE OR REPLACE FUNCTION public.toggle_availability(p_duration_hours NUMERIC, p_lat DOUBLE PRECISION DEFAULT NULL, p_lng DOUBLE PRECISION DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_duration_hours > 0 THEN
    -- Set available
    UPDATE public.profiles 
    SET is_available = TRUE,
        available_until = now() + (p_duration_hours || ' hours')::interval,
        current_lat = COALESCE(p_lat, current_lat),
        current_lng = COALESCE(p_lng, current_lng)
    WHERE id = auth.uid();
  ELSE
    -- Set off duty
    UPDATE public.profiles 
    SET is_available = FALSE,
        available_until = NULL
    WHERE id = auth.uid();
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.toggle_availability(NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_availability(NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
