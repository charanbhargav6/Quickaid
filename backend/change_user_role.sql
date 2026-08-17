-- Secure RPC for changing user roles
-- This runs with SECURITY DEFINER to bypass RLS
-- Only admins can execute this function successfully.

CREATE OR REPLACE FUNCTION public.change_user_role(p_target_user_id UUID, p_new_role TEXT)
RETURNS void AS $$
DECLARE
  v_admin_role TEXT;
BEGIN
  -- 1. Check if the caller is an admin
  SELECT role INTO v_admin_role
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_admin_role != 'admin' THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can change roles.';
  END IF;

  -- 2. Validate the new role
  IF p_new_role NOT IN ('seeker', 'helper', 'both', 'admin') THEN
    RAISE EXCEPTION 'Invalid role provided.';
  END IF;

  -- 3. Update the target user's role
  UPDATE public.profiles
  SET role = p_new_role
  WHERE id = p_target_user_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
