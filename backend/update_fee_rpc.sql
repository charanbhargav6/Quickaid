-- Run this in your Supabase SQL Editor to route the 5% platform fee to the Main Admin
-- Main Admin ID: 61372ee2-dd59-47e7-9821-5bfd9fe1165e

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
      total_earnings = total_earnings + v_helper_payout,
      tasks_completed = tasks_completed + 1
  WHERE id = v_helper_id;

  -- 7. Add 5% Platform Fee to Main Admin
  UPDATE public.profiles
  SET wallet_balance = COALESCE(wallet_balance, 0) + v_platform_fee,
      total_earnings = COALESCE(total_earnings, 0) + v_platform_fee
  WHERE id = v_admin_id;

  -- 8. Record the transaction history for audit logs
  -- Seeker Debit (Full amount)
  INSERT INTO public.transactions (user_id, task_id, amount, type)
  VALUES (v_seeker_id, p_task_id, v_pay, 'debit');

  -- Helper Credit (After fee)
  INSERT INTO public.transactions (user_id, task_id, amount, type)
  VALUES (v_helper_id, p_task_id, v_helper_payout, 'credit');
  
  -- Admin Fee Credit
  INSERT INTO public.transactions (user_id, task_id, amount, type)
  VALUES (v_admin_id, p_task_id, v_platform_fee, 'credit');

  -- 9. Mark the task as completed
  UPDATE public.tasks
  SET status = 'completed'
  WHERE id = p_task_id;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.transfer_funds FROM PUBLIC;
