import React, { useMemo } from "react";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import { Calendar, DollarSign, TrendingUp } from "lucide-react";

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = () => new Date().toISOString().split("T")[0];

type Props = {
  dailySpend?: Record<string, number>;
};

export default function PeriodFilterBar({ dailySpend }: Props) {
  const { dateStart, dateEnd, setDateStart, setDateEnd, setPeriod, setYesterday, setThisMonth } = usePeriodFilter();

  const presets = [
    { label: "Hoje", days: 0, isActive: dateStart === today() && dateEnd === today() },
    { label: "Ontem", isActive: false, action: setYesterday },
    { label: "7 dias", days: 6, isActive: false },
    { label: "30 dias", days: 29, isActive: false },
    { label: "Mês", isActive: false, action: setThisMonth },
  ];

  const updatedPresets = presets.map(p => {
    if (p.label === "Ontem") {
      const y = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      return { ...p, isActive: dateStart === y && dateEnd === y };
    }
    if (p.label === "Mês") {
      const m = new Date(); m.setDate(1);
      const ms = m.toISOString().split("T")[0];
      return { ...p, isActive: dateStart === ms && dateEnd === today() };
    }
    if (p.days !== undefined) {
      const s = new Date(Date.now() - p.days * 86400000).toISOString().split("T")[0];
      return { ...p, isActive: dateStart === s && dateEnd === today() };
    }
    return p;
  });

  const periodSpend = useMemo(() => {
    if (!dailySpend) return null;
    let total = 0;
    const s = new Date(dateStart);
    const e = new Date(dateEnd);
    for (const d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().split("T")[0];
      total += dailySpend[key] || 0;
    }
    return total;
  }, [dailySpend, dateStart, dateEnd]);

  function handlePresetClick(p: typeof updatedPresets[0]) {
    if (p.label === "Ontem") setYesterday();
    else if (p.label === "Mês") setThisMonth();
    else if (p.days !== undefined) setPeriod(p.days);
  }

  return (
    <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-4 shadow-xl">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <Calendar size={16} className="text-[#ffcc00]" />
          <span className="text-xs font-black uppercase tracking-wider text-gray-400">Período</span>
        </div>

        <div className="flex gap-1 flex-wrap">
          {updatedPresets.map(p => (
            <button key={p.label} onClick={() => handlePresetClick(p)}
              className={`text-[10px] font-black uppercase px-3 py-2 rounded-xl border transition-all ${p.isActive ? "bg-[#ffcc00] text-black border-[#ffcc00]" : "bg-[#13161d] border-[#1c212b] text-gray-400 hover:text-white hover:border-gray-500"}`}>
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-gray-600 text-[10px] font-bold shrink-0">ou</span>
          <input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)}
            className="bg-[#13161d] border border-[#1c212b] rounded-xl px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-[#ffcc00] w-full sm:w-[120px] min-w-0" />
          <span className="text-gray-500 text-xs shrink-0">a</span>
          <input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)}
            className="bg-[#13161d] border border-[#1c212b] rounded-xl px-2.5 py-2 text-[11px] text-white focus:outline-none focus:border-[#ffcc00] w-full sm:w-[120px] min-w-0" />
        </div>

        {periodSpend !== null && (
          <div className="flex items-center gap-2 sm:ml-auto shrink-0 bg-[#13161d] border border-[#1c212b] rounded-xl px-4 py-2">
            <DollarSign size={14} className="text-purple-400" />
            <div>
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block">Gasto no período</span>
              <span className="text-sm font-black text-purple-400">{fmt(periodSpend)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
