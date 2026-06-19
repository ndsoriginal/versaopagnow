"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

export type DoubleColor = "red" | "black" | "white";

type Props = {
  resultNumber: number | null;
  resultColor: DoubleColor | null;
  status: string;
  onSpinComplete: () => void;
};

const ITEM_WIDTH = 76;
const ITEM_GAP = 10;
const ITEM_STEP = ITEM_WIDTH + ITEM_GAP;
const REPETITIONS = 14;
const SPIN_DURATION = 6000;

const BASE_NUMBERS = [1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14, 0];

function getColor(number: number): DoubleColor {
  if (number === 0) return "white";
  if (number >= 1 && number <= 7) return "red";
  return "black";
}

function createRouletteItems() {
  const items: { number: number; color: DoubleColor }[] = [];
  for (let i = 0; i < REPETITIONS; i++) {
    for (const num of BASE_NUMBERS) {
      items.push({ number: num, color: getColor(num) });
    }
  }
  return items;
}

function findTargetIndex(items: { number: number }[], resultNumber: number): number {
  const startSearch = Math.floor(items.length * 0.68);
  for (let i = startSearch; i < items.length; i++) {
    if (items[i].number === resultNumber) return i;
  }
  for (let i = 0; i < items.length; i++) {
    if (items[i].number === resultNumber) return i;
  }
  return items.length - 1;
}

function calcTranslateX(targetIndex: number, containerWidth: number): number {
  const itemCenter = targetIndex * ITEM_STEP + ITEM_WIDTH / 2;
  const containerCenter = containerWidth / 2;
  return containerCenter - itemCenter;
}

export default function DoubleRoulette({ resultNumber, resultColor, status, onSpinComplete }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const items = useMemo(() => createRouletteItems(), []);
  const [translateX, setTranslateX] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerIndex, setWinnerIndex] = useState<number | null>(null);
  const [showImpact, setShowImpact] = useState(false);
  const prevStatusRef = useRef<string>("");

  useEffect(() => {
    if (status === "spinning" && prevStatusRef.current !== "spinning" &&
        resultNumber !== null && resultNumber !== undefined) {
      prevStatusRef.current = "spinning";
      setWinnerIndex(null);
      setShowImpact(false);

      const newItems = createRouletteItems();
      // Force re-render by using a new array reference isn't needed here
      // since items is memoized. We need to reset position first.

      setIsSpinning(false);
      setTranslateX(0);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const containerWidth = wrapperRef.current?.offsetWidth || 800;
          const targetIndex = findTargetIndex(newItems, resultNumber);
          const finalX = calcTranslateX(targetIndex, containerWidth);

          setIsSpinning(true);
          setWinnerIndex(targetIndex);
          setTranslateX(finalX);

          const onEnd = () => {
            setIsSpinning(false);
            setShowImpact(true);
            setTimeout(() => setShowImpact(false), 250);
            onSpinComplete();
          };

          setTimeout(onEnd, SPIN_DURATION + 100);
        });
      });
    }

    if (status !== "spinning" && prevStatusRef.current === "spinning") {
      prevStatusRef.current = status;
    }
    if (status !== "spinning") {
      prevStatusRef.current = status;
    }
  }, [status, resultNumber, onSpinComplete]);

  return (
    <div
      ref={wrapperRef}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border select-none",
        "bg-gradient-to-b from-[#111827] to-[#0d1117] border-white/10",
        showImpact && "animate-[stopImpact_0.25s_ease-out]"
      )}
      style={{ height: 116 }}
    >
      {/* Gradientes laterais */}
      <div className="absolute inset-y-0 left-0 w-28 z-10 pointer-events-none bg-gradient-to-r from-[#111827] via-[#111827]/85 to-transparent" />
      <div className="absolute inset-y-0 right-0 w-28 z-10 pointer-events-none bg-gradient-to-l from-[#111827] via-[#111827]/85 to-transparent" />

      {/* Marcador central */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center pointer-events-none" style={{ height: '100%' }}>
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-l-transparent border-r-transparent border-t-[#facc15] drop-shadow-[0_0_18px_rgba(250,204,21,0.9)]" />
        <div className="w-[3px] flex-1 bg-gradient-to-b from-[#facc15]/70 via-[#facc15]/40 to-[#facc15]/70 shadow-[0_0_12px_rgba(250,204,21,0.4)]" />
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[14px] border-l-transparent border-r-transparent border-b-[#facc15] drop-shadow-[0_0_18px_rgba(250,204,21,0.9)]" />
      </div>

      {/* Faixa da roleta */}
      <div className="absolute inset-0 flex items-center">
        <div
          className="flex items-center gap-[10px] whitespace-nowrap"
          style={{
            transform: `translateX(${translateX}px)`,
            transition: isSpinning
              ? `transform ${SPIN_DURATION}ms cubic-bezier(0.12, 0.85, 0.25, 1)`
              : "none",
            willChange: isSpinning ? "transform" : "auto",
          }}
        >
          {items.map((item, i) => {
            const isWinner = winnerIndex === i && !isSpinning;

            return (
              <div
                key={i}
                className={cn(
                  "shrink-0 rounded-xl flex flex-col items-center justify-center font-black border transition-all duration-300",
                  item.color === "red" && "bg-gradient-to-b from-[#ff3b3b] to-[#991b1b] text-white border-red-900/30",
                  item.color === "black" && "bg-gradient-to-b from-[#374151] to-[#030712] text-white border-gray-700/30",
                  item.color === "white" && "bg-gradient-to-b from-[#ffffff] to-[#d1d5db] text-[#111827] border-gray-300/30",
                  isWinner && [
                    "ring-2 ring-[#facc15] ring-offset-2 ring-offset-[#111827]",
                    "shadow-[0_0_30px_rgba(250,204,21,0.7)]",
                    "scale-110 z-30",
                  ]
                )}
                style={{
                  minWidth: ITEM_WIDTH,
                  height: isWinner ? 84 : 76,
                  boxShadow: isWinner ? "0 0 30px rgba(250,204,21,0.7)" : "0 8px 20px rgba(0,0,0,0.35)",
                }}
              >
                <span className="text-[26px] font-extrabold leading-none drop-shadow-sm">
                  {item.number}
                </span>
                <span className="mt-0.5 text-[9px] font-bold opacity-70">
                  {item.color === "white" ? "14x" : "2x"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes stopImpact {
          0% { transform: scale(1); }
          40% { transform: scale(1.012); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
