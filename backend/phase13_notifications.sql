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

-- Removed permissive INSERT policy: Service role bypasses RLS, so no policy needed for backend inserts.

CREATE POLICY "Users can update their own notifications (mark as read)"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);
