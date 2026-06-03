-- ============================================================================
-- Phase 12: Live Maps & Location
-- ============================================================================

-- Add latitude and longitude to tasks
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS lat NUMERIC,
ADD COLUMN IF NOT EXISTS lng NUMERIC;
