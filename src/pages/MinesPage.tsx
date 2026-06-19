import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wallet, Minus, Plus, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import { fetchUserBalance } from "@/utils/balance";
import { showError } from "@/utils/toast";
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
import {
  startMinesGame,
  revealMinesTile,
  cashoutMinesGame,
  type MinesGame,
} from "@/services/minesGame";

const GRID_SIZE = 25;
type TileStatus = "hidden" | "loading" | "safe" | "mine" | "mine-muted";

const tileVariants = {
  hidden: { scale: 1 },
  pressed: { scale: 0.92 },
  hover: { y: -3, scale: 1.05 },
  shake: { x: [0, -8, 8, -6, 6, -3, 3, 0], transition: { duration: 0.45 } },
};

function MineTile({
  tile,
  onClick,
  disabled,
}: {
  tile: { index: number; status: TileStatus };
  onClick: (index: number) => void;
  disabled: boolean;
}) {
  const isRevealed = tile.status === "safe" || tile.status === "mine" || tile.status === "mine-muted";
  return (
    <motion.button
      onClick={() => onClick(tile.index)}
      disabled={disabled}
      whileHover={!disabled && tile.status === "hidden" ? "hover" : undefined}
      whileTap={!disabled && tile.status === "hidden" ? "pressed" : undefined}
      animate={tile.status === "mine" ? "shake" : undefined}
      variants={tileVariants}
      className={cn(
        "mine-tile aspect-square rounded-xl border-2 relative overflow-hidden",
        "disabled:cursor-not-allowed",
        tile.status === "hidden" && !disabled && "cursor-pointer",
        tile.status === "hidden" && disabled && "cursor-default border-[#1c212b]/50",
        tile.status === "safe" && "border-[#F4C542]/60",
        tile.status === "mine" && "border-red-500/60",
        tile.status === "mine-muted" && "border-gray-600/30 opacity-60",
        tile.status === "loading" && "border-[#F4C542]/30"
      )}
    >
      <div className={cn(
        "tile-inner w-full h-full rounded-xl flex items-center justify-center",
        isRevealed && "tile-flipped"
      )}>
        <div className={cn(
          "tile-front absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden",
          "bg-gradient-to-b from-[#1A2440] via-[#111A30] to-[#090E1A]",
          tile.status === "loading" && "animate-loading-pulse"
        )}
          style={{
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -8px 20px rgba(0,0,0,0.5), 0 8px 20px rgba(0,0,0,0.4)"
          }}
        >
          <span className="text-lg sm:text-2xl font-black text-gray-600/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">?</span>
          {tile.status === "loading" && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#050B18]/80 rounded-xl">
              <div className="w-5 h-5 border-2 border-[#F4C542] border-t-transparent rounded-full animate-spin drop-shadow-[0_0_6px_rgba(244,197,66,0.3)]" />
            </div>
          )}
        </div>
        <div className={cn(
          "tile-back absolute inset-0 flex items-center justify-center rounded-xl overflow-hidden",
          tile.status === "safe" && "bg-gradient-to-b from-[#F4C542] to-[#C88A10]",
          tile.status === "mine" && "bg-gradient-to-b from-[#DC2626] to-[#7F1D1D]",
          tile.status === "mine-muted" && "bg-gradient-to-b from-gray-500 to-gray-700 opacity-60"
        )}
          style={tile.status === "safe" ? {
            border: "1px solid rgba(244,197,66,0.3)",
            boxShadow: "0 0 35px rgba(244,197,66,0.60), 0 0 60px rgba(244,197,66,0.20), 0 14px 30px rgba(0,0,0,0.35)"
          } :
            tile.status === "mine" ? {
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 0 40px rgba(239,68,68,0.75), 0 0 70px rgba(239,68,68,0.25), 0 14px 30px rgba(0,0,0,0.4)"
            } : {}}
        >
          {tile.status === "safe" && (
            <span className="diamond-icon">◆</span>
          )}
          {tile.status === "mine" && <div className="bomb-icon" />}
          {tile.status === "mine-muted" && <span className="text-white/30 text-lg">●</span>}
        </div>
      </div>
    </motion.button>
  );
}

