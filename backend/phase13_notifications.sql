-- ============================================================================
-- Phase 13: Real-Time Notifications
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL, -- 'task_accepted', 'task_completed', 'message', 'alert'
    is_read BOOLEAN DEFAULT false,
    link TEXT, -- Optional URL to navigate to when clicked
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications for users"
ON public.notifications FOR INSERT
WITH CHECK (true); -- Ideally, restricted to triggers or service role, but open for MVP server actions

CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);
