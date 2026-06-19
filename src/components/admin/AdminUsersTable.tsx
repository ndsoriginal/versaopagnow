"use client";

import React, { useState } from "react";
import { Search, User, Phone, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminAddBonusModal from "./AdminAddBonusModal";

type UserData = {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  created_at: string;
  real_balance: number;
  total_deposited: number;
  deposit_count: number;
};

export default function AdminUsersTable({ users, onRefresh }: { users: UserData[], onRefresh?: () => void }) {
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  const filtered = users.filter(u => 
    u.email?.toLowerCase().includes(search.toLowerCase()) || 
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0d0f14] p-6 rounded-3xl border border-[#1c212b]">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            placeholder="Buscar por e-mail, nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl pl-12 pr-4 py-3.5 text-sm focus:border-[#ffcc00] focus:outline-none transition-all"
          />
        </div>
        <div className="bg-[#13161d] px-4 py-2 rounded-xl border border-[#1c212b]">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Total na Lista</span>
          <span className="text-sm font-black text-white">{filtered.length} Usuários</span>
        </div>
      </div>

      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#13161d] border-b border-[#1c212b]">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500">Usuário / Dados</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Saldo Real</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Histórico</th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1c212b]/50">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors group">
                  <td className="px-6 py-5">
                    <div className="text-sm font-bold text-white group-hover:text-[#ffcc00] transition-colors">{u.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                        <User size={10} /> {u.name || 'Sem nome'}
                      </span>
                      <span className="text-[10px] text-gray-500 font-medium flex items-center gap-1">
                        <Phone size={10} /> {u.phone || 'Sem tel'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="text-sm font-black text-emerald-500">R$ {Number(u.real_balance).toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <div className="text-xs font-black text-white">R$ {Number(u.total_deposited).toFixed(2)}</div>
                    <div className="text-[9px] text-gray-500 font-black uppercase">{u.deposit_count} Pagos</div>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="bg-[#ffcc00]/10 hover:bg-[#ffcc00] text-[#ffcc00] hover:text-black p-2.5 rounded-xl transition-all border border-[#ffcc00]/20 flex items-center justify-center gap-2 ml-auto"
                      title="Adicionar Bônus"
                    >
                      <Gift size={16} />
                      <span className="text-[10px] font-black uppercase hidden sm:inline">Bônus</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <AdminAddBonusModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onSuccess={() => onRefresh?.()}
        />
      )}
    </div>
  );
}