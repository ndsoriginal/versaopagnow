-- ============================================================
-- MIGRAÇÃO 021: payment_gateways + RLS em tabelas sensíveis
-- ============================================================

-- ============================================================
-- 1. TABELA payment_gateways (gateways de pagamento)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

-- Admins podem ler todos os gateways
CREATE POLICY "Admins podem ler gateways"
  ON public.payment_gateways FOR SELECT
  USING (
    auth.role() = 'service_role'
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem inserir gateways
CREATE POLICY "Admins podem inserir gateways"
  ON public.payment_gateways FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem atualizar gateways
CREATE POLICY "Admins podem atualizar gateways"
  ON public.payment_gateways FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- Admins podem excluir gateways
CREATE POLICY "Admins podem excluir gateways"
  ON public.payment_gateways FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- 2. HABILITAR RLS EM TABELAS QUE ESTAVAM COM RLS DESABILITADO
-- ============================================================

-- users: RLS com política para próprio usuário + admins
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprio registro"
  ON public.users FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Usuários atualizam próprio registro"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins podem atualizar qualquer registro"
  ON public.users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- profiles: RLS com política para próprio usuário + admins
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprio perfil"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Usuários atualizam próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins podem atualizar qualquer perfil"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'superadmin')
    )
  );

-- transactions: RLS para próprio usuário + admins
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias transações"
  ON public.transactions FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Usuários inserem próprias transações"
  ON public.transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- withdraw_requests: RLS para próprio usuário + admins
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios saques"
  ON public.withdraw_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Usuários inserem próprios saques"
  ON public.withdraw_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- pix_requests: RLS (estava desabilitado)
ALTER TABLE public.pix_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprios pix"
  ON public.pix_requests FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Usuários inserem próprios pix"
  ON public.pix_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- deposit_attempts: RLS para próprio usuário + admins
ALTER TABLE public.deposit_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem próprias tentativas"
  ON public.deposit_attempts FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "Usuários inserem próprias tentativas"
  ON public.deposit_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 3. FUNÇÃO AUXILIAR PARA VERIFICAR ADMIN
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'superadmin')
  );
$$;
