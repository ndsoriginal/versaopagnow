import React from "react";
import { cn } from "@/lib/utils";
import {
  Activity, Users, Gift, TrendingUp, Settings,
  QrCode, Sparkles, ArrowDownUp, BarChart3, ShieldCheck, Bell,
  X
} from "lucide-react";

type Tab = {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
};

const mainItems: Tab[] = [
  { id: "overview", label: "Visão Geral", icon: Activity },
  { id: "users", label: "Usuários", icon: Users },
  { id: "deposits", label: "Depósitos", icon: Gift },
  { id: "analytics", label: "Financeiro", icon: TrendingUp },
];

const moreItems: Tab[] = [
  { id: "attempts", label: "Tentativas PIX", icon: QrCode },
  { id: "gameconfig", label: "Jogos", icon: Sparkles },
  { id: "withdraw", label: "Saques", icon: ArrowDownUp },
  { id: "ads", label: "Anúncios", icon: BarChart3 },
  { id: "config", label: "Config", icon: Settings },
  { id: "gateways", label: "Gateways", icon: ShieldCheck },
  { id: "notifications", label: "Notificações", icon: Bell },
];

type Props = {
  activeTab: string;
  onTabChange: (id: string) => void;
};

export default function AdminMobileNav({ activeTab, onTabChange }: Props) {
  const [showMore, setShowMore] = React.useState(false);
  const isMoreActive = moreItems.some((m) => m.id === activeTab);

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden border-t border-white/10 bg-[#080A0F]/95 backdrop-blur-xl pb-[env(safe-area-inset-bottom,0px)]">
        <div className="grid grid-cols-5 h-[72px]">
          {mainItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors",
                  active
                    ? "text-[#ffcc00]"
                    : "text-gray-500 hover:text-gray-300"
                )}
              >
                <div
                  className={cn(
                    "flex items-center justify-center w-10 h-8 rounded-xl transition-colors",
                    active && "bg-[#ffcc00]/10"
                  )}
                >
                  <Icon size={20} />
                </div>
                <span className="text-[10px] font-bold leading-tight">
                  {item.label}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setShowMore(true)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 transition-colors",
              isMoreActive
                ? "text-[#ffcc00]"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center w-10 h-8 rounded-xl transition-colors",
                isMoreActive && "bg-[#ffcc00]/10"
              )}
            >
              <Settings size={20} />
            </div>
            <span className="text-[10px] font-bold leading-tight">Mais</span>
          </button>
        </div>
      </nav>

      {showMore && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowMore(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-[#0d0f14] border-t border-[#1c212b] rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)] animate-in slide-in-from-bottom duration-200">
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-gray-400">
                Mais Opções
              </h3>
              <button
                onClick={() => setShowMore(false)}
                className="p-1.5 rounded-xl bg-[#1c212b] text-gray-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 px-4 pb-6">
              {moreItems.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      setShowMore(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3.5 rounded-2xl text-left transition-all",
                      active
                        ? "bg-[#ffcc00]/10 border border-[#ffcc00]/20 text-[#ffcc00]"
                        : "bg-[#13161d] border border-[#1c212b] text-gray-400 hover:text-white hover:border-gray-500"
                    )}
                  >
                    <Icon size={18} />
                    <span className="text-xs font-bold">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
