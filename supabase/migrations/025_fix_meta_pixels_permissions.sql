-- Migration 025: Fix meta_pixels permissions
-- O migration 023 revogou ALL de anon/authenticated, mas admins logados
-- usam o role authenticated (via anon key + JWT). Precisamos GRANT
-- para authenticated para que o RLS possa filtrar.

GRANT ALL ON public.meta_pixels TO authenticated;
