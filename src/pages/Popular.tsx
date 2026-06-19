"use client";

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Play } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import GamePlayModal from "@/components/GamePlayModal";
import DepositModal from "@/components/DepositModal";
import { EXTERNAL_GAMES, type ExternalGame } from "@/data/externalGames";

const PopularPage: React.FC = () => {
  const { user } = useSession();
  const [selectedGame, setSelectedGame] = useState<ExternalGame | null>(null);
  const [depositOpen, setDepositOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      {/* Header */}
      <header className="flex items-center justify-between p-4 lg:p-8 border-b border-[#1c212b]">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </Link>
          <h1 className="text-2xl font-black uppercase tracking-tight italic text-[#ffcc00]">
            Jogos Populares
          </h1>
        </div>
      </header>

      {/* Grid de Jogos */}
      <main className="p-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {EXTERNAL_GAMES.slice(0, 12).map((game) => (
              <button
                key={game.id}
                onClick={() => setSelectedGame(game)}
                className="group text-left relative rounded-xl overflow-hidden bg-[#0d0f14] border border-[#1c212b] transition-all duration-300 hover:border-[#ffcc00]/50 hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(255,204,0,0.15)]"
              >
                <div className="aspect-[4/5] w-full relative">
                  <img
                    src={game.thumbnail}
                    alt={game.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
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
                  <div className="text-sm font-semibold text-white truncate group-hover:text-[#ffcc00] transition-colors">
                    {game.name}
                  </div>
                  <span className="text-[10px] font-medium text-[#4b5563] uppercase tracking-tighter block mt-0.5">
                    {game.provider}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>

      {/* Modal Gameplay Integrado */}
      {selectedGame && (
        <GamePlayModal
          open={!!selectedGame}
          onClose={() => setSelectedGame(null)}
          gameTitle={selectedGame.name}
          demoUrl={selectedGame.url}
          onOpenDeposit={() => setDepositOpen(true)}
        />
      )}

      {/* Modal de Depósito */}
      <DepositModal
        open={depositOpen}
        onClose={() => setDepositOpen(false)}
      />
    </div>
  );
};

export default PopularPage;