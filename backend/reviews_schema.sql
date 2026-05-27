-- Create reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(task_id, reviewer_id) -- Prevent multiple reviews by the same person for the same task
);

-- Enable RLS
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Everyone can view reviews
CREATE POLICY "Reviews are viewable by everyone."
  ON public.reviews FOR SELECT
  USING ( true );

-- Users can insert their own reviews
CREATE POLICY "Users can create reviews."
  ON public.reviews FOR INSERT
  WITH CHECK ( auth.uid() = reviewer_id );

-- Function to update trust score dynamically
CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger AS $$
DECLARE
  avg_rating NUMERIC;
  new_trust_score INTEGER;
BEGIN
  -- Calculate average rating for the reviewee
  SELECT COALESCE(AVG(rating), 5) INTO avg_rating
  FROM public.reviews
  WHERE reviewee_id = NEW.reviewee_id;
  
  -- Convert 1-5 scale to 1-100 scale (e.g., 5 = 100, 4 = 80)
  new_trust_score := ROUND(avg_rating * 20);

  -- Update the profiles table
  UPDATE public.profiles
  SET trust_score = new_trust_score
  WHERE id = NEW.reviewee_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate trust score whenever a review is inserted
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE PROCEDURE public.update_trust_score();
