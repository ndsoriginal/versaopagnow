"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Gift, X, Home, Gamepad, Trophy, PlayCircle, LifeBuoy, Flame } from "lucide-react";

type SidebarNavProps = {
  onOpenRoulette?: () => void;
};

export default function SidebarNav({ onOpenRoulette }: SidebarNavProps) {
  const location = useLocation();
  const activeRoute = location.pathname;

  const navItems = [
    { label: "Início", icon: Home, href: "/" },
    { label: "Jogos", icon: Gamepad, href: "/games" },
    { label: "Populares", icon: Flame, href: "/populares" },
    { label: "Cassino", icon: Trophy, href: "#" },
    { label: "Ao Vivo", icon: PlayCircle, href: "#" },
    { label: "Torneios", icon: Trophy, href: "#" },
    { label: "Roleta", icon: Gift, action: "openRoulette" },
    { label: "Suporte", icon: LifeBuoy, href: "/support" },
  ];

  const handleItemClick = (item: typeof navItems[0]) => {
    if (item.action === "openRoulette") {
      onOpenRoulette?.();
    } else if (item.href) {
      window.location.href = item.href;
    }
  };

  return (
    <nav className="hidden lg:block fixed left-0 top-0 h-screen w-64 bg-[#06070a] border-r border-[#1c212b] p-6 shadow-2xl">
      <div className="mb-10 flex items-center justify-between">
        <Link to="/" onClick={(e) => { e.preventDefault(); window.location.href = "/"; }}>
          <img src="/pixbetlogo.png" alt="PixBett" className="h-10 w-auto object-contain" />
        </Link>
        <button
          onClick={() => window.location.href = "/"}
          className="text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = item.href === activeRoute;
          return (
            <Link
              key={item.label}
              to={item.href ?? "#"}
              onClick={(e) => {
                e.preventDefault();
                handleItemClick(item);
              }}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                isActive
                  ? "bg-[#ffcc00] text-black shadow-lg"
                  : "text-gray-500 hover:bg-[#0d0f14] hover:text-white"
              )}
            >
              <item.icon size={18} className="text-[#ffcc00]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <button
        onClick={() => {
          window.location.href = "/";
        }}
        className="flex items-center gap-3 text-gray-400 hover:text-white mt-auto pt-6"
      >
        <X size={24} />
        <span>Sair</span>
      </button>
    </nav>
  );
}