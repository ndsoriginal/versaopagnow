"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { X, Crown, Send, Reply } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";
import { useIsMobile } from "@/hooks/use-mobile";

type Tier = "gold" | "silver" | "bronze" | "blue";
type Message = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  avatar: string;
  time: string;
  tier: Tier;
  level: number;
  recentWithdraw?: number;
  hasCrown?: boolean;
  languageLabel?: string;
};

const DIALOGUE_CHAINS = [
  {
    topic: "bug_guide",
    steps: [
      "Alguém sabe se o bug de trocar o país ainda tá funcionando?",
      "Tá sim mano, acabei de fazer aqui na Tailândia e caiu na hora!",
      "Tem que depositar os 20 pra liberar o saque depois?",
      "Sim, deposita os 20 que o saldo total libera pra saque via PIX.",
      "Caraca, funcionou mesmo!! Valeu pela dica @usuário, tamo junto! 🚀",
    ],
  },
  {
    topic: "payment_proof",
    steps: [
      "Duvido que essa plataforma paga mesmo...",
      "Paga sim, acabei de postar no grupo, caiu 1.200 aqui.",
      "Demora quanto tempo o PIX?",
      "Aqui caiu em menos de 2 minutos, bem rápido.",
      "Vou testar então, se cair eu volto pra avisar.",
    ],
  },
  {
    topic: "game_tips",
    steps: [
      "O Tiger tá pagando agora? Tô querendo entrar.",
      "Mano, o Rabbit tá melhor, acabei de soltar a carta lá.",
      "Sério? Vou tentar o Rabbit então, vlw!",
      "Vai lá que a banca tá generosa hoje kkkk",
    ],
  },
];

const RANDOM_HYPE = [
  "BORA!! Mais um saque pra conta! 💰",
  "Essa plataforma é bizarra, pagando muito no bug",
  "Tailândia melhor país kkkk quem sabe sabe",
  "Fiz 500 virar 2k hoje, vou parar por aqui",
  "Suporte nota 10, me ajudaram com o depósito rápido",
  "Galera, já tirei meu salário em 15 min aqui",
  "O bônus do país tá vivo, só trocar, mano",
  "1º depósito de 30 + bug = saldo +500, sem estresse",
  "Tô saqueando todo dia, tá surreal",
  "Fiz o saquezinho e o PIX caiu de boa, não precisei de nada",
];

const WITHDRAW_TEMPLATES: ((amount: number) => string)[] = [
  (amount) => `Saque de R$ ${amount.toLocaleString("pt-BR")} caiu sem erro em 1 min`,
  (amount) => `Confirmado: saque de R$ ${amount.toLocaleString("pt-BR")} liberado já tô com o valor aqui`,
  (amount) => `R$ ${amount.toLocaleString("pt-BR")} saiu da conta agora graças ao bug do país`,
];

const FOREIGN_MESSAGES: { label: string; text: string; isQuestion?: boolean }[] = [
  { label: "中文", text: "我刚刚提取了 1,200 雷亚尔，真的到账了。" },
  { label: "русский", text: "Платформа платит! Только что снял 900 реалов。" },
  { label: "français", text: "Je viens de retirer 800 reais, c'est revenu instantané!" },
  { label: "English", text: "Just cashed out $750 brl, no drama at all." },
  { label: "Español", text: "¿Alguien sabe si el juego del tigre está pagando bien hoy?", isQuestion: true },
  { label: "Deutsch", text: "Ich habe gerade 1500 BRL abgehoben, es war sofort auf meinem Konto." },
];

const AUTO_RESPONSES = [
  "Tá pagando sim, corre antes que descubram",
  "Mano tá funcionando ainda, mas vai acabar já já",
  "Tá pagando certinho, aproveita agora",
  "Corre mano, isso vai ser corrigido rápido",
  "Tá dando certo sim, mas não vai durar",
  "Tá pagando muito, corre antes do patch",
  "Mano aproveita agora porque vão fechar isso",
  "Tá funcionando ainda kkk corre",
  "Tá pagando normal, mas daqui a pouco acaba",
  "Vai logo mano, isso não fica muito tempo",
  "Tá dando bom sim, aproveita enquanto dá",
  "Tá pagando ainda, mas já já corrigem",
  "Corre aproveitar antes que tirem",
  "Tá funcionando liso, mas por pouco tempo",
  "Mano isso vai parar quando descobrirem",
  "Tá pagando demais, aproveita AGORA",
  "Corre que isso tá com cara de temporário",
  "Tá funcionando sim, mas não dorme nisso",
  "Pode fazer, mas faz rápido 😂",
  "Tá pagando certo, corre antes que fechem",
  "Aqui tá indo normal, mas já já acaba",
  "Tá bugado ainda, aproveita",
  "Mano corre enquanto ainda passa",
  "Tá pagando sim, mas vão arrumar isso",
  "Tá funcionando agora, depois esquece",
  "Corre que isso não dura muito",
  "Tá pagando certinho, aproveita antes do fix",
  "Mano faz agora porque tão descobrindo",
  "Tá dando retorno ainda, mas tá acabando",
  "Aproveita logo porque isso vai cair já já",
];

