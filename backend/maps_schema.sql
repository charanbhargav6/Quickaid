-- Add latitude and longitude columns to the tasks table for Map View
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Optional: Set default location to VIT Campus for existing tasks if they don't have one
UPDATE public.tasks
SET latitude = 12.9692, longitude = 79.1559
WHERE latitude IS NULL OR longitude IS NULL;
