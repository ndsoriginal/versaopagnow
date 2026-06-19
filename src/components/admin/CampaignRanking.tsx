import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { usePeriodFilter } from "@/context/PeriodFilterContext";
import { Loader2, Trophy, ThumbsUp, AlertTriangle, ThumbsDown } from "lucide-react";

type AdMetric = {
  id: string;
  date: string;
  campaign_name: string;
  investment: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads: number;
  purchases: number;
  revenue: number;
};

type Props = {
  metrics?: AdMetric[];
  loading?: boolean;
};

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v: number) => v.toLocaleString("pt-BR");

export default function CampaignRanking({ metrics: propMetrics, loading: propLoading }: Props) {
  const { dateStart, dateEnd } = usePeriodFilter();
  const [internalMetrics, setInternalMetrics] = useState<AdMetric[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);

  const hasExternal = !!propMetrics;
  const rawMetrics = propMetrics || internalMetrics;
  const loading = propLoading !== undefined ? propLoading : internalLoading;

  useEffect(() => {
    if (hasExternal) return;
    setInternalLoading(true);
    let q = supabase.from("ads_daily_metrics").select("*");
    if (dateStart) q = q.gte("date", dateStart);
    if (dateEnd) q = q.lte("date", dateEnd);
    q.order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) setInternalError(error.message);
        else setInternalMetrics((data || []) as AdMetric[]);
      })
      .finally(() => setInternalLoading(false));
  }, [dateStart, dateEnd, hasExternal]);

  const metrics = useMemo(() => {
    return rawMetrics.filter(r => r.date >= dateStart && r.date <= dateEnd);
  }, [rawMetrics, dateStart, dateEnd]);

  const campaignData = useMemo(() => {
    const agg: Record<string, { investment: number; revenue: number; purchases: number; clicks: number; impressions: number; days: Set<string> }> = {};
    for (const r of metrics) {
      const c = r.campaign_name || "Sem nome";
      if (!agg[c]) agg[c] = { investment: 0, revenue: 0, purchases: 0, clicks: 0, impressions: 0, days: new Set() };
      agg[c].investment += Number(r.investment) || 0;
      agg[c].revenue += Number(r.revenue) || 0;
      agg[c].purchases += Number(r.purchases) || 0;
      agg[c].clicks += Number(r.clicks) || 0;
      agg[c].impressions += Number(r.impressions) || 0;
      agg[c].days.add(r.date);
    }
    return Object.entries(agg)
      .map(([name, d]) => {
        const roas = d.investment > 0 ? d.revenue / d.investment : 0;
        const profit = d.revenue - d.investment;
        const ctr = d.impressions > 0 ? (d.clicks / d.impressions) * 100 : 0;
        let score = 0;
        score += Math.min(roas / 10, 1) * 35;
        score += Math.min(profit / 1000, 1) * 25;
        score += Math.min(d.purchases / 50, 1) * 20;
        score += Math.min(ctr / 5, 1) * 10;
        score += Math.min(d.days.size / 30, 1) * 10;
        let recommendation: string;
        let recColor: string;
        let recIcon: any;
        if (roas >= 3 && d.purchases >= 1) {
          recommendation = "Continuar";
          recColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
          recIcon = ThumbsUp;
        } else if (roas >= 1.5 || (profit > 0 && d.purchases >= 1)) {
          recommendation = "Otimizar";
          recColor = "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
          recIcon = AlertTriangle;
        } else {
          recommendation = "Pausar";
          recColor = "text-red-400 bg-red-500/10 border-red-500/20";
          recIcon = ThumbsDown;
        }
        return { name, roas, investment: d.investment, revenue: d.revenue, purchases: d.purchases, clicks: d.clicks, impressions: d.impressions, profit, ctr, score: Math.round(score), recommendation, recColor, recIcon, days: d.days.size };
      })
      .sort((a, b) => b.score - a.score);
  }, [metrics]);

  const dailySpend = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const r of metrics) {
      const d = r.date;
      if (!byDate[d]) byDate[d] = 0;
      byDate[d] += Number(r.investment) || 0;
    }
    return byDate;
  }, [metrics]);

  const avgDailySpend = useMemo(() => {
    const dates = Object.keys(dailySpend);
    if (dates.length === 0) return 0;
    const total = Object.values(dailySpend).reduce((a, b) => a + b, 0);
    return total / dates.length;
  }, [dailySpend]);

  const todaySpend = dailySpend[new Date().toISOString().split("T")[0]] || 0;

  if (internalError) return null;

  if (loading && campaignData.length === 0) {
    return (
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 flex items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#ffcc00]" size={20} />
        <span className="text-gray-500 text-sm font-bold">Carregando campanhas...</span>
      </div>
    );
  }

  if (campaignData.length === 0 && !loading) {
    return (
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 text-center">
        <p className="text-gray-500 text-sm font-bold">Nenhum dado de campanha para o período selecionado.</p>
      </div>
    );
  }

  const best = campaignData[0];

  return (
    <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-2xl bg-[#ffcc00]/10 text-[#ffcc00]">
          <Trophy size={22} />
        </div>
        <div>
          <h3 className="text-lg font-black uppercase tracking-tight">Ranking</h3>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
            {campaignData.length} campanhas · Gasto médio/dia {fmt(avgDailySpend)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-3">
          <span className="text-[10px] text-emerald-400 font-black uppercase tracking-widest block">Melhor ROAS</span>
          <span className="text-base font-black text-emerald-400 block">{best.roas.toFixed(2)}x</span>
          <span className="text-[10px] text-gray-500 font-medium truncate block">{best.name}</span>
        </div>
        <div className="bg-[#ffcc00]/5 border border-[#ffcc00]/20 rounded-2xl p-3">
          <span className="text-[10px] text-[#ffcc00] font-black uppercase tracking-widest block">Maior Lucro</span>
          <span className="text-base font-black text-[#ffcc00] block">{fmt(Math.max(...campaignData.map(c => c.profit)))}</span>
          <span className="text-[10px] text-gray-500 font-medium truncate block">{[...campaignData].sort((a, b) => b.profit - a.profit)[0].name}</span>
        </div>
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-3">
          <span className="text-[10px] text-blue-400 font-black uppercase tracking-widest block">Ativas</span>
          <span className="text-base font-black text-blue-400 block">{campaignData.filter(c => c.recommendation === "Continuar").length}</span>
          <span className="text-[10px] text-gray-500 font-medium block">recomendadas</span>
        </div>
        <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-3">
          <span className="text-[10px] text-red-400 font-black uppercase tracking-widest block">Pausar</span>
          <span className="text-base font-black text-red-400 block">{campaignData.filter(c => c.recommendation === "Pausar").length}</span>
          <span className="text-[10px] text-gray-500 font-medium block">campanhas</span>
        </div>
        <div className="bg-purple-500/5 border border-purple-500/20 rounded-2xl p-3">
          <span className="text-[10px] text-purple-400 font-black uppercase tracking-widest block">Gasto Hoje</span>
          <span className="text-base font-black text-purple-400 block">{fmt(todaySpend)}</span>
          <span className="text-[10px] text-gray-500 font-medium block">média {fmt(avgDailySpend)}/dia</span>
        </div>
      </div>

      <div className="space-y-2">
        {campaignData.map((camp, idx) => {
          const RecIcon = camp.recIcon;
          const pos = idx + 1;
          const isFirst = pos === 1;
          return (
            <div key={camp.name} className={`rounded-2xl border transition-all hover:border-[#ffcc00]/30 ${camp.recommendation === "Pausar" ? "bg-red-500/[0.02] border-red-500/10" : isFirst ? "bg-[#ffcc00]/[0.02] border-[#ffcc00]/15" : "bg-[#13161d] border-[#1c212b]"}`}>
              <div className="p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-center gap-2.5 min-w-0 sm:min-w-[140px]">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${isFirst ? "bg-[#ffcc00] text-black" : pos === 2 ? "bg-gray-300 text-black" : pos === 3 ? "bg-amber-700 text-white" : "bg-white/5 text-gray-500"}`}>
                    {pos}
                  </span>
                  <span className={`${isFirst ? "text-[#ffcc00]" : "text-white"} font-bold text-xs leading-tight truncate`}>{camp.name}</span>
                </div>
                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px]">
                  <div><span className="text-gray-600 block text-[9px] uppercase font-black">ROAS</span><span className="text-[#ffcc00] font-black">{camp.roas.toFixed(2)}x</span></div>
                  <div><span className="text-gray-600 block text-[9px] uppercase font-black">Gasto</span><span className="text-red-400 font-black">{fmt(camp.investment)}</span></div>
                  <div><span className="text-gray-600 block text-[9px] uppercase font-black">Faturamento</span><span className="text-emerald-400 font-black">{fmt(camp.revenue)}</span></div>
                  <div><span className="text-gray-600 block text-[9px] uppercase font-black">Lucro</span><span className={`font-black ${camp.profit >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(camp.profit)}</span></div>
                  <div><span className="text-gray-600 block text-[9px] uppercase font-black">Compras</span><span className="text-orange-400 font-black">{fmtN(camp.purchases)}</span></div>
                  <div>
                    <span className="text-gray-600 block text-[9px] uppercase font-black">Score</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-1.5 bg-[#1c212b] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${camp.score}%`, background: camp.score >= 70 ? "#10b981" : camp.score >= 40 ? "#ffcc00" : "#ef4444" }} />
                      </div>
                      <span className="text-white font-black">{camp.score}</span>
                    </div>
                  </div>
                </div>
                <div className={`flex items-center gap-1 text-[9px] font-black uppercase px-2.5 py-1.5 rounded-lg border ${camp.recColor} whitespace-nowrap shrink-0`}>
                  <RecIcon size={13} />
                  {camp.recommendation}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
