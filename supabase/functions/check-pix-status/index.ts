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

    // Buscar gateway ativo
    const { data: gateways } = await supabase
      .from('payment_gateways')
      .select('*')
      .eq('is_active', true)
      .limit(1)

    const activeGateway = gateways?.[0]

    if (!activeGateway) {
      throw new Error("Nenhum gateway de pagamento ativo")
    }

    const config = typeof activeGateway.config === 'string' ? JSON.parse(activeGateway.config) : activeGateway.config
    let chargeStatus = ''

    if (activeGateway.slug === 'pagnow') {
      const apiKey = config.api_key || Deno.env.get("PAGNOW_API_KEY")
      if (!apiKey) throw new Error("PagNow API key não configurada")

      const resp = await fetch(`https://v2.pagnow.com/v1/payments/${txId}`, {
        headers: { 'Content-Type': 'application/json', 'apikey': apiKey }
      })
      if (resp.ok) {
        const json = await resp.json()
        chargeStatus = json.status || ''
        console.log(`[check-pix-status] PagNow status: ${chargeStatus}`, JSON.stringify(json).slice(0, 300))
      } else {
        console.error(`[check-pix-status] PagNow erro: ${resp.status}`)
      }
    } else if (activeGateway.slug === 'pagoupay') {
      const pk = config.public_key || ""
      const sk = config.secret_key || ""
      if (!pk || !sk) throw new Error("PagouPay chaves não configuradas")

      const authHeader = `Bearer ${pk}:${sk}`

      // Tenta GET /api/v1/pix/{txId}
      try {
        const resp = await fetch(`https://pagoupay.com/api/v1/pix/${txId}`, {
          headers: { 'Authorization': authHeader }
        })
        if (resp.ok) {
          const json = await resp.json()
          chargeStatus = json.data?.status || json.status || ''
          console.log(`[check-pix-status] PagouPay /pix/${txId}: ${chargeStatus}`, JSON.stringify(json).slice(0, 300))
        }
      } catch (e) {
        console.warn(`[check-pix-status] PagouPay /pix/${txId} falhou:`, e)
      }

      // Fallback: lista de transações
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

    console.log(`[check-pix-status] Status final: "${chargeStatus}"`)

    const isPaid = chargeStatus === 'PAID' || chargeStatus === 'paid'
      || chargeStatus === 'APPROVED' || chargeStatus === 'approved'
      || chargeStatus === 'SETTLED' || chargeStatus === 'settled'

    if (isPaid) {
      // Buscar a transação local no banco
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', txId)
        .maybeSingle()
      
      if (txError || !tx) {
        console.error(`[check-pix-status] Transação ${txId} não encontrada no banco local:`, txError);
        return new Response(JSON.stringify({ success: false, error: "Transação não encontrada" }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      // Se já estiver completada, não faz nada
      if (tx.status === 'completed') {
        return new Response(JSON.stringify({ success: true, status: 'paid', already_processed: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`[check-pix-status] Processando crédito de R$ ${tx.amount} para o usuário ${tx.user_id}`)

      // 3. Buscar email do usuário para upsert
      const { data: userAuth } = await supabase.auth.admin.getUserById(tx.user_id);
      const userEmail = userAuth?.user?.email || tx.user_id;

      const { error: userInitError } = await supabase.from('users').upsert({ 
        id: tx.user_id,
        email: userEmail
      }, { onConflict: 'id' });

      if (userInitError) {
        console.error("[check-pix-status] Erro ao garantir existência do usuário:", userInitError);
      }

      // 4. Atualizar transação para 'completed'
      const { error: updateTxError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', txId)

      if (updateTxError) throw updateTxError

      // 4b. Atualizar pix_requests
      await supabase
        .from('pix_requests')
        .update({ status: 'paid', updated_at: new Date().toISOString() })
        .eq('transaction_id', txId)

      // 5. Incrementar saldo atomicamente usando RPC
      const { data: newBalance, error: balanceError } = await supabase.rpc('increment_balance', {
        user_id: tx.user_id,
        amount: Number(tx.amount)
      })

      if (balanceError) {
        console.error("[check-pix-status] Erro ao incrementar saldo:", balanceError);
        throw balanceError
      }

      console.log(`[check-pix-status] Saldo atualizado com sucesso: ${newBalance}`)
      
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