-- ==============================================================================
-- PHASE 21: DYNAMIC TASKS (Physical, Delivery, Digital)
-- ==============================================================================

BEGIN;

-- 1. Add new columns to tasks
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'physical' CHECK (task_type IN ('physical', 'delivery', 'digital')),
ADD COLUMN IF NOT EXISTS destination_name TEXT,
ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;

-- 2. Drop the existing get_nearby_tasks RPC so we can recreate it with new return columns
DROP FUNCTION IF EXISTS public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID);

-- 3. Recreate the RPC
CREATE OR REPLACE FUNCTION public.get_nearby_tasks(
  p_lat DOUBLE PRECISION, 
  p_lng DOUBLE PRECISION, 
  p_radius_km DOUBLE PRECISION,
  p_helper_id UUID
) RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  pay NUMERIC,
  location_name TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  seeker_id UUID,
  helper_id UUID,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  distance_km DOUBLE PRECISION,
  seeker_name TEXT,
  seeker_trust_score INTEGER,
  task_type TEXT,
  destination_name TEXT,
  destination_lat DOUBLE PRECISION,
  destination_lng DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.title, t.description, t.category, t.pay, t.location_name,
    t.lat::DOUBLE PRECISION, t.lng::DOUBLE PRECISION, t.seeker_id, t.helper_id, t.status, t.created_at,
    COALESCE(public.calculate_distance_km(p_lat, p_lng, t.lat::DOUBLE PRECISION, t.lng::DOUBLE PRECISION), 0) AS distance_km,
    p.full_name AS seeker_name,
    p.trust_score AS seeker_trust_score,
    t.task_type,
    t.destination_name,
    t.destination_lat::DOUBLE PRECISION,
    t.destination_lng::DOUBLE PRECISION
  FROM public.tasks t
  JOIN public.profiles p ON t.seeker_id = p.id
  WHERE t.status = 'open'
    AND t.seeker_id != p_helper_id
    AND (
      (t.task_type = 'digital') OR 
      (t.lat IS NOT NULL AND t.lng IS NOT NULL AND public.calculate_distance_km(p_lat, p_lng, t.lat::DOUBLE PRECISION, t.lng::DOUBLE PRECISION) <= p_radius_km)
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
