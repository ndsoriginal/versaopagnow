import { supabase } from "@/integrations/supabase/client";

export type PixResponse = {
  id: string;
  pixCopyPaste: string;
  pixQrCode?: string;
  status?: string;
  isFee?: boolean;
};

export const createPix = async (
  amount: number,
  customerDocument?: string,
  type?: string,
  withdrawRequestId?: string
): Promise<PixResponse> => {
  console.log("[services/pagnow] Solicitando geração de PIX via Edge Function");

  const { data, error } = await supabase.functions.invoke("create-pix", {
    body: { amount, customerDocument, type, withdrawRequestId }
  });

  if (error) {
    console.error("[services/pagnow] Erro ao invocar função:", error);
    throw error;
  }

  return data;
};
