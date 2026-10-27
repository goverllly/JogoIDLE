/**
 * Auditoria de balanceamento — isolada, sem persistência do jogo.
 * Uso: cd idle && npx tsx scripts/balance-audit/run-all.mjs
 */
import {
  ensureOut,
  writeCsv,
  writeJson,
  loadStandaloneCatalog,
  computeStatsMirror,
  makeRng,
  hours,
  fmtNum,
  OUT,
} from "./lib.mjs";

import {
  DEFAULT_BALANCE,
  getBalance,
  setBalanceOverrides,
  xpToNextLevel,
  totalXpToReach,
  MORTAL_LEVEL_CAP,
  CELESTIAL_LEVEL_CAP,
  POINTS_PER_LEVEL,
  CELESTIAL_POINTS_PER_LEVEL,
  CELESTIAL_ASCEND_BONUS,
  DIVINDADE_GOLD_COST,
  MAX_REFINE,
  REFINE_STAT_BONUS,
} from "../../lib/sinergia-idle/game/balance.ts";

import {
  CLASSES,
  BASE_ZONES,
  scaleMonster,
  buildZoneBoss,
  zoneBossWaveSize,
  monsterDefense,
  expectedPlayerPower,
} from "../../lib/sinergia-idle/game/data.ts";

import { RARITIES, DROP_CHANCE, listCatalog, getBagUpgradePrice, getRefinerPrice, getAttrResetPrice } from "../../lib/sinergia-idle/game/items.ts";

ensureOut();
setBalanceOverrides(null); // defaults limpos

const live = loadStandaloneCatalog();
const DEFAULT_DROP = DROP_CHANCE;
const LIVE_DROP = live.dropChance != null ? Number(live.dropChance) : DEFAULT_DROP;

const meta = {
  generatedAt: new Date().toISOString(),
  seed: 42,
  samplesPerFight: 1,
  notes: [
    "Scripts isolados — não gravam save.json nem alteram motor.",
    "Baseline oficial = DEFAULT_BALANCE + BASE_ZONES + DROP_CHANCE do código.",
    "Standalone efetivo: dropChance override se presente; balance overrides vazios neste ambiente.",
    "Produção Prisma: não acessível neste checkout — documentado como N/A.",
  ],
  liveCatalog: {
    exists: live.exists,
    path: live.path,
    dropChanceDefault: DEFAULT_DROP,
    dropChanceLive: LIVE_DROP,
    dropChanceDiverges: LIVE_DROP !== DEFAULT_DROP,
    balanceOverrides: live.balance,
    zoneOverrideKeys: Object.keys(live.zones || {}),
    characterSnapshots: live.characters,
  },
  production: {
    accessible: false,
    reason: "Schema Prisma / DB da SinergIA não montados neste repo standalone",
  },
};

writeJson("00_meta.json", meta);

// ─── XP table ───────────────────────────────────────────────
const xpRows = [];
let cum = 0;
for (let L = 1; L <= CELESTIAL_LEVEL_CAP; L++) {
  const need = xpToNextLevel(L);
  const prev = cum;
  if (L < CELESTIAL_LEVEL_CAP) cum += need;
  const growth =
    L > 1 ? ((need / xpToNextLevel(L - 1) - 1) * 100).toFixed(2) : "0";
  xpRows.push({
    level: L,
    xp_to_next: need,
    xp_cumulative_to_reach_this: prev,
    growth_pct_vs_prev: growth,
    realm: L <= MORTAL_LEVEL_CAP ? "mortal_or_shared_curve" : "celestial_curve_same_formula",
    source: "code",
  });
}
writeCsv("xp_por_nivel.csv", xpRows);

const milestones = [1, 5, 10, 20, 30, 50, 75, 100, 150, 200, 250, 300, 400, 500, 600, 700];
writeJson("xp_milestones.json", {
  source: "code",
  formula:
    "L<50: floor(100*L^1.4); L<150: floor(120*L^1.32); L<350: floor(160*L^1.28); else floor(220*L^1.22)",
  rows: milestones.map((L) => ({
    level: L,
    xpToNext: xpToNextLevel(L),
    totalXpToReach: totalXpToReach(L),
  })),
  totalXpTo500: totalXpToReach(500),
  totalXpTo700: totalXpToReach(700),
});

// ─── Attributes per level ───────────────────────────────────
const attrRows = [];
for (let L = 1; L <= MORTAL_LEVEL_CAP; L++) {
  const gained = L === 1 ? 0 : POINTS_PER_LEVEL;
  attrRows.push({
    level: L,
    points_on_levelup: gained,
    total_from_levels: (L - 1) * POINTS_PER_LEVEL,
    max_distributable_mortal: (L - 1) * POINTS_PER_LEVEL,
    points_per_level_constant: POINTS_PER_LEVEL,
    source: "code",
  });
}
writeCsv("atributos_por_nivel.csv", attrRows);

