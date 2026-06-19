CREATE TABLE IF NOT EXISTS public.withdraw_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  pix_key TEXT,
  pix_key_type TEXT DEFAULT 'cpf',
  status TEXT NOT NULL DEFAULT 'pending_payment',
  fee_transaction_id UUID,
  admin_id UUID,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_withdraw_requests_user ON public.withdraw_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_status ON public.withdraw_requests(status);
CREATE INDEX IF NOT EXISTS idx_withdraw_requests_fee_tx ON public.withdraw_requests(fee_transaction_id);

ALTER TABLE public.withdraw_requests DISABLE ROW LEVEL SECURITY;

ALTER PUBLICATION supabase_realtime ADD TABLE public.withdraw_requests;
