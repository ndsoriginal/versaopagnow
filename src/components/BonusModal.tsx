"use client";

import React from "react";
import { X, Gift, CheckCircle2, HelpCircle, ArrowRight } from "lucide-react";
import { useBonus } from "@/context/BonusContext";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function BonusModal({ open, onClose }: Props) {
  const { bonusClaimed, hasDeposited30 } = useBonus();
  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={cn(
        "w-full rounded-3xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col",
        isMobile ? "max-w-full h-full rounded-none" : "max-w-lg overflow-hidden h-[550px]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
          <div className="flex items-center gap-3">
            <div className="bg-[#ffcc00] p-2 rounded-xl">
              <Gift size={20} className="text-black" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Meus Bônus</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Card de Bônus de País */}
          <div className="bg-[#06070a] border border-[#1c212b] rounded-2xl p-5 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-[#ffcc00]/10 text-[#ffcc00] text-[9px] font-black uppercase px-3 py-1 rounded-bl-xl border-l border-b border-[#ffcc00]/20">
              Campanha Ativa
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#ffcc00]/10 p-3 rounded-xl text-[#ffcc00]">
                <Gift size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Bônus de Ativação de País</h3>
                <p className="text-xs text-gray-400">Multiplicador de saldo via bug de localização</p>
              </div>
            </div>

            <div className="border-t border-[#1c212b] pt-4 flex justify-between items-center">
              <div>
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Valor do Bônus</span>
                <span className="text-xl font-black text-[#ffcc00]">R$ 680,00</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Status</span>
                <span className={cn(
                  "inline-block text-[10px] font-black uppercase px-2.5 py-1 rounded-full mt-1 border",
                  bonusClaimed 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                    : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                )}>
                  {bonusClaimed ? "Reivindicado" : "Aguardando Ativação"}
                </span>
              </div>
            </div>

            {/* Rollover Progress */}
            {bonusClaimed && (
              <div className="space-y-2 border-t border-[#1c212b] pt-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400 font-medium">Progresso do Rollover (10x)</span>
                  <span className="text-white font-bold">R$ 1.350,00 / R$ 3.000,00</span>
                </div>
                <div className="w-full bg-[#13161d] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#ffcc00] h-full rounded-full" style={{ width: "45%" }} />
                </div>
                <p className="text-[10px] text-gray-500">Complete o rollover jogando em qualquer slot para liberar o saldo para saque.</p>
              </div>
            )}
          </div>

          {/* Regras de Liberação */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle size={14} />
              Como funciona a liberação?
            </h4>

            <div className="space-y-2">
              <div className="bg-[#06070a] border border-[#1c212b] rounded-xl p-3.5 flex gap-3 items-start">
                <div className="bg-emerald-500/10 text-emerald-500 p-1 rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  <strong className="text-white">Passo 1:</strong> Realize um depósito inicial de R$ 30,00 ou mais para ativar a conta.
                </p>
              </div>

              <div className="bg-[#06070a] border border-[#1c212b] rounded-xl p-3.5 flex gap-3 items-start">
                <div className="bg-emerald-500/10 text-emerald-500 p-1 rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  <strong className="text-white">Passo 2:</strong> Altere a bandeira do país no menu para creditar o bônus de R$ 680,00 instantaneamente.
                </p>
              </div>

              <div className="bg-[#06070a] border border-[#1c212b] rounded-xl p-3.5 flex gap-3 items-start">
                <div className="bg-emerald-500/10 text-emerald-500 p-1 rounded-lg shrink-0 mt-0.5">
                  <CheckCircle2 size={14} />
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  <strong className="text-white">Passo 3:</strong> Realize o depósito de liberação de R$ 20,00 para desbloquear o saque total via PIX.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}