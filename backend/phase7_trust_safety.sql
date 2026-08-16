-- ==============================================================================
-- PHASE 7: TRUST & SAFETY CORE
-- ==============================================================================

-- 1. Update Profiles Table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reports_count INTEGER DEFAULT 0;

-- 2. Create User Reports Table
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) NOT NULL,
  reported_user_id UUID REFERENCES public.profiles(id) NOT NULL,
  task_id UUID REFERENCES public.tasks(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on user_reports
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- Users can insert their own reports
CREATE POLICY "Users can create reports."
  ON public.user_reports FOR INSERT
  WITH CHECK (auth.uid() = reporter_id);

-- Admins can read all reports
CREATE POLICY "Admins can view reports."
  ON public.user_reports FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 3. Trust Score Auto-Update Function
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger AS $$
BEGIN
  -- We'll adjust trust score in public.profiles based on various triggers
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Provide a secure RPC for task completion to adjust trust score
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

  IF v_helper_id IS NULL THEN
    RAISE EXCEPTION 'Task not found or has no helper';
  END IF;

  IF auth.uid() != v_helper_id AND auth.uid() != v_seeker_id THEN
    RAISE EXCEPTION 'Unauthorized: You are not a party to this task';
  END IF;

  IF v_status != 'accepted' THEN
    RAISE EXCEPTION 'Task is not in accepted status';
  END IF;

  -- Transfer funds internally (using existing RPC logic if available, or do it here)
  PERFORM transfer_funds(p_task_id);

  -- Update task status
  UPDATE public.tasks SET status = 'completed' WHERE id = p_task_id;

  -- Increase trust score for helper (+2)
  UPDATE public.profiles 
  SET trust_score = LEAST(trust_score + 2, 100),
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

-- Provide a secure RPC for cancelling task
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

  -- Update cancellation count and deduct trust score for the person cancelling
  UPDATE public.profiles 
  SET cancellation_count = cancellation_count + 1,
      trust_score = GREATEST(trust_score - 5, 0)
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

-- Provide a secure RPC for submitting a report
CREATE OR REPLACE FUNCTION submit_user_report(p_reported_id UUID, p_task_id UUID, p_reason TEXT, p_details TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reporter_id UUID;
BEGIN
  v_reporter_id := auth.uid();

  IF EXISTS (SELECT 1 FROM public.user_reports WHERE reporter_id = v_reporter_id AND reported_user_id = p_reported_id AND status = 'pending') THEN
    RAISE EXCEPTION 'You already have a pending report against this user.';
  END IF;

  INSERT INTO public.user_reports (reporter_id, reported_user_id, task_id, reason, details)
  VALUES (v_reporter_id, p_reported_id, p_task_id, p_reason, p_details);

  -- Only increment reports_count. Trust score will be deducted if admin approves report.
  UPDATE public.profiles 
  SET reports_count = reports_count + 1
  WHERE id = p_reported_id;

  -- Notify Admins (For now we just add an admin notification if we have an admin system, or just log it)
  INSERT INTO public.notifications (user_id, title, body, data)
  SELECT id, '🚨 New User Report', 'A user has been reported. Reason: ' || p_reason, jsonb_build_object('route', '/reviews')
  FROM public.profiles WHERE role = 'admin';
END;
$$;
