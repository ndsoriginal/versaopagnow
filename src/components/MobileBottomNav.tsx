"use client";

import React, { useRef } from "react";
import { useLocation, Link } from "react-router-dom";
import { Home, Gamepad, Star, LifeBuoy, Gift } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface Props {
  onOpenRoulette: () => void;
  isRouletteOpen?: boolean;
}

const NAV_ITEMS = [
  { label: "In\u00edcio", icon: Home, href: "/" },
  { label: "Jogos", icon: Gamepad, href: "/games" },
  { label: "Roleta", icon: Gift, action: "roulette" as const },
  { label: "Populares", icon: Star, href: "/populares" },
  { label: "Suporte", icon: LifeBuoy, href: "/support" },
];

const MobileBottomNav: React.FC<Props> = ({ onOpenRoulette, isRouletteOpen }) => {
  const location = useLocation();
  const activePath = location.pathname;

  const getActiveIndex = () => {
    const idx = NAV_ITEMS.findIndex((item) => {
      if (item.action === "roulette") return !!isRouletteOpen;
      if (item.href === "/") return activePath === "/";
      if (item.href) return activePath.startsWith(item.href);
      return false;
    });
    return idx;
  };

  const activeIndex = getActiveIndex();

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0F1117]/95 backdrop-blur-lg border-t border-[#242832] shadow-[0_-4px_20px_rgba(0,0,0,0.3)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative flex items-center justify-around px-1">
        {activeIndex >= 0 && (
          <motion.div
            layoutId="active-pill"
            className="absolute top-1/2 -translate-y-1/2 h-[44px] bg-[#ffcc00]/10 rounded-xl"
            initial={false}
            animate={{
              left: `${(activeIndex * 100) / NAV_ITEMS.length}%`,
              width: `${100 / NAV_ITEMS.length}%`,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}

        {NAV_ITEMS.map((item, index) => {
          const active = activeIndex === index;

          const sharedClasses = cn(
            "relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[52px] rounded-xl transition-colors duration-300 select-none",
            active ? "text-[#ffcc00]" : "text-[#6B7280] hover:text-[#9CA3AF]"
          );

          const iconSize = active ? 22 : 20;
          const Icon = item.icon;

          const inner = (
            <>
              <div className="relative">
                <Icon
                  size={iconSize}
                  className={cn(
                    "transition-all duration-300",
                    active ? "scale-110" : "scale-100"
                  )}
                />
                {active && (
                  <motion.span
                    layoutId="active-dot"
                    className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#ffcc00] rounded-full"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </>
          );

          if (item.href) {
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(sharedClasses, "flex-1")}
              >
                {inner}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              onClick={onOpenRoulette}
              className={cn(sharedClasses, "flex-1")}
            >
              {inner}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
