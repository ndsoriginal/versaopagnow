-- ============================================================
-- MIGRAÇÃO 016: Ads Dashboard — Dados de anúncios (Meta Ads)
-- Dados inseridos via n8n → Supabase (Google Sheets sync)
-- ============================================================

-- 1. TABELA ads_daily_metrics — dados brutos diários por anúncio
CREATE TABLE IF NOT EXISTS public.ads_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  campaign_name TEXT NOT NULL,
  adset_name TEXT NOT NULL,
  ad_name TEXT NOT NULL,
  investment NUMERIC NOT NULL DEFAULT 0,
  impressions INT NOT NULL DEFAULT 0,
  clicks INT NOT NULL DEFAULT 0,
  reach INT NOT NULL DEFAULT 0,
  leads INT NOT NULL DEFAULT 0,
  purchases INT NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  roas NUMERIC DEFAULT 0,
  cpc NUMERIC DEFAULT 0,
  cpl NUMERIC DEFAULT 0,
  cost_per_purchase NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_date ON public.ads_daily_metrics(date DESC);
CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_campaign ON public.ads_daily_metrics(campaign_name);
CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_adset ON public.ads_daily_metrics(adset_name);
CREATE INDEX IF NOT EXISTS idx_ads_daily_metrics_ad ON public.ads_daily_metrics(ad_name);

ALTER TABLE public.ads_daily_metrics DISABLE ROW LEVEL SECURITY;

-- 2. VIEW ads_daily_summary — agregado total (para cards do dashboard)
CREATE OR REPLACE VIEW public.ads_daily_summary AS
SELECT
  COALESCE(SUM(investment), 0) AS total_investment,
  COALESCE(SUM(clicks), 0) AS total_clicks,
  COALESCE(SUM(impressions), 0) AS total_impressions,
  COALESCE(SUM(reach), 0) AS total_reach,
  COALESCE(SUM(leads), 0) AS total_leads,
  COALESCE(SUM(purchases), 0) AS total_purchases,
  COALESCE(SUM(revenue), 0) AS total_revenue,
  CASE WHEN SUM(investment) > 0 THEN ROUND(SUM(revenue) / SUM(investment), 2) ELSE 0 END AS roas,
  CASE WHEN SUM(clicks) > 0 THEN ROUND(SUM(investment) / SUM(clicks), 2) ELSE 0 END AS cpc,
  CASE WHEN SUM(leads) > 0 THEN ROUND(SUM(investment) / SUM(leads), 2) ELSE 0 END AS cpl,
  CASE WHEN SUM(purchases) > 0 THEN ROUND(SUM(investment) / SUM(purchases), 2) ELSE 0 END AS cost_per_purchase
FROM public.ads_daily_metrics;

-- Permissão: qualquer um pode ler a view (já que RLS está desabilitado na tabela)
GRANT SELECT ON public.ads_daily_summary TO anon, authenticated, service_role;
GRANT SELECT ON public.ads_daily_metrics TO anon, authenticated, service_role;
