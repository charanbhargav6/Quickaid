-- Create messages table for Real-Time Chat
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow Seekers and Helpers associated with the task to read messages
CREATE POLICY "Users can view messages for their tasks"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = messages.task_id
      AND (tasks.seeker_id = auth.uid() OR tasks.helper_id = auth.uid())
    )
  );

-- Allow Seekers and Helpers associated with the task to insert messages
CREATE POLICY "Users can insert messages for their tasks"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = messages.task_id
      AND (tasks.seeker_id = auth.uid() OR tasks.helper_id = auth.uid())
    )
  );

-- Enable Supabase Realtime for the messages table
-- This is CRITICAL for the chat feature to instantly stream messages to the Flutter app
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
