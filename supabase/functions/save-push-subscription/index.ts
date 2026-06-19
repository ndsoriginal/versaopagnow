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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const ADMIN_EMAILS = ["admin01@gmail.com", "jhonatas553@gmail.com"]
    if (!user.email || !ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return new Response(JSON.stringify({ error: "Apenas admins podem ativar notificações" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { endpoint, p256dh, auth: authKey, device_name, preferences } = body

    if (!endpoint || !p256dh || !authKey) {
      return new Response(JSON.stringify({ error: "Campos obrigatórios: endpoint, p256dh, auth" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const { data: existing } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('endpoint', endpoint)
      .maybeSingle()

    const defaultPrefs = { new_lead: true, pix_paid: true, pix_generated: true }
    const prefs = preferences || defaultPrefs

    if (existing) {
      const { error: updateError } = await supabase
        .from('push_subscriptions')
        .update({ p256dh, auth: authKey, device_name: device_name || null, preferences: prefs })
        .eq('id', existing.id)
      if (updateError) throw updateError
    } else {
      const { error: insertError } = await supabase
        .from('push_subscriptions')
        .insert({ user_id: user.id, endpoint, p256dh, auth: authKey, device_name: device_name || null, preferences: prefs })
      if (insertError) throw insertError
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("[save-push-subscription] Erro:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
