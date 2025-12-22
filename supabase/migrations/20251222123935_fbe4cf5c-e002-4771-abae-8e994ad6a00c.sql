-- Add conditions column for health conditions (지병)
ALTER TABLE public.nutrition_settings 
ADD COLUMN IF NOT EXISTS conditions text[] DEFAULT NULL;