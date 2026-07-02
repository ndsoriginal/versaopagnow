ALTER TABLE public.email_campaign_recipients
  DROP CONSTRAINT IF EXISTS email_campaign_recipients_status_check;

UPDATE public.email_campaign_recipients
  SET status = 'sent'
  WHERE status NOT IN ('sent', 'failed', 'test', 'queued', 'sending');

ALTER TABLE public.email_campaign_recipients
  ADD CONSTRAINT email_campaign_recipients_status_check
  CHECK (status IN ('sent', 'failed', 'test', 'queued', 'sending'));

ALTER TABLE public.email_campaign_recipients
  ALTER COLUMN status SET DEFAULT 'queued';
