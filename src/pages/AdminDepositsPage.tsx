import React, { useEffect, useMemo, useState } from "react";
import { fetchAdminDashboardData } from "@/services/adminDashboard";
import { cn } from "@/lib/utils";
import { Search, CheckCircle2, Clock, Users, Gift, RefreshCw, Loader2, User, ExternalLink } from "lucide-react";
import AdminDepositsTable from "@/components/admin/AdminDepositsTable";
import AdminUserDetailModal from "@/components/admin/AdminUserDetailModal";

type Deposit = {
  id: string;
  user_id: string;
  email?: string | null;
  name?: string | null;
  amount?: number;
  status?: string;
  pix_code?: string | null;
  created_at: string;
  audit_type?: string;
};

type Props = {
  refreshData?: () => void;
};

const formatCurrency = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "0,00";
};

const isPaid = (status: string) => ["paid", "completed", "approved", "success"].includes(String(status || "").toLowerCase());
const isPending = (status: string) => ["pending", "generated", "processing", "waiting_payment"].includes(String(status || "").toLowerCase());

export default function AdminDepositsPage({ refreshData }: Props) {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"paid" | "pending">("paid");
  const [stats, setStats] = useState<Record<string, number>>({});
  const [viewMode, setViewMode] = useState<"all" | "user">("all");
  const [userFilter, setUserFilter] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await fetchAdminDashboardData();
      setDeposits(Array.isArray(result.deposits) ? result.deposits : []);
      setStats(result.overview || {});
    } catch {
      setDeposits([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const uniqueUsers = useMemo(() => {
    const map = new Map<string, { id: string; email: string; name: string }>();
    deposits.forEach(d => {
      if (d.user_id && !map.has(d.user_id)) {
        map.set(d.user_id, { id: d.user_id, email: d.email || "", name: d.name || d.email?.split("@")[0] || "" });
      }
    });
    return Array.from(map.values());
  }, [deposits]);

  const filteredDeposits = useMemo(() => {
    const term = search.trim().toLowerCase();
    return deposits.filter((deposit) => {
      const matchesTab = activeTab === "paid" ? isPaid(deposit.status) : isPending(deposit.status);
      const matchesUser = !userFilter || deposit.user_id === userFilter || deposit.email?.toLowerCase().includes(userFilter.toLowerCase());
      if (!term) return matchesTab && matchesUser;
      const searchableText = [deposit.email, deposit.name, deposit.id, deposit.user_id, deposit.status, deposit.audit_type, deposit.pix_code].join(" ").toLowerCase();
      return matchesTab && matchesUser && searchableText.includes(term);
    });
  }, [search, activeTab, deposits, userFilter]);

  const userStats = useMemo(() => {
    if (!userFilter) return null;
    const userDeposits = deposits.filter(d => d.user_id === userFilter);
    const paid = userDeposits.filter(d => isPaid(d.status));
    const pending = userDeposits.filter(d => isPending(d.status));
    return {
      total: userDeposits.length,
      paid: paid.length,
      pending: pending.length,
      paidAmount: paid.reduce((s, d) => s + Number(d.amount || 0), 0),
      pendingAmount: pending.reduce((s, d) => s + Number(d.amount || 0), 0),
    };
  }, [deposits, userFilter]);

  const selectedUser = uniqueUsers.find(u => u.id === userFilter);

  return (
    <div className="w-full max-w-[1400px]">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 sm:gap-6">
          <aside className="space-y-6">
            {!userFilter ? (
              <>
                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 shadow-xl space-y-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input type="text" placeholder="Buscar por email, nome, ID ou PIX..." value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder:text-gray-600 focus:border-[#ffcc00] focus:outline-none transition-all" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setActiveTab("paid")}
                      className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === "paid" ? "bg-[#ffcc00] text-black shadow-lg" : "bg-[#06070a] text-gray-400 border border-[#1c212b] hover:text-white")}>
                      <CheckCircle2 size={16} /> Pagos
                    </button>
                    <button onClick={() => setActiveTab("pending")}
                      className={cn("flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest transition-all",
                        activeTab === "pending" ? "bg-[#ffcc00] text-black shadow-lg" : "bg-[#06070a] text-gray-400 border border-[#1c212b] hover:text-white")}>
                      <Clock size={16} /> Pendentes
                    </button>
                  </div>
                </div>

                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 shadow-xl space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                    <User size={14} /> Filtrar por Usuário
                  </h4>
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {uniqueUsers.slice(0, 50).map(u => (
                      <button key={u.id} onClick={() => { setUserFilter(u.id); setSearch(""); }}
                        className="w-full flex items-center gap-2 p-2.5 rounded-xl bg-[#06070a] hover:bg-[#13161d] border border-[#1c212b] hover:border-[#ffcc00]/20 transition-all text-left">
                        <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#ffcc00] to-[#e6b800] flex items-center justify-center text-black text-[8px] font-black shrink-0">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-bold text-white truncate">{u.name || u.email}</div>
                          <div className="text-[9px] text-gray-600 truncate">{u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 shadow-xl space-y-4">
                  {[
                    { label: "Usuários Reais", value: stats.totalUsers || 0, icon: Users, color: "text-[#ffcc00]" },
                    { label: "Depósitos Hoje", value: `R$ ${formatCurrency(stats.realRevenueToday)}`, icon: CheckCircle2, color: "text-emerald-500" },
                    { label: "Pendências", value: `R$ ${formatCurrency(stats.pendingAmount)}`, icon: Clock, color: "text-amber-500" },
                    { label: "Bug Bônus", value: `R$ ${formatCurrency(stats.totalBugAmount)}`, icon: Gift, color: "text-purple-500" },
                    { label: "Faturamento Total", value: `R$ ${formatCurrency(stats.realRevenueTotal)}`, icon: Gift, color: "text-blue-500" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center gap-3 bg-[#06070a] border border-[#1c212b] rounded-2xl p-4">
                      <s.icon size={20} className={s.color} />
                      <div>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{s.label}</p>
                        <p className={cn("text-lg font-black", s.color)}>{s.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-400">Filtro por Usuário</h4>
                  <button onClick={() => setUserFilter("")} className="text-[10px] text-[#ffcc00] font-bold uppercase tracking-wider hover:underline">Limpar</button>
                </div>
                <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b] flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ffcc00] to-[#e6b800] flex items-center justify-center text-black font-black shrink-0">
                    {(selectedUser?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{selectedUser?.name || "Usuário"}</div>
                    <div className="text-[10px] text-gray-600 truncate">{selectedUser?.email}</div>
                  </div>
                  <button onClick={() => setSelectedUserId(userFilter)}
                    className="h-8 w-8 rounded-xl bg-[#13161d] border border-[#1c212b] flex items-center justify-center hover:bg-[#1c212b] transition-all shrink-0 ml-auto" title="Ver detalhes">
                    <ExternalLink size={14} className="text-gray-500" />
                  </button>
                </div>
                {userStats && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-[#06070a] rounded-xl p-3 border border-[#1c212b] text-center">
                      <div className="text-[18px] font-black text-emerald-400">{userStats.paid}</div>
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Pagos</div>
                    </div>
                    <div className="bg-[#06070a] rounded-xl p-3 border border-[#1c212b] text-center">
                      <div className="text-[18px] font-black text-amber-400">{userStats.pending}</div>
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Pendentes</div>
                    </div>
                    <div className="bg-[#06070a] rounded-xl p-3 border border-[#1c212b] text-center col-span-2">
                      <div className="text-sm font-black text-emerald-400">R$ {userStats.paidAmount.toFixed(2)}</div>
                      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-wider">Total Pago</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </aside>

          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-black uppercase tracking-tight">Depósitos</h1>
                <span className="text-[10px] text-gray-600 font-bold bg-[#13161d] px-2 py-1 rounded-full border border-[#1c212b]">
                  {filteredDeposits.length} registros
                </span>
              </div>
              <button onClick={refreshData || loadData} disabled={loading}
                className="flex items-center gap-2 bg-[#ffcc00] hover:bg-[#ffdb4d] disabled:opacity-60 text-black px-4 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                Atualizar
              </button>
            </div>
            {loading && deposits.length === 0 ? (
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-12 text-center">
                <Loader2 className="mx-auto mb-4 animate-spin text-[#ffcc00]" size={40} />
                <p className="text-sm font-black uppercase tracking-widest text-gray-500">Carregando depósitos...</p>
              </div>
            ) : (
              <AdminDepositsTable deposits={filteredDeposits} />
            )}
          </div>
        </div>

        {selectedUserId && (
          <AdminUserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
        )}
    </div>
  );
}
