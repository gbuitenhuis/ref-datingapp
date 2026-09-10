-- User reports migration (run in Supabase SQL editor)
CREATE TABLE IF NOT EXISTS public.user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('inappropriate_behavior', 'fake_or_spam')),
  details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_reports_reporter ON public.user_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_user_reports_reported_user ON public.user_reports(reported_user_id);

ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can create reports about others" ON public.user_reports;
CREATE POLICY "Users can create reports about others" ON public.user_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND reporter_id <> reported_user_id);

DROP POLICY IF EXISTS "Users can view own reports" ON public.user_reports;
CREATE POLICY "Users can view own reports" ON public.user_reports
  FOR SELECT USING (auth.uid() = reporter_id);
