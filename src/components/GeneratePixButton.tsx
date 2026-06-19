"use client";

import React, { useState, useEffect, useRef } from "react";
import { gatewayCreatePix, PixResponse } from "@/services/gateway";
import { useSession } from "@/context/SessionContext";
import { showError, showSuccess } from "@/utils/toast";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, QrCode, Copy, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackPurchase } from "@/utils/metaPixel";

const GeneratePixButton: React.FC = () => {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [pixData, setPixData] = useState<PixResponse | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [cpfInput, setCpfInput] = useState("");
  const [showCpfDialog, setShowCpfDialog] = useState(false);
  const [pago, setPago] = useState(false);
  const [pixRequestId, setPixRequestId] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);

  useEffect(() => {
    if (!open || !pixRequestId) {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
      return
    }

    const channel = supabase
      .channel(`pix-status-${pixRequestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pix_requests',
          filter: `id=eq.${pixRequestId}`
        },
        (payload) => {
          if (payload.new?.status === 'paid' || payload.new?.status === 'completed') {
            setPago(true)
            window.dispatchEvent(new CustomEvent("chat:simulate", { detail: { type: "balance_updated" } }))
            trackPurchase(payload.new?.amount || 50, user?.email)
            setTimeout(() => {
              setOpen(false)
              setPago(false)
              setPixData(null)
              setQrCodeUrl("")
            }, 4000)
          }
        }
      )
      .subscribe()

    subscriptionRef.current = channel

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
        subscriptionRef.current = null
      }
    }
  }, [open, pixRequestId])

  const startGenerate = async () => {
    if (!user) {
      showError("Você precisa estar logado para gerar um PIX.");
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('cpf')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.cpf && profile.cpf.length === 11) {
      doGenerate(profile.cpf)
    } else {
      setCpfInput("")
      setShowCpfDialog(true)
    }
  }

  const submitCpf = async () => {
    const cpf = cpfInput.replace(/\D/g, "")
    if (cpf.length !== 11) {
      showError("CPF inválido. Digite 11 números.")
      return
    }
    await supabase.from('profiles').update({ cpf }).eq('id', user!.id)
    setShowCpfDialog(false)
    doGenerate(cpf)
  }

  const doGenerate = async (cpf?: string) => {
    if (!user) return
    setLoading(true)
    setPago(false)
    setPixRequestId(null)
    setOpen(true)
    try {
      const data = await gatewayCreatePix(50.00, cpf)
      setPixData(data);

      const url = await QRCode.toDataURL(data.qrCode || data.pixQrCode || data.pixCopyPaste);
      setQrCodeUrl(url);

      if (data.id) {
        const { data: pr } = await supabase
          .from('pix_requests')
          .select('id')
          .eq('transaction_id', data.id)
          .maybeSingle()
        if (pr) setPixRequestId(pr.id)
      }

      showSuccess("PIX gerado com sucesso!");
    } catch (err: any) {
      setOpen(false)
      const msg = err.context?.data?.error || err.message || "Erro inesperado."
      console.error("[GeneratePixButton] Erro detalhado:", err)
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClosePixDialog = (open: boolean) => {
    setOpen(open)
    if (!open) {
      setPago(false)
      setPixData(null)
      setQrCodeUrl("")
    }
  }

  const copyToClipboard = () => {
    if (pixData?.pixCopyPaste) {
      navigator.clipboard.writeText(pixData.pixCopyPaste);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <Button
        onClick={startGenerate}
        disabled={loading}
        className="bg-[#00A859] hover:bg-[#00944e] text-white font-bold gap-2 px-6 py-6 rounded-2xl shadow-lg transition-all active:scale-95"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
        GERAR PIX (PAGNOW)
      </Button>

      <Dialog open={showCpfDialog} onOpenChange={setShowCpfDialog}>
        <DialogContent className="bg-[#0d0f14] border-[#1c212b] text-white max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-center">CPF obrigatório</DialogTitle>
            <DialogDescription className="text-gray-400 text-center">
              Para gerar um PIX, informe seu CPF (somente números):
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={11}
              placeholder="00000000000"
              value={cpfInput}
              onChange={(e) => setCpfInput(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-[#06070a] border border-[#1c212b] rounded-2xl px-4 py-3 text-center text-lg font-bold text-white focus:border-[#ffcc00] focus:outline-none"
            />
            <Button onClick={submitCpf} className="w-full gap-2 font-bold uppercase">
              Confirmar CPF
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={handleClosePixDialog}>
        <DialogContent className="bg-[#0d0f14] border-[#1c212b] text-white max-w-sm rounded-3xl">
          {pago ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <CheckCircle2 size={64} className="text-emerald-500" />
              <DialogTitle className="text-2xl font-bold text-center text-emerald-500">
                Pagamento Confirmado!
              </DialogTitle>
              <DialogDescription className="text-gray-400 text-center">
                O valor foi creditado na sua carteira.
              </DialogDescription>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-center">Pagamento via PIX</DialogTitle>
                <DialogDescription className="text-gray-400 text-center">
                  Escaneie o código abaixo para concluir seu depósito.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-6 py-4">
                <div className="bg-white p-4 rounded-2xl">
                  {qrCodeUrl && <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />}
                </div>

                <div className="w-full space-y-3">
                  <div className="bg-[#06070a] border border-[#1c212b] p-3 rounded-xl break-all text-[10px] font-mono text-gray-500 max-h-20 overflow-y-auto">
                    {pixData?.pixCopyPaste}
                  </div>

                  <Button
                    onClick={copyToClipboard}
                    variant="secondary"
                    className="w-full gap-2 font-bold uppercase text-xs"
                  >
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    {copied ? "Copiado!" : "Copiar Código PIX"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GeneratePixButton;