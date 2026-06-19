"use client";

import React from "react";
import { X } from "lucide-react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type LoginPopupProps = {
  open: boolean;
  onClose: () => void;
  onOpenSignup: () => void;
};

const LoginPopup: React.FC<LoginPopupProps> = ({ open, onClose }) => {
  const isMobile = useIsMobile();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className={cn(
        "relative w-full rounded-2xl bg-gradient-to-b from-[#0d0f14] to-[#06070a] border border-[#1c212b] p-4 shadow-2xl overflow-hidden my-auto",
        isMobile ? "max-w-full h-full rounded-none" : "max-w-sm"
      )}>
        
        {/* Botão de fechar absoluto sobre a imagem para economizar espaço */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 z-10 bg-black/50 hover:bg-black/80 text-gray-300 hover:text-white rounded-full p-1.5 transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>

        {/* Imagem de topo mais compacta */}
        <div className="w-full -mt-4 -mx-4 mb-3 overflow-hidden rounded-t-2xl">
          <img
            src="/login.png"
            alt="Promo"
            className="w-full h-24 sm:h-28 object-cover"
            draggable={false}
          />
        </div>

        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#ffcc00",
                  brandAccent: "#ffcc00",
                },
                space: {
                  inputPadding: "10px",
                  buttonPadding: "10px",
                },
              },
            },
          }}
          theme="dark"
          view="sign_in"
          localization={{
            variables: {
              sign_in: {
                email_label: "E-mail",
                password_label: "Senha",
                button_label: "Entrar",
                link_text: "Esqueceu sua senha?",
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default LoginPopup;