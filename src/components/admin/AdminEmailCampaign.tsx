import React, { useState, useEffect, useMemo } from "react";
import { Search, Send, Check, Loader2, AlertCircle, Mail, Users, DollarSign, TrendingUp, Info, Copy, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

type UserRow = {
  id: string;
  email: string;
  name?: string;
  real_balance: number;
  hasDeposit: boolean;
  totalDeposits: number;
};

type CampaignRow = {
  id: string;
  subject: string;
  total_sent: number;
  liveDeposited: number;
  liveValue: number;
  liveRate: number;
  created_at: string;
};

const DEFAULT_SUBJECT = "R$680 dispon\u00edvel para saque na PixBett";

const DEFAULT_TEMPLATE = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06070a;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0f14;border-radius:16px;overflow:hidden;border:1px solid #1c212b">
  <tr><td style="background:linear-gradient(135deg,#ffcc00,#e6b800);padding:32px;text-align:center">
    <h1 style="margin:0;color:#000;font-size:28px;font-weight:900">\uD83C\uDFB2 PixBett</h1>
    <p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;font-weight:600">VOC\u00ca TEM R$680 DISPON\u00cdVEL</p>
  </td></tr>
  <tr><td style="padding:32px">
    <p style="color:#ffffff;font-size:18px;margin:0 0 16px">Fala comigo <strong>{{firstName}}</strong>,</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 8px">Voc\u00ea ainda tem <strong style="color:#ffcc00">R$680 reais</strong> \u2014 divirta-se ou saque agora.</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px">PixBett, o lugar certo pra voc\u00ea jogar.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td align="center" style="background:linear-gradient(135deg,#ffcc00,#e6b800);border-radius:12px;padding:0">
        <a href="https://www.pixbet.lat" style="display:inline-block;padding:16px 48px;color:#000;text-decoration:none;font-size:18px;font-weight:800;border-radius:12px">\uD83C\uDFB2 ACESSAR AGORA</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid #1c212b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">\u00A9 2026 PixBett. Todos os direitos reservados.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`;

export default function AdminEmailCampaign() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [filter, setFilter] = useState<"all" | "with" | "without">("all");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-campaign-stats`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({}),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha ao carregar dados");
      }
      const data = await res.json();
      setUsers(data.users || []);
      setCampaigns(data.campaigns || []);
    } catch (err: any) {
      setLoadError(err.message);
    }
    setLoading(false);
  };

  const totalComDeposito = users.filter(u => u.hasDeposit).length;
  const totalSemDeposito = users.filter(u => !u.hasDeposit).length;

  const filteredUsers = useMemo(() => {
    let list = users;
    if (filter === "with") list = list.filter(u => u.hasDeposit);
    else if (filter === "without") list = list.filter(u => !u.hasDeposit);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        (u.email || "").toLowerCase().includes(q) ||
        (u.name || "").toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, filter, search]);

  const toggleUser = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectedAll = () => {
    const ids = filteredUsers.map(u => u.id);
    const allIn = ids.every(id => selectedIds.has(id));
    if (allIn) {
      setSelectedIds(new Set([...selectedIds].filter(id => !ids.includes(id))));
    } else {
      setSelectedIds(new Set([...selectedIds, ...ids]));
    }
  };

  const handleSend = async () => {
    if (selectedIds.size === 0) { showError("Selecione pelo menos um usuário"); return; }
    if (!subject.trim()) { showError("Assunto obrigatório"); return; }
    if (!template.trim()) { showError("Template obrigatório"); return; }
    setSending(true);
    setSendError("");
    try {
      const recipients = users.filter(u => selectedIds.has(u.id)).map(u => ({
        userId: u.id, email: u.email, firstName: (u.name || u.email).split(" ")[0],
      }));
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-marketing-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subject: subject.trim(), bodyHtml: template, recipients }),
        },
      );
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Falha no envio");
      }
      const data = await res.json();
      showSuccess(`${data.sent} emails enviados!`);
      setSelectedIds(new Set());
      loadData();
    } catch (err: any) {
      setSendError(err.message);
      showError(err.message);
    }
    setSending(false);
  };

  const allSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id));

  return (
    <div className="space-y-6 max-w-5xl">
      {loadError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-6 text-center">
          <AlertCircle size={24} className="text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-bold text-sm mb-1">Erro ao carregar dados</p>
          <p className="text-gray-500 text-xs mb-4">{loadError}</p>
          <button onClick={loadData} className="bg-[#ffcc00] text-black px-6 py-2 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d]">
            Tentar Novamente
          </button>
        </div>
      )}

      {campaigns.length > 0 && (
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp size={20} className="text-[#ffcc00]" />
            <h3 className="text-lg font-black uppercase tracking-wider">Resultado das Campanhas</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total Enviados", value: campaigns.reduce((s, c) => s + c.total_sent, 0), color: "text-white" },
              { label: "Depositaram", value: campaigns.reduce((s, c) => s + c.liveDeposited, 0), color: "text-emerald-400" },
              { label: "Valor Recuperado", value: `R$ ${campaigns.reduce((s, c) => s + c.liveValue, 0).toFixed(2)}`, color: "text-[#ffcc00]" },
              { label: "Conversão", value: campaigns.length > 0 ? `${(campaigns.reduce((s, c) => s + c.liveRate, 0) / campaigns.length).toFixed(1)}%` : "0%", color: "text-purple-400" },
            ].map((s, i) => (
              <div key={i} className="bg-[#06070a] rounded-xl p-4 border border-[#1c212b]">
                <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">{s.label}</div>
                <div className={cn("text-2xl font-black", s.color)}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 font-bold uppercase tracking-wider border-b border-[#1c212b]">
                  <th className="text-left py-2 px-2">Campanha</th>
                  <th className="text-right py-2 px-2">Enviados</th>
                  <th className="text-right py-2 px-2">Depósitos</th>
                  <th className="text-right py-2 px-2">Valor</th>
                  <th className="text-right py-2 px-2">Conversão</th>
                  <th className="text-right py-2 px-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map(c => (
                  <tr key={c.id} className="border-b border-[#1c212b]/50">
                    <td className="py-2 px-2 text-white font-bold truncate max-w-[180px]">{c.subject}</td>
                    <td className="py-2 px-2 text-right text-white">{c.total_sent}</td>
                    <td className="py-2 px-2 text-right text-emerald-400">{c.liveDeposited}</td>
                    <td className="py-2 px-2 text-right text-[#ffcc00]">R$ {c.liveValue.toFixed(2)}</td>
                    <td className="py-2 px-2 text-right text-purple-400">{c.liveRate}%</td>
                    <td className="py-2 px-2 text-right text-gray-500">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail size={20} className="text-[#ffcc00]" />
          <h3 className="text-lg font-black uppercase tracking-wider">Criar Campanha</h3>
          <span className="text-[10px] text-gray-500 ml-auto">{selectedIds.size} selecionados</span>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Assunto do Email</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50" />
          </div>

          <div>
            <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1">Template HTML</label>
            <textarea value={template} onChange={e => setTemplate(e.target.value)}
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-xs font-mono focus:outline-none focus:border-[#ffcc00]/50 h-[200px] resize-y" />
          </div>

          <div className="flex items-center gap-2 text-[10px] text-gray-500">
            <Info size={12} />
            <span>Use <code className="text-[#ffcc00] bg-[#06070a] px-1 rounded">{`{{firstName}}`}</code> para personalizar o nome</span>
            <button onClick={() => { navigator.clipboard.writeText("{{firstName}}"); showSuccess("Copiado!"); }}
              className="text-[#ffcc00] hover:underline flex items-center gap-1"><Copy size={10} />Copiar</button>
          </div>
        </div>
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Users size={20} className="text-[#ffcc00]" />
          <h3 className="text-lg font-black uppercase tracking-wider">Usuários</h3>
          {loading && <Loader2 size={14} className="animate-spin text-[#ffcc00]" />}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "all" as const, label: `Todos (${users.length})` },
            { key: "with" as const, label: `Com Depósito (${totalComDeposito})` },
            { key: "without" as const, label: `Sem Depósito (${totalSemDeposito})` },
          ].map(f => (
            <button key={f.key} onClick={() => { setFilter(f.key); setSearch(""); }}
              className={cn("px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all",
                filter === f.key ? "bg-[#ffcc00] text-black" : "bg-[#1c212b] text-gray-400 hover:text-white"
              )}>
              {f.label}
            </button>
          ))}
          <button onClick={loadData} disabled={loading}
            className="px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider bg-[#1c212b] text-gray-400 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1">
            <RefreshCw size={12} className={cn(loading && "animate-spin")} /> Atualizar
          </button>
        </div>

        <div className="flex items-center gap-3 bg-[#06070a] rounded-2xl p-2 border border-[#1c212b] mb-4">
          <Search size={16} className="text-gray-500 ml-2 shrink-0" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por email, nome ou ID..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-600 focus:outline-none" />
          {search ? (
            <button onClick={() => setSearch("")} className="text-[10px] text-gray-500 hover:text-white font-bold uppercase tracking-wider mr-2">Limpar</button>
          ) : (
            <span className="text-[10px] text-gray-600 font-bold mr-2">{filteredUsers.length}</span>
          )}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectedAll}
              className="w-4 h-4 rounded border-gray-600 bg-[#06070a] accent-[#ffcc00]" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              {allSelected ? "Desmarcar todos" : "Selecionar todos"}
            </span>
          </label>
        </div>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {!loading && filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-gray-600 text-sm">Nenhum usuário encontrado</div>
          ) : (
            filteredUsers.map(u => {
              const sel = selectedIds.has(u.id);
              return (
                <div key={u.id} onClick={() => toggleUser(u.id)}
                  className={cn("flex items-center justify-between gap-3 bg-[#06070a] border rounded-2xl p-4 cursor-pointer transition-all",
                    sel ? "border-[#ffcc00]/40 bg-[#ffcc00]/5" : "border-[#1c212b] hover:border-[#ffcc00]/20"
                  )}>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <input type="checkbox" checked={sel} readOnly
                      className="w-4 h-4 rounded border-gray-600 accent-[#ffcc00] shrink-0" />
                    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center text-black text-xs font-black shrink-0",
                      u.hasDeposit ? "bg-emerald-400" : "bg-[#ffcc00]"
                    )}>
                      {(u.name || u.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-white truncate leading-tight">{u.name || "Sem nome"}</div>
                      <div className="text-[10px] text-gray-600 truncate">{u.email}</div>
                      {u.totalDeposits > 0 && (
                        <div className="text-[8px] text-emerald-500 font-bold mt-0.5">
                          {u.totalDeposits.toFixed(2)} em depósitos
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-[10px] text-gray-600">Saldo</div>
                    <div className="text-sm font-black text-[#ffcc00]">{u.real_balance.toFixed(2)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
        <button onClick={handleSend} disabled={sending || selectedIds.size === 0 || loading}
          className="w-full bg-[#ffcc00] text-black py-4 rounded-xl text-sm font-black uppercase hover:bg-[#ffdb4d] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {sending ? "Enviando campanha..." : `Enviar Campanha para ${selectedIds.size} usuário${selectedIds.size !== 1 ? "s" : ""}`}
        </button>
        {selectedIds.size > 0 && (
          <p className="text-[10px] text-gray-500 text-center mt-2">
            {users.filter(u => selectedIds.has(u.id) && u.hasDeposit).length} com depósito · {users.filter(u => selectedIds.has(u.id) && !u.hasDeposit).length} sem depósito
          </p>
        )}
        {sendError && (
          <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
            <p className="text-red-400 text-xs font-bold">{sendError}</p>
          </div>
        )}
      </div>
    </div>
  );
}
