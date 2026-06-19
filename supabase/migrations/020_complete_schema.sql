-- ============================================================
-- NOVOPIXVB / PIXBETT - Schema Completo (Versão Unificada)
-- Execute todo este SQL no SQL Editor do Supabase Dashboard
-- Projeto: versao2
-- ============================================================

-- ============================================================
-- 1. TABELA users (saldo principal dos usuários)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  balance NUMERIC DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. TABELA profiles (perfil com role e saldo de bônus)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'superadmin', 'demo')),
  real_balance NUMERIC DEFAULT 0 NOT NULL,
  cpf TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. TABELA transactions (depósitos e transações)
-- ============================================================
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

-- ============================================================
-- 4. TABELA deposit_attempts (tentativas de depósito)
-- ============================================================
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
-- 5. TABELA pix_requests (solicitações de PIX)
-- ============================================================
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

-- ============================================================
-- 6. TABELA withdraw_requests (solicitações de saque)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  pix_key TEXT,
  pix_key_type TEXT DEFAULT 'cpf',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  fee_transaction_id UUID,
  admin_id UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON public.withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_fee_tx ON public.withdraw_requests(fee_transaction_id);

ALTER TABLE public.withdraw_requests DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. TABELA double_rounds (rodadas do Double)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.double_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'betting_open' CHECK (status IN ('betting_open', 'betting', 'rolling', 'spinning', 'finished')),
  result_color TEXT CHECK (result_color IN ('red', 'black', 'white')),
  result_number INTEGER,
  betting_ends_at TIMESTAMPTZ,
  spin_started_at TIMESTAMPTZ,
  spinning_ends_at TIMESTAMPTZ,
  spin_duration_ms INTEGER DEFAULT 6000,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_double_rounds_number ON public.double_rounds(round_number DESC);
CREATE INDEX IF NOT EXISTS idx_double_rounds_status ON public.double_rounds(status);

ALTER TABLE public.double_rounds DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. TABELA double_bets (apostas do Double)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.double_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  round_id UUID NOT NULL REFERENCES public.double_rounds(id) ON DELETE CASCADE,
  color TEXT NOT NULL CHECK (color IN ('red', 'black', 'white')),
  amount NUMERIC NOT NULL,
  multiplier NUMERIC NOT NULL DEFAULT 2,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost')),
  profit NUMERIC DEFAULT 0,
  payout NUMERIC DEFAULT 0,
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_double_bets_round ON public.double_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_double_bets_user ON public.double_bets(user_id);

ALTER TABLE public.double_bets DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 9. TABELA double_history (histórico de resultados do Double)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.double_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.double_rounds(id) ON DELETE CASCADE,
  color TEXT NOT NULL,
  number INTEGER,
  multiplier NUMERIC NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_double_history_created ON public.double_history(created_at DESC);

ALTER TABLE public.double_history DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 10. TABELA mines_games (jogos do Mines)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mines_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cashed_out', 'busted', 'cancelled')),
  bet_amount NUMERIC NOT NULL,
  mine_count INT NOT NULL,
  grid_size INT NOT NULL DEFAULT 25,
  mine_positions INT[] NOT NULL,
  revealed_tiles INT[] DEFAULT '{}',
  current_multiplier NUMERIC DEFAULT 1,
  potential_payout NUMERIC DEFAULT 0,
  final_payout NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_mines_games_user ON public.mines_games(user_id);
CREATE INDEX IF NOT EXISTS idx_mines_games_status ON public.mines_games(status);
CREATE INDEX IF NOT EXISTS idx_mines_games_created ON public.mines_games(created_at DESC);

ALTER TABLE public.mines_games DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. TABELA mines_reveals (revelações do Mines)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mines_reveals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.mines_games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tile_index INT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('safe', 'mine')),
  multiplier_after NUMERIC,
  payout_after NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mines_reveals_game ON public.mines_reveals(game_id);

