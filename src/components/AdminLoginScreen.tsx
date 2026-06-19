"use client";

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, Eye, EyeOff } from "lucide-react";
import { showError } from "@/utils/toast";
import { adminLogin } from "@/lib/adminLogin";

const AdminLoginScreen: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await adminLogin(email, password);
      navigate("/admin", { replace: true });
    } catch (err: any) {
      showError(err.message || "Credenciais inválidas");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="bg-[#ffcc00]/10 p-3 rounded-2xl w-fit mx-auto mb-4 border border-[#ffcc00]/20">
            <LogIn size={32} className="text-[#ffcc00]" />
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">
            Área Restrita
          </h2>
          <p className="text-xs text-gray-400 mt-2">
            Apenas para o administrador master.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              E‑mail Administrativo
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Digite seu e-mail"
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Senha
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Acessar Painel"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLoginScreen;