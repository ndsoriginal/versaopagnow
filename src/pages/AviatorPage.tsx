"use client";

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ShieldCheck, Users, Flame, Trophy, Sparkles, Target, Compass, Activity, ArrowRight, Lock, Landmark } from "lucide-react";
import { useSession } from "@/context/SessionContext";
import { fetchUserBalance, updateUserBalance } from "@/utils/balance";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import { BonusProvider } from "@/context/BonusContext";
import { cn } from "@/lib/utils";

// Layout Components
import SidebarNav from "@/components/SidebarNav";
import HeaderBar from "@/components/HeaderBar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileSidebar from "@/components/MobileSidebar";

// Modals & Popups
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

type GameState = "WAITING" | "FLYING" | "CRASHED";

type BetPanel = {
  amount: number;
  isPlaced: boolean;
  isAutoCashout: boolean;
  autoCashoutValue: number;
  hasCashedOut: boolean;
  winAmount: number;
};

type PastMultiplier = {
  value: number;
  color: "blue" | "green" | "yellow" | "red";
};

type FakePlayer = {
  name: string;
  bet: number;
  cashoutMult?: number;
  winAmount?: number;
  cashedOut: boolean;
  avatarSeed: string;
};

const FAKE_NAMES = [
  "lucas***", "gabi***", "marcos***", "ana***", "thiago***", 
  "julia***", "rafa***", "carla***", "felipe***", "leticia***",
  "bruno***", "beatriz***", "mateus***", "sofia***", "enzo***",
  "pedro***", "mari***", "gustavo***", "aline***", "diego***"
];

