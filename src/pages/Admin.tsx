import React, { useState, useEffect } from "react";
import { useSession } from "@/context/SessionContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  isNotificationSoundEnabled,
  enableNotificationSound,
  disableNotificationSound,
} from "@/utils/notificationSound";
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
  Bell,
  Volume2,
  VolumeX,
  MailCheck,
} from "lucide-react";
import AdminLoginScreen from "@/components/AdminLoginScreen";
import { showSuccess, showError } from "@/utils/toast";
import { fetchAdminDashboardData } from "@/services/adminDashboard";
import { supabase } from "@/integrations/supabase/client";

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
import AdminEmailPage from "@/components/admin/AdminEmailPage";
import AdminMobileNav from "@/components/admin/AdminMobileNav";

export default function AdminPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [adminRole, setAdminRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState(false);

  const isAdmin = adminRole === 'admin' || adminRole === 'superadmin';

  const checkRole = React.useCallback(() => {
    if (!user) return;
    setRoleLoading(true);
    setRoleError(false);
    (async () => {
      try {
        const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
        if (p) setAdminRole(p.role);
      } catch { setRoleError(true) }
      setRoleLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (user) {
      checkRole();
    } else {
      setAdminRole(null);
      setRoleError(false);
    }
  }, [user])

  const loadData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setDataError(null);
    try {
      const result = await fetchAdminDashboardData();
      setData(result);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR"));
      if (!isSilent) showSuccess("Dados atualizados!");
    } catch (err: any) {
      const msg = err.message || "Erro ao carregar dados";
      setDataError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSoundEnabled(isNotificationSoundEnabled());
    const prompted = localStorage.getItem("notificationSoundPrompted");
    if (!prompted) {
      setTimeout(() => {
        showSuccess("🔔 Ative o som de notificações em Config → Notificações");
        localStorage.setItem("notificationSoundPrompted", "true");
      }, 3000);
    }
  }, []);

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
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center">
        <Loader2 className="animate-spin text-[#ffcc00]" size={48} />
      </div>
    );
  }
  if (roleError) {
    return (
      <div className="min-h-screen bg-[#06070a] flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">Erro de Verificação</h2>
          <p className="text-sm text-gray-400 mt-2">Não foi possível verificar suas credenciais de administrador.</p>
          <button onClick={checkRole} className="mt-6 w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-3 rounded-xl transition-all text-sm uppercase">
            Tentar Novamente
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="mt-2 text-gray-500 hover:text-white text-xs underline block w-full">
            Sair
          </button>
        </div>
      </div>
    );
  }
  if (!isAdmin) { navigate("/", { replace: true }); return null; }

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: Activity },
    { id: "users", label: "Usuários", icon: Users },
    { id: "deposits", label: "Depósitos", icon: Gift },
    { id: "email", label: "Email", icon: MailCheck },
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
      <aside className="fixed left-0 top-0 h-screen w-64 bg-[#0d0f14] border-r border-[#1c212b] hidden lg:flex flex-col z-20">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1c212b] shrink-0">
          <div className="bg-[#ffcc00] p-2 rounded-xl text-black"><ShieldCheck size={22} /></div>
          <h2 className="text-base font-black uppercase italic leading-tight">Admin <span className="text-[#ffcc00]">Panel</span></h2>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150",
                  activeTab === tab.id
                    ? "bg-[#ffcc00]/10 text-[#ffcc00] border border-[#ffcc00]/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5")}>
                <Icon size={16} className={activeTab === tab.id ? "text-[#ffcc00]" : "text-gray-500"} />
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-[#1c212b] px-3 py-3 space-y-1">
          <button onClick={() => { if (soundEnabled) { disableNotificationSound(); setSoundEnabled(false); } else { enableNotificationSound().then(() => setSoundEnabled(true)); } }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all w-full text-gray-400 hover:text-white hover:bg-white/5">
            {soundEnabled ? <Volume2 size={16} className="text-[#ffcc00]" /> : <VolumeX size={16} className="text-gray-500" />}
            <span>Som: {soundEnabled ? "Ativado" : "Desativado"}</span>
          </button>
          <button onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 w-full">
            <ArrowLeft size={16} /> <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 pb-24 lg:pb-0 p-4 sm:p-6 lg:p-10 pt-4 lg:pt-10">
        <div className="hidden lg:flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-10">
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
          <div className="h-[60vh] flex flex-col items-center justify-center px-4">
            {dataError ? (
              <>
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 max-w-md w-full text-center">
                  <p className="text-red-400 font-bold text-sm mb-2">Erro ao carregar dados</p>
                  <p className="text-gray-400 text-xs mb-4">{dataError}</p>
                  <button onClick={() => loadData()} disabled={loading} className="w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-black py-3 rounded-xl transition-all text-sm uppercase disabled:opacity-50">
                    {loading ? "Tentando..." : "Tentar Novamente"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <Loader2 className="animate-spin text-[#ffcc00]" size={48} />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-xs mt-4">Aguardando Supabase...</p>
              </>
            )}
          </div>
        ) : (
          <div className="animate-in fade-in duration-500">
            {activeTab === "overview" && <AdminOverview data={data} />}
            {activeTab === "users" && <AdminUsersPage users={data?.users || []} onRefresh={() => loadData(true)} />}
            {activeTab === "email" && <AdminEmailPage />}
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
      <AdminMobileNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}
