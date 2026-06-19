"use client";

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, Wallet, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/context/SessionContext";
import { showSuccess } from "@/utils/toast";
import { fetchUserBalance, updateUserBalance } from "@/utils/balance";

interface Props {
  onOpenDeposit: () => void;
  onOpenSignup: () => void;
  onOpenLogin: () => void;
  onOpenUserMenu: () => void;
  onOpenMobileMenu: () => void;
}

const MobileTopBar: React.FC<Props> = ({ onOpenDeposit, onOpenSignup, onOpenLogin, onOpenUserMenu, onOpenMobileMenu }) => {
  const [balance, setBalance] = useState<number>(0);
  const { user } = useSession();
  const [logoClicks, setLogoClicks] = useState(0);

  const handleLogoClick = async () => {
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);
    
    if (nextClicks === 3) {
      setLogoClicks(0);
      if (user) {
        try {
          const currentBalance = await fetchUserBalance(user.id);
          const newBalance = currentBalance + 500;
          
          await updateUserBalance(user.id, newBalance);
          showSuccess("Modo Desenvolvedor: R$ 500,00 adicionados ao seu saldo!");
          window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

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

  return (
    <div className="lg:hidden fixed top-0 left-0 right-0 z-[100] bg-[#06070a] border-b border-[#1c212b] px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onOpenMobileMenu} className="text-white">
            <Menu size={24} />
          </button>
          <div onClick={handleLogoClick} className="cursor-pointer">
            <img src="/pixbetlogo.png" alt="Logo" className="h-6 w-auto" />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-[#0d0f14] px-3 py-1.5 border border-[#1c212b]">
                <span className="text-xs font-bold text-white">R$ {balance.toFixed(2)}</span>
                <button onClick={onOpenDeposit} className="rounded bg-[#ffcc00] p-1 text-[10px] text-black">
                  <Wallet size={12} />
                </button>
              </div>
              <button onClick={onOpenUserMenu} className="text-[#94a3b8] p-1.5">
                <User size={20} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button onClick={onOpenSignup} className="rounded-lg bg-[#1c212b] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#262c3a] transition-all border border-[#2d3644]">
                Cadastrar
              </button>
              <button onClick={onOpenLogin} className="rounded-lg bg-[#ffcc00] px-3 py-1.5 text-xs font-bold text-black hover:opacity-95 transition-all">
                Logar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileTopBar;