-- ============================================================
-- MIGRAÇÃO 015: Mines Game (Orange Mines)
-- ============================================================

-- 1. TABELA mines_games
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

-- 2. TABELA mines_reveals
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

  -- Generate mine positions
  WHILE COALESCE(array_length(v_mines, 1), 0) < p_mine_count LOOP
    v_random_tile := FLOOR(RANDOM() * v_grid_size)::INT;
    IF NOT (v_random_tile = ANY(v_mines)) THEN
      v_mines := array_append(v_mines, v_random_tile);
    END IF;
  END LOOP;

  -- Deduct balance
  UPDATE public.users
  SET balance = balance - p_bet_amount
  WHERE id = v_user_id;

  -- Create game
  INSERT INTO public.mines_games (
    user_id, status, bet_amount, mine_count, grid_size,
    mine_positions, revealed_tiles, current_multiplier, potential_payout
  ) VALUES (
    v_user_id, 'active', p_bet_amount, p_mine_count, v_grid_size,
    v_mines, '{}', 1, 0
  )
  RETURNING id INTO v_game_id;

  -- Transaction
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
-- FUNÇÃO: Revelar tile
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

  -- Hit a mine
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

  -- Safe tile
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
-- FUNÇÃO: Cashout
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

  -- Credit balance
  PERFORM public.increment_balance(v_user_id, v_game.potential_payout);

  -- Finalize game
  UPDATE public.mines_games
  SET status = 'cashed_out',
      final_payout = v_game.potential_payout,
      finished_at = NOW()
  WHERE id = p_game_id;

  -- Transaction
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
-- FUNÇÃO: Listar histórico de jogos do usuário
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
