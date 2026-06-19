import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

function buildUserData(email: string | null, ip: string | null, user_agent: string | null, fbc: string | null, fbp: string | null) {
  const ud: Record<string, any> = {}
  if (email) ud.em = [email]
  if (ip) ud.client_ip_address = ip
  if (user_agent) ud.client_user_agent = user_agent
  if (fbc) ud.fbc = fbc
  if (fbp) ud.fbp = fbp
  return ud
}

function buildPayload(event_name: string, eventTime: number, userData: Record<string, any>, amount?: number, test_event_code?: string) {
  const p: Record<string, any> = {
    data: [{ event_name, event_time: eventTime, action_source: "website", user_data: userData }],
  }
  if (event_name === "Purchase" && amount) {
    p.data[0].custom_data = { value: amount, currency: "BRL" }
  }
  if (test_event_code) {
    p.test_event_code = test_event_code
  }
  return p
}

async function sendToPixel(pixelId: string, apiToken: string, payload: Record<string, any>) {
  return await fetch(
    `https://graph.facebook.com/v17.0/${pixelId}/events?access_token=${apiToken}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const { event_name, email, amount, pixel_id: targetPixelId, api_token: targetToken, fbc, fbp, user_agent, ip, test_event_code } = body

    const emailHash = email ? await sha256(email.trim().toLowerCase()) : null
    const eventTime = Math.floor(Date.now() / 1000)
    const userData = buildUserData(emailHash, ip, user_agent, fbc, fbp)
    const payload = buildPayload(event_name, eventTime, userData, amount, test_event_code)

    const allResults: any[] = []

    if (targetPixelId && targetToken) {
      const res = await sendToPixel(targetPixelId, targetToken, payload)
      const result = await res.json()
      allResults.push({ pixel_id: targetPixelId, success: res.ok, result })
    } else if (targetPixelId) {
      const { data: pixels } = await supabase
        .from("meta_pixels")
        .select("pixel_id, api_token")
        .eq("pixel_id", targetPixelId)
        .limit(1)

      const pixel = pixels?.[0]
      const token = pixel?.api_token || Deno.env.get("META_TOKEN") || ""
      if (!token) throw new Error(`Sem token para pixel ${targetPixelId}`)

      const res = await sendToPixel(targetPixelId, token, payload)
      const result = await res.json()
      allResults.push({ pixel_id: targetPixelId, success: res.ok, result })
    } else {
      const { data: pixels } = await supabase
        .from("meta_pixels")
        .select("pixel_id, api_token")
        .eq("is_active", true)

      if (pixels && pixels.length > 0) {
        for (const p of pixels) {
          const token = p.api_token || Deno.env.get("META_TOKEN") || ""
          if (!token) continue
          const res = await sendToPixel(p.pixel_id, token, payload)
          const result = await res.json()
          allResults.push({ pixel_id: p.pixel_id, success: res.ok, result })
        }
      } else {
        const legacyToken = Deno.env.get("META_TOKEN")
        const legacyPixel = Deno.env.get("META_PIXEL_ID") || "1569633754739174"
        if (legacyToken) {
          const res = await sendToPixel(legacyPixel, legacyToken, payload)
          const result = await res.json()
          allResults.push({ pixel_id: legacyPixel, success: res.ok, result })
        }
      }
    }

    for (const r of allResults) {
      const logEntry: Record<string, any> = {
        event_name,
        email: email || null,
        amount: amount || null,
        status: r.success ? 'sent' : 'error',
        response: r.result,
        error: r.success ? null : JSON.stringify(r.result),
        source: 'server',
      }
      const { error: logError } = await supabase.from('meta_event_log').insert(logEntry)
      if (logError) console.error("[track-meta-event] Erro ao salvar log:", logError)
      console.log(`[track-meta-event] ${event_name} para pixel ${r.pixel_id}: ${r.success ? 'sucesso' : 'falha'}`, JSON.stringify(r.result))
    }

    return new Response(JSON.stringify({ results: allResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error("[track-meta-event] Erro:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
