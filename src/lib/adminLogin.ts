"use client";

import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ["admin01@gmail.com", "jhonatas553@gmail.com"];

export async function adminLogin(email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();

  if (!ADMIN_EMAILS.includes(normalized)) {
    throw new Error("Acesso negado: Este e-mail não é um administrador autorizado.");
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (error || !data.user) {
      throw new Error(error?.message || "E-mail ou senha incorretos.");
    }

    const role = normalized === "admin01@gmail.com" ? "superadmin" : "admin";
    await supabase.from("profiles").upsert({
      id: data.user.id,
      first_name: normalized === "admin01@gmail.com" ? "Admin Master" : "Admin Jhonatas",
      role,
      updated_at: new Date().toISOString()
    });

    localStorage.setItem("is_admin", "true");
  } catch (err: any) {
    throw err;
  }
}
