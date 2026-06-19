import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Cabeçalho de autorização ausente")

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { amount, customerDocument, type: pixType, withdrawRequestId } = await req.json()
    let doc = customerDocument?.replace(/\D/g, "") || ""
    const targetAmount = Number(amount)
    const isFee = pixType === 'withdraw_fee'

    if (!doc || doc.length !== 11) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('cpf')
        .eq('id', user.id)
        .maybeSingle()

      if (profileData?.cpf && profileData.cpf.length === 11) {
        doc = profileData.cpf
      }
    }

    if (!doc || doc.length !== 11) {
      return new Response(JSON.stringify({ error: "CPF inválido ou não informado." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('cpf')
      .eq('id', user.id)
      .maybeSingle()

    if (!profileData?.cpf || profileData.cpf !== doc) {
      await supabase.from('profiles').update({ cpf: doc }).eq('id', user.id)
    }

    const { data: existing } = await supabase
      .from('pix_requests')
      .select('*')
      .eq('user_id', user.id)
      .eq('amount', targetAmount)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      console.log(`[gateway-pix] Reusando cobrança existente: ${existing.transaction_id} para R$ ${targetAmount}`)
      return new Response(JSON.stringify({
        fromCache: true,
        id: existing.transaction_id,
        pixCopyPaste: existing.pix_code,
        pixQrCode: existing.qr_code,
        amount: targetAmount,
        created_at: existing.created_at
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    // Ler gateway ativo
    const { data: gateways } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    const activeGateway = gateways?.[0]

    if (!activeGateway) {
      return new Response(JSON.stringify({ error: "Nenhum gateway de pagamento ativo. Configure em Admin > Gateways." }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const config = typeof activeGateway.config === 'string' ? JSON.parse(activeGateway.config) : activeGateway.config
    const now = new Date().toISOString()
    let responseData: Record<string, any> = {}

    if (activeGateway.slug === 'pagnow') {
      // PagNow
      const apiKey = config.api_key || Deno.env.get("PAGNOW_API_KEY")
      const webhookUrl = config.webhook_url || Deno.env.get("PAGNOW_WEBHOOK_URL") || ""

      if (!apiKey) {
        return new Response(JSON.stringify({ error: "PagNow: API key não configurada" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const minAmount = isFee ? 0 : 500
      const amountInCents = Math.max(Math.round(targetAmount * 100), minAmount)
      const idempotencyKey = `${isFee ? 'FEE' : 'DEP'}-${user.id.slice(0, 8)}-${Date.now()}`
      const pagnowPayload = {
        amount: amountInCents,
        currency: "BRL",
        paymentMethods: ["PIX"],
        idempotencyKey,
        customerName: profile?.first_name || user.email?.split('@')[0] || "Cliente",
        customerDocument: doc,
        customerEmail: user.email,
        metadata: {
          userId: user.id,
          type: pixType || 'deposit',
          ...(withdrawRequestId ? { withdrawRequestId } : {}),
        },
        ...(webhookUrl ? { webhookUrl } : {})
      }

      console.log("[gateway-pix] Enviando para PagNow:", JSON.stringify(pagnowPayload))

      const pagnowResp = await fetch("https://v2.pagnow.com/v1/payments", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify(pagnowPayload),
      })

      const pagnowText = await pagnowResp.text()

      if (!pagnowResp.ok) {
        console.error("[gateway-pix] Erro PagNow:", pagnowResp.status, pagnowText)
        return new Response(JSON.stringify({
          error: "PagNow recusou a requisição",
          status: pagnowResp.status,
          details: pagnowText
        }), {
          status: pagnowResp.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const pagnowData = JSON.parse(pagnowText)
      responseData = {
        id: pagnowData.transactionId || pagnowData.id,
        pixCopyPaste: pagnowData.pixCopyPaste || "",
        pixQrCode: pagnowData.pixQrCode || "",
      }

    } else if (activeGateway.slug === 'pagoupay') {
      // PagouPay
      const pk = config.public_key || ""
      const sk = config.secret_key || ""

      if (!pk || !sk) {
        return new Response(JSON.stringify({ error: "PagouPay: chaves não configuradas" }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const amountInCents = Math.max(Math.round(targetAmount * 100), 1)
      const idempotencyKey = crypto.randomUUID()

      const pagoupayPayload = {
        amountCents: amountInCents,
        customer: {
          name: profile?.first_name || user.email?.split('@')[0] || "Cliente",
          document: doc,
        },
        idempotencyKey,
      }

      console.log("[gateway-pix] Enviando para PagouPay:", JSON.stringify(pagoupayPayload))

      const pagoupayResp = await fetch("https://pagoupay.com/api/v1/pix/create", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${pk}:${sk}`,
        },
        body: JSON.stringify(pagoupayPayload),
      })

      const pagoupayText = await pagoupayResp.text()

      if (!pagoupayResp.ok) {
        console.error("[gateway-pix] Erro PagouPay:", pagoupayResp.status, pagoupayText)
        return new Response(JSON.stringify({
          error: "PagouPay recusou a requisição",
          status: pagoupayResp.status,
          details: pagoupayText
        }), {
          status: pagoupayResp.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      const pagoupayData = JSON.parse(pagoupayText)
      const pd = pagoupayData.data || pagoupayData
      const chargeId = pd.id || pd.chargeId || pd.transactionId || idempotencyKey
      responseData = {
        id: chargeId,
        pixCopyPaste: pd.pixCopyPaste || pd.copyPaste || pd.pixCode || pd.qrCode || "",
        pixQrCode: pd.qrCodeImage || pd.qrCodeUrl || pd.qrCode || "",
      }

    } else {
      return new Response(JSON.stringify({ error: `Gateway "${activeGateway.slug}" não suportado` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Salvar na tabela transactions
    const gatewaySlug = activeGateway.slug
    const { error: txError } = await supabase.from("transactions").insert({
      id: responseData.id,
      user_id: user.id,
      amount: targetAmount,
      type: isFee ? "withdraw_fee" : "deposit",
      status: "pending",
      pix_code: responseData.pixCopyPaste || "",
      gateway: gatewaySlug,
      created_at: now
    })

    if (txError) console.error("[gateway-pix] Erro ao salvar em transactions:", txError)

    // Salvar na tabela pix_requests
    const { error: prError } = await supabase.from("pix_requests").insert({
      user_id: user.id,
      cpf: doc,
      amount: targetAmount,
      transaction_id: responseData.id,
      qr_code: responseData.pixQrCode || "",
      pix_code: responseData.pixCopyPaste || "",
      status: "pending",
      gateway: gatewaySlug,
      created_at: now,
      updated_at: now
    })

    if (prError) console.error("[gateway-pix] Erro ao salvar em pix_requests:", prError)

    if (isFee) {
      const { error: wrError } = await supabase.from("withdraw_requests").insert({
        user_id: user.id,
        amount: withdrawRequestId ? 0 : targetAmount,
        status: "pending_payment",
        fee_transaction_id: responseData.id,
        created_at: now,
        updated_at: now
      })
      if (wrError) console.error("[gateway-pix] Erro ao salvar em withdraw_requests:", wrError)
    }

    return new Response(JSON.stringify({
      fromCache: false,
      ...responseData,
      amount: targetAmount,
      gateway: gatewaySlug,
      created_at: now,
      isFee
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("[gateway-pix] Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
