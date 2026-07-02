import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyHmac(rawBody: string, headerSig: string, headerTs: string, secret: string): Promise<boolean> {
  const ts = Number(headerTs)
  if (!ts || !headerSig) return false

  // Replay defense: janela de 5 minutos
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(`${ts}.${rawBody}`))
  const expected = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // timing-safe compare
  const a = new TextEncoder().encode(headerSig)
  const b = new TextEncoder().encode(expected)
  if (a.length !== b.length) return false
  const dv1 = new DataView(a.buffer)
  const dv2 = new DataView(b.buffer)
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= dv1.getUint8(i) ^ dv2.getUint8(i)
  return diff === 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const rawBody = await req.text()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar configuração do gateway PagouPay para ler o webhook_secret do banco
    const { data: gwData } = await supabase
      .from('payment_gateways')
      .select('config')
      .eq('slug', 'pagoupay')
      .limit(1)
      .maybeSingle()

    const gwConfig = gwData?.config
      ? (typeof gwData.config === 'string' ? JSON.parse(gwData.config) : gwData.config)
      : {}
    const webhookSecret = gwConfig?.webhook_secret || ''

    if (webhookSecret) {
      const headerSig = req.headers.get('x-webhook-signature') || ''
      const headerTs = req.headers.get('x-webhook-timestamp') || ''
      const valid = await verifyHmac(rawBody, headerSig, headerTs, webhookSecret)
      if (!valid) {
        console.error("[pagoupay-webhook] Assinatura HMAC inválida ou expirada")
        return new Response(JSON.stringify({ error: "Assinatura inválida" }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      console.log("[pagoupay-webhook] HMAC verificado com sucesso")
    } else {
      console.warn("[pagoupay-webhook] whsec não configurado — pulando verificação HMAC")
    }

    const payload = JSON.parse(rawBody)
    console.log(`[pagoupay-webhook] Payload recebido:`, JSON.stringify(payload).slice(0, 2000))

    const event = payload.event || payload.type || payload.action || ''
    const txData = payload.data || payload.charge || payload.transaction || payload.payment || payload

    const transactionId = txData?.transactionId || txData?.id || txData?.chargeId
      || payload.transactionId || payload.id || ''

    const deliveryId = req.headers.get('x-webhook-id') || payload.id || transactionId

    const isPaid = event === 'charge.paid'
      || event.toLowerCase().includes('paid')
      || event.toLowerCase().includes('completed')
      || event.toLowerCase().includes('confirmed')
      || txData?.status?.toLowerCase() === 'paid'
      || txData?.status?.toLowerCase() === 'settled'
      || txData?.status?.toLowerCase() === 'completed'

    if (!transactionId) {
      console.warn("[pagoupay-webhook] Payload sem transactionId, ignorando")
      return new Response(JSON.stringify({ received: true, ignored: true, reason: "no_id" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (!isPaid) {
      console.log(`[pagoupay-webhook] Evento ignorado: ${event || 'desconhecido'} (tx: ${transactionId})`)
      return new Response(JSON.stringify({ received: true, ignored: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[pagoupay-webhook] Pagamento detectado: ${event}, tx: ${transactionId}`)

    // Delivery dedup: claim delivery atomically
    if (deliveryId) {
      const { data: claimed } = await supabase.rpc('try_claim_delivery', {
        p_delivery_id: deliveryId,
        p_gateway: 'pagoupay',
        p_transaction_id: transactionId
      })
      if (claimed === false) {
        console.log(`[pagoupay-webhook] Delivery ${deliveryId} já processado`)
        return new Response(JSON.stringify({ received: true, already_processed: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Atomic claim: update transaction only if still pending
    const now = new Date().toISOString()
    const { data: claimedTx } = await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', transactionId)
      .eq('status', 'pending')
      .select()
      .maybeSingle()

    if (claimedTx) {
      // Normal path — transaction found and claimed
      console.log(`[pagoupay-webhook] Creditando R$ ${claimedTx.amount} para o usuário ${claimedTx.user_id}`)

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
        console.error("[pagoupay-webhook] Erro ao incrementar saldo:", balanceError)
        throw balanceError
      }

      await supabase.rpc('increment_real_balance', {
        user_id: claimedTx.user_id,
        amount: Number(claimedTx.amount)
      }).catch(e => console.error("[pagoupay-webhook] Erro ao incrementar real_balance:", e))

      console.log(`[pagoupay-webhook] Saldo atualizado com sucesso: ${newBalance}`)

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ type: 'pix_paid', title: '💰 Venda Aprovada', body: `R$ ${Number(claimedTx.amount).toFixed(2)}`, data: { url: '/admin', type: 'pix_paid', userName: userEmail || claimedTx.user_id.slice(0, 8), amount: claimedTx.amount } })
        })
      } catch (e) {
        console.error(`[pagoupay-webhook] Erro ao notificar admin:`, e)
      }

      return new Response(JSON.stringify({ received: true, credited: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Transaction not found or already completed — try fallback
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', transactionId)
      .maybeSingle()

    if (existingTx) {
      console.log(`[pagoupay-webhook] Transação ${transactionId} já processada (status: ${existingTx.status})`)
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Fallback: transaction not found, try to credit via metadata
    console.warn(`[pagoupay-webhook] Transação ${transactionId} não encontrada no banco local`)

    const metaUserId = txData?.metadata?.userId || payload.metadata?.userId || ''
    if (!metaUserId) {
      return new Response(JSON.stringify({ received: true, not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const fallbackAmount = txData?.amountCents
      ? Number(txData.amountCents) / 100
      : Number(txData?.amount || payload.amount || 0)

    if (fallbackAmount <= 0) {
      return new Response(JSON.stringify({ received: true, not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[pagoupay-webhook] Fallback: creditando R$ ${fallbackAmount} via metadata userId: ${metaUserId}`)

    // Check if transaction already exists (delivery dedup prevents race)
    const { data: dupTx } = await supabase
      .from('transactions')
      .select('id, status')
      .eq('id', transactionId)
      .maybeSingle()

    if (dupTx) {
      console.log(`[pagoupay-webhook] Fallback tx ${transactionId} já existe (${dupTx.status})`)
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { error: insError } = await supabase
      .from('transactions')
      .insert({
        id: transactionId,
        user_id: metaUserId,
        amount: fallbackAmount,
        type: 'deposit',
        status: 'completed',
        gateway: 'pagoupay',
        created_at: now
      })

    if (insError) {
      console.error("[pagoupay-webhook] Erro ao inserir transação fallback:", insError.message)
      return new Response(JSON.stringify({ received: true, error: "Falha ao criar transação" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const userEmail = txData?.customerEmail || txData?.customer?.email || txData?.email || metaUserId
    await supabase.from('users').upsert({ id: metaUserId, email: userEmail }, { onConflict: 'id' })

    await supabase.rpc('increment_balance', {
      user_id: metaUserId,
      amount: fallbackAmount
    }).catch(e => console.error('[pagoupay-webhook] Erro increment_balance fallback:', e))

    await supabase.rpc('increment_real_balance', {
      user_id: metaUserId,
      amount: fallbackAmount
    }).catch(e => console.error('[pagoupay-webhook] Erro increment_real_balance fallback:', e))

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
        body: JSON.stringify({ type: 'pix_paid', title: '💰 Venda Aprovada', body: `R$ ${Number(fallbackAmount).toFixed(2)}`, data: { url: '/admin', type: 'pix_paid', userName: metaUserId.slice(0, 8), amount: fallbackAmount } })
      })
    } catch (e) {
      console.error(`[pagoupay-webhook] Erro ao notificar admin:`, e)
    }

    return new Response(JSON.stringify({ received: true, credited: true, via: 'fallback_metadata' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("[pagoupay-webhook] Erro:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
