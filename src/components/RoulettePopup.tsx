"use client";

import React from "react";
import { X } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Props = {
  open: boolean;
  onClose: () => void;
  userId?: string | null;
};

const SECTORS = [
  { id: 0, label: "+1100 GIROS DE MOEDAS" },
  { id: 1, label: "R$100 NA HORA LIBERADA" },
  { id: 2, label: "R$50 CASHBACK GARANTIDO" },
  { id: 3, label: "SUPER BÔNUS EXCLUSIVO" },
  { id: 4, label: "40 GIROS" },
  { id: 5, label: "SUPER BÔNUS EXCLUSIVO" },
  { id: 6, label: "+100 GIROS DE MOEDAS" },
  { id: 7, label: "40 GIROS" },
];

const sectorAngle = 360 / SECTORS.length;

const RoulettePopup: React.FC<Props> = ({ open, onClose, userId }) => {
  const [spinning, setSpinning] = React.useState(false);
  const [rotation, setRotation] = React.useState(0);
  const [lastPrize, setLastPrize] = React.useState<string | null>(null);
  const wheelRef = React.useRef<HTMLImageElement | null>(null);
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (!open) {
      setSpinning(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setLastPrize(null);

    const chosenIndex = Math.floor(Math.random() * SECTORS.length);
    const fullRotations = Math.floor(Math.random() * 4) + 4; // 4..7
    const offset = sectorAngle / 2;
    const randomInner = (Math.random() - 0.5) * (sectorAngle * 0.6);
    const target = fullRotations * 360 + chosenIndex * sectorAngle + offset + randomInner;

    setRotation((prev) => prev + target);

    const durationMs = 4200;
    setTimeout(() => {
      setSpinning(false);
      const prize = SECTORS[chosenIndex].label;
      setLastPrize(prize);

      const prizeMsg = `Parabéns! Você ganhou: ${prize}`;
      showSuccess(prizeMsg);

      if (userId) {
        try {
          const key = `roleta_prizes_${userId}`;
          const prev = JSON.parse(localStorage.getItem(key) || "[]");
          prev.push({ prize, time: new Date().toISOString() });
          localStorage.setItem(key, JSON.stringify(prev));
        } catch (e) {
          // ignore storage errors
        }
      }
    }, durationMs + 50);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className={cn(
        "w-full rounded-2xl bg-gradient-to-b from-[#0d0f14] to-[#06070a] border border-[#1c212b] p-6 shadow-2xl",
        isMobile ? "max-w-full h-full rounded-none flex flex-col justify-between" : "max-w-xl"
      )} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-end">
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 flex-1 justify-center"> {/* Adicionado flex-1 justify-center */}
          <div className="relative">
            <div className="relative w-full max-w-[320px] sm:h-[360px] sm:w-[360px]" style={{ aspectRatio: '1/1' }}>
              <img
                ref={wheelRef}
                src="/roleta/1.png"
                alt="roleta"
                className="h-full w-full object-contain select-none pointer-events-none"
                draggable={false}
                style={{
                  transform: `rotate(${rotation}deg)`,
                  transition: spinning ? "transform 4.2s cubic-bezier(.12,.82,.22,1)" : "transform 0.5s ease-out",
                  transformOrigin: "50% 50%",
                  willChange: "transform",
                }}
              />
            </div>

            <img
              src="/roleta/pin.png"
              alt="pin"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-[22%] w-[28%] sm:top-[104px] sm:w-[110px]"
            />
          </div>

          <div className="flex w-full items-center justify-center gap-4">
            <button
              onClick={handleSpin}
              disabled={spinning}
              className={`rounded-full px-6 py-3 text-sm font-bold text-black bg-[#ffcc00] transition-opacity ${spinning ? "opacity-60 cursor-not-allowed" : "hover:scale-105"}`}
            >
              {spinning ? "Girando..." : "GIRAR"}
            </button>
          </div>

          {lastPrize && (
            <div className="mt-2 rounded-md bg-[#071018] px-4 py-2 text-sm text-[#bbf7d0]">
              Último prêmio: <strong className="text-white ml-2">{lastPrize}</strong>
            </div>
          )}

          <div className="mt-2 text-xs text-[#6b7280] text-center max-w-[80%]">
            Atenção: Prêmios são creditados automaticamente na sua conta.
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoulettePopup;