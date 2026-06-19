import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, ComposedChart
} from "recharts";
import {
  DollarSign, MousePointerClick, Eye, Users, UserPlus,
  ShoppingCart, TrendingUp, Target, Wallet,
  Filter, RefreshCw, Loader2, Search, X
} from "lucide-react";
import { usePeriodFilter, PeriodFilterProvider } from "@/context/PeriodFilterContext";
import CampaignRanking from "./CampaignRanking";
import PeriodFilterBar from "./PeriodFilterBar";

type AdMetric = {
  id: string;
  date: string;
  campaign_name: string;
  adset_name: string;
  ad_name: string;
  investment: number;
  impressions: number;
  clicks: number;
  reach: number;
  leads: number;
  purchases: number;
  revenue: number;
  roas: number;
  cpc: number;
  cpl: number;
  cost_per_purchase: number;
};



const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtN = (v: number) => v.toLocaleString("pt-BR");

const CARD_CONFIG = [
  { key: "total_investment", label: "Investimento Total", icon: DollarSign, fmt: fmt, color: "text-red-400" },
  { key: "total_clicks", label: "Cliques", icon: MousePointerClick, fmt: fmtN, color: "text-blue-400" },
  { key: "total_impressions", label: "Impressões", icon: Eye, fmt: fmtN, color: "text-purple-400" },
  { key: "total_reach", label: "Alcance", icon: Users, fmt: fmtN, color: "text-green-400" },
  { key: "total_leads", label: "Cadastros", icon: UserPlus, fmt: fmtN, color: "text-cyan-400" },
  { key: "total_purchases", label: "Compras", icon: ShoppingCart, fmt: fmtN, color: "text-orange-400" },
  { key: "total_revenue", label: "Faturamento", icon: TrendingUp, fmt: fmt, color: "text-emerald-400" },
  { key: "roas", label: "ROAS", icon: Target, fmt: (v: number) => v.toFixed(2) + "x", color: "text-[#ffcc00]" },
  { key: "cpc", label: "CPC", icon: Wallet, fmt: fmt, color: "text-pink-400" },
  { key: "cpl", label: "CPL", icon: Wallet, fmt: fmt, color: "text-yellow-400" },
  { key: "cost_per_purchase", label: "Custo por Compra", icon: Wallet, fmt: fmt, color: "text-red-500" },
];

const TABLE_COLUMNS = [
  { key: "date", label: "Data" },
  { key: "campaign_name", label: "Campanha" },
  { key: "adset_name", label: "Conjunto" },
  { key: "ad_name", label: "Anúncio" },
  { key: "investment", label: "Investimento", fmt: fmt },
  { key: "impressions", label: "Impressões", fmt: fmtN },
  { key: "clicks", label: "Cliques", fmt: fmtN },
  { key: "reach", label: "Alcance", fmt: fmtN },
  { key: "leads", label: "Cadastros", fmt: fmtN },
  { key: "purchases", label: "Compras", fmt: fmtN },
  { key: "revenue", label: "Faturamento", fmt: fmt },
  { key: "roas", label: "ROAS", fmt: (v: number) => v.toFixed(2) + "x" },
  { key: "cpc", label: "CPC", fmt: fmt },
  { key: "cpl", label: "CPL", fmt: fmt },
  { key: "cost_per_purchase", label: "Custo/Compra", fmt: fmt },
];

const CHART_CONFIG = [
  { key: "investment", label: "Investimento / Dia", color: "#ef4444", type: "bar" as const },
  { key: "clicks", label: "Cliques / Dia", color: "#3b82f6", type: "bar" as const },
  { key: "leads", label: "Cadastros / Dia", color: "#06b6d4", type: "bar" as const },
  { key: "purchases", label: "Compras / Dia", color: "#f97316", type: "bar" as const },
  { key: "revenue", label: "Faturamento / Dia", color: "#10b981", type: "bar" as const },
];

