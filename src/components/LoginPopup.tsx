"use client";

import React, { useState } from "react";
import { X, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useModal } from "@/hooks/useModal";
import { showSuccess, showError } from "@/utils/toast";

type LoginPopupProps = {
  open: boolean;
  onClose: () => void;
  onOpenSignup: () => void;
};

const LoginPopup: React.FC<LoginPopupProps> = ({ open, onClose, onOpenSignup }) => {
  useModal(open);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      showSuccess("Login realizado com sucesso!");
      onClose();
      window.location.reload();
    } catch (err: any) {
      showError(err.message || "Erro ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-w-sm max-h-[90vh] max-h-[90dvh] rounded-2xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-[#1c212b]">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Entrar</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs text-[#9CA3AF]">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md bg-[#0b0d10] border border-[#1c212b] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <label className="text-xs text-[#9CA3AF]">Senha</label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md bg-[#0b0d10] border border-[#1c212b] px-3 py-3 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                  placeholder="Sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#ffcc00] px-4 py-3 text-sm font-bold text-black hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-[#6b7280]">
            Não tem uma conta?{" "}
            <button onClick={onOpenSignup} className="text-[#ffcc00] font-bold">
              Criar conta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPopup;
