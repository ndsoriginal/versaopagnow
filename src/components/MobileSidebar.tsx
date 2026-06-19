"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { X, LayoutGrid, Star, PlayCircle, LifeBuoy, Trophy, Flame, Gift, User, LogOut, Plane, Gamepad } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";

interface Props {
  open: boolean;
  onClose: () => void;
  onOpenRoulette: () => void;
  onOpenProfile: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
}

const NAV_ITEMS = [
  { label: "Início", icon: LayoutGrid, href: "/" },
  { label: "Jogos", icon: Gamepad, href: "/games" },
  { label: "Aviator", icon: Plane, href: "/aviator" },
  { label: "Populares", icon: Flame, href: "/populares" },
  { label: "Cassino", icon: Star, href: "#" },
  { label: "Ao Vivo", icon: PlayCircle, href: "#" },
  { label: "Torneios", icon: Trophy, href: "#" },
  { label: "Roleta", icon: Gift, action: "openRoulette" },
  { label: "Suporte", icon: LifeBuoy, href: "/support" },
];

const MobileSidebar: React.FC<Props> = ({ open, onClose, onOpenRoulette, onOpenProfile, onOpenDeposit, onOpenWithdraw }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();

  const handleItemClick = (item: typeof NAV_ITEMS[0]) => {
    if (item.action === "openRoulette") {
      onOpenRoulette();
    } else if (item.href) {
      onClose();
    }
    if (item.href === '#') {
      onClose();
    }
  };

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
    
    onClose();
    window.location.href = "/";
  };

  return (
    <div
      className={cn(
        "fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm transition-opacity duration-300",
        open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      )}
      onClick={onClose}
    >
      <aside
        className={cn(
          "fixed left-0 top-0 h-screen w-[280px] flex-col bg-[#06070a] border-r border-[#1c212b] py-8 shadow-2xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-10 flex items-center justify-between px-4">
          <Link to="/" onClick={onClose}>
            <img src="/pixbetlogo.png" alt="PixBett Logo" className="h-10 w-auto object-contain" />
          </Link>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4">
          <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#4b5563]">
            Menu Principal
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Link
                key={item.label}
                to={item.href || "#"}
                onClick={() => handleItemClick(item)}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive 
                    ? "bg-gradient-to-r from-[#ffcc00]/10 to-transparent text-[#ffcc00] border-l-2 border-[#ffcc00]" 
                    : "text-[#94a3b8] hover:bg-[#0d0f14] hover:text-white"
                )}
              >
                <Icon size={18} className={cn(isActive ? "text-[#ffcc00]" : "text-[#4b5563] group-hover:text-white")} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {user && (
          <div className="mt-auto px-4 pt-4 border-t border-[#1c212b] space-y-2">
            <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#4b5563]">
              Minha Conta
            </div>
            <button
              onClick={() => { onClose(); onOpenProfile(); }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#94a3b8] hover:bg-[#0d0f14] hover:text-white transition-colors"
            >
              <User size={18} className="text-[#4b5563] group-hover:text-white" />
              <span>Meu Perfil</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenDeposit(); }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#94a3b8] hover:bg-[#0d0f14] hover:text-white transition-colors"
            >
              <Gift size={18} className="text-[#4b5563] group-hover:text-white" />
              <span>Depositar</span>
            </button>
            <button
              onClick={() => { onClose(); onOpenWithdraw(); }}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#94a3b8] hover:bg-[#0d0f14] hover:text-white transition-colors"
            >
              <LogOut size={18} className="text-[#4b5563] group-hover:text-white" />
              <span>Sacar</span>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-900/20 transition-colors mt-4"
            >
              <LogOut size={18} className="text-red-400" />
              <span>Sair</span>
            </button>
          </div>
        )}
      </aside>
    </div>
  );
};

export default MobileSidebar;