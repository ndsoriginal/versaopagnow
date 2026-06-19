"use client";

import React from "react";
import { Trophy } from "lucide-react";

const GAME_IMAGES: Record<string, string> = {
  "Fortune Tiger": "/Jogos/Fortune Tiger.jpg",
  "Fortune Dragon": "/Jogos/Fortune Dragon.jpg",
  "Fortune Mouse": "/Jogos/Fortune Mouse.jpg",
  "Fortune Rabbit": "/Jogos/Fortune Rabbit.jpg",
  "Fortune Ox": "/Jogos/Fortune Ox.jpg",
};

const winners = [
  { name: "Joa***", game: "Fortune Tiger", amount: 249.0 },
  { name: "Mar***", game: "Fortune Ox", amount: 189.0 },
  { name: "Ped***", game: "Fortune Mouse", amount: 320.0 },
  { name: "Ana***", game: "Fortune Dragon", amount: 987.5 },
];

const TopWinners: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-[1180px] rounded-md bg-[#0B0D12] p-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 rounded-md bg-[#3B2D12] px-4 py-3">
          <Trophy className="text-[#FACC15]" />
          <div>
            <div className="text-sm font-semibold text-white">Top Ganhadores</div>
            <div className="text-xs text-[#9CA3AF]">Ao vivo</div>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto">
          {winners.map((w, i) => (
            <div key={i} className="flex min-w-[220px] items-center gap-3 rounded-md bg-[#171A21] px-3 py-2">
              <img src={GAME_IMAGES[w.game] || "/placeholder.svg"} alt={w.game} className="h-10 w-10 rounded-md object-cover" />
              <div className="flex-1">
                <div className="text-sm text-[#D1D5DB]">{w.name}</div>
                <div className="text-xs text-[#9CA3AF]">{w.game}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#9CA3AF]">Valor</div>
                <div className="font-semibold text-[#FACC15]">R$ {w.amount.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TopWinners;