import React, { useState, useMemo } from "react";
import { Search, Wallet, ArrowDownToLine, QrCode, CalendarDays, Loader2, User as UserIcon, ShieldCheck, Copy, Check, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminUserDetailModal from "./AdminUserDetailModal";
import AdminBalanceModal from "./AdminBalanceModal";
import AdminSendBonusModal from "./AdminSendBonusModal";

type UserRow = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  real_balance: number;
  role?: string;
  cpf?: string;
  created_at?: string;
  total_deposited: number;
  deposit_count: number;
};

type Props = {
  users: UserRow[];
  onRefresh?: () => void;
};

export default function AdminUsersPage({ users, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [balanceUser, setBalanceUser] = useState<{ id: string; email: string; name: string; currentBalance: number } | null>(null);
  const [bonusEmailUser, setBonusEmailUser] = useState<{ id: string; email: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q) ||
      u.cpf?.includes(q) ||
      u.phone?.includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => ({
    total: users.length,
    withBalance: users.filter(u => u.real_balance > 0).length,
    totalBalance: users.reduce((s, u) => s + Number(u.real_balance || 0), 0),
    totalDeposited: users.reduce((s, u) => s + Number(u.total_deposited || 0), 0),
  }), [users]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de Usuários", value: stats.total, icon: UserIcon, color: "text-blue-400" },
          { label: "Com Saldo", value: stats.withBalance, icon: Wallet, color: "text-emerald-400" },
          { label: "Saldo Total", value: `R$ ${stats.totalBalance.toFixed(2)}`, icon: Wallet, color: "text-[#ffcc00]" },
          { label: "Total Depositado", value: `R$ ${stats.totalDeposited.toFixed(2)}`, icon: ArrowDownToLine, color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={14} className={s.color} />
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</span>
            </div>
            <div className={cn("text-lg font-black", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 bg-[#06070a] rounded-2xl p-2 border border-[#1c212b]">
        <Search size={16} className="text-gray-500 ml-2 shrink-0" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, email, CPF, ID..." autoFocus
          className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none" />
        {search && (
          <button onClick={() => setSearch("")} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-wider mr-2">
            Limpar
          </button>
        )}
        <span className="text-[10px] text-gray-600 font-bold mr-2">{filtered.length} de {users.length}</span>
      </div>

      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">Nenhum usuário encontrado</div>
        ) : (
          filtered.map((u) => (
            <div key={u.id}
              className="bg-[#06070a] border border-[#1c212b] rounded-2xl p-4 hover:border-[#ffcc00]/20 transition-all cursor-pointer"
              onClick={() => setSelectedUserId(u.id)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#ffcc00] to-[#e6b800] flex items-center justify-center text-black text-[10px] font-black shrink-0">
                      {(u.name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{u.name || "Sem nome"}</span>
                        {u.role === "superadmin" && <ShieldCheck size={12} className="text-purple-400 shrink-0" />}
                        {u.role === "admin" && <ShieldCheck size={12} className="text-[#ffcc00] shrink-0" />}
                      </div>
                      <div className="text-[10px] text-gray-600 truncate">{u.email}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-gray-600">CPF</div>
                    <div className="text-[10px] text-gray-400">{u.cpf ? u.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4") : "-"}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-gray-600">Depositado</div>
                    <div className="text-xs font-bold text-emerald-400">R$ {Number(u.total_deposited || 0).toFixed(2)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-gray-600">Saldo</div>
                    <div className="text-sm font-black text-[#ffcc00]">R$ {Number(u.real_balance || 0).toFixed(2)}</div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setBalanceUser({ id: u.id, email: u.email, name: u.name || u.email, currentBalance: Number(u.real_balance || 0) }); }}
                    className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center hover:bg-emerald-500/20 transition-all" title="Gerenciar Saldo">
                    <Wallet size={14} className="text-emerald-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setBonusEmailUser({ id: u.id, email: u.email, name: u.name || u.email }); }}
                    className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center hover:bg-amber-500/20 transition-all" title="Bônus + Email">
                    <Send size={14} className="text-amber-400" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); copyToClipboard(u.id, u.id); }}
                    className="h-8 w-8 rounded-xl bg-[#13161d] border border-[#1c212b] flex items-center justify-center hover:bg-[#1c212b] transition-all" title="Copiar ID">
                    {copiedId === u.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-gray-500" />}
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedUserId && (
        <AdminUserDetailModal userId={selectedUserId} onClose={() => setSelectedUserId(null)} />
      )}

      {balanceUser && (
        <AdminBalanceModal
          user={balanceUser}
          onClose={() => setBalanceUser(null)}
          onSuccess={() => { onRefresh?.(); }}
        />
      )}

      {bonusEmailUser && (
        <AdminSendBonusModal
          user={bonusEmailUser}
          onClose={() => setBonusEmailUser(null)}
          onSuccess={() => { onRefresh?.(); }}
        />
      )}
    </div>
  );
}
