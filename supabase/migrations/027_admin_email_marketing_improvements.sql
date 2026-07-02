-- ============================================================
-- 027_admin_email_marketing_improvements.sql
-- Adiciona colunas para suportar central profissional de Email Marketing
-- Todas as alterações são ADDITIVE - não removem dados existentes
-- ============================================================

-- 1. Adicionar paid_at em pix_requests para rastrear data de pagamento
ALTER TABLE public.pix_requests ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 2. Melhorar email_campaigns com campos de marketing completos
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS preheader TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS cta_text TEXT DEFAULT 'ACESSAR AGORA';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS cta_url TEXT DEFAULT 'https://www.pixbeet.lat';
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS footer TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS audience_type TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_failed INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_conversions INTEGER DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_converted_amount NUMERIC(20,2) DEFAULT 0;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Melhorar email_campaign_recipients com status e rastreamento de conversão
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'test'));
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS converted BOOLEAN DEFAULT FALSE;
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS converted_at TIMESTAMPTZ;
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS converted_amount NUMERIC(20,2) DEFAULT 0;
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS pix_request_id UUID;

-- 4. Índices para performance de consultas de email marketing
CREATE INDEX IF NOT EXISTS idx_email_campaigns_sent_at ON public.email_campaigns(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_created_by ON public.email_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON public.email_campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_converted ON public.email_campaign_recipients(converted);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_pix_request ON public.email_campaign_recipients(pix_request_id);
