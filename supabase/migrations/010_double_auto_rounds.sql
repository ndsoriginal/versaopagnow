-- ============================================================
-- MIGRAÇÃO 010: Double — rodadas automáticas, place_bet RPC, bots
-- ============================================================

-- 1. Adicionar colunas de timing na double_rounds
ALTER TABLE public.double_rounds ADD COLUMN IF NOT EXISTS betting_ends_at TIMESTAMPTZ;
ALTER TABLE public.double_rounds ADD COLUMN IF NOT EXISTS spin_started_at TIMESTAMPTZ;
ALTER TABLE public.double_rounds ADD COLUMN IF NOT EXISTS spinning_ends_at TIMESTAMPTZ;
ALTER TABLE public.double_rounds ADD COLUMN IF NOT EXISTS spin_duration_ms INTEGER DEFAULT 6000;

-- 2. Adicionar is_bot e payout na double_bets
ALTER TABLE public.double_bets ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT FALSE;
ALTER TABLE public.double_bets ADD COLUMN IF NOT EXISTS payout NUMERIC DEFAULT 0;

-- 3. Ajustar check constraint de status para incluir os novos nomes
ALTER TABLE public.double_rounds DROP CONSTRAINT IF EXISTS double_rounds_status_check;
ALTER TABLE public.double_rounds ADD CONSTRAINT double_rounds_status_check
  CHECK (status IN ('betting_open', 'betting', 'rolling', 'spinning', 'finished'));

-- 4. Função place_bet — atômica, segura, com validação
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
  v_user_id UUID;
  v_balance NUMERIC;
  v_round_status TEXT;
  v_betting_ends_at TIMESTAMPTZ;
  v_multiplier NUMERIC;
  v_existing_bet_id UUID;
  v_new_balance NUMERIC;
BEGIN
  v_user_id := auth.uid();

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

  SELECT balance INTO v_balance
  FROM public.users
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  v_multiplier := CASE WHEN p_color = 'white' THEN 14 ELSE 2 END;

  -- Verificar se usuário já apostou nesta rodada nesta cor — se sim, incrementa
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
  WHERE id = v_user_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (user_id, amount, type, status, pix_code)
  VALUES (v_user_id, -p_amount, 'withdraw', 'completed', 'DOUBLE_BET_' || substring(p_round_id::text, 1, 8));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance);
END;
$$;

-- 5. Realtime já deve estar habilitado para double_rounds, double_bets, double_history
-- Mas garantimos que withdraw_requests também está (já feito na migration 009)
