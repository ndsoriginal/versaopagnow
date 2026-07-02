import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifySignature(rawBody: string, headerSig: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody))
  const expected = "sha256=" + Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return headerSig === expected
}

async function sendMetaPurchase(amount: number, email: string, supabase: any) {
  try {
    const encoder = new TextEncoder()
    const emailHash = Array.from(new Uint8Array(
      await crypto.subtle.digest('SHA-256', encoder.encode(email.trim().toLowerCase()))
    )).map(b => b.toString(16).padStart(2, '0')).join('')

    const payload = {
      data: [{
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        user_data: { em: [emailHash] },
        custom_data: { value: amount, currency: "BRL" },
      }],
    }

    const { data: pixels } = await supabase
      .from("meta_pixels")
      .select("pixel_id, api_token")
      .eq("is_active", true)

    if (pixels && pixels.length > 0) {
      for (const p of pixels) {
        const token = p.api_token || Deno.env.get("META_TOKEN") || ""
        if (!token) continue
        await fetch(
          `https://graph.facebook.com/v17.0/${p.pixel_id}/events?access_token=${token}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
        )
      }
    } else {
      const legacyToken = Deno.env.get("META_TOKEN")
      const legacyPixel = Deno.env.get("META_PIXEL_ID") || "1569633754739174"
      if (legacyToken) {
        await fetch(
          `https://graph.facebook.com/v17.0/${legacyPixel}/events?access_token=${legacyToken}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
        )
      }
    }
  } catch (e) {
    console.error("[pagnow-webhook] Erro ao enviar Purchase Meta:", e)
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-pagnow-signature') || ''
    const eventType = req.headers.get('x-pagnow-event-type') || ''
    const deliveryId = req.headers.get('x-pagnow-delivery-id') || ''

    console.log(`[pagnow-webhook] Recebido evento: ${eventType}, delivery: ${deliveryId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let webhookSecret = Deno.env.get("PAGNOW_WEBHOOK_SECRET")
    if (!webhookSecret) {
      try {
        const { data: gateways } = await supabase
          .from('payment_gateways')
          .select('config')
          .eq('slug', 'pagnow')
          .limit(1)
        if (gateways?.length) {
          const cfg = typeof gateways[0].config === 'string'
            ? JSON.parse(gateways[0].config)
            : gateways[0].config
          webhookSecret = cfg.webhook_secret
        }
      } catch {
        // fallback to env var only
      }
    }

    if (webhookSecret) {
      const valid = await verifySignature(rawBody, signature, webhookSecret)
      if (!valid) {
        console.error(`[pagnow-webhook] Assinatura inválida`)
        return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.log(`[pagnow-webhook] Assinatura verificada com sucesso`)
    } else {
      console.warn(`[pagnow-webhook] PAGNOW_WEBHOOK_SECRET não configurado — pulando verificação`)
    }

    const payload = JSON.parse(rawBody)
    const { event, data } = payload

    if (!event || (!data?.transactionId && !data?.id)) {
      return new Response(JSON.stringify({ error: "Payload inválido" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (event !== 'payment.completed') {
      console.log(`[pagnow-webhook] Evento ignorado (não é payment.completed): ${event}`)
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const transactionId = data.transactionId || data.id

    console.log(`[pagnow-webhook] Processando pagamento completado: ${transactionId}, delivery: ${deliveryId}`)

    // Delivery dedup: claim delivery atomically
    if (deliveryId) {
      const { data: claimed } = await supabase.rpc('try_claim_delivery', {
        p_delivery_id: deliveryId,
        p_gateway: 'pagnow',
        p_transaction_id: transactionId
      })
      if (claimed === false) {
        console.log(`[pagnow-webhook] Delivery ${deliveryId} já processado`)
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle()

    if (txError || !tx) {
      console.warn(`[pagnow-webhook] Transação ${transactionId} não encontrada`)
      return new Response(JSON.stringify({ error: "Transação não encontrada no banco local" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle withdraw_fee transactions
    if (tx.type === 'withdraw_fee') {
      const now = new Date().toISOString()

      const { data: updated } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId)
        .eq('status', 'pending')
        .select()
        .maybeSingle()

      if (!updated) {
        console.log(`[pagnow-webhook] withdraw_fee ${transactionId} já processada`)
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      await supabase
        .from('pix_requests')
        .update({ status: 'paid', updated_at: now })
        .eq('transaction_id', transactionId)

      const { data: wr } = await supabase
        .from('withdraw_requests')
        .select('id')
        .eq('fee_transaction_id', transactionId)
        .maybeSingle()

      if (wr) {
        await supabase
          .from('withdraw_requests')
          .update({ status: 'awaiting_key', updated_at: now })
          .eq('id', wr.id)
      }

      return new Response(JSON.stringify({ received: true, type: 'withdraw_fee' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Normal deposit flow — atomic claim
    const now = new Date().toISOString()
    const { data: claimedTx } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', transactionId)
      .eq('status', 'pending')
      .select()
      .maybeSingle()

    if (!claimedTx) {
      console.log(`[pagnow-webhook] Transação ${transactionId} já processada (atomic)`)
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[pagnow-webhook] Creditando R$ ${claimedTx.amount} para o usuário ${claimedTx.user_id}`)

    const { data: userAuth } = await supabase.auth.admin.getUserById(claimedTx.user_id)
    const userEmail = userAuth?.user?.email || claimedTx.user_id

    await supabase.from('users').upsert({
      id: claimedTx.user_id,
      email: userEmail
    }, { onConflict: 'id' })

    await supabase
      .from('pix_requests')
      .update({ status: 'paid', updated_at: now })
      .eq('transaction_id', transactionId)

    const { data: newBalance, error: balanceError } = await supabase.rpc('increment_balance', {
      user_id: claimedTx.user_id,
      amount: Number(claimedTx.amount)
    })

    if (balanceError) {
      console.error("[pagnow-webhook] Erro ao incrementar saldo:", balanceError)
      throw balanceError
    }

    // Also update real_balance to prevent drift
    await supabase.rpc('increment_real_balance', {
      user_id: claimedTx.user_id,
      amount: Number(claimedTx.amount)
    }).catch(e => console.error("[pagnow-webhook] Erro ao incrementar real_balance:", e))

    console.log(`[pagnow-webhook] Saldo atualizado: ${newBalance}`)

    // Send Purchase event to Meta CAPI
    sendMetaPurchase(Number(claimedTx.amount), userEmail, supabase)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ type: 'pix_paid', title: '💰 Venda Aprovada', body: `R$ ${Number(claimedTx.amount).toFixed(2)}`, data: { url: '/admin', type: 'pix_paid', userName: userEmail || claimedTx.user_id.slice(0, 8), amount: claimedTx.amount } })
      })
    } catch (e) {
      console.error(`[pagnow-webhook] Erro ao notificar admin:`, e)
    }

    return new Response(JSON.stringify({ received: true, credited: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error(`[pagnow-webhook] Erro: ${err.message}`)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
