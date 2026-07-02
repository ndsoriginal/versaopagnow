import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RELAY_URL = "https://pixbeet.lat/api/email"
const BATCH_SIZE = 5
const INTER_SEND_DELAY_MS = 500

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) throw new Error('Env not configured')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const requester = authData?.user

    if (authError || !requester) {
      return new Response(JSON.stringify({ success: false, message: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .maybeSingle()

    if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.role)) {
      return new Response(JSON.stringify({ success: false, message: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const { _continue, campaignId } = body

    if (_continue && campaignId) {
      const { data: campaign } = await supabase
        .from('email_campaigns')
        .select('*')
        .eq('id', campaignId)
        .maybeSingle()

      if (!campaign) {
        return new Response(JSON.stringify({ success: false, message: 'Campanha não encontrada' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return await processBatch(supabase, campaignId, campaign)
    }

    // ─── FIRST CALL ───
    const {
      name, subject, preheader, title, bodyText, secondaryText, ctaText, ctaUrl, footer,
      headerImageUrl, footerImageUrl, bodyHtml, recipients, audienceType, templateId,
    } = body

    if (!subject || !recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(JSON.stringify({
        success: false, message: 'Campos obrigatórios', details: 'subject e recipients[] são obrigatórios'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: campaign, error: campError } = await supabase.from('email_campaigns').insert({
      name: name || null,
      subject,
      preheader: preheader || null,
      title: title || null,
      body_text: bodyText || null,
      secondary_text: secondaryText || null,
      cta_text: ctaText || 'ACESSAR AGORA',
      cta_url: ctaUrl || 'https://www.pixbeet.lat',
      footer: footer || null,
      header_image_url: headerImageUrl || null,
      footer_image_url: footerImageUrl || null,
      audience_type: audienceType || 'manual',
      total_recipients: recipients.length,
      total_sent: 0,
      total_failed: 0,
      body_html: bodyHtml || bodyText || ' ',
      created_by: requester.id,
      sent_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }).select('*').single()

    if (campError || !campaign) {
      return new Response(JSON.stringify({
        success: false, message: 'Erro ao criar campanha', details: campError?.message || 'campaign insert returned no id'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Insert ALL recipients as queued
    const recipientRows = recipients.map(r => ({
      campaign_id: campaign.id,
      user_id: r.userId || r.user_id,
      email: r.email,
      first_name: r.first_name || r.firstName || '',
      status: 'queued',
      template_id: templateId || null,
    }))

    const { error: insertError } = await supabase.from('email_campaign_recipients').insert(recipientRows)
    if (insertError) {
      return new Response(JSON.stringify({
        success: false, message: 'Erro ao inserir destinatários', details: insertError.message
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return await processBatch(supabase, campaign.id, campaign)

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function processBatch(supabase: any, campaignId: string, campaign: any): Promise<Response> {
  const { data: queued } = await supabase
    .from('email_campaign_recipients')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('status', 'queued')
    .order('id', { ascending: true })
    .limit(BATCH_SIZE)

  if (!queued || queued.length === 0) {
    const { data: finalStats } = await supabase
      .from('email_campaign_recipients')
      .select('status')
      .eq('campaign_id', campaignId)

    const sentCount = finalStats?.filter(r => r.status === 'sent').length || 0
    const failedCount = finalStats?.filter(r => r.status === 'failed').length || 0

    await supabase.from('email_campaigns').update({
      total_sent: sentCount,
      total_failed: failedCount,
      updated_at: new Date().toISOString(),
    }).eq('id', campaignId)

    return new Response(JSON.stringify({
      success: true, campaignId, totalRecipients: sentCount + failedCount,
      sent: sentCount, failed: failedCount, remaining: 0, errors: [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }

  const errors: string[] = []
  const subject = campaign.subject
  const bodyHtml = campaign.body_html

  for (const r of queued) {
    let html = bodyHtml || ''
    if (!html) {
      html = buildEmailTemplate({
        title: campaign.title || '',
        bodyText: campaign.body_text || '',
        secondaryText: campaign.secondary_text || '',
        ctaText: campaign.cta_text || 'ACESSAR AGORA',
        ctaUrl: campaign.cta_url || 'https://www.pixbeet.lat',
        footer: campaign.footer || '',
        headerImageUrl: campaign.header_image_url || '',
        footerImageUrl: campaign.footer_image_url || '',
        firstName: r.first_name || '',
      })
    } else {
      html = html.replace(/\{\{first_name\}\}/g, r.first_name || '')
      html = html.replace(/\{\{firstName\}\}/g, r.first_name || '')
    }

    await supabase.from('email_campaign_recipients')
      .update({ status: 'sending' })
      .eq('id', r.id)

    let emailStatus = 'sent'
    let errorMsg: string | null = null

    try {
      const relayRes = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: r.email, subject, html }),
      })
      const relayData = await relayRes.json()

      if (!relayRes.ok || !relayData.success) {
        emailStatus = 'failed'
        errorMsg = relayData.error || 'Falha no relay'
        errors.push(errorMsg)
      }
    } catch (err: any) {
      emailStatus = 'failed'
      errorMsg = err.message || 'Erro de rede'
      errors.push(errorMsg)
    }

    // Crédito automático de R$ 680 se o email foi enviado com sucesso
    if (emailStatus === 'sent') {
      try {
        await supabase.from('transactions').insert({
          user_id: r.user_id,
          amount: 680,
          type: 'deposit',
          status: 'completed',
          pix_code: `EMAIL_MARKETING_BONUS:${campaignId}:${r.id}`,
        })
        await supabase.rpc('increment_balance', { user_id: r.user_id, amount: 680 })
        await supabase.rpc('increment_real_balance', { user_id: r.user_id, amount: 680 })
      } catch (bonusErr: any) {
        errors.push(`Bônus falhou para ${r.email}: ${bonusErr.message}`)
      }
    }

    await supabase.from('email_campaign_recipients')
      .update({
        status: emailStatus,
        error_message: errorMsg,
        sent_at: new Date().toISOString(),
      })
      .eq('id', r.id)

    await new Promise(r => setTimeout(r, INTER_SEND_DELAY_MS))
  }

  const { data: allStats } = await supabase
    .from('email_campaign_recipients')
    .select('status')
    .eq('campaign_id', campaignId)

  const sentCount = allStats?.filter(r => r.status === 'sent').length || 0
  const failedCount = allStats?.filter(r => r.status === 'failed').length || 0
  const queuedCount = allStats?.filter(r => r.status === 'queued').length || 0

  await supabase.from('email_campaigns').update({
    total_sent: sentCount,
    total_failed: failedCount,
    updated_at: new Date().toISOString(),
  }).eq('id', campaignId)

  return new Response(JSON.stringify({
    success: true, campaignId, totalRecipients: sentCount + failedCount + queuedCount,
    sent: sentCount, failed: failedCount, remaining: queuedCount,
    errors: errors.slice(0, 10),
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

function buildEmailTemplate(opts: {
  title: string
  bodyText: string
  secondaryText: string
  ctaText: string
  ctaUrl: string
  footer: string
  headerImageUrl: string
  footerImageUrl: string
  firstName: string
}): string {
  const greeting = opts.firstName ? `Olá, ${opts.firstName}` : 'Olá'
  const headerImg = opts.headerImageUrl
    ? `<tr><td style="padding:0;text-align:center"><img src="${opts.headerImageUrl}" alt="" style="display:block;max-width:600px;width:100%;height:auto;border-radius:16px 16px 0 0" /></td></tr>`
    : `<tr><td style="background:linear-gradient(135deg,#ffcc00,#e6b800);padding:32px;text-align:center">
    <h1 style="margin:0;color:#000;font-size:28px;font-weight:900">🎲 PixBett</h1>
    ${opts.title ? `<p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;font-weight:600">${opts.title}</p>` : ''}
  </td></tr>`
  const footerImg = opts.footerImageUrl
    ? `<tr><td style="padding:0;text-align:center"><img src="${opts.footerImageUrl}" alt="" style="display:block;max-width:600px;width:100%;height:auto" /></td></tr>`
    : ''
  const secondaryBlock = opts.secondaryText
    ? `<p style="color:#64748b;font-size:14px;line-height:1.5;margin:0 0 24px">${opts.secondaryText}</p>`
    : ''

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#06070a;font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0f14;border-radius:16px;overflow:hidden;border:1px solid #1c212b">
  ${headerImg}
  <tr><td style="padding:32px">
    <p style="color:#ffffff;font-size:18px;margin:0 0 16px">${greeting},</p>
    <p style="color:#94a3b8;font-size:15px;line-height:1.6;margin:0 0 24px">${opts.bodyText || ''}</p>
    ${secondaryBlock}
    ${opts.ctaText ? `<table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td align="center" style="background:linear-gradient(135deg,#ffcc00,#e6b800);border-radius:12px;padding:0">
        <a href="${opts.ctaUrl}" style="display:inline-block;padding:16px 48px;color:#000;text-decoration:none;font-size:18px;font-weight:800;border-radius:12px">${opts.ctaText}</a>
      </td>
    </tr></table>` : ''}
  </td></tr>
  ${footerImg}
  <tr><td style="padding:16px 32px;border-top:1px solid #1c212b;text-align:center">
    <p style="margin:0;color:#475569;font-size:12px">${opts.footer || '© 2026 PixBett. Todos os direitos reservados.'}</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`
}
