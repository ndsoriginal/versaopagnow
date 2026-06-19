"use client";

import { ShieldCheck, Gift, AlertTriangle, Clock, CheckCircle2, XCircle } from "lucide-react";

type Deposit = {
  id: string;
  user_id: string;
  email?: string | null;
  name?: string | null;
  amount?: number;
  status?: string;
  pix_code?: string | null;
  created_at: string;
  audit_type?: string;
};

type Props = {
  deposits: Deposit[];
};

const formatCurrency = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number)
    ? number.toLocaleString("pt-BR", { minimumFractionDigits: 2 })
    : "0,00";
};

const isPaid = (status: string) =>
  ["paid", "completed", "approved", "success"].includes(String(status || "").toLowerCase());

const AuditBadge = ({ type }: { type?: string }) => {
  if (type === "BUG_BONUS") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-400">
        <Gift size={12} />
        Bug Bônus
      </span>
    );
  }

  if (type === "ADMIN_CREDIT") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-blue-400">
        <ShieldCheck size={12} />
        Admin
      </span>
    );
  }

  if (type === "INVALID") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-red-400">
        <AlertTriangle size={12} />
        Inválido
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
      <ShieldCheck size={12} />
      Dinheiro Real
    </span>
  );
};

const StatusBadge = ({ status }: { status?: string }) => {
  if (isPaid(status || "")) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-emerald-400">
        <CheckCircle2 size={12} />
        Pago
      </span>
    );
  }

  if (String(status || "").toLowerCase() === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-400">
        <Clock size={12} />
        Pendente
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-500/30 bg-gray-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-gray-400">
      <XCircle size={12} />
      {status || "Sem status"}
    </span>
  );
};

export default function AdminDepositsTable({ deposits }: Props) {
  if (!deposits.length) {
    return (
      <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#ffcc00]/10">
          <SearchIcon />
        </div>
        <h3 className="text-lg font-black text-white uppercase">Nenhum depósito encontrado</h3>
        <p className="mt-2 text-sm text-gray-500">Tente mudar o filtro ou atualizar os dados.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl overflow-hidden shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#13161d] border-b border-[#1c212b]">
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Horário / Data BR</th>
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Usuário</th>
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500">E-mail</th>
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Tipo</th>
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Valor</th>
              <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#1c212b]/50">
            {deposits.map((deposit) => (
              <tr
                key={deposit.id}
                className="group transition-colors hover:bg-white/[0.025]"
              >
                <td className="px-5 py-4 align-top">
                  <p className="text-sm font-black text-white">
                    {new Date(new Date(deposit.created_at).getTime() - (3 * 60 * 60 * 1000)).toLocaleTimeString("pt-BR")}
                  </p>
                  <p className="mt-1 text-[10px] font-bold text-gray-500">
                    {new Date(new Date(deposit.created_at).getTime() - (3 * 60 * 60 * 1000)).toLocaleDateString("pt-BR")}
                  </p>
                </td>

                <td className="px-5 py-4 align-top">
                  <p className="text-sm font-black text-white group-hover:text-[#ffcc00] transition-colors">
                    {deposit.name || "Sem nome cadastrado"}
                  </p>
                  <p className="mt-1 text-[10px] font-mono text-gray-600">
                    {deposit.user_id}
                  </p>
                </td>

                <td className="px-5 py-4 align-top">
                  <p className="text-sm font-bold text-gray-300 break-all">
                    {deposit.email || "Sem e-mail cadastrado"}
                  </p>
                  {deposit.pix_code && (
                    <p className="mt-2 max-w-[280px] truncate text-[10px] font-mono text-gray-600">
                      {deposit.pix_code}
                    </p>
                  )}
                </td>

                <td className="px-5 py-4 align-top text-center">
                  <AuditBadge type={deposit.audit_type} />
                </td>

                <td className="px-5 py-4 align-top text-right">
                  <p className="text-sm font-black text-white">R$ {formatCurrency(deposit.amount)}</p>
                </td>

                <td className="px-5 py-4 align-top text-center">
                  <StatusBadge status={deposit.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      className="h-8 w-8 text-[#ffcc00]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
    </svg>
  );
}