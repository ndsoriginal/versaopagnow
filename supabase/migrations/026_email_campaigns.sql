CREATE TABLE IF NOT EXISTS email_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject TEXT NOT NULL,
    body_html TEXT NOT NULL,
    total_sent INTEGER DEFAULT 0,
    total_deposited INTEGER DEFAULT 0,
    total_value DECIMAL(20,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES email_campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    deposited BOOLEAN DEFAULT FALSE,
    deposit_amount DECIMAL(20,2) DEFAULT 0,
    deposit_date TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_user ON email_campaign_recipients(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_deposited ON email_campaign_recipients(deposited);

ALTER TABLE email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_campaign_recipients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role all campaigns" ON email_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role all recipients" ON email_campaign_recipients FOR ALL TO service_role USING (true) WITH CHECK (true);
