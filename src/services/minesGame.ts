import { supabase } from "@/lib/supabase";

export type MinesGame = {
  id: string;
  status: "active" | "cashed_out" | "busted";
  bet_amount: number;
  mine_count: number;
  grid_size: number;
  current_multiplier: number;
  potential_payout: number;
  final_payout?: number;
};

export type SafeResult = {
  result: "safe";
  tile_index: number;
  revealed_tiles: number[];
  game: MinesGame;
};

export type MineResult = {
  result: "mine";
  tile_index: number;
  mine_positions: number[];
  revealed_tiles: number[];
  game: MinesGame & { status: "busted"; final_payout: 0 };
};

export type RevealResult = SafeResult | MineResult;

export type CashoutResult = {
  result: "cashout";
  mine_positions: number[];
  revealed_tiles: number[];
  game: MinesGame & { status: "cashed_out"; final_payout: number };
};

export async function startMinesGame(
  betAmount: number,
  mineCount: number
): Promise<{ success: boolean; game?: MinesGame; error?: string }> {
  const { data, error } = await supabase.rpc("start_mines_game", {
    p_bet_amount: betAmount,
    p_mine_count: mineCount,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, game: data };
}

export async function revealMinesTile(
  gameId: string,
  tileIndex: number
): Promise<{ success: boolean; result?: RevealResult; error?: string }> {
  const { data, error } = await supabase.rpc("reveal_mines_tile", {
    p_game_id: gameId,
    p_tile_index: tileIndex,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, result: data };
}

export async function cashoutMinesGame(
  gameId: string
): Promise<{ success: boolean; result?: CashoutResult; error?: string }> {
  const { data, error } = await supabase.rpc("cashout_mines_game", {
    p_game_id: gameId,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, result: data };
}

export async function getMinesHistory(limit = 10): Promise<{
  success: boolean;
  games?: MinesGame[];
  error?: string;
}> {
  const { data, error } = await supabase.rpc("get_mines_history", {
    p_limit: limit,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, games: data };
}

export function calculateMultiplier(
  gridSize: number,
  mineCount: number,
  safeReveals: number,
  houseEdge = 0.03
): number {
  if (safeReveals <= 0) return 1;
  const safeTiles = gridSize - mineCount;
  let prob = 1;
  for (let i = 0; i < safeReveals; i++) {
    prob *= (safeTiles - i) / (gridSize - i);
  }
  return Math.round((1 / prob) * (1 - houseEdge) * 100) / 100;
}
