"use client";

import React, { useEffect, useState } from "react";
import { X, History, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
};

export default function HistoryModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const fetchAllUserTransactions = async () => {
    setLoading(true);
    try {
      let allData: Transaction[] = [];
      let from = 0;
      const step = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("transactions")
          .select("*")
          .eq("user_id", userId)
          .range(from, from + step - 1)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData = [...allData, ...data];
        if (data.length < step) break;
        from += step;
      }
      
      setTransactions(allData);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && userId) {
      fetchAllUserTransactions();
    }
  }, [open, userId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={cn(
        "w-full rounded-3xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col",
        isMobile ? "max-w-full h-full rounded-none" : "max-w-lg overflow-hidden h-[550px]"
      )}>
        <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
          <div className="flex items-center gap-3">
            <div className="bg-[#ffcc00] p-2 rounded-xl">
              <History size={20} className="text-black" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-tight">Extrato Completo</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#05070d]">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-3">
              <Loader2 className="animate-spin text-[#ffcc00]" size={32} />
              <span className="text-xs font-bold uppercase tracking-widest">Sincronizando registros...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-gray-600">
              <History size={48} className="opacity-20 mb-4" />
              <p className="text-sm font-medium">Nenhuma movimentação encontrada.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
                const isDeposit = tx.type === "deposit";
                return (
                  <div key={tx.id} className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-xl", isDeposit ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
                        {isDeposit ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{isDeposit ? "Depósito" : "Saque"}</p>
                        <p className="text-[10px] text-gray-500">{new Date(tx.created_at).toLocaleString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn("text-sm font-black", isDeposit ? "text-emerald-500" : "text-red-500")}>
                        {isDeposit ? "+" : "-"} R$ {Number(tx.amount).toFixed(2)}
                      </p>
                      <span className="text-[8px] font-black uppercase text-gray-600">{tx.status}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}