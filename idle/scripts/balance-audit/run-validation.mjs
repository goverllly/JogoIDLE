/**
 * Validação Progressão 2.0 — isolada, N≥200, 4 classes, cenários A/B/B+.
 * Uso: cd idle && npx tsx scripts/balance-audit/run-validation.mjs
 */
import {
  ensureOut,
  writeCsv,
  writeJson,
  writeMd,
  computeStatsMirror,
  makeRng,
  hours,
  loadStandaloneCatalog,
  OUT,
} from "./lib.mjs";
import { runFidelityChecks } from "./fidelity.mjs";
import { spendPoints, CLASS_PRIMARY } from "./profiles.mjs";
import { sampleTtk } from "./combat-loop.mjs";
import { expectedGearBonus, totalRefineCostToMax, refineCostTable } from "./loot-model.mjs";
import {
  ALL_SCENARIOS,
  SCENARIO_A,
  SCENARIO_B,
  SCENARIO_BPLUS,
  xpToNextLevelScenario,
  totalXpToReachScenario,
} from "./scenarios.mjs";
import {
  DEFAULT_BALANCE,
  POINTS_PER_LEVEL,
  CELESTIAL_POINTS_PER_LEVEL,
  CELESTIAL_ASCEND_BONUS,
  DIVINDADE_GOLD_COST,
  MORTAL_LEVEL_CAP,
} from "../../lib/jogo-idle/game/balance.ts";
import {
  BASE_ZONES,
  CLASSES,
  buildZoneBoss,
  zoneBossWaveSize,
  expectedPlayerPower,
} from "../../lib/jogo-idle/game/data.ts";

ensureOut();

const N_SEEDS = 200;
const MILESTONES = [50, 100, 200, 300, 400, 500];
const CLASS_IDS = Object.keys(CLASSES);

const fidelity = runFidelityChecks();
writeJson("v2_fidelity.json", fidelity);

const live = loadStandaloneCatalog();
writeJson("scenario_A_params.json", { ...SCENARIO_A, liveDropChance: live.dropChance });
writeJson("scenario_B_params.json", SCENARIO_B);
writeJson("scenario_Bplus_params.json", SCENARIO_BPLUS);

function scaleMonsterScenario(base, zone, scenario, playerGearPower = null) {
  const b = {
    ...DEFAULT_BALANCE,
    mobXpPerLevel: scenario.mobXpPerLevel,
    mobHitsToKill: scenario.mobHitsToKill,
    bossHitsToKill: scenario.bossHitsToKill,
    mobAtkHpPct: scenario.mobAtkHpPct,
    bossAtkHpPct: scenario.bossAtkHpPct,
  };
  const level = base.level || zone?.minLevel || 1;
  let pAtk;
  let pHp;
  let pDef;
  const baseline = expectedPlayerPower(level);
  if (scenario.expectedPowerIncludesGear && playerGearPower) {
    const f = scenario.gearPowerFraction ?? 0.4;
    pAtk = baseline.attack * (1 - f) + playerGearPower.attack * f;
    pHp = baseline.maxHp * (1 - f) + playerGearPower.maxHp * f;
    pDef = baseline.defense * (1 - f) + playerGearPower.defense * f;
  } else {
    pAtk = baseline.attack;
    pHp = baseline.maxHp;
    pDef = baseline.defense;
  }
  const hits = base.isBoss ? b.bossHitsToKill : b.mobHitsToKill;
  const atkPct = base.isBoss ? b.bossAtkHpPct : b.mobAtkHpPct;
  const defense = Math.max(1, Math.round(level * 0.7 + pAtk * 0.06 * (base.defMult || 1)));
  const chip = Math.max(1, Math.round(pAtk - defense));
  const hp = Math.max(30, Math.round(chip * hits * (base.hpMult || 1)));
  const attack = Math.max(3, Math.round(pHp * atkPct * (base.atkMult || 1) + pDef * 0.35));
  const xp = Math.max(
    8,
    Math.round(level * b.mobXpPerLevel * (base.xpMult || 1) * (base.isBoss ? 2.2 : 1)),
  );
  const gold = Math.max(
    3,
    Math.round(level * b.mobGoldPerLevel * (base.goldMult || 1) * (base.isBoss ? 2 : 1)),
  );
  return {
    name: base.name,
    level,
    hp: base.hpOverride ?? hp,
    attack: base.attackOverride ?? attack,
    defense: base.defenseOverride ?? defense,
    xp: base.xpOverride ?? xp,
    gold: base.goldOverride ?? gold,
    isBoss: Boolean(base.isBoss),
  };
}

