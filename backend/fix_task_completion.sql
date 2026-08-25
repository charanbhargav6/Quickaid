-- Fix Task Completion, Trust Score, and Transaction Types

-- 1. Fix transfer_funds to use valid transaction types (payment, earning)
--    and remove duplicate tasks_completed increment
CREATE OR REPLACE FUNCTION public.transfer_funds(p_task_id UUID)
RETURNS void AS $$
DECLARE
  v_seeker_id UUID;
  v_helper_id UUID;
  v_pay NUMERIC;
  v_status TEXT;
  v_seeker_balance NUMERIC;
  v_platform_fee NUMERIC;
  v_helper_payout NUMERIC;
  v_admin_id UUID := '61372ee2-dd59-47e7-9821-5bfd9fe1165e'::UUID;
BEGIN
  -- 1. Lock the task row to prevent race conditions
  SELECT seeker_id, helper_id, pay, status
  INTO v_seeker_id, v_helper_id, v_pay, v_status
  FROM public.tasks
  WHERE id = p_task_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_status != 'accepted' THEN
    RAISE EXCEPTION 'Task is not in accepted status. Cannot release funds.';
  END IF;

  -- 2. Lock the Seeker's profile row
  SELECT wallet_balance
  INTO v_seeker_balance
  FROM public.profiles
  WHERE id = v_seeker_id
  FOR UPDATE;

  -- 3. Check for sufficient funds
  IF v_seeker_balance < v_pay THEN
    RAISE EXCEPTION 'Seeker does not have enough funds to pay for this task.';
  END IF;

  -- 4. Calculate Platform Fee (5%) and Helper Payout
  v_platform_fee := ROUND(v_pay * 0.05, 2);
  v_helper_payout := v_pay - v_platform_fee;

  -- 5. Deduct Full Pay from Seeker
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_pay
  WHERE id = v_seeker_id;

  -- 6. Add to Helper (Pay - 5%) and update their total earnings
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_helper_payout,
      total_earnings = total_earnings + v_helper_payout
  WHERE id = v_helper_id;

  -- 7. Add 5% Platform Fee to Main Admin
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_platform_fee,
      total_earnings = COALESCE(total_earnings, 0) + v_platform_fee
  WHERE id = v_admin_id;

  -- 8. Record the transaction history for audit logs
  -- Seeker Payment (Full amount) - using 'payment' instead of 'debit'
  INSERT INTO public.transactions (user_id, task_id, amount, type, description)
  VALUES (v_seeker_id, p_task_id, v_pay, 'payment', 'Task Completion Payment');

  -- Helper Earning (After fee) - using 'earning' instead of 'credit'
  INSERT INTO public.transactions (user_id, task_id, amount, type, description)
  VALUES (v_helper_id, p_task_id, v_helper_payout, 'earning', 'Task Earnings');
  
  -- Admin Fee Earning - using 'earning' instead of 'credit'
  INSERT INTO public.transactions (user_id, task_id, amount, type, description)
  VALUES (v_admin_id, p_task_id, v_platform_fee, 'earning', 'Platform Fee Revenue');

  -- 9. Mark the task as completed
  UPDATE public.tasks
  SET status = 'completed'
  WHERE id = p_task_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.transfer_funds FROM PUBLIC;

-- 2. Fix complete_task_with_trust to use +6 for completion
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

  -- Transfer funds internally (this also sets status to completed now)
  PERFORM transfer_funds(p_task_id);

  -- Increase trust score for helper (+6 as per user request) and increment tasks_completed
  UPDATE public.profiles 
  SET trust_score = LEAST(trust_score + 6, 100),
      tasks_completed = COALESCE(tasks_completed, 0) + 1
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

-- 3. Fix update_trust_score to use -5 for bad reviews instead of -13
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger AS $$
DECLARE
  score_change INTEGER := 0;
BEGIN
  IF NEW.rating = 5 THEN
    score_change := 3;
  ELSIF NEW.rating <= 2 THEN
    score_change := -5; -- User requested -5
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
