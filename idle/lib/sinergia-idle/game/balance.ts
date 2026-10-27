// @ts-nocheck
/**
 * Constantes de balanceamento do Sinergia IDLE.
 * Admin pode sobrescrever via `__world.balance` no catálogo.
 */

export const MORTAL_LEVEL_CAP = 500;
export const CELESTIAL_LEVEL_CAP = 700;
export const POINTS_PER_LEVEL = 5;
export const CELESTIAL_POINTS_PER_LEVEL = 10;
export const CELESTIAL_ASCEND_BONUS = 20;
/** Ouro consumido no ritual da Divindade. */
export const DIVINDADE_GOLD_COST = 10_000_000;
/** Chance base de dropar Suco Celestial no MEGA BOSS da Prova Divina (0–1). */
export const SUCO_CELESTIAL_DROP_CHANCE = 0.007;
export const PROVA_DIVINA_ZONE_ID = 'prova_divina';
export const MAX_REFINE = 10;
export const REFINE_STAT_BONUS = 5;
/** Chance base de dropar Refinador no boss da macro (0–1). */
export const REFINE_DROP_CHANCE = 0.012;

/** Multiplicadores de atributo → combate. */
export const DEFAULT_BALANCE = {
  kAtk: 2.2,
  kMagicAtk: 2.4,
  kHp: 14,
  kMp: 12,
  kDefCon: 1.2,
  kDefStr: 0.25,
  baseAttack: 6,
  baseHp: 90,
  baseMp: 45,
  baseDefense: 3,
  baseIntervalMs: 1450,
  minIntervalMs: 420,
  kSpeed: 7,
  levelHp: 6,
  levelMp: 3,
  critPerDex: 0.0025,
  maxCrit: 0.45,
  /**
   * Escala de mobs (temporada): leve dificuldade no TTK.
   * Alvo on-level: mob ~8–12 hits; boss ~24–32 hits.
   */
  mobHitsToKill: 10,
  bossHitsToKill: 28,
  /** Fração do HP do player por hit do mob (~morte possível se gear atrasado). */
  mobAtkHpPct: 0.11,
  bossAtkHpPct: 0.13,
  bossHpMult: 1,
  bossAtkMult: 1,
  /** Drop no boss vs trash — pico no chefe da macro. */
  bossDropMult: 2.5,
  refineDropChance: REFINE_DROP_CHANCE,
  sucoCelestialDropChance: SUCO_CELESTIAL_DROP_CHANCE,
  divindadeGoldCost: DIVINDADE_GOLD_COST,
  pointsPerLevel: POINTS_PER_LEVEL,
  celestialPointsPerLevel: CELESTIAL_POINTS_PER_LEVEL,
  /** XP/ouro por kill (scaleMonster): ritmo de temporada ~90d com 1–2h/dia. */
  mobXpPerLevel: 20,
  mobGoldPerLevel: 5.5,
  /** Wave mínima de mobs comuns até o boss (sem override de zona). */
  defaultBossWaveMin: 8,
};

let balanceOverrides = {};

export function getBalance() {
  return { ...DEFAULT_BALANCE, ...balanceOverrides };
}

export function setBalanceOverrides(partial, { persist = false } = {}) {
  if (partial == null || partial.clear) {
    balanceOverrides = {};
  } else if (typeof partial === 'object') {
    const next = { ...balanceOverrides };
    for (const [k, v] of Object.entries(partial)) {
      if (v == null || v === '') {
        delete next[k];
        continue;
      }
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) next[k] = n;
    }
    balanceOverrides = next;
  }
  return getBalance();
}

export function getBalanceOverrides() {
  return { ...balanceOverrides };
}

export function pointsForLevelUp(character) {
  const b = getBalance();
  return character?.ascension === 'CELESTIAL'
    ? b.celestialPointsPerLevel
    : b.pointsPerLevel;
}

export function levelCapFor(character) {
  return character?.ascension === 'CELESTIAL' ? CELESTIAL_LEVEL_CAP : MORTAL_LEVEL_CAP;
}

/** XP L → L+1 (suavizado para ir até 500 sem explosão). */
export function xpToNextLevel(level) {
  const L = Math.max(1, Math.floor(level));
  if (L < 50) return Math.floor(100 * Math.pow(L, 1.4));
  if (L < 150) return Math.floor(120 * Math.pow(L, 1.32));
  if (L < 350) return Math.floor(160 * Math.pow(L, 1.28));
  return Math.floor(220 * Math.pow(L, 1.22));
}

/** XP acumulada do nível 1 até `targetLevel` (exclusive o XP do nível alvo). */
export function totalXpToReach(targetLevel) {
  const cap = Math.max(1, Math.floor(targetLevel));
  let sum = 0;
  for (let L = 1; L < cap; L += 1) sum += xpToNextLevel(L);
  return sum;
}
