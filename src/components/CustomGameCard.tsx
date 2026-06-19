import React from "react";
import { useNavigate } from "react-router-dom";
import { Play, Zap, Diamond, TrendingUp } from "lucide-react";
import { CUSTOM_GAMES } from "@/data/customGames";

const gameIcons: Record<string, React.ReactNode> = {
  double: <TrendingUp size={20} className="text-[#ffcc00]" />,
  mines: <Diamond size={20} className="text-emerald-400" />,
  aviator: <Zap size={20} className="text-red-500" />,
};

const gameColors: Record<string, string> = {
  double: "from-red-600/20 via-red-500/10 to-transparent border-red-500/30",
  mines: "from-emerald-600/20 via-emerald-500/10 to-transparent border-emerald-500/30",
  aviator: "from-blue-600/20 via-blue-500/10 to-transparent border-blue-500/30",
};

export default function CustomGameCard() {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {CUSTOM_GAMES.map((game) => (
        <button
          key={game.id}
          onClick={() => navigate(game.route)}
          className="group relative bg-[#0d0f14] rounded-3xl overflow-hidden border border-[#1c212b] hover:border-[#ffcc00]/30 transition-all duration-300 hover:-translate-y-1 text-left"
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${gameColors[game.id] || "from-gray-600/20 to-transparent"} opacity-60 group-hover:opacity-100 transition-opacity duration-300`} />
          <div className="relative z-10 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-[#13161d] border border-[#1c212b] flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {gameIcons[game.id] || <Play size={20} />}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-[#ffcc00] font-black uppercase tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-[#ffcc00] animate-pulse" />
                {game.provider}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-black text-white group-hover:text-[#ffcc00] transition-colors">
                {game.name}
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                {game.description}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-black text-[#ffcc00] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Play size={12} fill="#ffcc00" />
              Jogar Agora
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
