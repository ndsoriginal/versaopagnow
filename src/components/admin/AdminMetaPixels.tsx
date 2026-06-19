import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, Power, PowerOff, TestTube, Check, X, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { reloadMetaPixels } from "@/utils/metaPixel";

const META_EVENTS = [
  "PageView", "ViewContent", "Search", "AddToCart", "AddToWishlist",
  "InitiateCheckout", "AddPaymentInfo", "Purchase", "Lead",
  "CompleteRegistration", "Contact", "CustomizeProduct", "Donate",
  "FindLocation", "Schedule", "StartTrial", "SubmitApplication", "Subscribe",
];

type MetaPixel = {
  id: string;
  name: string;
  pixel_id: string;
  api_token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminMetaPixels() {
  const [pixels, setPixels] = useState<MetaPixel[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testNames, setTestNames] = useState<Record<string, string>>({});
  const [testCodes, setTestCodes] = useState<Record<string, string>>({});

  const [form, setForm] = useState({ name: "", pixel_id: "", api_token: "" });

  const fetchPixels = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("meta_pixels")
      .select("*")
      .order("created_at", { ascending: false });
    setPixels((data || []) as MetaPixel[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPixels(); }, [fetchPixels]);

  const resetForm = () => setForm({ name: "", pixel_id: "", api_token: "" });

  const handleAdd = async () => {
    if (!form.name || !form.pixel_id) {
      showError("Nome e Pixel ID são obrigatórios");
      return;
    }
    const { error } = await supabase.from("meta_pixels").insert({
      name: form.name,
      pixel_id: form.pixel_id,
      api_token: form.api_token,
      is_active: true,
    });
    if (error) {
      showError(error.message);
      return;
    }
    showSuccess("Pixel adicionado");
    resetForm();
    setAdding(false);
    fetchPixels();
    reloadMetaPixels();
  };

  const handleUpdate = async (id: string, updates: Partial<MetaPixel>) => {
    const { error } = await supabase.from("meta_pixels").update(updates).eq("id", id);
    if (error) { showError(error.message); return; }
    setEditingId(null);
    fetchPixels();
    reloadMetaPixels();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("meta_pixels").delete().eq("id", id);
    if (error) { showError(error.message); return; }
    showSuccess("Pixel removido");
    fetchPixels();
    reloadMetaPixels();
  };

  const handleToggleActive = async (p: MetaPixel) => {
    await handleUpdate(p.id, { is_active: !p.is_active });
  };

  const handleTest = async (p: MetaPixel) => {
    const eventName = testNames[p.id]?.trim() || "PageView";
    const testCode = testCodes[p.id]?.trim() || "";
    setTestingId(p.id);
    try {
      if (typeof window !== "undefined" && (window as any).fbq) {
        (window as any).fbq("init", p.pixel_id);
        (window as any).fbq("track", eventName);
      }
      const { error } = await supabase.functions.invoke("track-meta-event", {
        body: {
          event_name: eventName,
          test_event_code: testCode || undefined,
          pixel_id: p.pixel_id,
          api_token: p.api_token || undefined,
          user_agent: navigator.userAgent,
          ip: "127.0.0.1",
        },
      });
      if (error) throw error;
      showSuccess(`"${eventName}"${testCode ? ` (${testCode})` : ""} enviado para ${p.name} (${p.pixel_id})`);
    } catch (err: any) {
      showError(err.message || "Erro no teste");
    }
    setTestingId(null);
  };

  const startEdit = (p: MetaPixel) => {
    setForm({ name: p.name, pixel_id: p.pixel_id, api_token: p.api_token });
    setEditingId(p.id);
  };

  return (
    <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h3 className="text-lg font-black uppercase tracking-wider">Meta Pixels</h3>
        <button onClick={() => { resetForm(); setAdding(true); }}
          className="flex items-center justify-center gap-2 bg-[#ffcc00] text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider hover:bg-[#ffdb4d] transition-all w-full sm:w-auto">
          <Plus size={16} /> Adicionar Pixel
        </button>
      </div>

      {adding && (
        <div className="bg-[#13161d] border border-[#ffcc00]/30 rounded-2xl p-4 mb-6 space-y-3 animate-in fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Pixel Principal"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">Pixel ID</label>
              <input value={form.pixel_id} onChange={e => setForm(f => ({ ...f, pixel_id: e.target.value }))}
                placeholder="Ex: 1234567890"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest block mb-1">API Token (opcional)</label>
              <input value={form.api_token} onChange={e => setForm(f => ({ ...f, api_token: e.target.value }))}
                placeholder="Token CAPI"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
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
      ) : pixels.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm font-bold">Nenhum pixel cadastrado.</p>
          <p className="text-gray-600 text-[10px] mt-1">Adicione pixels do Meta/Facebook para tracking.</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-left min-w-[500px] sm:min-w-0">
            <thead>
              <tr className="border-b border-[#1c212b]">
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Ativo</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Nome</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Pixel ID</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Token</th>
                <th className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-3 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c212b]/50">
              {pixels.map(p => (
                <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                  {editingId === p.id ? (
                    <>
                      <td className="px-3 py-3">
                        <button onClick={() => handleToggleActive(p)}
                          className={`p-1.5 rounded-lg ${p.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-gray-600 bg-white/5"}`}>
                          {p.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                          className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
                      </td>
                      <td className="px-3 py-3">
                        <input value={form.pixel_id} onChange={e => setForm(f => ({ ...f, pixel_id: e.target.value }))}
                          className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2 text-sm text-white focus:border-[#ffcc00] focus:outline-none" />
                      </td>
                      <td className="px-3 py-3">
                        <input value={form.api_token} onChange={e => setForm(f => ({ ...f, api_token: e.target.value }))}
                          className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2 text-sm text-white focus:border-[#ffcc00] focus:outline-none font-mono text-xs" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdate(p.id, form)}
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
                        <button onClick={() => handleToggleActive(p)}
                          className={`p-1.5 rounded-lg transition-all ${p.is_active ? "text-emerald-400 bg-emerald-500/10" : "text-gray-600 bg-white/5"}`}>
                          {p.is_active ? <Power size={14} /> : <PowerOff size={14} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="font-bold text-sm text-white">{p.name}</span>
                      </td>
                      <td className="px-3 py-3">
                        <code className="text-xs text-gray-300 bg-[#06070a] px-2 py-1 rounded-lg">{p.pixel_id}</code>
                      </td>
                      <td className="px-3 py-3">
                        {p.api_token ? (
                          <code className="text-[10px] text-gray-500 font-mono">
                            {p.api_token.substring(0, 12)}...
                          </code>
                        ) : (
                          <span className="text-[10px] text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex gap-1.5 items-center flex-wrap">
                          <input value={testNames[p.id] || ""} onChange={e => setTestNames(t => ({ ...t, [p.id]: e.target.value }))}
                            list={`events-${p.id}`} placeholder="PageView"
                            className="w-20 bg-[#06070a] border border-[#1c212b] rounded-lg px-2 py-1.5 text-[10px] text-white focus:border-purple-500 focus:outline-none" />
                          <datalist id={`events-${p.id}`}>
                            {META_EVENTS.map(e => <option key={e} value={e} />)}
                          </datalist>
                          <input value={testCodes[p.id] || ""} onChange={e => setTestCodes(t => ({ ...t, [p.id]: e.target.value }))}
                            placeholder="TEST00000"
                            className="w-20 bg-[#06070a] border border-[#1c212b] rounded-lg px-2 py-1.5 text-[10px] text-yellow-400/80 focus:border-yellow-500 focus:outline-none" />
                          <button onClick={() => startEdit(p)}
                            className="text-[10px] font-black uppercase text-gray-500 hover:text-white px-2.5 py-1.5 rounded-lg border border-[#1c212b] hover:border-gray-500 transition-all">
                            Editar
                          </button>
                          <button onClick={() => handleTest(p)} disabled={testingId === p.id}
                            className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-[#1c212b] text-purple-400 hover:text-purple-300 hover:border-purple-500/30 transition-all disabled:opacity-50">
                            {testingId === p.id ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                            Testar
                          </button>
                          <button onClick={() => { if (confirm(`Remover pixel "${p.name}"?`)) handleDelete(p.id); }}
                            className="flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg border border-[#1c212b] text-red-400 hover:text-red-300 hover:border-red-500/30 transition-all">
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
