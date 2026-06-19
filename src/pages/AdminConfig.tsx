"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { ArrowLeft, Gift, Play, Server, CheckCircle, AlertTriangle, Terminal } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

const AdminConfig: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useSession();

  const [pixelId, setPixelId] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [testResult, setTestResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [metaLogs, setMetaLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logFilter, setLogFilter] = useState("all");

  const isAdmin = user?.email?.trim().toLowerCase() === "admin01@gmail.com" || 
                  user?.email?.trim().toLowerCase() === "jhonatas553@gmail.com" || 
                  localStorage.getItem("is_admin") === "true";

  useEffect(() => {
    const savedPixelId = localStorage.getItem("meta_pixel_id") || "1569633754739174";
    const savedApiToken = localStorage.getItem("meta_api_token") || "";
    setPixelId(savedPixelId);
    setApiToken(savedApiToken);
  }, []);

  useEffect(() => {
    if (user && user.email?.trim().toLowerCase() !== "admin01@gmail.com" && user.email?.trim().toLowerCase() !== "jhonatas553@gmail.com" && localStorage.getItem("is_admin") !== "true") {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  const loadMetaLogs = async () => {
    setLoadingLogs(true);
    try {
      let query = supabase
        .from("meta_event_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (logFilter !== "all") {
        query = query.eq("event_name", logFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setMetaLogs(data || []);
    } catch (err: any) {
      showError("Erro ao carregar logs: " + err.message);
    } finally {
      setLoadingLogs(false);
    }
  };

  const saveConfig = () => {
    try {
      localStorage.setItem("meta_pixel_id", pixelId.trim());
      localStorage.setItem("meta_api_token", apiToken.trim());
      showSuccess("Configurações salvas com sucesso!");
      setTestResult("Configurações salvas com sucesso no navegador!");
    } catch (err: any) {
      showError(`Erro ao salvar: ${err.message}`);
      setTestResult(`Erro ao salvar: ${err.message}`);
    }
  };

  const testBrowserPixel = () => {
    if (typeof window === "undefined") return;
    try {
      if ((window as any).fbq) {
        (window as any).fbq("init", pixelId.trim());
        (window as any).fbq("track", "PageView");
        showSuccess("Evento PageView disparado via Navegador!");
        setTestResult("Evento PageView disparado via Navegador!");
      } else {
        showError("Meta Pixel não carregado no navegador.");
        setTestResult("Erro: O script do Meta Pixel não está carregado.");
      }
    } catch (err: any) {
      showError(`Erro ao testar Pixel: ${err.message}`);
    }
  };

  const testApiConnection = async () => {
    if (!apiToken) {
      setTestResult("Informe o Token de API antes de testar.");
      return;
    }
    setLoading(true);
    setTestResult("Enviando evento de teste via API de Conversões...");
    try {
      const payload = {
        data: [{
          event_name: "PageView",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "website",
          event_source_url: window.location.href,
          user_data: {
            client_ip_address: "127.0.0.1",
            client_user_agent: navigator.userAgent
          }
        }]
      };

      const response = await fetch(
        `https://graph.facebook.com/v17.0/${pixelId.trim()}/events?access_token=${apiToken.trim()}`,
        { 
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        }
      );

      const resData = await response.json();
      if (!response.ok) {
        setTestResult(`Falha na conexão CAPI: ${response.status} - ${JSON.stringify(resData)}`);
        showError("Falha ao enviar evento de teste via CAPI.");
      } else {
        setTestResult(`Sucesso! PageView enviado via CAPI. Resposta: ${JSON.stringify(resData)}`);
        showSuccess("Evento de teste enviado com sucesso via CAPI!");
      }
    } catch (err: any) {
      setTestResult(`Erro de rede: ${err.message}`);
      showError("Erro de rede ao conectar com a Meta.");
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-8 shadow-2xl text-center">
          <div className="bg-[#ffcc00]/10 p-3 rounded-2xl w-fit mx-auto mb-4 border border-[#ffcc00]/20">
            <span className="text-[#ffcc00]">🔐</span>
          </div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tight">Acesso Restrito</h2>
          <p className="text-xs text-gray-400 mt-2">Por favor, faça login no painel administrativo primeiro.</p>
          <button onClick={() => navigate("/admin")} className="mt-6 w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-3 rounded-xl transition-all">
            Ir para o Painel Admin
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      <header className="sticky top-0 z-30 bg-[#06070a]/90 backdrop-blur-md border-b border-[#1c212b]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/admin")} className="p-2 rounded-xl bg-[#13161d] border border-[#1c212b] text-gray-400 hover:text-white hover:bg-[#1c212b] transition-all">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Gift size={20} className="text-[#ffcc00]" />
              Configurações de Marketing & Pixel
            </h1>
            <p className="text-xs text-gray-500">Instale, configure e teste o Pixel e a API de Conversões</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl space-y-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-[#ffcc00] flex items-center gap-2">
            <CheckCircle size={18} />
            Como Instalar e Testar o Pixel
          </h2>
          <div className="text-xs text-gray-400 space-y-2 leading-relaxed">
            <p>1. Insira o seu <strong>Pixel ID</strong> e o <strong>Token de API de Conversões</strong> nos campos abaixo.</p>
            <p>2. Clique em <strong>Salvar Configurações</strong>.</p>
            <p>3. Use os botões de teste abaixo para disparar eventos em tempo real.</p>
          </div>
        </div>

        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Pixel ID</label>
              <input type="text" value={pixelId} onChange={(e) => setPixelId(e.target.value)}
                placeholder="Ex: 1569633754739174"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none transition-all" />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Token de API de Conversions</label>
              <input type="text" value={apiToken} onChange={(e) => setApiToken(e.target.value)}
                placeholder="Cole o token aqui"
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none transition-all" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t border-[#1c212b] pt-6">
            <button onClick={saveConfig} className="rounded-xl bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black px-6 py-3 text-sm uppercase tracking-wider transition-all">
              Salvar Configurações
            </button>
          </div>
        </div>

        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Play size={18} className="text-[#ffcc00]" />
            Disparar Eventos de Teste
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#06070a] border border-[#1c212b] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-500/10 p-2.5 rounded-xl text-blue-400"><Play size={20} /></div>
                <div>
                  <h3 className="text-sm font-bold text-white">Teste via Navegador (Pixel)</h3>
                  <p className="text-[10px] text-gray-500">Dispara um evento PageView diretamente do seu browser</p>
                </div>
              </div>
              <button onClick={testBrowserPixel} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all">
                Disparar PageView (Navegador)
              </button>
            </div>
            <div className="bg-[#06070a] border border-[#1c212b] rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400"><Server size={20} /></div>
                <div>
                  <h3 className="text-sm font-bold text-white">Teste via Servidor (CAPI)</h3>
                  <p className="text-[10px] text-gray-500">Envia um evento PageView via API de Conversões</p>
                </div>
              </div>
              <button onClick={testApiConnection} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50">
                {loading ? "Enviando..." : "Disparar PageView (CAPI)"}
              </button>
            </div>
          </div>
          {testResult && (
            <div className="p-4 rounded-xl bg-[#13161d] border border-[#1c212b] text-xs font-mono text-gray-300 break-all">
              <span className="font-bold text-white block mb-1">Resultado do Último Teste:</span>
              {testResult}
            </div>
          )}
        </div>

        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl space-y-6">
          <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
            <Terminal size={18} className="text-[#ffcc00]" />
            Log de Eventos Meta (CAPI)
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <select value={logFilter} onChange={(e) => setLogFilter(e.target.value)}
              className="bg-[#06070a] border border-[#1c212b] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ffcc00] focus:outline-none">
              <option value="all">Todos eventos</option>
              <option value="Purchase">Purchase</option>
              <option value="CompleteRegistration">CompleteRegistration</option>
              <option value="PageView">PageView</option>
            </select>
            <button onClick={loadMetaLogs} disabled={loadingLogs} className="bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition-all">
              {loadingLogs ? "Carregando..." : "Carregar Logs"}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 uppercase tracking-wider border-b border-[#1c212b]">
                  <th className="text-left py-2 px-2">Evento</th>
                  <th className="text-left py-2 px-2">Email</th>
                  <th className="text-left py-2 px-2">Valor</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-left py-2 px-2">Origem</th>
                  <th className="text-left py-2 px-2">Data</th>
                </tr>
              </thead>
              <tbody>
                {metaLogs.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-6 text-gray-500">Nenhum log encontrado. Clique em "Carregar Logs".</td></tr>
                )}
                {metaLogs.map((log: any) => (
                  <tr key={log.id} className="border-b border-[#1c212b]/50 hover:bg-[#13161d]">
                    <td className="py-2 px-2 font-bold text-white">{log.event_name}</td>
                    <td className="py-2 px-2 text-gray-400">{log.email || "-"}</td>
                    <td className="py-2 px-2 text-gray-400">{log.amount ? `R$ ${log.amount}` : "-"}</td>
                    <td className="py-2 px-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${log.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        {log.status === 'sent' ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-gray-400">{log.source || "-"}</td>
                    <td className="py-2 px-2 text-gray-500">{new Date(log.created_at).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminConfig;
