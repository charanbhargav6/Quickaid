-- request_withdrawal_fix.sql
-- Run this in your Supabase SQL Editor to fix the withdrawal RPC for the mobile app.

CREATE OR REPLACE FUNCTION request_withdrawal(p_amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_balance numeric;
BEGIN
  -- Get the current authenticated user
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get current balance
  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- Deduct the balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = v_user_id;

  -- Insert a withdrawal transaction record
  -- Note: We removed the 'status' column because it does not exist in the transactions table
  INSERT INTO public.transactions (user_id, amount, type)
  VALUES (v_user_id, p_amount, 'withdrawal');
END;
$$;
