"use client";

import React, { useState } from "react";
import { X, Gift, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";

type Props = {
  user: { id: string; email: string };
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminAddBonusModal({ user, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("Bônus VIP");
  const [loading, setLoading] = useState(false);

  const handleAddBonus = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      showError("Informe um valor válido maior que zero.");
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch("https://rkkmtdpgrvtbotvypysq.supabase.co/functions/v1/admin-add-bonus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          targetUserId: user.id,
          amount: val,
          reason: reason
        })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || "Erro ao adicionar bônus");

      showSuccess(`Bônus de R$ ${val.toFixed(2)} adicionado com sucesso!`);
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-[#ffcc00] p-2 rounded-xl text-black">
              <Gift size={20} />
            </div>
            <h2 className="text-lg font-bold text-white">Adicionar Bônus</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          <div className="bg-[#13161d] p-3 rounded-xl border border-white/5">
            <p className="text-[10px] text-gray-500 font-bold uppercase">Usuário Alvo</p>
            <p className="text-sm font-bold text-white truncate">{user.email}</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Valor (R$)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3.5 text-white font-bold focus:border-[#ffcc00] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase ml-1">Motivo (Opcional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Bônus de Depósito"
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none"
            />
          </div>

          <button
            onClick={handleAddBonus}
            disabled={loading}
            className="w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : <Gift size={20} />}
            CONFIRMAR RECARGA
          </button>
        </div>
      </div>
    </div>
  );
}