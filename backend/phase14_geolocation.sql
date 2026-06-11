-- ==============================================================================
-- PHASE 14: GEOLOCATION & DISTANCE FILTERING
-- ==============================================================================

-- 1. Create a function to calculate distance in kilometers using the Haversine formula
CREATE OR REPLACE FUNCTION public.calculate_distance_km(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
) RETURNS DOUBLE PRECISION AS $$
DECLARE
  x DOUBLE PRECISION := 69.1 * (lat2 - lat1);
  y DOUBLE PRECISION := 69.1 * (lon2 - lon1) * cos(lat1 / 57.3);
  dist_miles DOUBLE PRECISION := sqrt(x * x + y * y);
  dist_km DOUBLE PRECISION := dist_miles * 1.609344;
BEGIN
  RETURN dist_km;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- 2. Create RPC to fetch nearby tasks for a helper
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
  seeker_trust_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.title, t.description, t.category, t.pay, t.location_name,
    t.lat::DOUBLE PRECISION, t.lng::DOUBLE PRECISION, t.seeker_id, t.helper_id, t.status, t.created_at,
    public.calculate_distance_km(p_lat, p_lng, t.lat::DOUBLE PRECISION, t.lng::DOUBLE PRECISION) AS distance_km,
    p.full_name AS seeker_name,
    p.trust_score AS seeker_trust_score
  FROM public.tasks t
  JOIN public.profiles p ON t.seeker_id = p.id
  WHERE t.status = 'open'
    AND t.lat IS NOT NULL
    AND t.lng IS NOT NULL
    AND t.seeker_id != p_helper_id
    AND public.calculate_distance_km(p_lat, p_lng, t.lat::DOUBLE PRECISION, t.lng::DOUBLE PRECISION) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Create RPC to fetch nearby active helpers for a seeker
CREATE OR REPLACE FUNCTION public.get_nearby_helpers(
  p_lat DOUBLE PRECISION, 
  p_lng DOUBLE PRECISION, 
  p_radius_km DOUBLE PRECISION
) RETURNS TABLE(
  id UUID,
  full_name TEXT,
  trust_score INTEGER,
  current_lat DOUBLE PRECISION,
  current_lng DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id, p.full_name, p.trust_score, p.current_lat, p.current_lng,
    public.calculate_distance_km(p_lat, p_lng, p.current_lat, p.current_lng) AS distance_km
  FROM public.profiles p
  WHERE p.is_available = TRUE
    AND p.available_until > now()
    AND p.current_lat IS NOT NULL
    AND p.current_lng IS NOT NULL
    AND public.calculate_distance_km(p_lat, p_lng, p.current_lat, p.current_lng) <= p_radius_km
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
