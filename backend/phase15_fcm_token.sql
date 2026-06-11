-- ==============================================================================
-- PHASE 15: PUSH NOTIFICATIONS
-- ==============================================================================

-- Add fcm_token column to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS fcm_token TEXT;
