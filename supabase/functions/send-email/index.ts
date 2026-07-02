import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const RELAY_URL = "https://pixbeet.lat/api/email"
const VERSION = "v17"

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const body = await req.json()
    const { to, subject, html, _configOnly } = body

    if (_configOnly) {
      return new Response(JSON.stringify({
        _version: VERSION,
        config: {
          host: "VPS Relay",
          port: 443,
          user: "Relay",
          from: "contato@pixbeet.lat",
          relay: RELAY_URL,
          provider: "VPS Relay \u2192 Hostinger SMTP",
        },
        error: "Ignorado",
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: 'Campos obrigat\u00f3rios: to, subject, html' }), { status: 400, headers: corsHeaders })
    }

    const relayRes = await fetch(RELAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })

    const relayData = await relayRes.json()

    if (relayRes.ok && relayData.success) {
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: relayData.error || "Falha no relay de email" }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
