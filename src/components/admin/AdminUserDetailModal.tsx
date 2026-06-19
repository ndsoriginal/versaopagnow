import React, { useState, useEffect } from "react";
import { X, User, Wallet, ArrowDownToLine, QrCode, History, Search, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchAdminDashboardData } from "@/services/adminDashboard";
import { cn } from "@/lib/utils";
import AdminBalanceModal from "./AdminBalanceModal";

type Props = {
  userId: string;
  onClose: () => void;
};

type Tab = "info" | "saldo" | "deposits" | "pix" | "transactions";

type Deposit = {
  id: string; user_id: string; amount: number; type: string; status: string; pix_code: string; created_at: string;
  email?: string; name?: string; phone?: string; role?: string;
};

type PixRequest = {
  id: string; user_id: string; cpf: string; amount: number; transaction_id: string; qr_code: string; pix_code: string; status: string; created_at: string;
};

export default function AdminUserDetailModal({ userId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [transactions, setTransactions] = useState<Deposit[]>([]);
  const [pixRequests, setPixRequests] = useState<PixRequest[]>([]);
  const [showBalanceModal, setShowBalanceModal] = useState(false);
  const [depositFilter, setDepositFilter] = useState<"all" | "deposit" | "withdraw">("all");

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: "info", label: "Info", icon: User },
    { id: "saldo", label: "Saldo", icon: Wallet },
    { id: "deposits", label: "Depósitos", icon: ArrowDownToLine },
    { id: "pix", label: "PIX", icon: QrCode },
    { id: "transactions", label: "Extrato", icon: History },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const dbData = await fetchAdminDashboardData();
      const allProfiles = dbData?.users || [];

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userInfo = authUser?.user || null;

      const allTxs = (dbData?.deposits || []).filter((d: Deposit) => d.user_id === userId);
      const allPix = (dbData?.pixRequests || []).filter((p: PixRequest) => p.user_id === userId);

      const profileData = allProfiles.find((p: any) => p.id === userId) || {};

      setUserData(userInfo);
      setProfile(profileData);
      setTransactions(allTxs);
      setPixRequests(allPix);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [userId]);

  const filteredTxs = transactions.filter(t => depositFilter === "all" || t.type === depositFilter);

  const formatDate = (d: string) => {
    if (!d) return "-";
    const date = new Date(d);
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const userEmail = userData?.email || profile?.email || "";
  const userName = profile?.first_name || userEmail.split("@")[0] || "Jogador";
  const userBalance = Number(profile?.real_balance || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-[#1c212b] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#ffcc00] to-[#e6b800] flex items-center justify-center text-black font-black text-sm shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white truncate">{userName}</h3>
              <p className="text-[10px] text-gray-500 truncate">{userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden sm:block text-right">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Saldo</div>
              <div className="text-sm font-black text-[#ffcc00]">R$ {userBalance.toFixed(2)}</div>
            </div>
            <button onClick={onClose} className="h-8 w-8 rounded-xl bg-[#13161d] border border-[#1c212b] flex items-center justify-center hover:bg-[#1c212b] transition-all"><X size={14} /></button>
          </div>
        </div>

        <div className="flex gap-1 p-3 sm:p-4 border-b border-[#1c212b] overflow-x-auto shrink-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all shrink-0",
                  activeTab === tab.id ? "bg-[#ffcc00] text-black" : "text-gray-500 hover:text-white bg-[#13161d]"
                )}
              >
                <Icon size={12} /> {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48"><Loader2 className="animate-spin text-[#ffcc00]" size={32} /></div>
          ) : (
            <>
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Email</div>
                      <div className="text-sm font-bold text-white mt-1 break-all">{userEmail || "-"}</div>
                    </div>
                    <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nome</div>
                      <div className="text-sm font-bold text-white mt-1">{profile?.first_name || "-"}</div>
                    </div>
                    <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">CPF</div>
                      <div className="text-sm font-bold text-white mt-1">{profile?.cpf || "-"}</div>
                    </div>
                    <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Telefone</div>
                      <div className="text-sm font-bold text-white mt-1">{profile?.phone || "-"}</div>
                    </div>
                    <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tipo de Conta</div>
                      <div className="mt-1">
                        <span className={cn("text-[11px] font-black px-2 py-0.5 rounded-full border",
                          profile?.role === "superadmin" ? "text-purple-400 border-purple-500/30 bg-purple-500/10" :
                          profile?.role === "admin" ? "text-[#ffcc00] border-[#ffcc00]/30 bg-[#ffcc00]/10" :
                          profile?.role === "demo" ? "text-blue-400 border-blue-500/30 bg-blue-500/10" :
                          "text-gray-400 border-gray-500/30 bg-gray-500/10"
                        )}>
                          {profile?.role || "user"}
                        </span>
                      </div>
                    </div>
                    <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Cadastro</div>
                      <div className="text-sm font-bold text-white mt-1">{formatDate(userData?.created_at)}</div>
                    </div>
                  </div>
                  <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">ID do Usuário</div>
                    <div className="text-xs font-mono text-gray-400 mt-1 break-all">{userId}</div>
                  </div>
                </div>
              )}

              {activeTab === "saldo" && (
                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-[#0d0f14] to-[#06070a] rounded-2xl p-6 border border-[#1c212b] text-center">
                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-wider mb-2">Saldo Atual (Real)</div>
                    <div className="text-4xl sm:text-5xl font-black text-[#ffcc00] drop-shadow-[0_0_20px_rgba(255,204,0,0.3)]">
                      R$ {userBalance.toFixed(2)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowBalanceModal(true)}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition-all active:scale-[0.98]">
                      Adicionar Saldo
                    </button>
                    <button onClick={() => setShowBalanceModal(true)}
                      className="bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition-all active:scale-[0.98]">
                      Remover Saldo
                    </button>
                  </div>
                  <button onClick={() => { setShowBalanceModal(true); }}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition-all active:scale-[0.98]">
                    Ajustar Saldo
                  </button>
                </div>
              )}

              {activeTab === "deposits" && (
                <div className="space-y-3">
                  <div className="flex gap-1">
                    {(["all", "deposit", "withdraw"] as const).map(f => (
                      <button key={f} onClick={() => setDepositFilter(f)}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                          depositFilter === f ? "bg-[#ffcc00] text-black" : "bg-[#13161d] text-gray-500 hover:text-white"
                        )}>
                        {f === "all" ? "Todos" : f === "deposit" ? "Entradas" : "Saídas"}
                      </button>
                    ))}
                    <span className="text-[10px] text-gray-600 font-bold ml-auto self-center">{filteredTxs.length} registros</span>
                  </div>
                  {filteredTxs.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 text-sm">Nenhuma transação encontrada</div>
                  ) : (
                    <div className="space-y-2">
                      {filteredTxs.map((tx) => (
                        <div key={tx.id} className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b] flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn("text-xs font-black", tx.type === "deposit" ? "text-emerald-400" : "text-red-400")}>
                                {tx.type === "deposit" ? "DEPÓSITO" : "SAQUE"}
                              </span>
                              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                                tx.status === "completed" || tx.status === "paid" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                                tx.status === "pending" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                                "text-red-400 border-red-500/30 bg-red-500/10"
                              )}>{tx.status}</span>
                            </div>
                            <div className="text-[10px] text-gray-600 mt-1">{formatDate(tx.created_at)}</div>
                            {tx.pix_code && <div className="text-[10px] text-gray-600 font-mono truncate max-w-[200px] mt-0.5">{tx.pix_code}</div>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className={cn("text-sm font-black", tx.type === "deposit" ? "text-emerald-400" : "text-red-400")}>
                              {tx.type === "deposit" ? "+" : "-"}R$ {Number(tx.amount).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "pix" && (
                <div className="space-y-3">
                  {pixRequests.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 text-sm">Nenhuma solicitação PIX encontrada</div>
                  ) : (
                    pixRequests.map((pix) => (
                      <div key={pix.id} className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-white">R$ {Number(pix.amount).toFixed(2)}</span>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                              pix.status === "paid" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                              pix.status === "pending" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                              "text-red-400 border-red-500/30 bg-red-500/10"
                            )}>{pix.status}</span>
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1">CPF: {pix.cpf}</div>
                          <div className="text-[10px] text-gray-600">{formatDate(pix.created_at)}</div>
                        </div>
                        <div className="shrink-0">
                          <span className={cn("text-[10px] font-black px-2 py-1 rounded-full",
                            pix.status === "paid" ? "text-emerald-400 bg-emerald-500/10" :
                            pix.status === "pending" ? "text-yellow-400 bg-yellow-500/10" : "text-red-400 bg-red-500/10"
                          )}>
                            {pix.status === "paid" ? "Pago" : pix.status === "pending" ? "Aguardando" : "Expirado"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === "transactions" && (
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="text-center py-12 text-gray-600 text-sm">Nenhuma transação encontrada</div>
                  ) : (
                    transactions.map((tx) => (
                      <div key={tx.id} className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b] flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={cn("text-xs font-black", tx.type === "deposit" ? "text-emerald-400" : "text-red-400")}>
                              {tx.type === "deposit" ? "ENTRADA" : "SAÍDA"}
                            </span>
                            <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border",
                              tx.status === "completed" || tx.status === "paid" ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" :
                              tx.status === "pending" ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/10" :
                              "text-red-400 border-red-500/30 bg-red-500/10"
                            )}>{tx.status}</span>
                          </div>
                          <div className="text-[10px] text-gray-600 mt-1">{formatDate(tx.created_at)}</div>
                          {tx.pix_code && <div className="text-[10px] text-gray-600 font-mono truncate max-w-[250px] mt-0.5">{tx.pix_code}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className={cn("text-sm font-black", tx.type === "deposit" ? "text-emerald-400" : "text-red-400")}>
                            {tx.type === "deposit" ? "+" : "-"}R$ {Number(tx.amount).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showBalanceModal && (
        <AdminBalanceModal
          user={{ id: userId, email: userEmail, name: userName, currentBalance: userBalance }}
          onClose={() => setShowBalanceModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
