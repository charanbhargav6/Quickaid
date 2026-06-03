-- ============================================================================
-- Phase 11: Dummy Payments & Escrow Economy
-- ============================================================================

-- 1. Add wallet balance to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.00;

-- 2. Create transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'escrow', 'payout', 'refund')),
    status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS for transactions
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions"
ON public.transactions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create transactions"
ON public.transactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Note: We are allowing authenticated users to INSERT transactions directly for this MVP.
-- In a real production app with Stripe, transactions would be inserted via a secure Server Action or Webhook ONLY.
