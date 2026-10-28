/**
 * Agregado de desempenho da caça atual (estado compacto no JSON do personagem).
 * Autoridade: só o servidor incrementa via processFarm.
 *
 * Denominadores:
 * - huntMs: tempo de caça processado (ticks simulados) → XP/h, ouro/h, kills/h, dpsHunt
 * - combatMs: tempo em confronto (ticks com alvo) → DPS observado em combate
 * - fightElapsedMs (em combat): duração do confronto atual → TTK ao matar
 */

export const HUNT_RATE_MIN_MS = 60_000;
export const HUNT_RATE_MIN_KILLS = 3;
export const HUNT_RATE_ALT_MS = 120_000;
export const HUNT_TTK_MIN_COMMON = 3;
export const HUNT_TTK_MIN_BOSS = 1;
export const HUNT_COMBAT_DPS_MIN_MS = 3_000;

export type HuntPerfState = {
  startedAt: string | null;
  zoneId: string | null;
  zoneName: string | null;
  huntMs: number;
  combatMs: number;
  xp: number;
  goldCombat: number;
  goldPetSell: number;
  goldDropSold: number;
  kills: number;
  bossKills: number;
  faints: number;
  /** Dano efetivo aplicado a monstros (sem overkill, sem dano recebido). */
  damageDealt: number;
  fightMsCommon: number;
  fightMsBoss: number;
  killsCommonTimed: number;
  killsBossTimed: number;
  /** Tempo de catch-up offline excluído desta janela (telemetria). */
  offlineExcludedMs: number;
};

export type HuntPerfPublic = {
  windowLabel: string;
  disclaimer: string;
  startedAt: string | null;
  zoneId: string | null;
  zoneName: string | null;
  huntMs: number;
  combatMs: number;
  xp: number;
  goldCombat: number;
  goldPetSell: number;
  goldDropSold: number;
  goldHuntTotal: number;
  kills: number;
  killsCommon: number;
  bossKills: number;
  faints: number;
  damageDealt: number;
  offlineExcludedMs: number;
  xpPerHour: number | null;
  goldPerHour: number | null;
  goldCombatPerHour: number | null;
  goldExtraPerHour: number | null;
  killsPerHour: number | null;
  /** DPS observado em combate (damageDealt / combatSeconds). */
  dpsCombat: number | null;
  /** Dano médio por segundo de caça (damageDealt / huntSeconds). */
  dpsHunt: number | null;
  /** Estimativa ataque básico (+crit, Mage); sem skills. */
  dpsEstimated: number | null;
  dpsEstimatedLabel: string;
  ttkCommonMs: number | null;
  ttkBossMs: number | null;
  availability: {
    rates: boolean;
    ttkCommon: boolean;
    ttkBoss: boolean;
    dpsCombat: boolean;
    dpsHunt: boolean;
    dpsEstimated: boolean;
  };
};

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function emptyHuntPerf(zone?: { id?: string; name?: string } | null): HuntPerfState {
  return {
    startedAt: new Date().toISOString(),
    zoneId: zone?.id ?? null,
    zoneName: zone?.name ?? null,
    huntMs: 0,
    combatMs: 0,
    xp: 0,
    goldCombat: 0,
    goldPetSell: 0,
    goldDropSold: 0,
    kills: 0,
    bossKills: 0,
    faints: 0,
    damageDealt: 0,
    fightMsCommon: 0,
    fightMsBoss: 0,
    killsCommonTimed: 0,
    killsBossTimed: 0,
    offlineExcludedMs: 0,
  };
}

export function ensureHuntPerf(
  character: { huntPerf?: unknown },
  zone?: { id?: string; name?: string } | null,
): HuntPerfState {
  const raw = character.huntPerf;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const fresh = emptyHuntPerf(zone);
    character.huntPerf = fresh;
    return fresh;
  }
  const src = raw as Record<string, unknown>;
  const perf: HuntPerfState = {
    startedAt: typeof src.startedAt === "string" ? src.startedAt : new Date().toISOString(),
    zoneId: typeof src.zoneId === "string" ? src.zoneId : zone?.id ?? null,
    zoneName: typeof src.zoneName === "string" ? src.zoneName : zone?.name ?? null,
    huntMs: Math.max(0, num(src.huntMs)),
    combatMs: Math.max(0, num(src.combatMs)),
    xp: Math.max(0, num(src.xp)),
    goldCombat: Math.max(0, num(src.goldCombat)),
    goldPetSell: Math.max(0, num(src.goldPetSell)),
    goldDropSold: Math.max(0, num(src.goldDropSold)),
    kills: Math.max(0, Math.floor(num(src.kills))),
    bossKills: Math.max(0, Math.floor(num(src.bossKills))),
    faints: Math.max(0, Math.floor(num(src.faints))),
    damageDealt: Math.max(0, num(src.damageDealt)),
    fightMsCommon: Math.max(0, num(src.fightMsCommon)),
    fightMsBoss: Math.max(0, num(src.fightMsBoss)),
    killsCommonTimed: Math.max(0, Math.floor(num(src.killsCommonTimed))),
    killsBossTimed: Math.max(0, Math.floor(num(src.killsBossTimed))),
    offlineExcludedMs: Math.max(0, num(src.offlineExcludedMs)),
  };
  character.huntPerf = perf;
  return perf;
}

export function resetHuntPerf(
  character: { huntPerf?: unknown },
  zone?: { id?: string; name?: string } | null,
): HuntPerfState {
  const fresh = emptyHuntPerf(zone);
  character.huntPerf = fresh;
  return fresh;
}

