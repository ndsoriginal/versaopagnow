"use client";

import React, { useState } from "react";
import { Play, ChevronDown, ChevronUp, Flame, Sparkles } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { EXTERNAL_GAMES, type ExternalGame } from "@/data/externalGames";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type GameGridProps = {
  title?: string;
  games?: ExternalGame[];
  limit?: number;
  onOpenSignup?: () => void;
  onPlayGame?: (game: ExternalGame) => void;
};

const GameGrid: React.FC<GameGridProps> = ({
  title,
  games = EXTERNAL_GAMES,
  limit,
  onOpenSignup,
  onPlayGame,
}) => {
  const { user } = useSession();
  const [isExpanded, setIsExpanded] = useState(false);
  const isMobile = useIsMobile();

  const handleGameClick = (g: ExternalGame) => {
    if (!user) {
      onOpenSignup?.();
    } else {
      onPlayGame?.(g);
    }
  };

  const initialLimit = limit || 6;
  const visibleGames = isExpanded || limit ? games : games.slice(0, initialLimit);

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      {title && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white flex items-center gap-2">
            {title}
          </h3>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 transition-all duration-500 ease-in-out">
        {visibleGames.map((g) => (
          <div
            key={g.id}
            onClick={() => handleGameClick(g)}
            className="group rounded-xl bg-[#171A21] overflow-hidden transition-transform duration-200 hover:scale-105 hover:shadow-lg cursor-pointer relative border border-[#1c212b] hover:border-[#ffcc00]/30 animate-in fade-in duration-300"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#0d0f14]">
              <img 
                src={g.thumbnail} 
                alt={g.name} 
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" 
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg";
                }}
              />
              
              {/* Overlay de Play */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                <div className="rounded-full bg-[#ffcc00] p-3 text-black shadow-lg transform scale-90 group-hover:scale-100 transition-transform duration-200">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>
            </div>
            
            <div className="p-3">
              <div className="text-sm font-semibold text-white truncate group-hover:text-[#ffcc00] transition-colors">{g.name}</div>
              <div className="mt-1 flex items-center justify-between text-xs text-[#9CA3AF]">
                <div>{g.provider}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Botão de Expansão */}
      {!limit && games.length > initialLimit && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 rounded-full bg-[#171A21] hover:bg-[#1c21b] border border-[#2d3644] px-8 py-3 text-sm font-bold text-white transition-all hover:border-[#ffcc00]/50 active:scale-95 shadow-lg"
          >
            {isExpanded ? (
              <>
                <span>Mostrar Menos</span>
                <ChevronUp size={16} className="text-[#ffcc00]" />
              </>
            ) : (
              <>
                <span>Mais Jogos</span>
                <ChevronDown size={16} className="text-[#ffcc00]" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default GameGrid;