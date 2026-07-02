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
    if (!supabaseUrl || !supabaseKey) throw new Error('Env not configured')
    const supabase = createClient(supabaseUrl, supabaseKey)

    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    const { data: authData, error: authError } = await supabase.auth.getUser(token)
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ success: false, message: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle()
    if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
      return new Response(JSON.stringify({ success: false, message: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    const { method, template } = await req.json()

    switch (method) {
      case 'list': {
        const { data, error } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false })
        if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true, templates: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'get': {
        if (!template?.id) return new Response(JSON.stringify({ success: false, message: 'template.id é obrigatório' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const { data, error } = await supabase.from('email_templates').select('*').eq('id', template.id).maybeSingle()
        if (error || !data) return new Response(JSON.stringify({ success: false, message: error?.message || 'Template não encontrado' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true, template: data }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'save': {
        const payload = {
          template_name: template.template_name,
          campaign_name: template.campaign_name || '',
          subject: template.subject || 'Oferta especial PixBett',
          preheader: template.preheader || '',
          header_image_url: template.header_image_url || '',
          title: template.title || 'VOCÊ TEM UMA OFERTA ESPECIAL',
          body_text: template.body_text || '',
          secondary_text: template.secondary_text || '',
          cta_text: template.cta_text || 'ACESSAR AGORA',
          cta_url: template.cta_url || 'https://www.pixbeet.lat',
          footer_text: template.footer_text || '© 2026 PixBett. Todos os direitos reservados.',
          footer_image_url: template.footer_image_url || '',
          body_html: template.body_html || null,
          is_default: template.is_default || false,
          updated_at: new Date().toISOString(),
        }
        if (template.id) {
          const { data, error } = await supabase.from('email_templates').update(payload).eq('id', template.id).select('id').single()
          if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
          return new Response(JSON.stringify({ success: true, template: { id: data.id } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        payload.created_by = authData.user.id
        payload.created_at = new Date().toISOString()
        const { data, error } = await supabase.from('email_templates').insert(payload).select('id').single()
        if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true, template: { id: data.id } }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'delete': {
        if (!template?.id) return new Response(JSON.stringify({ success: false, message: 'template.id é obrigatório' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        const { error } = await supabase.from('email_templates').delete().eq('id', template.id)
        if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      case 'set_default': {
        if (!template?.id) return new Response(JSON.stringify({ success: false, message: 'template.id é obrigatório' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        await supabase.from('email_templates').update({ is_default: false }).neq('id', 'placeholder')
        const { error } = await supabase.from('email_templates').update({ is_default: true }).eq('id', template.id)
        if (error) return new Response(JSON.stringify({ success: false, message: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      default:
        return new Response(JSON.stringify({ success: false, message: `Método desconhecido: ${method}` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
