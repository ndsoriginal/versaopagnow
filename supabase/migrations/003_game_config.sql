CREATE TABLE IF NOT EXISTS game_config (
  game_id TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO game_config (game_id, config) VALUES
('double', '{
  "difficultyTiers": [
    { "name": "Iniciante", "roundStart": 1, "roundEnd": 5, "probabilities": { "red": 0.55, "black": 0.42, "white": 0.03 } },
    { "name": "Normal", "roundStart": 6, "roundEnd": 20, "probabilities": { "red": 0.4667, "black": 0.4667, "white": 0.0666 } },
    { "name": "Veterano", "roundStart": 21, "roundEnd": 999999, "probabilities": { "red": 0.45, "black": 0.45, "white": 0.10 } }
  ],
  "payouts": { "red": 2, "black": 2, "white": 14 },
  "segmentDisplay": { "red": 7, "black": 7, "white": 1 }
}'),
('mines', '{
  "difficultyTiers": [
    { "name": "Iniciante", "roundStart": 1, "roundEnd": 5, "mineAdjustment": -3, "multiplierBonus": 0.2 },
    { "name": "Normal", "roundStart": 6, "roundEnd": 20, "mineAdjustment": 0, "multiplierBonus": 0 },
    { "name": "Veterano", "roundStart": 21, "roundEnd": 999999, "mineAdjustment": -1, "multiplierBonus": 0.5 }
  ],
  "gridSize": 5,
  "maxMines": 24
}');
