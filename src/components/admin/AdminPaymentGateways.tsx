import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Power, PowerOff, Check, X, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

type PaymentGateway = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  config: Record<string, any>;
  created_at: string;
};

export default function AdminPaymentGateways() {
  const [gateways, setGateways] = useState<PaymentGateway[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    public_key: "",
    secret_key: "",
    api_key: "",
    webhook_secret: "",
    webhook_url: "",
    base_url: "",
  });

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("payment_gateways")
      .select("*")
      .order("created_at", { ascending: true });
    setGateways((data || []) as PaymentGateway[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchGateways(); }, [fetchGateways]);

  const resetForm = () => setForm({
    name: "", slug: "", public_key: "", secret_key: "",
    api_key: "", webhook_secret: "", webhook_url: "", base_url: "",
  });

  const handleAdd = async () => {
    if (!form.name || !form.slug) {
      showError("Nome e slug são obrigatórios");
      return;
    }
    const config: Record<string, any> = {};
    if (form.public_key) config.public_key = form.public_key;
    if (form.secret_key) config.secret_key = form.secret_key;
    if (form.api_key) config.api_key = form.api_key;
    if (form.webhook_secret) config.webhook_secret = form.webhook_secret;
    if (form.webhook_url) config.webhook_url = form.webhook_url;
    if (form.base_url) config.base_url = form.base_url;

    const activeCount = gateways.filter(g => g.is_active).length;
    const isFirst = gateways.length === 0;

    const { error } = await supabase.from("payment_gateways").insert({
      name: form.name,
      slug: form.slug,
      is_active: isFirst,
      config,
    });
    if (error) { showError(error.message); return; }
    showSuccess("Gateway adicionado");
    resetForm();
    setAdding(false);
    fetchGateways();
  };

  const handleUpdate = async (id: string) => {
    const config: Record<string, any> = {};
    if (form.public_key) config.public_key = form.public_key;
    if (form.secret_key) config.secret_key = form.secret_key;
    if (form.api_key) config.api_key = form.api_key;
    if (form.webhook_secret) config.webhook_secret = form.webhook_secret;
    if (form.webhook_url) config.webhook_url = form.webhook_url;
    if (form.base_url) config.base_url = form.base_url;

    const { error } = await supabase
      .from("payment_gateways")
      .update({ name: form.name, config })
      .eq("id", id);
    if (error) { showError(error.message); return; }
    setEditingId(null);
    fetchGateways();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("payment_gateways").delete().eq("id", id);
    if (error) { showError(error.message); return; }
    showSuccess("Gateway removido");
    fetchGateways();
  };

  const handleToggleActive = async (gw: PaymentGateway) => {
    if (gw.is_active) {
      showError("Desative o gateway atual antes de ativar outro");
      return;
    }
    // Desativa todos primeiro
    const { error } = await supabase
      .from("payment_gateways")
      .update({ is_active: false })
      .not("id", "is", null);

    if (error) { showError(error.message); return; }

    const { error: activateError } = await supabase
      .from("payment_gateways")
      .update({ is_active: true })
      .eq("id", gw.id);

    if (activateError) { showError(activateError.message); return; }

    showSuccess(`${gw.name} ativado como gateway principal`);
    fetchGateways();
  };

  const startEdit = (gw: PaymentGateway) => {
    const c = gw.config || {};
    setForm({
      name: gw.name,
      slug: gw.slug,
      public_key: c.public_key || "",
      secret_key: c.secret_key || "",
      api_key: c.api_key || "",
      webhook_secret: c.webhook_secret || "",
      webhook_url: c.webhook_url || "",
      base_url: c.base_url || "",
    });
    setEditingId(gw.id);
  };

  return (
    <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-black uppercase tracking-wider">Gateways de Pagamento</h3>
        <button onClick={() => { resetForm(); setAdding(true); }}
          className="flex items-center gap-2 bg-[#ffcc00] text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-[#ffdb4d] transition-all">
          <Plus size={16} /> Adicionar Gateway
        </button>
      </div>

      {adding && (
        <div className="bg-[#13161d] border border-[#ffcc00]/30 rounded-2xl p-4 mb-6 space-y-3 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: PagouPay"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Slug (identificador)</label>
              <input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                placeholder="Ex: pagoupay"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Public Key (pk)</label>
              <input value={form.public_key} onChange={e => setForm(f => ({ ...f, public_key: e.target.value }))}
                placeholder="pk_live_..."
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Secret Key (sk)</label>
              <input value={form.secret_key} onChange={e => setForm(f => ({ ...f, secret_key: e.target.value }))}
                placeholder="sk_live_..."
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">API Key (PagNow)</label>
              <input value={form.api_key} onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                placeholder="apikey PagNow"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Webhook Secret</label>
              <input value={form.webhook_secret} onChange={e => setForm(f => ({ ...f, webhook_secret: e.target.value }))}
                placeholder="whsec_..."
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none font-mono text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Webhook URL</label>
              <input value={form.webhook_url} onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))}
                placeholder="https://..."
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none text-xs" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Base URL</label>
              <input value={form.base_url} onChange={e => setForm(f => ({ ...f, base_url: e.target.value }))}
                placeholder="https://api.exemplo.com"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none text-xs" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setAdding(false); resetForm(); }}
              className="text-[10px] text-gray-500 font-black uppercase px-4 py-2 rounded-xl border border-[#1c212b] hover:text-white">Cancelar</button>
            <button onClick={handleAdd}
              className="flex items-center gap-1 bg-[#ffcc00] text-black font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider hover:bg-[#ffdb4d]">
              <Check size={14} /> Salvar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-[#ffcc00]" size={24} />
        </div>
      ) : gateways.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm font-bold">Nenhum gateway cadastrado.</p>
          <p className="text-gray-600 text-[10px] mt-1">Adicione um gateway de pagamento (PagNow, PagouPay, etc).</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#1c212b]">
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Ativo</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Nome</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Slug</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Chaves</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c212b]/50">
              {gateways.map(gw => {
                const cfg = gw.config || {};
                return (
                  <tr key={gw.id} className="hover:bg-white/[0.02] transition-colors">
                    {editingId === gw.id ? (
                      <>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-1 rounded-lg ${gw.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-gray-600 bg-white/5"}`}>
                            {gw.is_active ? "PRINCIPAL" : "INATIVO"}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
                        </td>
                        <td className="px-3 py-3">
                          <code className="text-xs text-gray-400">{gw.slug}</code>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-1">
                            {cfg.public_key && <div className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">pk: {cfg.public_key.substring(0, 16)}...</div>}
                            {cfg.secret_key && <div className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">sk: {cfg.secret_key.substring(0, 16)}...</div>}
                            {cfg.api_key && !cfg.public_key && <div className="text-[10px] font-mono text-gray-500 truncate max-w-[200px]">api: {cfg.api_key.substring(0, 16)}...</div>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            <button onClick={() => handleUpdate(gw.id)}
                              className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
                              <Check size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20">
                              <X size={14} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleToggleActive(gw)}
                              disabled={gw.is_active}
                              className={`p-1.5 rounded-lg transition-all ${gw.is_active ? "text-emerald-400 bg-emerald-500/10 cursor-not-allowed" : "text-gray-600 bg-white/5 hover:text-emerald-400 hover:bg-emerald-500/10"}`}>
                              {gw.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                            </button>
                            {gw.is_active && (
                              <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">ATIVO</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="font-bold text-sm text-white">{gw.name}</span>
                        </td>
                        <td className="px-3 py-3">
                          <code className="text-xs text-gray-300 bg-[#06070a] px-2 py-1 rounded-lg">{gw.slug}</code>
                        </td>
                        <td className="px-3 py-3">
                          <div className="space-y-0.5">
                            {cfg.public_key && <div className="text-[10px] font-mono text-gray-500">pk: {cfg.public_key.substring(0, 20)}...</div>}
                            {cfg.secret_key && <div className="text-[10px] font-mono text-gray-500">sk: {cfg.secret_key.substring(0, 20)}...</div>}
                            {cfg.api_key && !cfg.public_key && <div className="text-[10px] font-mono text-gray-500">api: {cfg.api_key.substring(0, 20)}...</div>}
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1.5 items-center">
                            <button onClick={() => startEdit(gw)}
                              className="text-[10px] font-black uppercase text-gray-500 hover:text-white px-2.5 py-1.5 rounded-lg border border-[#1c212b] hover:border-gray-500 transition-all">
                              Editar
                            </button>
                            <button onClick={() => { if (confirm(`Remover gateway "${gw.name}"?`)) handleDelete(gw.id); }}
                              className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-[#1c212b] text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all">
                              <Trash2 size={12} /> Excluir
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
