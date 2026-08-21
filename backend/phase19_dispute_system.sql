-- ==============================================================================
-- PHASE 19: DISPUTE SYSTEM
-- ==============================================================================

-- 1. Add dispute_reason column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dispute_reason TEXT;

-- 2. Update the status constraint to include 'disputed'
-- Postgres requires dropping the constraint and recreating it
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('open', 'accepted', 'completed', 'cancelled', 'disputed'));

-- 3. Create RPC to mark a task as disputed
CREATE OR REPLACE FUNCTION public.dispute_task(p_task_id UUID, p_reason TEXT)
RETURNS void AS $$
BEGIN
  -- Ensure task belongs to the caller (either seeker or helper)
  IF NOT EXISTS (
    SELECT 1 FROM public.tasks 
    WHERE id = p_task_id 
    AND (seeker_id = auth.uid() OR helper_id = auth.uid())
  ) THEN
    RAISE EXCEPTION 'Not authorized to dispute this task';
  END IF;

  UPDATE public.tasks 
  SET status = 'disputed', dispute_reason = p_reason
  WHERE id = p_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.dispute_task FROM PUBLIC;

-- 4. Create RPC for Admin to resolve a dispute
CREATE OR REPLACE FUNCTION public.admin_resolve_dispute(
  p_task_id UUID, 
  p_resolution TEXT, -- 'seeker' or 'helper'
  p_admin_id UUID
) RETURNS void AS $$
DECLARE
  v_task public.tasks%ROWTYPE;
BEGIN
  -- Verify admin role
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Only admins can resolve disputes';
  END IF;

  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id AND status = 'disputed';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not disputed';
  END IF;

  IF p_resolution = 'helper' THEN
    -- Pay the helper
    UPDATE public.profiles SET wallet_balance = wallet_balance + v_task.pay, total_earnings = total_earnings + v_task.pay WHERE id = v_task.helper_id;
    -- Deduct from seeker (assuming escrow/dummy wallet logic)
    UPDATE public.profiles SET wallet_balance = wallet_balance - v_task.pay WHERE id = v_task.seeker_id;
    -- Mark as completed
    UPDATE public.tasks SET status = 'completed' WHERE id = p_task_id;
    
  ELSIF p_resolution = 'seeker' THEN
    -- Cancel the task, Seeker keeps their money (or gets refunded)
    UPDATE public.tasks SET status = 'cancelled' WHERE id = p_task_id;
  ELSE
    RAISE EXCEPTION 'Invalid resolution type';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.admin_resolve_dispute FROM PUBLIC;
