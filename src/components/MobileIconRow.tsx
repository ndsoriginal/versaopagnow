"use client";

import React from "react";
import { useNavigate } from "react-router-dom";
import { Plane, TrendingUp, Diamond } from "lucide-react";

const CATEGORIES = [
  { label: "Aviator", icon: Plane, href: "/aviator" },
  { label: "Double", icon: TrendingUp, href: "/double" },
  { label: "Mines", icon: Diamond, href: "/mines" },
];

const MobileIconRow: React.FC = () => {
  const navigate = useNavigate();

  const handleCategoryClick = (href: string) => {
    if (href && href !== "#") {
      navigate(href);
    }
  };

  return (
    <div className="w-full">
      <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.label}
              onClick={() => handleCategoryClick(c.href)}
              className="flex-shrink-0 flex flex-col items-center gap-2 rounded-2xl bg-[#171A21] border border-[#1c212b] hover:border-[#ffcc00]/30 px-5 py-3 text-xs text-white transition-all active:scale-95"
            >
              <div className="rounded-full bg-[#ffcc00]/10 p-2.5 text-[#ffcc00]">
                <Icon size={20} />
              </div>
              <div className="text-[11px] font-bold text-[#D1D5DB]">{c.label}</div>
            </button>
          );
        })}
      </div>
      <div className="mt-3">
        <input
          placeholder="Pesquise um jogo..."
          className="w-full rounded-xl bg-[#13161d] border border-[#1c212b] px-4 py-3 text-sm text-[#D1D5DB] placeholder:text-[#6B7280] focus:border-[#ffcc00] focus:outline-none transition-all"
        />
      </div>
    </div>
  );
};

export default MobileIconRow;