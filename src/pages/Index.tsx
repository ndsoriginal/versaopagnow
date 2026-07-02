"use client";

import React, { useState, useEffect } from "react";
import SidebarNav from "@/components/SidebarNav";
import HeaderBar from "@/components/HeaderBar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import FeaturedBanner from "@/components/FeaturedBanner";
import TopWinners from "@/components/TopWinners";
import GameGrid from "@/components/GameGrid";
import CustomGameCard from "@/components/CustomGameCard";
import FooterHome from "@/components/FooterHome";
import MobileIconRow from "@/components/MobileIconRow";
import SignupPopup from "@/components/SignupPopup";
import RoulettePopup from "@/components/RoulettePopup";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import LoginPopup from "@/components/LoginPopup";
import PlayerProfilePopup from "@/components/PlayerProfilePopup";
import FloatingChatButton from "@/components/FloatingChatButton";
import MobileSidebar from "@/components/MobileSidebar";
import UserMenu from "@/components/UserMenu";
import HistoryModal from "@/components/HistoryModal";
import BonusModal from "@/components/BonusModal";
import SupportModal from "@/components/SupportModal";
import GamePlayModal from "@/components/GamePlayModal";
import LiveBetsFeed from "@/components/LiveBetsFeed";
import { useSession } from "@/context/SessionContext";
import { BonusProvider } from "@/context/BonusContext";
import { ShieldCheck, Zap, Landmark, Lock, Sparkles, Clock } from "lucide-react";

interface Props {
  onToggleChat?: () => void;
}