const NAME_POOL = [
  "Gustavo",
  "Felipe",
  "Rodrigo",
  "Thiago",
  "Carlos",
  "Rafael",
  "Marcos",
  "Danilo",
  "Amanda",
  "Letícia",
  "Larissa",
  "Patrícia",
  "Eduardo",
  "Fernanda",
  "Renata",
  "Bruno",
];

const FOREIGN_PROBABILITY = 0.12;
const LAST_TEXTS_LIMIT = 12;
const COOLDOWNS = [50, 70];

function randomFrom<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function uid() {
  return Math.random().toString(36).slice(2, 9);
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function GlobalChat({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useSession();
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [nextAvailableAt, setNextAvailableAt] = useState(Date.now());
  const [isCooling, setIsCooling] = useState(false);
  const [countdown, setCountdown] = useState(0);
  
  const lastTextsRef = useRef<string[]>([]);
  const activeChainRef = useRef<{ chainIndex: number; step: number } | null>(null);
  const responseQueueRef = useRef<{ userName: string; targetCount: number; currentCount: number } | null>(null);
  const lastAutoResponseRef = useRef<string | null>(null);
  const initialMessagesLoaded = useRef(false);

  // Estados para o gesto de arrastar (Deslizar para a direita para fechar)
  const [startX, setStartX] = useState(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const currentUserName = useMemo(() => user?.email?.split("@")[0] || "Você", [user?.email]);

  const registerText = (text: string) => {
    const arr = [...lastTextsRef.current, text];
    if (arr.length > LAST_TEXTS_LIMIT) arr.shift();
    lastTextsRef.current = arr;
  };

  const isDuplicate = (text: string) => lastTextsRef.current.includes(text);

  const pushMessage = (msg: Message) => {
    setMessages((prev) => {
      const next = [...prev, msg];
      return next.slice(-50);
    });
    registerText(msg.text);
    
    if (responseQueueRef.current && msg.userId !== user?.id) {
      responseQueueRef.current.currentCount++;
      if (responseQueueRef.current.currentCount >= responseQueueRef.current.targetCount) {
        triggerAutoResponse(responseQueueRef.current.userName);
        responseQueueRef.current = null;
      }
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(Math.ceil((nextAvailableAt - Date.now()) / 1000), 0);
      setCountdown(remaining);
      if (remaining <= 0 && isCooling) {
        setIsCooling(false);
      }
    }, 500);
    return () => clearInterval(timer);
  }, [nextAvailableAt, isCooling]);

  const isQuestionText = (text: string) => {
    return text.includes("?") || text.startsWith("Alguém sabe") || text.startsWith("Tem que") || text.startsWith("Duvido que") || text.startsWith("Demora quanto") || text.startsWith("O Tiger tá pagando");
  };

  const createPortuguesePayload = () => {
    let text = "";
    let withdrawAmount: number | undefined;
    let isQuestion = false;

    if (activeChainRef.current) {
      const { chainIndex, step } = activeChainRef.current;
      const chain = DIALOGUE_CHAINS[chainIndex];
      text = chain.steps[step];
      isQuestion = isQuestionText(text);

      if (step < chain.steps.length - 1) {
        activeChainRef.current.step++;
      } else {
        activeChainRef.current = null;
      }
    } else {
      if (Math.random() > 0.58) {
        const chainIndex = randInt(0, DIALOGUE_CHAINS.length - 1);
        activeChainRef.current = { chainIndex, step: 0 };
        text = DIALOGUE_CHAINS[chainIndex].steps[0];
        isQuestion = isQuestionText(text);
      } else {
        text = randomFrom(RANDOM_HYPE);
        isQuestion = isQuestionText(text); 
      }
    }

    if (!isQuestion && Math.random() > 0.55) { 
      withdrawAmount = randInt(300, 3000); 
      if (Math.random() > 0.5) {
        text = randomFrom(WITHDRAW_TEMPLATES)(withdrawAmount);
      }
    }

    return { text, withdrawAmount, isQuestion };
  };

  const generateMessage = (isInitial = false) => {
    if (Math.random() < FOREIGN_PROBABILITY) {
      const payload = ensureUniqueForeign(() => randomFrom(FOREIGN_MESSAGES));
      const isMsgQuestion = payload.isQuestion || isQuestionText(payload.text);
      const withdrawAmount = !isMsgQuestion && Math.random() > 0.6 ? randInt(300, 3000) : undefined;

      const msg: Message = {
        id: uid(),
        userId: uid(),
        userName: `${randomFrom(NAME_POOL)} ${randInt(10, 99)}`,
        text: payload.text,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(payload.text)}&backgroundColor=f7d0ce,ffd6a9,ddf6c5`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tier: "blue",
        level: randInt(5, 60),
        hasCrown: false,
        languageLabel: payload.label,
        recentWithdraw: withdrawAmount,
      };
      pushMessage(msg);
      return;
    }

    let payload = createPortuguesePayload();
    let tries = 0;
    while (isDuplicate(payload.text) && tries < 6) {
      payload = createPortuguesePayload();
      tries += 1;
    }

    const level = randInt(1, 100);
    const tier: Tier = level > 80 ? "gold" : level > 50 ? "silver" : level > 20 ? "bronze" : "blue";
    const msg: Message = {
      id: uid(),
      userId: uid(),
      userName: `${randomFrom(NAME_POOL)} ${randInt(10, 99)}`,
      text: payload.text,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(`${payload.text}-${level}`)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      tier,
      level,
      recentWithdraw: payload.withdrawAmount,
      hasCrown: level > 70,
    };

    pushMessage(msg);
  };

  const ensureUniqueForeign = (generator: () => { label: string; text: string; isQuestion?: boolean }) => {
    let payload = generator();
    let tries = 0;
    while (isDuplicate(payload.text) && tries < 5) {
      payload = generator();
      tries += 1;
    }
    return payload;
  };

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const scheduleNext = () => {
      const inChain = activeChainRef.current !== null && activeChainRef.current.step > 0;
      const delay = inChain ? randInt(1500, 3200) : randInt(2000, 6000); 

      timeoutId = setTimeout(() => {
        generateMessage();
        scheduleNext();
      }, delay);
    };

    if (isOpen && !initialMessagesLoaded.current) {
      for (let i = 0; i < 25; i++) {
        generateMessage(true);
      }
      initialMessagesLoaded.current = true;
    }

    if (isOpen) {
      scheduleNext();
    } else {
      clearTimeout(timeoutId);
    }

    return () => clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startCooldown = () => {
    const duration = randomFrom(COOLDOWNS);
    setNextAvailableAt(Date.now() + duration * 1000);
    setIsCooling(true);
  };

  const triggerAutoResponse = (userName: string) => {
    const sendResponse = (isDouble: boolean) => {
      const available = AUTO_RESPONSES.filter((text) => text !== lastAutoResponseRef.current);
      const baseText = available.length ? randomFrom(available) : randomFrom(AUTO_RESPONSES);
      lastAutoResponseRef.current = baseText;
      
      const tag = `@${userName} `;
      const isResponseQuestion = isQuestionText(baseText);
      const withdrawAmount = !isResponseQuestion && Math.random() > 0.5 ? randInt(300, 3000) : undefined;

      const finalMsg: Message = {
        id: uid(),
        userId: uid(),
        userName: isDouble ? randomFrom(NAME_POOL) : "Daniel F.",
        text: tag + baseText,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${isDouble ? 'bot2' : 'bot1'}&backgroundColor=ffe4e1,f0f5ff,dfdfff`,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        tier: "gold",
        level: randInt(85, 100),
        recentWithdraw: withdrawAmount,
        hasCrown: true,
      };
      
      pushMessage(finalMsg);
    };

    setTimeout(() => sendResponse(false), 500);

    if (Math.random() > 0.4) {
      setTimeout(() => sendResponse(true), randInt(2500, 5000));
    }
  };

  const handleSendMessage = () => {
    if (!user) return;
    const trimmed = inputValue.trim();
    if (!trimmed || isCooling) return;

    const name = user.email?.split("@")[0] || "Você";
    const msg: Message = {
      id: uid(),
      userId: user.id,
      userName: name,
      text: trimmed,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=ffe4e1,f0f5ff,dfdfff`,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      tier: "gold",
      level: 100,
      hasCrown: true,
    };

    pushMessage(msg);
    setInputValue("");
    startCooldown();

    const isQuestion = /[?¿]/.test(trimmed) || trimmed.length > 15;
    if (isQuestion) {
      responseQueueRef.current = {
        userName: name,
        targetCount: randInt(4, 8),
        currentCount: 0
      };
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleReplyClick = (msg: Message) => {
    if (user) {
      setInputValue(`@${msg.userName} `);
      inputRef.current?.focus();
    }
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(new RegExp(`(@${currentUserName})`, 'g'));
    return parts.map((part, i) => 
      part === `@${currentUserName}` 
        ? <span key={i} className="font-black text-[#ffcc00] animate-pulse">{part}</span> 
        : part
    );
  };

  // Handlers para o gesto de arrastar (Deslizar para a direita para fechar)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setStartX(e.touches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile || !isDragging) return;
    const currentX = e.touches[0].clientX;
    const offset = currentX - startX;
    // Permite arrastar apenas para a direita (fechar)
    setDragOffset(Math.max(0, offset)); 
  };

  const handleTouchEnd = () => {
    if (!isMobile || !isDragging) return;
    setIsDragging(false);
    const threshold = window.innerWidth * 0.25; // 25% da largura da tela para fechar
    if (dragOffset > threshold) {
      onClose();
    }
    setDragOffset(0);
  };

  return (
    <>
      {/* Backdrop escuro para fechar ao clicar fora (Mobile e Desktop) */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-xs transition-opacity cursor-pointer"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          "fixed right-0 top-0 z-[60] w-[85%] sm:w-[360px] max-w-[360px] bg-[#06070a] border-l border-[#1c212b] flex flex-col shadow-[-10px_0_25px_rgba(0,0,0,0.6)]",
          isOpen ? "translate-x-0" : "translate-x-full",
          !isDragging && "transition-transform duration-300"
        )}
        style={{ height: '100dvh', transform: isDragging && isMobile ? `translateX(${dragOffset}px)` : undefined }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header do Chat */}
        <div className="flex items-center justify-between p-4 border-b border-[#1c212b] bg-[#0d0f14]">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-bold uppercase text-white tracking-widest">Chat Global</span>
          </div>
          
          {/* Botão de Fechar Gigante e Fácil de Clicar */}
          <button 
            onClick={onClose} 
            className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 hover:text-red-200 px-3 py-1.5 rounded-xl border border-red-500/30 transition-all active:scale-95"
          >
            <span className="text-[10px] font-black uppercase tracking-wider">Fechar</span>
            <X size={16} />
          </button>
        </div>

        {/* Mensagens */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-[#05070d]">
          {messages.map((msg) => {
            const isMine = msg.userId === user?.id;
            return (
              <button
                type="button"
                key={msg.id}
                onClick={() => handleReplyClick(msg)}
                className="w-full text-left flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 focus:outline-none"
                aria-label={`Responder ${msg.userName}`}
              >
                <div className="relative shrink-0">
                  <div className="h-11 w-11 rounded-full overflow-hidden border-2 border-[#1c212b] bg-[#11141b] shadow-lg">
                    <img src={msg.avatar} alt="av" className="h-full w-full object-cover" />
                  </div>
                  {msg.hasCrown && (
                    <div className="absolute -top-2 -right-1 text-[#ffcc00] drop-shadow-[0_0_5px_rgba(255,204,0,0.8)]">
                      <Crown size={14} fill="currentColor" />
                    </div>
                  )}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#11141b] border border-[#2d3644] px-1 rounded-sm">
                    <span className="text-[7px] font-black text-[#ffcc00]">LV.{msg.level}</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={cn(
                        "text-[11px] font-black uppercase tracking-tight",
                        msg.tier === "gold" ? "text-[#ffcc00]" : "text-[#94a3b8]"
                      )}
                    >
                      {msg.userName}
                    </span>
                    {msg.languageLabel && (
                      <span className="text-[9px] text-[#cbd5f5] border border-[#3b4459] px-1 rounded-sm">
                        {msg.languageLabel}
                      </span>
                    )}
                    <span className="text-[8px] text-gray-600 font-bold">{msg.time}</span>
                  </div>

                  <div
                    className={cn(
                      "rounded-2xl rounded-tl-none bg-[#0d0f14] p-3 border relative group shadow-xl transition-colors",
                      isMine ? "bg-[#11141b] border-[#ffcc00]/40" : "bg-[#0d0f14] border-[#1c212b] hover:border-[#ffcc00]/30",
                    )}
                  >
                    <p className="text-[12px] text-gray-200 leading-relaxed font-medium">{renderMessageText(msg.text)}</p>

                    {msg.recentWithdraw && (
                      <div className="mt-2 flex items-center gap-1.5 border-t border-white/5 pt-2">
                        <span className="text-[10px] font-black text-green-500 italic flex items-center gap-1">
                          <span className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                          + SACOU R$ {msg.recentWithdraw.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Input de Envio */}
        <div className="p-4 border-t border-[#1c212b] bg-[#0d0f14] space-y-2">
          {user ? (
            <>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  maxLength={120}
                  placeholder={isCooling ? `Aguarde ${countdown}s para enviar` : "Compartilhe sua experiência..."}
                  className="w-full rounded-xl bg-[#06070a] border border-[#1c212b] py-3 px-4 text-sm text-white focus:outline-none focus:border-[#ffcc00]"
                  disabled={isCooling}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isCooling || !inputValue.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-[#ffcc00] p-2 text-black hover:bg-[#ffd166] disabled:opacity-50"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-xs text-center text-gray-400 uppercase tracking-widest">
              Faça login para participar do chat.
            </div>
          )}
        </div>
      </div>
    </>
  );
}