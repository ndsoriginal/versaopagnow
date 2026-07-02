"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Landmark, Wallet, CheckCircle2, Copy, Check, Loader2, AlertCircle, Clock, QrCode } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { fetchUserBalance } from "@/utils/balance";
import QRCode from "qrcode";
import { createPix } from "@/services/pagnow";
import WithdrawSuccessPopup from "./WithdrawSuccessPopup";
import { useModal } from "@/hooks/useModal";

type PixType = "cpf" | "telefone" | "email";

const PIX_OPTIONS: { label: string; value: PixType; placeholder: string }[] = [
  { label: "CPF", value: "cpf", placeholder: "000.000.000-00" },
  { label: "Telefone", value: "telefone", placeholder: "(00) 00000-0000" },
  { label: "E-mail", value: "email", placeholder: "usuario@email.com" },
];

const WITHDRAW_FEE = 50;

type WithdrawModalProps = {
  open: boolean;
  onClose: () => void;
  onOpenDeposit: (amount: number) => void;
  userId: string;
};

const WithdrawModal: React.FC<WithdrawModalProps> = ({ open, onClose, onOpenDeposit, userId }) => {
  useModal(open);
  const [balance, setBalance] = useState(0);
  const [pixType, setPixType] = useState<PixType>("cpf");
  const [pixKey, setPixKey] = useState("");
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "fee_qr" | "pix_key" | "done">("form");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [pixCodeDisplay, setPixCodeDisplay] = useState("");
  const [feePixId, setFeePixId] = useState<string | null>(null);
  const [withdrawRequestId, setWithdrawRequestId] = useState<string | null>(null);
  const [feePaid, setFeePaid] = useState(false);
  const [pago, setPago] = useState(false);
  const [successData, setSuccessData] = useState<{ amount: number; pixKey: string } | null>(null);
  const [cpf, setCpf] = useState("");
  const [savedCpf, setSavedCpf] = useState("");
  const [countdown, setCountdown] = useState(300);
  const [deadlineStr, setDeadlineStr] = useState("");
  const subscriptionRef = useRef<any>(null);
  const isMobile = useIsMobile();

  const formatCpf = (digits: string) => {
    const d = digits.replace(/\D/g, "").slice(0, 11);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
    if (!open || step !== "form") return;
    const deadline = Date.now() + 5 * 60 * 1000;
    setDeadlineStr(new Date(deadline).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    setCountdown(300);
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [open, step]);

  useEffect(() => {
    if (open && userId) {
      fetchBalance();
      setAmount("");
      setPixKey("");
      setStep("form");
      setQrCodeUrl("");
      setCopied(false);
      setFeePixId(null);
      setWithdrawRequestId(null);
      setFeePaid(false);
      setPago(false);
      setSuccessData(null);
      setCpf("");
      setSavedCpf("");
      (async () => {
        try {
          const { data: p } = await supabase.from('profiles').select('cpf').eq('id', userId).maybeSingle();
          if (p?.cpf) { setCpf(formatCpf(p.cpf)); setSavedCpf(formatCpf(p.cpf)); }
        } catch {}
      })();
    }
  }, [open, userId]);

  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!withdrawRequestId || feePaid) return;

    const channel = supabase
      .channel(`withdraw-fee-${withdrawRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'withdraw_requests',
          filter: `id=eq.${withdrawRequestId}`
        },
        (payload) => {
          if (payload.new?.status === 'awaiting_key') {
            setFeePaid(true);
            setPago(true);
            setTimeout(() => setStep("pix_key"), 1500);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [withdrawRequestId, feePaid]);

  const fetchBalance = async () => {
    const bal = await fetchUserBalance(userId);
    setBalance(bal);
  };

  if (!open) return null;

  const withdrawAmount = parseFloat(amount) || 0;
  const canProceed = withdrawAmount > 0 && balance >= WITHDRAW_FEE && countdown > 0;
  const countdownExpired = countdown <= 0;

  const handleRequestWithdraw = async () => {
    if (!withdrawAmount || withdrawAmount <= 0) {
      showError("Informe um valor para saque.");
      return;
    }
    if (balance < WITHDRAW_FEE) {
      showError("Saldo insuficiente para pagar a taxa de saque de R$ 50,00.");
      return;
    }

    const cpfClean = cpf.replace(/\D/g, "");
    if (cpfClean.length !== 11) {
      showError("Informe um CPF válido com 11 dígitos para gerar o PIX da taxa.");
      return;
    }

    setLoading(true);
    try {
      if (cpfClean !== savedCpf.replace(/\D/g, "")) {
        await supabase.from('profiles').update({ cpf: cpfClean }).eq('id', userId);
      }

      const pixResponse = await createPix(WITHDRAW_FEE, cpfClean, 'withdraw_fee');

      const url = await QRCode.toDataURL(pixResponse.pixQrCode || pixResponse.pixCopyPaste);
      setQrCodeUrl(url);
      setPixCodeDisplay(pixResponse.pixCopyPaste);

      if (pixResponse.id) {
        setFeePixId(pixResponse.id);

        const { data: wr } = await supabase
          .from('withdraw_requests')
          .select('id')
          .eq('fee_transaction_id', pixResponse.id)
          .maybeSingle();

        if (wr) {
          setWithdrawRequestId(wr.id);
        }
      }

      setStep("fee_qr");
      showSuccess("PIX da taxa gerado! Pague para continuar.");
    } catch (err: any) {
      const msg = err.context?.data?.error || err.message || "Erro ao gerar PIX da taxa.";
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckPayment = async () => {
    if (!withdrawRequestId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('withdraw_requests')
        .select('status')
        .eq('id', withdrawRequestId)
        .maybeSingle();

      if (data?.status === 'awaiting_key') {
        setFeePaid(true);
        setPago(true);
        setTimeout(() => setStep("pix_key"), 1000);
        showSuccess("Pagamento confirmado!");
      } else {
        showError("Pagamento ainda não detectado. Verifique se o PIX foi pago.");
      }
    } catch {
      showError("Erro ao verificar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWithdraw = async () => {
    const trimmedKey = pixKey.trim();
    if (!trimmedKey) {
      showError("Informe sua chave PIX para receber o saque.");
      return;
    }
    if (!withdrawRequestId) {
      showError("Erro: solicitação de saque não encontrada.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('withdraw_requests')
        .update({
          pix_key: trimmedKey,
          pix_key_type: pixType,
          amount: withdrawAmount,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', withdrawRequestId);

      if (error) throw error;

      setSuccessData({ amount: withdrawAmount, pixKey: trimmedKey });
      setStep("done");

      window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));

    } catch (err: any) {
      showError("Erro ao processar saque. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  const handleCloseModal = () => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleCloseModal} />
        <div className={cn(
          "relative w-full max-h-[90vh] max-h-[90dvh] rounded-3xl bg-gradient-to-b from-[#0d0f14] to-[#06070a] border border-[#1c212b] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200",
          isMobile ? "max-w-full h-full rounded-none" : "max-w-md"
        )}>
          <div className="flex items-center justify-between bg-[#13161d] px-5 py-4 border-b border-[#1c212b]">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-[#ffcc00] to-[#e6b800] p-2.5 rounded-2xl shadow-[0_4px_15px_rgba(255,204,0,0.2)]">
                <Landmark size={20} className="text-black" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight">Solicitar Saque</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Transferência PIX Instantânea</p>
              </div>
            </div>
            <button onClick={handleCloseModal} className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-all">
              <X size={20} />
            </button>
          </div>

          <div className="p-5 space-y-5 flex-1 overflow-y-auto">

            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#161a24] via-[#0d0f14] to-[#06070a] border border-[#ffcc00]/20 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="absolute -top-12 -right-12 w-24 h-24 bg-[#ffcc00]/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 font-black uppercase tracking-widest flex items-center gap-1">
                    <Wallet size={12} className="text-[#ffcc00]" />
                    Saldo Disponível
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight block">
                    R$ {formatCurrency(balance)}
                  </span>
                </div>
              </div>
            </div>

            {step === "form" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">Valor para Retirada</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-black text-sm">R$</span>
                    <input
                      type="number"
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl pl-10 pr-4 py-3.5 text-sm text-white font-bold focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/30 focus:outline-none transition-all"
                    />
                  </div>
                </div>

                {!savedCpf && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">CPF do Titular</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3.5 text-sm text-white font-bold focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/30 focus:outline-none transition-all"
                    />
                    <p className="text-[10px] text-gray-500">Necessário para gerar a cobrança PIX da taxa.</p>
                  </div>
                )}

                {withdrawAmount > 0 && (
                  <div className="bg-[#13161d] border border-[#1c212b] rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Valor do saque</span>
                      <span className="text-white font-bold">R$ {formatCurrency(withdrawAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Taxa de saque (PIX)</span>
                      <span className="text-[#ffcc00] font-bold">R$ {formatCurrency(WITHDRAW_FEE)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Você receberá</span>
                      <span className="text-emerald-500 font-black">R$ {formatCurrency(withdrawAmount)}</span>
                    </div>
                  </div>
                )}

                {balance < WITHDRAW_FEE && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-3 flex items-center gap-2">
                    <AlertCircle size={16} className="text-red-500 shrink-0" />
                    <span className="text-xs text-red-400">Saldo insuficiente para taxa de R$ {formatCurrency(WITHDRAW_FEE)}</span>
                  </div>
                )}

                <div className={`rounded-2xl p-4 border flex items-start gap-3 ${countdownExpired ? "bg-red-500/10 border-red-500/30" : "bg-amber-500/10 border-amber-500/30"}`}>
                  <Clock size={18} className={`shrink-0 mt-0.5 ${countdownExpired ? "text-red-500" : "text-amber-500"} ${!countdownExpired && "animate-pulse"}`} />
                  <div className="text-xs leading-relaxed">
                    {countdownExpired ? (
                      <span className="text-red-400 font-bold">⏰ Prazo de saque encerrado. Os saques estarão disponíveis novamente amanhã.</span>
                    ) : (
                      <>
                        <span className="text-amber-400 font-bold">Por segurança dos jogadores, os saques de hoje serão processados até as <strong className="text-white">{deadlineStr}</strong>.</span>
                        <br />
                        <span className="text-amber-500 font-black text-sm block mt-1">
                          ⏳ <strong className="text-white">{formatTime(countdown)}</strong> restantes
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#13161d] border border-[#ffcc00]/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center gap-2 text-[#ffcc00]">
                    <Clock size={14} />
                    <span className="text-[10px] font-black uppercase tracking-wider">Como funciona?</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    1. Pague a taxa de <strong className="text-white">R$ {formatCurrency(WITHDRAW_FEE)}</strong> via PIX para ativar o saque.<br />
                    2. Após a confirmação, informe sua chave PIX para receber o valor.<br />
                    3. O valor será enviado em até <strong className="text-white">5 minutos</strong>.
                  </p>
                </div>

                <button
                  onClick={handleRequestWithdraw}
                  disabled={!canProceed || loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> GERANDO PIX...</span>
                  ) : (
                    `SOLICITAR SAQUE R$ ${formatCurrency(withdrawAmount)}`
                  )}
                </button>
              </div>
            )}

            {step === "fee_qr" && (
              <div className="space-y-6">
                {pago ? (
                  <div className="flex flex-col items-center gap-4 py-6">
                    <CheckCircle2 size={64} className="text-emerald-500" />
                    <h3 className="text-2xl font-black text-emerald-500 text-center">Taxa Paga!</h3>
                    <p className="text-sm text-gray-400 text-center">Agora informe sua chave PIX para receber o saque.</p>
                    <button
                      onClick={() => setStep("pix_key")}
                      className="bg-[#ffcc00] text-black font-black py-3 px-8 rounded-xl uppercase tracking-wider"
                    >
                      CONTINUAR
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="text-center">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Pague a Taxa de Saque</h3>
                      <p className="text-xs text-gray-400 mt-1">Valor: <strong className="text-[#ffcc00]">R$ {formatCurrency(WITHDRAW_FEE)}</strong></p>
                    </div>

                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-3xl">
                        {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 object-contain" />}
                      </div>
                    </div>

                    {pixCodeDisplay && (
                      <div className="bg-[#13161d] rounded-2xl p-4 border border-white/5 space-y-2">
                        <p className="text-[10px] text-gray-500 uppercase font-black">Código PIX</p>
                        <p className="text-sm font-mono text-white truncate">{pixCodeDisplay}</p>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(pixCodeDisplay);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
                        >
                          {copied ? <Check size={16} /> : <Copy size={16} />}
                          {copied ? "Copiado!" : "Copiar Código PIX"}
                        </button>
                      </div>
                    )}

                    <button
                      onClick={handleCheckPayment}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest"
                    >
                      {loading ? (
                        <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> VERIFICANDO...</span>
                      ) : (
                        "JÁ PAGUEI - VERIFICAR"
                      )}
                    </button>

                    <div className="text-center">
                      <p className="text-[10px] text-gray-500">Pagamento sendo detectado automaticamente...</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {step === "pix_key" && (
              <div className="space-y-4">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center">
                  <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                  <h3 className="text-sm font-black text-white uppercase">Taxa Paga com Sucesso!</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    Agora informe sua chave PIX para receber <strong className="text-white">R$ {formatCurrency(withdrawAmount)}</strong>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">Tipo de chave PIX</label>
                  <div className="grid grid-cols-3 gap-2">
                    {PIX_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setPixType(option.value)}
                        className={cn(
                          "rounded-xl border py-3 text-xs font-black uppercase tracking-wider transition-all",
                          pixType === option.value
                            ? "border-[#ffcc00] bg-[#ffcc00]/10 text-white shadow-[0_0_15px_rgba(255,204,0,0.1)]"
                            : "border-white/5 bg-[#06070a] text-[#9ca3af] hover:border-white/20 hover:text-white"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">Sua Chave PIX</label>
                  <input
                    type="text"
                    placeholder={PIX_OPTIONS.find((o) => o.value === pixType)?.placeholder}
                    value={pixKey}
                    onChange={(e) => setPixKey(e.target.value)}
                    className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3.5 text-sm text-white font-bold focus:border-[#ffcc00] focus:ring-1 focus:ring-[#ffcc00]/30 focus:outline-none transition-all"
                  />
                </div>

                <button
                  onClick={handleSubmitWithdraw}
                  disabled={loading || !pixKey.trim()}
                  className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black py-4 rounded-2xl transition-all disabled:opacity-50 text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" /> ENVIANDO...</span>
                  ) : (
                    "CONFIRMAR SAQUE"
                  )}
                </button>
              </div>
            )}

            {step === "done" && (
              <div className="space-y-6 text-center py-4">
                <div className="bg-emerald-500/10 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={48} className="text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase">Solicitação Enviada!</h3>
                  <p className="text-sm text-gray-400 mt-2">
                    Em até <strong className="text-white">5 minutos</strong> o valor será enviado para sua conta.
                  </p>
                </div>
                <div className="bg-[#13161d] rounded-2xl p-4 border border-white/5 space-y-2 text-left">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Valor do saque</span>
                    <span className="text-white font-bold">R$ {formatCurrency(withdrawAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Taxa paga</span>
                    <span className="text-[#ffcc00] font-bold">R$ {formatCurrency(WITHDRAW_FEE)}</span>
                  </div>
                  {pixKey.trim() && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Chave PIX</span>
                      <span className="text-white font-mono text-xs truncate max-w-[120px] sm:max-w-[180px]">{pixKey.trim()}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-full rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 py-4 text-sm font-black text-white uppercase transition-all active:scale-95"
                >
                  FECHAR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <WithdrawSuccessPopup
        open={Boolean(successData)}
        onClose={() => {
          setSuccessData(null);
          onClose();
        }}
        amount={successData?.amount ?? 0}
        pixKey={successData?.pixKey ?? ""}
      />
    </>
  );
};

export default WithdrawModal;
