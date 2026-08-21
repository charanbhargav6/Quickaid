-- ==============================================================================
-- PHASE 8: TRUST SCORE SYSTEM UPDATE
-- ==============================================================================

-- 1. Default trust score to 50
ALTER TABLE public.profiles ALTER COLUMN trust_score SET DEFAULT 50;

-- 2. Update task completion (+7 points)
CREATE OR REPLACE FUNCTION complete_task_with_trust(p_task_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_helper_id UUID;
  v_seeker_id UUID;
  v_status TEXT;
BEGIN
  -- Get task details
  SELECT helper_id, seeker_id, status INTO v_helper_id, v_seeker_id, v_status
  FROM public.tasks
  WHERE id = p_task_id;

  IF v_status != 'accepted' THEN
    RAISE EXCEPTION 'Task is not in accepted status';
  END IF;

  -- Transfer funds internally (using existing RPC logic if available, or do it here)
  PERFORM transfer_funds(p_task_id);

  -- Update task status
  UPDATE public.tasks SET status = 'completed' WHERE id = p_task_id;

  -- Increase trust score for helper (+7)
  UPDATE public.profiles 
  SET trust_score = LEAST(trust_score + 7, 100),
      tasks_completed = tasks_completed + 1
  WHERE id = v_helper_id;

  -- Insert notification for seeker
  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_seeker_id, 
    'Task Completed! 🎉', 
    'Your helper has marked the task as completed. Please leave a review.',
    jsonb_build_object('route', '/reviews', 'taskId', p_task_id)
  );

  -- Insert notification for helper
  INSERT INTO public.notifications (user_id, title, body, data)
  VALUES (
    v_helper_id, 
    'Task Completed! 💰', 
    'Payment has been credited to your wallet.',
    jsonb_build_object('route', '/earnings')
  );
END;
$$;

-- 3. Update cancellation penalty (-4 points)
CREATE OR REPLACE FUNCTION cancel_task_with_penalty(p_task_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_helper_id UUID;
  v_seeker_id UUID;
  v_canceller_id UUID;
BEGIN
  v_canceller_id := auth.uid();

  SELECT helper_id, seeker_id INTO v_helper_id, v_seeker_id
  FROM public.tasks
  WHERE id = p_task_id;

  -- Update task status
  UPDATE public.tasks SET status = 'cancelled' WHERE id = p_task_id;

  -- Update cancellation count and deduct trust score for the person cancelling (-4)
  UPDATE public.profiles 
  SET cancellation_count = cancellation_count + 1,
      trust_score = GREATEST(trust_score - 4, 0)
  WHERE id = v_canceller_id;

  -- Notify the other party
  IF v_canceller_id = v_seeker_id AND v_helper_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (v_helper_id, 'Task Cancelled', 'The seeker has cancelled the task.');
  ELSIF v_canceller_id = v_helper_id THEN
    INSERT INTO public.notifications (user_id, title, body)
    VALUES (v_seeker_id, 'Task Cancelled', 'Your helper has cancelled the task. You can repost it.');
  END IF;
END;
$$;

-- 4. Update trust score trigger for reviews (+3 for 5-star, -13 for 1 or 2 stars)
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger AS $$
DECLARE
  score_change INTEGER := 0;
BEGIN
  IF NEW.rating = 5 THEN
    score_change := 3;
  ELSIF NEW.rating <= 2 THEN
    score_change := -13;
  END IF;

  IF score_change != 0 THEN
    UPDATE public.profiles
    SET trust_score = GREATEST(0, LEAST(100, trust_score + score_change))
    WHERE id = NEW.reviewee_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.update_trust_score FROM PUBLIC;

-- 5. Trigger to auto-suspend account if trust score drops below 25
CREATE OR REPLACE FUNCTION public.check_trust_score_suspension()
RETURNS trigger AS $$
BEGIN
  -- If trust score drops below 25, suspend the account
  IF NEW.trust_score < 25 AND OLD.trust_score >= 25 THEN
    NEW.is_suspended := true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.check_trust_score_suspension FROM PUBLIC;

DROP TRIGGER IF EXISTS on_trust_score_change ON public.profiles;
CREATE TRIGGER on_trust_score_change
  BEFORE UPDATE OF trust_score ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.check_trust_score_suspension();
