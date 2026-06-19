import { supabase } from "@/lib/supabase";

export type DifficultyTier = {
  name: string;
  roundStart: number;
  roundEnd: number;
};

export type DoubleConfig = {
  difficultyTiers: (DifficultyTier & {
    probabilities: { red: number; black: number; white: number };
  })[];
  payouts: { red: number; black: number; white: number };
  segmentDisplay: { red: number; black: number; white: number };
};

export type MinesConfig = {
  difficultyTiers: (DifficultyTier & {
    mineAdjustment: number;
    multiplierBonus: number;
  })[];
  gridSize: number;
  maxMines: number;
};

export type GameConfig = {
  double: DoubleConfig;
  mines: MinesConfig;
};

const DEFAULT_CONFIGS: Record<string, any> = {
  double: {
    difficultyTiers: [
      { name: "Iniciante", roundStart: 1, roundEnd: 5, probabilities: { red: 0.55, black: 0.42, white: 0.03 } },
      { name: "Normal", roundStart: 6, roundEnd: 20, probabilities: { red: 0.4667, black: 0.4667, white: 0.0666 } },
      { name: "Veterano", roundStart: 21, roundEnd: 999999, probabilities: { red: 0.45, black: 0.45, white: 0.10 } },
    ],
    payouts: { red: 2, black: 2, white: 14 },
    segmentDisplay: { red: 7, black: 7, white: 1 },
  },
  mines: {
    difficultyTiers: [
      { name: "Iniciante", roundStart: 1, roundEnd: 5, mineAdjustment: -3, multiplierBonus: 0.2 },
      { name: "Normal", roundStart: 6, roundEnd: 20, mineAdjustment: 0, multiplierBonus: 0 },
      { name: "Veterano", roundStart: 21, roundEnd: 999999, mineAdjustment: -1, multiplierBonus: 0.5 },
    ],
    gridSize: 5,
    maxMines: 24,
  },
};

function getTier(config: GameConfig[string], round: number) {
  return config.difficultyTiers.find(
    (t: any) => round >= t.roundStart && round <= t.roundEnd
  ) || config.difficultyTiers[config.difficultyTiers.length - 1];
}

export function pickDoubleResult(config: DoubleConfig, round: number): "red" | "black" | "white" {
  const tier = getTier(config, round) as DoubleConfig["difficultyTiers"][0];
  const { red, black, white } = tier.probabilities;
  const rand = Math.random();
  if (rand < red) return "red";
  if (rand < red + black) return "black";
  return "white";
}

export function getMinesConfig(config: MinesConfig, round: number, selectedMines: number) {
  const tier = getTier(config, round) as MinesConfig["difficultyTiers"][0];
  const effectiveMines = Math.max(1, selectedMines + tier.mineAdjustment);
  return { effectiveMines, multiplierBonus: tier.multiplierBonus };
}

export function getDifficultyName(config: GameConfig[string], round: number): string {
  const tier = getTier(config, round) as DifficultyTier;
  return tier?.name || "Normal";
}

let configCache: Record<string, any> = {};

export async function fetchGameConfig<T = GameConfig[string]>(gameId: "double" | "mines"): Promise<T> {
  if (configCache[gameId]) return configCache[gameId] as T;
  try {
    const { data, error } = await supabase
      .from("game_config")
      .select("config")
      .eq("game_id", gameId)
      .maybeSingle();
    if (!error && data?.config) {
      configCache[gameId] = data.config;
      return data.config as T;
    }
  } catch {}
  return DEFAULT_CONFIGS[gameId] as T;
}

export async function updateGameConfig(gameId: string, config: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("game_config")
      .upsert({ game_id: gameId, config, updated_at: new Date().toISOString() });
    if (!error) {
      configCache[gameId] = config;
      return true;
    }
  } catch {}
  return false;
}

export function getDefaultConfig(gameId: string) {
  return DEFAULT_CONFIGS[gameId];
}

export function clearGameConfigCache() {
  configCache = {};
}
