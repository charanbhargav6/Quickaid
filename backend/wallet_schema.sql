-- ==============================================================================
-- SECURE WALLET TRANSACTION FUNCTION
-- ==============================================================================
-- This function uses Postgres atomic transactions. 
-- If any part fails (e.g. Seeker doesn't have enough money), the entire transaction
-- rolls back, ensuring no money is created or destroyed out of thin air.

CREATE OR REPLACE FUNCTION public.transfer_funds(p_task_id UUID)
RETURNS void AS $$
DECLARE
  v_seeker_id UUID;
  v_helper_id UUID;
  v_pay NUMERIC;
  v_status TEXT;
  v_seeker_balance NUMERIC;
BEGIN
  -- 1. Lock the task row to prevent race conditions (Double-spend prevention)
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

  -- 4. Deduct from Seeker
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - v_pay
  WHERE id = v_seeker_id;

  -- 5. Add to Helper and update their total earnings
  UPDATE public.profiles
  SET wallet_balance = wallet_balance + v_pay,
      total_earnings = total_earnings + v_pay,
      tasks_completed = tasks_completed + 1
  WHERE id = v_helper_id;

  -- 6. Record the transaction history for audit logs
  INSERT INTO public.transactions (user_id, task_id, amount, type)
  VALUES 
    (v_seeker_id, p_task_id, v_pay, 'debit'),
    (v_helper_id, p_task_id, v_pay, 'credit');

  -- 7. Mark the task as completed
  UPDATE public.tasks
  SET status = 'completed'
  WHERE id = p_task_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Simple function for the demo to add fake money to a wallet
CREATE OR REPLACE FUNCTION public.add_demo_funds(p_amount NUMERIC)
RETURNS void AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Unauthorized: Only admins can add demo funds.';
  END IF;

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
