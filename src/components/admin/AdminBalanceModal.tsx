import React, { useState } from "react";
import { X, Plus, Minus, Target, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

type Action = "add" | "remove" | "set";

type Props = {
  user: { id: string; email: string; name: string; currentBalance: number };
  onClose: () => void;
  onSuccess: () => void;
};

export default function AdminBalanceModal({ user, onClose, onSuccess }: Props) {
  const [action, setAction] = useState<Action>("add");
  const [amount, setAmount] = useState<number>(100);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const actionConfig = {
    add: { icon: Plus, label: "Adicionar", color: "bg-emerald-500", hoverColor: "hover:bg-emerald-600", inputClass: "border-emerald-500/30 focus:border-emerald-500" },
    remove: { icon: Minus, label: "Remover", color: "bg-red-500", hoverColor: "hover:bg-red-600", inputClass: "border-red-500/30 focus:border-red-500" },
    set: { icon: Target, label: "Ajustar", color: "bg-blue-500", hoverColor: "hover:bg-blue-600", inputClass: "border-blue-500/30 focus:border-blue-500" },
  };

  const cfg = actionConfig[action];

  const handleSubmit = async () => {
    if (amount <= 0) { showError("Valor deve ser maior que zero"); return; }
    if (action === "remove" && amount > user.currentBalance) { showError("Saldo insuficiente para remoção"); return; }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-balance", {
        body: { targetUserId: user.id, action, amount, reason: reason || undefined }
      });

      if (error) throw new Error(error.message || "Erro ao processar");

      showSuccess(
        action === "add" ? `R$ ${amount.toFixed(2)} adicionado!` :
        action === "remove" ? `R$ ${amount.toFixed(2)} removido!` :
        `Saldo ajustado para R$ ${amount.toFixed(2)}!`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      showError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-[#1c212b]">
          <h3 className="text-sm font-black uppercase tracking-wider">Gerenciar Saldo</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-xl bg-[#13161d] border border-[#1c212b] flex items-center justify-center hover:bg-[#1c212b] transition-all"><X size={14} /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Usuário</div>
            <div className="text-sm font-bold text-white mt-1">{user.name || user.email}</div>
            <div className="text-xs text-gray-500">{user.email}</div>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <span className="text-gray-500">Saldo atual:</span>
              <span className="font-black text-[#ffcc00]">R$ {user.currentBalance.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {(["add", "remove", "set"] as Action[]).map((a) => {
              const c = actionConfig[a];
              const Icon = c.icon;
              return (
                <button key={a} onClick={() => setAction(a)}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all",
                    action === a ? `${c.color} text-white border-transparent` : "bg-[#13161d] border-[#1c212b] text-gray-400 hover:text-white"
                  )}
                >
                  <Icon size={14} className="mx-auto mb-1" />
                  {c.label}
                </button>
              );
            })}
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Valor {action === "set" ? "final" : "(R$)"}
            </label>
            <input type="number" value={amount} onChange={e => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              className={`w-full bg-[#06070a] border rounded-2xl px-4 py-3 text-lg font-black text-white focus:outline-none transition-all ${cfg.inputClass}`} />
          </div>

          {action === "remove" && amount > user.currentBalance && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold">
              <AlertCircle size={12} /> Saldo insuficiente para remover este valor
            </div>
          )}

          {action === "set" && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold">
              <AlertCircle size={12} /> O saldo será definido exatamente para R$ {amount.toFixed(2)}
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Motivo <span className="text-gray-700">(opcional)</span>
            </label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Bônus de boas-vindas, Ajuste manual..."
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none transition-all" />
          </div>

          <div className="bg-[#06070a] rounded-2xl p-4 border border-[#1c212b]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Resumo</div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between"><span className="text-gray-500">Saldo atual</span><span className="font-bold text-white">R$ {user.currentBalance.toFixed(2)}</span></div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {action === "add" ? "Adicionar" : action === "remove" ? "Remover" : "Novo saldo"}
                </span>
                <span className={cn("font-bold", action === "add" ? "text-emerald-400" : action === "remove" ? "text-red-400" : "text-blue-400")}>
                  {action === "add" ? "+" : action === "remove" ? "-" : ""}R$ {action === "set" ? amount.toFixed(2) : amount.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-[#1c212b] pt-1 flex justify-between">
                <span className="text-gray-500 font-bold">Saldo final</span>
                <span className="font-black text-[#ffcc00]">
                  R$ {(action === "add" ? user.currentBalance + amount : action === "remove" ? user.currentBalance - amount : amount).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={loading}
            className={`w-full ${cfg.color} ${cfg.hoverColor} text-white font-black py-4 rounded-2xl text-sm uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
          >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <cfg.icon size={16} />}
            {loading ? "Processando..." : `${cfg.label} R$ ${amount.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}
