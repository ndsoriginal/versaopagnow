-- Habilita Realtime para pix_requests (necessário para o frontend detectar pagamento em tempo real)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = 'pix_requests'
    AND schemaname = 'public'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.pix_requests;
  END IF;
END
$$;