export function ratesSampleReady(perf: HuntPerfState): boolean {
  if (perf.huntMs >= HUNT_RATE_ALT_MS) return true;
  return perf.huntMs >= HUNT_RATE_MIN_MS && perf.kills >= HUNT_RATE_MIN_KILLS;
}

function safeRate(amount: number, ms: number): number | null {
  if (!(ms > 0) || !Number.isFinite(amount)) return null;
  const perHour = (amount / ms) * 3_600_000;
  if (!Number.isFinite(perHour) || perHour < 0) return null;
  return perHour;
}

function safeDps(damage: number, ms: number): number | null {
  if (!(ms > 0) || !Number.isFinite(damage)) return null;
  const dps = damage / (ms / 1000);
  if (!Number.isFinite(dps) || dps < 0) return null;
  return dps;
}

/**
 * DPS estimado: ataque básico esperado vs DEF do alvo (ou DEF 0).
 * Inclui crit e mult Mage; NÃO inclui skills de combate.
 */
export function theoreticalBasicDps(
  stats: {
    attack?: number;
    attackIntervalMs?: number;
    critChance?: number;
  },
  opts?: { monsterDefense?: number; classId?: string; mageBasicMult?: number },
): number | null {
  const atk = Math.max(0, num(stats.attack));
  const interval = Math.max(200, num(stats.attackIntervalMs, 2000));
  const crit = Math.min(1, Math.max(0, num(stats.critChance)));
  const mit = Math.max(0, Math.floor(num(opts?.monsterDefense)));
  let effectiveAtk = Math.max(1, Math.floor(atk));
  if (opts?.classId === "MAGO") {
    const mult = num(opts.mageBasicMult, 0.55);
    effectiveAtk = Math.max(1, Math.floor(effectiveAtk * mult));
  }
  const base = Math.max(1, effectiveAtk - mit);
  const expected = base * (1 - crit) + Math.floor(base * 1.8) * crit;
  const dps = expected / (interval / 1000);
  if (!Number.isFinite(dps) || dps <= 0) return null;
  return dps;
}

export function computeHuntRates(
  character: {
    huntPerf?: unknown;
    classId?: string;
    stats?: unknown;
    target?: { defense?: number } | null;
  },
  liveStats?: {
    attack?: number;
    attackIntervalMs?: number;
    critChance?: number;
  },
): HuntPerfPublic {
  const perf = ensureHuntPerf(character);
  const ratesOk = ratesSampleReady(perf);
  const killsCommon = Math.max(0, perf.kills - perf.bossKills);
  const goldHuntTotal = perf.goldCombat + perf.goldPetSell + perf.goldDropSold;

  const ttkCommonMs =
    perf.killsCommonTimed >= HUNT_TTK_MIN_COMMON && perf.fightMsCommon > 0
      ? perf.fightMsCommon / perf.killsCommonTimed
      : null;
  const ttkBossMs =
    perf.killsBossTimed >= HUNT_TTK_MIN_BOSS && perf.fightMsBoss > 0
      ? perf.fightMsBoss / perf.killsBossTimed
      : null;

  const dpsCombat =
    perf.combatMs >= HUNT_COMBAT_DPS_MIN_MS ? safeDps(perf.damageDealt, perf.combatMs) : null;
  const dpsHunt = ratesOk ? safeDps(perf.damageDealt, perf.huntMs) : null;

  const stats = liveStats || (character.stats as typeof liveStats);
  const dpsEstimated = stats
    ? theoreticalBasicDps(stats, {
        monsterDefense: character.target?.defense,
        classId: character.classId,
      })
    : null;

  return {
    windowLabel: "Caça atual",
    disclaimer:
      "Indicadores de eficiência da caça no IDLE — não medem desempenho profissional nem produtividade laboral.",
    startedAt: perf.startedAt,
    zoneId: perf.zoneId,
    zoneName: perf.zoneName,
    huntMs: perf.huntMs,
    combatMs: perf.combatMs,
    xp: perf.xp,
    goldCombat: perf.goldCombat,
    goldPetSell: perf.goldPetSell,
    goldDropSold: perf.goldDropSold,
    goldHuntTotal,
    kills: perf.kills,
    killsCommon,
    bossKills: perf.bossKills,
    faints: perf.faints,
    damageDealt: perf.damageDealt,
    offlineExcludedMs: perf.offlineExcludedMs,
    xpPerHour: ratesOk ? safeRate(perf.xp, perf.huntMs) : null,
    goldPerHour: ratesOk ? safeRate(goldHuntTotal, perf.huntMs) : null,
    goldCombatPerHour: ratesOk ? safeRate(perf.goldCombat, perf.huntMs) : null,
    goldExtraPerHour: ratesOk
      ? safeRate(perf.goldPetSell + perf.goldDropSold, perf.huntMs)
      : null,
    killsPerHour: ratesOk ? safeRate(perf.kills, perf.huntMs) : null,
    dpsCombat,
    dpsHunt,
    dpsEstimated,
    dpsEstimatedLabel: "DPS estimado (ataque básico)",
    ttkCommonMs: ttkCommonMs != null && Number.isFinite(ttkCommonMs) ? ttkCommonMs : null,
    ttkBossMs: ttkBossMs != null && Number.isFinite(ttkBossMs) ? ttkBossMs : null,
    availability: {
      rates: ratesOk,
      ttkCommon: ttkCommonMs != null,
      ttkBoss: ttkBossMs != null,
      dpsCombat: dpsCombat != null,
      dpsHunt: dpsHunt != null,
      dpsEstimated: dpsEstimated != null,
    },
  };
}
