CREATE OR REPLACE FUNCTION public.update_trust_score()
RETURNS trigger AS $$
DECLARE
  score_change INTEGER := 0;
BEGIN
  IF NEW.rating = 5 THEN
    score_change := 3;
  ELSIF NEW.rating <= 2 THEN
    score_change := -5;
  END IF;

  -- Only increment total_reviews on INSERT, not on UPDATE
  IF TG_OP = 'INSERT' THEN
    UPDATE public.profiles
    SET trust_score = GREATEST(0, LEAST(100, trust_score + score_change)),
        total_reviews = COALESCE(total_reviews, 0) + 1
    WHERE id = NEW.reviewee_id;
  ELSE
    -- On UPDATE, just update trust score (if we were to support rating edits)
    IF score_change != 0 THEN
      UPDATE public.profiles
      SET trust_score = GREATEST(0, LEAST(100, trust_score + score_change))
      WHERE id = NEW.reviewee_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

REVOKE EXECUTE ON FUNCTION public.update_trust_score FROM PUBLIC;
