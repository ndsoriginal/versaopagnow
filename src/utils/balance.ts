import { supabase } from "@/lib/supabase";

export const getLocalBalance = (userId: string): number => {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(`user_balance_${userId}`);
  return val ? Number(val) : 0;
};

export const setLocalBalance = (userId: string, amount: number) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`user_balance_${userId}`, amount.toString());
};

export const fetchUserBalance = async (userId: string): Promise<number> => {
  if (!userId) return 0;
  
  try {
    // Busca direta na tabela public.users via Supabase Client (mais rápido que Edge Function se RLS permitir)
    const { data, error } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      const dbBal = Number(data.balance || 0);
      setLocalBalance(userId, dbBal);
      return dbBal;
    }

    // Se falhou por permissão, tenta via Edge Function de fallback
    const response = await fetch("https://rkkmtdpgrvtbotvypysq.supabase.co/functions/v1/get-user-balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId })
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        const dbBal = Number(result.balance || 0);
        setLocalBalance(userId, dbBal);
        return dbBal;
      }
    }
  } catch (err) {
    console.warn("[Balance System] Erro ao sincronizar saldo:", err);
  }
  return getLocalBalance(userId);
};

export const updateUserBalance = async (userId: string, newBalance: number): Promise<boolean> => {
  setLocalBalance(userId, newBalance);
  try {
    const { error } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (!error) return true;

    // Fallback via Edge Function
    const response = await fetch("https://rkkmtdpgrvtbotvypysq.supabase.co/functions/v1/update-user-balance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId, balance: newBalance })
    });

    if (response.ok) {
      const result = await response.json();
      return result.success;
    }
  } catch (err) {
    console.error("[Balance System] Erro ao atualizar saldo:", err);
  }
  return false;
};