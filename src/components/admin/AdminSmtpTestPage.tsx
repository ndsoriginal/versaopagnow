import React, { useState } from "react";
import { Send, Loader2, Check, AlertCircle, Info, Mail, Eye, EyeOff, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

export default function AdminSmtpTestPage() {
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details?: string; step?: string } | null>(null);
  const [config, setConfig] = useState<{ relay: string; provider: string } | null>(null);
  const [showPass, setShowPass] = useState(false);

  const loadConfig = async () => {
    setConfigLoading(true);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: "test@test.com",
            subject: "CONFIG_TEST",
            html: "<p>config check</p>",
            _configOnly: true,
          }),
        }
      );
      if (res.status === 400) {
        const data = await res.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch { /* ignore */ }
    setConfigLoading(false);
  };

  const handleTest = async () => {
    if (!to) { showError("Informe um email de destino"); return; }
    setLoading(true);
    setResult(null);
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to,
            subject: "🧪 Teste SMTP - Painel Admin",
            html: `
              <div style="font-family: Arial; max-width:500px; margin:0 auto; padding:20px; background:#f8fafc; border-radius:12px;">
                <h2 style="color:#1a202c;">Teste de Email</h2>
                <p style="color:#4a5568;">Este email foi enviado do painel admin para testar a configuração SMTP.</p>
                <p style="color:#4a5568;">Enviado em: ${new Date().toLocaleString("pt-BR")}</p>
              </div>
            `.trim(),
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: "Email enviado com sucesso pelo servidor SMTP!" });
        showSuccess("Email de teste enviado!");
      } else {
        const errMsg = data.error || data.details || "Erro desconhecido";
        setResult({
          success: false,
          message: errMsg,
          details: data.details || data.step,
          step: data.step,
        });
        showError(errMsg);
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message });
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {!config && (
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Settings size={20} className="text-[#ffcc00]" />
            <h3 className="text-lg font-black uppercase tracking-wider">Configuração SMTP Atual</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Clique para carregar as configurações SMTP atuais do servidor:
          </p>
          <button
            onClick={loadConfig}
            disabled={configLoading}
            className="bg-[#1c212b] text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-[#2a303d] transition-all disabled:opacity-50"
          >
            {configLoading ? <Loader2 size={14} className="animate-spin inline mr-2" /> : null}
            Carregar Config
          </button>
        </div>
      )}

      {config && (
        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-3">
          <div className="flex items-center gap-3 mb-2">
            <Settings size={20} className="text-[#ffcc00]" />
            <h3 className="text-lg font-black uppercase tracking-wider">Configuração SMTP</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="bg-[#06070a] rounded-xl p-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Provedor</span>
              <span className="text-white font-bold">{config.provider}</span>
            </div>
            <div className="bg-[#06070a] rounded-xl p-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase block">Relay URL</span>
              <span className="text-white font-bold text-xs break-all">{config.relay}</span>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Mail size={20} className="text-[#ffcc00]" />
          <h3 className="text-lg font-black uppercase tracking-wider">Testar Envio</h3>
        </div>

        <div>
          <label className="text-[10px] text-gray-500 font-bold uppercase block mb-1.5">Email de Destino</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="exemplo@email.com"
            className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-2.5 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50 transition-all"
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading || !to}
          className="w-full bg-[#ffcc00] text-black px-6 py-3 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {loading ? "Enviando..." : "Enviar Email de Teste"}
        </button>

        {result && (
          <div className={cn(
            "rounded-2xl p-4 text-sm font-bold flex items-start gap-3",
            result.success
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          )}>
            {result.success ? <Check size={18} className="mt-0.5 shrink-0" /> : <AlertCircle size={18} className="mt-0.5 shrink-0" />}
            <div>
              <p>{result.message}</p>
              {result.step && (
                <p className="text-[10px] mt-1 opacity-70 font-mono">Etapa: {result.step}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-3">
        <div className="flex items-center gap-3">
          <Info size={20} className="text-[#ffcc00]" />
          <h3 className="text-lg font-black uppercase tracking-wider">Como Funciona</h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex gap-2">
            <span className="text-[#ffcc00] font-bold">1.</span>
            <span>Edge Function <strong className="text-white">envia</strong> para o relay no VPS (pixbeet.lat/api/email).</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#ffcc00] font-bold">2.</span>
            <span>Relay conecta no <strong className="text-white">smtp.hostinger.com:465</strong> e envia o email.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#ffcc00] font-bold">3.</span>
            <span>Verifique a caixa de <strong className="text-white">Spam</strong> do email de destino.</span>
          </li>
          <li className="flex gap-2">
            <span className="text-[#ffcc00] font-bold">4.</span>
            <span>Hostinger SMTP exige que o <strong className="text-white">From</strong> seja uma conta real na Hostinger.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