const celestialAttr = [];
for (let L = 1; L <= CELESTIAL_LEVEL_CAP; L++) {
  celestialAttr.push({
    level: L,
    points_on_levelup: L === 1 ? CELESTIAL_ASCEND_BONUS : CELESTIAL_POINTS_PER_LEVEL,
    note:
      L === 1
        ? "nível 1 pós-ritual: +20 bônus (não é level-up); level-ups seguintes +10"
        : "celestial",
    cumulative_from_celestial_levels: CELESTIAL_ASCEND_BONUS + Math.max(0, L - 1) * CELESTIAL_POINTS_PER_LEVEL,
    source: "code",
  });
}
writeCsv("atributos_por_nivel_celestial.csv", celestialAttr);

// ─── Zones / monsters / bosses ──────────────────────────────
const b = getBalance();
const regionRows = [];
const monsterRows = [];
const bossRows = [];

for (const z of BASE_ZONES) {
  const mobs = (z.monsters || []).map((m) => scaleMonster({ ...m, isBoss: false }, z));
  const boss = buildZoneBoss(z);
  const wave = zoneBossWaveSize(z);
  const avgHp = mobs.reduce((s, m) => s + m.hp, 0) / Math.max(1, mobs.length);
  const avgAtk = mobs.reduce((s, m) => s + m.attack, 0) / Math.max(1, mobs.length);
  const avgXp = mobs.reduce((s, m) => s + m.xp, 0) / Math.max(1, mobs.length);
  const avgGold = mobs.reduce((s, m) => s + m.gold, 0) / Math.max(1, mobs.length);

  regionRows.push({
    id: z.id,
    name: z.name,
    minLevel: z.minLevel,
    tier: z.tier,
    requiresAscension: z.requiresAscension || "",
    mortalOnly: Boolean(z.mortalOnly),
    monsterCount: mobs.length,
    bossWaveSize: wave,
    avgMobHp: fmtNum(avgHp),
    avgMobAtk: fmtNum(avgAtk),
    avgMobXp: fmtNum(avgXp),
    avgMobGold: fmtNum(avgGold),
    bossHp: boss.hp,
    bossAtk: boss.attack,
    bossXp: boss.xp,
    bossGold: boss.gold,
    dropChance: z.dropChance != null ? z.dropChance : DEFAULT_DROP,
    dropChanceLiveEffective: z.dropChance != null ? z.dropChance : LIVE_DROP,
    bossDropMult: z.bossDropMult != null ? z.bossDropMult : b.bossDropMult,
    refineDropChance: z.refineDropChance != null ? z.refineDropChance : b.refineDropChance,
    source: "code_calculated",
  });

  for (const m of mobs) {
    monsterRows.push({
      zoneId: z.id,
      zoneName: z.name,
      name: m.name,
      level: m.level,
      hp: m.hp,
      attack: m.attack,
      defense: m.defense,
      xp: m.xp,
      gold: m.gold,
      isBoss: false,
      source: "calculated_scaleMonster",
    });
  }
  bossRows.push({
    zoneId: z.id,
    zoneName: z.name,
    name: boss.name,
    level: boss.level,
    hp: boss.hp,
    attack: boss.attack,
    defense: boss.defense,
    xp: boss.xp,
    gold: boss.gold,
    isBoss: true,
    waveSize: wave,
    source: "calculated_buildZoneBoss",
  });
}
writeCsv("regioes.csv", regionRows);
writeCsv("monstros.csv", monsterRows);
writeCsv("chefes.csv", bossRows);

// region difficulty deltas
const regionDiff = [];
for (let i = 1; i < regionRows.length; i++) {
  const a = regionRows[i - 1];
  const c = regionRows[i];
  regionDiff.push({
    from: a.id,
    to: c.id,
    minLevelDelta: c.minLevel - a.minLevel,
    avgHpRatio: (c.avgMobHp / Math.max(1, a.avgMobHp)).toFixed(3),
    avgAtkRatio: (c.avgMobAtk / Math.max(1, a.avgMobAtk)).toFixed(3),
    avgXpRatio: (c.avgMobXp / Math.max(1, a.avgMobXp)).toFixed(3),
    bossHpRatio: (c.bossHp / Math.max(1, a.bossHp)).toFixed(3),
  });
}
writeJson("regiao_dificuldade_deltas.json", regionDiff);

