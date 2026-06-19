CREATE TABLE IF NOT EXISTS public.meta_event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  email TEXT,
  amount NUMERIC,
  status TEXT NOT NULL DEFAULT 'sent',
  response JSONB,
  error TEXT,
  source TEXT DEFAULT 'client',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meta_event_log_created ON public.meta_event_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meta_event_log_event ON public.meta_event_log(event_name);

ALTER TABLE public.meta_event_log DISABLE ROW LEVEL SECURITY;