function buildBossScenario(zone, scenario, playerGearPower) {
  // Prefer motor buildZoneBoss for A; for B/B+ rebuild with scenario scale
  if (scenario.id === "A") return buildZoneBoss(zone);
  const list = (zone.monsters || []).map((m) =>
    scaleMonsterScenario({ ...m, isBoss: false }, zone, scenario, playerGearPower),
  );
  if (!list.length) {
    return scaleMonsterScenario(
      { name: "Boss", level: zone.minLevel || 1, isBoss: true },
      zone,
      scenario,
      playerGearPower,
    );
  }
  const hp = Math.round(list.reduce((s, m) => s + m.hp, 0) * 1.1);
  const xp = Math.round(list.reduce((s, m) => s + m.xp, 0) * 1.75);
  const gold = Math.round(list.reduce((s, m) => s + m.gold, 0) * 1.75);
  const maxAtk = Math.max(...list.map((m) => m.attack));
  const maxLevel = Math.max(...list.map((m) => m.level));
  return {
    name: zone.bossName || `Chefe — ${zone.name}`,
    level: maxLevel,
    hp,
    attack: Math.max(1, Math.round(maxAtk * 1.35)),
    defense: Math.round(maxLevel * 1.4),
    xp,
    gold,
    isBoss: true,
  };
}

function pickZone(level, { celestial = false } = {}) {
  const list = BASE_ZONES.filter((z) => {
    if (z.requiresAscension === "CELESTIAL" && !celestial) return false;
    if (z.mortalOnly && celestial) return false;
    if (celestial && z.requiresAscension === "CELESTIAL" && level < (z.minLevel || 1)) return false;
    return (z.minLevel || 1) <= level;
  });
  return list[list.length - 1] || BASE_ZONES[0];
}

function buildPlayer(level, classId, scenario, plan = "balanced_primary") {
  const attrs = spendPoints(classId, level, POINTS_PER_LEVEL, plan);
  const gear = expectedGearBonus(level, {
    dropChance: scenario.dropChance,
    refineModel: scenario.refineModel,
    classId,
  });
  const stats = computeStatsMirror(attrs, level, DEFAULT_BALANCE, {
    classId,
    equipmentBonus: gear,
  });
  stats.attackFlat = gear.attack || 0;
  return {
    level,
    classId,
    attrs,
    stats,
    gear,
    primary: CLASS_PRIMARY[classId],
  };
}

function pct(arr, p) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * p))];
}

/**
 * Progressão até 500 com amostragem de TTK por nível.
 * Retorna marcos e tempo total.
 */
