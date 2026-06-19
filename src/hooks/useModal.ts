import { useEffect } from "react";

/**
 * Hook para gerenciar comportamento de modais
 * Trava o scroll do body quando o modal está aberto
 */
export const useModal = (isOpen: boolean) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.body.classList.add("modal-open");
    } else {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    }
    
    // Limpeza ao desmontar
    return () => {
      document.body.style.overflow = "";
      document.body.classList.remove("modal-open");
    };
  }, [isOpen]);
};
