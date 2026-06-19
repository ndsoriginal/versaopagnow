"use client";

import React, { useEffect, useState } from "react";
import { User, Wallet, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { fetchUserBalance } from "@/utils/balance";

interface Props {
  onToggleChat?: () => void;
  onOpenDeposit: () => void;
  onOpenSignup: () => void;
  onOpenLogin: () => void;
  onOpenUserMenu: () => void;
}

const HeaderBar: React.FC<Props> = ({ onToggleChat, onOpenDeposit, onOpenSignup, onOpenLogin, onOpenUserMenu }) => {
  const [count, setCount] = useState<number>(0);
  const [balance, setBalance] = useState<number>(0);
  const { user } = useSession();
  const viewerId = user?.id || (typeof window !== "undefined" ? (localStorage.getItem("chat_viewer_id") ?? "") : "");

  const fetchBalance = async () => {
    if (user) {
      const bal = await fetchUserBalance(user.id);
      setBalance(bal);
    } else {
      setBalance(0);
    }
  };

  useEffect(() => {
    fetchBalance();
    const handleUpdate = () => fetchBalance();
    window.addEventListener("chat:simulate", handleUpdate);
    return () => window.removeEventListener("chat:simulate", handleUpdate);
  }, [user]);

  useEffect(() => {
    const key = `chat_count_${viewerId}`;
    const stored = viewerId ? localStorage.getItem(key) : null;
    
    if (stored) {
      setCount(Number(stored));
    } else {
      const randomStart = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
      setCount(randomStart);
      if (viewerId) {
        localStorage.setItem(key, randomStart.toString());
      } else {
        localStorage.setItem("chat_count_guest", randomStart.toString());
      }
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const newCount = Number(ce?.detail?.count ?? (viewerId ? localStorage.getItem(`chat_count_${viewerId}`) : localStorage.getItem("chat_count_guest")) ?? 0);
      setCount(Math.min(Math.max(newCount, 15), 359));
    };

    window.addEventListener("chat:count", handler as EventListener);
    return () => window.removeEventListener("chat:count", handler as EventListener);
  }, [viewerId]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn("Erro ao deslogar via Supabase, limpando localmente:", err);
    }
    
    // Limpa à força todas as flags e tokens locais
    localStorage.removeItem("is_admin");
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("sb-") || key.includes("auth-token"))) {
        localStorage.removeItem(key);
      }
    }
    
    window.location.href = "/";
  };

  return (
    <header className="hidden lg:flex sticky top-0 z-[40] ml-[240px] h-20 items-center justify-between bg-[#06070a]/80 backdrop-blur-md border-b border-[#1c212b] px-8">
      <div className="flex items-center gap-6">
        {user && (
          <div className="flex items-center gap-2 rounded-full bg-[#0d0f14] px-4 py-2 border border-[#1c212b]">
            <Wallet size={16} className="text-[#ffcc00]" />
            <span className="text-sm font-bold text-white">R$ {balance.toFixed(2)}</span>
            <button onClick={onOpenDeposit} className="ml-2 rounded-lg bg-[#ffcc00] px-3 py-1 text-[11px] font-black text-black hover:bg-[#ffdb4d] transition-colors">
              DEPOSITAR
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={onToggleChat}
          className="relative flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-[#ffcc00] transition-colors mr-2"
        >
          <MessageSquare size={18} />
          Chat
          {count > 0 && (
            <span className="absolute -top-2 -right-6 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white">
              {count > 359 ? "359+" : count}
            </span>
          )}
        </button>

        {user ? (
          <>
            <button onClick={onOpenUserMenu} className="flex items-center gap-2 text-sm font-semibold text-[#94a3b8] hover:text-white transition-colors">
              <User size={18} />
              Minha Conta
            </button>
            <button onClick={handleLogout} className="rounded-xl bg-[#1c212b] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#262c3a] transition-all border border-[#2d3644]">
              Sair
            </button>
          </>
        ) : (
          <div className="flex items-center gap-3">
            <button onClick={onOpenSignup} className="rounded-xl bg-[#1c212b] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#262c3a] transition-all border border-[#2d3644]">
              Cadastrar
            </button>
            <button onClick={onOpenLogin} className="rounded-xl bg-[#ffcc00] px-6 py-2.5 text-sm font-bold text-black hover:opacity-95 transition-all">
              Logar
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default HeaderBar;