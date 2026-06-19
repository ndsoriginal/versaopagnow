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

      if (amount > 50000) return 'INVALID';
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

    const realTransactions = allTransactions.filter(t => 
      t.type === 'deposit' && 
      commonUserIds.has(t.user_id) && 
      classify(t) === 'REAL_DEPOSIT'
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
      totalBugAmount: sum(allTransactions.filter(t => isPaid(t.status) && classify(t) === 'BUG_BONUS')),
      totalQrGenerated: allAttempts.filter(a => commonUserIds.has(a.user_id)).length,
      // New user stats
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
          real_balance: safeAmount(u.balance),
          total_deposited: sum(userPaid),
          deposit_count: userPaid.length
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const deposits = allTransactions
      .filter(t => t.type === 'deposit')
      .map(d => {
        const u = userMap.get(d.user_id);
        const p = profileMap.get(d.user_id);
        return {
          ...d,
          email: u?.email || null,
          name: p?.first_name || null,
          phone: p?.phone || null,
          role: p?.role || null,
          audit_type: classify(d)
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2000);

    return new Response(JSON.stringify({
      success: true,
      overview,
      users,
      deposits,
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