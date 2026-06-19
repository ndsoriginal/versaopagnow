"use client";

import React, { useState, useEffect } from "react";
import { X, Copy, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { showSuccess } from "@/utils/toast";
import { fetchUserBalance, updateUserBalance } from "@/utils/balance";
import QRCode from "qrcode";

type TestPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  user: { id: string; email: string | null } | null;
  amount: number;
};

const TestPaymentModal: React.FC<TestPaymentModalProps> = ({ open, onClose, user, amount }) => {
  const [pixCode, setPixCode] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(16);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (open && user) {
      generatePix();
    }
  }, [open, user, amount]);

  useEffect(() => {
    if (isProcessing && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isProcessing && countdown === 0) {
      finalizePayment();
    }
  }, [countdown, isProcessing]);

  const generatePix = async () => {
    if (!user) return;

    setIsProcessing(true);
    setCountdown(16);
    setCopied(false);

    // Gera um código PIX realista
    const randomKey = `${user.id.substring(0, 8)}${Math.random().toString().substring(2, 12)}`;
    const pixCodeValue = `000000${randomKey}@pix.com`;
    setPixCode(pixCodeValue);

    try {
      const qrUrl = await QRCode.toDataURL(pixCodeValue, { margin: 1, width: 300 });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error("Erro ao gerar QR:", err);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const finalizePayment = async () => {
    if (!user) return;

    try {
      // Adiciona o valor na banca do usuário usando o sistema unificado
      const currentBalance = await fetchUserBalance(user.id);
      const newBalance = currentBalance + amount;

      await updateUserBalance(user.id, newBalance);

      // Registra a transação
      const { error: txError } = await supabase.from("transactions").insert({
        user_id: user.id,
        amount: amount,
        type: "deposit",
        status: "completed",
        pix_code: pixCode,
        created_at: new Date().toISOString(),
      });

      if (txError) throw txError;

      // Dispara a notificação push mobile realista
      window.dispatchEvent(
        new CustomEvent("mobile:notification", {
          detail: {
            title: "Depósito Recebido",
            body: `Seu depósito de R$ ${amount.toFixed(2)} foi creditado com sucesso na sua conta!`,
          },
        })
      );

      showSuccess(`Pagamento de R$ ${amount.toFixed(2)} aprovado com sucesso!`);
      window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }));
      
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Erro ao finalizar pagamento:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-gradient-to-b from-[#0d0f14] to-[#06070a] border border-[#1c212b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <CheckCircle2 size={20} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-white">Pagamento de Teste</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Informações do Usuário */}
          <div className="bg-[#06070a] border border-[#1c212b] rounded-2xl p-4">
            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Usuário</div>
            <div className="text-white font-bold">{user?.email || user?.id}</div>
          </div>

          {/* Valor */}
          <div className="text-center">
            <div className="text-xs text-gray-400 uppercase font-bold mb-1">Valor do Teste</div>
            <div className="text-3xl font-black text-emerald-400">
              R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="bg-white p-4 rounded-2xl">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain" />
              ) : (
                <div className="w-48 h-48 bg-gray-200 rounded-lg animate-pulse" />
              )}
            </div>
          </div>

          {/* Código PIX */}
          <div className="space-y-2">
            <div className="bg-[#06070a] border border-[#1c212b] rounded-xl p-3 font-mono text-xs text-gray-400 break-all">
              {pixCode || "Gerando..."}
            </div>
            <button
              onClick={copyToClipboard}
              disabled={!pixCode || copied}
              className="w-full bg-[#ffcc00] hover:bg-[#ffdb4d] text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Copy size={16} />
              {copied ? "Copiado!" : "Copiar Código PIX"}
            </button>
          </div>

          {/* Contagem Regressiva */}
          {isProcessing && (
            <div className="bg-[#13161d] border border-[#ffcc00]/30 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-[#ffcc00]">
                <Clock size={20} className="animate-spin" />
                <span className="text-2xl font-black">{countdown}</span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Aguardando confirmação do pagamento...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestPaymentModal;