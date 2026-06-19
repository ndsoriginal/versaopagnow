import React, { useState, useEffect } from "react";
import { useSession } from "@/context/SessionContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Users, 
  DollarSign, 
  QrCode, 
  PieChart, 
  Activity, 
  RefreshCw, 
  ArrowLeft, 
  Loader2, 
  ShieldCheck, 
  Clock, 
  Gift,
  Settings,
  Sparkles,
  TrendingUp,
  ArrowDownUp,
  BarChart3,
  Bell
} from "lucide-react";
import AdminLoginScreen from "@/components/AdminLoginScreen";
import { showSuccess, showError } from "@/utils/toast";
import { fetchAdminDashboardData } from "@/services/adminDashboard";

import AdminOverview from "@/components/admin/AdminOverview";
import AdminPixAttemptsTable from "@/components/admin/AdminPixAttemptsTable";
import AdminAnalytics from "@/components/admin/AdminAnalytics";
import AdminUsersPage from "@/components/admin/AdminUsersPage";
import AdminDepositsPage from "./AdminDepositsPage";
import AdminGameConfigPage from "./AdminGameConfigPage";
import AdminWithdrawRequestsTable from "@/components/admin/AdminWithdrawRequestsTable";
import AdminAdsDashboard from "@/components/admin/AdminAdsDashboard";
import AdminMetaPixels from "@/components/admin/AdminMetaPixels";
import AdminPaymentGateways from "@/components/admin/AdminPaymentGateways";
import AdminNotificationsPage from "@/components/admin/AdminNotificationsPage";

const ADMIN_EMAILS = ["admin01@gmail.com", "jhonatas553@gmail.com"];

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  const isAdmin = user?.email && (ADMIN_EMAILS.includes(user.email.toLowerCase()) || localStorage.getItem("is_admin") === "true");

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const result = await fetchAdminDashboardData();
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
      if (!isSilent) showSuccess("Dados atualizados!");
    } catch (err: any) {
      showError(err.message || "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
      const interval = setInterval(() => loadData(true), 30000);
      const onRefresh = () => loadData(true);
      window.addEventListener("refresh-admin-data", onRefresh);
      return () => {
        clearInterval(interval);
        window.removeEventListener("refresh-admin-data", onRefresh);
      };
    }
  }, [isAdmin]);

  if (!user) return <AdminLoginScreen />;
  if (!isAdmin) { navigate("/", { replace: true }); return null; }

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: Activity },
    { id: "users", label: "Usuários", icon: Users },
    { id: "deposits", label: "Depósitos", icon: Gift },
    { id: "attempts", label: "Tentativas PIX", icon: QrCode },
    { id: "analytics", label: "Financeiro", icon: TrendingUp },
    { id: "gameconfig", label: "Jogos", icon: Sparkles },
    { id: "withdraw", label: "Saques", icon: ArrowDownUp },
    { id: "ads", label: "Anúncios / Performance", icon: BarChart3 },
    { id: "config", label: "Config", icon: Settings },
    { id: "gateways", label: "Gateways", icon: ShieldCheck },
    { id: "notifications", label: "Notificações", icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-[#0d0f14] border-b border-[#1c212b] overflow-x-auto">
        <div className="flex gap-1 p-2 min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all",
                  activeTab === tab.id ? "bg-[#ffcc00] text-black" : "text-gray-400 hover:text-white")}>
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0d0f14] border-r border-[#1c212b] hidden lg:flex flex-col p-6 z-20">
        <div className="mb-10 flex items-center gap-3">
          <div className="bg-[#ffcc00] p-2 rounded-xl text-black"><ShieldCheck size={24} /></div>
          <h2 className="text-lg font-black uppercase italic">Admin <span className="text-[#ffcc00]">Panel</span></h2>
        </div>

        <nav className="flex-1 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
                  activeTab === tab.id ? "bg-[#ffcc00] text-black shadow-lg" : "text-gray-500 hover:bg-[#0d0f14] hover:text-white")}>
                <Icon size={18} className="text-[#ffcc00]" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <button onClick={() => navigate("/")} className="flex items-center gap-3 px-4 py-3 text-gray-500 hover:text-white mt-auto">
          <ArrowLeft size={18} /> <span>Sair</span>
        </button>
      </aside>

      <main className="lg:ml-64 pt-[60px] lg:pt-10 p-6 lg:p-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black uppercase italic">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className="text-[10px] text-gray-500 uppercase font-bold mt-1 flex items-center gap-2">
              <Clock size={12} /> Última atualização: {lastUpdate}
            </p>
          </div>
          <button onClick={() => loadData()} className="flex items-center gap-2 bg-[#13161d] border border-[#1c212b] px-5 py-3 rounded-2xl text-xs font-black uppercase hover:bg-[#1c212b] transition-all">
            <RefreshCw size={16} className={cn(loading && "animate-spin")} /> Atualizar Agora
          </button>
        </div>

        {!data ? (
          <div className="h-[60vh] flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-[#ffcc00]" size={48} />
            <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Aguardando Supabase...</p>
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === "overview" && <AdminOverview data={data} />}
            {activeTab === "users" && <AdminUsersPage users={data?.users || []} onRefresh={() => loadData(true)} />}
            {activeTab === "deposits" && <AdminDepositsPage refreshData={() => loadData(true)} />}
            {activeTab === "attempts" && <AdminPixAttemptsTable attempts={data?.pixRequests || []} />}
            {activeTab === "analytics" && <AdminAnalytics charts={data?.charts} rankings={data?.rankings} peaks={data?.peaks} />}
            {activeTab === "gameconfig" && <AdminGameConfigPage />}
            {activeTab === "ads" && <AdminAdsDashboard />}
            {activeTab === "withdraw" && (
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
                <h3 className="text-lg font-black uppercase tracking-wider mb-6">Solicitações de Saque</h3>
                <AdminWithdrawRequestsTable requests={data?.withdrawRequests || []} />
              </div>
            )}
            {activeTab === "config" && <AdminMetaPixels />}
            {activeTab === "gateways" && <AdminPaymentGateways />}
            {activeTab === "notifications" && <AdminNotificationsPage />}
          </div>
        )}
      </main>
    </div>
  );
}
