"use client";

import React from "react";

const FLAGS = [
  "/bandeiras/bandeiradobrasil-2-cke.webp",
  "/bandeiras/Flag_of_the_United_States.svg",
  "/bandeiras/Flag_of_Russia.svg",
  "/bandeiras/Flag_of_Thailand.svg",
  "/bandeiras/Flag_of_the_People's_Republic_of_China.svg.png",
  "/bandeiras/Flag_of_the_United_Arab_Emirates.svg.png",
  "/bandeiras/Flag_of_Germany.svg"
];

const FooterHome: React.FC = () => {
  return (
    <footer className="mt-12 border-t border-[#242832] bg-[#0B0D12] py-10 text-center text-sm text-[#9CA3AF]">
      <div className="mx-auto max-w-[1180px] px-4">
        <div className="mb-4 flex items-center justify-center gap-3">
          <img src="/pixbetlogo.png" alt="PixBett" className="h-6 w-auto grayscale opacity-50" />
        </div>

        <div className="mb-6 text-[#64748b] max-w-2xl mx-auto leading-relaxed">
          Bem-vindo ao lar dos jogos online. Slots, Crash, Double, Mines e muito mais. Receba recompensas em tempo real,
          cashback e rodadas grátis ao se inscrever. Jogue com responsabilidade.
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 opacity-40">
          {FLAGS.map((flag, idx) => (
            <img key={idx} src={flag} alt="flag" className="h-4 w-auto rounded-sm" />
          ))}
        </div>

        <div className="mb-6 flex items-center justify-center gap-6 font-medium text-[12px]">
          <a className="text-[#9CA3AF] hover:text-[#ffcc00] transition-colors cursor-pointer">Termos de Uso</a>
          <a className="text-[#9CA3AF] hover:text-[#ffcc00] transition-colors cursor-pointer">Privacidade</a>
          <a className="text-[#9CA3AF] hover:text-[#ffcc00] transition-colors cursor-pointer">Suporte</a>
          <a className="text-[#9CA3AF] hover:text-[#ffcc00] transition-colors cursor-pointer">FAQ</a>
        </div>

        <div className="text-[#334155] text-[10px] uppercase tracking-widest font-bold">
          © 2024 PixBett. Todos os direitos reservados.
        </div>
      </div>
    </footer>
  );
};

export default FooterHome;