function simulateProgression(seed, classId, scenario, { casual = false } = {}) {
  const rng = makeRng(seed);
  let level = 1;
  let xp = 0;
  let gold = 0;
  let timeMs = 0;
  let kills = 0;
  let bosses = 0;
  let faints = 0;
  let bossClears = new Set();
  const milestones = {};
  // Casual: XP menor + zona 1 tier atrás + mais faints (downtime / rota subótima)
  const xpMult = casual ? 0.68 : scenario.xpMultFarm || 1;
  const maxMs = 120 * 3600_000;

  while (level < 500 && timeMs < maxMs) {
    const player = buildPlayer(level, classId, scenario);
    const zone = pickZone(casual ? Math.max(1, level - 18) : level);
    const gearPower = scenario.expectedPowerIncludesGear
      ? player.stats
      : expectedPlayerPower(level);

    const mobBase = zone.monsters[0];
    const mob = scaleMonsterScenario({ ...mobBase, isBoss: false }, zone, scenario, gearPower);
    const boss = buildBossScenario(zone, scenario, gearPower);

    const ttkMob = sampleTtk(player, mob, rng, 3, scenario.dexAtk);
    const ttkBoss = sampleTtk(player, boss, rng, 2, scenario.dexAtk);

    // 1 hora de caça
    const hourMs = 3_600_000;
    const wave = zoneBossWaveSize(zone);
    let hourXp = 0;
    let hourGold = 0;
    let hourKills = 0;
    let hourBoss = 0;
    let hourFaint = 0;
    let rem = hourMs;
    let w = 0;

    while (rem > 0) {
      const isBoss = w >= wave;
      const mon = isBoss ? boss : mob;
      const ttk = isBoss ? ttkBoss : ttkMob;
      let ttkMs = ttk.avgTtkMs;
      if (!Number.isFinite(ttkMs) || ttkMs <= 0) {
        // fallback: luta longa mas progressiva (evita soft-lock)
        ttkMs = player.stats.attackIntervalMs * 40;
        hourFaint += 0.2;
      }
      const faintP = Math.min(0.4, ttk.faintRate * (casual ? 0.55 : 0.4) + (casual ? 0.05 : 0));
      if (rng() < faintP) {
        hourFaint += 1;
        rem -= Math.min(ttkMs * (casual ? 1.2 : 1), rem);
        w = 0;
        continue;
      }
      if (ttkMs > rem) break;
      rem -= ttkMs;
      let rewardXp = Math.max(1, Math.floor(mon.xp * xpMult));
      if (isBoss && scenario.bossClearXpBonus) {
        rewardXp = Math.floor(rewardXp * scenario.bossClearXpBonus);
        bossClears.add(zone.id);
      }
      hourXp += rewardXp;
      hourGold += mon.gold + Math.floor(rng() * 3);
      hourKills += 1;
      if (isBoss) {
        hourBoss += 1;
        w = 0;
      } else w += 1;
    }

    timeMs += hourMs;
    xp += hourXp;
    gold += hourGold;
    kills += hourKills;
    bosses += hourBoss;
    faints += hourFaint;

    while (level < 500) {
      const need = xpToNextLevelScenario(level, scenario.xpCurve);
      if (xp < need) break;
      xp -= need;
      level += 1;
      if (MILESTONES.includes(level) && !milestones[level]) {
        milestones[level] = {
          level,
          hours: hours(timeMs),
          gold: Math.round(gold),
          kills,
          bosses,
          faints,
          zone: zone.id,
          xpPerHour: Math.round(hourXp),
          goldPerHour: Math.round(hourGold),
          ttkTrashMs: Number.isFinite(ttkMob.avgTtkMs) ? Math.round(ttkMob.avgTtkMs) : null,
          ttkBossMs: Number.isFinite(ttkBoss.avgTtkMs) ? Math.round(ttkBoss.avgTtkMs) : null,
          refineAvg: player.gear.refineAvg,
          pieces: player.gear.pieces,
        };
      }
    }
  }

  if (!milestones[500] && level >= 500) {
    milestones[500] = {
      level: 500,
      hours: hours(timeMs),
      gold: Math.round(gold),
      kills,
      bosses,
      faints,
      zone: pickZone(500).id,
    };
  }

  return {
    seed,
    classId,
    scenario: scenario.id,
    casual,
    finalLevel: level,
    hours: hours(timeMs),
    gold: Math.round(gold),
    kills,
    bosses,
    faints,
    bossClears: [...bossClears],
    milestones,
    reached500: level >= 500,
  };
}

console.log("Fidelity:", fidelity.passed ? "PASS" : "FAIL", fidelity.failed);

// DES waste table
const dexRows = [];
for (const classId of CLASS_IDS) {
  for (const dexAdd of [0, 50, 100, 148, 180, 200, 250]) {
    const base = { ...CLASSES[classId].base, dex: CLASSES[classId].base.dex + dexAdd };
    const st = computeStatsMirror(base, 100, DEFAULT_BALANCE, { classId });
    dexRows.push({
      classId,
      dexTotal: base.dex,
      dexAdded: dexAdd,
      intervalMs: st.attackIntervalMs,
      critChance: st.critChance.toFixed(4),
      attack: st.attack,
      atSpeedCap: st.attackIntervalMs <= DEFAULT_BALANCE.minIntervalMs,
      atCritCap: st.critChance >= DEFAULT_BALANCE.maxCrit - 1e-9,
      wasteSpeed: dexAdd > 148,
      wasteCrit: dexAdd > 180,
    });
  }
}
writeCsv("v2_dex_softcaps.csv", dexRows);

// Refine alternatives
const refineCompare = ["current", "B-det", "B-prob"].map((m) => totalRefineCostToMax(m, 8));
writeJson("v2_refine_alt.json", refineCompare);
writeCsv(
  "v2_refine_alt.csv",
  refineCompare.flatMap((t) =>
    t.rows.map((r) => ({
      model: t.model,
      refine_level: r.level,
      success: r.success,
      refiners_expected: r.refiners,
      gold_expected: r.gold,
      bonusPerStat: r.bonusPerStat,
      materialTier: r.materialTier,
    })),
  ),
);

// Main Monte Carlo — optimized: 200 seeds × 4 classes × 3 scenarios is heavy;
// run optimized path: for each scenario×class, 200 seeds with hour aggregation.
const marcoRows = [];
const classRows = [];
const scenarioSummary = [];

