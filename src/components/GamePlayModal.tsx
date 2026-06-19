"use client";

import React from "react";
import { X, Play, ShieldAlert } from "lucide-react";

type GamePlayModalProps = {
  open: boolean;
  onClose: () => void;
  gameTitle: string;
  demoUrl: string;
  onOpenDeposit: () => void;
};

const GamePlayModal: React.FC<GamePlayModalProps> = ({
  open,
  onClose,
  gameTitle,
  demoUrl,
  onOpenDeposit,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-black/95 md:p-4">
      {/* Header do Modal */}
      <div className="flex items-center justify-between bg-[#0d0f14] px-4 py-3 border-b border-[#1c212b] md:rounded-t-2xl">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            {gameTitle} — Modo Demo
          </h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-white/5 hover:text-white transition-all"
        >
          <X size={20} />
        </button>
      </div>

      {/* Banner de Incentivo a Saldo Real */}
      <div className="bg-gradient-to-r from-[#ffcc00]/20 via-[#ffcc00]/10 to-transparent px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-2 border-b border-[#ffcc00]/20">
        <div className="flex items-center gap-2 text-xs text-[#ffcc00] font-medium">
          <ShieldAlert size={16} />
          <span>Você está jogando com saldo fictício. Seus ganhos não serão reais!</span>
        </div>
        <button
          onClick={() => {
            onClose();
            onOpenDeposit();
          }}
          className="rounded bg-[#ffcc00] px-3 py-1 text-xs font-black text-black hover:bg-[#ffdb4d] transition-colors uppercase"
        >
          Jogar com Saldo Real
        </button>
      </div>

      {/* Container do Iframe */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden md:rounded-b-2xl">
        <iframe
          src={demoUrl}
          className="w-full h-full max-w-[480px] border-0 shadow-2xl"
          allow="autoplay; fullscreen; encrypted-media"
          title={gameTitle}
        />
      </div>
    </div>
  );
};

export default GamePlayModal;