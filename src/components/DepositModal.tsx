"use client";

import React from "react";
import { X } from "lucide-react";
import DepositForm from "./DepositForm";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  initialAmount?: number;
};

const DepositModal: React.FC<DepositModalProps> = ({ open, onClose, initialAmount }) => {
  const { user } = useSession();
  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={cn(
        "w-full rounded-2xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl overflow-hidden",
        isMobile ? "max-w-full h-full rounded-none flex flex-col" : "max-w-2xl"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-[#1c212b]">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Efetuar Depósito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto"> {/* Adicionado flex-1 overflow-y-auto */}
          {user ? (
            <DepositForm userId={user.id} userEmail={user.email} initialAmount={initialAmount} />
          ) : (
            <div className="text-white text-center">Faça login para depositar.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DepositModal;