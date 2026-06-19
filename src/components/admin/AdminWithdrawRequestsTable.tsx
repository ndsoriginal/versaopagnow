"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { CheckCircle2, XCircle, Loader2, Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";

type WithdrawRequest = {
  id: string;
  user_id: string;
  amount: number;
  pix_key: string | null;
  pix_key_type: string | null;
  status: string;
  fee_transaction_id: string | null;
  created_at: string;
  updated_at: string;
  email: string | null;
  name: string | null;
  cpf: string | null;
};

type Props = {
  requests: WithdrawRequest[];
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending_payment: { label: "Aguardando Taxa", color: "text-yellow-400 bg-yellow-500/10" },
  awaiting_key: { label: "Aguardando Chave", color: "text-blue-400 bg-blue-500/10" },
  processing: { label: "Processando", color: "text-purple-400 bg-purple-500/10" },
  completed: { label: "Concluído", color: "text-emerald-400 bg-emerald-500/10" },
  cancelled: { label: "Cancelado", color: "text-red-400 bg-red-500/10" },
};

const AdminWithdrawRequestsTable: React.FC<Props> = ({ requests }) => {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = requests.filter(r =>
    !searchTerm || r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.pix_key?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleComplete = async (req: WithdrawRequest) => {
    if (!confirm(`Confirmar conclusão do saque de R$ ${req.amount?.toFixed(2)} para ${req.email || req.user_id}?`)) return;

    setProcessingId(req.id);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('withdraw_requests')
        .update({
          status: 'completed',
          admin_id: adminUser?.id,
          processed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', req.id);

      if (error) throw error;

      await supabase.rpc('increment_balance', {
        user_id: req.user_id,
        amount: -Number(req.amount)
      });

      showSuccess("Saque concluído!");
      window.dispatchEvent(new CustomEvent("refresh-admin-data"));
      window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
    } catch (err: any) {
      showError("Erro ao processar: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (req: WithdrawRequest) => {
    if (!confirm(`Cancelar saque de R$ ${req.amount?.toFixed(2)}?`)) return;

    setProcessingId(req.id);
    try {
      await supabase
        .from('withdraw_requests')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', req.id);

      showSuccess("Saque cancelado.");
      window.dispatchEvent(new CustomEvent("refresh-admin-data"));
    } catch (err: any) {
      showError("Erro: " + err.message);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por email, nome ou chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#06070a] border border-[#1c212b] rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:border-[#ffcc00] focus:outline-none"
          />
        </div>
        <span className="text-xs text-gray-500">{filtered.length} solicitações</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 uppercase tracking-wider border-b border-[#1c212b]">
              <th className="text-left py-3 px-3">Usuário</th>
              <th className="text-left py-3 px-3">Valor</th>
              <th className="text-left py-3 px-3">Chave PIX</th>
              <th className="text-left py-3 px-3">Status</th>
              <th className="text-left py-3 px-3">Data</th>
              <th className="text-left py-3 px-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-gray-500">Nenhuma solicitação de saque encontrada.</td></tr>
            )}
            {filtered.map((req) => {
              const statusCfg = STATUS_CONFIG[req.status] || { label: req.status, color: "text-gray-400 bg-gray-500/10" };
              const isProcessing = processingId === req.id;
              return (
                <tr key={req.id} className="border-b border-[#1c212b]/50 hover:bg-[#13161d]">
                  <td className="py-3 px-3">
                    <div>
                      <span className="text-white font-bold">{req.name || "—"}</span>
                      <span className="block text-gray-500">{req.email || req.user_id?.slice(0, 8)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">R$ {Number(req.amount || 0).toFixed(2)}</td>
                  <td className="py-3 px-3">
                    <span className="font-mono text-gray-300">{req.pix_key || "—"}</span>
                    {req.pix_key_type && <span className="block text-[10px] text-gray-600 uppercase">({req.pix_key_type})</span>}
                  </td>
                  <td className="py-3 px-3">
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{new Date(req.created_at).toLocaleString("pt-BR")}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      {req.status === "processing" && (
                        <>
                          <button
                            onClick={() => handleComplete(req)}
                            disabled={isProcessing}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            {isProcessing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Concluir
                          </button>
                          <button
                            onClick={() => handleCancel(req)}
                            disabled={isProcessing}
                            className="bg-red-600/50 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all disabled:opacity-50 flex items-center gap-1"
                          >
                            <XCircle size={12} />
                            Cancelar
                          </button>
                        </>
                      )}
                      {req.status === "awaiting_key" && (
                        <span className="text-[10px] text-blue-400">Aguardando chave do usuário</span>
                      )}
                      {req.status === "completed" && (
                        <span className="text-[10px] text-emerald-400">Concluído</span>
                      )}
                      {req.status === "cancelled" && (
                        <span className="text-[10px] text-red-400">Cancelado</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminWithdrawRequestsTable;
