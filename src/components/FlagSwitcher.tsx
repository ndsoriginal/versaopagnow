"use client";

import React from "react";
import { FLAG_OPTIONS, type FlagOption } from "@/data/flags";
import { useBonus } from "@/context/BonusContext";

type FlagSwitcherProps = {
  onFlagSelected?: (flag: FlagOption) => void;
};

const FlagSwitcher: React.FC<FlagSwitcherProps> = ({ onFlagSelected }) => {
  const [activeFlag, setActiveFlag] = React.useState<FlagOption>(FLAG_OPTIONS[0]);
  const { handleFlagSelection } = useBonus();

  const handleSelection = (flag: FlagOption) => {
    setActiveFlag(flag);
    handleFlagSelection(flag); // Trigger bonus logic
    onFlagSelected?.(flag); // Notify parent
  };

  return (
    <div className="w-full rounded-2xl border border-[#1c212b] bg-[#0B0D12] p-4 shadow-lg">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-[#8da1c1]">Selecionar bandeira</p>
          <h3 className="text-xl font-bold text-white">{activeFlag.label}</h3>
          <p className="text-sm text-[#9CA3AF]">
            {activeFlag.language} · {activeFlag.description}
          </p>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 md:flex">
          <img src={activeFlag.flag} alt={activeFlag.label} className="h-6 w-9 object-cover" />
          <span className="text-sm font-semibold text-white">{activeFlag.language}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 overflow-x-auto pb-2">
        {FLAG_OPTIONS.map((flag) => (
          <button
            key={flag.label}
            onClick={() => handleSelection(flag)}
            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm focus:outline-none transition ${
              activeFlag.label === flag.label
                ? "border-[#ffcc00] bg-white/5 text-white shadow-[0_0_10px_rgba(255,204,0,0.25)]"
                : "border-white/10 text-[#bfc7d6] hover:border-white/30 hover:text-white"
            }`}
          >
            <img src={flag.flag} alt={flag.label} className="h-6 w-10 rounded-sm object-cover" />
            <span className="whitespace-nowrap font-semibold">{flag.language}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlagSwitcher;