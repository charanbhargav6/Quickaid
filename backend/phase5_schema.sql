-- ==============================================================================
-- PHASE 5: ROLES & PERMISSIONS
-- ==============================================================================

-- 1. Update the role constraint to allow 'both'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('seeker', 'helper', 'both', 'admin'));

-- 2. Allow Task Creators (Seekers) and Admins to Delete Tasks
-- First, drop any existing delete policy just in case
DROP POLICY IF EXISTS "Seekers and Admins can delete tasks." ON public.tasks;

CREATE POLICY "Seekers and Admins can delete tasks."
  ON public.tasks FOR DELETE
  USING (
    auth.uid() = seeker_id 
    OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
