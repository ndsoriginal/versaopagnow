import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) throw new Error("SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados")
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    const requester = authData?.user

    if (authError || !requester) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 403, headers: corsHeaders })
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", requester.id)
      .maybeSingle();

    if (!adminProfile || !["admin", "superadmin"].includes(adminProfile.role)) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 403, headers: corsHeaders })
    }

    const { targetUserId, action, amount: rawAmount, reason } = await req.json()
    const amount = Number(rawAmount)

    if (!targetUserId || !action || isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: "Dados inválidos" }), { status: 400, headers: corsHeaders })
    }

    if (!["add", "remove", "set"].includes(action)) {
      return new Response(JSON.stringify({ error: "Ação inválida. Use: add, remove, set" }), { status: 400, headers: corsHeaders })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('real_balance, first_name')
      .eq('id', targetUserId)
      .maybeSingle()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { status: 404, headers: corsHeaders })
    }

    const currentBalance = Number(profile.real_balance || 0)

    if (action === "remove" && amount > currentBalance) {
      return new Response(JSON.stringify({ error: "Saldo insuficiente para remoção" }), { status: 400, headers: corsHeaders })
    }

    // 1. Registra transação PRIMEIRO
    const txId = crypto.randomUUID()
    const actionLabel = action === "add" ? "ADMIN_BONUS" : action === "remove" ? "ADMIN_REMOVE" : "ADMIN_SET"
    const pixCode = `${actionLabel}: ${reason || "Ajuste administrativo"} (por ${requester.email})`
    const txAmount = action === "add" ? amount : amount
    const txType = action === "remove" ? "withdraw" : "deposit"

    const { error: txError } = await supabase.from("transactions").insert({
      id: txId,
      user_id: targetUserId,
      amount: txAmount,
      type: txType,
      status: "completed",
      pix_code: pixCode,
      created_at: new Date().toISOString()
    })

    if (txError) {
      console.error("[admin-manage-balance] Erro ao criar transação:", txError)
      return new Response(JSON.stringify({ error: "Erro ao registrar transação" }), { status: 500, headers: corsHeaders })
    }

    // 2. Atualiza saldos atomicamente
    if (action === "add") {
      const { error: e1 } = await supabase.rpc('increment_real_balance', { user_id: targetUserId, amount })
      if (e1) return new Response(JSON.stringify({ error: "Erro ao atualizar real_balance" }), { status: 500, headers: corsHeaders })
      const { error: e2 } = await supabase.rpc('increment_balance', { user_id: targetUserId, amount })
      if (e2) console.error("[admin-manage-balance] increment_balance falhou após real_balance:", e2)
    } else if (action === "remove") {
      const { error: e1 } = await supabase.rpc('increment_real_balance', { user_id: targetUserId, amount: -amount })
      if (e1) return new Response(JSON.stringify({ error: "Erro ao atualizar real_balance" }), { status: 500, headers: corsHeaders })
      const { error: e2 } = await supabase.rpc('increment_balance', { user_id: targetUserId, amount: -amount })
      if (e2) console.error("[admin-manage-balance] increment_balance falhou após real_balance:", e2)
    } else if (action === "set") {
      const { error: e1 } = await supabase.from('profiles').update({ real_balance: amount, updated_at: new Date().toISOString() }).eq('id', targetUserId)
      if (e1) return new Response(JSON.stringify({ error: "Erro ao atualizar real_balance" }), { status: 500, headers: corsHeaders })
      const { error: e2 } = await supabase.rpc('increment_balance', { user_id: targetUserId, amount: amount - currentBalance })
      if (e2) console.error("[admin-manage-balance] increment_balance falhou após real_balance:", e2)
    }

    const newBalance = action === "set" ? amount : (action === "remove" ? currentBalance - amount : currentBalance + amount)

    return new Response(JSON.stringify({
      success: true,
      previousBalance: currentBalance,
      newBalance,
      action,
      amount
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
