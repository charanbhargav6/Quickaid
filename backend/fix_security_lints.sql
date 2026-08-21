-- ==============================================================================
-- SECURITY LINTER FIXES
-- Copy and paste this script into your Supabase SQL Editor
-- ==============================================================================

-- 1. Fix: Function Search Path Mutable
-- (Prevents search_path injection attacks in SECURITY DEFINER functions)
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.update_trust_score() SET search_path = '';
ALTER FUNCTION public.transfer_funds(UUID) SET search_path = '';
ALTER FUNCTION public.add_demo_funds(NUMERIC) SET search_path = '';
ALTER FUNCTION public.log_device_login(TEXT) SET search_path = '';
ALTER FUNCTION public.complete_task_with_trust(UUID) SET search_path = '';
ALTER FUNCTION public.cancel_task_with_penalty(UUID) SET search_path = '';
ALTER FUNCTION public.submit_user_report(UUID, UUID, TEXT, TEXT) SET search_path = '';
ALTER FUNCTION public.toggle_availability(NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = '';
ALTER FUNCTION public.check_trust_score_suspension() SET search_path = '';
ALTER FUNCTION public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID) SET search_path = '';
ALTER FUNCTION public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, NUMERIC) SET search_path = '';
ALTER FUNCTION public.calculate_distance_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) SET search_path = '';
ALTER FUNCTION public.request_withdrawal(NUMERIC) SET search_path = '';
ALTER FUNCTION public.change_user_role(UUID, TEXT) SET search_path = '';

-- 2. Fix: Public Can Execute SECURITY DEFINER Function
-- We must explicitly revoke from `anon` and `authenticated` in Supabase
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_trust_score() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.transfer_funds(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_demo_funds(NUMERIC) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_device_login(TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_task_with_trust(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cancel_task_with_penalty(UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.submit_user_report(UUID, UUID, TEXT, TEXT) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.toggle_availability(NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_trust_score_suspension() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, NUMERIC) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_distance_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.change_user_role(UUID, TEXT) FROM anon, authenticated;

-- 3. Fix: Grant access only to signed-in ('authenticated') users for API functions
GRANT EXECUTE ON FUNCTION public.transfer_funds(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_device_login(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_task_with_trust(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_task_with_penalty(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_user_report(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_availability(NUMERIC, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_nearby_tasks(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, UUID, TEXT, TEXT, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_distance_km(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(NUMERIC) TO authenticated;
-- (Note: handle_new_user, update_trust_score, check_trust_score_suspension, add_demo_funds, and change_user_role are intentionally left out to prevent standard users from calling them)

-- 4. Fix: RLS Policy Always True for notifications table
DROP POLICY IF EXISTS "Enable insert access for all" ON public.notifications;
DROP POLICY IF EXISTS "System can insert notifications for users" ON public.notifications;

-- 5. Fix: Public Bucket Allows Listing for 'avatars'
-- A public bucket does NOT need a SELECT policy on storage.objects to serve images. 
-- Adding one allows users to list all objects in the bucket, which triggers the security warning.
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "users can upload their own avatars 1oj01fe_1" ON storage.objects;


-- The above SELECT policy allows downloading (getting) an object. 
-- Listing bucket contents requires both SELECT on storage.objects AND SELECT on storage.buckets. 
-- We ensure there is no broad SELECT on storage.objects that does not restrict by bucket, 
-- and we ensure users only query specific paths if needed.