const Index: React.FC<Props> = ({ onToggleChat }) => {
  const [signupOpen, setSignupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [initialDepositAmount, setInitialDepositAmount] = useState<number | undefined>(undefined);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  // Estados para o jogo ativo
  const [activeGame, setActiveGame] = useState<{ title: string; demoUrl: string } | null>(null);

  // Estado para o widget de depósito rápido na Home
  const [quickAmount, setQuickAmount] = useState<number>(50);

  const intervalRef = React.useRef<number | null>(null);
  const { user } = useSession();

  const [bonusCountdown, setBonusCountdown] = useState(600);
  const [bonusDeadlineStr, setBonusDeadlineStr] = useState("");

  useEffect(() => {
    const deadline = Date.now() + 10 * 60 * 1000;
    setBonusDeadlineStr(new Date(deadline).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    setBonusCountdown(600);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setBonusCountdown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const openDepositModal = (amount?: number) => {
    setInitialDepositAmount(amount);
    setIsDepositModalOpen(true);
  };

  const handleOpenSignup = () => {
    setSignupOpen(true);
  };
  const handleOpenLogin = () => {
    setLoginOpen(true);
  };
  const handleOpenProfile = () => {
    if (user) {
      setProfileOpen(true);
    } else {
      setLoginOpen(true);
    }
  };
  const handleOpenUserMenu = () => {
    if (user) {
      setIsUserMenuOpen(true);
    } else {
      setLoginOpen(true);
    }
  };

  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteUserId, setRouletteUserId] = useState<string | null>(null);

  const handleOpenRoulette = () => setShowRoulette(true);

  useEffect(() => {
    if (user) {
      setSignupOpen(false);
      setLoginOpen(false);
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    } else {
      // Dispara o popup de cadastro a cada 15 segundos caso o usuário não esteja logado
      intervalRef.current = window.setInterval(() => {
        setSignupOpen(true);
      }, 15000); 
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [user]);

  const handleCloseRoulette = () => {
    if (rouletteUserId) localStorage.setItem(`roleta_shown_${rouletteUserId}`, "1");
    setShowRoulette(false);
  };

  const handleOpenSpecificDeposit = (amount: number) => {
    openDepositModal(amount);
  };

  const handlePlayGame = (game: any) => {
    setActiveGame({
      title: game.title,
      demoUrl: game.demoUrl
    });
  };

  const userProfile = user
    ? {
        id: user.id,
        name: user.email?.split("@")[0] || "Jogador",
        avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email || "user")}`,
        tier: "blue" as const,
        level: 1,
        registeredAt: user.created_at || new Date().toISOString(),
        favoriteGame: "Fortune Tiger",
        recentWithdrawals: [],
        totalWagered: 0,
        totalBets: 0,
        earnedStaking: 0,
        totalTips: 0,
        totalRains: 0,
        totalCoindrops: 0,
      }
    : null;

  return (
    <BonusProvider>
      <div className="min-h-screen bg-[#06070a] text-[#f8fafc] font-sans antialiased">
        <SidebarNav onOpenRoulette={handleOpenRoulette} />
        <HeaderBar
          onToggleChat={onToggleChat}
          onOpenDeposit={() => openDepositModal()}
          onOpenSignup={handleOpenSignup}
          onOpenLogin={handleOpenLogin}
          onOpenUserMenu={handleOpenUserMenu}
        />
        <MobileTopBar
          onOpenDeposit={() => openDepositModal()}
          onOpenSignup={handleOpenSignup}
          onOpenLogin={handleOpenLogin}
          onOpenUserMenu={handleOpenUserMenu}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {bonusCountdown > 0 ? (
          <div className="w-full bg-[#ffcc00]/10 border-y border-[#ffcc00]/20 py-2.5 px-4 pt-[72px] lg:pt-0">
            <div className="mx-auto max-w-[1200px] flex items-center justify-center gap-2 text-xs sm:text-sm flex-wrap">
              <span>🎁</span>
              <span className="font-bold text-white uppercase tracking-tight">Bônus de R$ 680 disponível apenas hoje!</span>
              <span className="text-amber-400 font-black">| {formatTime(bonusCountdown)} restantes</span>
              <span className="hidden sm:inline text-[10px] text-amber-500 font-bold uppercase">(até {bonusDeadlineStr})</span>
            </div>
          </div>
        ) : (
          <div className="w-full bg-red-500/10 border-y border-red-500/30 py-2.5 px-4 pt-[72px] lg:pt-0">
            <p className="text-xs font-bold text-red-400 text-center">⏰ Prazo do bônus encerrado. Volte amanhã para novas promoções.</p>
          </div>
        )}

        <main className="ml-0 lg:ml-[240px] pt-[72px] lg:pt-0 p-4 lg:p-8 pb-20">
          <div className="mx-auto max-w-[1200px] space-y-10">
            <FeaturedBanner />
            
            {/* Atalhos de Jogos no Topo */}
            <MobileIconRow />

            {/* Widget de Depósito Rápido Interativo e de Alta Conversão */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0d0f14] to-[#07090d] border border-[#1c212b] p-6 lg:p-8 shadow-2xl">
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#ffcc00]/5 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-[#00A859]/5 rounded-full blur-3xl pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Textos e Chamada - Sempre no topo no mobile (order-1) */}
                <div className="order-1 lg:col-span-5 space-y-4">
                  <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#ffcc00] bg-[#ffcc00]/10 px-3 py-1 rounded-full border border-[#ffcc00]/20">
                    <Zap size={12} className="animate-pulse" />
                    Processamento Instantâneo
                  </span>
                  <h2 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white italic leading-tight">
                    Depósito Rápido <br />
                    <span className="text-[#ffcc00]">via PIX</span>
                  </h2>
                </div>

                {/* Seletor de Valores Interativo - Sempre abaixo no mobile (order-2) */}
                <div className="order-2 lg:col-span-7 bg-[#06070a]/60 border border-[#1c212b] rounded-2xl p-5 lg:p-6 space-y-5">
                  <div className="text-center lg:text-left">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Selecione o Valor</span>
                    <div className="text-3xl font-black text-white mt-1">
                      R$ {quickAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </div>
                  </div>

                  {/* Botões Rápidos */}
                  <div className="grid grid-cols-4 gap-2">
                    {[30, 50, 100, 200].map((val) => (
                      <button
                        key={val}
                        onClick={() => setQuickAmount(val)}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider border transition-all ${
                          quickAmount === val
                            ? "bg-[#00A859]/20 border-[#00A859] text-white shadow-[0_0_15px_rgba(0,168,89,0.15)]"
                            : "bg-[#13161d] border-[#1c212b] text-gray-400 hover:text-white"
                        }`}
                      >
                        R$ {val}
                      </button>
                    ))}
                  </div>

                  {/* Input Customizado */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">R$</span>
                    <input
                      type="number"
                      placeholder="Outro valor..."
                      value={quickAmount || ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val) && val > 0) {
                          setQuickAmount(val);
                        } else {
                          setQuickAmount(0);
                        }
                      }}
                      className="w-full bg-[#13161d] border border-[#1c212b] rounded-xl pl-10 pr-4 py-3.5 text-sm text-white font-bold focus:border-[#00A859] focus:outline-none transition-all"
                    />
                  </div>

                  {/* Botão de Ação */}
                  <button
                    onClick={() => {
                      if (user) {
                        openDepositModal(quickAmount);
                      } else {
                        handleOpenSignup();
                      }
                    }}
                    className="w-full bg-[#00A859] hover:bg-[#00944e] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-[0_4px_20px_rgba(0,168,89,0.3)] text-sm uppercase tracking-wider"
                  >
                    <Zap size={16} />
                    DEPOSITAR AGORA
                  </button>

                  {/* Texto explicativo movido para baixo da seleção de valor */}
                  <p className="text-gray-400 text-xs leading-relaxed text-center lg:text-left">
                    Gere sua cobrança em segundos com a tecnologia PagNow. O saldo cai na sua conta na hora para você começar a jogar.
                  </p>

                  {/* Selos de Confiança movidos para baixo da seleção de valor */}
                  <div className="pt-2 flex flex-wrap justify-center lg:justify-start gap-4 text-[10px] text-gray-500 font-bold uppercase tracking-wider border-t border-[#1c212b]/50">
                    <div className="flex items-center gap-1">
                      <ShieldCheck size={14} className="text-[#00A859]" />
                      <span>SSL Seguro</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Landmark size={14} className="text-[#00A859]" />
                      <span>Banco Central</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Lock size={14} className="text-[#00A859]" />
                      <span>PagNow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#0d0f14] border border-[#1c212b] p-2 overflow-hidden">
              <TopWinners />
            </div>

            {/* Feed de Apostas Ao Vivo */}
            <LiveBetsFeed />

            <section className="space-y-6">
              <div className="flex items-center justify-between border-l-4 border-[#ffcc00] pl-4">
                <h2 className="text-xl font-black uppercase tracking-tight italic">Os Mais Jogados</h2>
              </div>
              <GameGrid limit={12} onOpenSignup={handleOpenSignup} onPlayGame={handlePlayGame} />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between border-l-4 border-[#ffcc00] pl-4">
                <h2 className="text-xl font-black uppercase tracking-tight italic">Jogos Originais</h2>
                <div className="flex items-center gap-1.5 text-[10px] text-[#ffcc00] font-black uppercase tracking-wider">
                  <Sparkles size={12} /> Novopix
                </div>
              </div>
              <CustomGameCard />
            </section>

            <section className="space-y-6">
              <div className="flex items-center justify-between border-l-4 border-[#ffcc00] pl-4">
                <h2 className="text-xl font-black uppercase tracking-tight italic">Todos os Slots</h2>
              </div>
              <GameGrid onOpenSignup={handleOpenSignup} onPlayGame={handlePlayGame} />
            </section>
            <FooterHome />
          </div>
        </main>

        <MobileSidebar
          open={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpenRoulette={handleOpenRoulette}
          onOpenProfile={handleOpenProfile}
          onOpenDeposit={() => openDepositModal()}
          onOpenWithdraw={() => setWithdrawOpen(true)}
        />

        <MobileBottomNav onOpenRoulette={handleOpenRoulette} isRouletteOpen={showRoulette} />

        {onToggleChat && <FloatingChatButton onToggleChat={onToggleChat} />}

        <SignupPopup open={signupOpen} onClose={() => setSignupOpen(false)} />
        <LoginPopup open={loginOpen} onClose={() => setLoginOpen(false)} onOpenSignup={handleOpenSignup} />
        
        <RoulettePopup open={showRoulette} onClose={handleCloseRoulette} userId={rouletteUserId} />
        <DepositModal open={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} initialAmount={initialDepositAmount} />

        {user && (
          <WithdrawModal
            open={withdrawOpen}
            onClose={() => setWithdrawOpen(false)}
            userId={user.id}
            onOpenDeposit={handleOpenSpecificDeposit}
          />
        )}

        {userProfile && (
          <PlayerProfilePopup
            open={profileOpen}
            onClose={() => setProfileOpen(false)}
            profile={userProfile}
            onOpenWithdraw={() => setWithdrawOpen(true)}
          />
        )}

        <UserMenu
          open={isUserMenuOpen}
          onClose={() => setIsUserMenuOpen(false)}
          onOpenProfile={handleOpenProfile}
          onOpenWithdraw={() => setWithdrawOpen(true)}
          onOpenDeposit={() => openDepositModal()}
          onOpenHistory={() => setHistoryOpen(true)}
          onOpenBonus={() => setBonusOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
        />

        {user && (
          <HistoryModal
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            userId={user.id}
          />
        )}

        <BonusModal
          open={bonusOpen}
          onClose={() => setBonusOpen(false)}
        />

        <SupportModal
          open={supportOpen}
          onClose={() => setSupportOpen(false)}
          userEmail={user?.email}
        />

        {/* Modal de Gameplay Integrado na Home */}
        <GamePlayModal
          open={!!activeGame}
          onClose={() => setActiveGame(null)}
          gameTitle={activeGame?.title ?? ""}
          demoUrl={activeGame?.demoUrl ?? ""}
          onOpenDeposit={() => openDepositModal()}
        />

        <style
          dangerouslySetInnerHTML={{
            __html: `
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes bounce-once {
            0%, 100% { transform: translateY(0); }
            20% { transform: translateY(-6px); }
            40% { transform: translateY(0); }
            60% { transform: translateY(-3px); }
            80% { transform: translateY(0); }
          }
          .animate-bounce-once {
            animation: bounce-once 1s ease-in-out;
          }
        `,
          }}
        />
      </div>
    </BonusProvider>
  );
};

export default Index;