for (const scenario of ALL_SCENARIOS) {
  console.log("Scenario", scenario.id, "...");
  for (const classId of CLASS_IDS) {
    const results = [];
    for (let s = 1; s <= N_SEEDS; s++) {
      results.push(simulateProgression(s + scenario.id.charCodeAt(0) * 1000, classId, scenario));
    }
    // casual subsample N=50
    const casual = [];
    for (let s = 1; s <= 50; s++) {
      casual.push(
        simulateProgression(9000 + s, classId, scenario, { casual: true }),
      );
    }

    const hoursList = results.map((r) => r.hours).sort((a, b) => a - b);
    const p50 = hoursList[Math.floor(hoursList.length * 0.5)];
    const p10 = hoursList[Math.floor(hoursList.length * 0.1)];
    const p90 = hoursList[Math.floor(hoursList.length * 0.9)];
    const casualP50 = casual.map((r) => r.hours).sort((a, b) => a - b)[
      Math.floor(casual.length * 0.5)
    ];

    classRows.push({
      scenario: scenario.id,
      classId,
      n: N_SEEDS,
      hours_p10: p10,
      hours_p50: p50,
      hours_p90: p90,
      casual_hours_p50: casualP50,
      reach_rate: results.filter((r) => r.reached500).length / N_SEEDS,
      gold_p50: results.map((r) => r.gold).sort((a, b) => a - b)[Math.floor(N_SEEDS * 0.5)],
      faints_p50: results.map((r) => r.faints).sort((a, b) => a - b)[Math.floor(N_SEEDS * 0.5)],
    });

    for (const m of MILESTONES) {
      const ms = results.map((r) => r.milestones[m]).filter(Boolean);
      if (!ms.length) continue;
      marcoRows.push({
        scenario: scenario.id,
        classId,
        milestone: m,
        hours_p50: pct(
          ms.map((x) => x.hours),
          0.5,
        ),
        hours_p10: pct(
          ms.map((x) => x.hours),
          0.1,
        ),
        hours_p90: pct(
          ms.map((x) => x.hours),
          0.9,
        ),
        xp_per_h_p50: pct(
          ms.map((x) => x.xpPerHour),
          0.5,
        ),
        gold_per_h_p50: pct(
          ms.map((x) => x.goldPerHour),
          0.5,
        ),
        ttk_trash_ms_p50: pct(
          ms.map((x) => x.ttkTrashMs).filter((v) => v != null),
          0.5,
        ),
        ttk_boss_ms_p50: pct(
          ms.map((x) => x.ttkBossMs).filter((v) => v != null),
          0.5,
        ),
        refine_avg_p50: pct(
          ms.map((x) => x.refineAvg),
          0.5,
        ),
        pieces_p50: pct(
          ms.map((x) => x.pieces),
          0.5,
        ),
        faints_p50: pct(
          ms.map((x) => x.faints),
          0.5,
        ),
        kills_p50: pct(
          ms.map((x) => x.kills),
          0.5,
        ),
        n: ms.length,
      });
    }

    console.log(
      `  ${classId}: p50=${p50}h casual=${casualP50}h reach=${results.filter((r) => r.reached500).length}/${N_SEEDS}`,
    );
  }

  const bySc = classRows.filter((r) => r.scenario === scenario.id);
  const guer = bySc.find((r) => r.classId === "GUERREIRO");
  scenarioSummary.push({
    scenario: scenario.id,
    label: scenario.label,
    totalXpTo500: totalXpToReachScenario(500, scenario.xpCurve),
    guerreiro_opt_p50_h: guer?.hours_p50,
    guerreiro_casual_p50_h: guer?.casual_hours_p50,
    arqueiro_opt_p50_h: bySc.find((r) => r.classId === "ARQUEIRO")?.hours_p50,
    mago_opt_p50_h: bySc.find((r) => r.classId === "MAGO")?.hours_p50,
    barbaro_opt_p50_h: bySc.find((r) => r.classId === "BARBARO")?.hours_p50,
    target_opt: "25-40",
    target_casual: "45-70",
    in_target_opt:
      guer && guer.hours_p50 >= 25 && guer.hours_p50 <= 40
        ? "yes"
        : guer && guer.hours_p50 < 25
          ? "too_fast"
          : "too_slow_or_border",
  });
}

writeCsv("v2_marcos.csv", marcoRows);
writeCsv("v2_classes.csv", classRows);
writeCsv("v2_cenarios.csv", scenarioSummary);
writeJson("v2_cenarios.json", { scenarioSummary, classRows, fidelity: fidelity.passed });

