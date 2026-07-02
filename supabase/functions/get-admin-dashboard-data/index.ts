import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const bodyText = await req.text()
    let filters: any = {}
    try { if (bodyText) filters = JSON.parse(bodyText) } catch { /* ignore */ }
    const filterStartDate = filters?.startDate ? new Date(filters.startDate).getTime() : 0
    const filterEndDate = filters?.endDate ? new Date(filters.endDate).getTime() + 86400000 : 0

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

    async function fullAuditScan(tableName: string) {
      const store = new Map();
      let offset = 0;
      const step = 1000;
      const orderCol = tableName === 'profiles' ? 'updated_at' : 'created_at';

      while (true) {
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .range(offset, offset + step - 1)
          .order(orderCol, { ascending: false });

        if (error || !data || data.length === 0) break;
        data.forEach(item => { if(item.id) store.set(item.id, item) });
        if (data.length < step) break;
        offset += step;
      }
      return Array.from(store.values());
    }

    const [allUsers, allProfiles, allTransactions, allAttempts, allPixRequests, allWithdrawRequests] = await Promise.all([
      fullAuditScan('users'),
      fullAuditScan('profiles'),
      fullAuditScan('transactions'),
      fullAuditScan('deposit_attempts').catch(() => []),
      fullAuditScan('pix_requests').catch(() => []),
      fullAuditScan('withdraw_requests').catch(() => [])
    ]);

    const userMap = new Map(allUsers.map(u => [u.id, u]));
    const profileMap = new Map(allProfiles.map(p => [p.id, p]));

    const commonUserIds = new Set(
      allProfiles
        .filter(p => {
          const email = (userMap.get(p.id)?.email || "").toLowerCase();
          const role = (p.role || "").toLowerCase();
          return role !== 'admin' && role !== 'superadmin' && role !== 'demo';
        })
        .map(p => p.id)
    );

    const isPaid = (s: string) => ['paid', 'completed', 'approved', 'success'].includes(String(s || '').toLowerCase());
    const safeAmount = (value: any) => {
      const amount = Number(value);
      return Number.isFinite(amount) ? amount : 0;
    };

    const classify = (t: any) => {
      const amount = safeAmount(t.amount);
      const code = String(t.pix_code || "").toUpperCase();

      if (amount > 999999) return 'INVALID';
      if (code.includes('BUG') || code.includes('BONUS') || code.includes('LOCALIZACAO')) return 'BUG_BONUS';
      if (code.includes('ADMIN')) return 'ADMIN_CREDIT';
      return 'REAL_DEPOSIT';
    };

    const getBRTime = (iso: string) => new Date(new Date(iso).getTime() - (3 * 60 * 60 * 1000)).getTime();
    const nowBR = new Date(new Date().getTime() - (3 * 60 * 60 * 1000));
    const startOfToday = new Date(nowBR.getFullYear(), nowBR.getMonth(), nowBR.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOfWeek = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(nowBR.getFullYear(), nowBR.getMonth(), 1).getTime();

    // Apply date filters from request
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime()
      if (filterStartDate && t < filterStartDate) return false
      if (filterEndDate && t >= filterEndDate) return false
      return true
    }

    const realTransactions = allTransactions.filter(t => 
      t.type === 'deposit' && 
      commonUserIds.has(t.user_id) && 
      classify(t) === 'REAL_DEPOSIT' &&
      inRange(t.created_at)
    );

    const realPaid = realTransactions.filter(t => isPaid(t.status));
    const realPending = realTransactions.filter(t => !isPaid(t.status));

    const sum = (list: any[]) => list.reduce((acc, item) => acc + safeAmount(item.amount), 0);
    const count = (list: any[]) => list.length;

    const overview = {
      totalUsers: commonUserIds.size,
      realRevenueTotal: sum(realPaid),
      realRevenueToday: sum(realPaid.filter(t => getBRTime(t.created_at) >= startOfToday)),
      realRevenueYesterday: sum(realPaid.filter(t => {
        const time = getBRTime(t.created_at);
        return time >= startOfYesterday && time < startOfToday;
      })),
      realRevenue7Days: sum(realPaid.filter(t => getBRTime(t.created_at) >= startOfWeek)),
      realRevenueMonth: sum(realPaid.filter(t => getBRTime(t.created_at) >= startOfMonth)),
      pendingAmount: sum(realPending),
      totalPaidCount: realPaid.length,
      totalBugAmount: sum(allTransactions.filter(t => t.type === 'deposit' && isPaid(t.status) && classify(t) === 'BUG_BONUS')),
      totalQrGenerated: allAttempts.filter(a => commonUserIds.has(a.user_id)).length,
      countToday: realPaid.filter(t => getBRTime(t.created_at) >= startOfToday).length,
      newUsersToday: count(allUsers.filter(u => commonUserIds.has(u.id) && getBRTime(u.created_at) >= startOfToday)),
      newUsersYesterday: count(allUsers.filter(u => {
        const time = getBRTime(u.created_at);
        return commonUserIds.has(u.id) && time >= startOfYesterday && time < startOfToday;
      })),
      newUsersWeek: count(allUsers.filter(u => commonUserIds.has(u.id) && getBRTime(u.created_at) >= startOfWeek)),
      newUsersMonth: count(allUsers.filter(u => commonUserIds.has(u.id) && getBRTime(u.created_at) >= startOfMonth))
    };

    const users = allUsers
      .filter(u => commonUserIds.has(u.id))
      .map(u => {
        const p = profileMap.get(u.id);
        const userPaid = realPaid.filter(t => t.user_id === u.id);
        return {
          id: u.id,
          email: u.email,
          name: p?.first_name,
          phone: p?.phone,
          created_at: u.created_at,
          real_balance: safeAmount(p?.real_balance ?? u.balance),
          total_deposited: sum(userPaid),
          deposit_count: userPaid.length
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const deposits = realPaid
      .map(d => {
        const u = userMap.get(d.user_id);
        const p = profileMap.get(d.user_id);
        return {
          ...d,
          email: u?.email || null,
          name: p?.first_name || null,
          phone: p?.phone || null,
          role: p?.role || null,
          audit_type: 'REAL_DEPOSIT'
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2000);

    // Build charts data: last 7 days revenue + funnel + registrations + distribution
    const daily: any[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfToday - (i * 86400000)
      const dayEnd = dayStart + 86400000
      const dayRevenue = sum(realPaid.filter(t => {
        const tTime = getBRTime(t.created_at)
        return tTime >= dayStart && tTime < dayEnd
      }))
      const dayDate = new Date(nowBR.getTime() - (i * 86400000))
      daily.push({
        date: dayDate.toISOString().slice(0, 10),
        revenue: dayRevenue,
        deposits: realPaid.filter(t => {
          const tTime = getBRTime(t.created_at)
          return tTime >= dayStart && tTime < dayEnd
        }).length
      })
    }

    // Funnel
    const uniqueDepositors = new Set(realPaid.map((t: any) => t.user_id)).size
    const realPaid50plus = realPaid.filter((t: any) => safeAmount(t.amount) > 50)
    const realPaid100plus = realPaid.filter((t: any) => safeAmount(t.amount) > 100)
    const realPaid500plus = realPaid.filter((t: any) => safeAmount(t.amount) > 500)
    const funnel = [
      { name: "Total de Usuários", value: overview.totalUsers },
      { name: "Depositantes", value: uniqueDepositors },
      { name: "Depósitos > R$50", value: new Set(realPaid50plus.map((t: any) => t.user_id)).size },
      { name: "Depósitos > R$100", value: new Set(realPaid100plus.map((t: any) => t.user_id)).size },
      { name: "Depósitos > R$500", value: new Set(realPaid500plus.map((t: any) => t.user_id)).size }
    ]

    // Registrations by day (for area chart)
    const registrationsByDay: any[] = []
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfToday - (i * 86400000)
      const dayEnd = dayStart + 86400000
      const regCount = allUsers.filter((u: any) => {
        if (!commonUserIds.has(u.id)) return false
        const t = getBRTime(u.created_at)
        return t >= dayStart && t < dayEnd
      }).length
      const depCount = realPaid.filter((t: any) => {
        const tTime = getBRTime(t.created_at)
        return tTime >= dayStart && tTime < dayEnd
      }).length
      const dayDate = new Date(nowBR.getTime() - (i * 86400000))
      registrationsByDay.push({
        date: dayDate.toISOString().slice(0, 10),
        registrations: regCount,
        deposits: depCount
      })
    }

    // Deposit amount distribution (for pie chart)
    const ranges = [
      { name: "R$ 0-20", min: 0, max: 20 },
      { name: "R$ 20-50", min: 20, max: 50 },
      { name: "R$ 50-100", min: 50, max: 100 },
      { name: "R$ 100-200", min: 100, max: 200 },
      { name: "R$ 200+", min: 200, max: Infinity }
    ]
    const depositsAmountByDay = ranges.map(r => ({
      name: r.name,
      value: realPaid.filter((t: any) => {
        const amt = safeAmount(t.amount)
        return amt >= r.min && amt < r.max
      }).length
    }))

    const charts = { daily, funnel, registrationsByDay, depositsAmountByDay }

    // Rankings: top depositors
    const userDepositMap = new Map<string, number>()
    const userDepositCountMap = new Map<string, number>()
    realPaid.forEach((t: any) => {
      userDepositMap.set(t.user_id, (userDepositMap.get(t.user_id) || 0) + safeAmount(t.amount))
      userDepositCountMap.set(t.user_id, (userDepositCountMap.get(t.user_id) || 0) + 1)
    })
    const rankings = {
      topDepositors: Array.from(userDepositMap.entries())
        .map(([userId, total]) => {
          const p = profileMap.get(userId)
          const u = userMap.get(userId)
          return {
            email: u?.email || '',
            name: p?.first_name || u?.email || userId,
            deposit_count: userDepositCountMap.get(userId) || 0,
            total_deposited: total
          }
        })
        .sort((a, b) => b.total_deposited - a.total_deposited)
        .slice(0, 20)
    }

    // Peaks: busiest hours
    const hourCounts = new Array(24).fill(0)
    realPaid.forEach(t => {
      const h = new Date(t.created_at).getHours()
      hourCounts[h]++
    })
    const peaks = hourCounts.map((count, hour) => ({ hour, count }))

    return new Response(JSON.stringify({
      success: true,
      overview,
      users,
      deposits,
      charts,
      rankings,
      peaks,
      pixRequests: allPixRequests
        .map((p: any) => {
          const u = userMap.get(p.user_id);
          const prof = profileMap.get(p.user_id);
          return {
            ...p,
            email: u?.email || null,
            name: prof?.first_name || null,
            cpf: p.cpf || null
          };
        })
        .sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ),
      withdrawRequests: allWithdrawRequests
        .map((w: any) => {
          const u = userMap.get(w.user_id);
          const prof = profileMap.get(w.user_id);
          return {
            ...w,
            email: u?.email || null,
            name: prof?.first_name || null,
            cpf: prof?.cpf || null
          };
        })
        .sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});

export default serve;