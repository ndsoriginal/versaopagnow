"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, LifeBuoy, Send, Loader2, MessageSquare, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

type Message = {
  sender: "agent" | "user";
  text: string;
  time: string;
};

const FAQ_ITEMS = [
  {
    q: "Como funciona o bônus de país?",
    a: "O bônus de país é ativado ao selecionar uma bandeira estrangeira no menu de idiomas após realizar um depósito mínimo de R$ 30,00. O valor de R$ 300,00 é creditado instantaneamente na sua banca."
  },
  {
    q: "Por que meu saque está pendente?",
    a: "Para liberar o primeiro saque da conta (mínimo R$ 350,00), o sistema exige um depósito de liberação de R$ 20,00 para autenticar sua chave PIX e liberar o saldo do bônus. Após esse depósito, o saque é processado em até 2 minutos."
  },
  {
    q: "Qual o valor mínimo de depósito?",
    a: "O valor mínimo para depósitos na plataforma é de R$ 30,00 via PIX, com processamento instantâneo pelo Banco Central."
  },
  {
    q: "Como falar com um atendente real?",
    a: "Você já está em nosso canal de atendimento prioritário. Utilize o chat abaixo para enviar sua mensagem e nossa atendente Amanda responderá em instantes."
  }
];

type Props = {
  open: boolean;
  onClose: () => void;
  userEmail?: string | null;
};

export default function SupportModal({ open, onClose, userEmail }: Props) {
  const [activeTab, setActiveTab] = useState<"chat" | "faq">("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (open && messages.length === 0) {
      // Mensagem de boas-vindas inicial da Amanda
      setMessages([
        {
          sender: "agent",
          text: `Olá! Sou a Amanda, sua atendente de suporte PixBett. Como posso te ajudar hoje?`,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        }
      ]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      sender: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // Simula resposta inteligente da Amanda após 2 segundos
    setTimeout(() => {
      setIsTyping(false);
      let replyText = "Entendi sua dúvida. Para que eu possa te ajudar melhor, certifique-se de que realizou o depósito de ativação de R$ 30,00 e o depósito de liberação de R$ 20,00 para que seu saque de R$ 350,00 seja liberado imediatamente via PIX.";
      
      if (trimmed.toLowerCase().includes("saque") || trimmed.toLowerCase().includes("sacar")) {
        replyText = "Olá! Para liberar saques que contenham bônus de país, o sistema exige a autenticação da chave PIX através de um depósito de liberação de R$ 20,00. Assim que feito, o saque de R$ 350,00 cai na sua conta em menos de 2 minutos.";
      } else if (trimmed.toLowerCase().includes("bônus") || trimmed.toLowerCase().includes("bug")) {
        replyText = "O bônus de país de R$ 300,00 é liberado após o depósito de ativação de R$ 30,00. Basta selecionar qualquer bandeira no menu de idiomas para receber o saldo.";
      }

      const agentMsg: Message = {
        sender: "agent",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      };
      setMessages(prev => [...prev, agentMsg]);
    }, 2000);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className={cn(
        "w-full rounded-3xl bg-[#0d0f14] border border-[#1c212b] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col",
        isMobile ? "max-w-full h-full rounded-none" : "max-w-lg h-[550px]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between bg-[#13161d] px-6 py-4 border-b border-[#1c212b]">
          <div className="flex items-center gap-3">
            <div className="bg-[#ffcc00] p-2 rounded-xl">
              <LifeBuoy size={20} className="text-black" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-tight">Suporte PixBett</h2>
              <p className="text-[10px] text-emerald-500 font-bold uppercase flex items-center gap-1 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Amanda Online
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 bg-[#06070a] border-b border-[#1c212b] p-1">
          <button
            onClick={() => setActiveTab("chat")}
            className={cn(
              "py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "chat" ? "bg-[#13161d] text-[#ffcc00]" : "text-gray-400 hover:text-white"
            )}
          >
            <MessageSquare size={14} />
            Chat Online
          </button>
          <button
            onClick={() => setActiveTab("faq")}
            className={cn(
              "py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
              activeTab === "faq" ? "bg-[#13161d] text-[#ffcc00]" : "text-gray-400 hover:text-white"
            )}
          >
            <HelpCircle size={14} />
            Dúvidas Frequentes
          </button>
        </div>

        {/* Tab Content: Chat */}
        {activeTab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0">
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#05070d]">
              {messages.map((msg, idx) => {
                const isAgent = msg.sender === "agent";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[80%] space-y-1",
                      isAgent ? "self-start" : "self-end items-end"
                    )}
                  >
                    <span className="text-[9px] text-gray-500 font-bold uppercase">
                      {isAgent ? "Amanda (Suporte)" : "Você"}
                    </span>
                    <div className={cn(
                      "rounded-2xl p-3.5 text-xs leading-relaxed shadow-md",
                      isAgent 
                        ? "bg-[#13161d] border border-[#1c212b] text-gray-200 rounded-tl-none" 
                        : "bg-[#ffcc00] text-black font-medium rounded-tr-none"
                    )}>
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-gray-600 font-bold">{msg.time}</span>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex flex-col max-w-[80%] space-y-1 self-start">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Amanda está digitando</span>
                  <div className="bg-[#13161d] border border-[#1c212b] rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1">
                    <Loader2 className="animate-spin text-[#ffcc00]" size={14} />
                    <span className="text-xs text-gray-400">Digitando resposta...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-[#1c212b] bg-[#0d0f14] flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-3 text-xs text-white focus:border-[#ffcc00] focus:outline-none"
              />
              <button
                onClick={handleSendMessage}
                className="bg-[#ffcc00] hover:bg-[#ffdb4d] text-black p-3 rounded-xl transition-all active:scale-95"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Tab Content: FAQ */}
        {activeTab === "faq" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-[#05070d]">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="bg-[#06070a] border border-[#1c212b] rounded-2xl overflow-hidden transition-all"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left text-xs font-bold text-white hover:bg-[#13161d] transition-colors"
                  >
                    <span>{item.q}</span>
                    {isOpen ? <ChevronUp size={16} className="text-[#ffcc00]" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-gray-300 leading-relaxed border-t border-[#1c212b]/50 pt-3 bg-[#0d0f14]/50">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}