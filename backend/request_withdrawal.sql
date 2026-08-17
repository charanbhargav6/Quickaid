-- Secure RPC for requesting a wallet withdrawal
-- This runs with SECURITY DEFINER to bypass RLS and safely deduct balance
-- while ensuring the user has sufficient funds.

CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount NUMERIC)
RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
BEGIN
  -- Get the currently authenticated user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Withdrawal amount must be greater than zero';
  END IF;

  -- Lock the profile row for update to prevent race conditions
  SELECT wallet_balance INTO v_balance
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- Deduct the balance
  UPDATE public.profiles
  SET wallet_balance = wallet_balance - p_amount
  WHERE id = v_user_id;

  -- Insert a withdrawal transaction record
  INSERT INTO public.transactions (user_id, amount, type)
  VALUES (v_user_id, p_amount, 'payout');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
