"use client";

import React from "react";
import { X, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type BonusPopupProps = {
  open: boolean;
  flagName: string;
  amount: number;
  onClose: () => void;
};

const BonusPopup: React.FC<BonusPopupProps> = ({ open, flagName, amount, onClose }) => {
  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
      {/* Backdrop escuro com desfoque de vidro */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Card de Bônus Premium */}
      <div className={cn(
        "relative w-full rounded-3xl bg-gradient-to-b from-[#11141b] to-[#07090e] border border-[#ffcc00]/30 shadow-[0_0_50px_rgba(255,204,0,0.15)] p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-300 my-auto",
        isMobile ? "max-w-full h-full rounded-none flex flex-col justify-between" : "max-w-sm"
      )}>
        
        {/* Detalhe de brilho de fundo */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ffcc00]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffcc00]/5 rounded-full blur-3xl pointer-events-none" />

        {/* Botão de fechar */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-all"
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center flex-1 justify-center py-4">
          {/* Ícone de Presente Animado */}
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#ffcc00]/20 rounded-full blur-xl animate-pulse" />
            <div className="relative bg-gradient-to-b from-[#ffcc00] to-[#e6b800] p-5 rounded-3xl shadow-[0_10px_25px_rgba(255,204,0,0.3)] text-black transform hover:scale-110 transition-transform duration-300">
              <Gift size={40} className="animate-bounce" />
            </div>
          </div>

          {/* Textos de Celebração */}
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#ffcc00] bg-[#ffcc00]/10 px-3 py-1 rounded-full border border-[#ffcc00]/20 mb-3">
            Bônus Desbloqueado!
          </span>
          
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            Campanha {flagName} Ativada
          </h2>

          {/* Valor do Bônus Gigante */}
          <div className="my-5 relative">
            <span className="text-xs font-black text-[#ffcc00] uppercase tracking-widest block mb-1">Você Recebeu</span>
            <div className="text-5xl font-black text-white tracking-tight drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
              R$ {amount.toFixed(2)}
            </div>
          </div>

          <p className="text-xs text-gray-400 max-w-[280px] leading-relaxed">
            Parabéns! O saldo extra foi creditado instantaneamente na sua banca e já está disponível para jogar.
          </p>
        </div>

        {/* Botão de Ação */}
        <div className="mt-4 space-y-3">
          <div className="bg-[#0d0f14] border border-white/5 rounded-2xl p-3 text-center">
            <span className="text-[10px] text-gray-500 uppercase font-bold block">Saldo Atualizado na Conta</span>
            <span className="text-xs font-bold text-emerald-400 mt-0.5 block">Pronto para uso imediato</span>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition-all active:scale-95 shadow-[0_4px_20px_rgba(255,204,0,0.2)]"
          >
            Começar a Jogar
          </button>
        </div>

      </div>
    </div>
  );
};

export default BonusPopup;