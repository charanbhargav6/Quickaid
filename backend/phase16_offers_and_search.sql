-- ==============================================================================
-- PHASE 16: OFFERS & ADVANCED SEARCH
-- ==============================================================================

-- 1. Create task_offers table
CREATE TABLE IF NOT EXISTS public.task_offers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    helper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    proposed_pay NUMERIC NOT NULL CHECK (proposed_pay >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(task_id, helper_id) -- one active offer per helper per task (mostly)
);

-- Row Level Security for task_offers
ALTER TABLE public.task_offers ENABLE ROW LEVEL SECURITY;

-- Helpers can see their own offers, Seekers can see offers on their tasks
CREATE POLICY "Helpers can view their own offers" ON public.task_offers
    FOR SELECT USING (auth.uid() = helper_id);

CREATE POLICY "Seekers can view offers on their tasks" ON public.task_offers
    FOR SELECT USING (
        auth.uid() IN (SELECT seeker_id FROM public.tasks WHERE id = task_offers.task_id)
    );

-- Helpers can insert offers
CREATE POLICY "Helpers can insert offers" ON public.task_offers
    FOR INSERT WITH CHECK (auth.uid() = helper_id);

-- Helpers can update their own offers (e.g. withdraw)
CREATE POLICY "Helpers can update their own offers" ON public.task_offers
    FOR UPDATE USING (auth.uid() = helper_id);

-- Seekers can update offers on their tasks (e.g. accept/reject)
CREATE POLICY "Seekers can update offers on their tasks" ON public.task_offers
    FOR UPDATE USING (
        auth.uid() IN (SELECT seeker_id FROM public.tasks WHERE id = task_offers.task_id)
    );

-- Enable Realtime for task_offers
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_offers;

-- 2. Update RPC to fetch nearby tasks for a helper (with optional search/filters)
CREATE OR REPLACE FUNCTION public.get_nearby_tasks(
  p_lat DOUBLE PRECISION, 
  p_lng DOUBLE PRECISION, 
  p_radius_km DOUBLE PRECISION,
  p_helper_id UUID,
  p_search_query TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_min_pay NUMERIC DEFAULT NULL
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
    -- New Filter Conditions
    AND (p_category IS NULL OR t.category = p_category)
    AND (p_min_pay IS NULL OR t.pay >= p_min_pay)
    AND (
      p_search_query IS NULL 
      OR t.title ILIKE '%' || p_search_query || '%'
      OR t.description ILIKE '%' || p_search_query || '%'
    )
  ORDER BY distance_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
