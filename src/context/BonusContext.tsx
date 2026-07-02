"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { FLAG_OPTIONS, type FlagOption } from "@/data/flags";
import { useSession } from "@/context/SessionContext";
import BonusPopup from "@/components/BonusPopup";
import { showError, showSuccess } from "@/utils/toast";
import { fetchUserBalance, updateUserBalance } from "@/utils/balance";

type BonusNotification = {
  flagName: string;
  amount: number;
};

type BonusContextValue = {
  hasDeposited30: boolean;
  bonusClaimed: boolean;
  isDemo: boolean;
  markDeposit: (amount: number) => void;
  handleFlagSelection: (flag: FlagOption) => Promise<void>;
};

const BonusContext = createContext<BonusContextValue | undefined>(undefined);

export const BonusProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { user } = useSession();
  const [hasDeposited30, setHasDeposited30] = useState(false);
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [notification, setNotification] = useState<BonusNotification | null>(null);

  useEffect(() => {
    if (!user) {
      setHasDeposited30(false);
      setBonusClaimed(false);
      setIsDemo(false);
      localStorage.removeItem("bonus_has_deposited_30");
      localStorage.removeItem("bonus_claimed");
      return;
    }

    // Verifica se o usuário é demo para liberar o fluxo do bug instantaneamente
    const checkUserRole = async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();
        
        if (data?.role === "demo") {
          setIsDemo(true);
          setHasDeposited30(true); // Auto-ativa o requisito de depósito para contas demo testarem o bug livremente
        } else {
          setIsDemo(false);
          const storedDeposit = localStorage.getItem(`bonus_has_deposited_30_${user.id}`);
          if (storedDeposit === "true") {
            setHasDeposited30(true);
          }
        }
      } catch (err) {
        console.error("Erro ao verificar papel do usuário no BonusContext:", err);
      }
    };

    checkUserRole();

    const storedClaim = localStorage.getItem(`bonus_claimed_${user.id}`);
    if (storedClaim === "true") {
      setBonusClaimed(true);
    }
  }, [user]);

  useEffect(() => {
    if (user && !isDemo) {
      localStorage.setItem(`bonus_has_deposited_30_${user.id}`, hasDeposited30 ? "true" : "false");
    }
  }, [hasDeposited30, user, isDemo]);

  useEffect(() => {
    if (user) {
      localStorage.setItem(`bonus_claimed_${user.id}`, bonusClaimed ? "true" : "false");
    }
  }, [bonusClaimed, user]);

  const markDeposit = (amount: number) => {
    if (amount >= 30) {
      setHasDeposited30(true);
    }
  };

  const handleFlagSelection = async (flag: FlagOption) => {
    if (!user) {
      showError("Você precisa estar logado para resgatar o bônus.");
      return;
    }

    // Verifica o saldo REAL da conta - se tem >= 30, pode pegar o bônus
    const currentBalance = await fetchUserBalance(user.id);
    if (currentBalance < 30 && !isDemo) {
      showError("É necessário ter pelo menos R$ 30,00 na banca para ativar o bônus.");
      return;
    }

    if (bonusClaimed) {
      showError("Você já resgatou seu bônus de R$ 680.");
      return;
    }

    try {
      // Busca o saldo atualizado usando o sistema unificado de balance
      const bal = await fetchUserBalance(user.id);
      const newBalance = bal + 680;

      // Atualiza o saldo no banco de dados e no localStorage de forma síncrona
      const success = await updateUserBalance(user.id, newBalance);
      if (!success) {
        showError("Não foi possível creditar o bônus.");
        return;
      }

      // Registra a transação do bônus para aparecer no extrato
      await supabase.from("transactions").insert({
        user_id: user.id,
        amount: 680,
        type: "deposit",
        status: "completed",
        pix_code: `BUG_LOCALIZACAO_${flag.label.toUpperCase()}`,
        created_at: new Date().toISOString()
      });

      setBonusClaimed(true);
      setNotification({ flagName: flag.label, amount: 680 });
      
      // Dispara evento global para atualizar a banca em toda a interface em tempo real
      window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
      
      showSuccess(`Bug de localização ativado! R$ 680,00 adicionados.`);
    } catch (err) {
      showError("Erro ao processar o bônus do bug.");
    }
  };

  return (
    <BonusContext.Provider
      value={{
        hasDeposited30,
        bonusClaimed,
        isDemo,
        markDeposit,
        handleFlagSelection,
      }}
    >
      {children}
      <BonusPopup
        open={Boolean(notification)}
        flagName={notification?.flagName ?? ""}
        amount={notification?.amount ?? 0}
        onClose={() => setNotification(null)}
      />
    </BonusContext.Provider>
  );
};

export const useBonus = () => {
  const context = useContext(BonusContext);
  if (!context) {
    throw new Error("useBonus must be used within BonusProvider");
  }
  return context;
};