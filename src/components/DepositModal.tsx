"use client";

import React from "react";
import { X } from "lucide-react";
import DepositForm from "./DepositForm";
import { useSession } from "@/context/SessionContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useModal } from "@/hooks/useModal";

type DepositModalProps = {
  open: boolean;
  onClose: () => void;
  initialAmount?: number;
};

const DepositModal: React.FC<DepositModalProps> = ({ open, onClose, initialAmount }) => {
  useModal(open);
  const { user } = useSession();
  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        "relative w-full max-h-[90vh] max-h-[90dvh] rounded-2xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
        isMobile ? "max-w-full h-full rounded-none" : "max-w-2xl"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-[#1c212b]">
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">Efetuar Depósito</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={24} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto">
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