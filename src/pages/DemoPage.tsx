"use client";

import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { EXTERNAL_GAMES } from "@/data/externalGames";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play } from "lucide-react";

export default function DemoPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const game = EXTERNAL_GAMES.find((g) => g.id === slug);

  if (!game) {
    return (
      <div className="min-h-screen bg-[#06070a] text-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400 mb-4">Jogo não encontrado.</p>
          <Button onClick={() => navigate(-1)} className="bg-[#ffcc00] text-black font-bold">
            Voltar para jogos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#06070a]/90 backdrop-blur-md border-b border-[#1c212b]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#13161d] border border-[#1c212b] text-gray-400 hover:text-white hover:bg-[#1c212b] transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Play size={20} className="text-[#ffcc00]" />
              {game.name}
            </h1>
            <p className="text-xs text-gray-500">{game.provider}</p>
          </div>
        </div>
      </header>

      {/* Game Container */}
      <div className="w-full h-[calc(100vh-120px)] relative">
        <iframe
          src={game.url}
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; encrypted-media"
          title={game.name}
        />
      </div>
    </div>
  );
}