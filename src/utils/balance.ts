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

    const { data: balanceData, error: balanceError } = await supabase.functions.invoke("get-user-balance", {
      body: { userId }
    });

    if (!balanceError && balanceData?.success) {
      const dbBal = Number(balanceData.balance || 0);
      setLocalBalance(userId, dbBal);
      return dbBal;
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

    const { data: updateData, error: updateError } = await supabase.functions.invoke("update-user-balance", {
      body: { userId, balance: newBalance }
    });

    if (!updateError && updateData?.success) return true;
  } catch (err) {
    console.error("[Balance System] Erro ao atualizar saldo:", err);
  }
  return false;
};