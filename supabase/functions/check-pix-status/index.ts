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
    const { txId } = await req.json()
    console.log(`[check-pix-status] Verificando transação: ${txId}`)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Buscar a transação local primeiro para saber qual gateway a processou
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', txId)
      .maybeSingle()

    if (txError || !tx) {
      console.error(`[check-pix-status] Transação ${txId} não encontrada no banco local:`, txError)
      return new Response(JSON.stringify({ success: false, error: "Transação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Se já completada, retorna imediatamente
    if (tx.status === 'completed') {
      return new Response(JSON.stringify({ success: true, status: 'paid', already_processed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Usar o gateway salvo na transação para consultar o status no provedor correto
    const txGateway = tx.gateway || ''

    // Buscar a configuração desse gateway específico na tabela payment_gateways
    const { data: configs } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('slug', txGateway)
      .limit(1)

    const gatewayConfig = configs?.[0]

    if (!gatewayConfig) {
      console.error(`[check-pix-status] Gateway "${txGateway}" não encontrado na configuração`)
      return new Response(JSON.stringify({ success: false, error: `Gateway "${txGateway}" não configurado` }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const config = typeof gatewayConfig.config === 'string' ? JSON.parse(gatewayConfig.config) : gatewayConfig.config
    let chargeStatus = ''

    if (gatewayConfig.slug === 'pagnow') {
      const apiKey = config.api_key || Deno.env.get("PAGNOW_API_KEY")
      if (!apiKey) throw new Error("PagNow API key não configurada")

      const resp = await fetch(`https://v2.pagnow.com/v1/payments/${txId}`, {
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
      })
  if (resp.ok) {
    const json = await resp.json()
    chargeStatus = json.status || ''
    console.log(`[check-pix-status] Status da PagNow para ${txId}: ${chargeStatus}`)
  } else {
    console.warn(`[check-pix-status] PagNow ainda não reconhece ${txId} (${resp.status}) — tratando como pendente`)
  }
    } else if (gatewayConfig.slug === 'pagoupay') {
      const pk = config.public_key || ""
      const sk = config.secret_key || ""
      if (!pk || !sk) throw new Error("PagouPay chaves não configuradas")

      const authHeader = `Bearer ${pk}:${sk}`

      try {
        const resp = await fetch(`https://pagoupay.com/api/v1/pix/${txId}`, {
          headers: { 'Authorization': authHeader }
        })
        if (resp.ok) {
          const json = await resp.json()
          chargeStatus = json.data?.status || json.status || ''
          console.log(`[check-pix-status] PagouPay /pix/${txId}: ${chargeStatus}`)
        }
      } catch (e) {
        console.warn(`[check-pix-status] PagouPay /pix/${txId} falhou:`, e)
      }

      if (!chargeStatus) {
        try {
          const resp = await fetch(`https://pagoupay.com/api/v1/transactions?limit=100`, {
            headers: { 'Authorization': authHeader }
          })
          if (resp.ok) {
            const json = await resp.json()
            const txs = json.data?.transactions || json.data || json.transactions || []
            const found = Array.isArray(txs) ? txs.find((t: any) =>
              t.id === txId || t.chargeId === txId || t.transactionId === txId
            ) : null
            if (found) {
              chargeStatus = found.status || ''
              console.log(`[check-pix-status] PagouPay via /transactions: ${chargeStatus}`)
            }
          }
        } catch (e) {
          console.warn(`[check-pix-status] PagouPay /transactions falhou:`, e)
        }
      }
    }

    console.log(`[check-pix-status] Status da transação ${txId}: "${chargeStatus}"`)

    const isPaid = chargeStatus === 'PAID' || chargeStatus === 'paid'
      || chargeStatus === 'APPROVED' || chargeStatus === 'approved'
      || chargeStatus === 'SETTLED' || chargeStatus === 'settled'

    if (isPaid) {
      // Atomic claim: only process if still pending
      const now = new Date().toISOString()
      const { data: claimedTx } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', txId)
        .eq('status', 'pending')
        .select()
        .maybeSingle()

      if (!claimedTx) {
        console.log(`[check-pix-status] Transação ${txId} já processada por outro processo`)
        return new Response(JSON.stringify({ success: true, status: 'paid', already_processed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[check-pix-status] Processando crédito de R$ ${claimedTx.amount} para o usuário ${claimedTx.user_id}`)

      const { data: userAuth } = await supabase.auth.admin.getUserById(claimedTx.user_id)
      const userEmail = userAuth?.user?.email || claimedTx.user_id

      const { error: userInitError } = await supabase.from('users').upsert({
        id: claimedTx.user_id,
        email: userEmail
      }, { onConflict: 'id' })

      if (userInitError) {
        console.error("[check-pix-status] Erro ao garantir existência do usuário:", userInitError)
      }

      await supabase
        .from('pix_requests')
        .update({ status: 'paid', updated_at: now })
        .eq('transaction_id', txId)

      const { data: newBalance, error: balanceError } = await supabase.rpc('increment_balance', {
        user_id: claimedTx.user_id,
        amount: Number(claimedTx.amount)
      })

      if (balanceError) {
        console.error("[check-pix-status] Erro ao incrementar saldo:", balanceError)
        throw balanceError
      }

      await supabase.rpc('increment_real_balance', {
        user_id: claimedTx.user_id,
        amount: Number(claimedTx.amount)
      }).catch(e => console.error("[check-pix-status] Erro ao incrementar real_balance:", e))

      console.log(`[check-pix-status] Saldo atualizado: ${newBalance}`)

      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-admin-notification`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
          body: JSON.stringify({ type: 'pix_paid', title: '💰 Venda Aprovada', body: `R$ ${Number(claimedTx.amount).toFixed(2)}`, data: { url: '/admin', type: 'pix_paid', userName: userEmail || claimedTx.user_id.slice(0, 8), amount: claimedTx.amount } })
        })
      } catch (e) {
        console.error(`[check-pix-status] Erro ao notificar admin:`, e)
      }

      return new Response(JSON.stringify({ success: true, status: 'paid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true, status: 'pending' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("[check-pix-status] Erro Geral:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})