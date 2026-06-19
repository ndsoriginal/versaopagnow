"use client";

import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, LifeBuoy, Search, MessageSquare, Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";

type Message = {
  sender: "agent" | "user";
  text: string;
  time: string;
};

const FAQS = [
  {
    q: "Como funciona o bônus de país?",
    a: "O bônus de país é ativado ao selecionar uma bandeira estrangeira no menu de idiomas após realizar um depósito mínimo de R$ 30,00. O valor de R$ 300,00 é creditado instantaneamente na sua banca.",
  },
  {
    q: "Por que meu saque está pendente?",
    a: "Para liberar o primeiro saque da conta (mínimo R$ 350,00), o sistema exige um depósito de liberação de R$ 20,00 para autenticar sua chave PIX e liberar o saldo do bônus. Após esse depósito, o saque é processado em até 2 minutos.",
  },
  {
    q: "Qual o valor mínimo de depósito?",
    a: "O valor mínimo para depósitos na plataforma é de R$ 30,00 via PIX, com processamento instantâneo pelo Banco Central.",
  },
  {
    q: "Como falar com um atendente real?",
    a: "Você já está em nosso canal de atendimento prioritário. Utilize o chat ao lado (ou abaixo, no mobile) para enviar sua mensagem e nossa atendente Amanda responderá em instantes.",
  },
  {
    q: "Quanto tempo demora para o PIX cair?",
    a: "Os depósitos via PIX são processados em até 2 minutos pelo Banco Central. Caso não veja o saldo, tente atualizar a página.",
  },
];

