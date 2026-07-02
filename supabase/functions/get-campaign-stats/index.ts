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
    const requester = authData?.user

    if (authError || !requester) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', requester.id)
      .maybeSingle()

    if (!adminProfile || !['admin', 'superadmin'].includes(adminProfile.role)) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 403, headers: corsHeaders })
    }

    // ─── CARREGAR USUÁRIOS ───
    let usersData: any[] = []
    try {
      const { data } = await supabase.from('users').select('id, email, balance, created_at')
      usersData = data || []
    } catch { /* fallback vazio */ }

    const userIds = usersData.map(u => u.id).filter(Boolean)

    // ─── PROFILES ───
    let profilesData: any[] = []
    if (userIds.length > 0) {
      try {
        const { data } = await supabase.from('profiles').select('id, first_name, real_balance, role').in('id', userIds)
        profilesData = data || []
      } catch { /* fallback vazio */ }
    }
    const profileMap: Record<string, any> = {}
    for (const p of profilesData) {
      profileMap[p.id] = p
    }

    // ─── PIX_REQUESTS ───
    let pixRequests: any[] = []
    if (userIds.length > 0) {
      try {
        const { data } = await supabase
          .from('pix_requests')
          .select('id, user_id, amount, status, created_at, updated_at, paid_at')
          .in('user_id', userIds)
        pixRequests = data || []
      } catch { /* fallback vazio */ }
    }
    const pixByUser: Record<string, any[]> = {}
    for (const pr of pixRequests) {
      if (!pixByUser[pr.user_id]) pixByUser[pr.user_id] = []
      pixByUser[pr.user_id].push(pr)
    }

    // ─── RECIPIENTS ───
    let recipients: any[] = []
    if (userIds.length > 0) {
      try {
        const { data } = await supabase
          .from('email_campaign_recipients')
          .select('id, campaign_id, user_id, email, first_name, sent_at, status, converted, converted_amount, converted_at')
          .in('user_id', userIds)
        recipients = data || []
      } catch { /* fallback vazio */ }
    }
    const recipientByUser: Record<string, any[]> = {}
    for (const r of recipients) {
      if (!recipientByUser[r.user_id]) recipientByUser[r.user_id] = []
      recipientByUser[r.user_id].push(r)
    }

    // ─── DASHBOARD STATS ───
    const totalEmails = usersData.filter(u => u.email).length
    const totalSent = recipients.filter(r => r.status === 'sent' || !r.status).length
    const failedEmails = recipients.filter(r => r.status === 'failed').length

    // Última campanha
    let lastCampaignSent = 0
    try {
      const { data: lastCampaign } = await supabase
        .from('email_campaigns')
        .select('id, total_sent')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (lastCampaign) lastCampaignSent = lastCampaign.total_sent || 0
    } catch { /* fallback */ }

    const userIdsWithRecipient = new Set(recipients.map(r => r.user_id))
    const newEmailUsers = usersData.filter(u => u.email && !userIdsWithRecipient.has(u.id))
    const newEmails = newEmailUsers.length

    const paidUserIds = new Set<string>()
    const pendingOnlyUserIds = new Set<string>()
    for (const [uid, pixList] of Object.entries(pixByUser)) {
      const hasPaid = pixList.some(p => p.status === 'paid')
      const hasPending = pixList.some(p => p.status === 'pending')
      if (hasPaid) paidUserIds.add(uid)
      if (hasPending && !hasPaid) pendingOnlyUserIds.add(uid)
    }
    const paidUsers = paidUserIds.size
    const pendingUsers = pendingOnlyUserIds.size

    let conversions = 0
    let convertedAmount = 0
    for (const r of recipients) {
      if (r.status === 'failed') continue
      const userPix = pixByUser[r.user_id] || []
      const sentAt = new Date(r.sent_at).getTime()
      for (const p of userPix) {
        if (p.status !== 'paid') continue
        if (Number(p.amount) !== 50) continue
        const paidAt = p.paid_at || p.updated_at
        if (!paidAt) continue
        if (new Date(paidAt).getTime() > sentAt) {
          conversions++
          convertedAmount += 50
          break
        }
      }
    }
    const conversionRate = totalSent > 0 ? Number(((conversions / totalSent) * 100).toFixed(2)) : 0
    const lastUpdate = new Date().toISOString()

    // ─── USERS ARRAY ───
    const users = usersData.map(u => {
      const profile = profileMap[u.id]
      const userPix = pixByUser[u.id] || []
      const userRecipients = recipientByUser[u.id] || []

      const hasPaid = userPix.some(p => p.status === 'paid')
      const hasPending = userPix.some(p => p.status === 'pending')
      const paidPix = userPix.filter(p => p.status === 'paid')
      const pendingPix = userPix.filter(p => p.status === 'pending')

      const paidTotal = paidPix.reduce((s, p) => s + Number(p.amount), 0)
      const lastPaid = paidPix.length > 0 ? paidPix.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b) : null
      const lastPending = pendingPix.length > 0 ? pendingPix.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b) : null

      const sentRecipients = userRecipients.filter(r => r.status === 'sent' || !r.status)
      const hasReceivedEmail = sentRecipients.length > 0
      const lastEmail = sentRecipients.length > 0 ? sentRecipients.reduce((a, b) => new Date(a.sent_at) > new Date(b.sent_at) ? a : b) : null

      let userConverted = false
      let userConvertedAmount = 0
      for (const r of sentRecipients) {
        if (r.converted) {
          userConverted = true
          userConvertedAmount += Number(r.converted_amount || 0)
          continue
        }
        const sentTime = new Date(r.sent_at).getTime()
        for (const p of userPix) {
          if (p.status !== 'paid') continue
          if (Number(p.amount) !== 50) continue
          const paidAt = p.paid_at || p.updated_at
          if (!paidAt) continue
          if (new Date(paidAt).getTime() > sentTime) {
            userConverted = true
            userConvertedAmount += 50
            break
          }
        }
      }

      return {
        id: u.id,
        email: u.email,
        first_name: profile?.first_name || null,
        balance: Number(u.balance || 0),
        real_balance: Number(profile?.real_balance || 0),
        created_at: u.created_at,
        paymentStatus: hasPaid ? 'paid' : hasPending ? 'pending' : 'none',
        hasPaid,
        hasPending,
        paidTotal,
        paidCount: paidPix.length,
        lastPaidAt: lastPaid ? (lastPaid.paid_at || lastPaid.updated_at) : null,
        lastPendingAt: lastPending ? lastPending.created_at : null,
        hasReceivedEmail,
        lastEmailSentAt: lastEmail ? lastEmail.sent_at : null,
        isNewEmail: !hasReceivedEmail,
        converted: userConverted,
        convertedAmount: userConvertedAmount,
      }
    })

    // ─── CAMPANHAS ───
    let campaigns: any[] = []
    try {
      const { data } = await supabase
        .from('email_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      campaigns = data || []
    } catch { /* fallback */ }

    const campaignsWithStats = await Promise.all(campaigns.map(async (c) => {
      let campRecs: any[] = []
      try {
        const { data } = await supabase
          .from('email_campaign_recipients')
          .select('id, user_id, sent_at, status, converted, converted_amount')
          .eq('campaign_id', c.id)
        campRecs = data || []
      } catch { /* fallback */ }

      const sentCount = campRecs.filter(r => r.status === 'sent' || !r.status).length
      const failedCount = campRecs.filter(r => r.status === 'failed').length

      let convCount = 0
      let convValue = 0
      for (const r of campRecs) {
        if (r.status === 'failed') continue
        if (r.converted) {
          convCount++
          convValue += Number(r.converted_amount || 0)
          continue
        }
        const sentTime = new Date(r.sent_at).getTime()
        const userPix = pixByUser[r.user_id] || []
        for (const p of userPix) {
          if (p.status !== 'paid') continue
          if (Number(p.amount) !== 50) continue
          const paidAt = p.paid_at || p.updated_at
          if (!paidAt) continue
          if (new Date(paidAt).getTime() > sentTime) {
            convCount++
            convValue += 50
            break
          }
        }
      }
      const convRate = sentCount > 0 ? Number(((convCount / sentCount) * 100).toFixed(2)) : 0

      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        preheader: c.preheader,
        title: c.title,
        cta_text: c.cta_text,
        cta_url: c.cta_url,
        footer: c.footer,
        audience_type: c.audience_type,
        total_sent: c.total_sent || sentCount,
        total_failed: c.total_failed || failedCount,
        total_conversions: c.total_conversions || convCount,
        total_converted_amount: c.total_converted_amount || convValue,
        created_at: c.created_at,
        sent_at: c.sent_at,
        created_by: c.created_by,
        liveSent: sentCount,
        liveFailed: failedCount,
        liveConversions: convCount,
        liveValue: convValue,
        liveRate: convRate,
      }
    }))

    return new Response(JSON.stringify({
      dashboard: {
        totalEmails,
        totalSent,
        lastCampaignSent,
        newEmails,
        paidUsers,
        pendingUsers,
        conversions,
        convertedAmount,
        conversionRate,
        failedEmails,
        lastUpdate,
      },
      users,
      campaigns: campaignsWithStats,
      newEmailsList: newEmailUsers.map(u => ({
        id: u.id,
        email: u.email,
        first_name: profileMap[u.id]?.first_name || null,
        balance: Number(u.balance || 0),
        real_balance: Number(profileMap[u.id]?.real_balance || 0),
        created_at: u.created_at,
      })),
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({
      error: err.message,
      dashboard: null, users: [], campaigns: [], newEmailsList: [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
