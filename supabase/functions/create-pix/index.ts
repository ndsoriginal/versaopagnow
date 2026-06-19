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

    // 1. Validar Usuário
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error("Cabeçalho de autorização ausente")
    
    const token = authHeader.replace('Bearer ', '')
    const { data: authData, error: userError } = await supabase.auth.getUser(token)
    const user = authData?.user

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado no Supabase" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { amount, customerDocument, type: pixType, withdrawRequestId } = await req.json()
    let doc = customerDocument?.replace(/\D/g, "") || ""
    const targetAmount = Number(amount)
    const isFee = pixType === 'withdraw_fee'

    // Se CPF não veio na requisição, busca do perfil
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

    // 2. Salvar/atualizar CPF no perfil do usuário
    const { data: profileData } = await supabase
      .from('profiles')
      .select('cpf')
      .eq('id', user.id)
      .maybeSingle()

    if (!profileData?.cpf || profileData.cpf !== doc) {
      await supabase
        .from('profiles')
        .update({ cpf: doc })
        .eq('id', user.id)
    }

    // 3. Verificar se já existe cobrança pendente com mesmo valor
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
      console.log(`[create-pix] Reusando cobrança existente: ${existing.transaction_id} para R$ ${targetAmount}`)
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

    // 4. Buscar Perfil
    const { data: profile } = await supabase
      .from('profiles')
      .select('first_name, phone')
      .eq('id', user.id)
      .maybeSingle()

    // 5. Configurações PagNow
    const PAGNOW_API_KEY = Deno.env.get("PAGNOW_API_KEY")
    const PAGNOW_WEBHOOK_URL = Deno.env.get("PAGNOW_WEBHOOK_URL") || ""
    const pagnowUrl = "https://v2.pagnow.com/v1/payments"

    if (!PAGNOW_API_KEY) {
      return new Response(JSON.stringify({ error: "ERRO: PAGNOW_API_KEY não configurada nos Secrets do Supabase" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const minAmount = isFee ? 0 : 500
    const amountInCents = Math.max(Math.round(targetAmount * 100), minAmount)

    // 6. Montar payload conforme documentação v2
    const idempotencyKey = `${isFee ? 'FEE' : 'DEP'}-${user.id.slice(0, 8)}-${Date.now()}`
    const payload = {
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
      ...(PAGNOW_WEBHOOK_URL ? { webhookUrl: PAGNOW_WEBHOOK_URL } : {})
    }

    console.log("[create-pix] Enviando payload para PagNow v2:", JSON.stringify(payload))

    // 7. Chamada API PagNow v2
    const response = await fetch(pagnowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': PAGNOW_API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const responseText = await response.text()
    
    if (!response.ok) {
      console.error("[create-pix] Erro na PagNow:", response.status, responseText)
      return new Response(JSON.stringify({ 
        error: "A PagNow recusou a requisição", 
        status: response.status,
        details: responseText 
      }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const data = JSON.parse(responseText)
    const now = new Date().toISOString()

    // 8. Salvar na tabela transactions
    const pagnowTxId = data.transactionId || data.id
    const { error: txError } = await supabase.from("transactions").insert({
      id: pagnowTxId,
      user_id: user.id,
      amount: targetAmount,
      type: isFee ? "withdraw_fee" : "deposit",
      status: "pending",
      pix_code: data.pixCopyPaste || "",
      created_at: now
    })

    if (txError) console.error("[create-pix] Erro ao salvar em transactions:", txError)

    // 9. Salvar na tabela pix_requests
    const qrCode = data.pixQrCode || ""
    const { error: prError } = await supabase.from("pix_requests").insert({
      user_id: user.id,
      cpf: doc,
      amount: targetAmount,
      transaction_id: pagnowTxId,
      qr_code: qrCode,
      pix_code: data.pixCopyPaste || "",
      status: "pending",
      created_at: now,
      updated_at: now
    })

    if (prError) console.error("[create-pix] Erro ao salvar em pix_requests:", prError)

    if (isFee) {
      const { error: wrError } = await supabase.from("withdraw_requests").insert({
        user_id: user.id,
        amount: withdrawRequestId ? 0 : targetAmount,
        status: "pending_payment",
        fee_transaction_id: pagnowTxId,
        created_at: now,
        updated_at: now
      })
      if (wrError) console.error("[create-pix] Erro ao salvar em withdraw_requests:", wrError)
    }

    return new Response(JSON.stringify({
      fromCache: false,
      ...data,
      amount: targetAmount,
      created_at: now,
      isFee
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("[create-pix] Erro Crítico:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