const INITIAL_AGENT_MSG: Message = {
  sender: "agent",
  text: "Olá! Sou a Amanda, sua atendente de suporte PixBett. Como posso te ajudar hoje?",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

export default function SupportPage() {
  const navigate = useNavigate();
  const { user } = useSession();
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  // Chat state
  const [messages, setMessages] = useState<Message[]>([INITIAL_AGENT_MSG]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredFaqs = FAQS.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    const userMsg: Message = {
      sender: "user",
      text: trimmed,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      let replyText =
        "Entendi sua dúvida. Para que eu possa te ajudar melhor, certifique-se de que realizou o depósito de ativação de R$ 30,00 e o depósito de liberação de R$ 20,00 para que seu saque de R$ 350,00 seja liberado imediatamente via PIX.";

      const lower = trimmed.toLowerCase();
      if (lower.includes("saque") || lower.includes("sacar")) {
        replyText =
          "Olá! Para liberar saques que contenham bônus de país, o sistema exige a autenticação da chave PIX através de um depósito de liberação de R$ 20,00. Assim que feito, o saque de R$ 350,00 cai na sua conta em menos de 2 minutos.";
      } else if (lower.includes("bônus") || lower.includes("bug") || lower.includes("país")) {
        replyText =
          "O bônus de país de R$ 300,00 é liberado após o depósito de ativação de R$ 30,00. Basta selecionar qualquer bandeira no menu de idiomas para receber o saldo.";
      } else if (lower.includes("deposit") || lower.includes("pix") || lower.includes("pagar")) {
        replyText =
          "O depósito mínimo é de R$ 30,00 via PIX. A cobrança é gerada instantaneamente e o saldo cai na sua conta em até 2 minutos após a confirmação do pagamento.";
      }

      const agentMsg: Message = {
        sender: "agent",
        text: replyText,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, agentMsg]);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-[#06070a] text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#06070a]/90 backdrop-blur-md border-b border-[#1c212b]">
        <div className="mx-auto max-w-7xl px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-[#13161d] border border-[#1c212b] text-gray-400 hover:text-white hover:bg-[#1c212b] transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <LifeBuoy size={20} className="text-[#ffcc00]" />
              Central de Suporte
            </h1>
            <p className="text-xs text-gray-500">Atendimento prioritário 24/7</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna da Esquerda - FAQ e Busca */}
          <div className="lg:col-span-1 space-y-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar dúvida..."
                className="w-full bg-[#0d0f14] border border-[#1c212b] rounded-2xl pl-10 pr-4 py-3 text-sm text-white focus:border-[#ffcc00] focus:outline-none transition-all"
              />
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Perguntas Frequentes
              </h3>
              {filteredFaqs.length === 0 && (
                <p className="text-sm text-gray-500">Nenhuma dúvida encontrada.</p>
              )}
              {filteredFaqs.map((faq, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div
                    key={idx}
                    className={cn(
                      "border rounded-2xl overflow-hidden transition-all",
                      isOpen ? "border-[#ffcc00]/30 bg-[#13161d]" : "border-[#1c212b] bg-[#0d0f14]"
                    )}
                  >
                    <button
                      onClick={() => setActiveFaq(isOpen ? null : idx)}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <span className="text-sm font-semibold text-white pr-4">{faq.q}</span>
                      <span className="text-[#ffcc00] text-lg leading-none">{isOpen ? "−" : "+"}</span>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 text-xs text-gray-300 leading-relaxed border-t border-[#1c212b] pt-3">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna da Direita - Chat ao Vivo */}
          <div className="lg:col-span-2 flex flex-col h-[calc(100vh-180px)] min-h-[500px] bg-[#0d0f14] border border-[#1c212b] rounded-3xl overflow-hidden shadow-2xl">
            {/* Chat Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#1c212b] bg-[#13161d]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#ffcc00] to-[#e6b800] flex items-center justify-center text-black font-black text-xs">
                    AM
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 border-2 border-[#13161d]" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Amanda (Suporte)</div>
                  <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online agora
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <MessageSquare size={18} />
              </div>
            </div>

            {/* Mensagens */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#06070a]">
              {messages.map((msg, idx) => {
                const isAgent = msg.sender === "agent";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex flex-col max-w-[85%] space-y-1",
                      isAgent ? "self-start items-start" : "self-end items-end"
                    )}
                  >
                    <span className="text-[9px] text-gray-500 font-bold uppercase">
                      {isAgent ? "Amanda (Suporte)" : "Você"}
                    </span>
                    <div
                      className={cn(
                        "rounded-2xl p-3.5 text-xs leading-relaxed shadow-md",
                        isAgent
                          ? "bg-[#13161d] border border-[#1c212b] text-gray-200 rounded-tl-none"
                          : "bg-[#ffcc00] text-black font-medium rounded-tr-none"
                      )}
                    >
                      {msg.text}
                    </div>
                    <span className="text-[8px] text-gray-600 font-bold">{msg.time}</span>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex flex-col max-w-[85%] space-y-1 self-start">
                  <span className="text-[9px] text-gray-500 font-bold uppercase">Amanda está digitando</span>
                  <div className="bg-[#13161d] border border-[#1c212b] rounded-2xl rounded-tl-none p-3.5 flex items-center gap-1">
                    <Loader2 className="animate-spin text-[#ffcc00]" size={14} />
                    <span className="text-xs text-gray-400">Digitando resposta...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-[#1c212b] bg-[#13161d] flex gap-2">
              {user ? (
                <>
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSend()}
                    placeholder="Escreva sua mensagem..."
                    className="flex-1 bg-[#06070a] border border-[#1c212b] rounded-xl px-4 py-3 text-xs text-white focus:border-[#ffcc00] focus:outline-none"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim()}
                    className="bg-[#ffcc00] hover:bg-[#ffdb4d] disabled:opacity-50 text-black p-3 rounded-xl transition-all active:scale-95"
                  >
                    <Send size={16} />
                  </button>
                </>
              ) : (
                <div className="w-full text-center py-2">
                  <p className="text-xs text-gray-400 mb-2">Faça login para falar com o suporte.</p>
                  <button
                    onClick={() => navigate("/login")}
                    className="bg-[#ffcc00] text-black font-bold px-6 py-2 rounded-xl text-xs uppercase"
                  >
                    Fazer Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}