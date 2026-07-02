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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) throw error

    let synced = 0
    for (const u of users) {
      const { error: upsertError } = await supabase.from('users').upsert({
        id: u.id,
        email: u.email,
        balance: 0
      }, { onConflict: 'id' })

      if (upsertError) {
        console.error(`[sync-auth-users] Erro ao upsert users/${u.id}:`, upsertError)
        continue
      }

      const { error: profileError } = await supabase.from('profiles').upsert({
        id: u.id,
        first_name: u.email?.split('@')[0] || 'Usuário',
        real_balance: 0
      }, { onConflict: 'id', ignoreDuplicates: true })

      if (profileError) {
        console.error(`[sync-auth-users] Erro ao upsert profiles/${u.id}:`, profileError)
      }

      synced++
    }

    console.log(`[sync-auth-users] ${synced} usuários sincronizados`)

    return new Response(JSON.stringify({ success: true, synced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})