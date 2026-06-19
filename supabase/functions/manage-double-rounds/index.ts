import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

const BETTING_SECONDS = 15
const SPINNING_SECONDS = 6
const FINISHED_DELAY_MS = 2000
const SPIN_DURATION_MS = 6000

const BASE_NUMBERS = [1, 8, 2, 9, 3, 10, 4, 11, 5, 12, 6, 13, 7, 14, 0]

const BOT_NAMES = [
  "Ana Silva", "Pedro Santos", "Maria Oliveira", "Lucas Costa",
  "Julia Pereira", "Gabriel Almeida", "Beatriz Souza", "Rafael Lima",
  "Camila Rodrigues", "Felipe Martins", "Amanda Barbosa", "Thiago Rocha",
  "Larissa Dias", "Bruno Ribeiro", "Isabela Teixeira", "Diego Fernandes",
  "Patricia Gomes", "Leonardo Carvalho", "Tatiana Araujo", "Eduardo Moreira",
  "Vanessa Cardoso", "Renato Campos", "Aline Freitas", "Fernando Barros",
  "Mariana Castro", "Gustavo Nunes", "Fernanda Correia", "Andre Macedo",
]

function getColor(number: number): string {
  if (number === 0) return "white"
  if (number >= 1 && number <= 7) return "red"
  return "black"
}

function drawResult(): { number: number; color: string } {
  const number = crypto.getRandomValues(new Uint32Array(1))[0] % 15
  return { number, color: getColor(number) }
}

function randomInt(min: number, max: number): number {
  return min + (crypto.getRandomValues(new Uint32Array(1))[0] % (max - min + 1))
}

function pickRandom<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)]
}

