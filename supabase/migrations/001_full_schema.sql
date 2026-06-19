-- ============================================================
-- NOVOPIXVB - Configuração Completa do Supabase
-- Execute todo este SQL no SQL Editor do Supabase Dashboard
-- (https://supabase.com/dashboard/project/rkkmtdpgrvtbotvypysq)
-- ============================================================

-- 1. TABELA users (saldo principal dos usuários)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  balance NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 2. TABELA profiles (perfil com role e saldo de bônus)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'demo')),
  real_balance NUMERIC DEFAULT 0 NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 3. TABELA transactions (depósitos e transações)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL DEFAULT 'deposit',
  status TEXT NOT NULL DEFAULT 'pending',
  pix_code TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);

ALTER TABLE public.transactions DISABLE ROW LEVEL SECURITY;

-- 4. TABELA deposit_attempts (tentativas de depósito - analytics)
CREATE TABLE IF NOT EXISTS public.deposit_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deposit_attempts_user_id ON public.deposit_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_attempts_created_at ON public.deposit_attempts(created_at DESC);

ALTER TABLE public.deposit_attempts DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- TRIGGER: Criar users + profiles automaticamente ao cadastrar
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, balance, created_at)
  VALUES (NEW.id, NEW.email, 0, NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, first_name, role, updated_at)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User'),
    'user',
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNÇÃO: Incrementar saldo atomicamente (evita race conditions)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_balance(user_id UUID, amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.users
  SET balance = COALESCE(balance, 0) + amount
  WHERE id = user_id
  RETURNING balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- ============================================================
-- FUNÇÃO: Incrementar real_balance (para bônus admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.increment_real_balance(user_id UUID, amount NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE public.profiles
  SET real_balance = COALESCE(real_balance, 0) + amount
  WHERE id = user_id
  RETURNING real_balance INTO new_balance;

  RETURN new_balance;
END;
$$;

-- ============================================================
-- CONFIGURAÇÕES DE AUTENTICAÇÃO (via Dashboard)
-- As configurações abaixo devem ser feitas manualmente:
-- ============================================================

-- Auth > Settings > General:
--   - Enable email/password sign up: ON
--   - Confirm email: OFF (para criação instantânea)
--   - Security > Allow disposable emails: ON (se desejar)

-- Auth > Settings > Redirect URLs:
--   - Site URL: https://novopixvb.vercel.app (ou localhost em dev)
--   - Redirect URLs: https://novopixvb.vercel.app/*, http://localhost:5173/*

-- ============================================================
-- EDGE FUNCTION SECRETS (Configurar no Dashboard)
-- Settings > Edge Functions > Secrets:
-- ============================================================
-- SUPABASE_URL (já definido pela Supabase)
-- SUPABASE_SERVICE_ROLE_KEY (já definido pela Supabase)
--
-- Adicionar manualmente:
-- PAGNOW_API_KEY=...
-- PAGNOW_WEBHOOK_URL=https://rkkmtdpgrvtbotvypysq.supabase.co/functions/v1/pagnow-webhook
-- PAGNOW_WEBHOOK_SECRET=...

-- ============================================================
-- VERIFICAÇÃO: Listar todas as tabelas criadas
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;
