-- ============================================================
-- REF DATABASE SETUP — paste this entire file into
-- Supabase Dashboard → SQL Editor and click Run
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship_status TEXT NOT NULL CHECK (relationship_status IN ('single', 'not-single')),
  photo TEXT,
  bio TEXT,
  age INTEGER CHECK (age >= 18 AND age <= 120),
  gender TEXT CHECK (gender IN ('man', 'woman', 'non-binary')),
  looking_for TEXT CHECK (looking_for IN ('men', 'women', 'everyone')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.friends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CHECK (user1_id < user2_id),
  UNIQUE(user1_id, user2_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matchmaker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

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

CREATE TABLE IF NOT EXISTS public.push_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matchmaker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note TEXT,
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

CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate_behavior', 'fake_or_spam')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ── Indexes ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_friends_requester ON public.friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_friends_addressee ON public.friends(addressee_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches(user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches(user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages(match_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_requester ON public.pull_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_pull_requests_matchmaker ON public.pull_requests(matchmaker_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_pull_request ON public.pull_suggestions(pull_request_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_requester ON public.pull_suggestions(requester_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_candidate ON public.pull_suggestions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_pull_suggestions_matchmaker ON public.pull_suggestions(matchmaker_id);
CREATE INDEX IF NOT EXISTS idx_push_requests_matchmaker ON public.push_requests(matchmaker_id);
CREATE INDEX IF NOT EXISTS idx_push_requests_target ON public.push_requests(target_user_id);
CREATE INDEX IF NOT EXISTS idx_push_suggestions_request ON public.push_suggestions(push_request_id);
CREATE INDEX IF NOT EXISTS idx_push_suggestions_target ON public.push_suggestions(target_user_id);
CREATE INDEX IF NOT EXISTS idx_push_suggestions_candidate ON public.push_suggestions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON public.user_reports(reported_user_id);

-- ── Row Level Security ───────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pull_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

-- ── Policies ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view own friends" ON public.friends;
CREATE POLICY "Users can view own friends" ON public.friends
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can create own friend requests" ON public.friends;
CREATE POLICY "Users can create own friend requests" ON public.friends
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS "Users can update friend requests" ON public.friends;
CREATE POLICY "Users can update friend requests" ON public.friends
  FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
CREATE POLICY "Users can view own matches" ON public.matches
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can view messages in their matches" ON public.messages;
CREATE POLICY "Users can view messages in their matches" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = messages.match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create messages in their matches" ON public.messages;
CREATE POLICY "Users can create messages in their matches" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE matches.id = match_id
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can view own pull requests" ON public.pull_requests;
CREATE POLICY "Users can view own pull requests" ON public.pull_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = matchmaker_id);

DROP POLICY IF EXISTS "Users can create own pull requests" ON public.pull_requests;
CREATE POLICY "Users can create own pull requests" ON public.pull_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

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

DROP POLICY IF EXISTS "Users can create reports about others" ON public.user_reports;
CREATE POLICY "Users can create reports about others" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.user_reports;
CREATE POLICY "Users can view own reports" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);

-- ── updated_at trigger ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