export default function AviatorPage() {
  const navigate = useNavigate();
  const { user } = useSession();

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

  // Game States
  const [balance, setBalance] = useState<number>(0);
  const [gameState, setGameState] = useState<GameState>("WAITING");
  const [multiplier, setMultiplier] = useState<number>(1.0);
  const [countdown, setCountdown] = useState<number>(5.0);
  const [pastMultipliers, setPastMultipliers] = useState<PastMultiplier[]>([
    { value: 1.12, color: "red" },
    { value: 1.54, color: "blue" },
    { value: 3.52, color: "green" },
    { value: 1.05, color: "red" },
    { value: 12.40, color: "yellow" },
    { value: 1.89, color: "blue" },
    { value: 2.15, color: "green" },
    { value: 1.18, color: "red" },
    { value: 5.60, color: "green" },
    { value: 24.50, color: "yellow" },
  ]);

  // Dual betting panels
  const [panel1, setPanel1] = useState<BetPanel>({
    amount: 10,
    isPlaced: false,
    isAutoCashout: false,
    autoCashoutValue: 2.0,
    hasCashedOut: false,
    winAmount: 0,
  });

  const [panel2, setPanel2] = useState<BetPanel>({
    amount: 20,
    isPlaced: false,
    isAutoCashout: false,
    autoCashoutValue: 1.5,
    hasCashedOut: false,
    winAmount: 0,
  });

  // Refs to prevent stale closures in the game loop
  const panel1Ref = useRef<BetPanel>(panel1);
  const panel2Ref = useRef<BetPanel>(panel2);

  useEffect(() => {
    panel1Ref.current = panel1;
  }, [panel1]);

  useEffect(() => {
    panel2Ref.current = panel2;
  }, [panel2]);

  const [fakePlayers, setFakePlayers] = useState<FakePlayer[]>([]);
  const [totalBetsAmount, setTotalBetsAmount] = useState(0);
  const [screenShake, setScreenShake] = useState(false);

  // Refs for game loop
  const stateRef = useRef<GameState>("WAITING");
  const multRef = useRef<number>(1.0);
  const animationFrameId = useRef<number | null>(null);
  const startTime = useRef<number>(0);
  const crashPoint = useRef<number>(1.0);

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

  // Load balance
  const loadBalance = async () => {
    if (user) {
      const bal = await fetchUserBalance(user.id);
      setBalance(bal);
    }
  };

  useEffect(() => {
    loadBalance();
    const handleUpdate = () => loadBalance();
    window.addEventListener("chat:simulate", handleUpdate);
    return () => {
      window.removeEventListener("chat:simulate", handleUpdate);
    };
  }, [user]);

  // Generate fake players for the round
  const generateFakePlayers = () => {
    const count = Math.floor(Math.random() * 15) + 15;
    const players: FakePlayer[] = [];
    let total = 0;
    for (let i = 0; i < count; i++) {
      const bet = Math.floor(Math.random() * 150) + 2;
      total += bet;
      players.push({
        name: FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)],
        bet,
        cashedOut: false,
        avatarSeed: Math.random().toString(36).substring(7),
      });
    }
    setFakePlayers(players);
    setTotalBetsAmount(total);
  };

  // Start game loop
  useEffect(() => {
    startWaitingPhase();
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, []);

  const startWaitingPhase = () => {
    setGameState("WAITING");
    stateRef.current = "WAITING";
    setCountdown(5.0);
    setMultiplier(1.0);
    multRef.current = 1.0;
    generateFakePlayers();

    // Reset panel cashout states for the new round
    setPanel1(prev => ({ ...prev, hasCashedOut: false, winAmount: 0 }));
    setPanel2(prev => ({ ...prev, hasCashedOut: false, winAmount: 0 }));

    let count = 5.0;
    const interval = setInterval(() => {
      count -= 0.1;
      if (count <= 0) {
        clearInterval(interval);
        startFlightPhase();
      } else {
        setCountdown(Number(count.toFixed(1)));
      }
    }, 100);
  };

  const startFlightPhase = () => {
    setGameState("FLYING");
    stateRef.current = "FLYING";
    startTime.current = Date.now();

    // Determine crash point using a realistic Aviator distribution
    const rand = Math.random();
    if (rand < 0.04) { // Reduced instant crash probability from 8% to 4% to make it more exciting
      crashPoint.current = 1.0;
    } else {
      // Generates slightly higher crash points on average
      crashPoint.current = Number((1.01 + Math.pow(Math.random(), -1.15) * 0.08).toFixed(2));
      if (crashPoint.current > 150) {
        crashPoint.current = Number((80 + Math.random() * 70).toFixed(2));
      }
    }

    // Deduct bets from balance
    deductBets();

    // Start animation loop
    runFlightAnimation();
  };

  const deductBets = async () => {
    if (!user) return;
    let totalDeduction = 0;
    if (panel1Ref.current.isPlaced) totalDeduction += panel1Ref.current.amount;
    if (panel2Ref.current.isPlaced) totalDeduction += panel2Ref.current.amount;

    if (totalDeduction > 0) {
      const currentBal = await fetchUserBalance(user.id);
      if (currentBal >= totalDeduction) {
        const newBal = currentBal - totalDeduction;
        await updateUserBalance(user.id, newBal);
        setBalance(newBal);
        window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
      } else {
        showError("Saldo insuficiente para realizar as apostas.");
        setPanel1(prev => ({ ...prev, isPlaced: false }));
        setPanel2(prev => ({ ...prev, isPlaced: false }));
      }
    }
  };

  const runFlightAnimation = () => {
    if (stateRef.current !== "FLYING") return;

    const elapsed = (Date.now() - startTime.current) / 1000;
    // Slower growth curve: lower exponent and coefficient so it takes longer to climb and feels more suspenseful
    const currentMult = Number((1.0 + Math.pow(elapsed, 1.2) * 0.04).toFixed(2));

    if (currentMult >= crashPoint.current) {
      triggerCrash(crashPoint.current);
    } else {
      setMultiplier(currentMult);
      multRef.current = currentMult;

      // Handle Auto Cashouts
      handleAutoCashouts(currentMult);

      // Simulate fake players cashing out
      simulateFakePlayersCashout(currentMult);

      animationFrameId.current = requestAnimationFrame(runFlightAnimation);
    }
  };

  const handleAutoCashouts = (currentMult: number) => {
    if (panel1Ref.current.isPlaced && !panel1Ref.current.hasCashedOut && panel1Ref.current.isAutoCashout && currentMult >= panel1Ref.current.autoCashoutValue) {
      cashoutPanel(1, panel1Ref.current.autoCashoutValue);
    }
    if (panel2Ref.current.isPlaced && !panel2Ref.current.hasCashedOut && panel2Ref.current.isAutoCashout && currentMult >= panel2Ref.current.autoCashoutValue) {
      cashoutPanel(2, panel2Ref.current.autoCashoutValue);
    }
  };

  const simulateFakePlayersCashout = (currentMult: number) => {
    setFakePlayers(prev =>
      prev.map(p => {
        if (!p.cashedOut && Math.random() < 0.04 && currentMult > 1.15) {
          return {
            ...p,
            cashedOut: true,
            cashoutMult: currentMult,
            winAmount: Number((p.bet * currentMult).toFixed(2)),
          };
        }
        return p;
      })
    );
  };

  const cashoutPanel = async (panelId: 1 | 2, cashoutMult: number) => {
    if (!user) return;
    const panel = panelId === 1 ? panel1Ref.current : panel2Ref.current;
    if (!panel.isPlaced || panel.hasCashedOut) return;

    const win = Number((panel.amount * cashoutMult).toFixed(2));

    // Update panel state
    const updatePanel = panelId === 1 ? setPanel1 : setPanel2;
    updatePanel(prev => ({ ...prev, hasCashedOut: true, winAmount: win }));

    // Add win to balance
    try {
      const currentBal = await fetchUserBalance(user.id);
      const newBal = currentBal + win;
      await updateUserBalance(user.id, newBal);
      setBalance(newBal);

      // Register transaction
      await supabase.from("transactions").insert({
        user_id: user.id,
        amount: win,
        type: "deposit",
        status: "completed",
        pix_code: `AVIATOR_WIN_${cashoutMult}X`,
        created_at: new Date().toISOString()
      });

      showSuccess(`Ganhou R$ ${win.toFixed(2)} (${cashoutMult.toFixed(2)}x)! 🚀`);
      window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
    } catch (err) {
      console.error("Error cashing out:", err);
    }
  };

  const getMultiplierColor = (val: number): "blue" | "green" | "yellow" | "red" => {
    if (val < 1.2) return "red";
    if (val < 2.0) return "blue";
    if (val < 10.0) return "green";
    return "yellow";
  };

  const triggerCrash = (finalMult: number) => {
    setGameState("CRASHED");
    stateRef.current = "CRASHED";
    setMultiplier(finalMult);

    // Screen shake effect
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 600);

    // Add to past multipliers list with functional color coding
    const color = getMultiplierColor(finalMult);
    setPastMultipliers(prev => [{ value: finalMult, color }, ...prev.slice(0, 14)]);

    // Check if user lost any active bets using refs to avoid stale closures
    let lostAmount = 0;
    if (panel1Ref.current.isPlaced && !panel1Ref.current.hasCashedOut) lostAmount += panel1Ref.current.amount;
    if (panel2Ref.current.isPlaced && !panel2Ref.current.hasCashedOut) lostAmount += panel2Ref.current.amount;

    if (lostAmount > 0) {
      showError(`Você perdeu R$ ${lostAmount.toFixed(2)}! 💥`);
      if (user) {
        supabase.from("transactions").insert({
          user_id: user.id,
          amount: lostAmount,
          type: "withdraw",
          status: "completed",
          pix_code: `AVIATOR_LOSS_${finalMult}X`,
          created_at: new Date().toISOString()
        }).then(() => {
          window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
        });
      }
    }

    // Reset placed bets that didn't cash out
    setPanel1(prev => ({ ...prev, isPlaced: false }));
    setPanel2(prev => ({ ...prev, isPlaced: false }));

    setTimeout(() => {
      startWaitingPhase();
    }, 3000);
  };

  const handlePlaceBet = (panelId: 1 | 2) => {
    if (!user) {
      showError("Você precisa estar logado para apostar.");
      return;
    }

    if (gameState !== "WAITING") {
      showError("Aguarde a próxima rodada para apostar.");
      return;
    }

    const panel = panelId === 1 ? panel1 : panel2;
    const updatePanel = panelId === 1 ? setPanel1 : setPanel2;

    if (panel.isPlaced) {
      updatePanel(prev => ({ ...prev, isPlaced: false }));
    } else {
      if (panel.amount > balance) {
        showError("Saldo insuficiente.");
        return;
      }
      updatePanel(prev => ({ ...prev, isPlaced: true }));
    }
  };

  const adjustAmount = (panelId: 1 | 2, action: "plus" | "minus" | "double" | "half" | number) => {
    const panel = panelId === 1 ? panel1 : panel2;
    if (panel.isPlaced) {
      showError("Não é possível alterar o valor de uma aposta já realizada.");
      return;
    }
    if (gameState !== "WAITING") {
      showError("Aguarde a próxima rodada para alterar o valor.");
      return;
    }

    const updatePanel = panelId === 1 ? setPanel1 : setPanel2;
    updatePanel(prev => {
      let next = prev.amount;
      if (action === "plus") next += 1;
      else if (action === "minus") next = Math.max(1, next - 1);
      else if (action === "double") next *= 2;
      else if (action === "half") next = Math.max(1, Math.floor(next / 2));
      else if (typeof action === "number") next = action;
      return { ...prev, amount: next };
    });
  };

  // Helper to get dynamic color theme based on current multiplier
  const getThemeColor = (mult: number) => {
    if (mult < 1.2) {
      return {
        text: "text-red-500",
        glow: "drop-shadow-[0_0_35px_rgba(239,68,68,0.85)]",
        rocketGlow: "drop-shadow-[0_0_15px_rgba(239,68,68,0.8)]",
        trailFrom: "from-red-500",
        trailTo: "to-transparent",
        trailPing: "bg-red-500",
        stroke: "#ef4444",
        strokeGlow: "drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]"
      };
    } else if (mult < 2.0) {
      return {
        text: "text-blue-400",
        glow: "drop-shadow-[0_0_35px_rgba(59,130,246,0.85)]",
        rocketGlow: "drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]",
        trailFrom: "from-blue-400",
        trailTo: "to-transparent",
        trailPing: "bg-blue-500",
        stroke: "#3b82f6",
        strokeGlow: "drop-shadow-[0_0_10px_rgba(59,130,246,0.8)]"
      };
    } else if (mult < 10.0) {
      return {
        text: "text-emerald-400",
        glow: "drop-shadow-[0_0_35px_rgba(16,185,129,0.85)]",
        rocketGlow: "drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]",
        trailFrom: "from-emerald-400",
        trailTo: "to-transparent",
        trailPing: "bg-emerald-500",
        stroke: "#10b981",
        strokeGlow: "drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]"
      };
    } else {
      return {
        text: "text-yellow-400",
        glow: "drop-shadow-[0_0_35px_rgba(234,179,8,0.95)]",
        rocketGlow: "drop-shadow-[0_0_20px_rgba(234,179,8,0.9)]",
        trailFrom: "from-yellow-400",
        trailTo: "to-transparent",
        trailPing: "bg-yellow-500",
        stroke: "#eab308",
        strokeGlow: "drop-shadow-[0_0_15px_rgba(234,179,8,0.9)]"
      };
    }
  };

  const theme = getThemeColor(multiplier);

  // Split multiplier into integer and decimal parts for custom sizing
  const formattedMult = multiplier.toFixed(2);
  const dotIndex = formattedMult.indexOf(".");
  const integerPart = formattedMult.substring(0, dotIndex);
  const decimalPart = formattedMult.substring(dotIndex);

  const userProfile = user
    ? {
        id: user.id,
        name: user.email?.split("@")[0] || "Jogador",
        avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email || "user")}`,
        tier: "blue" as const,
        level: 1,
        registeredAt: user.created_at || new Date().toISOString(),
        favoriteGame: "Space Crash",
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
      <div className="min-h-screen bg-[#06070a] text-[#f8fafc] font-sans antialiased relative overflow-hidden">
        {/* Global Layout Navigation */}
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

        {/* Main Content Area */}
        <main className="ml-0 lg:ml-[240px] pt-[72px] lg:pt-0 p-4 lg:p-8 pb-20">
          <div className="mx-auto max-w-[1200px] space-y-6">
            
            {/* Flight Arena with Custom Background */}
            <div 
              className={`relative h-[380px] sm:h-[440px] border border-[#1c212b] rounded-3xl overflow-hidden flex flex-col items-center justify-center shadow-2xl transition-all duration-100 ${
                screenShake ? "animate-shake border-red-600/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]" : ""
              }`}
              style={{
                backgroundImage: "linear-gradient(to bottom, rgba(3, 0, 8, 0.1), rgba(3, 0, 8, 0.15)), url('/Jogos/fundofo.png')",
                backgroundSize: "cover",
                backgroundPosition: "center"
              }}
            >
              {/* HUD Corner Brackets */}
              <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-white/20 pointer-events-none" />
              <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-white/20 pointer-events-none" />
              <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-white/20 pointer-events-none" />
              <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-white/20 pointer-events-none" />

              {/* HUD Side Indicators */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-4 text-[9px] text-white/30 font-mono pointer-events-none hidden sm:flex">
                <div className="flex items-center gap-1"><Activity size={10} /> ALT: {(multiplier * 1200).toFixed(0)}M</div>
                <div className="flex items-center gap-1"><Compass size={10} /> TRAJ: OK</div>
              </div>

              {/* Dynamic Starfield Background */}
              <div 
                className={`absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:24px_24px] opacity-10 transition-all duration-500 ${
                  gameState === "FLYING" ? "animate-starfield" : ""
                }`} 
              />

              {/* Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />

              {/* Multiplier Display */}
              <div className="z-10 text-center">
                {gameState === "WAITING" && (
                  <div className="space-y-4 animate-pulse">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-gray-400 flex items-center justify-center gap-2">
                      <Sparkles size={14} className="text-red-500" />
                      PREPARANDO LANÇAMENTO
                    </p>
                    <div className="text-5xl font-black text-white tracking-tight">
                      {countdown.toFixed(1)}s
                    </div>
                    <div className="w-56 bg-white/5 h-2 rounded-full mx-auto overflow-hidden border border-white/10">
                      <div
                        className="bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 h-full transition-all duration-100"
                        style={{ width: `${(countdown / 5.0) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {gameState === "FLYING" && (
                  <div className="space-y-1">
                    <div className={cn("text-7xl sm:text-8xl font-black tracking-tight transition-all duration-300 flex items-baseline justify-center", theme.text, theme.glow)}>
                      <span>{integerPart}</span>
                      <span className="text-4xl sm:text-5xl font-bold">{decimalPart}x</span>
                    </div>
                  </div>
                )}

                {gameState === "CRASHED" && (
                  <div className="space-y-2">
                    <p className="text-red-500 text-2xl font-black uppercase tracking-[0.2em] animate-bounce drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                      EXPLODIU!
                    </p>
                    <div className="text-4xl font-black text-gray-500 flex items-baseline justify-center">
                      <span>{integerPart}</span>
                      <span className="text-2xl font-bold">{decimalPart}x</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Animated Rocket & Curve */}
              {gameState === "FLYING" && (
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full">
                    {/* Curved flight path with glowing neon stroke */}
                    <path
                      d={`M 0,${window.innerHeight * 0.4} Q ${window.innerWidth * 0.25},${window.innerHeight * 0.3} ${Math.min(90, (multiplier - 1) * 35 + 10)}%,${Math.max(10, 90 - (multiplier - 1) * 28)}%`}
                      fill="none"
                      stroke={theme.stroke}
                      strokeWidth="5"
                      strokeLinecap="round"
                      className={cn("transition-all duration-100", theme.strokeGlow)}
                    />
                  </svg>

                  {/* Custom Rocket Image with Jet Flame Trail */}
                  <div
                    className="absolute transition-all duration-100"
                    style={{
                      left: `${Math.min(90, (multiplier - 1) * 35 + 10)}%`,
                      top: `${Math.max(10, 90 - (multiplier - 1) * 28)}%`,
                      transform: "translate(-50%, -50%) rotate(45deg)",
                    }}
                  >
                    <div className="relative">
                      {/* Jet Flame Trail */}
                      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5">
                        <div className={cn("w-6 h-16 bg-gradient-to-b to-transparent rounded-full blur-xs animate-pulse", theme.trailFrom)} />
                        <div className={cn("w-3 h-8 rounded-full animate-ping", theme.trailPing)} />
                      </div>

                      {/* Custom Rocket Image (2x smaller: w-28 h-28) */}
                      <img 
                        src="/Jogos/foguete.png" 
                        alt="Rocket" 
                        className={cn("w-28 h-28 object-contain transition-all duration-300", theme.rocketGlow)}
                        onError={(e) => {
                          // Fallback to SVG if image fails to load
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Past Multipliers Bar (Moved below the game with neon styling) */}
            <div className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-3 flex items-center gap-2 overflow-x-auto scrollbar-hide shadow-[0_0_20px_rgba(0,0,0,0.5)]">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider shrink-0 mr-2">Histórico:</span>
              {pastMultipliers.map((m, idx) => (
                <span
                  key={idx}
                  className={`text-[11px] font-black px-3.5 py-1.5 rounded-full border shrink-0 transition-all duration-300 hover:scale-110 ${
                    m.color === "red"
                      ? "bg-red-950/40 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                      : m.color === "blue"
                      ? "bg-blue-950/40 border-blue-500 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.4)]"
                      : m.color === "green"
                      ? "bg-emerald-950/40 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                      : "bg-yellow-950/40 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.5)] animate-pulse"
                  }`}
                >
                  {m.value.toFixed(2)}x
                </span>
              ))}
            </div>

            {/* Dual Betting Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Panel 1 */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-30" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Painel de Aposta 1</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Auto Saque</span>
                    <input
                      type="checkbox"
                      checked={panel1.isAutoCashout}
                      onChange={(e) => setPanel1(prev => ({ ...prev, isAutoCashout: e.target.checked }))}
                      className="rounded border-white/10 bg-[#030008] text-red-600 focus:ring-red-500 focus:ring-offset-0"
                    />
                    {panel1.isAutoCashout && (
                      <input
                        type="number"
                        step="0.1"
                        value={panel1.autoCashoutValue}
                        onChange={(e) => setPanel1(prev => ({ ...prev, autoCashoutValue: parseFloat(e.target.value) || 1.5 }))}
                        className="w-16 bg-white/[0.03] border border-white/10 rounded-xl px-2 py-1 text-xs text-white text-center font-bold focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {/* Amount Controls */}
                  <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-2 flex flex-col justify-between shadow-inner">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => adjustAmount(1, "minus")}
                        className="h-8 w-8 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center font-black text-lg transition-all active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-sm font-black text-white">R$ {panel1.amount}</span>
                      <button
                        onClick={() => adjustAmount(1, "plus")}
                        className="h-8 w-8 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center font-black text-lg transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {[5, 10, 20, 50].map((v) => (
                        <button
                          key={v}
                          onClick={() => adjustAmount(1, v)}
                          className="py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-[10px] font-black transition-all active:scale-95"
                        >
                          R${v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-1">
                    {panel1.isPlaced ? (
                      gameState === "WAITING" ? (
                        <button
                          onClick={() => handlePlaceBet(1)}
                          className="w-full h-full bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex flex-col items-center justify-center uppercase tracking-widest text-xs transition-all active:scale-95 shadow-[0_4px_15px_rgba(220,38,38,0.3)]"
                        >
                          <span>Cancelar</span>
                          <span className="text-[9px] opacity-60 mt-0.5">Aposta Feita</span>
                        </button>
                      ) : panel1.hasCashedOut ? (
                        <div className="w-full h-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                          <span className="text-[10px] font-black uppercase tracking-wider">Retirado</span>
                          <span className="text-sm font-black">R$ {panel1.winAmount.toFixed(2)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => cashoutPanel(1, multiplier)}
                          className="w-full h-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black rounded-2xl flex flex-col items-center justify-center uppercase tracking-widest text-xs transition-all active:scale-95 shadow-[0_4px_20px_rgba(245,158,11,0.4)] animate-pulse"
                        >
                          <span>Cash Out</span>
                          <span className="text-sm font-black mt-0.5">R$ {(panel1.amount * multiplier).toFixed(2)}</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handlePlaceBet(1)}
                        disabled={gameState !== "WAITING"}
                        className={cn(
                          "w-full h-full text-white font-black rounded-2xl flex flex-col items-center justify-center uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg",
                          gameState === "WAITING" 
                            ? "bg-[#00A859] hover:bg-[#00944e] shadow-[0_4px_15px_rgba(0,168,89,0.3)]" 
                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                        )}
                      >
                        <span>{gameState === "WAITING" ? "Apostar" : "Aguarde..."}</span>
                        <span className="text-[9px] opacity-60 mt-0.5">R$ {panel1.amount}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Panel 2 */}
              <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-5 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-transparent opacity-30" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Painel de Aposta 2</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 font-black uppercase tracking-wider">Auto Saque</span>
                    <input
                      type="checkbox"
                      checked={panel2.isAutoCashout}
                      onChange={(e) => setPanel2(prev => ({ ...prev, isAutoCashout: e.target.checked }))}
                      className="rounded border-[#1c212b] bg-[#06070a] text-red-600 focus:ring-red-500 focus:ring-offset-0"
                    />
                    {panel2.isAutoCashout && (
                      <input
                        type="number"
                        step="0.1"
                        value={panel2.autoCashoutValue}
                        onChange={(e) => setPanel2(prev => ({ ...prev, autoCashoutValue: parseFloat(e.target.value) || 1.5 }))}
                        className="w-16 bg-[#13161d] border border-[#1c212b] rounded-xl px-2 py-1 text-xs text-white text-center font-bold focus:border-red-500 focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  {/* Amount Controls */}
                  <div className="flex-1 bg-[#13161d] border border-[#1c212b] rounded-2xl p-2 flex flex-col justify-between shadow-inner">
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => adjustAmount(2, "minus")}
                        className="h-8 w-8 rounded-xl bg-[#1c212b] hover:bg-[#2d3644] border border-white/5 flex items-center justify-center font-black text-lg transition-all active:scale-90"
                      >
                        -
                      </button>
                      <span className="text-sm font-black text-white">R$ {panel2.amount}</span>
                      <button
                        onClick={() => adjustAmount(2, "plus")}
                        className="h-8 w-8 rounded-xl bg-[#1c212b] hover:bg-[#2d3644] border border-white/5 flex items-center justify-center font-black text-lg transition-all active:scale-90"
                      >
                        +
                      </button>
                    </div>
                    <div className="grid grid-cols-4 gap-1 mt-2">
                      {[5, 10, 20, 50].map((v) => (
                        <button
                          key={v}
                          onClick={() => adjustAmount(2, v)}
                          className="py-1.5 rounded-lg bg-[#1c212b] hover:bg-[#2d3644] text-[10px] font-black transition-all active:scale-95"
                        >
                          R${v}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex-1">
                    {panel2.isPlaced ? (
                      gameState === "WAITING" ? (
                        <button
                          onClick={() => handlePlaceBet(2)}
                          className="w-full h-full bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl flex flex-col items-center justify-center uppercase tracking-widest text-xs transition-all active:scale-95 shadow-[0_4px_15px_rgba(220,38,38,0.3)]"
                        >
                          <span>Cancelar</span>
                          <span className="text-[9px] opacity-60 mt-0.5">Aposta Feita</span>
                        </button>
                      ) : panel2.hasCashedOut ? (
                        <div className="w-full h-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                          <span className="text-[10px] font-black uppercase tracking-wider">Retirado</span>
                          <span className="text-sm font-black">R$ {panel2.winAmount.toFixed(2)}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => cashoutPanel(2, multiplier)}
                          className="w-full h-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black rounded-2xl flex flex-col items-center justify-center uppercase tracking-widest text-xs transition-all active:scale-95 shadow-[0_4px_20px_rgba(245,158,11,0.4)] animate-pulse"
                        >
                          <span>Cash Out</span>
                          <span className="text-sm font-black mt-0.5">R$ {(panel2.amount * multiplier).toFixed(2)}</span>
                        </button>
                      )
                    ) : (
                      <button
                        onClick={() => handlePlaceBet(2)}
                        disabled={gameState !== "WAITING"}
                        className={cn(
                          "w-full h-full text-white font-black rounded-2xl flex flex-col items-center justify-center uppercase tracking-widest text-xs transition-all active:scale-95 shadow-lg",
                          gameState === "WAITING" 
                            ? "bg-[#00A859] hover:bg-[#00944e] shadow-[0_4px_15px_rgba(0,168,89,0.3)]" 
                            : "bg-gray-800 text-gray-500 cursor-not-allowed border border-white/5"
                        )}
                      >
                        <span>{gameState === "WAITING" ? "Apostar" : "Aguarde..."}</span>
                        <span className="text-[9px] opacity-60 mt-0.5">R$ {panel2.amount}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Live Bets Feed (Stacked below the game) */}
            <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-[#1c212b] pb-4">
                <div className="flex items-center gap-2">
                  <Users size={16} className="text-red-500 animate-pulse" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-white">
                    Apostas ao Vivo
                  </h3>
                </div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                  Total: R$ {totalBetsAmount.toLocaleString("pt-BR")}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[300px] overflow-y-auto scrollbar-hide">
                {fakePlayers.map((p, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-3 rounded-2xl text-xs transition-all duration-300 border ${
                      p.cashedOut 
                        ? "bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]" 
                        : "bg-[#13161d]/40 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <img 
                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.avatarSeed}`} 
                        alt="avatar" 
                        className="w-7 h-7 rounded-lg bg-[#1c212b] border border-white/5"
                      />
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-200">{p.name}</span>
                        <span className="text-[10px] text-gray-500 font-medium">Aposta: R$ {p.bet}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      {p.cashedOut ? (
                        <>
                          <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20 block w-fit ml-auto mb-0.5">
                            {p.cashoutMult?.toFixed(2)}x
                          </span>
                          <span className="font-black text-emerald-400">
                            R$ {p.winAmount?.toFixed(2)}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-600 font-bold flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                          Subindo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav onOpenRoulette={handleOpenRoulette} isRouletteOpen={showRoulette} />

        {/* Global Modals & Popups */}
        <SignupPopup open={signupOpen} onClose={() => setSignupOpen(false)} />
        <LoginPopup open={loginOpen} onClose={() => setLoginOpen(false)} onOpenSignup={handleOpenSignup} />
        <RoulettePopup open={showRoulette} onClose={handleCloseRoulette} userId={user?.id} />
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

        <MobileSidebar
          open={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
          onOpenRoulette={handleOpenRoulette}
          onOpenProfile={handleOpenProfile}
          onOpenDeposit={() => openDepositModal()}
          onOpenWithdraw={() => setWithdrawOpen(true)}
        />

        {/* Custom CSS Animations */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes shake {
            0%, 100% { transform: translate(0, 0); }
            10% { transform: translate(-4px, -2px); }
            20% { transform: translate(3px, 4px); }
            30% { transform: translate(-4px, 2px); }
            40% { transform: translate(3px, -3px); }
            50% { transform: translate(-2px, 4px); }
            60% { transform: translate(4px, -2px); }
            70% { transform: translate(-3px, 2px); }
            80% { transform: translate(2px, -3px); }
            90% { transform: translate(-2px, 4px); }
          }
          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
          @keyframes starfield {
            0% { background-position: 0px 0px; }
            100% { background-position: -400px 400px; }
          }
          .animate-starfield {
            animation: starfield 4s linear infinite;
          }
        `}} />
      </div>
    </BonusProvider>
  );
}