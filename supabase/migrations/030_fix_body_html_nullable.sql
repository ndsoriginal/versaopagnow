-- ============================================================
-- 030_fix_body_html_nullable.sql
-- body_html NOT NULL quebra o insert quando o template builder
-- não gera HTML (fallback para o send-marketing-email montar)
-- ============================================================

ALTER TABLE public.email_campaigns ALTER COLUMN body_html DROP NOT NULL;
