"use client";

import React from "react";
import { Play, X } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import DepositModal from "./DepositModal";

type GameLauncherProps = {
  game: {
    id: string;
    title: string;
    demoUrl: string;
    players: number;
    status: 'green' | 'yellow';
    provider?: string;
  };
  onOpenDeposit: () => void;
};

const GameLauncher: React.FC<GameLauncherProps> = ({ game, onOpenDeposit }) => {
  const { user } = useSession();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const handlePlayClick = () => {
    if (!user) {
      onOpenDeposit(); // Redireciona para login/depósito se não estiver logado
      return;
    }
    setIsModalOpen(true);
  };

  return (
    <>
      <button
        onClick={handlePlayClick}
        className="group relative rounded-xl overflow-hidden bg-[#0d0f14] border border-[#1c212b] transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-[#ffcc00]/50"
      >
        <div className="aspect-[4/5] w-full relative">
          <img
            src={`/Jogos/${game.title}.jpg`}
            alt={game.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
          <div className="text-sm font-semibold text-white truncate group-hover:text-[#ffcc00] transition-colors">{game.title}</div>
          <div className="mt-1 flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>{game.provider || "PGSOFT"}</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${game.status === 'green' ? 'bg-[#22c55e]' : 'bg-[#F59E0B]'}`} />
              <span>{game.players.toLocaleString()} jogando</span>
            </div>
          </div>
        </div>
      </button>

      {/* Modal de jogo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-black/95 md:p-4">
          <div className="flex items-center justify-between bg-[#0d0f14] px-4 py-3 border-b border-[#1c212b]">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {game.title} — Modo Demo
              </h3>
            </div>
            <button
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden md:rounded-b-2xl">
            <iframe
              src={game.demoUrl}
              className="w-full h-full max-w-[480px] border-0 shadow-2xl"
              allow="autoplay; fullscreen; encrypted-media"
              title={game.title}
            />
          </div>
        </div>
      )}

      <DepositModal open={false} onClose={() => {}} />
    </>
  );
};

export default GameLauncher;