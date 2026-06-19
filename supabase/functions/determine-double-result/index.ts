import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { round_id } = await req.json();
    if (!round_id) throw new Error("round_id is required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: round } = await supabase
      .from("double_rounds")
      .select("*")
      .eq("id", round_id)
      .single();

    if (!round) throw new Error("Round not found");
    if (round.status !== "betting_open") throw new Error("Round is not in betting_open status");

    const rand = crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
    const colors = ["red", "black", "white"];
    const probs = [0.4827, 0.4827, 0.0346];
    let cum = 0;
    let color = "red";
    for (let i = 0; i < colors.length; i++) {
      cum += probs[i];
      if (rand < cum) { color = colors[i]; break; }
    }

    const number = color === "white" ? 0 : (Math.floor(crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296 * 14) + 1);
    const multiplier = color === "white" ? 14 : 2;

    await supabase
      .from("double_rounds")
      .update({ status: "rolling", result_color: color, result_number: number })
      .eq("id", round_id);

    await supabase
      .from("double_history")
      .insert({ round_id, color, number, multiplier });

    return new Response(JSON.stringify({ success: true, color, number, multiplier }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
