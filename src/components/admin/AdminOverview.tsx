"use client";

import React from "react";
import AdminMetricCard from "./AdminMetricCard";
import CampaignRanking from "./CampaignRanking";
import PeriodFilterBar from "./PeriodFilterBar";
import { PeriodFilterProvider } from "@/context/PeriodFilterContext";
import { Users, DollarSign, Target, Clock, ShieldAlert, BarChart3, TrendingUp, Gift, Calendar, Activity } from "lucide-react";

function AdminOverviewContent({ data }: { data: any }) {
  const { overview } = data || {};

  return (
    <div className="space-y-8">
      <PeriodFilterBar />
      <CampaignRanking />
      {/* Alerta de Auditoria Financeira */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
        <ShieldAlert className="text-emerald-500" size={20} />
        <div className="text-xs text-emerald-200">
          <strong className="block mb-1">CONTROLE FINANCEIRO UNIFICADO:</strong> 
          Os valores abaixo são extraídos diretamente do Supabase e ignoram 100% de contas Admins e Demos.
        </div>
      </div>

      {/* LINHA 1: FATURAMENTO REAL */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminMetricCard 
          title="Faturamento Total"
          value={`R$ ${(overview?.realRevenueTotal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Dinheiro Real Confirmado"
          icon={TrendingUp}
          iconClassName="text-emerald-500"
        />
        <AdminMetricCard 
          title="Recebido Hoje"
          value={`R$ ${(overview?.realRevenueToday || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle={`${overview?.countToday || 0} depósitos pagos hoje`}
          icon={BarChart3}
          iconClassName="text-[#ffcc00]"
        />
        <AdminMetricCard 
          title="Faturamento da Semana"
          value={`R$ ${(overview?.realRevenue7Days || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtitle="Últimos 7 dias (Real)"
          icon={Calendar}
          iconClassName="text-blue-500"
        />
        <AdminMetricCard 
          title="Leads Ativos"
          value={overview?.totalUsers || 0}
          subtitle="Novos usuários (Sem Admin/Demo)"
          icon={Users}
          iconClassName="text-purple-500"
        />
      </div>

      {/* LINHA 2: CONTROLE DE BÔNUS E PENDÊNCIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#0d0f14] border border-amber-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl" />
          <h3 className="text-sm font-black uppercase text-gray-500 mb-6 flex items-center gap-2">
            <Gift size={16} className="text-amber-500" />
            Total de Bônus Gerados (Bug)
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Saldo Fictício Total</span>
              <div className="text-3xl font-black text-amber-500 mt-1">R$ {(overview?.totalBugAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-gray-500 mt-2 font-medium">Soma de todos os bônus de R$ 300,00 creditados via bug.</p>
            </div>
            <div className="bg-amber-500/10 p-4 rounded-2xl text-amber-500">
              <Gift size={32} />
            </div>
          </div>
        </div>

        <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <h3 className="text-sm font-black uppercase text-gray-500 mb-6 flex items-center gap-2">
            <Clock size={16} className="text-blue-500" />
            Total Pendente (Carrinho Abandonado)
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Aguardando Pagamento</span>
              <div className="text-3xl font-black text-white mt-1">R$ {(overview?.pendingAmount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
              <p className="text-[10px] text-gray-500 mt-2 font-medium">Dinheiro real que os clientes geraram PIX mas não pagaram.</p>
            </div>
            <div className="bg-blue-500/10 p-4 rounded-2xl text-blue-500">
              <DollarSign size={32} />
            </div>
          </div>
        </div>
      </div>

      {/* LINHA 3: NOVOS USUÁRIOS (CADASTROS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminMetricCard 
          title="Novos Hoje"
          value={overview?.newUsersToday || 0}
          subtitle="Usuários cadastrados hoje"
          icon={Users}
          iconClassName="text-green-500"
        />
        <AdminMetricCard 
          title="Novos Ontem"
          value={overview?.newUsersYesterday || 0}
          subtitle="Usuários cadastrados ontem"
          icon={Users}
          iconClassName="text-orange-500"
        />
        <AdminMetricCard 
          title="Novos Semana"
          value={overview?.newUsersWeek || 0}
          subtitle="Usuários cadastrados nos últimos 7 dias"
          icon={Users}
          iconClassName="text-blue-500"
        />
        <AdminMetricCard 
          title="Novos Mês"
          value={overview?.newUsersMonth || 0}
          subtitle="Usuários cadastrados neste mês"
          icon={Users}
          iconClassName="text-indigo-500"
        />
      </div>
    </div>
  );
}

export default function AdminOverview({ data }: { data: any }) {
  return (
    <PeriodFilterProvider>
      <AdminOverviewContent data={data} />
    </PeriodFilterProvider>
  );
}