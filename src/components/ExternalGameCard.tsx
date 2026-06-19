"use client";

import React from "react";
import { Play, ExternalLink } from "lucide-react";
import { ExternalGame } from "@/data/externalGames";

type Props = {
  game: ExternalGame;
  onPlay: (game: ExternalGame) => void;
};

const ExternalGameCard: React.FC<Props> = ({ game, onPlay }) => {
  const handleOpenNewTab = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(game.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div 
      onClick={() => onPlay(game)}
      className="group relative rounded-2xl bg-[#0d0f14] p-2 border border-[#1c212b] transition-all duration-300 hover:border-[#ffcc00]/50 hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(255,204,0,0.15)] cursor-pointer flex flex-col h-full"
    >
      {/* Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#1c212b]">
        <img 
          src={game.thumbnail} 
          alt={game.name} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
          onError={(e) => {
            e.currentTarget.src = "/placeholder.svg";
          }}
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100 flex items-center justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffcc00] text-black shadow-[0_0_20px_rgba(255,204,0,0.5)] transform scale-90 group-hover:scale-100 transition-transform duration-200">
            <Play size={24} fill="currentColor" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1 flex-1 flex flex-col justify-between">
        <div>
          <div className="truncate text-[13px] font-bold text-white group-hover:text-[#ffcc00] transition-colors">
            {game.name}
          </div>
          <span className="text-[10px] font-medium text-[#4b5563] uppercase tracking-tighter block mt-0.5">
            {game.provider}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            onClick={() => onPlay(game)}
            className="flex items-center justify-center gap-1 bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-2 px-2 rounded-xl text-[11px] uppercase tracking-wider transition-all active:scale-95"
          >
            <Play size={12} fill="black" />
            Jogar
          </button>
          <button
            onClick={handleOpenNewTab}
            className="flex items-center justify-center gap-1 bg-[#1c212b] hover:bg-[#262c3a] text-white font-bold py-2 px-2 rounded-xl text-[11px] uppercase tracking-wider transition-all border border-[#2d3644] active:scale-95"
          >
            <ExternalLink size={12} />
            Nova Aba
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExternalGameCard;