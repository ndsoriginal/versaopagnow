CREATE TABLE IF NOT EXISTS public.meta_pixels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  pixel_id TEXT NOT NULL,
  api_token TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meta_pixels DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.meta_pixels TO anon, authenticated, service_role;
