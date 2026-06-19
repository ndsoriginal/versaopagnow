-- ============================================================
-- MIGRAÇÃO 002: pix_requests + CPF em profiles
-- ============================================================

-- 1. Adicionar coluna cpf em profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf TEXT DEFAULT '';

-- 2. Criar tabela pix_requests
CREATE TABLE IF NOT EXISTS public.pix_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cpf TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  transaction_id TEXT NOT NULL UNIQUE,
  qr_code TEXT NOT NULL DEFAULT '',
  pix_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pix_requests_user_id ON public.pix_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_requests_status ON public.pix_requests(status);
CREATE INDEX IF NOT EXISTS idx_pix_requests_user_amount ON public.pix_requests(user_id, amount, status);

ALTER TABLE public.pix_requests DISABLE ROW LEVEL SECURITY;
