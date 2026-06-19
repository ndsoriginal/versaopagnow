"use client";

import React, { useState } from "react";
import { Search, QrCode, User, Clock, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

type Attempt = {
  id: string;
  transaction_id?: string;
  user_id: string;
  email?: string | null;
  name?: string | null;
  cpf?: string | null;
  amount: number;
  status: string;
  created_at: string;
  pix_code?: string;
};

type Props = {
  attempts: Attempt[];
  stats?: any;
};

const AdminPixAttemptsTable: React.FC<Props> = ({ attempts }) => {
  const [search, setSearch] = useState("");
  const [simulatingId, setSimulatingId] = useState<string | null>(null);

  const handleSimulate = async (attempt: Attempt) => {
    const pagnowTxId = attempt.transaction_id || attempt.id
    if (!confirm("Simular pagamento manual? Isso vai creditar o saldo do usuário como se a PagNow tivesse confirmado.")) return
    setSimulatingId(pagnowTxId)
    try {
      const { data, error } = await supabase.functions.invoke("admin-simulate-payment", {
        body: { transactionId: pagnowTxId }
      })
      if (error) throw new Error(error.message)
      showSuccess(`Pagamento simulado! R$ ${Number(data.creditedAmount).toFixed(2)} creditado.`)
      window.dispatchEvent(new CustomEvent("refresh-admin-data"))
    } catch (err: any) {
      showError(err.message || "Erro ao simular pagamento")
    } finally {
      setSimulatingId(null)
    }
  }

  const filtered = attempts.filter(a => 
    a.email?.toLowerCase().includes(search.toLowerCase()) || 
    a.id.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="bg-[#0d0f14] p-6 rounded-3xl border border-[#1c212b]">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar tentativas por e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-[#ffcc00] focus:outline-none"
          />
        </div>
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#13161d] border-b border-[#1c212b]">
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Usuário</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Valor Gerado</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Status QR</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Ações</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Horário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c212b]/50">
              {filtered.map((a) => (
                <tr key={a.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-white">{a.name || a.email || "Usuário não identificado"}</div>
                    <div className="text-[10px] font-mono text-gray-500 mt-0.5">{a.email ? a.email : a.user_id.slice(0, 18)}</div>
                    {a.cpf && <div className="text-[10px] font-mono text-gray-600 mt-0.5">CPF: {a.cpf}</div>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="text-sm font-black text-white">R$ {Number(a.amount).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 flex justify-center">
                    <span className={cn(
                      "text-[9px] font-black uppercase px-2 py-1 rounded-lg border flex items-center gap-1",
                      a.status === 'paid' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}>
                      {a.status === 'paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                      {a.status === 'paid' ? "Convertido" : "Aguardando"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {a.status !== 'paid' ? (
                      <button
                        onClick={() => handleSimulate(a)}
                        disabled={simulatingId === (a.transaction_id || a.id)}
                        className="text-[9px] font-black uppercase px-2 py-1 rounded-lg border border-[#ffcc00]/30 bg-[#ffcc00]/5 text-[#ffcc00] hover:bg-[#ffcc00]/15 transition-colors disabled:opacity-50 flex items-center gap-1 mx-auto"
                      >
                        {simulatingId === (a.transaction_id || a.id) ? (
                          <span className="animate-pulse">...</span>
                        ) : (
                          <><Zap size={10} /> Simular</>
                        )}
                      </button>
                    ) : (
                      <span className="text-[9px] text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-[10px] font-bold text-gray-500">{new Date(a.created_at).toLocaleString("pt-BR")}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPixAttemptsTable;