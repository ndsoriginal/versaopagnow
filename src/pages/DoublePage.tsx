import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, History, Minus, Plus, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import { fetchUserBalance, updateUserBalance } from "@/utils/balance";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/lib/supabase";
import SidebarNav from "@/components/SidebarNav";
import HeaderBar from "@/components/HeaderBar";
import MobileTopBar from "@/components/MobileTopBar";
import MobileBottomNav from "@/components/MobileBottomNav";
import MobileSidebar from "@/components/MobileSidebar";
import SignupPopup from "@/components/SignupPopup";
import LoginPopup from "@/components/LoginPopup";
import RoulettePopup from "@/components/RoulettePopup";
import DepositModal from "@/components/DepositModal";
import WithdrawModal from "@/components/WithdrawModal";
import UserMenu from "@/components/UserMenu";
import HistoryModal from "@/components/HistoryModal";
import BonusModal from "@/components/BonusModal";
import SupportModal from "@/components/SupportModal";
import PlayerProfilePopup from "@/components/PlayerProfilePopup";
import { BonusProvider } from "@/context/BonusContext";
import DoubleRoulette, { DoubleColor } from "@/components/DoubleRoulette";
import {
  manageDoubleRounds,
  getLatestHistory,
  getDoubleBets,
  placeBet,
  getCurrentRound,
  type DoubleRound,
  type DoubleBet,
  type DoubleHistoryEntry,
  MULTIPLIERS,
  COLOR_LABELS,
} from "@/services/doubleGame";

type GamePhase = "betting" | "spinning" | "finished";

type BetSlot = {
  color: DoubleColor | null;
  amount: number;
};

const POLL_INTERVAL = 1500;

function getBotName(userId: string): string | null {
  if (userId.startsWith("bot-")) {
    const raw = userId.replace("bot-", "");
    return raw.replace(/([A-Z])/g, " $1").trim();
  }
  return null;
}

function getUserLabel(bet: DoubleBet): string {
  if (bet.is_bot) {
    return getBotName(bet.user_id) || "Bot";
  }
  return `Usuário ${bet.user_id.slice(0, 4)}***`;
}

