import React, { useState, useMemo } from "react";
import { Search, Mail, DollarSign, Check, Loader2, Send, AlertCircle, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

type UserRow = {
  id: string;
  email: string;
  name?: string;
  real_balance: number;
};

type Props = {
  users: UserRow[];
  onRefresh?: () => void;
};

export default function AdminBonusEmailPage({ users, onRefresh }: Props) {
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("680");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ sent: number; failed: number; errors: string[] } | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(u =>
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const toggleUser = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectAll) {
      setSelectedIds(new Set());
      setSelectAll(false);
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)));
      setSelectAll(true);
    }
  };

  const handleSendMass = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showError("Valor inválido");
      return;
    }
    if (selectedIds.size === 0) {
      showError("Selecione pelo menos um usuário");
      return;
    }

    setLoading(true);
    setResults(null);

    const token = (await supabase.auth.getSession()).data.session?.access_token;
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const userId of selectedIds) {
      try {
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-bonus-email`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ targetUserId: userId, amount: val }),
          }
        );
        const data = await res.json();
        if (res.ok) {
          sent++;
        } else {
          failed++;
          errors.push(data.error || "Erro desconhecido");
        }
      } catch {
        failed++;
      }
    }

    setResults({ sent, failed, errors });
    showSuccess(`${sent} enviado${sent !== 1 ? "s" : ""}, ${failed} falha${failed !== 1 ? "s" : ""}`);
    onRefresh?.();
    setLoading(false);
  };

  const totalBalance = users.reduce((s, u) => s + Number(u.real_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total de Usuários", value: users.length, icon: UserIcon, color: "text-blue-400" },
          { label: "Selecionados", value: selectedIds.size, icon: Check, color: "text-emerald-400" },
          { label: "Valor Total", value: `R$ ${(selectedIds.size * (parseFloat(amount) || 0)).toFixed(2)}`, icon: DollarSign, color: "text-[#ffcc00]" },
          { label: "Saldo Total Plataforma", value: `R$ ${totalBalance.toFixed(2)}`, icon: Mail, color: "text-purple-400" },
        ].map((s, i) => (
          <div key={i} className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
            <div className="flex items-center gap-2 mb-2"><s.icon size={14} className={s.color} /><span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{s.label}</span></div>
            <div className={cn("text-lg font-black", s.color)}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 space-y-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Valor do Bônus (R$)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="0.01"
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Selecionados</label>
            <div className="bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-sm font-bold text-[#ffcc00]">
              {selectedIds.size} de {filtered.length} usuários
            </div>
          </div>
          <button onClick={handleSendMass} disabled={loading || selectedIds.size === 0}
            className="self-end bg-[#ffcc00] text-black px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d] transition-all disabled:opacity-50 flex items-center gap-2 h-[42px]">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Enviando..." : `Enviar para ${selectedIds.size}`}
          </button>
        </div>
      </div>

      {results && (
        <div className={`rounded-2xl p-4 border text-sm font-bold flex items-start gap-3 ${
          results.failed === 0 ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"
        }`}>
          {results.failed === 0 ? <Check size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
          <div>
            {results.sent} bônus enviados com sucesso{results.failed > 0 ? `, ${results.failed} falhas` : ""}
            {results.errors.length > 0 && (
              <div className="mt-2 text-[11px] text-gray-400 max-h-20 overflow-y-auto space-y-1">
                {results.errors.slice(0, 5).map((e, i) => <div key={i}>• {e}</div>)}
                {results.errors.length > 5 && <div>...e mais {results.errors.length - 5} erros</div>}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 bg-[#06070a] rounded-2xl p-2 border border-[#1c212b]">
        <Search size={16} className="text-gray-500 ml-2 shrink-0" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por email, nome ou ID..." className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none" />
        {search && (
          <button onClick={() => setSearch("")} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-wider mr-2">Limpar</button>
        )}
        <span className="text-[10px] text-gray-600 font-bold mr-2">{filtered.length} de {users.length}</span>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={selectAll} onChange={toggleAll}
            className="w-4 h-4 rounded border-gray-600 bg-[#06070a] accent-[#ffcc00]" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Selecionar todos</span>
        </label>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-600 text-sm">Nenhum usuário encontrado</div>
        ) : (
          filtered.map((u) => {
            const selected = selectedIds.has(u.id);
            return (
              <div key={u.id}
                onClick={() => toggleUser(u.id)}
                className={cn(
                  "flex items-center justify-between gap-3 bg-[#06070a] border rounded-2xl p-4 cursor-pointer transition-all",
                  selected ? "border-[#ffcc00]/40 bg-[#ffcc00]/5" : "border-[#1c212b] hover:border-[#ffcc00]/20"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <input type="checkbox" checked={selected} readOnly
                    className="w-4 h-4 rounded border-gray-600 bg-[#06070a] accent-[#ffcc00] shrink-0" />
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#ffcc00] to-[#e6b800] flex items-center justify-center text-black text-[10px] font-black shrink-0">
                    {(u.name || u.email || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">{u.name || "Sem nome"}</div>
                    <div className="text-[10px] text-gray-600 truncate">{u.email}</div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-gray-600">Saldo</div>
                  <div className="text-xs font-black text-[#ffcc00]">R$ {Number(u.real_balance || 0).toFixed(2)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
