"use client";

import React from "react";
import { X, ExternalLink, ShieldAlert } from "lucide-react";
import { ExternalGame } from "@/data/externalGames";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  game: ExternalGame | null;
  onClose: () => void;
};

const ExternalGameModal: React.FC<Props> = ({ game, onClose }) => {
  const isMobile = useIsMobile();

  if (!game) return null;

  const handleOpenNewTab = () => {
    window.open(game.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col bg-black/95 md:p-4 items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div 
        className={cn(
          "relative bg-[#0d0f14] border border-[#1c212b] shadow-2xl flex flex-col overflow-hidden z-10",
          isMobile 
            ? "w-full h-full rounded-none" 
            : "w-[95%] h-[90vh] rounded-3xl max-w-7xl"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {game.name}
            </h3>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNewTab}
              className="flex items-center gap-1.5 bg-[#1c212b] hover:bg-[#262c3a] text-white px-3 py-1.5 rounded-xl border border-[#2d3644] text-xs font-bold transition-all active:scale-95"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Abrir em Nova Aba</span>
            </button>
            
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-all"
              aria-label="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-gradient-to-r from-[#ffcc00]/20 via-[#ffcc00]/10 to-transparent px-6 py-2.5 flex items-center justify-between gap-2 border-b border-[#ffcc00]/10">
          <div className="flex items-center gap-2 text-xs text-[#ffcc00] font-medium">
            <ShieldAlert size={16} />
            <span>Se o jogo não carregar corretamente, clique no botão ao lado para abrir em uma nova aba.</span>
          </div>
          <button
            onClick={handleOpenNewTab}
            className="rounded bg-[#ffcc00] px-3 py-1 text-[10px] font-black text-black hover:bg-[#ffdb4d] transition-colors uppercase"
          >
            Abrir Direto
          </button>
        </div>

        {/* Iframe Container */}
        <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
          <iframe
            src={game.url}
            className="w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media"
            title={game.name}
          />
        </div>
      </div>
    </div>
  );
};

export default ExternalGameModal;