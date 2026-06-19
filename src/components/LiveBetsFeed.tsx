"use client";

import React, { useEffect, useState } from "react";
import { Flame, TrendingUp, Trophy } from "lucide-react";

type Bet = {
  id: string;
  user: string;
  game: string;
  time: string;
  betAmount: number;
  multiplier: number;
  payout: number;
  isWin: boolean;
};

const GAMES = [
  "Fortune Tiger",
  "Fortune Dragon",
  "Fortune Rabbit",
  "Fortune Mouse",
  "Fortune Ox",
  "Fortune Snake",
  "Wild Bandito",
  "Treasures of Aztec"
];

const USERS = [
  "marcos***", "ana***", "lucas***", "gabi***", "thiago***", 
  "julia***", "rafa***", "carla***", "felipe***", "leticia***",
  "bruno***", "beatriz***", "mateus***", "sofia***", "enzo***"
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function LiveBetsFeed() {
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    // Inicializa com algumas apostas realistas
    const initialBets: Bet[] = Array.from({ length: 6 }).map((_, i) => generateFakeBet());
    setBets(initialBets);

    // Adiciona novas apostas a cada 2 a 4 segundos
    const interval = setInterval(() => {
      setBets((prev) => [generateFakeBet(), ...prev.slice(0, 5)]);
    }, Math.floor(Math.random() * 2000) + 2000);

    return () => clearInterval(interval);
  }, []);

  const generateFakeBet = (): Bet => {
    const betAmount = randomFrom([2, 5, 10, 20, 50, 100]);
    const isWin = Math.random() > 0.4; // 60% de chance de vitória simulada
    const multiplier = isWin ? Number((1.2 + Math.random() * 15).toFixed(1)) : 0;
    const payout = isWin ? betAmount * multiplier : 0;

    return {
      id: Math.random().toString(36).slice(2, 9),
      user: randomFrom(USERS),
      game: randomFrom(GAMES),
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      betAmount,
      multiplier,
      payout,
      isWin
    };
  };

  return (
    <div className="w-full max-w-[1180px] mx-auto bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-[#1c212b] pb-4">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
          <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Flame size={16} className="text-red-500" />
            Jogadas em Tempo Real
          </h3>
        </div>
        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Atualizado agora</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-gray-500 text-[10px] font-black uppercase tracking-wider border-b border-[#1c212b]/50 pb-2">
              <th className="pb-3">Jogo</th>
              <th className="pb-3">Usuário</th>
              <th className="pb-3">Horário</th>
              <th className="pb-3">Valor da Aposta</th>
              <th className="pb-3">Multiplicador</th>
              <th className="pb-3 text-right">Pagamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1c212b]/30 text-xs">
            {bets.map((bet) => (
              <tr key={bet.id} className="hover:bg-[#13161d]/30 transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                <td className="py-3 font-bold text-white">{bet.game}</td>
                <td className="py-3 text-gray-400 font-mono">{bet.user}</td>
                <td className="py-3 text-gray-500">{bet.time}</td>
                <td className="py-3 text-gray-300 font-bold">R$ {bet.betAmount.toFixed(2)}</td>
                <td className="py-3">
                  {bet.isWin ? (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-md font-black">
                      {bet.multiplier}x
                    </span>
                  ) : (
                    <span className="text-gray-600 font-bold">-</span>
                  )}
                </td>
                <td className="py-3 text-right font-black">
                  {bet.isWin ? (
                    <span className="text-emerald-400 flex items-center justify-end gap-1">
                      <Trophy size={12} />
                      R$ {bet.payout.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-gray-600">R$ 0,00</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}