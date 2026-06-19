-- MIGRAÇÃO 022: Adiciona coluna gateway nas tabelas de transação

ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT '';

ALTER TABLE public.pix_requests ADD COLUMN IF NOT EXISTS gateway TEXT DEFAULT '';
