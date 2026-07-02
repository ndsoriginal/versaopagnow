import { supabase } from "@/integrations/supabase/client";

export type PixResponse = {
  id: string;
  pixCopyPaste: string;
  pixQrCode?: string;
  qrCode?: string;
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
    const errData = (error as any)?.context?.data
    console.error("[services/gateway] gateway-pix erro:", { message: error.message, data: errData, full: error });
    throw error;
  }

  return data;
};
