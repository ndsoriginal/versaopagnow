import { supabase } from "@/integrations/supabase/client";

export type PixResponse = {
  id: string;
  pixCopyPaste: string;
  pixQrCode?: string;
  status?: string;
  isFee?: boolean;
};

export const gatewayCreatePix = async (
  amount: number,
  customerDocument?: string,
  type?: string,
  withdrawRequestId?: string
): Promise<PixResponse> => {
  const { data, error } = await supabase.functions.invoke("gateway-pix", {
    body: { amount, customerDocument, type, withdrawRequestId }
  });

  if (error) {
    console.error("[services/gateway] Erro ao invocar função:", error);
    throw error;
  }

  return data;
};
