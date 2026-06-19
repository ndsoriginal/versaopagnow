"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { EXTERNAL_GAMES, type ExternalGame } from "@/data/externalGames";
import ExternalGameCard from "@/components/ExternalGameCard";
import ExternalGameModal from "@/components/ExternalGameModal";
import SidebarNav from "@/components/SidebarNav";
import HeaderBar from "@/components/HeaderBar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileSidebar from "@/components/MobileSidebar";
import FooterHome from "@/components/FooterHome";
import SignupPopup from "@/components/SignupPopup";
import LoginPopup from "@/components/LoginPopup";
import RoulettePopup from "@/components/RoulettePopup";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import PlayerProfilePopup from "@/components/PlayerProfilePopup";
import UserMenu from "@/components/UserMenu";
import HistoryModal from "@/components/HistoryModal";
import BonusModal from "@/components/BonusModal";
import SupportModal from "@/components/SupportModal";
import { useSession } from "@/context/SessionContext";
import { BonusProvider } from "@/context/BonusContext";
import { Activity, ShieldCheck, Landmark, Lock } from "lucide-react";

export default function GamesPage() {
  const { user } = useSession();
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const [activeGame, setActiveGame] = useState<ExternalGame | null>(null);

  // Layout & Modal States
  const [signupOpen, setSignupOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [initialDepositAmount, setInitialDepositAmount] = useState<number | undefined>(undefined);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [showRoulette, setShowRoulette] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const res = await fetch("https://apisoft.ilike.motorcycles/status");
        if (res.ok) {
          const data = await res.json();
          if (data.status === "operational") {
            setApiStatus("online");
            return;
          }
        }
        setApiStatus("offline");
      } catch (err) {
        setApiStatus("offline");
      }
    };
    checkApiStatus();
  }, []);

  const openDepositModal = (amount?: number) => {
    setInitialDepositAmount(amount);
    setIsDepositModalOpen(true);
  };

  const handleOpenSpecificDeposit = (amount: number) => {
    openDepositModal(amount);
  };

  const handleOpenSignup = () => setSignupOpen(true);
  const handleOpenLogin = () => setLoginOpen(true);
  const handleOpenProfile = () => {
    if (user) setProfileOpen(true);
    else setLoginOpen(true);
  };
  const handleOpenUserMenu = () => {
    if (user) setIsUserMenuOpen(true);
    else setLoginOpen(true);
  };
  const handleOpenRoulette = () => setShowRoulette(true);
  const handleCloseRoulette = () => setShowRoulette(false);

  const handlePlayGame = (game: ExternalGame) => {
    if (!user) {
      setSignupOpen(true);
    } else {
      setActiveGame(game);
    }
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

        <main className="ml-0 lg:ml-[240px] pt-[72px] lg:pt-0 p-4 lg:p-8 pb-20">
          <div className="mx-auto max-w-[1200px] space-y-8">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl">
              <div>
                <h1 className="text-2xl lg:text-3xl font-black uppercase tracking-tight text-white italic">
                  Vitrine de <span className="text-[#ffcc00]">Jogos</span>
                </h1>
                <p className="text-xs text-gray-400 mt-1">Aproveite nossa seleção premium de slots integrados diretamente com a API oficial.</p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status do Servidor:</span>
                {apiStatus === "online" ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 text-xs text-emerald-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    API Online
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20 text-xs text-red-400 font-bold">
                    <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    API Offline
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {EXTERNAL_GAMES.map((game) => (
                <ExternalGameCard key={game.id} game={game} onPlay={handlePlayGame} />
              ))}
            </div>

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
        <SignupPopup open={signupOpen} onClose={() => setSignupOpen(false)} />
        <LoginPopup open={loginOpen} onClose={() => setLoginOpen(false)} onOpenSignup={handleOpenSignup} />
        <RoulettePopup open={showRoulette} onClose={handleCloseRoulette} userId={user?.id} />
        <DepositModal open={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} initialAmount={initialDepositAmount} />

        {user && (
          <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} userId={user.id} onOpenDeposit={handleOpenSpecificDeposit} />
        )}

        {userProfile && (
          <PlayerProfilePopup open={profileOpen} onClose={() => setProfileOpen(false)} profile={userProfile} onOpenWithdraw={() => setWithdrawOpen(true)} />
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

        {user && <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} userId={user.id} />}
        <BonusModal open={bonusOpen} onClose={() => setBonusOpen(false)} />
        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} userEmail={user?.email} />
        <ExternalGameModal game={activeGame} onClose={() => setActiveGame(null)} />
      </div>
    </BonusProvider>
  );
}