// ─── Attr impact ────────────────────────────────────────────
const classIds = Object.keys(CLASSES);
const attrImpact = [];
for (const classId of classIds) {
  const base = { ...CLASSES[classId].base };
  const level = 50;
  const unspent = (level - 1) * POINTS_PER_LEVEL;
  // spend all on one attr at a time from base+0 extra
  const baseline = computeStatsMirror(base, level, b, { classId });
  for (const key of ["str", "int", "dex", "con"]) {
    for (const add of [1, 5, 10, 25, 50, 100]) {
      const attrs = { ...base, [key]: base[key] + add };
      const st = computeStatsMirror(attrs, level, b, { classId });
      const dps =
        (st.attack * (1 + st.critChance * 0.8)) / (st.attackIntervalMs / 1000);
      const baseDps =
        (baseline.attack * (1 + baseline.critChance * 0.8)) /
        (baseline.attackIntervalMs / 1000);
      attrImpact.push({
        classId,
        level,
        attribute: key,
        points_added: add,
        attack: st.attack,
        attack_delta: st.attack - baseline.attack,
        attack_pct: (((st.attack / baseline.attack) - 1) * 100).toFixed(2),
        maxHp: st.maxHp,
        maxHp_delta: st.maxHp - baseline.maxHp,
        maxMp: st.maxMp,
        defense: st.defense,
        defense_delta: st.defense - baseline.defense,
        intervalMs: st.attackIntervalMs,
        interval_delta: st.attackIntervalMs - baseline.attackIntervalMs,
        critChance: st.critChance.toFixed(4),
        approx_dps: dps.toFixed(2),
        approx_dps_pct: (((dps / baseDps) - 1) * 100).toFixed(2),
        note: "baseline = class base attrs only (no level points spent); isolated +N on one attr",
        source: "calculated",
      });
    }
  }
}
writeCsv("impacto_atributos.csv", attrImpact);

// builds at level 100
const builds = [];
const spend = (base, dist) => {
  const a = { ...base };
  for (const [k, v] of Object.entries(dist)) a[k] = (a[k] || 0) + v;
  return a;
};
for (const classId of classIds) {
  const base = { ...CLASSES[classId].base };
  const L = 100;
  const pts = (L - 1) * POINTS_PER_LEVEL;
  const plans = {
    full_str: { str: pts, int: 0, dex: 0, con: 0 },
    full_int: { str: 0, int: pts, dex: 0, con: 0 },
    full_dex: { str: 0, int: 0, dex: pts, con: 0 },
    full_con: { str: 0, int: 0, dex: 0, con: pts },
    balanced: {
      str: Math.floor(pts * 0.35),
      int: Math.floor(pts * 0.1),
      dex: Math.floor(pts * 0.25),
      con: Math.floor(pts * 0.3),
    },
    glass_cannon: {
      str: classId === "MAGO" ? 0 : Math.floor(pts * 0.7),
      int: classId === "MAGO" ? Math.floor(pts * 0.7) : 0,
      dex: Math.floor(pts * 0.3),
      con: 0,
    },
    tank: {
      str: Math.floor(pts * 0.2),
      int: 0,
      dex: Math.floor(pts * 0.1),
      con: Math.floor(pts * 0.7),
    },
  };
  for (const [name, dist] of Object.entries(plans)) {
    // fix remainder into primary
    const used = Object.values(dist).reduce((s, n) => s + n, 0);
    if (used < pts) {
      const primary = classId === "MAGO" ? "int" : classId === "ARQUEIRO" ? "dex" : "str";
      dist[primary] = (dist[primary] || 0) + (pts - used);
    }
    const attrs = spend(base, dist);
    const st = computeStatsMirror(attrs, L, b, { classId });
    const mageMult = classId === "MAGO" ? 0.55 : 1;
    const effAtk = Math.max(1, Math.floor(st.attack * mageMult));
    const dps =
      (effAtk * (1 + st.critChance * 0.8)) / (st.attackIntervalMs / 1000);
    builds.push({
      classId,
      level: L,
      build: name,
      str: attrs.str,
      int: attrs.int,
      dex: attrs.dex,
      con: attrs.con,
      attack_raw: st.attack,
      attack_basic_effective: effAtk,
      maxHp: st.maxHp,
      defense: st.defense,
      intervalMs: st.attackIntervalMs,
      critChance: st.critChance.toFixed(4),
      approx_basic_dps: dps.toFixed(2),
      source: "calculated",
    });
  }
}
writeCsv("classes_e_builds.csv", builds);

// ─── Equipment / refine ─────────────────────────────────────
const catalog = listCatalog();
const rarityRows = Object.entries(RARITIES).map(([id, r]) => ({
  id,
  name: r.name,
  mult: r.mult,
  weight: r.weight,
  sellMult: r.sell,
  weight_share_pct: (
    (r.weight / Object.values(RARITIES).reduce((s, x) => s + x.weight, 0)) *
    100
  ).toFixed(2),
  source: "code",
}));
writeCsv("raridades.csv", rarityRows);

