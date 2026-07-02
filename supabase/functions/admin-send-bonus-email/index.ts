import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RELAY_URL = "https://pixbeet.lat/api/email"
const VERSION = 'v16'

const BRAND = {
  gold: '#ffcc00',
  goldDark: '#e6b800',
  bg: '#0d0f14',
  pageBg: '#06070a',
  surface: '#1a1f2e',
  border: '#1c212b',
  text: '#ffffff',
  muted: '#94a3b8',
  dim: '#475569',
}

function emailHtml(amountFmt: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:${BRAND.pageBg};font-family:'Segoe UI',Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:${BRAND.bg};border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border}">
  <tr><td style="background:linear-gradient(135deg,${BRAND.gold},${BRAND.goldDark});padding:32px;text-align:center">
    <h1 style="margin:0;color:#000;font-size:28px;font-weight:900">🎲 PixBett</h1>
    <p style="margin:8px 0 0;color:#1a1a1a;font-size:14px;font-weight:600">VOCÊ GANHOU UM BÔNUS</p>
  </td></tr>
  <tr><td style="padding:32px">
    <h2 style="color:${BRAND.text};font-size:22px;margin:0 0 8px">Olá! 👋</h2>
    <div style="background:linear-gradient(135deg,#1a1f2e,#0d0f14);border-radius:16px;padding:32px;text-align:center;margin:0 0 24px;border:2px solid ${BRAND.gold};box-shadow:0 0 30px rgba(255,204,0,0.15)">
      <p style="margin:0;color:${BRAND.gold};font-size:14px;letter-spacing:2px;font-weight:700">💎 VOCÊ POSSUI</p>
      <p style="margin:12px 0;color:${BRAND.gold};font-size:48px;font-weight:900;text-shadow:0 0 20px rgba(255,204,0,0.3)">R$ ${amountFmt}</p>
      <p style="margin:0;color:${BRAND.muted};font-size:13px">Jogue agora ou saque 🎯</p>
    </div>
    <p style="color:${BRAND.muted};font-size:15px;line-height:1.6;margin:0 0 24px">
      A PixBett agradece sua confiança! 🚀
    </p>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto"><tr>
      <td align="center" style="background:linear-gradient(135deg,${BRAND.gold},${BRAND.goldDark});border-radius:12px;padding:0;box-shadow:0 4px 15px rgba(255,204,0,0.3)">
        <a href="https://pixbeet.lat" style="display:inline-block;padding:16px 48px;color:#000;text-decoration:none;font-size:18px;font-weight:800;border-radius:12px">🎲 ACESSAR MINHA CONTA</a>
      </td>
    </tr></table>
  </td></tr>
  <tr><td style="padding:16px 32px;border-top:1px solid ${BRAND.border};text-align:center">
    <p style="margin:0;color:${BRAND.dim};font-size:12px">© 2024 PixBett. Todos os direitos reservados.</p>
  </td></tr>
</table>
</td></tr></table>
</body>
</html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) throw new Error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const requester = authData?.user

    if (authError || !requester) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .maybeSingle()

    if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.role)) {
      return new Response(JSON.stringify({ error: 'Não autorizado', _version: VERSION }), { status: 403, headers: corsHeaders })
    }

    const { targetUserId, amount: rawAmount } = await req.json()
    const amount = Number(rawAmount)

    if (!targetUserId || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Dados inválidos. Forneça targetUserId, amount > 0' }), { status: 400, headers: corsHeaders })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', targetUserId)
      .maybeSingle()

    if (userError || !userData) {
      return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404, headers: corsHeaders })
    }

    const userEmail = userData.email

    const { data: profile } = await supabase
      .from('profiles')
      .select('real_balance')
      .eq('id', targetUserId)
      .maybeSingle()

    const currentBalance = Number(profile?.real_balance || 0)

    const txId = crypto.randomUUID()
    const pixCode = `ADMIN_BONUS_EMAIL: R$ ${amount} (por ${requester.email})`

    const { error: txError } = await supabase.from('transactions').insert({
      id: txId,
      user_id: targetUserId,
      amount,
      type: 'deposit',
      status: 'completed',
      pix_code: pixCode,
      created_at: new Date().toISOString(),
    })

    if (txError) {
      return new Response(JSON.stringify({ error: 'Erro ao registrar transação' }), { status: 500, headers: corsHeaders })
    }

    const { error: updateProfileError } = await supabase.rpc('increment_real_balance', {
      user_id: targetUserId,
      amount,
    })

    if (updateProfileError) {
      return new Response(JSON.stringify({ error: 'Erro ao atualizar real_balance' }), { status: 500, headers: corsHeaders })
    }

    const { error: updateUserError } = await supabase.rpc('increment_balance', {
      user_id: targetUserId,
      amount,
    })

    if (updateUserError) {
      console.error('[admin-send-bonus-email] Erro ao incrementar balance:', updateUserError)
    }

    const amountFmt = amount.toFixed(2)
    const subject = `💎 R$ ${amountFmt} disponível na sua conta PixBett!`
    const html = emailHtml(amountFmt)

    let emailError: string | null = null
    try {
      const relayRes = await fetch(RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: userEmail, subject, html }),
      })
      const relayData = await relayRes.json()
      if (!relayRes.ok || !relayData.success) {
        emailError = relayData.error || "Falha no relay de email"
      }
    } catch (err: any) {
      console.error('[admin-send-bonus-email] Erro ao enviar email:', err)
      emailError = err.message
    }

    return new Response(JSON.stringify({
      _version: VERSION,
      success: true,
      amount,
      previousBalance: currentBalance,
      newBalance: currentBalance + amount,
      emailSent: !emailError,
      emailError,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, _version: VERSION }), { status: 500, headers: corsHeaders })
  }
})
