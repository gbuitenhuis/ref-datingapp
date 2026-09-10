-- Pull suggestions migration (run in Supabase SQL editor)
CREATE TABLE IF NOT EXISTS public.pull_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pull_request_id UUID NOT NULL REFERENCES public.pull_requests(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matchmaker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note_to_requester TEXT,
  note_to_candidate TEXT,
  requester_status TEXT NOT NULL CHECK (requester_status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  candidate_status TEXT NOT NULL CHECK (candidate_status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  final_status TEXT NOT NULL CHECK (final_status IN ('pending', 'matched', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(pull_request_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_pull_suggestions_pull_request ON public.pull_suggestions(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_requester ON public.pull_suggestions(requester_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_candidate ON public.pull_suggestions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_matchmaker ON public.pull_suggestions(matchmaker_id);

ALTER TABLE public.pull_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view related pull suggestions" ON public.pull_suggestions;
CREATE POLICY "Users can view related pull suggestions" ON public.pull_suggestions
  FOR SELECT USING (
    auth.uid() = requester_id OR auth.uid() = candidate_id OR auth.uid() = matchmaker_id
  );

DROP POLICY IF EXISTS "Matchmakers can create pull suggestions" ON public.pull_suggestions;
CREATE POLICY "Matchmakers can create pull suggestions" ON public.pull_suggestions
  FOR INSERT WITH CHECK (auth.uid() = matchmaker_id);

DROP POLICY IF EXISTS "Participants can update pull suggestions" ON public.pull_suggestions;
CREATE POLICY "Participants can update pull suggestions" ON public.pull_suggestions
  FOR UPDATE USING (
    auth.uid() = requester_id OR auth.uid() = candidate_id OR auth.uid() = matchmaker_id
  );