function MinesGrid({
  tiles,
  onReveal,
  gameStatus,
  loadingTile,
}: {
  tiles: { index: number; status: TileStatus }[];
  onReveal: (index: number) => void;
  gameStatus?: string;
  loadingTile: number | null;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 sm:gap-3 max-w-[500px] mx-auto">
      {tiles.map((tile) => (
        <MineTile
          key={tile.index}
          tile={tile}
          onClick={onReveal}
          disabled={gameStatus !== "active" || tile.status !== "hidden" || loadingTile === tile.index}
        />
      ))}
    </div>
  );
}

export default function MinesPage() {
  const navigate = useNavigate();
  const { user } = useSession();

  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(3);
  const [game, setGame] = useState<MinesGame | null>(null);
  const [tiles, setTiles] = useState<{ index: number; status: TileStatus }[]>(
    Array.from({ length: GRID_SIZE }, (_, i) => ({ index: i, status: "hidden" as const }))
  );
  const [loadingTile, setLoadingTile] = useState<number | null>(null);
  const [pastResults, setPastResults] = useState<{ won: boolean; mult: number; bet: number }[]>([]);
  const [multiplierBump, setMultiplierBump] = useState(false);
  const [payoutBump, setPayoutBump] = useState(false);

  // Animated payout display
  const [displayedPayout, setDisplayedPayout] = useState(0);
  const payoutRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Result toast
  const [showToast, setShowToast] = useState(false);
  const [toastType, setToastType] = useState<"win" | "loss" | null>(null);
  const [toastAmount, setToastAmount] = useState(0);

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

  const resetTiles = () => setTiles(
    Array.from({ length: GRID_SIZE }, (_, i) => ({ index: i, status: "hidden" as const }))
  );

  const animateNumber = (from: number, to: number, duration: number, cb: (v: number) => void) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    const start = performance.now();
    const update = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      cb(from + (to - from) * t);
      if (t < 1) animFrameRef.current = requestAnimationFrame(update);
    };
    animFrameRef.current = requestAnimationFrame(update);
  };

  const triggerBump = () => {
    setMultiplierBump(true);
    setTimeout(() => setMultiplierBump(false), 350);
    setPayoutBump(true);
    setTimeout(() => setPayoutBump(false), 350);
  };

  const handleStartGame = async () => {
    if (!user) { setSignupOpen(true); return; }
    if (game?.status === "active") return;
    if (betAmount > balance) { showError("Saldo insuficiente"); return; }

    const res = await startMinesGame(betAmount, mineCount);
    if (!res.success || !res.game) {
      showError(res.error || "Erro ao iniciar jogo");
      return;
    }

    resetTiles();
    setGame(res.game);
    setLoadingTile(null);
    setShowToast(false);
    payoutRef.current = 0;
    setDisplayedPayout(0);
    await loadBalance();
  };

  const revealAllMinesSequentially = (minePositions: number[], clickedIndex: number, delay: number) => {
    const ordered = [clickedIndex, ...minePositions.filter(p => p !== clickedIndex)];
    ordered.forEach((pos, i) => {
      setTimeout(() => {
        setTiles(prev => prev.map(t => t.index === pos ? { ...t, status: "mine" as const } : t));
      }, i * delay);
    });
  };

  const revealMinesAfterCashout = (minePositions: number[], delay: number) => {
    minePositions.forEach((pos, i) => {
      setTimeout(() => {
        setTiles(prev => prev.map(t => t.index === pos ? { ...t, status: "mine-muted" as const } : t));
      }, i * delay);
    });
  };

  const handleRevealTile = async (tileIndex: number) => {
    if (!game || game.status !== "active") return;
    if (tiles[tileIndex].status !== "hidden") return;

    setLoadingTile(tileIndex);
    const res = await revealMinesTile(game.id, tileIndex);
    setLoadingTile(null);

    if (!res.success || !res.result) {
      showError(res.error || "Erro ao revelar casa");
      return;
    }

    if (res.result.result === "safe") {
      setTiles(prev => prev.map(t => t.index === tileIndex ? { ...t, status: "safe" as const } : t));
      setGame(res.result.game);
      triggerBump();
      // Animate payout number
      const newPayout = res.result.game.potential_payout || 0;
      animateNumber(payoutRef.current, newPayout, 350, (v) => {
        setDisplayedPayout(v);
      });
      payoutRef.current = newPayout;
    }

    if (res.result.result === "mine") {
      setTiles(prev => prev.map(t => t.index === tileIndex ? { ...t, status: "mine" as const } : t));
      setGame(res.result.game);
      revealAllMinesSequentially(res.result.mine_positions, tileIndex, 120);
      setToastType("loss");
      setToastAmount(0);
      setDisplayedPayout(0);
      setTimeout(() => setShowToast(true), 600);
      setPastResults(prev => [{ won: false, mult: 0, bet: betAmount }, ...prev.slice(0, 19)]);
      setTimeout(() => loadBalance(), 1000);
    }
  };

  const handleCashout = async () => {
    if (!game || game.status !== "active") return;
    const oldPayout = payoutRef.current;

    const res = await cashoutMinesGame(game.id);
    if (!res.success || !res.result) {
      showError(res.error || "Erro ao retirar");
      return;
    }

    setGame(res.result.game);
    revealMinesAfterCashout(res.result.mine_positions, 80);

    // Animate final payout
    const finalPayout = res.result.game.final_payout || 0;
    payoutRef.current = finalPayout;
    animateNumber(oldPayout || 0, finalPayout, 400, (v) => setDisplayedPayout(v));

    setToastType("win");
    setToastAmount(finalPayout);
    setTimeout(() => setShowToast(true), 400);
    setPastResults(prev => [{
      won: true,
      mult: res.result.game.current_multiplier,
      bet: betAmount,
    }, ...prev.slice(0, 19)]);
    setTimeout(() => loadBalance(), 1000);
  };

  const handleNewGame = () => {
    setGame(null);
    setShowToast(false);
    setToastType(null);
    setToastAmount(0);
    payoutRef.current = 0;
    setDisplayedPayout(0);
    resetTiles();
  };

  const gameIsActive = game?.status === "active";
  const gameOver = game?.status === "busted" || game?.status === "cashed_out";

  const userProfile = user ? {
    id: user.id,
    name: user.email?.split("@")[0] || "Jogador",
    avatar: `https://api.dicebear.com/7.x/lorelei/svg?seed=${encodeURIComponent(user.email || "user")}`,
    tier: "blue" as const,
    level: 1,
    registeredAt: user.created_at || new Date().toISOString(),
    favoriteGame: "Mines",
    recentWithdrawals: [],
    totalWagered: 0,
    totalBets: 0,
    earnedStaking: 0,
    totalTips: 0,
    totalRains: 0,
    totalCoindrops: 0,
  } : null;

  return (
    <BonusProvider>
      <div className="min-h-screen text-[#f8fafc] font-sans antialiased relative overflow-hidden"
        style={{
          background: `
            radial-gradient(circle at 20% 0%, rgba(244,197,66,0.18), transparent 40%),
            radial-gradient(circle at 80% 0%, rgba(34,197,94,0.08), transparent 35%),
            radial-gradient(circle at 50% 100%, rgba(244,197,66,0.06), transparent 45%),
            radial-gradient(circle at 50% 50%, rgba(244,197,66,0.02), transparent 60%),
            linear-gradient(180deg, #030712, #0A0F1E)
          `
        }}
      >
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

        {game?.status === "busted" && <div className="danger-flash" />}

        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              className={cn(
                "fixed top-6 left-1/2 -translate-x-1/2 z-50 rounded-2xl px-8 py-5 text-center shadow-2xl border backdrop-blur-xl",
                toastType === "win"
                  ? "bg-gradient-to-b from-[#F4C542]/90 to-[#D4941A]/90 border-[#F4C542]/30"
                  : "bg-gradient-to-b from-red-600/90 to-red-800/90 border-red-400/30"
              )}
            >
              <div className="text-3xl mb-2">{toastType === "win" ? "💰" : "💥"}</div>
              <div className={cn(
                "text-base font-black uppercase tracking-widest",
                toastType === "win" ? "text-white" : "text-red-100"
              )}>
                {toastType === "win" ? "Retirada Realizada!" : "Você encontrou uma mina!"}
              </div>
              {toastType === "win" && (
                <div className="text-2xl font-black text-white mt-2 drop-shadow-[0_0_10px_rgba(244,197,66,0.3)]">
                  +R$ {toastAmount.toFixed(2)}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <main className="ml-0 lg:ml-[240px] pt-[72px] lg:pt-0 p-4 lg:p-8 pb-20 relative z-10">
          <div className="mx-auto max-w-[1200px] space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate("/")} className="h-9 w-9 rounded-xl bg-[#0A0F1E] border border-[#F4C542]/20 flex items-center justify-center hover:bg-[#1A2240] transition-all text-gray-500 hover:text-[#F4C542] hover:border-[#F4C542]/40 hover:shadow-[0_0_12px_rgba(244,197,66,0.08)]">
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h1 className="text-2xl font-black tracking-tight leading-none">
                    <span className="text-white italic drop-shadow-[0_0_6px_rgba(255,255,255,0.08)]">ORANGE</span>{' '}
                    <span className="text-[#F4C542] italic drop-shadow-[0_0_14px_rgba(244,197,66,0.45)]">MINES</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-bold uppercase tracking-[0.25em] text-[#F4C542]/70 bg-[#F4C542]/10 px-2 py-0.5 rounded-full border border-[#F4C542]/20 shadow-[0_0_6px_rgba(244,197,66,0.04)]">
                      ✦ Premium
                    </span>
                    {game && (
                      <span className={cn(
                        "text-[8px] font-bold px-2 py-0.5 rounded-full border tracking-wider",
                        game.status === "active" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/25 shadow-[0_0_8px_rgba(34,197,94,0.08)]" :
                        game.status === "cashed_out" ? "text-[#F4C542] bg-[#F4C542]/10 border-[#F4C542]/25 shadow-[0_0_8px_rgba(244,197,66,0.08)]" :
                        "text-red-400 bg-red-500/10 border-red-500/25"
                      )}>
                        {game.status === "active" ? "◆ Jogando" : game.status === "cashed_out" ? "✦ Vitória" : "✕ Derrota"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-[#0A0F1E] border border-[#F4C542]/20 rounded-2xl px-5 py-3 shadow-[0_0_20px_rgba(244,197,66,0.08)]">
                <Wallet size={16} className="text-[#F4C542] drop-shadow-[0_0_6px_rgba(244,197,66,0.3)]" />
                <span className="text-sm font-black text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.06)]">R$ {balance.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
              {/* Left: Game Panel */}
              <div className="space-y-4 order-2 lg:order-1">
                <div className="bg-[#0A0F1E] border border-[#F4C542]/15 rounded-3xl p-5 space-y-4 shadow-[0_22px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(244,197,66,0.03)]">
                  <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#F4C542]/50">
                    {gameIsActive ? "✦ Jogo Ativo" : "✦ Nova Partida"}
                  </h3>

                  {!gameIsActive && (
                    <>
                      <div>
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">
                          Valor da Aposta
                        </label>
                        <div className="flex items-center gap-1.5 bg-[#050B18] rounded-xl p-1 border border-[#F4C542]/12 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                          <button onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
                            className="h-9 w-9 rounded-lg bg-[#0A0F1E] hover:bg-[#1A2238] hover:text-[#F4C542] flex items-center justify-center transition-all text-gray-500 border border-transparent hover:border-[#F4C542]/20">
                            <Minus size={14} />
                          </button>
                          <input type="number" value={betAmount}
                            onChange={e => setBetAmount(Math.max(1, parseFloat(e.target.value) || 1))}
                            className="flex-1 bg-transparent text-center text-xl font-black text-white focus:outline-none drop-shadow-[0_0_4px_rgba(255,255,255,0.08)]" />
                          <button onClick={() => setBetAmount(betAmount + 1)}
                            className="h-9 w-9 rounded-lg bg-[#0A0F1E] hover:bg-[#1A2238] hover:text-[#F4C542] flex items-center justify-center transition-all text-gray-500 border border-transparent hover:border-[#F4C542]/20">
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1.5">
                          {[5, 10, 25, 50].map(v => (
                            <button key={v} onClick={() => setBetAmount(v)}
                              className="py-1.5 rounded-lg bg-[#0A0F1E] border border-[#F4C542]/12 text-[8px] font-bold text-gray-500 hover:text-[#F4C542] hover:border-[#F4C542]/25 transition-all">
                              R${v}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-1.5 block">
                          Quantidade de Minas
                        </label>
                        <div className="flex items-center gap-1.5 bg-[#050B18] rounded-xl p-1 border border-[#F4C542]/12 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                          <button onClick={() => setMineCount(Math.max(1, mineCount - 1))}
                            className="h-9 w-9 rounded-lg bg-[#0A0F1E] hover:bg-[#1A2238] hover:text-[#F4C542] flex items-center justify-center transition-all text-gray-500 border border-transparent hover:border-[#F4C542]/20">
                            <Minus size={14} />
                          </button>
                          <span className="flex-1 text-center text-xl font-black text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.08)]">{mineCount}</span>
                          <button onClick={() => setMineCount(Math.min(24, mineCount + 1))}
                            className="h-9 w-9 rounded-lg bg-[#0A0F1E] hover:bg-[#1A2238] hover:text-[#F4C542] flex items-center justify-center transition-all text-gray-500 border border-transparent hover:border-[#F4C542]/20">
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="relative h-1.5 mt-2 bg-[#0A0F1E] rounded-full overflow-hidden border border-[#F4C542]/5">
                          <div className="h-full bg-gradient-to-r from-emerald-500 via-[#F4C542] to-red-500 rounded-full transition-all shadow-[0_0_6px_rgba(244,197,66,0.15)]"
                            style={{ width: `${(mineCount / 24) * 100}%` }} />
                        </div>
                      </div>

                      <button onClick={handleStartGame}
                        className="w-full py-5 rounded-2xl text-white font-black text-sm uppercase tracking-widest transition-all active:scale-[0.96] hover:brightness-125 relative overflow-hidden"
                        style={{
                          background: "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.30), transparent 50%), linear-gradient(180deg, #22C55E, #15803D)",
                          boxShadow: "0 10px 30px rgba(34,197,94,0.35), 0 0 40px rgba(34,197,94,0.08), inset 0 1px 0 rgba(255,255,255,0.25)"
                        }}>
                        <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.2)]">Iniciar Jogo — R$ {betAmount.toFixed(2)}</span>
                      </button>
                    </>
                  )}

                  {gameIsActive && (
                    <>
                      <div className="rounded-xl p-4 space-y-3"
                        style={{
                          background: "radial-gradient(circle at 70% 20%, rgba(244,197,66,0.12), transparent 50%), #050B18",
                          border: "1px solid rgba(244,197,66,0.15)",
                          boxShadow: "inset 0 0 20px rgba(244,197,66,0.03)"
                        }}>
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.15em]">Multiplicador</span>
                          <motion.strong
                            key={game.current_multiplier}
                            initial={multiplierBump ? { scale: 0.8 } : undefined}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.25 }}
                            className={cn(
                              "text-2xl font-black tabular-nums",
                              multiplierBump ? "text-[#F4C542] drop-shadow-[0_0_14px_rgba(244,197,66,0.6)]" : "text-[#F4C542] drop-shadow-[0_0_8px_rgba(244,197,66,0.2)]",
                              multiplierBump && "animate-number-bump"
                            )}>
                            {(game.current_multiplier || 1).toFixed(2)}x
                          </motion.strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.15em]">Retirada</span>
                          <strong className={cn(
                            "text-xl font-black tabular-nums text-[#F4C542] drop-shadow-[0_0_10px_rgba(244,197,66,0.3)]",
                            payoutBump && "animate-number-bump"
                          )}>
                            R$ {displayedPayout.toFixed(2)}
                          </strong>
                        </div>
                      </div>

                      <button onClick={handleCashout}
                        className="cashout-button w-full py-5 rounded-2xl text-black font-black text-base uppercase tracking-widest transition-all active:scale-[0.96] hover:brightness-125 relative overflow-hidden"
                        style={{
                          background: "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.35), transparent 50%), linear-gradient(180deg, #F4C542, #C88A10)",
                          boxShadow: "0 0 30px rgba(244,197,66,0.35), 0 0 60px rgba(244,197,66,0.08), inset 0 1px 0 rgba(255,255,255,0.35)"
                        }}>
                        <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]">Retirar R$ {displayedPayout.toFixed(2)}</span>
                      </button>
                    </>
                  )}


                  {(game?.status === "busted" || game?.status === "cashed_out") && (
                    <button onClick={handleNewGame}
                      className="w-full py-4 rounded-2xl text-black font-black text-sm uppercase tracking-widest transition-all active:scale-[0.96] hover:brightness-125"
                      style={{
                        background: "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.30), transparent 50%), linear-gradient(180deg, #F4C542, #C88A10)",
                        boxShadow: "0 8px 24px rgba(244,197,66,0.30), 0 0 30px rgba(244,197,66,0.06), inset 0 1px 0 rgba(255,255,255,0.30)"
                      }}>
                      {game.status === "cashed_out" ? "Jogar Novamente" : "Tentar Novamente"}
                    </button>
                  )}
                </div>
              </div>

              {/* Right: Mines Board — Premium Stage */}
              <div className="order-1 lg:order-2">
                <div className="board-container relative rounded-3xl p-[1px]"
                  style={{
                    background: "linear-gradient(135deg, rgba(244,197,66,0.25), rgba(244,197,66,0.04), rgba(244,197,66,0.12), rgba(244,197,66,0.02))",
                    boxShadow: "0 0 50px rgba(244,197,66,0.08), 0 0 100px rgba(244,197,66,0.03)"
                  }}>
                  <div className="bg-[#080C18] rounded-3xl p-5 lg:p-7 relative overflow-hidden"
                    style={{ boxShadow: "inset 0 0 60px rgba(244,197,66,0.02)" }}>
                    {/* Inner ambient glow */}
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#F4C542]/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#F4C542]/3 rounded-full blur-[80px]" />

                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-[0.05]"
                      style={{ backgroundImage: "radial-gradient(rgba(244,197,66,0.5) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
                    />

                    {/* Live Stats Bar (mobile) */}
                    {gameIsActive && (
                      <div className="relative z-10 mb-4 flex items-center justify-between bg-[#050B18] rounded-2xl p-3 sm:hidden"
                        style={{ border: "1px solid rgba(244,197,66,0.15)", boxShadow: "inset 0 0 12px rgba(244,197,66,0.03)" }}>
                        <div>
                          <div className="text-[7px] text-gray-500 font-bold uppercase tracking-[0.15em]">Multiplicador</div>
                          <div className="text-base font-black text-[#F4C542] drop-shadow-[0_0_6px_rgba(244,197,66,0.2)]">
                            {(game.current_multiplier || 1).toFixed(2)}x
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[7px] text-gray-500 font-bold uppercase tracking-[0.15em]">Retirada</div>
                          <div className="text-base font-black text-[#F4C542] drop-shadow-[0_0_6px_rgba(244,197,66,0.2)]">
                            R$ {(game.potential_payout || 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="relative z-10">
                      <MinesGrid
                        tiles={tiles}
                        onReveal={handleRevealTile}
                        gameStatus={game?.status}
                        loadingTile={loadingTile}
                      />
                    </div>

                    {/* Result panel inline */}
                    {gameOver && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.35, delay: 0.25 }}
                        className={cn(
                          "relative z-10 mt-5 rounded-2xl p-4 text-center border",
                          game.status === "cashed_out"
                            ? "border-[#F4C542]/25"
                            : "border-red-500/25"
                        )}
                        style={game.status === "cashed_out" ? {
                          background: "radial-gradient(circle at 50% 0%, rgba(244,197,66,0.12), transparent 70%)",
                          boxShadow: "0 0 20px rgba(244,197,66,0.06)"
                        } : {
                          background: "radial-gradient(circle at 50% 0%, rgba(239,68,68,0.12), transparent 70%)"
                        }}
                      >
                        <strong className={cn(
                          "block text-base font-black mb-1 drop-shadow-[0_0_8px_rgba(244,197,66,0.15)]",
                          game.status === "cashed_out" ? "text-[#F4C542]" : "text-red-300"
                        )}>
                          {game.status === "cashed_out" ? "✦ Retirada Realizada" : "✕ Você encontrou uma mina"}
                        </strong>
                        <span className={cn(
                          "text-sm font-bold",
                          game.status === "cashed_out" ? "text-[#F4C542]/80" : "text-gray-400"
                        )}>
                          {game.status === "cashed_out"
                            ? `+R$ ${(game.final_payout || 0).toFixed(2)}`
                            : "Prêmio: R$ 0,00"}
                        </span>
                      </motion.div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* History */}
            <div className="bg-[#0F1A2E]/80 border border-[#F4C542]/10 rounded-3xl p-5 shadow-[0_22px_60px_rgba(0,0,0,0.35)]">
              <div className="flex items-center gap-2 mb-3">
                <History size={14} className="text-[#F4C542]/60" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#F4C542]/60">Últimos Resultados</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {pastResults.length === 0 && <span className="text-[10px] text-gray-600">Nenhum resultado ainda</span>}
                {pastResults.map((r, i) => (
                  <div key={i} className={cn(
                    "shrink-0 min-w-[56px] rounded-xl px-2.5 py-1.5 text-center border",
                    r.won ? "bg-[#F4C542]/10 border-[#F4C542]/20" : "bg-red-500/10 border-red-500/20"
                  )}>
                    <div className={cn("text-[10px] font-black", r.won ? "text-[#F4C542]" : "text-red-400")}>
                      {r.won ? `${r.mult.toFixed(2)}x` : "💥"}
                    </div>
                    <div className="text-[8px] text-gray-600 font-bold mt-0.5">R$ {r.bet}</div>
                  </div>
                ))}
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

          /* Tile flip 3D */
          .tile-inner {
            transform-style: preserve-3d;
            transition: transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.25s ease, box-shadow 0.25s ease;
          }
          .mine-tile:not(:disabled):not(.tile-flipped) {
            transition: filter 0.25s ease, transform 0.25s ease;
          }
          .mine-tile:not(:disabled):not(.tile-flipped):hover {
            transform: translateY(-2px);
            filter: drop-shadow(0 6px 16px rgba(244,197,66,0.15));
          }
          .mine-tile:not(:disabled):not(.tile-flipped):hover .tile-inner {
            filter: brightness(1.3);
            box-shadow: 0 0 30px rgba(244,197,66,0.15), inset 0 1px 0 rgba(255,255,255,0.12);
          }
          .tile-flipped { transform: rotateY(180deg); }
          .tile-front { backface-visibility: hidden; }
          .tile-back { backface-visibility: hidden; transform: rotateY(180deg); }

          /* Board container - gold border glow */
          .board-container::before {
            content: '';
            position: absolute;
            inset: -1px;
            border-radius: inherit;
            background: linear-gradient(135deg, rgba(244,197,66,0.30), rgba(244,197,66,0.05), rgba(244,197,66,0.15), transparent);
            z-index: -1;
          }

          /* Loading pulse */
          @keyframes loadingPulse {
            0% { filter: brightness(1); }
            50% { filter: brightness(1.5); }
            100% { filter: brightness(1); }
          }
          .animate-loading-pulse {
            animation: loadingPulse 0.6s linear infinite;
          }

          /* Diamond - gold prize icon */
          .diamond-icon {
            font-size: 34px;
            color: #FEF3C7;
            text-shadow: 0 0 20px rgba(244,197,66,1), 0 0 40px rgba(244,197,66,0.5);
            animation: diamondPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
          @keyframes diamondPop {
            0% { transform: scale(0.1) rotate(-30deg); opacity: 0; }
            60% { transform: scale(1.4) rotate(12deg); opacity: 1; }
            100% { transform: scale(1) rotate(0deg); }
          }

          /* Bomb icon */
          .bomb-icon {
            width: 34px; height: 34px;
            border-radius: 50%;
            background: #1a1a2e;
            position: relative;
            box-shadow: 0 0 24px rgba(239,68,68,0.7), 0 0 48px rgba(239,68,68,0.2), inset 0 0 12px rgba(239,68,68,0.3);
            animation: bombPop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both;
          }
          .bomb-icon::before {
            content: "";
            position: absolute;
            width: 14px; height: 7px;
            top: -6px; left: 50%;
            transform: translateX(-50%) rotate(25deg);
            background: #94a3b8;
            border-radius: 4px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.3);
          }
          .bomb-icon::after {
            content: "";
            position: absolute;
            width: 7px; height: 7px;
            top: -12px; left: 63%;
            background: #F4C542;
            border-radius: 50%;
            box-shadow: 0 0 12px rgba(244,197,66,1), 0 0 24px rgba(244,197,66,0.6);
          }
          @keyframes bombPop {
            0% { transform: scale(0.15); opacity: 0; }
            55% { transform: scale(1.35); opacity: 1; }
            100% { transform: scale(1); }
          }

          /* Danger flash */
          .danger-flash {
            position: fixed; inset: 0;
            background: rgba(239, 68, 68, 0.20);
            pointer-events: none;
            z-index: 50;
            animation: dangerFlash 0.5s ease-out forwards;
          }
          @keyframes dangerFlash {
            0% { opacity: 0; }
            15% { opacity: 1; }
            100% { opacity: 0; }
          }

          /* Cashout pulse - intense gold glow */
          .cashout-button {
            animation: cashoutPulse 1.3s ease-in-out infinite;
          }
          @keyframes cashoutPulse {
            0%, 100% {
              box-shadow: 0 0 24px rgba(244,197,66,0.30), 0 4px 14px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 44px rgba(244,197,66,0.55), 0 0 70px rgba(244,197,66,0.15), 0 4px 18px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.35);
              transform: scale(1.01);
            }
          }
          .cashout-button:active {
            animation: cashoutSuccess 0.35s ease-out forwards !important;
          }
          @keyframes cashoutSuccess {
            0% { transform: scale(1); }
            35% { transform: scale(1.08); }
            100% { transform: scale(1); }
          }

          /* Number bump - gold explosion */
          @keyframes numberBump {
            0% { transform: scale(1); text-shadow: 0 0 8px rgba(244,197,66,0.2); }
            40% { transform: scale(1.28); text-shadow: 0 0 30px rgba(244,197,66,1), 0 0 60px rgba(244,197,66,0.4); }
            100% { transform: scale(1); text-shadow: 0 0 10px rgba(244,197,66,0.25); }
          }
          .animate-number-bump {
            animation: numberBump 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
        `}</style>
      </div>
    </BonusProvider>
  );
}