const refineRows = [];
let cumBonus = 0;
for (let r = 0; r <= MAX_REFINE; r++) {
  cumBonus = r * REFINE_STAT_BONUS;
  refineRows.push({
    refine_level: r,
    success_chance: 1,
    fail_chance: 0,
    can_break: false,
    can_downgrade: false,
    cost_items: r === 0 ? 0 : 1,
    cost_gold: 0,
    bonus_per_stat_per_level: REFINE_STAT_BONUS,
    bonus_accumulated_per_targeted_stat: cumBonus,
    material: "Refinador x1 por nível",
    source: "code",
  });
}
writeCsv("refinamento.csv", refineRows);

// gear power demo: +attrs from refine on a 4-target item
const gearSim = [];
for (const rarity of Object.keys(RARITIES)) {
  const mult = RARITIES[rarity].mult;
  for (const refine of [0, 5, 10]) {
    // approximate weapon: base str from tier mid
    const baseStr = Math.round(8 * mult);
    const refineBonus = refine * REFINE_STAT_BONUS; // if str is refine target
    const totalStr = baseStr + refineBonus;
    gearSim.push({
      slot: "weapon_approx",
      rarity,
      rarity_mult: mult,
      refine,
      approx_str_on_item: totalStr,
      note: "aproximação ilustrativa; templates reais variam por tier/classe",
      source: "estimated",
    });
  }
}
writeCsv("equipamentos_poder_approx.csv", gearSim);

