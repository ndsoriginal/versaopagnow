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

  if (error) {
    const detail = error.context?.data ? JSON.stringify(error.context.data) : null;
    throw new Error(detail || error.message || "Falha ao carregar dados do dashboard");
  }

  return data;
}