function AdminAdsDashboardContent() {
  const { dateStart, dateEnd } = usePeriodFilter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<AdMetric[]>([]);

  const [campaignFilter, setCampaignFilter] = useState("");
  const [adsetFilter, setAdsetFilter] = useState("");
  const [adFilter, setAdFilter] = useState("");

  const [campaigns, setCampaigns] = useState<string[]>([]);
  const [adsets, setAdsets] = useState<string[]>([]);
  const [ads, setAds] = useState<string[]>([]);

  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let q = supabase.from("ads_daily_metrics").select("*");
      if (dateStart) q = q.gte("date", dateStart);
      if (dateEnd) q = q.lte("date", dateEnd);

      const { data: md, error: me } = await q.order("date", { ascending: false });

      if (me) throw me;

      const rows = (md || []) as AdMetric[];
      setMetrics(rows);
      setCampaigns([...new Set(rows.map(r => r.campaign_name).filter(Boolean))] as string[]);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados de anúncios");
    } finally {
      setLoading(false);
    }
  }, [dateStart, dateEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredMetrics = useMemo(() => {
    let f = [...metrics];
    if (dateStart) f = f.filter(r => r.date >= dateStart);
    if (dateEnd) f = f.filter(r => r.date <= dateEnd);
    if (campaignFilter) f = f.filter(r => r.campaign_name === campaignFilter);
    if (adsetFilter) f = f.filter(r => r.adset_name === adsetFilter);
    if (adFilter) f = f.filter(r => r.ad_name === adFilter);
    return f;
  }, [metrics, dateStart, dateEnd, campaignFilter, adsetFilter, adFilter]);

  useEffect(() => {
    const base = campaignFilter ? metrics.filter(r => r.campaign_name === campaignFilter) : metrics;
    setAdsets([...new Set(base.map(r => r.adset_name).filter(Boolean))] as string[]);
    if (adsetFilter && !base.some(r => r.adset_name === adsetFilter)) setAdsetFilter("");
  }, [campaignFilter, metrics]);

  useEffect(() => {
    let base = [...metrics];
    if (campaignFilter) base = base.filter(r => r.campaign_name === campaignFilter);
    if (adsetFilter) base = base.filter(r => r.adset_name === adsetFilter);
    setAds([...new Set(base.map(r => r.ad_name).filter(Boolean))] as string[]);
    if (adFilter && !base.some(r => r.ad_name === adFilter)) setAdFilter("");
  }, [campaignFilter, adsetFilter, metrics]);

  const chartData = useMemo(() => {
    const map: Record<string, any> = {};
    for (const r of filteredMetrics) {
      const d = r.date;
      if (!map[d]) map[d] = { date: d, investment: 0, clicks: 0, impressions: 0, leads: 0, purchases: 0, revenue: 0 };
      map[d].investment += Number(r.investment) || 0;
      map[d].clicks += Number(r.clicks) || 0;
      map[d].impressions += Number(r.impressions) || 0;
      map[d].leads += Number(r.leads) || 0;
      map[d].purchases += Number(r.purchases) || 0;
      map[d].revenue += Number(r.revenue) || 0;
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredMetrics]);

  const sortedTable = useMemo(() => {
    return [...filteredMetrics].sort((a, b) => {
      const av = (a as any)[sortField] ?? "";
      const bv = (b as any)[sortField] ?? "";
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [filteredMetrics, sortField, sortDir]);

  const summaryValues = useMemo(() => {
    const inv = filteredMetrics.reduce((s, r) => s + Number(r.investment), 0);
    const cl = filteredMetrics.reduce((s, r) => s + Number(r.clicks), 0);
    const ld = filteredMetrics.reduce((s, r) => s + Number(r.leads), 0);
    const pu = filteredMetrics.reduce((s, r) => s + Number(r.purchases), 0);
    const imp = filteredMetrics.reduce((s, r) => s + Number(r.impressions), 0);
    const rea = filteredMetrics.reduce((s, r) => s + Number(r.reach), 0);
    const rev = filteredMetrics.reduce((s, r) => s + Number(r.revenue), 0);
    return {
      total_investment: inv,
      total_clicks: cl,
      total_impressions: imp,
      total_reach: rea,
      total_leads: ld,
      total_purchases: pu,
      total_revenue: rev,
      roas: inv > 0 ? rev / inv : 0,
      cpc: cl > 0 ? inv / cl : 0,
      cpl: ld > 0 ? inv / ld : 0,
      cost_per_purchase: pu > 0 ? inv / pu : 0,
    };
  }, [filteredMetrics]);

  const dailySpend = useMemo(() => {
    const byDate: Record<string, number> = {};
    for (const r of filteredMetrics) {
      const d = r.date;
      if (!byDate[d]) byDate[d] = 0;
      byDate[d] += Number(r.investment) || 0;
    }
    return byDate;
  }, [filteredMetrics]);

  const handleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const clearFilters = () => {
    setCampaignFilter(""); setAdsetFilter(""); setAdFilter("");
  };

  const hasFilters = campaignFilter || adsetFilter || adFilter;

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      <PeriodFilterBar dailySpend={dailySpend} />

      {loading && (
        <div className="h-[40vh] flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-[#ffcc00]" size={48} />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-4">Carregando anúncios...</p>
        </div>
      )}

      {error && (
        <div className="bg-[#0d0f14] border border-red-500/20 rounded-3xl p-8 text-center">
          <p className="text-red-400 font-bold mb-4">{error}</p>
          <button onClick={loadData} className="bg-[#ffcc00] text-black font-bold py-3 px-6 rounded-xl text-sm">Tentar novamente</button>
        </div>
      )}

      {!loading && !error && metrics.length === 0 && (
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/5 mb-6">
            <Search size={36} className="text-gray-500" />
          </div>
          <p className="text-gray-400 text-lg font-bold">Nenhum dado de anúncio para o período selecionado.</p>
          <p className="text-gray-600 text-sm mt-2">Ajuste o filtro de período acima para buscar dados.</p>
        </div>
      )}

      {!loading && !error && metrics.length > 0 && (
        <>
          <CampaignRanking metrics={filteredMetrics as any} />

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {CARD_CONFIG.map(cfg => {
          const Icon = cfg.icon;
          return (
            <div key={cfg.key} className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-2xl bg-white/5 ${cfg.color}`}><Icon size={20} /></div>
              </div>
              <div>
                <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest block">{cfg.label}</span>
                <div className="text-xl font-black text-white tracking-tight mt-1">{cfg.fmt((summaryValues as any)[cfg.key])}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <Filter size={20} className="text-[#ffcc00]" />
          <h3 className="text-base font-black uppercase tracking-wider">Filtros</h3>
          {hasFilters && (
            <button onClick={clearFilters} className="text-[10px] text-red-400 font-bold uppercase hover:text-red-300 ml-auto flex items-center gap-1">
              <X size={14} /> Limpar
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase block mb-2">Campanha</label>
            <select value={campaignFilter} onChange={e => setCampaignFilter(e.target.value)}
              className="w-full bg-[#13161d] border border-[#1c212b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffcc00]">
              <option value="">Todas</option>
              {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase block mb-2">Conjunto</label>
            <select value={adsetFilter} onChange={e => setAdsetFilter(e.target.value)}
              className="w-full bg-[#13161d] border border-[#1c212b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
              disabled={!campaignFilter}>
              <option value="">Todos</option>
              {adsets.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 font-black uppercase block mb-2">Anúncio</label>
            <select value={adFilter} onChange={e => setAdFilter(e.target.value)}
              className="w-full bg-[#13161d] border border-[#1c212b] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
              disabled={!adsetFilter}>
              <option value="">Todos</option>
              {ads.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CHART_CONFIG.map(ch => (
            <div key={ch.key} className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
              <h4 className="text-sm font-black uppercase tracking-wider mb-6">{ch.label}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1c212b" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#0d0f14", border: "1px solid #1c212b", borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey={ch.key} fill={ch.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
          <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
            <h4 className="text-sm font-black uppercase tracking-wider mb-6">Investimento x Faturamento</h4>
            <ResponsiveContainer width="100%" height={250}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1c212b" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ background: "#0d0f14", border: "1px solid #1c212b", borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="investment" fill="#ef4444" radius={[4, 4, 0, 0]} name="Investimento" />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Faturamento" dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}



      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <h3 className="text-base font-black uppercase tracking-wider">Dados Detalhados</h3>
          <span className="text-[10px] text-gray-500 font-bold">({filteredMetrics.length} registros)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#1c212b]">
                {TABLE_COLUMNS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className="text-[10px] text-gray-500 font-black uppercase tracking-wider px-3 py-3 text-left cursor-pointer hover:text-white transition-colors whitespace-nowrap">
                    {col.label} {sortField === col.key && (sortDir === "asc" ? "↑" : "↓")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedTable.map(row => (
                <tr key={row.id} className="border-b border-[#1c212b]/50 hover:bg-white/[0.02] transition-colors">
                  {TABLE_COLUMNS.map(col => {
                    const val = (row as any)[col.key];
                    const formatted = col.fmt ? col.fmt(Number(val)) : val || "-";
                    const colorMap: Record<string, string> = {
                      investment: "text-red-400",
                      clicks: "text-blue-400",
                      leads: "text-cyan-400",
                      purchases: "text-orange-400",
                      revenue: "text-emerald-400",
                      roas: "text-[#ffcc00]",
                    };
                    return (
                      <td key={col.key} className={`px-3 py-3 ${colorMap[col.key] || "text-gray-300"} font-medium whitespace-nowrap`}>
                        {formatted}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

export default function AdminAdsDashboard() {
  return (
    <PeriodFilterProvider>
      <AdminAdsDashboardContent />
    </PeriodFilterProvider>
  );
}
