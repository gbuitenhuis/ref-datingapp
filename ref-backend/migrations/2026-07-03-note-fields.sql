-- Add note field to push_requests for matchmaker notes
ALTER TABLE public.push_requests ADD COLUMN IF NOT EXISTS note TEXT;
