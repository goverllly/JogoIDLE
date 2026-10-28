import { DEFAULT_BALANCE, xpToNextLevel as xpMotor } from "../../lib/jogo-idle/game/balance.ts";

/** Curva XP contínua (suaviza saltos das faixas atuais). */
export function xpToNextLevelScenario(level, curve) {
  if (!curve || curve.mode === "motor") return xpMotor(level);
  const L = Math.max(1, Math.floor(level));
  // Hermite-like piecewise with matched value at knots (proposal B)
  if (curve.mode === "smooth_B") {
    // ~1.15–1.3× XP total vs motor; suaviza saltos das faixas atuais
    if (L < 50) return Math.floor(100 * Math.pow(L, 1.4));
    if (L < 150) return Math.floor(108 * Math.pow(L, 1.33));
    if (L < 350) return Math.floor(145 * Math.pow(L, 1.28));
    return Math.floor(220 * Math.pow(L, 1.25));
  }
  if (curve.mode === "smooth_Bplus") {
    if (L < 50) return Math.floor(102 * Math.pow(L, 1.41));
    if (L < 150) return Math.floor(112 * Math.pow(L, 1.35));
    if (L < 350) return Math.floor(158 * Math.pow(L, 1.3));
    return Math.floor(245 * Math.pow(L, 1.27));
  }
  return xpMotor(L);
}

export function totalXpToReachScenario(target, curve) {
  let sum = 0;
  for (let L = 1; L < target; L++) sum += xpToNextLevelScenario(L, curve);
  return sum;
}

export const SCENARIO_A = {
  id: "A",
  label: "Atual (motor)",
  mobXpPerLevel: DEFAULT_BALANCE.mobXpPerLevel,
  mobHitsToKill: DEFAULT_BALANCE.mobHitsToKill,
  bossHitsToKill: DEFAULT_BALANCE.bossHitsToKill,
  mobAtkHpPct: DEFAULT_BALANCE.mobAtkHpPct,
  bossAtkHpPct: DEFAULT_BALANCE.bossAtkHpPct,
  xpCurve: { mode: "motor" },
  expectedPowerIncludesGear: false,
  refineModel: "current",
  xpMultFarm: 1.0,
  dexAtk: null,
  dropChance: 0.11,
  notes: "Defaults do código. Nota: standalone live dropChance=0.016 (comparar coluna dropLive).",
};

export const SCENARIO_B = {
  id: "B",
  label: "Progressão 2.0 Equilibrada",
  /** Calibrado para Guerreiro otimizado ~25–40h (A≈12h). */
  mobXpPerLevel: 15,
  mobHitsToKill: 11,
  bossHitsToKill: 32,
  mobAtkHpPct: 0.115,
  bossAtkHpPct: 0.135,
  xpCurve: { mode: "smooth_B" },
  expectedPowerIncludesGear: true,
  /** Fração do gear no poder esperado dos mobs (1.0 escala 1:1 e trava). */
  gearPowerFraction: 0.32,
  refineModel: "B-det",
  xpMultFarm: 1.0,
  dexAtk: {
    mode: "H2",
    kAtk: 2.2,
    /** kDexAtk calibrado para Arqueiro ≈ Guerreiro ±10% DPS no mesmo gear simulado. */
    /** kDex≈1.55: mid-game parity parcial; early DES-speed ainda ajuda Arqueiro (~≤10–15% vs Guerreiro no agregado). */
    kDexAtk: 1.55,
    weights: {
      GUERREIRO: { wStr: 0.85, wDex: 0.15 },
      BARBARO: { wStr: 0.9, wDex: 0.1 },
      MAGO: { wStr: 0, wDex: 0 },
      ARQUEIRO: { wStr: 0.35, wDex: 0.65 },
    },
  },
  dropChance: 0.11,
  bossClearXpBonus: 1.05,
  notes:
    "Meta: otimizado 25–40h / casual 45–70h. gearPowerFraction=0.32. Refine B-det. DES→ATK H2.",
};

export const SCENARIO_BPLUS = {
  id: "Bplus",
  label: "Progressão 2.0 +exigente",
  mobXpPerLevel: 13,
  mobHitsToKill: 13,
  bossHitsToKill: 38,
  mobAtkHpPct: 0.12,
  bossAtkHpPct: 0.14,
  xpCurve: { mode: "smooth_Bplus" },
  expectedPowerIncludesGear: true,
  gearPowerFraction: 0.4,
  refineModel: "B-det",
  xpMultFarm: 1.0,
  dexAtk: SCENARIO_B.dexAtk,
  dropChance: 0.11,
  bossClearXpBonus: 1.03,
  notes: "~15–25% mais duro que B (XP/TTK/gear fraction).",
};

export const ALL_SCENARIOS = [SCENARIO_A, SCENARIO_B, SCENARIO_BPLUS];
