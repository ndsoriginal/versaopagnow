"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { useBonus } from "@/context/BonusContext";
import { trackPurchase } from "@/utils/metaPixel";
import QRCode from "qrcode";
import { ShieldCheck, Copy, CheckCircle2, Loader2, Lock, Clock, Gift } from "lucide-react";
import { fetchUserBalance, updateUserBalance } from "@/utils/balance";

type Props = {
  userId: string;
  userEmail?: string | null;
  initialAmount?: number;
};

const LOCK_THRESHOLD = 30;
const CACHE_DURATION_MS = 10 * 60 * 1000;

export default function DepositForm({ userId, userEmail, initialAmount }: Props) {
  const DEFAULT_AMOUNT = 30;
  const [amount, setAmount] = useState<number>(initialAmount || DEFAULT_AMOUNT);
  const [cpf, setCpf] = useState<string>("");
  const [savedCpf, setSavedCpf] = useState<string>("");
  const [step, setStep] = useState<"checkout" | "generating" | "qrcode" | "success">("checkout");
  const [pixCode, setPixCode] = useState<string>("");
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [currentTxId, setCurrentTxId] = useState<string>("");
  const [isDemo, setIsDemo] = useState(false);
  const [demoTimerStarted, setDemoTimerStarted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600);
  const [isLocked, setIsLocked] = useState(false);
  const [fromCache, setFromCache] = useState(false);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const { markDeposit, hasDeposited30 } = useBonus();
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

  useEffect(() => {
    const loadCpf = async () => {
      if (!userId) return;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("cpf, role")
          .eq("id", userId)
          .maybeSingle();

        if (!error) {
          if (data?.cpf) {
            setSavedCpf(data.cpf);
            setCpf(formatCpf(data.cpf));
          }
          if (data?.role === "demo") {
            setIsDemo(true);
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      }
    };
    loadCpf();
  }, [userId]);

  useEffect(() => {
    if (initialAmount) {
      setAmount(initialAmount);
    } else {
      setAmount(DEFAULT_AMOUNT);
    }
  }, [initialAmount]);

  useEffect(() => {
    if (step !== "qrcode") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimerExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, isLocked]);

  const handleTimerExpiry = () => {
    if (isLocked) {
      setIsLocked(false);
      setStep("checkout");
      setTimeLeft(600);
    }
  };

  useEffect(() => {
    if (!currentTxId || step !== "qrcode") return;

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("check-pix-status", {
          body: { txId: currentTxId }
        });

        if (!error && data?.success && data?.status === "paid") {
          handlePaymentSuccess();
        }
      } catch (err) {
        console.error("Erro ao verificar status do PIX:", err);
      }
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [currentTxId, step, isDemo]);

  const handlePaymentSuccess = () => {
    setIsLocked(false);
    setStep("success");
    markDeposit(amount);

    trackPurchase(amount, userEmail);

    window.dispatchEvent(
      new CustomEvent("mobile:notification", {
        detail: {
          title: "💰 Venda Aprovada",
          body: `R$ ${Number(amount).toFixed(2)}`,
          type: "pix_paid",
        },
      })
    );

    showSuccess("Depósito recebido com sucesso!");
  };

  const formatCpf = (digits: string) => {
    const d = digits.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const handleGeneratePix = async (customAmount?: number) => {
    const targetAmount = customAmount !== undefined ? customAmount : amount;
    if (targetAmount < 1) {
      showError("O valor mínimo para depósito é R$ 1,00");
      return;
    }

    const cpfClean = cpf.replace(/\D/g, "");
    if (cpfClean.length !== 11) {
      showError("Informe um CPF válido com 11 dígitos.");
      return;
    }

    setIsLocked(targetAmount >= LOCK_THRESHOLD);
    setStep("generating");
    setFromCache(false);
    setCreatedAt(null);

    if (isDemo) {
      setTimeout(async () => {
        const fakeTxId = "tx_" + Math.random().toString(36).slice(2, 11);
        const fakePix = `00020101021226820014br.gov.bcb.pix25600014${Math.random().toString(36).slice(2, 15)}5204000053039865405${targetAmount.toFixed(2)}5802BR5920PixBett%20Intermediacoes6009SAO%20PAULO62070503***6304`;

        setPixCode(fakePix);
        setCurrentTxId(fakeTxId);
        setTimeLeft(600);

        let qrUrl = "";
        try {
          qrUrl = await QRCode.toDataURL(fakePix, { margin: 1, width: 300 });
          setQrCodeUrl(qrUrl);
        } catch (err) {
          console.error("Erro ao gerar QR Code:", err);
        }

        setStep("qrcode");

        try {
          const now = new Date().toISOString();
          await supabase.from("transactions").insert([
            {
              id: fakeTxId,
              user_id: userId,
              amount: targetAmount,
              type: "deposit",
              status: "pending",
              pix_code: fakePix,
              created_at: now
            }
          ]);
          await supabase.from("pix_requests").insert({
            user_id: userId,
            cpf: cpfClean,
            amount: targetAmount,
            transaction_id: fakeTxId,
            qr_code: qrUrl,
            pix_code: fakePix,
            status: "pending",
            created_at: now,
            updated_at: now
          });
        } catch (err) {
          console.error("Erro ao registrar transação demo:", err);
        }
      }, 1000);
      return;
    }

    try {
      console.log("[DepositForm] Chamando Edge Function create-pix com:", { amount: targetAmount, cpf: cpfClean })

      const { data, error } = await supabase.functions.invoke("gateway-pix", {
        body: {
          amount: targetAmount,
          customerDocument: cpfClean
        }
      });

      if (error) {
        const edgeError = (error as any)?.context?.data?.error || error.message
        console.error("[DepositForm] Erro da Edge Function:", edgeError, error)
        showError(edgeError);
        setStep("checkout");
        return;
      }

      console.log("[DepositForm] Dados recebidos:", data)

      setPixCode(data.pixCopyPaste);
      setCurrentTxId(data.id);
      setFromCache(data.fromCache || false);
      setCreatedAt(data.created_at || null);

      if (data.fromCache && data.created_at) {
        const elapsed = Date.now() - new Date(data.created_at).getTime();
        const remaining = Math.max(0, Math.floor((CACHE_DURATION_MS - elapsed) / 1000));
        setTimeLeft(remaining);
      } else {
        setTimeLeft(600);
      }

      const qrUrl = data.pixQrCode?.startsWith("data:")
        ? data.pixQrCode
        : await QRCode.toDataURL(data.pixQrCode || data.pixCopyPaste, {
            margin: 1,
            width: 300
          });
      setQrCodeUrl(qrUrl);

      setStep("qrcode");

    } catch (err: any) {
      const edgeError = err.context?.data?.error || err.message
      console.error("[DepositForm] Erro catch:", edgeError, err)
      showError(edgeError);
      setStep("checkout");
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    showSuccess("Código PIX Copiado!");
    setTimeout(() => setCopied(false), 3000);

    if (isDemo && !demoTimerStarted) {
      setDemoTimerStarted(true);

      setTimeout(async () => {
        try {
          await supabase
            .from("transactions")
            .update({ status: "completed" })
            .eq("id", currentTxId);

          const currentBalance = await fetchUserBalance(userId);
          const newBalance = currentBalance + amount;

          await updateUserBalance(userId, newBalance);

          handlePaymentSuccess();
          window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
        } catch (err) {
          console.error("Erro ao aprovar depósito demo:", err);
        }
      }, 5000);
    }
  };

  const getButtonClass = (value: number) => {
    return amount === value
      ? "bg-[#00A859]/30 border-[#00A859] text-white"
      : "bg-[#13161d] border-[#1c212b] text-gray-400 hover:text-white";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleBack = () => {
    if (isLocked) {
      showError(`QR Code bloqueado por 10 min para R$ ${amount.toFixed(2)}. Aguarde o prazo.`);
      return;
    }
    setStep("checkout");
    setDemoTimerStarted(false);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-[#0d0f14] border border-[#1c212b] rounded-3xl overflow-hidden shadow-2xl text-white font-sans">
      {step === "checkout" && (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#1c212b] pb-4">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-[#00A859]" />
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">PagNow Seguro</span>
            </div>
            <div className="flex items-center gap-1 bg-[#00A859]/10 px-2.5 py-1 rounded-full border border-[#00A859]/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00A859] animate-pulse" />
              <span className="text-[10px] font-bold text-[#00A859] uppercase">PIX 24/7</span>
            </div>
          </div>

          <div className="text-center py-4">
            <p className="text-xs text-gray-500 uppercase font-bold tracking-widest">Valor do Depósito</p>
            <h2 className="text-4xl font-black text-white mt-1">
              R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[30, 50, 100, 200].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val)}
                className={getButtonClass(val)}
              >
                R$ {val}
              </button>
            ))}
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
              Ou digite o valor desejado
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">R$</span>
              <input
                type="number"
                step="0.01"
                placeholder="Ex: 0.50"
                value={amount}
                onChange={(e) => {
                  const parsed = parseFloat(e.target.value);
                  if (!isNaN(parsed) && parsed > 0) {
                    setAmount(parsed);
                  }
                }}
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#00A859] focus:outline-none transition-all"
                inputMode="decimal"
                aria-label="Valor do depósito"
              />
            </div>
          </div>

          {!savedCpf && (
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider block mb-1.5">
                CPF do titular da conta
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3 text-sm text-white focus:border-[#00A859] focus:outline-none transition-all"
                inputMode="numeric"
                aria-label="CPF"
              />
            </div>
          )}

          <button
            onClick={() => handleGeneratePix()}
            className="w-full bg-[#00A859] hover:bg-[#00944e] text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-[0_4px_20px_rgba(0,168,89,0.3)] text-base uppercase tracking-wide"
          >
            Pagar com PIX
          </button>
        </div>
      )}

      {step === "generating" && (
        <div className="p-12 flex flex-col items-center justify-center text-center space-y-6 min-h-[380px]">
          <Loader2 size={48} className="text-[#00A859] animate-spin" />
          <p className="text-sm font-bold text-white">Criando cobrança na PagNow...</p>
        </div>
      )}

      {step === "qrcode" && (
        <div className="p-6 space-y-6">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2 text-[#ffcc00]">
              <Clock size={20} />
              <span className="text-2xl font-black">{formatTime(timeLeft)}</span>
            </div>
            {isLocked && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-500 font-black uppercase tracking-wider">
                <Lock size={12} />
                QR Code bloqueado por 10 min para R$ {amount.toFixed(2)}
              </div>
            )}
            <div className="relative inline-block">
              {fromCache && (
                <p className="text-xs text-gray-500 mb-1">Cobrança já existente reutilizada</p>
              )}
              <p className="text-sm font-bold text-white">
                Não perca a oportunidade! Bônus de <span className="text-[#ffcc00]">R$ 680,00</span>
              </p>
              <span className="absolute -top-1 -right-4 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-[#ffcc00] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#ffcc00]"></span>
              </span>
            </div>
            {!hasDeposited30 && bonusCountdown > 0 && (
              <div className="flex items-center justify-center gap-2 text-amber-500 animate-pulse mt-3">
                <Clock size={14} />
                <span className="text-xs font-black uppercase tracking-wider">
                  ⏰ Bônus quase encerrando! <strong className="text-white">{formatTime(bonusCountdown)}</strong> restantes
                </span>
              </div>
            )}
          </div>

          <div className="text-center">
            <h3 className="text-lg font-bold text-white">Escaneie o QR Code</h3>
            <p className="text-xs text-gray-400">ou copie o código abaixo</p>
          </div>

          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-3xl">
              {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code PIX" className="w-56 h-56 object-contain" />}
            </div>
          </div>

          <div className="space-y-2">
            <textarea
              readOnly
              value={pixCode}
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl p-4 text-[10px] font-mono text-gray-400 h-24 resize-none"
            />
            <button
              onClick={handleCopyCode}
              className="w-full bg-[#00A859] hover:bg-[#00944e] text-white py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              <Copy size={16} />
              {copied ? "Copiado!" : "Copiar PIX Copia e Cola"}
            </button>
          </div>

          {!isLocked && (
            <div className="text-center">
              <button
                onClick={handleBack}
                className="text-xs text-gray-500 hover:text-white"
              >
                Voltar / Alterar Valor
              </button>
            </div>
          )}
        </div>
      )}

      {step === "success" && (
        <div className="p-8 flex flex-col items-center justify-center text-center space-y-6 min-h-[420px]">
          <CheckCircle2 size={64} className="text-[#00A859] animate-bounce" />
          <h3 className="text-2xl font-black text-white uppercase tracking-tight">Sucesso!</h3>
          <p className="text-sm text-gray-300">Seu depósito foi processado e creditado na sua conta.</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#1c212b] text-white font-bold py-3.5 rounded-2xl"
          >
            Fechar          </button>
        </div>
      )}
    </div>
  );
}
