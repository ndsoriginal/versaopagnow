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
    const rawBody = await req.text()
    const payload = JSON.parse(rawBody)
    console.log(`[pagoupay-webhook] Payload recebido:`, JSON.stringify(payload).slice(0, 2000))

    const event = payload.event || payload.type || payload.action || ''
    const txData = payload.data || payload.charge || payload.transaction || payload.payment || payload

    // Extrair transactionId de vários campos possíveis
    const transactionId = txData?.transactionId || txData?.id || txData?.chargeId
      || payload.transactionId || payload.id || ''

    // Verificar se é evento de pagamento
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

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar transação
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .maybeSingle()

    if (txError || !tx) {
      console.warn(`[pagoupay-webhook] Transação ${transactionId} não encontrada no banco local`)

      // Fallback: tentar usar metadata do payload pra creditar direto
      const metaUserId = txData?.metadata?.userId || payload.metadata?.userId || ''
      if (metaUserId) {
        const fallbackAmount = txData?.amountCents
          ? Number(txData.amountCents) / 100
          : Number(txData?.amount || payload.amount || 0)

        if (fallbackAmount > 0) {
          console.log(`[pagoupay-webhook] Fallback: creditando R$ ${fallbackAmount} via metadata userId: ${metaUserId}`)

          await supabase.from('transactions').insert({
            id: transactionId,
            user_id: metaUserId,
            amount: fallbackAmount,
            type: 'deposit',
            status: 'completed',
            created_at: new Date().toISOString()
          }).catch(e => console.error('[pagoupay-webhook] Erro ao criar transação fallback:', e))

          const userEmail = txData?.customerEmail || txData?.customer?.email || txData?.email || metaUserId
          await supabase.from('users').upsert({ id: metaUserId, email: userEmail }, { onConflict: 'id' })

          const { data: uData } = await supabase.from('users').select('balance').eq('id', metaUserId).maybeSingle()
          const uBal = Number(uData?.balance || 0)
          await supabase.from('users').update({ balance: uBal + fallbackAmount }).eq('id', metaUserId)

          const { data: pData } = await supabase.from('profiles').select('real_balance').eq('id', metaUserId).maybeSingle()
          const pBal = Number(pData?.real_balance || 0)
          await supabase.from('profiles').update({ real_balance: pBal + fallbackAmount }).eq('id', metaUserId)

          return new Response(JSON.stringify({ received: true, credited: true, via: 'fallback_metadata' }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      }

      return new Response(JSON.stringify({ received: true, not_found: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Se já completada, retorna 200 (idempotente)
    if (tx.status === 'completed') {
      console.log(`[pagoupay-webhook] Transação ${transactionId} já processada`)
      return new Response(JSON.stringify({ received: true, already_processed: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log(`[pagoupay-webhook] Creditando R$ ${tx.amount} para o usuário ${tx.user_id}`)

    // Buscar email do usuário
    const { data: userAuth } = await supabase.auth.admin.getUserById(tx.user_id)
    const userEmail = userAuth?.user?.email || tx.user_id

    await supabase.from('users').upsert({
      id: tx.user_id,
      email: userEmail
    }, { onConflict: 'id' })

    // Atualizar transação
    await supabase
      .from('transactions')
      .update({ status: 'completed' })
      .eq('id', transactionId)

    // Atualizar pix_requests
    await supabase
      .from('pix_requests')
      .update({ status: 'paid', updated_at: new Date().toISOString() })
      .eq('transaction_id', transactionId)

    // Creditar saldo
    const { data: newBalance, error: balanceError } = await supabase.rpc('increment_balance', {
      user_id: tx.user_id,
      amount: Number(tx.amount)
    })

    if (balanceError) {
      console.error("[pagoupay-webhook] Erro ao incrementar saldo:", balanceError)
      throw balanceError
    }

    console.log(`[pagoupay-webhook] Saldo atualizado com sucesso: ${newBalance}`)

    return new Response(JSON.stringify({ received: true, credited: true }), {
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
