"use client";

import { supabase } from "@/lib/supabase";

export type AdminDashboardFilters = {
  startDate?: string;
  endDate?: string;
};

export async function fetchAdminDashboardData(filters?: AdminDashboardFilters) {
  const { data, error } = await supabase.functions.invoke("get-admin-dashboard-data", {
    body: filters || {}
  });

  if (error) throw new Error(error.message || "Falha ao carregar dados do dashboard");

  return data;
}