ALTER TABLE public.mines_reveals DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 12. TABELA game_config (configurações dos jogos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.game_config (
  game_id TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.game_config DISABLE ROW LEVEL SECURITY;

-- Seed para game_config
INSERT INTO public.game_config (game_id, config) VALUES
('double', '{
  "difficultyTiers": [
    { "name": "Iniciante", "roundStart": 1, "roundEnd": 5, "probabilities": { "red": 0.55, "black": 0.42, "white": 0.03 } },
    { "name": "Normal", "roundStart": 6, "roundEnd": 20, "probabilities": { "red": 0.4667, "black": 0.4667, "white": 0.0666 } },
    { "name": "Veterano", "roundStart": 21, "roundEnd": 999999, "probabilities": { "red": 0.45, "black": 0.45, "white": 0.10 } }
  ],
  "payouts": { "red": 2, "black": 2, "white": 14 },
  "segmentDisplay": { "red": 7, "black": 7, "white": 1 }
}'),
('mines', '{
  "difficultyTiers": [
    { "name": "Iniciante", "roundStart": 1, "roundEnd": 5, "mineAdjustment": -3, "multiplierBonus": 0.2 },
    { "name": "Normal", "roundStart": 6, "roundEnd": 20, "mineAdjustment": 0, "multiplierBonus": 0 },
    { "name": "Veterano", "roundStart": 21, "roundEnd": 999999, "mineAdjustment": -1, "multiplierBonus": 0.5 }
  ],
  "gridSize": 5,
  "maxMines": 24
}')
ON CONFLICT (game_id) DO NOTHING;

-- ============================================================
-- 13. TABELA ads_daily_metrics (métricas de anúncios Meta Ads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ads_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  campaign_name TEXT NOT NULL,
  adset_name TEXT NOT NULL,
  ad_name TEXT NOT NULL,
  investment NUMERIC NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  reach INT NOT NULL DEFAULT 0,
  leads INT NOT NULL DEFAULT 0,
  purchases INT NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpl NUMERIC DEFAULT 0,
  cost_per_purchase NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_date ON public.ads_daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_campaign ON public.ads_daily_metrics(campaign_name);
CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_adset ON public.ads_daily_metrics(adset_name);
CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_ad ON public.ads_daily_metrics(ad_name);

ALTER TABLE public.ads_daily_metrics DISABLE ROW LEVEL SECURITY;

-- ============================================================
-- 14. VIEW ads_daily_summary (resumo agregado)
-- ============================================================
CREATE OR REPLACE VIEW public.ads_daily_summary AS
SELECT
  COALESCE(SUM(investment), 0) AS total_investment,
  COALESCE(SUM(clicks), 0) AS total_clicks,
  COALESCE(SUM(impressions), 0) AS total_impressions,
  COALESCE(SUM(reach), 0) AS total_reach,
  COALESCE(SUM(leads), 0) AS total_leads,
  COALESCE(SUM(purchases), 0) AS total_purchases,
  COALESCE(SUM(revenue), 0) AS total_revenue,
  CASE WHEN SUM(investment) > 0 THEN ROUND(SUM(revenue) / SUM(investment), 2) ELSE 0 END AS roas,
  CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(investment) / SUM(clicks), 2) ELSE 0 END AS cpc,
  CASE WHEN SUM(leads) > 0 THEN ROUND(SUM(investment) / SUM(leads), 2) ELSE 0 END AS cpl,
  CASE WHEN SUM(purchases) > 0 THEN ROUND(SUM(investment) / SUM(purchases), 2) ELSE 0 END AS cost_per_purchase
FROM public.ads_daily_metrics;

GRANT SELECT ON public.ads_daily_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.ads_daily_metrics TO anon, authenticated, service_role;

-- ============================================================
-- 15. TABELA meta_event_log (log de eventos Meta/Facebook)
-- ============================================================
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

-- ============================================================
-- 16. TABELA meta_pixels (pixels do Meta/Facebook)
-- ============================================================
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

-- ============================================================
-- 17. TABELA push_subscriptions (notificações push)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  device_name TEXT,
  preferences JSONB NOT NULL DEFAULT '{"new_lead":true,"pix_paid":true,"pix_generated":true}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem ver suas próprias subscriptions" ON public.push_subscriptions;
CREATE POLICY "Usuários podem ver suas próprias subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir suas próprias subscriptions" ON public.push_subscriptions;
CREATE POLICY "Usuários podem inserir suas próprias subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas próprias subscriptions" ON public.push_subscriptions;
CREATE POLICY "Usuários podem atualizar suas próprias subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar suas próprias subscriptions" ON public.push_subscriptions;
CREATE POLICY "Usuários podem deletar suas próprias subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

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

  INSERT INTO public.profiles (id, first_name, role, real_balance, updated_at)
  VALUES (
    NEW.id,
    COALESCE(SPLIT_PART(NEW.email, '@', 1), 'User'),
    'user',
    0,
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- FUNÇÃO: Incrementar saldo atomicamente
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
-- FUNÇÃO: Incrementar real_balance (bônus admin)
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
-- FUNÇÃO: Calcular multiplicador do Mines
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_mines_multiplier(
  p_grid_size INT,
  p_mine_count INT,
  p_safe_reveals INT,
  p_house_edge NUMERIC DEFAULT 0.03
)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_probability NUMERIC := 1;
  v_safe_tiles INT;
  i INT;
  v_multiplier NUMERIC;
BEGIN
  v_safe_tiles := p_grid_size - p_mine_count;

  IF p_safe_reveals <= 0 THEN
    RETURN 1;
  END IF;

  FOR i IN 0..(p_safe_reveals - 1) LOOP
    v_probability := v_probability * ((v_safe_tiles - i)::NUMERIC / (p_grid_size - i)::NUMERIC);
  END LOOP;

  v_multiplier := (1 / v_probability) * (1 - p_house_edge);

  RETURN ROUND(v_multiplier, 2);
END;
$$;

-- ============================================================
-- FUNÇÃO: Iniciar jogo Mines
-- ============================================================
CREATE OR REPLACE FUNCTION public.start_mines_game(
  p_bet_amount NUMERIC,
  p_mine_count INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_balance NUMERIC;
  v_game_id UUID;
  v_grid_size INT := 25;
  v_mines INT[] := '{}';
  v_random_tile INT;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_bet_amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  IF p_mine_count < 1 OR p_mine_count >= v_grid_size THEN
    RAISE EXCEPTION 'Quantidade de minas inválida';
  END IF;

  SELECT balance INTO v_balance
  FROM public.users WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance < p_bet_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.mines_games
    WHERE user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Você já possui um jogo ativo';
  END IF;

  WHILE COALESCE(array_length(v_mines, 1), 0) < p_mine_count LOOP
    v_random_tile := FLOOR(RANDOM() * v_grid_size)::INT;
    IF NOT (v_random_tile = ANY(v_mines)) THEN
      v_mines := array_append(v_mines, v_random_tile);
    END IF;
  END LOOP;

  UPDATE public.users
  SET balance = balance - p_bet_amount
  WHERE id = v_user_id;

  INSERT INTO public.mines_games (
    user_id, status, bet_amount, mine_count, grid_size,
    mine_positions, revealed_tiles, current_multiplier, potential_payout
  ) VALUES (
    v_user_id, 'active', p_bet_amount, p_mine_count, v_grid_size,
    v_mines, '{}', 1, 0
  )
  RETURNING id INTO v_game_id;

  INSERT INTO public.transactions (id, user_id, type, amount)
  VALUES (gen_random_uuid()::TEXT, v_user_id, 'mines_bet', -p_bet_amount);

  RETURN jsonb_build_object(
    'id', v_game_id,
    'status', 'active',
    'bet_amount', p_bet_amount,
    'mine_count', p_mine_count,
    'grid_size', v_grid_size,
    'revealed_tiles', jsonb_build_array(),
    'current_multiplier', 1,
    'potential_payout', 0
  );
END;
$$;

-- ============================================================
-- FUNÇÃO: Revelar tile no Mines
-- ============================================================
CREATE OR REPLACE FUNCTION public.reveal_mines_tile(
  p_game_id UUID,
  p_tile_index INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_game public.mines_games%ROWTYPE;
  v_is_mine BOOLEAN;
  v_new_revealed INT[];
  v_safe_count INT;
  v_multiplier NUMERIC;
  v_payout NUMERIC;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF p_tile_index < 0 OR p_tile_index > 24 THEN
    RAISE EXCEPTION 'Casa inválida';
  END IF;

  SELECT * INTO v_game
  FROM public.mines_games
  WHERE id = p_game_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'Jogo não está ativo';
  END IF;

  IF p_tile_index = ANY(v_game.revealed_tiles) THEN
    RAISE EXCEPTION 'Casa já revelada';
  END IF;

  v_is_mine := p_tile_index = ANY(v_game.mine_positions);

  IF v_is_mine THEN
    UPDATE public.mines_games
    SET status = 'busted', final_payout = 0, finished_at = NOW()
    WHERE id = p_game_id;

    INSERT INTO public.mines_reveals (game_id, user_id, tile_index, result, multiplier_after, payout_after)
    VALUES (p_game_id, v_user_id, p_tile_index, 'mine', v_game.current_multiplier, 0);

    RETURN jsonb_build_object(
      'result', 'mine',
      'tile_index', p_tile_index,
      'mine_positions', to_jsonb(v_game.mine_positions),
      'revealed_tiles', to_jsonb(v_game.revealed_tiles),
      'game', jsonb_build_object(
        'id', p_game_id,
        'status', 'busted',
        'bet_amount', v_game.bet_amount,
        'mine_count', v_game.mine_count,
        'grid_size', v_game.grid_size,
        'current_multiplier', v_game.current_multiplier,
        'potential_payout', 0,
        'final_payout', 0
      )
    );
  END IF;

  v_new_revealed := array_append(v_game.revealed_tiles, p_tile_index);
  v_safe_count := array_length(v_new_revealed, 1);

  v_multiplier := public.calculate_mines_multiplier(
    v_game.grid_size, v_game.mine_count, v_safe_count
  );

  v_payout := ROUND(v_game.bet_amount * v_multiplier, 2);

  UPDATE public.mines_games
  SET revealed_tiles = v_new_revealed,
      current_multiplier = v_multiplier,
      potential_payout = v_payout
  WHERE id = p_game_id;

  INSERT INTO public.mines_reveals (game_id, user_id, tile_index, result, multiplier_after, payout_after)
  VALUES (p_game_id, v_user_id, p_tile_index, 'safe', v_multiplier, v_payout);

  RETURN jsonb_build_object(
    'result', 'safe',
    'tile_index', p_tile_index,
    'revealed_tiles', to_jsonb(v_new_revealed),
    'game', jsonb_build_object(
      'id', p_game_id,
      'status', 'active',
      'bet_amount', v_game.bet_amount,
      'mine_count', v_game.mine_count,
      'grid_size', v_game.grid_size,
      'current_multiplier', v_multiplier,
      'potential_payout', v_payout
    )
  );
END;
$$;

-- ============================================================
-- FUNÇÃO: Cashout no Mines
-- ============================================================
CREATE OR REPLACE FUNCTION public.cashout_mines_game(
  p_game_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_game public.mines_games%ROWTYPE;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT * INTO v_game
  FROM public.mines_games
  WHERE id = p_game_id AND user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_game.status <> 'active' THEN
    RAISE EXCEPTION 'Jogo não está ativo';
  END IF;

  IF COALESCE(array_length(v_game.revealed_tiles, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Abra pelo menos uma casa antes de retirar';
  END IF;

  PERFORM public.increment_balance(v_user_id, v_game.potential_payout);

  UPDATE public.mines_games
  SET status = 'cashed_out',
      final_payout = v_game.potential_payout,
      finished_at = NOW()
  WHERE id = p_game_id;

  INSERT INTO public.transactions (id, user_id, type, amount)
  VALUES (gen_random_uuid()::TEXT, v_user_id, 'mines_cashout', v_game.potential_payout);

  RETURN jsonb_build_object(
    'result', 'cashout',
    'mine_positions', to_jsonb(v_game.mine_positions),
    'revealed_tiles', to_jsonb(v_game.revealed_tiles),
    'game', jsonb_build_object(
      'id', p_game_id,
      'status', 'cashed_out',
      'bet_amount', v_game.bet_amount,
      'mine_count', v_game.mine_count,
      'grid_size', v_game.grid_size,
      'current_multiplier', v_game.current_multiplier,
      'potential_payout', v_game.potential_payout,
      'final_payout', v_game.potential_payout
    )
  );
END;
$$;

-- ============================================================
-- FUNÇÃO: Histórico do Mines
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_mines_history(
  p_limit INT DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_result JSONB;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  SELECT jsonb_agg(sub.row_data) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', mg.id,
      'status', mg.status,
      'bet_amount', mg.bet_amount,
      'mine_count', mg.mine_count,
      'current_multiplier', mg.current_multiplier,
      'final_payout', mg.final_payout,
      'created_at', mg.created_at
    ) AS row_data
    FROM public.mines_games mg
    WHERE mg.user_id = v_user_id
    ORDER BY mg.created_at DESC
    LIMIT p_limit
  ) sub;

  RETURN COALESCE(v_result, '[]'::JSONB);
END;
$$;

-- ============================================================
-- FUNÇÃO: place_bet (Double) — versão final com suporte a 2 bets
-- ============================================================
CREATE OR REPLACE FUNCTION public.place_bet(
  p_round_id UUID,
  p_color TEXT,
  p_amount NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user_id TEXT;
  v_balance NUMERIC;
  v_round_status TEXT;
  v_betting_ends_at TIMESTAMPTZ;
  v_multiplier NUMERIC;
  v_existing_bet_id UUID;
  v_bet_count INTEGER;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid()::TEXT;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não autenticado');
  END IF;

  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Valor inválido');
  END IF;

  SELECT status, betting_ends_at INTO v_round_status, v_betting_ends_at
  FROM public.double_rounds
  WHERE id = p_round_id;

  IF v_round_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rodada não encontrada');
  END IF;

  IF v_round_status NOT IN ('betting_open', 'betting') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Apostas encerradas para esta rodada');
  END IF;

  IF v_betting_ends_at IS NOT NULL AND NOW() > v_betting_ends_at THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tempo de aposta esgotado');
  END IF;

  SELECT COUNT(*) INTO v_bet_count
  FROM public.double_bets
  WHERE round_id = p_round_id AND user_id = v_user_id AND status = 'pending' AND is_bot = false;

  IF v_bet_count >= 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Máximo de 2 apostas por rodada');
  END IF;

  SELECT balance INTO v_balance
  FROM public.users
  WHERE id = v_user_id::UUID
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  v_multiplier := CASE WHEN p_color = 'white' THEN 14 ELSE 2 END;

  SELECT id INTO v_existing_bet_id
  FROM public.double_bets
  WHERE round_id = p_round_id AND user_id = v_user_id AND color = p_color AND status = 'pending' AND is_bot = false;

  IF v_existing_bet_id IS NOT NULL THEN
    UPDATE public.double_bets
    SET amount = amount + p_amount
    WHERE id = v_existing_bet_id;
  ELSE
    INSERT INTO public.double_bets (round_id, user_id, color, amount, multiplier, status, payout, is_bot)
    VALUES (p_round_id, v_user_id, p_color, p_amount, v_multiplier, 'pending', 0, false);
  END IF;

  UPDATE public.users
  SET balance = COALESCE(balance, 0) - p_amount
  WHERE id = v_user_id::UUID
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (id, user_id, amount, type, status, pix_code)
  VALUES (gen_random_uuid()::TEXT, v_user_id::UUID, -p_amount, 'withdraw', 'completed', 'DOUBLE_BET_' || substring(p_round_id::text, 1, 8));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- ============================================================
-- HABILITAR REALTIME para tabelas necessárias
-- ============================================================

-- Double tables
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'double_rounds' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.double_rounds; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'double_history' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.double_history; END IF; END $$;
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'double_bets' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.double_bets; END IF; END $$;

-- pix_requests (para detectar pagamento em tempo real)
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'pix_requests' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_requests; END IF; END $$;

-- withdraw_requests
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'withdraw_requests' AND schemaname = 'public') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.withdraw_requests; END IF; END $$;

-- ============================================================
-- ADMIN: Definir admin01@gmail.com como superadmin (se existir)
-- ============================================================
UPDATE public.profiles
SET role = 'superadmin'
WHERE id IN (SELECT id FROM auth.users WHERE email = 'admin01@gmail.com');

UPDATE public.users
SET balance = 5000
WHERE email = 'admin01@gmail.com';

UPDATE public.profiles
SET real_balance = 5000
WHERE id IN (SELECT id FROM public.users WHERE email = 'admin01@gmail.com');

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
-- ORDER BY table_name;
