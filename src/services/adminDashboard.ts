"use client";

import { supabase } from "@/lib/supabase";

export type AdminDashboardFilters = {
  startDate?: string;
  endDate?: string;
};

export async function fetchAdminDashboardData(filters?: AdminDashboardFilters) {
  // Busca a sessão atual para obter o token JWT
  const { data: { session } } = await supabase.auth.getSession();
  
  const response = await fetch("https://rkkmtdpgrvtbotvypysq.supabase.co/functions/v1/get-admin-dashboard-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(filters || {})
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Tenta parsear como JSON para pegar a mensagem de erro da Edge Function
    try {
      const errJson = JSON.parse(errorText);
      throw new Error(errJson.error || "Falha ao carregar dados do dashboard");
    } catch {
      throw new Error(errorText || "Erro de conexão com o servidor");
    }
  }

  return await response.json();
}