function generateBotBets(roundId: string, numberOfBots?: number): any[] {
  const count = numberOfBots || randomInt(8, 15)
  const bets: any[] = []
  const usedNames = new Set<string>()

  for (let i = 0; i < count; i++) {
    let name = pickRandom(BOT_NAMES)
    while (usedNames.has(name)) name = pickRandom(BOT_NAMES)
    usedNames.add(name)

    const rand = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
    const colors = ["red", "black", "white"]
    const weights = [0.45, 0.45, 0.10]
    let cum = 0
    let color = "red"
    for (let j = 0; j < colors.length; j++) {
      cum += weights[j]
      if (rand < cum) { color = colors[j]; break }
    }

    // Tiered amounts for realistic feel
    const tier = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296
    let amount: number
    if (tier < 0.08) {
      amount = randomInt(500, 2000) // whale
    } else if (tier < 0.30) {
      amount = randomInt(200, 500) // medium-high
    } else if (tier < 0.65) {
      amount = randomInt(50, 200) // medium
    } else {
      amount = randomInt(5, 50) // small
    }

    const multiplier = color === "white" ? 14 : 2

    bets.push({
      round_id: roundId,
      user_id: `bot-${name.replace(/\s+/g, '').toLowerCase()}`,
      color,
      amount,
      multiplier,
      status: "pending",
      payout: 0,
      is_bot: true,
    })
  }

  return bets
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    )

    const now = new Date()

    // Buscar último round
    const { data: lastRound } = await supabase
      .from("double_rounds")
      .select("*")
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle()

    // Se não há round ativo, ou status é antigo/desconhecido, criar um novo
    const isOldStatus = lastRound && !["betting", "spinning", "finished"].includes(lastRound.status);
    if (!lastRound || isOldStatus ||
        (lastRound.status === "finished" &&
         now.getTime() - new Date(lastRound.finished_at || lastRound.created_at).getTime() > FINISHED_DELAY_MS)) {

      const roundNumber = lastRound ? lastRound.round_number + 1 : 1
      const bettingEndsAt = new Date(now.getTime() + BETTING_SECONDS * 1000)

      const { data: newRound, error: createError } = await supabase
        .from("double_rounds")
        .insert({
          round_number: roundNumber,
          status: "betting",
          betting_ends_at: bettingEndsAt.toISOString(),
          started_at: now.toISOString(),
        })
        .select()
        .single()

      if (createError) throw createError

      // Gerar bot bets iniciais (mais serão adicionados gradualmente)
      const botBets = generateBotBets(newRound.id, randomInt(3, 5))
      if (botBets.length > 0) {
        await supabase.from("double_bets").insert(botBets)
      }

      return new Response(JSON.stringify({
        success: true,
        round: newRound,
        action: "created",
        bot_bets: botBets.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Se está em betting e expirou → ir para spinning
    if (lastRound.status === "betting" && lastRound.betting_ends_at &&
        now >= new Date(lastRound.betting_ends_at)) {

      const result = drawResult()
      const spinStartedAt = new Date()
      const spinningEndsAt = new Date(spinStartedAt.getTime() + SPINNING_SECONDS * 1000)

      const { data: updatedRound, error: spinError } = await supabase
        .from("double_rounds")
        .update({
          status: "spinning",
          result_number: result.number,
          result_color: result.color,
          spin_started_at: spinStartedAt.toISOString(),
          spinning_ends_at: spinningEndsAt.toISOString(),
          spin_duration_ms: SPIN_DURATION_MS,
        })
        .eq("id", lastRound.id)
        .select()
        .single()

      if (spinError) throw spinError

      // Inserir no histórico
      await supabase.from("double_history").insert({
        round_id: lastRound.id,
        color: result.color,
        number: result.number,
        multiplier: result.color === "white" ? 14 : 2,
      })

      return new Response(JSON.stringify({
        success: true,
        round: updatedRound,
        action: "spinning",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Se está em spinning e expirou → processar pagamentos e finalizar
    if (lastRound.status === "spinning" && lastRound.spinning_ends_at &&
        now >= new Date(lastRound.spinning_ends_at)) {

      const resultColor = lastRound.result_color!
      const multiplier = resultColor === "white" ? 14 : 2

      // Buscar todas as bets pendentes desta rodada
      const { data: bets } = await supabase
        .from("double_bets")
        .select("*")
        .eq("round_id", lastRound.id)
        .eq("status", "pending")

      if (bets) {
        for (const bet of bets) {
          const won = bet.color === resultColor
          const payout = won ? Number(bet.amount) * multiplier : 0

          await supabase
            .from("double_bets")
            .update({ status: won ? "won" : "lost", payout })
            .eq("id", bet.id)

          if (won && payout > 0 && !bet.is_bot) {
            await supabase.rpc("increment_balance", {
              user_id: bet.user_id,
              amount: payout,
            })
            await supabase.from("transactions").insert({
              id: crypto.randomUUID(),
              user_id: bet.user_id,
              amount: payout,
              type: "deposit",
              status: "completed",
              pix_code: `DOUBLE_WIN_${lastRound.round_number}`,
            })
          }
        }
      }

      const finishedAt = new Date()

      const { data: finishedRound, error: finishError } = await supabase
        .from("double_rounds")
        .update({
          status: "finished",
          finished_at: finishedAt.toISOString(),
        })
        .eq("id", lastRound.id)
        .select()
        .single()

      if (finishError) throw finishError

      return new Response(JSON.stringify({
        success: true,
        round: finishedRound,
        action: "finished",
        total_bets: bets?.length || 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    // Se ainda está em betting com tempo sobrando, adicionar bots gradualmente
    if (lastRound.status === "betting" && lastRound.betting_ends_at) {
      const timeRemaining = new Date(lastRound.betting_ends_at).getTime() - now.getTime()
      if (timeRemaining > 4000) {
        const { count } = await supabase
          .from("double_bets")
          .select("*", { count: "exact", head: true })
          .eq("round_id", lastRound.id)
          .eq("is_bot", true)

        const targetMin = 10
        const targetMax = 18
        const current = count || 0

        if (current < targetMin) {
          const addCount = Math.min(randomInt(1, 3), targetMax - current)
          const additional = generateBotBets(lastRound.id, addCount)
          if (additional.length > 0) {
            await supabase.from("double_bets").insert(additional)
          }
        }
      }
    }

    // Round ainda em andamento — retornar estado atual
    return new Response(JSON.stringify({
      success: true,
      round: lastRound,
      action: "current",
      time_remaining_ms: lastRound.betting_ends_at
        ? Math.max(0, new Date(lastRound.betting_ends_at).getTime() - now.getTime())
        : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })

  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})
