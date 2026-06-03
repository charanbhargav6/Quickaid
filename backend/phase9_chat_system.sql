-- ==============================================================================
-- PHASE 9: REAL-TIME IN-APP CHAT
-- Adds messaging capabilities tied to specific tasks
-- ==============================================================================

-- 1. Create Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies for Messages

-- SELECT: Users can read messages if they are the Seeker or the assigned Helper for the task. Admins can read all.
DROP POLICY IF EXISTS "Users can read messages for their tasks" ON public.messages;
CREATE POLICY "Users can read messages for their tasks"
  ON public.messages FOR SELECT
  USING (
    auth.uid() IN (
      SELECT seeker_id FROM public.tasks WHERE id = messages.task_id
      UNION
      SELECT helper_id FROM public.tasks WHERE id = messages.task_id
    )
    OR 
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- INSERT: Users can send messages if they are the Seeker or assigned Helper for the task.
DROP POLICY IF EXISTS "Users can send messages for their tasks" ON public.messages;
CREATE POLICY "Users can send messages for their tasks"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id 
    AND 
    auth.uid() IN (
      SELECT seeker_id FROM public.tasks WHERE id = messages.task_id
      UNION
      SELECT helper_id FROM public.tasks WHERE id = messages.task_id
    )
  );

-- No UPDATE or DELETE policies to prevent tampering with chat history.

-- ==============================================================================
-- End of Phase 9
-- ==============================================================================
