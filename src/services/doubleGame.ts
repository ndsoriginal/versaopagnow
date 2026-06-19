import { supabase } from "@/lib/supabase";

export type DoubleColor = "red" | "black" | "white";

export type DoubleRound = {
  id: string;
  round_number: number;
  status: "betting" | "spinning" | "finished";
  result_color: DoubleColor | null;
  result_number: number | null;
  betting_ends_at: string | null;
  spin_started_at: string | null;
  spinning_ends_at: string | null;
  spin_duration_ms: number | null;
  started_at: string;
  finished_at: string | null;
};

export type DoubleBet = {
  id: string;
  round_id: string;
  user_id: string;
  color: DoubleColor;
  amount: number;
  multiplier: number;
  status: "pending" | "won" | "lost";
  payout: number;
  is_bot: boolean;
  created_at: string;
  user_name?: string;
};

export type DoubleHistoryEntry = {
  id: string;
  round_id: string;
  color: DoubleColor;
  number: number | null;
  multiplier: number;
  created_at: string;
};

export async function manageDoubleRounds(): Promise<{
  success: boolean;
  round?: DoubleRound;
  action?: string;
  error?: string;
  time_remaining_ms?: number;
}> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      "https://rkkmtdpgrvtbotvypysq.supabase.co/functions/v1/manage-double-rounds",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      }
    );
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getLatestHistory(limit = 30): Promise<DoubleHistoryEntry[]> {
  try {
    const { data } = await supabase
      .from("double_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (data) return data;
  } catch {}
  return [];
}

export async function getDoubleBets(roundId: string): Promise<DoubleBet[]> {
  try {
    const { data } = await supabase
      .from("double_bets")
      .select("*")
      .eq("round_id", roundId)
      .order("amount", { ascending: false });
    if (data) return data;
  } catch {}
  return [];
}

export async function getCurrentRound(): Promise<DoubleRound | null> {
  try {
    const { data } = await supabase
      .from("double_rounds")
      .select("*")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function placeBet(
  roundId: string,
  color: DoubleColor,
  amount: number
): Promise<{ success: boolean; error?: string; new_balance?: number }> {
  try {
    const { data, error } = await supabase.rpc("place_bet", {
      p_round_id: roundId,
      p_color: color,
      p_amount: amount,
    });
    if (error) return { success: false, error: error.message };
    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export const MULTIPLIERS: Record<DoubleColor, number> = {
  red: 2,
  black: 2,
  white: 14,
};

export const COLOR_LABELS: Record<DoubleColor, string> = {
  red: "Vermelho",
  black: "Preto",
  white: "Branco",
};
