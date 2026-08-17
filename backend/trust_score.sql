-- 1. Add trust_score column to profiles if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;

-- 2. Add total_reviews column to profiles if it doesn't exist
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- 3. Set existing users to 50 who have no trust score
UPDATE public.profiles
SET trust_score = 50
WHERE trust_score IS NULL;

-- 4. Create function to calculate and update trust score automatically
CREATE OR REPLACE FUNCTION public.update_trust_score_on_review()
RETURNS TRIGGER AS $$
DECLARE
  v_avg_rating NUMERIC;
  v_total_reviews INTEGER;
  v_new_trust_score INTEGER;
BEGIN
  -- Calculate new true average rating for this user
  SELECT COALESCE(AVG(rating), 0), COUNT(*) 
  INTO v_avg_rating, v_total_reviews
  FROM public.reviews
  WHERE reviewee_id = NEW.reviewee_id;

  -- Convert 1-5 star scale into 0-100 Trust Score
  IF v_total_reviews > 0 THEN
    v_new_trust_score := ROUND((v_avg_rating / 5.0) * 100);
  ELSE
    v_new_trust_score := 50;
  END IF;

  -- Ensure score stays between 0 and 100
  v_new_trust_score := GREATEST(0, LEAST(100, v_new_trust_score));

  -- Update the reviewee's profile
  UPDATE public.profiles
  SET 
    trust_score = v_new_trust_score,
    total_reviews = v_total_reviews
  WHERE id = NEW.reviewee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create Trigger on reviews table
DROP TRIGGER IF EXISTS trigger_update_trust_score ON public.reviews;
CREATE TRIGGER trigger_update_trust_score
AFTER INSERT OR UPDATE ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_trust_score_on_review();
