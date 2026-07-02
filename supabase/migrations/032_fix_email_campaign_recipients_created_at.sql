alter table public.email_campaign_recipients
add column if not exists created_at timestamptz default now();

alter table public.email_campaign_recipients
add column if not exists updated_at timestamptz default now();

notify pgrst, 'reload schema';