// Celestial post-ascension access simulation (deterministic)
const celestialAccess = BASE_ZONES.map((z) => {
  const minL = z.minLevel || 1;
  let note;
  let ok = false;
  if (z.mortalOnly) note = "BLOQUEADO (mortalOnly)";
  else if (z.requiresAscension === "CELESTIAL")
    note = `BLOQUEADO até level ${minL} (Celestial exige minLevel+ascensão)`;
  else if (minL <= 1) {
    ok = true;
    note = "OK (zona mortal/baixa acessível pós-ritual)";
  } else note = `precisa level ${minL} (ex.: eter=${minL >= 500 ? minL : minL})`;
  return {
    id: z.id,
    name: z.name,
    minLevel: minL,
    requiresAscension: z.requiresAscension || "",
    mortalOnly: Boolean(z.mortalOnly),
    accessibleAsCelestialL1: ok,
    accessibleAsCelestialL1_note: note,
  };
});
writeJson("v2_celestial_access.json", celestialAccess);

// Post-ascension hours under B: from L1 celestial with gear of mortal 500 to L100/300/700
function simulateCelestialPush(scenario, classId, seed = 1) {
  const rng = makeRng(seed);
  // start L1 with attrs of mortal 500 + gear of 500
  const gear = expectedGearBonus(500, {
    dropChance: scenario.dropChance,
    refineModel: scenario.refineModel,
    classId,
  });
  const attrs = spendPoints(classId, 500, POINTS_PER_LEVEL);
  attrs.str += 0;
  let level = 1;
  let xp = 0;
  let timeMs = 0;
  const marks = {};
  const pointsPer = CELESTIAL_POINTS_PER_LEVEL;

  while (level < 700 && timeMs < 300 * 3600_000) {
    // rebuild attrs with celestial points from 1..level
    const celPts = CELESTIAL_ASCEND_BONUS + Math.max(0, level - 1) * pointsPer;
    const base = { ...CLASSES[classId].base };
    const primary = CLASS_PRIMARY[classId];
    const a = {
      str: base.str + (primary === "str" ? Math.floor(celPts * 0.55) : Math.floor(celPts * 0.1)),
      int: base.int + (primary === "int" ? Math.floor(celPts * 0.55) : 0),
      dex: base.dex + (primary === "dex" ? Math.floor(celPts * 0.55) : Math.floor(celPts * 0.15)),
      con: base.con + Math.floor(celPts * 0.25),
    };
    // keep mortal attrs as floor (preserved on ascend)
    a.str = Math.max(a.str, attrs.str);
    a.int = Math.max(a.int, attrs.int);
    a.dex = Math.max(a.dex, attrs.dex);
    a.con = Math.max(a.con, attrs.con);

    const stats = computeStatsMirror(a, level, DEFAULT_BALANCE, {
      classId,
      equipmentBonus: gear,
    });
    const player = { level, classId, stats, gear };
    const zone = pickZone(level, { celestial: true });
    // if no celestial zone accessible, use highest mortal
    const z = zone;
    const gearPower = scenario.expectedPowerIncludesGear ? stats : expectedPlayerPower(level);
    const mob = scaleMonsterScenario(
      { ...z.monsters[0], isBoss: false },
      z,
      scenario,
      gearPower,
    );
    const ttk = sampleTtk(player, mob, rng, 2, scenario.dexAtk);
    const hourXp =
      Number.isFinite(ttk.avgTtkMs) && ttk.avgTtkMs > 0
        ? Math.floor((3_600_000 / ttk.avgTtkMs) * mob.xp * (level < 100 ? 1.15 : 1))
        : 0;
    timeMs += 3_600_000;
    xp += Math.max(0, hourXp);
    while (level < 700) {
      const need = xpToNextLevelScenario(level, scenario.xpCurve);
      if (xp < need) break;
      xp -= need;
      level += 1;
      if ([100, 300, 500, 700].includes(level)) {
        marks[level] = hours(timeMs);
      }
    }
  }
  return { classId, scenario: scenario.id, hours: hours(timeMs), level, marks };
}

const celestialProg = [];
for (const sc of [SCENARIO_A, SCENARIO_B]) {
  for (const classId of ["GUERREIRO", "ARQUEIRO"]) {
    celestialProg.push(simulateCelestialPush(sc, classId));
  }
}
writeJson("v2_celestial_progress.json", celestialProg);

// Offline interaction note sample
writeJson("v2_offline_limits.json", {
  maxCatchUpMs: 2 * 3600_000,
  maxTicks: 5000,
  note: "Com TTK baixo, 5000 ticks esgotam antes de 2h de elapsed; syncs múltiplos necessários.",
  liveDropChance: live.dropChance,
  defaultDropChance: 0.11,
});

console.log("Wrote v2_* to", OUT);
console.log(scenarioSummary);
