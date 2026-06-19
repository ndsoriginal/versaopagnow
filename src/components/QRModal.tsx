"use client";

import React from "react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type QRModalProps = {
  open: boolean;
  pixCode: string | null;
  amount?: number;
  onClose: () => void;
  onSimulatePaid?: () => void;
};

const QRModal: React.FC<QRModalProps> = ({ open, pixCode, amount, onClose, onSimulatePaid }) => {
  const [dataUrl, setDataUrl] = React.useState<string | null>(null);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!pixCode || !open) {
      setDataUrl(null);
      return;
    }
    let mounted = true;
    QRCode.toDataURL(pixCode, { margin: 2, width: 400 })
      .then((url) => {
        if (mounted) setDataUrl(url);
      })
      .catch(() => setDataUrl(null));
    return () => {
      mounted = false;
    };
  }, [pixCode, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className={cn(
        "w-full rounded-lg bg-slate-900 p-6 text-white shadow-lg",
        isMobile ? "max-w-full h-full rounded-none flex flex-col" : "max-w-md"
      )}>
        <div className="flex items-start justify-between">
          <h3 className="text-lg font-semibold">Pague com PIX</h3>
          <button
            onClick={onClose}
            className="ml-4 rounded-full bg-slate-800 px-2 py-1 text-sm hover:opacity-90"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex flex-col items-center gap-4 flex-1 justify-center"> {/* Adicionado flex-1 justify-center */}
          <div className="bg-white p-4 rounded-lg">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUrl} alt="QR code" className="h-64 w-64 object-contain" />
            ) : (
              <div className="h-64 w-64 bg-gray-100" />
            )}
          </div>

          <div className="text-center">
            <div className="text-sm text-gray-300">Valor do depósito</div>
            <div className="text-2xl font-bold text-emerald-400">
              {amount ? `R$ ${amount.toFixed(2)}` : "R$ 0,00"}
            </div>
            <p className="mt-2 text-xs text-gray-400">Este PIX expira em 30 minutos.</p>
          </div>

          <div className="w-full space-y-2">
            <textarea
              readOnly
              value={pixCode ?? ""}
              className="w-full rounded-md bg-slate-800 p-3 text-sm text-gray-200"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (pixCode) {
                    navigator.clipboard.writeText(pixCode);
                  }
                }}
                className="flex-1 rounded-md bg-blue-600 py-2 text-white hover:opacity-95"
              >
                Copiar Código PIX
              </button>

              <button
                onClick={() => {
                  // Simula pagamento recebido — para desenvolvimento local
                  onSimulatePaid?.();
                }}
                className="rounded-md bg-green-600 px-4 py-2 text-white hover:opacity-95"
              >
                Confirmar Pagamento
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRModal;