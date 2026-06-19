"use client";

import React from "react";
import { Play } from "lucide-react";

type Props = {
  title: string;
  provider?: string;
  players?: number;
  image?: string;
};

const GameCard: React.FC<Props> = ({ title, provider = "PGSOFT", players = 0, image }) => {
  return (
    <div className="group relative rounded-2xl bg-[#0d0f14] p-2 border border-[#1c212b] transition-all duration-300 hover:border-[#ffcc00]/30 hover:-translate-y-1 hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
      {/* Image Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#1c212b]">
        <img 
          src={image || "/placeholder.svg"} 
          alt={title} 
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
        />
        
        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffcc00] text-black shadow-[0_0_20px_rgba(255,204,0,0.5)]">
            <Play size={24} fill="black" />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 px-1">
        <div className="truncate text-[13px] font-bold text-white group-hover:text-[#ffcc00] transition-colors">{title}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] font-medium text-[#4b5563] uppercase tracking-tighter">{provider}</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            <span className="text-[10px] font-bold text-[#94a3b8]">{players.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameCard;