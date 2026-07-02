-- ============================================================
-- 028_email_template.sql
-- Tabela singleton para persistir o rascunho do editor de email
-- ============================================================

CREATE TABLE IF NOT EXISTS email_template (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT DEFAULT '',
    subject TEXT DEFAULT 'Oferta especial PixBett',
    preheader TEXT DEFAULT '',
    title TEXT DEFAULT 'VOCÊ TEM UMA OFERTA ESPECIAL',
    body_text TEXT DEFAULT 'A PixBett preparou uma oferta imperdível para você. Acesse agora e aproveite.',
    cta_text TEXT DEFAULT 'ACESSAR AGORA',
    cta_url TEXT DEFAULT 'https://www.pixbeet.lat',
    footer TEXT DEFAULT '© 2026 PixBett. Todos os direitos reservados.',
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garantir que existe ao menos uma row (singleton)
INSERT INTO email_template (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

ALTER TABLE email_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins all email_template" ON email_template
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' IN ('admin', 'superadmin'))
    WITH CHECK (auth.jwt() ->> 'role' IN ('admin', 'superadmin'));
