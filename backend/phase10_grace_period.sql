-- ==============================================================================
-- PHASE 10: Grace Period & Trust Score Penalties
-- ==============================================================================

-- 1. Add accepted_at column to tasks to track when a helper accepted it
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
