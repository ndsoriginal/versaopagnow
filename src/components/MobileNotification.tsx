"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type NotificationData = {
  title: string;
  body: string;
  icon?: string;
  brand?: "nubank" | "pixbett";
};

export default function MobileNotification() {
  const isMobile = useIsMobile();
  const [notification, setNotification] = useState<NotificationData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleNotification = (e: Event) => {
      if (!isMobile) return; // Apenas no mobile conforme solicitado

      const customEvent = e as CustomEvent<NotificationData>;
      setNotification(customEvent.detail);
      setVisible(true);

      // Tenta vibrar o celular se o navegador suportar (padrão de notificação recebida)
      if ("vibrate" in navigator) {
        navigator.vibrate([150, 100, 150]);
      }

      // Auto-ocultar após 12 segundos conforme solicitado
      const timer = setTimeout(() => {
        setVisible(false);
      }, 12000);

      return () => clearTimeout(timer);
    };

    window.addEventListener("mobile:notification", handleNotification);
    return () => window.removeEventListener("mobile:notification", handleNotification);
  }, [isMobile]);

  if (!isMobile || !notification) return null;

  const isNubank = notification.brand === "nubank";

  return (
    <div
      className={cn(
        "fixed top-4 left-4 right-4 z-[999] transition-all duration-500 transform ease-out",
        visible ? "translate-y-0 opacity-100" : "-translate-y-32 opacity-0 pointer-events-none"
      )}
      onClick={() => setVisible(false)}
    >
      {/* Card estilo Push Notification do iPhone (iOS) idêntico ao Nubank */}
      <div className="w-full bg-white/95 backdrop-blur-2xl border border-gray-200/80 rounded-[28px] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.15)] active:scale-98 transition-transform cursor-pointer flex items-start gap-3.5">
        
        {/* Ícone do Nubank Roxo Oficial ou PixBett */}
        {isNubank ? (
          <img 
            src="/nubank-logo.png" 
            alt="Nubank" 
            className="h-11 w-11 shrink-0 shadow-sm rounded-[14px] object-cover" 
          />
        ) : (
          <div className="h-11 w-11 rounded-[14px] bg-[#ffcc00] flex items-center justify-center text-black shrink-0 shadow-sm">
            <img src="/pixbetlogo.png" alt="PixBett" className="h-5 w-auto object-contain grayscale brightness-0" />
          </div>
        )}

        {/* Conteúdo da Notificação iOS */}
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[15px] font-bold text-black tracking-tight">
              {notification.title}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium">
              <span>Agora</span>
              <span className="text-[14px] leading-none font-bold -mt-1">···</span>
            </div>
          </div>
          <p className="text-[13px] text-gray-700 leading-snug font-normal">
            {notification.body}
          </p>
        </div>
      </div>
    </div>
  );
}