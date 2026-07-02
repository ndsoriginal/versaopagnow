-- ============================================================
-- 029_fix_email_marketing_send_and_templates.sql
-- Aditivo: adiciona colunas faltantes e cria email_templates
-- ============================================================

-- 1. Coluna total_recipients (causa o erro 500 no send-marketing-email)
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS total_recipients INTEGER DEFAULT 0;

-- 2. Colunas de imagem para header/footer nas campanhas
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS header_image_url TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
ALTER TABLE public.email_campaigns ADD COLUMN IF NOT EXISTS secondary_text TEXT;

-- 3. template_id nos recipients para rastreamento
ALTER TABLE public.email_campaign_recipients ADD COLUMN IF NOT EXISTS template_id UUID;

-- 4. Tabela email_templates (plural) — sistema multi-modelo
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name TEXT NOT NULL,
    campaign_name TEXT DEFAULT '',
    subject TEXT DEFAULT 'Oferta especial PixBett',
    preheader TEXT DEFAULT '',
    header_image_url TEXT DEFAULT '',
    title TEXT DEFAULT 'VOCÊ TEM UMA OFERTA ESPECIAL',
    body_text TEXT DEFAULT '',
    secondary_text TEXT DEFAULT '',
    cta_text TEXT DEFAULT 'ACESSAR AGORA',
    cta_url TEXT DEFAULT 'https://www.pixbeet.lat',
    footer_text TEXT DEFAULT '© 2026 PixBett. Todos os direitos reservados.',
    footer_image_url TEXT DEFAULT '',
    body_html TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Profile-based RLS (confiável, não auth.jwt()->>'role')
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins all email_templates" ON public.email_templates;
CREATE POLICY "admins all email_templates" ON public.email_templates
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'superadmin')));

DROP POLICY IF EXISTS "service_role all email_templates" ON public.email_templates;
CREATE POLICY "service_role all email_templates" ON public.email_templates
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- 6. Índices
DROP INDEX IF EXISTS idx_email_templates_default;
CREATE INDEX IF NOT EXISTS idx_email_templates_default ON public.email_templates(is_default) WHERE is_default = true;
DROP INDEX IF EXISTS idx_email_templates_created_by;
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON public.email_templates(created_by);
DROP INDEX IF EXISTS idx_campaign_recipients_template;
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_template ON public.email_campaign_recipients(template_id);
