import React, { useState } from "react";
import { X, Loader2, Send, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

type Props = {
  user: { id: string; email: string; name: string };
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminSendBonusModal({ user, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState("680");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ emailSent: boolean; emailError?: string } | null>(null);

  const handleSend = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showError("Valor inválido");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-send-bonus-email`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ targetUserId: user.id, amount: val }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar");
      }

      setResult({ emailSent: data.emailSent, emailError: data.emailError });
      showSuccess(`R$ ${val.toFixed(2)} adicionado${data.emailSent ? " e email enviado" : ""}!`);
      onSuccess();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={onClose}>
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-white">Enviar Bônus + Email</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-[#1c212b] text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b] mb-4">
          <div className="text-[10px] text-gray-500 font-bold uppercase">Usuário</div>
          <div className="text-sm font-bold text-white mt-1">{user.name || "Sem nome"}</div>
          <div className="text-xs text-gray-400">{user.email}</div>
        </div>

        <div className="mb-4">
          <label className="text-[10px] text-gray-500 font-bold uppercase block mb-2">Valor do Bônus (R$)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="1"
            step="0.01"
            className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-3 text-white text-sm font-bold focus:outline-none focus:border-[#ffcc00]/50"
          />
        </div>

        <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b] mb-6">
          <div className="text-[10px] text-gray-500 font-bold uppercase mb-2">Email que será enviado</div>
          <div className="text-xs text-gray-300 leading-relaxed">
            <strong className="text-white">Assunto:</strong> 🎉 Você ganhou R$ 680 em créditos!
            <br />
            <strong className="text-white">Mensagem:</strong> "Você acaba de ganhar 680 reais em créditos para jogar na pixbeet.fun. Faça seu login agora e se divirta."
          </div>
        </div>

        {result && (
          <div className={`rounded-2xl p-3 mb-4 text-xs font-bold flex items-center gap-2 ${
            result.emailSent
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400"
              : "bg-amber-500/10 border border-amber-500/30 text-amber-400"
          }`}>
            {result.emailSent ? <Check size={14} /> : <AlertCircle size={14} />}
            {result.emailSent ? "Bônus adicionado e email enviado com sucesso!" : `Saldo adicionado, mas email falhou: ${result.emailError}`}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 bg-[#1c212b] text-gray-400 py-3 rounded-xl text-xs font-bold uppercase hover:bg-[#2a2f3a] transition-all">
            Cancelar
          </button>
          <button onClick={handleSend} disabled={loading}
            className="flex-1 bg-[#ffcc00] text-black py-3 rounded-xl text-xs font-black uppercase hover:bg-[#ffdb4d] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            {loading ? "Enviando..." : "Enviar Bônus + Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