export default function DoublePage() {
  const navigate = useNavigate();
  const { user } = useSession();

  const [balance, setBalance] = useState(0);
  const [betSlots, setBetSlots] = useState<BetSlot[]>([
    { color: null, amount: 10 },
    { color: null, amount: 10 },
  ]);
  const [currentRound, setCurrentRound] = useState<DoubleRound | null>(null);
  const [bets, setBets] = useState<DoubleBet[]>([]);
  const [phase, setPhase] = useState<GamePhase | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [history, setHistory] = useState<DoubleHistoryEntry[]>([]);
  const [isRolling, setIsRolling] = useState(false);
  const [resultColor, setResultColor] = useState<DoubleColor | null>(null);
  const [resultNumber, setResultNumber] = useState<number | null>(null);
  const [won, setWon] = useState(false);
  const [winAmount, setWinAmount] = useState(0);
  const [betMode, setBetMode] = useState<"normal" | "auto">("normal");
  const [autoColor, setAutoColor] = useState<DoubleColor | null>(null);
  const [autoRounds, setAutoRounds] = useState(5);
  const [autoActive, setAutoActive] = useState(false);
  const [autoRemaining, setAutoRemaining] = useState(0);
  const [placingBet, setPlacingBet] = useState(false);
  const [visibleBetCount, setVisibleBetCount] = useState(0);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [resultType, setResultType] = useState<"win" | "loss" | "draw" | null>(null);
  const [resultAmount, setResultAmount] = useState(0);
  const [pendingResultRound, setPendingResultRound] = useState<string | null>(null);

  const pollRef = useRef<number | null>(null);
  const roundSubRef = useRef<any>(null);
  const betsSubRef = useRef<any>(null);
  const prevRoundStatusRef = useRef<string>("");
  const shownOverlayForRef = useRef<string | null>(null);

  // Modals
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

  const loadBalance = useCallback(async () => {
    if (user) setBalance(await fetchUserBalance(user.id));
  }, [user]);

  useEffect(() => { loadBalance(); }, [loadBalance]);
  useEffect(() => {
    const h = () => loadBalance();
    window.addEventListener("chat:simulate", h);
    return () => window.removeEventListener("chat:simulate", h);
  }, [loadBalance]);

  // Load initial data
  useEffect(() => {
    getLatestHistory(20).then(setHistory);
    (async () => {
      const existing = await getCurrentRound();
      if (existing) setCurrentRound(existing);
      await tick();
    })();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (roundSubRef.current) supabase.removeChannel(roundSubRef.current);
      if (betsSubRef.current) supabase.removeChannel(betsSubRef.current);
    };
  }, []);

  // Polling
  const tick = useCallback(async () => {
    const res = await manageDoubleRounds();
    if (res.success && res.round) {
      setCurrentRound(res.round);
    }
  }, []);

  useEffect(() => {
    pollRef.current = window.setInterval(tick, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [tick]);

  // Realtime: rounds
  useEffect(() => {
    if (roundSubRef.current) {
      supabase.removeChannel(roundSubRef.current);
    }
    const ch = supabase
      .channel("double-rounds-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "double_rounds" }, (payload) => {
        const updated = payload.new as any;
        if (updated && currentRound && updated.id === currentRound.id) {
          setCurrentRound(updated);
        }
      })
      .subscribe();
    roundSubRef.current = ch;
    return () => {
      if (roundSubRef.current) supabase.removeChannel(roundSubRef.current);
    };
  }, [currentRound?.id]);

  // Realtime: bets for current round
  useEffect(() => {
    if (betsSubRef.current) {
      supabase.removeChannel(betsSubRef.current);
      betsSubRef.current = null;
    }
    if (!currentRound?.id) return;

    const ch = supabase
      .channel(`double-bets-${currentRound.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "double_bets", filter: `round_id=eq.${currentRound.id}` },
        () => {
          getDoubleBets(currentRound.id).then(setBets);
        }
      )
      .subscribe();
    betsSubRef.current = ch;

    // Load bets immediately
    getDoubleBets(currentRound.id).then(setBets);

    return () => {
      if (betsSubRef.current) supabase.removeChannel(betsSubRef.current);
    };
  }, [currentRound?.id]);

  // Evaluate user result from bets
  const evaluateResult = useCallback((roundBets: DoubleBet[]) => {
    const userBets = roundBets.filter(b => b.user_id === user?.id);
    if (userBets.length === 0) return;

    const wonBets = userBets.filter(b => b.status === "won");
    const totalStake = userBets.reduce((s, b) => s + Number(b.amount), 0);
    const totalPayout = wonBets.reduce((s, b) => s + Number(b.payout), 0);
    const net = totalPayout - totalStake;

    setWon(net > 0);
    setWinAmount(net > 0 ? net : 0);

    if (net > 0) {
      setResultType("win");
      setResultAmount(net);
    } else if (net === 0 && wonBets.length > 0) {
      setResultType("draw");
      setResultAmount(totalStake);
    } else {
      setResultType("loss");
      setResultAmount(totalStake);
    }
  }, [user?.id]);

  // Track phase changes
  useEffect(() => {
    if (!currentRound) return;
    const status = currentRound.status;
    const prev = prevRoundStatusRef.current;

    if (status === "spinning" && prev !== "spinning") {
      setPhase("spinning");
      setIsRolling(true);
      setResultColor(currentRound.result_color as DoubleColor);
      setResultNumber(currentRound.result_number);
      setWon(false);
      setWinAmount(0);
    } else if (status === "finished" && prev !== "finished") {
      setPhase("finished");
      setIsRolling(false);
      getLatestHistory(20).then(setHistory);
      window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
      loadBalance();
      setPendingResultRound(currentRound.id);
      // Don't evaluate or show overlay yet — wait for bets to settle (race condition fix)
    } else if (status === "betting" && prev !== "betting") {
      setPhase("betting");
      setIsRolling(false);
      setResultColor(null);
      setResultNumber(null);
      setWon(false);
      setWinAmount(0);
      setResultType(null);
      setResultAmount(0);
      setPendingResultRound(null);
      resetBetSlots();
      loadBalance();
    } else if (prev === "" && !["betting", "spinning", "finished"].includes(status)) {
      setPhase(null);
      setIsRolling(false);
    }

    prevRoundStatusRef.current = status;
  }, [currentRound?.status, user?.id, loadBalance]);

  // Wait for settled bets before showing result overlay (race condition fix)
  useEffect(() => {
    if (!pendingResultRound || !currentRound) return;
    if (currentRound.id !== pendingResultRound) return;

    // Only evaluate once bets have actual results (at least one non-pending)
    const hasSettledBets = bets.some(b => b.status !== "pending");
    if (!hasSettledBets) return;

    evaluateResult(bets);

    // Show overlay once per round
    if (shownOverlayForRef.current !== currentRound.id) {
      shownOverlayForRef.current = currentRound.id;
      setShowResultOverlay(true);
      setTimeout(() => setShowResultOverlay(false), 3000);
    }

    setPendingResultRound(null);
  }, [bets, pendingResultRound, currentRound, evaluateResult]);

  // Progressive bet reveal during betting phase
  useEffect(() => {
    if (phase !== "betting") {
      setVisibleBetCount(0);
      return;
    }
    if (visibleBetCount >= bets.length) return;
    const timer = setTimeout(() => {
      setVisibleBetCount(prev => Math.min(prev + 1, bets.length));
    }, 400);
    return () => clearTimeout(timer);
  }, [phase, bets.length, visibleBetCount]);

  // Timer countdown
  useEffect(() => {
    if (!currentRound || !currentRound.betting_ends_at) return;
    const interval = setInterval(() => {
      const end = new Date(currentRound.betting_ends_at!).getTime();
      const now = Date.now();
      setTimeRemaining(Math.max(0, Math.ceil((end - now) / 1000)));
    }, 250);
    return () => clearInterval(interval);
  }, [currentRound?.betting_ends_at, currentRound?.status]);

  const onSpinComplete = useCallback(() => {
    setIsRolling(false);
  }, []);

  // Slot helpers
  const toggleSlotColor = useCallback((idx: number, color: DoubleColor) => {
    setBetSlots(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      return { ...s, color: s.color === color ? null : color };
    }));
  }, []);

  const updateSlotAmount = useCallback((idx: number, amount: number) => {
    setBetSlots(prev => prev.map((s, i) => i === idx ? { ...s, amount } : s));
  }, []);

  const resetBetSlots = useCallback(() => {
    setBetSlots(prev => prev.map(s => ({ ...s, color: null })));
  }, []);

  // Place a single bet (used by confirm and auto)
  const placeSingleBet = useCallback(async (color: DoubleColor, amount: number): Promise<boolean> => {
    if (!user) { setSignupOpen(true); return false; }
    if (!currentRound || currentRound.status !== "betting") return false;
    if (timeRemaining <= 0) { showError("Tempo de aposta esgotado"); return false; }
    if (amount <= 0) { showError("Valor inválido"); return false; }
    if (amount > balance) { showError("Saldo insuficiente"); return false; }

    const res = await placeBet(currentRound.id, color, amount);
    if (!res.success) {
      showError(res.error || "Erro ao apostar");
      return false;
    }
    if (res.new_balance !== undefined) {
      setBalance(res.new_balance);
    }
    return true;
  }, [user, currentRound, timeRemaining, balance]);

  // Confirm all selected bets
  const handleConfirmBets = useCallback(async () => {
    if (!user) { setSignupOpen(true); return; }
    if (!currentRound || currentRound.status !== "betting") return;
    if (timeRemaining <= 0) { showError("Tempo de aposta esgotado"); return; }

    const valid = betSlots.filter(s => s.color !== null && s.amount > 0);
    if (valid.length === 0) { showError("Selecione uma cor para apostar"); return; }
    if (valid.reduce((sum, s) => sum + s.amount, 0) > balance) { showError("Saldo insuficiente"); return; }

    setPlacingBet(true);
    try {
      let ok = true;
      for (const slot of valid) {
        const r = await placeBet(currentRound.id, slot.color!, slot.amount);
        if (!r.success) { showError(r.error || "Erro ao apostar"); ok = false; break; }
        if (r.new_balance !== undefined) setBalance(r.new_balance);
      }
      if (ok) {
        window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
        resetBetSlots();
      }
    } catch {
      showError("Erro ao realizar aposta");
    } finally {
      setPlacingBet(false);
    }
  }, [user, currentRound, timeRemaining, betSlots, balance, resetBetSlots]);

  // Auto-bet
  useEffect(() => {
    if (!autoActive || !autoColor || phase !== "betting") return;
    if (autoRemaining <= 0) { setAutoActive(false); return; }
    const timer = setTimeout(() => {
      setAutoRemaining(prev => prev - 1);
      placeSingleBet(autoColor, betSlots[0].amount).then(ok => {
        if (!ok) setAutoActive(false);
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [autoActive, autoColor, phase, autoRemaining, betSlots, placeSingleBet]);

  const startAuto = () => {
    if (!autoColor) { showError("Selecione uma cor primeiro"); return; }
    setAutoActive(true);
    setAutoRemaining(autoRounds);
    placeSingleBet(autoColor, betSlots[0].amount);
  };



  // Bets by color
  const redBets = bets.filter(b => b.color === "red");
  const blackBets = bets.filter(b => b.color === "black");
  const whiteBets = bets.filter(b => b.color === "white");

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const userProfile = useMemo(() => user ? {
    id: user.id, name: user.email?.split("@")[0] || "Jogador",
    avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email || "user")}`,
    tier: "blue" as const, level: 1, registeredAt: user.created_at || new Date().toISOString(),
    favoriteGame: "Double", recentWithdrawals: [], totalWagered: 0, totalBets: 0,
    earnedStaking: 0, totalTips: 0, totalRains: 0, totalCoindrops: 0,
  } : null, [user]);

  const roundLabel = currentRound ? `#${currentRound.round_number}` : "...";

  return (
    <BonusProvider>
      <div className="min-h-screen bg-gradient-to-b from-[#020617] to-[#0d1117] text-[#f8fafc] font-sans antialiased relative overflow-hidden">
        <SidebarNav onOpenRoulette={() => setShowRoulette(true)} />
        <HeaderBar
          onOpenDeposit={() => setIsDepositModalOpen(true)}
          onOpenSignup={() => setSignupOpen(true)}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenUserMenu={() => user ? setIsUserMenuOpen(true) : setLoginOpen(true)}
        />
        <MobileTopBar
          onOpenDeposit={() => setIsDepositModalOpen(true)}
          onOpenSignup={() => setSignupOpen(true)}
          onOpenLogin={() => setLoginOpen(true)}
          onOpenUserMenu={() => user ? setIsUserMenuOpen(true) : setLoginOpen(true)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Result Overlay */}
        {showResultOverlay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
            <div className={cn(
              "animate-result-pop rounded-2xl px-10 py-8 text-center shadow-2xl border backdrop-blur-xl",
              resultType === "win" && "bg-gradient-to-b from-green-500/90 to-green-700/90 border-green-300/40",
              resultType === "loss" && "bg-gradient-to-b from-red-500/90 to-red-700/90 border-red-300/40",
              resultType === "draw" && "bg-gradient-to-b from-yellow-500/90 to-yellow-700/90 border-yellow-300/40"
            )}>
              <div className="text-6xl mb-3">
                {resultType === "win" ? "🎉" : resultType === "loss" ? "😞" : "🤝"}
              </div>
              <div className={cn(
                "text-2xl font-black uppercase tracking-wider mb-2",
                resultType === "win" && "text-green-100",
                resultType === "loss" && "text-red-100",
                resultType === "draw" && "text-yellow-100"
              )}>
                {resultType === "win" ? "Você Ganhou!" : resultType === "loss" ? "Você Perdeu" : "Empate!"}
              </div>
              <div className="text-3xl font-black text-white">
                R$ {formatCurrency(resultAmount)}
              </div>
              {resultType === "draw" && (
                <div className="text-[11px] text-yellow-200 mt-2 font-bold">
                  Ganhou e perdeu — ficou no zero
                </div>
              )}
            </div>
          </div>
        )}

        <main className="ml-0 lg:ml-[240px] pt-[72px] lg:pt-0 p-4 lg:p-8 pb-20">
          <div className="mx-auto max-w-[1100px] space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate("/")} className="h-9 w-9 rounded-xl bg-[#13161d] border border-[#1c212b] flex items-center justify-center hover:bg-[#1c212b] transition-all">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h1 className="text-xl font-black uppercase tracking-tight italic">Double</h1>
                  <span className="text-[10px] text-gray-500 font-bold bg-[#13161d] px-2 py-0.5 rounded-full border border-[#1c212b]">
                    Rodada {roundLabel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#0d0f14] border border-[#1c212b] rounded-2xl px-5 py-3">
                <Wallet size={16} className="text-[#ffcc00]" />
                <span className="text-sm font-black">R$ {formatCurrency(balance)}</span>
              </div>
            </div>

            {/* Timer */}
            {!currentRound || !["betting", "spinning", "finished"].includes(currentRound.status) ? (
              <div className="text-center py-2">
                <div className="inline-block h-10 w-24 bg-[#1c212b] rounded-lg animate-pulse" />
              </div>
            ) : phase === "betting" && (
              <div className="text-center py-2">
                <span className="text-4xl font-black text-white tabular-nums">
                  {timeRemaining}s
                </span>
                <span className="block text-[10px] text-gray-500 uppercase tracking-wider font-bold mt-1">
                  Tempo para apostar
                </span>
              </div>
            )}

            {phase === "spinning" && (
              <div className="text-center py-2">
                <span className="text-sm font-black text-[#ffcc00] uppercase tracking-widest animate-pulse">
                  Girando...
                </span>
              </div>
            )}

            {/* Roulette */}
            <DoubleRoulette
              resultNumber={resultNumber}
              resultColor={resultColor}
              status={currentRound?.status || "betting"}
              onSpinComplete={onSpinComplete}
            />

            {/* History */}
            <div className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <History size={14} className="text-gray-500" />
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Giros Anteriores</span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {history.length === 0 && (
                  <span className="text-[10px] text-gray-600">Aguardando resultados...</span>
                )}
                {history.map((h, i) => (
                  <div
                    key={h.id || i}
                    className={cn(
                      "shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black border",
                      h.color === "red" ? "bg-red-500/20 border-red-500/30 text-red-400" :
                      h.color === "black" ? "bg-gray-500/20 border-gray-500/30 text-gray-300" :
                      "bg-white/10 border-white/20 text-white"
                    )}
                  >
                    {h.multiplier}x
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
              {/* Left: Bet Controls */}
              <div className="space-y-4">
                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-5 space-y-4">
                  {/* Mode Toggle */}
                  <div className="flex bg-[#13161d] rounded-xl p-1">
                    {(["normal", "auto"] as const).map(m => (
                      <button
                        key={m}
                        onClick={() => setBetMode(m)}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                          betMode === m ? "bg-[#ffcc00] text-black shadow-lg" : "text-gray-500 hover:text-gray-300"
                        )}
                      >
                        {m === "normal" ? "Normal" : "Auto"}
                      </button>
                    ))}
                  </div>

                  {betMode === "normal" && (
                    <>
                      {/* Two Bet Slots - side by side on desktop */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                        {betSlots.map((slot, idx) => (
                          <div key={idx} className="bg-[#13161d]/50 rounded-xl p-3 space-y-2 border border-[#1c212b]">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
                                Aposta {idx + 1}
                              </span>
                              {slot.color && (
                                <span className={cn(
                                  "text-[9px] font-black",
                                  slot.color === "red" && "text-red-400",
                                  slot.color === "black" && "text-gray-300",
                                  slot.color === "white" && "text-white"
                                )}>
                                  {COLOR_LABELS[slot.color]} • {MULTIPLIERS[slot.color]}x
                                </span>
                              )}
                            </div>

                            {/* Amount Input */}
                            <div className="flex items-center gap-1.5 bg-[#13161d] rounded-lg p-0.5 border border-[#1c212b]">
                              <button onClick={() => updateSlotAmount(idx, Math.max(1, slot.amount - 1))}
                                disabled={phase !== "betting"}
                                className="h-7 w-7 rounded-md bg-[#0d0f14] hover:bg-[#1c212b] flex items-center justify-center disabled:opacity-30">
                                <Minus size={12} />
                              </button>
                              <input type="number" value={slot.amount}
                                onChange={e => updateSlotAmount(idx, Math.max(1, parseFloat(e.target.value) || 1))}
                                disabled={phase !== "betting"}
                                className="flex-1 bg-transparent text-center text-sm font-black text-white focus:outline-none disabled:opacity-50" />
                              <button onClick={() => updateSlotAmount(idx, slot.amount + 1)}
                                disabled={phase !== "betting"}
                                className="h-7 w-7 rounded-md bg-[#0d0f14] hover:bg-[#1c212b] flex items-center justify-center disabled:opacity-30">
                                <Plus size={12} />
                              </button>
                            </div>

                            {/* Quick Amounts */}
                            <div className="flex gap-1">
                              {[5, 10, 25, 50, 100].map(v => (
                                <button key={v} onClick={() => updateSlotAmount(idx, v)}
                                  disabled={phase !== "betting"}
                                  className="flex-1 py-1 rounded-md bg-[#0d0f14] border border-[#1c212b] text-[8px] font-bold text-gray-400 hover:text-white disabled:opacity-30">
                                  R${v}
                                </button>
                              ))}
                            </div>

                            {/* Color Buttons */}
                            <div className="grid grid-cols-3 gap-1.5">
                              {(["red", "black", "white"] as DoubleColor[]).map(color => {
                                const isSelected = slot.color === color;
                                const isUsedByOther = betSlots.some((s, i) => i !== idx && s.color === color);
                                return (
                                  <button key={color}
                                    onClick={() => toggleSlotColor(idx, color)}
                                    disabled={phase !== "betting" || (isUsedByOther && !isSelected)}
                                    className={cn(
                                      "flex flex-col items-center gap-0.5 py-2 rounded-lg font-black transition-all active:scale-[0.97] disabled:opacity-20 disabled:cursor-not-allowed",
                                      isSelected && "ring-2 ring-yellow-400",
                                      color === "red" && "bg-red-600 text-white",
                                      color === "black" && "bg-black text-white",
                                      color === "white" && "bg-white text-black"
                                    )}>
                                    <span className="text-[9px] uppercase tracking-wider">{COLOR_LABELS[color]}</span>
                                    <span className="text-sm">{MULTIPLIERS[color]}x</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Confirm Button */}
                      <button onClick={handleConfirmBets}
                        disabled={phase !== "betting" || placingBet || !betSlots.some(s => s.color !== null)}
                        className="w-full py-3 rounded-2xl bg-[#ffcc00] text-black font-black text-[11px] uppercase tracking-wider transition-all active:scale-[0.98] hover:bg-[#e6b800] shadow-lg shadow-[#ffcc00]/20 disabled:opacity-30 disabled:cursor-not-allowed">
                        {placingBet ? "Apostando..." : "Confirmar Aposta(s)"}
                      </button>
                    </>
                  )}
                </div>

                {/* Auto Mode Controls */}
                {betMode === "auto" && (
                  <div className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-5 space-y-3">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Rodadas</label>
                      <input
                        type="number"
                        value={autoRounds}
                        onChange={e => setAutoRounds(Math.max(1, parseInt(e.target.value) || 1))}
                        disabled={autoActive}
                        className="w-full bg-[#13161d] border border-[#1c212b] rounded-xl px-3 py-2.5 text-sm text-white text-center font-bold focus:outline-none disabled:opacity-50"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {(["red", "black", "white"] as DoubleColor[]).map(color => (
                        <button
                          key={color}
                          onClick={() => setAutoColor(color)}
                          disabled={autoActive}
                          className={cn(
                            "py-3 rounded-xl text-xs font-bold border transition-all disabled:opacity-30",
                            autoColor === color ? "bg-[#ffcc00] text-black border-[#ffcc00]" : "bg-[#13161d] border-[#1c212b] text-gray-400"
                          )}
                        >
                          {COLOR_LABELS[color]}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        if (autoActive) { setAutoActive(false); return; }
                        startAuto();
                      }}
                      disabled={!autoColor || phase !== "betting"}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-30",
                        autoActive ? "bg-gray-700 text-gray-300" : "bg-[#ffcc00] text-black hover:bg-[#e6b800] shadow-lg shadow-[#ffcc00]/20"
                      )}
                    >
                      {autoActive ? `Parar Auto (${autoRemaining})` : `Auto ${autoRounds} rodadas`}
                    </button>
                  </div>
                )}

                {/* Result Banner */}
                {phase === "finished" && currentRound?.result_color && (
                  <div className={cn(
                    "text-center p-5 rounded-2xl border",
                    won
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                      : "bg-red-500/10 border-red-500/20 text-red-400"
                  )}>
                    <div className="text-2xl font-black">
                      {won ? `+R$ ${formatCurrency(winAmount)}` : "PERDEU"}
                    </div>
                    <div className="text-xs mt-1 text-gray-500">
                      Resultado: <span className="font-bold">
                        {COLOR_LABELS[currentRound.result_color as DoubleColor]} #{currentRound.result_number}
                      </span>
                      {" • "}
                      <span className="font-bold">
                        {currentRound.result_color === "white" ? "14x" : "2x"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Live Bets */}
              <div className="space-y-3">
                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={14} className="text-gray-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Apostas ao Vivo</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {/* Red Column */}
                    <BetColumn title="Vermelho" color="red" bets={redBets} formatCurrency={formatCurrency} visibleCount={visibleBetCount} />

                    {/* White Column */}
                    <BetColumn title="Branco" color="white" bets={whiteBets} formatCurrency={formatCurrency} visibleCount={visibleBetCount} />

                    {/* Black Column */}
                    <BetColumn title="Preto" color="black" bets={blackBets} formatCurrency={formatCurrency} visibleCount={visibleBetCount} />
                  </div>

                  {bets.length === 0 && (
                    <div className="text-center py-4 text-[10px] text-gray-600">
                      Nenhuma aposta ainda. Seja o primeiro!
                    </div>
                  )}
                </div>

                {/* Multipliers Info */}
                <div className="bg-[#0d0f14] border border-[#1c212b] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp size={14} className="text-gray-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">Multiplicadores</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between"><span className="text-red-400 font-bold">Vermelho</span><span className="text-white font-black">2x</span></div>
                    <div className="flex justify-between"><span className="text-gray-300 font-bold">Preto</span><span className="text-white font-black">2x</span></div>
                    <div className="flex justify-between"><span className="text-white font-bold">Branco</span><span className="text-[#ffcc00] font-black">14x</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <MobileBottomNav onOpenRoulette={() => setShowRoulette(true)} isRouletteOpen={showRoulette} />
        <SignupPopup open={signupOpen} onClose={() => setSignupOpen(false)} />
        <LoginPopup open={loginOpen} onClose={() => setLoginOpen(false)} onOpenSignup={() => setSignupOpen(true)} />
        <RoulettePopup open={showRoulette} onClose={() => setShowRoulette(false)} userId={user?.id} />
        <DepositModal open={isDepositModalOpen} onClose={() => setIsDepositModalOpen(false)} initialAmount={initialDepositAmount} />
        {user && <WithdrawModal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} userId={user.id} onOpenDeposit={(a) => { setInitialDepositAmount(a); setIsDepositModalOpen(true); }} />}
        {userProfile && <PlayerProfilePopup open={profileOpen} onClose={() => setProfileOpen(false)} profile={userProfile} onOpenWithdraw={() => setWithdrawOpen(true)} />}
        <UserMenu open={isUserMenuOpen} onClose={() => setIsUserMenuOpen(false)} onOpenProfile={() => user ? setProfileOpen(true) : setLoginOpen(true)} onOpenWithdraw={() => setWithdrawOpen(true)} onOpenDeposit={() => setIsDepositModalOpen(true)} onOpenHistory={() => setHistoryOpen(true)} onOpenBonus={() => setBonusOpen(true)} onOpenSupport={() => setSupportOpen(true)} />
        {user && <HistoryModal open={historyOpen} onClose={() => setHistoryOpen(false)} userId={user.id} />}
        <BonusModal open={bonusOpen} onClose={() => setBonusOpen(false)} />
        <SupportModal open={supportOpen} onClose={() => setSupportOpen(false)} userEmail={user?.email} />
        <MobileSidebar open={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} onOpenRoulette={() => setShowRoulette(true)} onOpenProfile={() => user ? setProfileOpen(true) : setLoginOpen(true)} onOpenDeposit={() => setIsDepositModalOpen(true)} onOpenWithdraw={() => setWithdrawOpen(true)} />

        <style>{`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          @keyframes bet-enter {
            from { opacity: 0; transform: translateY(-6px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          .animate-bet-enter {
            animation: bet-enter 0.35s ease-out both;
          }
          @keyframes result-pop {
            0% { opacity: 0; transform: scale(0.5) translateY(20px); }
            50% { transform: scale(1.1) translateY(-5px); }
            100% { opacity: 1; transform: scale(1) translateY(0); }
          }
          .animate-result-pop {
            animation: result-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
        `}</style>
      </div>
    </BonusProvider>
  );
}

// === Bet Column Sub-Component ===
function BetColumn({
  title,
  color,
  bets,
  formatCurrency,
  visibleCount,
}: {
  title: string;
  color: string;
  bets: DoubleBet[];
  formatCurrency: (v: number) => string;
  visibleCount: number;
}) {
  const totalAmount = bets.reduce((sum, b) => sum + Number(b.amount), 0);
  const colorMap = {
    red: { bg: "bg-red-900/20 border-red-700/20", header: "bg-gradient-to-r from-red-700/40 to-red-600/20 text-red-300", border: "border-red-700/15", name: "text-red-200", amount: "text-red-50", total: "text-red-300 border-red-700/20", dot: "bg-red-500" },
    black: { bg: "bg-gray-800/20 border-gray-600/20", header: "bg-gradient-to-r from-gray-600/40 to-gray-500/20 text-gray-200", border: "border-gray-600/15", name: "text-gray-200", amount: "text-gray-50", total: "text-gray-300 border-gray-600/20", dot: "bg-gray-400" },
    white: { bg: "bg-white/5 border-white/10", header: "bg-gradient-to-r from-white/20 to-white/5 text-white", border: "border-white/10", name: "text-gray-200", amount: "text-white", total: "text-white border-white/15", dot: "bg-white" },
  };
  const c = colorMap[color as keyof typeof colorMap];

  return (
    <div className={cn("rounded-xl border overflow-hidden", c.bg)}>
      <div className={cn("text-[9px] font-black uppercase tracking-wider text-center py-2", c.header)}>
        {title}
      </div>

      <div className="p-2 space-y-1 min-h-[80px]">
        {bets.length === 0 && (
          <div className="text-center py-4 text-[8px] text-gray-600">—</div>
        )}

        {bets.slice(0, Math.min(visibleCount, 10)).map((bet, i) => (
          <div
            key={bet.id}
            className="flex justify-between items-center text-[10px] animate-bet-enter"
            style={{ animationDelay: `${i * 0.08}s` }}
          >
            <span className="flex items-center gap-1.5 truncate max-w-[70px]">
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
              <span className={cn("truncate", bet.is_bot ? "font-medium" : "text-gray-500")}>
                {getUserLabel(bet)}
              </span>
            </span>
            <span className={cn("font-bold tabular-nums", c.amount)}>
              R$ {formatCurrency(Number(bet.amount))}
            </span>
          </div>
        ))}

        {bets.length > 10 && (
          <div className="text-center text-[8px] text-gray-600 pt-1">
            +{bets.length - 10} mais
          </div>
        )}
      </div>

      {bets.length > 0 && (
        <div className={cn(
          "flex justify-between items-center text-[10px] px-2 py-1.5 border-t font-black",
          c.total
        )}>
          <span>Total</span>
          <span className="tabular-nums">R$ {formatCurrency(totalAmount)}</span>
        </div>
      )}
    </div>
  );
}
