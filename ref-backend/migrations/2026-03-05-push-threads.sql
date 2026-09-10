-- Push thread model: one target + multiple candidates
CREATE TABLE IF NOT EXISTS public.push_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matchmaker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'completed')) DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.push_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  push_request_id UUID NOT NULL REFERENCES public.push_requests(id) ON DELETE CASCADE,
  matchmaker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_status TEXT NOT NULL CHECK (target_status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  candidate_status TEXT NOT NULL CHECK (candidate_status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  final_status TEXT NOT NULL CHECK (final_status IN ('pending', 'matched', 'declined')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(push_request_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_push_requests_matchmaker ON public.push_requests(matchmaker_id);
CREATE INDEX IF NOT EXISTS idx_push_requests_target ON public.push_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_push_suggestions_request ON public.push_suggestions(push_request_id);
CREATE INDEX IF NOT EXISTS idx_push_suggestions_target ON public.push_suggestions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_push_suggestions_candidate ON public.push_suggestions(candidate_id);

ALTER TABLE public.push_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_suggestions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view related push requests" ON public.push_requests;
CREATE POLICY "Users can view related push requests" ON public.push_requests
  FOR SELECT USING (auth.uid() = matchmaker_id OR auth.uid() = target_user_id);

DROP POLICY IF EXISTS "Matchmakers can create push requests" ON public.push_requests;
CREATE POLICY "Matchmakers can create push requests" ON public.push_requests
  FOR INSERT WITH CHECK (auth.uid() = matchmaker_id);

DROP POLICY IF EXISTS "Users can update related push requests" ON public.push_requests;
CREATE POLICY "Users can update related push requests" ON public.push_requests
  FOR UPDATE USING (auth.uid() = matchmaker_id OR auth.uid() = target_user_id);

DROP POLICY IF EXISTS "Users can view related push suggestions" ON public.push_suggestions;
CREATE POLICY "Users can view related push suggestions" ON public.push_suggestions
  FOR SELECT USING (
    auth.uid() = matchmaker_id OR auth.uid() = target_user_id OR auth.uid() = candidate_id
  );

DROP POLICY IF EXISTS "Matchmakers can create push suggestions" ON public.push_suggestions;
CREATE POLICY "Matchmakers can create push suggestions" ON public.push_suggestions
  FOR INSERT WITH CHECK (auth.uid() = matchmaker_id);

DROP POLICY IF EXISTS "Participants can update push suggestions" ON public.push_suggestions;
CREATE POLICY "Participants can update push suggestions" ON public.push_suggestions
  FOR UPDATE USING (
    auth.uid() = matchmaker_id OR auth.uid() = target_user_id OR auth.uid() = candidate_id
  );
