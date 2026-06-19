-- ============================================================
-- MIGRAÇÃO 006: Tabelas do Double (Blaze-style)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.double_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting_open' CHECK (status IN ('betting_open', 'rolling', 'finished')),
  result_color TEXT CHECK (result_color IN ('red', 'black', 'white')),
  result_number INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_double_rounds_number ON public.double_rounds(round_number DESC);
CREATE INDEX IF NOT EXISTS idx_double_rounds_status ON public.double_rounds(status);

CREATE TABLE IF NOT EXISTS public.double_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  round_id UUID NOT NULL REFERENCES public.double_rounds(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('red', 'black', 'white')),
  amount NUMERIC NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  profit NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_double_bets_round ON public.double_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_double_bets_user ON public.double_bets(user_id);

CREATE TABLE IF NOT EXISTS public.double_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.double_rounds(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  number INTEGER,
  multiplier NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_double_history_created ON public.double_history(created_at DESC);

ALTER TABLE public.double_rounds DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.double_bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.double_history DISABLE ROW LEVEL SECURITY;

DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'double_rounds' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.double_rounds; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'double_history' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.double_history; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'double_bets' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.double_bets; END IF; END $$;
