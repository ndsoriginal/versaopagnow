-- ============================================================
-- MIGRAÇÃO 014: place_bet — permite até 2 apostas em cores diferentes
-- Remove restrição de cor única, adiciona limite de 2 bets
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

  -- Limite de 2 apostas por rodada por usuário
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

  -- Se já existe aposta na mesma cor, incrementa
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
