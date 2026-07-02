-- ============================================================
-- MIGRAÇÃO 022: Fix RLS recursion risk, meta_pixels security,
-- mines RLS, add webhook delivery dedup table
-- ============================================================

-- ============================================================
-- 1. CORRIGIR POLICIES USANDO is_admin() EM VEZ DE SUBQUERY
-- ============================================================

-- profiles: SELECT (próprio perfil OU admin)
DROP POLICY IF EXISTS "Usuários veem próprio perfil" ON public.profiles;
CREATE POLICY "Usuários veem próprio perfil" ON public.profiles
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- profiles: UPDATE admin
DROP POLICY IF EXISTS "Admins podem atualizar qualquer perfil" ON public.profiles;
CREATE POLICY "Admins podem atualizar qualquer perfil" ON public.profiles
  FOR UPDATE USING (public.is_admin());

-- users: SELECT (próprio OU admin)
DROP POLICY IF EXISTS "Usuários veem próprio registro" ON public.users;
CREATE POLICY "Usuários veem próprio registro" ON public.users
  FOR SELECT USING (auth.uid() = id OR public.is_admin());

-- users: UPDATE admin
DROP POLICY IF EXISTS "Admins podem atualizar qualquer registro" ON public.users;
CREATE POLICY "Admins podem atualizar qualquer registro" ON public.users
  FOR UPDATE USING (public.is_admin());

-- transactions: SELECT
DROP POLICY IF EXISTS "Usuários veem próprias transações" ON public.transactions;
CREATE POLICY "Usuários veem próprias transações" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- withdraw_requests: SELECT
DROP POLICY IF EXISTS "Usuários veem próprios saques" ON public.withdraw_requests;
CREATE POLICY "Usuários veem próprios saques" ON public.withdraw_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- pix_requests: SELECT
DROP POLICY IF EXISTS "Usuários veem próprios pix" ON public.pix_requests;
CREATE POLICY "Usuários veem próprios pix" ON public.pix_requests
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- deposit_attempts: SELECT
DROP POLICY IF EXISTS "Usuários veem próprias tentativas" ON public.deposit_attempts;
CREATE POLICY "Usuários veem próprias tentativas" ON public.deposit_attempts
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- payment_gateways: SELECT
DROP POLICY IF EXISTS "Admins podem ler gateways" ON public.payment_gateways;
CREATE POLICY "Admins podem ler gateways" ON public.payment_gateways
  FOR SELECT USING (auth.role() = 'service_role' OR public.is_admin());

-- ============================================================
-- 2. HABILITAR RLS EM meta_pixels (CRÍTICO: expunha tokens)
-- ============================================================
ALTER TABLE public.meta_pixels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Apenas admins" ON public.meta_pixels
  FOR ALL USING (public.is_admin());
REVOKE ALL ON public.meta_pixels FROM anon, authenticated;
GRANT ALL ON public.meta_pixels TO service_role;

-- ============================================================
-- 3. HABILITAR RLS EM mines_games + mines_reveals
-- ============================================================
ALTER TABLE public.mines_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem próprios jogos" ON public.mines_games
  FOR SELECT USING (auth.uid() = user_id);

ALTER TABLE public.mines_reveals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários veem próprios reveals" ON public.mines_reveals
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================
-- 4. TABELA webhook_deliveries + função de dedup
-- ============================================================
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id TEXT PRIMARY KEY,
  gateway TEXT NOT NULL,
  transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'processed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_gateway ON public.webhook_deliveries (gateway);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.webhook_deliveries
  FOR ALL USING (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION public.try_claim_delivery(
  p_delivery_id TEXT,
  p_gateway TEXT,
  p_transaction_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.webhook_deliveries (id, gateway, transaction_id)
  VALUES (p_delivery_id, p_gateway, p_transaction_id)
  ON CONFLICT (id) DO NOTHING;
  RETURN FOUND;
END;
$$;
