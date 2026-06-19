"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/context/SessionContext";

type FloatingChatButtonProps = {
  onToggleChat: () => void;
};

const FloatingChatButton: React.FC<FloatingChatButtonProps> = ({ onToggleChat }) => {
  const [count, setCount] = useState<number>(0);
  const { user } = useSession();
  const viewerId = user?.id || (typeof window !== "undefined" ? (localStorage.getItem("chat_viewer_id") ?? "") : "");

  useEffect(() => {
    const key = `chat_count_${viewerId}`;
    const stored = viewerId ? localStorage.getItem(key) : null;
    
    if (stored) {
      setCount(Number(stored));
    } else {
      // Começa com um número aleatório entre 15 e 45
      const randomStart = Math.floor(Math.random() * (45 - 15 + 1)) + 15;
      setCount(randomStart);
      if (viewerId) {
        localStorage.setItem(key, randomStart.toString());
      } else {
        localStorage.setItem("chat_count_guest", randomStart.toString());
      }
    }

    const handler = (e: Event) => {
      const ce = e as CustomEvent;
      const newCount = Number(ce?.detail?.count ?? (viewerId ? localStorage.getItem(`chat_count_${viewerId}`) : localStorage.getItem("chat_count_guest")) ?? 0);
      setCount(Math.min(Math.max(newCount, 15), 359));
    };

    window.addEventListener("chat:count", handler as EventListener);
    return () => window.removeEventListener("chat:count", handler as EventListener);
  }, [viewerId]);

  return (
    <button
      onClick={onToggleChat}
      className={cn(
        "fixed right-4 bottom-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#ffcc00] shadow-xl text-black transition-all duration-300 hover:scale-110",
        count > 0 && "animate-bounce-once"
      )}
      aria-label="Abrir Chat Global"
    >
      <MessageSquare size={24} />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
          {count > 359 ? "359+" : count}
        </span>
      )}
    </button>
  );
};

export default FloatingChatButton;