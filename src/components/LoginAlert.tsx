"use client";

import React from "react";

const LoginAlert: React.FC = () => {
  const [open, setOpen] = React.useState(true);
  if (!open) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[350px] rounded-lg bg-[#EF4444] p-4 shadow-2xl text-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">Login necessário</div>
          <div className="mt-1 text-xs">Faça login para começar a jogar!</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (window.location.href = "/login")}
            className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium"
          >
            Entrar
          </button>
          <button onClick={() => setOpen(false)} className="text-white/80 text-sm">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginAlert;