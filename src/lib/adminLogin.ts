"use client";

import { supabase } from '@/lib/supabase';

export async function adminLogin(email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.user) {
    throw new Error(error?.message || "E-mail ou senha incorretos.");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || !["admin", "superadmin"].includes(profile.role)) {
    await supabase.auth.signOut();
    throw new Error("Acesso negado: Este usuário não é um administrador autorizado.");
  }
}
