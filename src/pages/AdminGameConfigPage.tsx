import React, { useState, useEffect } from "react";
import { Save, RotateCcw, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { fetchGameConfig, updateGameConfig, getDefaultConfig, DoubleConfig, MinesConfig } from "@/lib/gameConfig";
import { showSuccess, showError } from "@/utils/toast";

export default function AdminGameConfigPage() {
  const [activeGame, setActiveGame] = useState<"double" | "mines">("double");
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [jsonText, setJsonText] = useState("");

  const loadConfig = async () => {
    setLoading(true);
    const data = await fetchGameConfig(activeGame);
    setConfig(data);
    setJsonText(JSON.stringify(data, null, 2));
    setLoading(false);
  };

  useEffect(() => {
    loadConfig();
  }, [activeGame]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsed = JSON.parse(jsonText);
      const ok = await updateGameConfig(activeGame, parsed);
      if (ok) {
        setConfig(parsed);
        showSuccess("Configuração salva!");
        setEditMode(false);
      } else {
        showError("Erro ao salvar");
      }
    } catch (e: any) {
      showError("JSON inválido: " + e.message);
    }
    setSaving(false);
  };

  const handleReset = () => {
    const def = getDefaultConfig(activeGame);
    setJsonText(JSON.stringify(def, null, 2));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#ffcc00]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold">Controle de Dificuldade dos Jogos</h3>
          <p className="text-gray-400 text-sm mt-1">
            Configure as probabilidades e dificuldade de cada jogo por tier de rodadas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setActiveGame("double"); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeGame === "double" ? "bg-[#ffcc00] text-black" : "bg-[#13161d] text-gray-400 border border-[#1c212b]"
            }`}
          >
            Double
          </button>
          <button
            onClick={() => { setActiveGame("mines"); }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeGame === "mines" ? "bg-[#ffcc00] text-black" : "bg-[#13161d] text-gray-400 border border-[#1c212b]"
            }`}
          >
            Mines
          </button>
        </div>
      </div>

      {config && (
        <>
          <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black uppercase tracking-wider flex items-center gap-2">
                {activeGame === "double" ? "🎰 Double - Tiers de Dificuldade" : "💣 Mines - Tiers de Dificuldade"}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#13161d] border border-[#1c212b] text-gray-400 hover:text-white text-[10px] font-black uppercase tracking-wider transition-all"
                >
                  <RotateCcw size={12} /> Restaurar Padrão
                </button>
                <button
                  onClick={() => setEditMode(!editMode)}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                    editMode ? "bg-gray-600 text-white" : "bg-[#13161d] border border-[#1c212b] text-gray-400"
                  }`}
                >
                  {editMode ? "Cancelar" : "Editar JSON"}
                </button>
              </div>
            </div>

            {editMode ? (
              <div className="space-y-4">
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="w-full h-96 bg-[#06070a] border border-[#1c212b] rounded-2xl p-4 text-xs font-mono text-gray-300 focus:border-[#ffcc00] focus:outline-none resize-y"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-[#ffcc00] text-black font-black px-6 py-3 rounded-xl text-xs uppercase tracking-wider hover:bg-[#e6b800] transition-all disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                    Salvar Configuração
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {config.difficultyTiers.map((tier: any, idx: number) => (
                  <div key={idx} className="bg-[#06070a] rounded-2xl p-5 border border-[#1c212b]/60">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-[#ffcc00] uppercase tracking-wider">
                          Tier {idx + 1}
                        </span>
                        <span className="text-sm font-bold text-white">{tier.name}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-[#13161d] px-3 py-1 rounded-full border border-[#1c212b]">
                        Rodadas {tier.roundStart} - {tier.roundEnd === 999999 ? "∞" : tier.roundEnd}
                      </span>
                    </div>

                    {activeGame === "double" && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#13161d] rounded-xl p-4 text-center border border-red-500/20">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Red</div>
                          <div className="text-2xl font-black text-red-500">{(tier.probabilities.red * 100).toFixed(1)}%</div>
                          <div className="text-xs text-gray-500 mt-1">2x payout</div>
                        </div>
                        <div className="bg-[#13161d] rounded-xl p-4 text-center border border-gray-500/20">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Black</div>
                          <div className="text-2xl font-black text-gray-300">{(tier.probabilities.black * 100).toFixed(1)}%</div>
                          <div className="text-xs text-gray-500 mt-1">2x payout</div>
                        </div>
                        <div className="bg-[#13161d] rounded-xl p-4 text-center border border-yellow-500/20">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">White</div>
                          <div className="text-2xl font-black text-yellow-400">{(tier.probabilities.white * 100).toFixed(1)}%</div>
                          <div className="text-xs text-gray-500 mt-1">14x payout</div>
                        </div>
                      </div>
                    )}

                    {activeGame === "mines" && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#13161d] rounded-xl p-4 border border-[#1c212b]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Ajuste de Minas</div>
                          <div className="text-2xl font-black text-white">
                            {tier.mineAdjustment > 0 ? "+" : ""}{tier.mineAdjustment}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Minas adicionais/removidas</div>
                        </div>
                        <div className="bg-[#13161d] rounded-xl p-4 border border-[#1c212b]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Bônus Multiplicador</div>
                          <div className="text-2xl font-black text-emerald-400">
                            {(tier.multiplierBonus * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500 mt-1">Bônus no multiplicador</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#0d0f14] border border-[#1c212b] rounded-3xl p-6">
            <h4 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2">
              <AlertCircle size={14} className="text-[#ffcc00]" />
              Informações
            </h4>
            <ul className="space-y-2 text-xs text-gray-400 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                As probabilidades do <strong>Double</strong> definem a chance de cada cor ser sorteada. A soma deve ser 1.0 (100%).
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                O <strong>Ajuste de Minas</strong> no Mines modifica a quantidade real de minas no grid (valor negativo = mais fácil).
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={12} className="text-emerald-500 mt-0.5 shrink-0" />
                As configurações são aplicadas em tempo real nos jogos. Clique em "Salvar" para aplicar.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
