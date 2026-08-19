-- Add completion_otp to tasks table
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS completion_otp VARCHAR(10);

-- Make sure it's accessible by all relevant roles (authenticated users can read their own tasks)
-- The RLS policies on tasks table already cover read/write access.
