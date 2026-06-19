"use client";

import React from "react";
import { X, CheckCircle2, Landmark, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type WithdrawSuccessPopupProps = {
  open: boolean;
  onClose: () => void;
  amount: number;
  pixKey: string;
};

const WithdrawSuccessPopup: React.FC<WithdrawSuccessPopupProps> = ({ open, onClose, amount, pixKey }) => {
  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className={cn(
        "w-full rounded-3xl bg-gradient-to-b from-[#0d0f14] to-[#06070a] border border-[#ffcc00]/30 shadow-[0_0_50px_rgba(255,204,0,0.15)] overflow-hidden animate-in zoom-in-95 duration-300",
        isMobile ? "max-w-full h-full rounded-none flex flex-col" : "max-w-md"
      )}>
        
        <div className="bg-[#ffcc00] p-8 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-black/10 p-3 mb-4">
            <CheckCircle2 size={48} className="text-black" />
          </div>
          <h2 className="text-2xl font-black text-black uppercase tracking-tight">SAQUE SOLICITADO!</h2>
          <p className="text-black/80 font-bold text-sm mt-1">Em até 24h o valor será enviado.</p>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-y-auto">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-start gap-3">
            <Clock size={20} className="text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-white">Prazo de processamento</p>
              <p className="text-xs text-gray-400">Seu saque será processado em até 24 horas úteis. O valor será enviado para a chave PIX informada.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Landmark size={16} />
                <span className="text-xs font-bold uppercase">Valor do Saque</span>
              </div>
              <span className="text-lg font-black text-[#22c55e]">R$ {amount.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-[#13161d] rounded-2xl p-4 border border-white/5">
            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Chave PIX de Recebimento</p>
            <p className="text-sm font-mono text-white truncate">{pixKey}</p>
          </div>

          <button
            onClick={onClose}
            className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 py-4 text-sm font-black text-white uppercase transition-all active:scale-95"
          >
            FECHAR COMPROVANTE
          </button>
        </div>
      </div>
    </div>
  );
};

export default WithdrawSuccessPopup;
