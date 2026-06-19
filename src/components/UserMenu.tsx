"use client";

import React from "react";
import { X, User, Globe, Wallet, History, Gift, LifeBuoy, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import FlagSwitcher from "./FlagSwitcher";

type UserMenuProps = {
  open: boolean;
  onClose: () => void;
  onOpenProfile: () => void;
  onOpenWithdraw: () => void;
  onOpenDeposit: () => void;
  onOpenHistory: () => void;
  onOpenBonus: () => void;
  onOpenSupport: () => void;
};

const UserMenu: React.FC<UserMenuProps> = ({ 
  open, 
  onClose, 
  onOpenProfile, 
  onOpenWithdraw, 
  onOpenDeposit,
  onOpenHistory,
  onOpenBonus,
  onOpenSupport
}) => {
  const { user } = useSession();
  const isMobile = useIsMobile();
  const [showFlagSwitcher, setShowFlagSwitcher] = React.useState(false);

  if (!open) return null;

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

  const handleOpenFlagSwitcher = () => {
    setShowFlagSwitcher(true);
  };

  const handleCloseFlagSwitcher = () => {
    setShowFlagSwitcher(false);
    onClose(); // Close main menu after flag selection
  };

  const menuItems = [
    { label: "Perfil", icon: User, action: () => { onClose(); onOpenProfile(); } },
    { label: "Idioma", icon: Globe, action: handleOpenFlagSwitcher },
    { label: "Saque", icon: Wallet, action: () => { onClose(); onOpenWithdraw(); } },
    { label: "Histórico", icon: History, action: () => { onClose(); onOpenHistory(); } },
    { label: "Bônus", icon: Gift, action: () => { onClose(); onOpenBonus(); } },
    { label: "Suporte", icon: LifeBuoy, action: () => { onClose(); onOpenSupport(); } },
  ];

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-transform duration-300",
          isMobile ? "top-0 left-0 w-full h-full" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
          open ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      >
        <div
          className={cn(
            "w-full rounded-3xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
            isMobile ? "max-w-full h-full rounded-none" : "max-w-md"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
            <div className="flex items-center gap-3">
              <div className="bg-[#ffcc00] p-2 rounded-xl">
                <User size={20} className="text-black" />
              </div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">Menu do Usuário</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={item.action}
                  className="w-full flex items-center gap-4 bg-[#06070a] hover:bg-[#13161d] border border-[#1c212b] rounded-xl p-4 text-white text-sm font-medium transition-colors"
                >
                  <Icon size={20} className="text-[#ffcc00]" />
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm font-medium transition-colors mt-6"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {showFlagSwitcher && (
        <div
          className={cn(
            "fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 transition-transform duration-300",
            isMobile ? "top-0 left-0 w-full h-full" : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
            showFlagSwitcher ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
          )}
          onClick={handleCloseFlagSwitcher}
        >
          <div
            className={cn(
              "w-full rounded-3xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
              isMobile ? "max-w-full h-full rounded-none" : "max-w-xl"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
              <div className="flex items-center gap-3">
                <div className="bg-[#ffcc00] p-2 rounded-xl">
                  <Globe size={20} className="text-black" />
                </div>
                <h2 className="text-lg font-bold text-white uppercase tracking-tight">Selecionar Idioma</h2>
              </div>
              <button onClick={handleCloseFlagSwitcher} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <FlagSwitcher onFlagSelected={handleCloseFlagSwitcher} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserMenu;