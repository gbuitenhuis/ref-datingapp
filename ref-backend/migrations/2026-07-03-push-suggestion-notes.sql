-- Separate notes for each friend in a push introduction
ALTER TABLE public.push_suggestions ADD COLUMN IF NOT EXISTS note_to_target TEXT;
ALTER TABLE public.push_suggestions ADD COLUMN IF NOT EXISTS note_to_candidate TEXT;