writeJson("equipamentos_meta.json", {
  templateCount: catalog.length,
  byKind: catalog.reduce((acc, t) => {
    const k = t.slot || t.kind || "other";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {}),
  merchantDefaults: {
    bagUpgrade: getBagUpgradePrice(),
    refiner: getRefinerPrice(),
    attributeReset: getAttrResetPrice(),
  },
  maxRefine: MAX_REFINE,
  refineStatBonus: REFINE_STAT_BONUS,
  refineAlwaysSucceeds: true,
  source: "code",
});

// Sample equipment CSV (first 200 templates summary)
writeCsv(
  "equipamentos.csv",
  catalog.slice(0, 400).map((t) => ({
    id: t.id,
    name: t.name,
    slot: t.slot,
    tier: t.tier,
    classes: Array.isArray(t.classes) ? t.classes.join("|") : "",
    price: t.price,
    consumable: Boolean(t.consumable),
    source: "code",
  })),
);

// ─── Combat cycle simulation ────────────────────────────────
const MAGE_BASIC = 0.55;

function playerAt(level, classId, spendPlan = "primary", gearBonus = {}) {
  const base = { ...CLASSES[classId].base };
  const pts = Math.max(0, (level - 1) * POINTS_PER_LEVEL);
  const primary = classId === "MAGO" ? "int" : classId === "ARQUEIRO" ? "dex" : "str";
  const dist = { str: 0, int: 0, dex: 0, con: 0 };
  if (spendPlan === "primary") {
    dist[primary] = Math.floor(pts * 0.55);
    dist.con = Math.floor(pts * 0.25);
    dist.dex = Math.floor(pts * 0.15);
    dist.str = primary === "str" ? dist.str : Math.floor(pts * 0.05);
    dist.int = primary === "int" ? dist.int : 0;
  } else if (spendPlan === "glass") {
    dist[primary] = Math.floor(pts * 0.75);
    dist.dex = pts - dist[primary];
  } else {
    dist.str = Math.floor(pts / 4);
    dist.int = Math.floor(pts / 4);
    dist.dex = Math.floor(pts / 4);
    dist.con = pts - dist.str - dist.int - dist.dex;
  }
  const used = dist.str + dist.int + dist.dex + dist.con;
  dist[primary] += Math.max(0, pts - used);
  const attrs = {
    str: base.str + dist.str,
    int: base.int + dist.int,
    dex: base.dex + dist.dex,
    con: base.con + dist.con,
  };
  return {
    level,
    classId,
    attrs,
    stats: computeStatsMirror(attrs, level, getBalance(), { classId, equipmentBonus: gearBonus }),
    gearBonus,
  };
}

function pickZoneForLevel(level, { celestial = false } = {}) {
  const candidates = BASE_ZONES.filter((z) => {
    if (z.requiresAscension === "CELESTIAL" && !celestial) return false;
    if (z.mortalOnly && celestial) return false;
    return (z.minLevel || 1) <= level;
  });
  if (!candidates.length) return BASE_ZONES[0];
  return candidates[candidates.length - 1]; // highest unlocked
}

function simulateFight(player, monster, rng, { useSkills = false } = {}) {
  let mHp = monster.hp;
  let pHp = player.stats.maxHp;
  const def = monsterDefense(monster);
  const mageMult = player.classId === "MAGO" ? MAGE_BASIC : 1;
  let ticks = 0;
  let damageDealt = 0;
  let damageTaken = 0;
  let crits = 0;
  const interval = player.stats.attackIntervalMs;
  const maxTicks = 5000;
  while (mHp > 0 && pHp > 0 && ticks < maxTicks) {
    ticks += 1;
    let atk = Math.max(1, Math.floor(player.stats.attack * mageMult));
    const crit = rng() < player.stats.critChance;
    if (crit) {
      atk = Math.floor(atk * 1.8);
      crits += 1;
    }
    const dmg = Math.max(1, atk - def);
    mHp -= dmg;
    damageDealt += dmg;
    if (mHp <= 0) break;
    // incoming
    let incoming = Math.max(0, monster.attack - player.stats.defense);
    if (player.classId === "GUERREIRO" && rng() < 0.12) incoming = 0;
    pHp -= incoming;
    damageTaken += incoming;
  }
  const fainted = pHp <= 0 && mHp > 0;
  return {
    ticks,
    durationMs: ticks * interval,
    kills: fainted ? 0 : 1,
    fainted,
    damageDealt,
    damageTaken,
    crits,
  };
}

function simulateHuntHour(player, zone, rng, {
  durationMs = 3_600_000,
  xpMult = 1,
  online = true,
  dropChance = DEFAULT_DROP,
} = {}) {
  let remaining = durationMs;
  let xp = 0;
  let gold = 0;
  let kills = 0;
  let bossKills = 0;
  let faints = 0;
  let fightMs = 0;
  let wave = 0;
  const waveNeed = zoneBossWaveSize(zone);
  const mobs = (zone.monsters || []).map((m) => scaleMonster({ ...m, isBoss: false }, zone));
  let ticksBudget = online ? Infinity : 5000; // offline chunk limit awareness

  while (remaining > 0 && ticksBudget > 0) {
    const isBoss = wave >= waveNeed;
    const monster = isBoss
      ? buildZoneBoss(zone)
      : mobs[Math.floor(rng() * mobs.length)] || mobs[0];
    const fight = simulateFight(player, monster, rng);
    const used = fight.durationMs;
    if (used > remaining) break;
    remaining -= used;
    fightMs += used;
    ticksBudget -= fight.ticks;
    if (fight.fainted) {
      faints += 1;
      // auto-restart assumed: refill half HP cost already in sim; continue
      player = { ...player, stats: { ...player.stats } }; // keep going
      wave = 0;
      continue;
    }
    kills += 1;
    let rewardXp = Math.max(1, Math.floor(monster.xp * xpMult));
    if (player.ascension === "CELESTIAL" && player.level < 100) {
      rewardXp = Math.max(1, Math.floor(rewardXp * 1.15));
    }
    const rewardGold = Math.max(
      0,
      Math.floor((monster.gold + Math.floor(rng() * 3)) * 1),
    );
    xp += rewardXp;
    gold += rewardGold;
    if (monster.isBoss) {
      bossKills += 1;
      wave = 0;
    } else {
      wave += 1;
    }
  }
  return {
    xp,
    gold,
    kills,
    bossKills,
    faints,
    fightMs,
    wallMs: durationMs - remaining,
    xpPerHour: xp / (durationMs / 3_600_000),
    killsPerHour: kills / (durationMs / 3_600_000),
  };
}

// Progression to 500 — full cycle approx
function simulateProgression({
  classId = "GUERREIRO",
  label = "median",
  xpMult = 1,
  gearCurve = "none", // none | gradual | strong
  seed = 42,
  maxHours = 500,
  celestial = false,
} = {}) {
  const rng = makeRng(seed);
  let level = 1;
  let xp = 0;
  let gold = 0;
  let timeMs = 0;
  let totalKills = 0;
  let totalFaints = 0;
  let totalBoss = 0;
  const log = [];

  const gearForLevel = (L) => {
    if (gearCurve === "none") return {};
    if (gearCurve === "gradual") {
      // approx: +1 attr per 10 levels across slots, rarity ramp
      const bonus = Math.floor(L / 8);
      return {
        str: classId === "MAGO" ? Math.floor(bonus * 0.2) : bonus,
        int: classId === "MAGO" ? bonus : Math.floor(bonus * 0.2),
        dex: Math.floor(bonus * 0.6),
        con: Math.floor(bonus * 0.5),
        attack: Math.floor(bonus * 0.4),
        defense: Math.floor(bonus * 0.3),
        hp: Math.floor(bonus * 2),
      };
    }
    // strong: early rare/epic + refine
    const bonus = Math.floor(L / 4) + 20;
    const refine = Math.min(10, Math.floor(L / 40)) * REFINE_STAT_BONUS * 2;
    return {
      str: classId === "MAGO" ? 5 : bonus + refine,
      int: classId === "MAGO" ? bonus + refine : 5,
      dex: Math.floor(bonus * 0.8),
      con: Math.floor(bonus * 0.7),
      attack: Math.floor(bonus * 0.5),
      defense: Math.floor(bonus * 0.4),
      hp: Math.floor(bonus * 3),
    };
  };

  const cap = celestial ? CELESTIAL_LEVEL_CAP : MORTAL_LEVEL_CAP;
  const pointsPer = celestial ? CELESTIAL_POINTS_PER_LEVEL : POINTS_PER_LEVEL;

  while (level < Math.min(500, cap) && timeMs < maxHours * 3_600_000) {
    const gear = gearForLevel(level);
    const player = playerAt(level, classId, "primary", gear);
    player.ascension = celestial ? "CELESTIAL" : null;
    // rebuild stats with celestial points if needed — simplify: mortal points curve until ritual
    const zone = pickZoneForLevel(level, { celestial });
    const hour = simulateHuntHour(player, zone, rng, {
      durationMs: 3_600_000,
      xpMult,
      dropChance: LIVE_DROP,
    });
    timeMs += 3_600_000;
    xp += hour.xp;
    gold += hour.gold;
    totalKills += hour.kills;
    totalFaints += hour.faints;
    totalBoss += hour.bossKills;

    while (level < cap) {
      const need = xpToNextLevel(level);
      if (xp < need) break;
      xp -= need;
      level += 1;
    }

    if ([10, 50, 100, 200, 300, 400, 500].includes(level) || level >= 500) {
      log.push({
        level,
        hours: hours(timeMs),
        gold: fmtNum(gold),
        kills: totalKills,
        bosses: totalBoss,
        faints: totalFaints,
        zone: zone.id,
        xpPerLastHour: fmtNum(hour.xpPerHour),
        killsPerLastHour: hour.killsPerHour.toFixed(1),
      });
    }
    if (level >= 500) break;
  }

  return {
    label,
    classId,
    gearCurve,
    xpMult,
    finalLevel: level,
    hours: hours(timeMs),
    gold: fmtNum(gold),
    kills: totalKills,
    bosses: totalBoss,
    faints: totalFaints,
    milestones: log,
    reached500: level >= 500,
    source: "simulated",
  };
}

const progressions = [
  simulateProgression({ label: "A_no_gear", gearCurve: "none", xpMult: 1, seed: 1 }),
  simulateProgression({ label: "B_gradual_gear", gearCurve: "gradual", xpMult: 1, seed: 2 }),
  simulateProgression({ label: "C_gradual_xp115", gearCurve: "gradual", xpMult: 1.15, seed: 3 }),
  simulateProgression({ label: "D_strong_gear", gearCurve: "strong", xpMult: 1.15, seed: 4 }),
  simulateProgression({ label: "E_strong_xp125", gearCurve: "strong", xpMult: 1.25, seed: 5 }),
  simulateProgression({
    label: "E_arqueiro_strong",
    classId: "ARQUEIRO",
    gearCurve: "strong",
    xpMult: 1.25,
    seed: 6,
  }),
];

writeJson("simulacao_progressao.json", progressions);
writeCsv(
  "simulacao_progressao.csv",
  progressions.map((p) => ({
    label: p.label,
    classId: p.classId,
    gearCurve: p.gearCurve,
    xpMult: p.xpMult,
    finalLevel: p.finalLevel,
    hours_to_stop: p.hours,
    reached500: p.reached500,
    kills: p.kills,
    faints: p.faints,
    gold: p.gold,
    source: "simulated",
  })),
);

// Milestone flatten
const mileRows = [];
for (const p of progressions) {
  for (const m of p.milestones) {
    mileRows.push({ profile: p.label, ...m, source: "simulated" });
  }
}
writeCsv("simulacao_marcos.csv", mileRows);

// Analytic lower bound: XP only ignoring TTK
const analytic = [];
for (const zoneId of ["floresta", "pantano", "trono", "eter", "prova_divina"]) {
  const z = BASE_ZONES.find((x) => x.id === zoneId);
  if (!z) continue;
  const mob = scaleMonster({ ...z.monsters[0], isBoss: false }, z);
  const xpNeed = totalXpToReach(500);
  const killsNeeded = Math.ceil(xpNeed / mob.xp);
  // assume 10 hits * interval 1000ms optimistic
  const optimisticMsPerKill = 10 * 1000;
  analytic.push({
    zoneId,
    mobXp: mob.xp,
    kills_for_500_if_static_zone: killsNeeded,
    optimistic_hours_if_1s_tick_10hits: hours(killsNeeded * optimisticMsPerKill),
    note: "limite inferior analítico — NÃO inclui troca de zona, mortes, gear; zone fixa irrealista",
    source: "estimated_analytic",
  });
}
writeJson("hipotese_500_analitico.json", {
  totalXpTo500: totalXpToReach(500),
  rows: analytic,
});

// Offline vs online 24h
const offlineCompare = [];
const p50 = playerAt(50, "GUERREIRO", "primary", { str: 20, con: 15, dex: 10, attack: 10 });
const z50 = pickZoneForLevel(50);
const rngOff = makeRng(99);
const online24 = simulateHuntHour(p50, z50, rngOff, { durationMs: 24 * 3_600_000, online: true });
// offline: only 2h rewarded per sync; assume 12 syncs of 2h = 24h rewarded if player syncs every 2h
const offline2h = simulateHuntHour(p50, z50, makeRng(100), {
  durationMs: 2 * 3_600_000,
  online: false,
});
const offlineChunkTicks = simulateHuntHour(p50, z50, makeRng(101), {
  durationMs: 2 * 3_600_000,
  online: false,
});
offlineCompare.push({
  scenario: "A_online_24h_continuous",
  rewardedHours: 24,
  xp: online24.xp,
  gold: online24.gold,
  kills: online24.kills,
  faints: online24.faints,
  note: "simulação contínua sem cap 2h",
});
offlineCompare.push({
  scenario: "B_offline_one_sync_after_24h_wall",
  wallHours: 24,
  rewardedHours: 2,
  xp: offline2h.xp,
  gold: offline2h.gold,
  kills: offline2h.kills,
  note: "maxCatchUpMs=2h — 22h wall-clock perdidos",
});
offlineCompare.push({
  scenario: "C_offline_12_syncs_every_2h",
  wallHours: 24,
  rewardedHours: 24,
  xp: offline2h.xp * 12,
  gold: offline2h.gold * 12,
  kills: offline2h.kills * 12,
  note: "12× catch-up de 2h; cada request ainda limitado a 5000 ticks",
});
offlineCompare.push({
  scenario: "D_offline_2h_chunk_tick_cap",
  rewardedMs: offlineChunkTicks.wallMs,
  fightMs: offlineChunkTicks.fightMs,
  kills: offlineChunkTicks.kills,
  note: "interação 2h vs 5000 ticks: se TTK baixo, 5000 ticks << 2h; se TTK alto, 2h limita primeiro",
});
writeJson("idle_online_vs_offline.json", offlineCompare);

// TTK by level/zone
const ttkRows = [];
for (const L of [1, 10, 25, 50, 100, 150, 200, 300, 400, 500]) {
  const zone = pickZoneForLevel(L);
  for (const gear of ["none", "gradual", "strong"]) {
    const gearBonus =
      gear === "none"
        ? {}
        : gear === "gradual"
          ? { str: Math.floor(L / 8), con: Math.floor(L / 10), dex: Math.floor(L / 12), attack: Math.floor(L / 15) }
          : {
              str: Math.floor(L / 4) + 20,
              con: Math.floor(L / 5),
              dex: Math.floor(L / 6),
              attack: Math.floor(L / 8),
              defense: Math.floor(L / 10),
            };
    const player = playerAt(L, "GUERREIRO", "primary", gearBonus);
    const mob = scaleMonster({ ...zone.monsters[0], isBoss: false }, zone);
    const boss = buildZoneBoss(zone);
    const rng = makeRng(L * 17 + gear.length);
    const fMob = simulateFight(player, mob, rng);
    const fBoss = simulateFight(player, boss, makeRng(L * 19));
    ttkRows.push({
      level: L,
      zone: zone.id,
      gear,
      mob_ttk_ms: fMob.durationMs,
      mob_fainted: fMob.fainted,
      boss_ttk_ms: fBoss.durationMs,
      boss_fainted: fBoss.fainted,
      player_atk: player.stats.attack,
      player_hp: player.stats.maxHp,
      mob_hp: mob.hp,
      boss_hp: boss.hp,
      source: "simulated",
    });
  }
}
writeCsv("ttk_por_nivel.csv", ttkRows);

// Ascension before/after
const preAsc = playerAt(500, "GUERREIRO", "primary", {
  str: 80,
  con: 40,
  dex: 30,
  attack: 40,
  defense: 20,
  hp: 200,
});
const postAscAttrs = { ...preAsc.attrs }; // preserved
const postAsc = {
  level: 1,
  classId: "GUERREIRO",
  attrs: postAscAttrs,
  unspentBonus: CELESTIAL_ASCEND_BONUS,
  stats: computeStatsMirror(postAscAttrs, 1, getBalance(), {
    classId: "GUERREIRO",
    equipmentBonus: preAsc.gearBonus,
  }),
  note: "nível 1 celestial com mesmos attrs+gear; HP/MP recalculam com levelHp*1",
};
writeJson("ascensao_antes_depois.json", {
  requirements: {
    level: MORTAL_LEVEL_CAP,
    gold: DIVINDADE_GOLD_COST,
    item: "Suco Celestial",
    source: "code",
  },
  before: {
    level: 500,
    attrs: preAsc.attrs,
    stats: preAsc.stats,
    gearBonus: preAsc.gearBonus,
  },
  after: {
    level: 1,
    ascension: "CELESTIAL",
    attrs: postAsc.attrs,
    unspentPointsPlus: CELESTIAL_ASCEND_BONUS,
    stats: postAsc.stats,
    gearPersists: true,
    inventoryPersists: true,
    skillsPersist: true,
    goldMinus: DIVINDADE_GOLD_COST,
    farmCleared: true,
  },
  celestialProgression: {
    pointsPerLevel: CELESTIAL_POINTS_PER_LEVEL,
    levelCap: CELESTIAL_LEVEL_CAP,
    xpBonusBelow100: 1.15,
  },
});

// Refine full set power
const refineSet = [];
for (const pieces of [1, 6, 8]) {
  for (const refine of [0, 5, 10]) {
    const bonusPerPiece = refine * REFINE_STAT_BONUS; // assume 1 primary stat targeted
    refineSet.push({
      equipped_pieces_refined: pieces,
      refine_level: refine,
      primary_stat_bonus_total: pieces * bonusPerPiece,
      approx_attack_gain_if_str:
        pieces * bonusPerPiece * getBalance().kAtk,
      approx_hp_gain_if_con: pieces * bonusPerPiece * getBalance().kHp,
      refiners_needed: pieces * refine,
      gold_if_bought_refiners: pieces * refine * getRefinerPrice(),
      success_rate: 1,
      source: "calculated",
    });
  }
}
writeCsv("refinamento_conjunto.csv", refineSet);

// Skills summary
writeJson("habilidades_meta.json", {
  farmTreePerClass: 3,
  farmTreeTotal: 12,
  farmMults: [1.15, 1.2, 1.25],
  combatSkillsPerClass: 9,
  combatSkillsTotal: 36,
  mageBasicMult: MAGE_BASIC,
  warriorBlockChance: 0.12,
  source: "code",
});

// Economy snapshot
writeJson("economia_meta.json", {
  goldSources: ["kill_applyRewards", "sell_items", "pet_autosell", "bag_full_autosell"],
  goldSinks: [
    "merchant_bag",
    "merchant_refiner",
    "merchant_pets",
    "merchant_attr_reset",
    "divindade_ritual_10M",
  ],
  mobGoldPerLevel: b.mobGoldPerLevel,
  ritualCost: DIVINDADE_GOLD_COST,
  dropChanceDefault: DEFAULT_DROP,
  dropChanceLive: LIVE_DROP,
  source: "code",
});

// XP/h by region at representative levels
const xphRows = [];
for (const L of [10, 50, 100, 200, 350, 480]) {
  const zone = pickZoneForLevel(L);
  const player = playerAt(L, "GUERREIRO", "primary", {
    str: Math.floor(L / 6),
    con: Math.floor(L / 8),
    dex: Math.floor(L / 10),
    attack: Math.floor(L / 12),
  });
  const h = simulateHuntHour(player, zone, makeRng(L * 3), { durationMs: 3_600_000 });
  xphRows.push({
    level: L,
    zone: zone.id,
    xp_per_hour: fmtNum(h.xpPerHour),
    kills_per_hour: h.killsPerHour.toFixed(1),
    faints_per_hour: h.faints,
    gold_per_hour: fmtNum(h.gold),
    source: "simulated",
  });
}
writeCsv("xp_por_hora_regiao.csv", xphRows);

writeJson("balance_constants.json", {
  DEFAULT_BALANCE,
  caps: { mortal: MORTAL_LEVEL_CAP, celestial: CELESTIAL_LEVEL_CAP },
  points: {
    mortal: POINTS_PER_LEVEL,
    celestial: CELESTIAL_POINTS_PER_LEVEL,
    ascendBonus: CELESTIAL_ASCEND_BONUS,
  },
  offline: { maxCatchUpMs: 2 * 3600 * 1000, maxTicksDefault: 5000 },
  source: "code",
});

console.log("Audit data written to", OUT);
console.log(
  "Progression summary:",
  progressions.map((p) => `${p.label}: L${p.finalLevel} in ${p.hours}h`).join(" | "),
);
console.log("Live dropChance", LIVE_DROP, "vs default", DEFAULT_DROP);
