/**
 * Fase 4 — Estudo de balanceamento (somente leitura; não altera o motor).
 * Saída: AUDITORIA_JOGO_IDLE/fase4_economy/balance_study_*.json
 *
 * Uso: cd idle && npx tsx scripts/balance-audit/phase4-balance-study.mjs
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_BALANCE,
  getBalance,
  setBalanceOverrides,
  getBalanceOverrides,
  MORTAL_LEVEL_CAP,
  DIVINDADE_GOLD_COST,
  xpToNextLevel,
} from "../../lib/jogo-idle/game/balance.ts";
import {
  CLASSES,
  findZone,
  scaleMonster,
  buildZoneBoss,
  monsterDefense,
  expectedPlayerPower,
} from "../../lib/jogo-idle/game/data.ts";
import {
  createItem,
  listCatalog,
  SUCO_CELESTIAL_TEMPLATE_ID,
  DROP_CHANCE,
} from "../../lib/jogo-idle/game/items.ts";
import {
  createCharacter,
  computeStats,
  performClassificationRitual,
  ensureAttributeEconomy,
} from "../../lib/jogo-idle/game/character.ts";
import { processFarm, startFarm } from "../../lib/jogo-idle/game/combat.ts";
import { ensureChapters } from "../../lib/jogo-idle/game/chapters.ts";
import {
  combatSkillsForClass,
  ensureCombatSkills,
  syncCombatSkillUnlocks,
  MP_REGEN_PER_TICK_PCT,
  MAGE_BASIC_ATTACK_MULT,
} from "../../lib/jogo-idle/game/combat-skills.ts";
import { equipItem } from "../../lib/jogo-idle/game/inventory.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT = join(ROOT, "AUDITORIA_JOGO_IDLE/fase4_economy");
const TWO_H = 2 * 60 * 60 * 1000;

setBalanceOverrides(null);

function makeSeededRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function writeJson(name, data) {
  mkdirSync(OUT, { recursive: true });
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n", "utf8");
}

function loadCatalogOverrides() {
  const path = join(ROOT, "idle/data/save.json");
  if (!existsSync(path)) return { exists: false, path, note: "save ausente — só defaults" };
  try {
    const raw = JSON.parse(readFileSync(path, "utf8"));
    const bal = raw.catalog?.overrides?.__world?.balance || {};
    return {
      exists: true,
      path,
      balanceOverrides: bal,
      dropChance: raw.catalog?.dropChance ?? null,
      note: "lido somente; estudo usa setBalanceOverrides(null) = DEFAULT_BALANCE",
    };
  } catch (e) {
    return { exists: true, path, error: String(e?.message || e) };
  }
}

/** Distribuição de pontos livres acima da base da classe. */
function applyBuild(baseAttrs, gained, build) {
  const a = { ...baseAttrs };
  const plans = {
    dex_heavy: { dex: 0.65, con: 0.35 },
    str_heavy: { str: 0.65, con: 0.35 },
    hybrid: { str: 0.4, dex: 0.35, con: 0.25 },
    /** DEX acima do soft-cap de velocidade (~(1450-420)/7 ≈ 147) e crit */
    dex_overcap: { dex: 0.9, con: 0.1 },
    /** DEX só até perto do floor de interval, resto STR */
    under_caps: { str: 0.45, dex: 0.3, con: 0.25 },
  };
  const plan = plans[build] || plans.hybrid;
  let spent = 0;
  const keys = Object.keys(plan);
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i];
    const share = i === keys.length - 1 ? gained - spent : Math.floor(gained * plan[k]);
    a[k] = (a[k] || 0) + Math.max(0, share);
    spent += Math.max(0, share);
  }
  return a;
}

function pointsGained(level, ascension) {
  const per = ascension ? 10 : 5;
  return Math.max(0, level - 1) * per + (ascension ? 20 : 0);
}

function mirrorAttack(attrs, classId, formula, balance, attackFlat = 0) {
  const b = balance;
  if (classId === "MAGO") {
    return Math.round(b.baseAttack + attrs.int * b.kMagicAtk + attackFlat);
  }
  const strTerm = attrs.str * b.kAtk;
  if (formula === "B" && classId === "ARQUEIRO") {
    return Math.round(b.baseAttack + strTerm + attrs.dex * b.kAtk * 0.35 + attackFlat);
  }
  if (formula === "C" && classId === "ARQUEIRO") {
    return Math.round(b.baseAttack + (0.55 * attrs.str + 0.45 * attrs.dex) * b.kAtk + attackFlat);
  }
  // A = motor atual
  return Math.round(b.baseAttack + strTerm + attackFlat);
}

function mirrorStats(attrs, level, classId, formula, balance, attackFlat = 0) {
  const b = balance;
  const maxHp = Math.round(b.baseHp + attrs.con * b.kHp + level * b.levelHp);
  const attack = mirrorAttack(attrs, classId, formula, b, attackFlat);
  const defense = Math.round(b.baseDefense + attrs.con * b.kDefCon + attrs.str * b.kDefStr);
  const attackIntervalMs = Math.max(b.minIntervalMs, Math.round(b.baseIntervalMs - attrs.dex * b.kSpeed));
  const critChance = Math.min(b.maxCrit, attrs.dex * b.critPerDex);
  return { maxHp, attack, defense, attackIntervalMs, critChance };
}

function dpsOf(stats, classId) {
  let atk = stats.attack;
  if (classId === "MAGO") atk = Math.floor(atk * MAGE_BASIC_ATTACK_MULT); // basic only
  const intervalS = stats.attackIntervalMs / 1000;
  const critMult = 1 + stats.critChance * 0.8;
  return (atk * critMult) / intervalS;
}

function ttk(stats, monster, classId) {
  const mit = monsterDefense(monster);
  let atk = stats.attack;
  if (classId === "MAGO") atk = Math.max(1, Math.floor(atk * MAGE_BASIC_ATTACK_MULT));
  const base = Math.max(1, Math.floor(atk - mit));
  const avgHit = base * (1 + stats.critChance * 0.8);
  const hits = monster.hp / Math.max(1, avgHit);
  const seconds = hits * (stats.attackIntervalMs / 1000);
  return {
    hits: Number(hits.toFixed(2)),
    seconds: Number(seconds.toFixed(2)),
    avgHit: Number(avgHit.toFixed(1)),
    mitigation: mit,
    kind: "analytical_basic_attack",
  };
}

function makeCharacter(classId, level, build, { ascension = null } = {}) {
  const c = createCharacter(`S_${classId.slice(0, 3)}_${build.slice(0, 3)}`, classId);
  ensureChapters(c);
  c.level = level;
  c.ascension = ascension;
  c.experience = 0;
  const gained = pointsGained(level, ascension);
  c.attributes = applyBuild({ ...CLASSES[classId].base }, gained, build);
  c.unspentPoints = 0;
  ensureAttributeEconomy(c);
  return c;
}

/** Equipa melhores templates do tier para a classe (mesmo set em todas as fórmulas). */
function equipTierGear(character, tier, refineLevel) {
  const catalog = listCatalog();
  const slots = ["weapon", "head", "chest", "legs", "gloves", "boots", "ring", "necklace"];
  for (const slot of slots) {
    const candidates = catalog.filter(
      (t) =>
        t.tier === tier &&
        t.slot === slot &&
        (t.classes || []).includes(character.classId) &&
        !t.consumable,
    );
    if (!candidates.length) continue;
    candidates.sort((a, b) => {
      const sa = (a.stats?.str || 0) + (a.stats?.dex || 0) + (a.stats?.int || 0);
      const sb = (b.stats?.str || 0) + (b.stats?.dex || 0) + (b.stats?.int || 0);
      return sb - sa;
    });
    const item = createItem(candidates[0].id, "rare", 1);
    item.refineLevel = refineLevel;
    character.inventory.push(item);
    try {
      equipItem(character, item.uid);
    } catch {
      /* capacidade / regras */
    }
  }
}

/**
 * Modelo analítico de skills: prioridade por damageMult*hits/cooldown, respeitando
 * custo MP e regen. NÃO é processFarm — marcado estimated.
 */
function estimateSkillDps(character, stats, horizonMs = 60_000) {
  ensureCombatSkills(character);
  syncCombatSkillUnlocks(character);
  const defs = combatSkillsForClass(character.classId).filter((d) =>
    (character.combatSkills?.unlocked || []).includes(d.id),
  );
  if (!defs.length) {
    return { kind: "estimated_skill_model", note: "sem skills desbloqueadas", dps: dpsOf(stats, character.classId) };
  }
  const ranked = [...defs].sort(
    (a, b) =>
      (b.damageMult * (b.hits || 1)) / (b.cooldownMs / 1000) -
      (a.damageMult * (a.hits || 1)) / (a.cooldownMs / 1000),
  );
  let t = 0;
  let mp = stats.maxMp;
  let damage = 0;
  const cds = Object.fromEntries(ranked.map((d) => [d.id, 0]));
  const interval = stats.attackIntervalMs;
  while (t < horizonMs) {
    t += interval;
    mp = Math.min(stats.maxMp, mp + stats.maxMp * MP_REGEN_PER_TICK_PCT);
    let cast = null;
    for (const d of ranked) {
      if (cds[d.id] > t) continue;
      if (d.resource === "mp" && mp < d.cost) continue;
      cast = d;
      break;
    }
    if (cast) {
      if (cast.resource === "mp") mp -= cast.cost;
      cds[cast.id] = t + cast.cooldownMs;
      const hits = Math.max(1, cast.hits || 1);
      const base = Math.max(1, Math.floor(stats.attack * cast.damageMult));
      const per = cast.guaranteeCrit ? Math.floor(base * 1.8) : base * (1 + stats.critChance * 0.8);
      damage += per * hits;
    } else {
      const base = Math.max(1, stats.attack);
      damage += base * (1 + stats.critChance * 0.8);
    }
  }
  return {
    kind: "estimated_skill_model",
    premises: "priority by mult*hits/cd; MP cost+2% regen/tick; no monster DEF in skill path",
    horizonMs,
    dps: Number((damage / (horizonMs / 1000)).toFixed(2)),
    skillsConsidered: ranked.map((d) => d.id),
  };
}

function zoneForLevel(level) {
  if (level <= 100) return findZone("bosque_sussurros");
  if (level <= 300) return findZone("floresta_amaldicoada");
  return findZone("coracao_floresta");
}

function tierForLevel(level) {
  if (level <= 10) return 1;
  if (level <= 250) return 3;
  return 5;
}

// ─── 1) Offline matrix ───────────────────────────────────────
function runOfflineMatrix() {
  const rows = [];
  const seed = 2026;

  function tank() {
    const c = makeCharacter("GUERREIRO", 10, "str_heavy");
    c.attributes.con = Math.max(c.attributes.con, 220);
    return c;
  }

  function snap(label, c, r, extra = {}) {
    return {
      label,
      ticks: r.ticks,
      rewardedMs: r.rewardedMs,
      elapsedSinceLastMs: r.elapsedSinceLastMs,
      catchUpPending: r.catchUpPending,
      catchUpId: r.catchUpId,
      xpGained: r.xpGained,
      goldGained: r.goldGained,
      faints: r.faints,
      lastTickAt: c.lastTickAt,
      offlineCatchUpId: c.offlineCatchUpId,
      farmZoneId: c.farmZoneId,
      ...extra,
    };
  }

  // 2h / 6h / 24h — single return
  for (const hours of [2, 6, 24]) {
    const c = tank();
    startFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt);
    const now = t0 + hours * 3600_000;
    const r1 = processFarm(c, now, { rng: makeSeededRng(seed) });
    const last1 = c.lastTickAt;
    const r2 = processFarm(c, now, { rng: makeSeededRng(seed) }); // same instant
    rows.push(
      snap(`offline_${hours}h_call1`, c, r1, {
        wallMs: hours * 3600_000,
        lastTickDeltaMs: Date.parse(last1) - t0,
        sumRewardedAfterCall1: r1.rewardedMs,
      }),
    );
    rows.push(
      snap(`offline_${hours}h_call2_same_now`, c, r2, {
        wallMs: hours * 3600_000,
        note: "mesma now — esperado ticks=0 se sem pending da janela 2h",
        sumRewardedBoth: r1.rewardedMs + r2.rewardedMs,
      }),
    );
  }

  // 5k ticks pending vs idle same-now
  {
    const c = tank();
    c.attributes.dex = 200;
    startFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt);
    const interval = computeStats(c).attackIntervalMs;
    const r1 = processFarm(c, t0 + TWO_H, { rng: makeSeededRng(seed), maxTicks: 5000 });
    const last1 = Date.parse(c.lastTickAt);
    const r2same = processFarm(c, t0 + TWO_H, { rng: makeSeededRng(seed), maxTicks: 5000 });
    const r2adv = processFarm(c, last1 + interval * 50, {
      rng: makeSeededRng(seed),
      maxTicks: 5000,
    });
    rows.push(
      snap("maxTicks_5000_call1", c, r1, {
        expectedPending: true,
        lastTickDeltaMs: last1 - t0,
      }),
    );
    rows.push(
      snap("maxTicks_5000_call2_same_wall_now", c, r2same, {
        note: "mesma now da call1; se pending=true na call1, ainda há remaining na janela → pode ter ticks>0",
      }),
    );
    // Re-run clean for advance case
    const c3 = tank();
    c3.attributes.dex = 200;
    startFarm(c3, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t03 = Date.parse(c3.lastTickAt);
    const r31 = processFarm(c3, t03 + TWO_H, { rng: makeSeededRng(seed), maxTicks: 5000 });
    const last31 = Date.parse(c3.lastTickAt);
    const r32 = processFarm(c3, last31 + interval * 50, {
      rng: makeSeededRng(seed),
      maxTicks: 5000,
    });
    rows.push(snap("maxTicks_5000_call1_fresh", c3, r31));
    rows.push(
      snap("maxTicks_5000_call2_advance_from_lastTick", c3, r32, {
        note: "avança a partir de lastTickAt — processa resto da janela ou novo elapsed",
        sumRewarded: r31.rewardedMs + r32.rewardedMs,
        windowCapMs: TWO_H,
      }),
    );
  }

  // Restart between chunks (serialize state)
  {
    const c = tank();
    c.attributes.dex = 200;
    startFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt);
    const r1 = processFarm(c, t0 + TWO_H, { rng: makeSeededRng(seed), maxTicks: 5000 });
    const blob = JSON.parse(JSON.stringify(c));
    const r2 = processFarm(blob, Date.parse(blob.lastTickAt) + 30_000, {
      rng: makeSeededRng(seed),
      maxTicks: 5000,
    });
    rows.push(snap("restart_chunk1", c, r1));
    rows.push(
      snap("restart_chunk2_after_reload", blob, r2, {
        catchUpIdStable: r1.catchUpId === r2.catchUpId || !r2.catchUpPending,
      }),
    );
  }

  // Faint
  {
    const c = makeCharacter("GUERREIRO", 1, "dex_heavy");
    // frágil
    c.attributes = { ...CLASSES.GUERREIRO.base, con: 5, str: 5 };
    startFarm(c, "bosque_sussurros", { rng: makeSeededRng(7) });
    const t0 = Date.parse(c.lastTickAt);
    const r = processFarm(c, t0 + TWO_H, { rng: makeSeededRng(7) });
    rows.push(
      snap("faint_during_2h", c, r, {
        note: "personagem frágil — faint pode encerrar catch-up",
      }),
    );
  }

  // Clock advance after completed 2h catch-up from 6h wall
  {
    const c = tank();
    startFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
    const t0 = Date.parse(c.lastTickAt);
    const wallNow = t0 + 6 * 3600_000;
    const r1 = processFarm(c, wallNow, { rng: makeSeededRng(seed) });
    const last = Date.parse(c.lastTickAt);
    const r2 = processFarm(c, last + 10 * 60_000, { rng: makeSeededRng(seed + 1) });
    rows.push(
      snap("6h_wall_then_10m_real_advance", c, r2, {
        call1RewardedMs: r1.rewardedMs,
        call1LastDeltaMs: last - t0,
        call2RewardedMs: r2.rewardedMs,
        note: "após teto 2h, avanço real só paga o novo elapsed — buraco 4h não retorna",
        unrecoveredWallMs: 6 * 3600_000 - r1.rewardedMs,
      }),
    );
  }

  const interpretation = {
    maxCatchUpMsPerRequest: TWO_H,
    finding:
      "Uma ausência de 6h/24h na 1ª call paga no máximo ~2h (ou menos se 5k ticks/faint). " +
      "lastTickAt avança ~rewardedMs; o restante do wall clock NÃO fica pendente. " +
      "catchUpPending=true só quando maxTicks corta a janela já limitada a 2h. " +
      "Segunda call no mesmo now: ticks=0 SE pending=false; se pending=true ainda há remaining na janela.",
    previousReportCorrection:
      "A afirmação de que múltiplas calls recuperam 6h/24h de wall clock estava incorreta para retorno único após ausência longa.",
  };

  return { rows, interpretation };
}

// ─── 2) Archer A/B/C ─────────────────────────────────────────
function runArcherStudy() {
  const b = getBalance();
  const levels = [10, 250, 500];
  const builds = ["dex_heavy", "str_heavy", "hybrid", "under_caps", "dex_overcap"];
  const formulas = ["A", "B", "C"];
  const cells = [];

  for (const level of levels) {
    const zone = zoneForLevel(level);
    const mob = scaleMonster(zone.monsters[0], zone);
    const boss = buildZoneBoss(zone);
    for (const build of builds) {
      for (const gear of ["starter", "mid", "end"]) {
        const c = makeCharacter("ARQUEIRO", level, build);
        if (gear === "mid") equipTierGear(c, tierForLevel(level), 5);
        if (gear === "end") equipTierGear(c, Math.max(tierForLevel(level), 5), 10);
        const real = computeStats(c);
        const attackFlat = real.attack - Math.round(b.baseAttack + c.attributes.str * b.kAtk);
        // attackFlat approx from gear — better: compare mirror naked vs with gear using real for A
        for (const formula of formulas) {
          const mirrored =
            formula === "A"
              ? {
                  maxHp: real.maxHp,
                  attack: real.attack,
                  defense: real.defense,
                  attackIntervalMs: real.attackIntervalMs,
                  critChance: real.critChance,
                  source: "computeStats_motor",
                }
              : {
                  ...mirrorStats(c.attributes, level, "ARQUEIRO", formula, b),
                  // aplica mesmo bonus flat estimado do gear sob A
                  attack:
                    mirrorAttack(c.attributes, "ARQUEIRO", formula, b) +
                    (real.attack - Math.round(b.baseAttack + c.attributes.str * b.kAtk)),
                  maxHp: real.maxHp,
                  defense: real.defense,
                  attackIntervalMs: real.attackIntervalMs,
                  critChance: real.critChance,
                  source: "mirror_formula_attrs_plus_gearFlat_from_A",
                };
          const ttkMob = ttk(mirrored, mob, "ARQUEIRO");
          const ttkBoss = ttk(mirrored, boss, "ARQUEIRO");
          const basicDps = dpsOf(mirrored, "ARQUEIRO");
          const skillEst =
            formula === "A" ? estimateSkillDps(c, real) : { kind: "estimated_skill_model", note: "só sob A (motor)", dps: null };
          const killTimeS = Math.max(mirrored.attackIntervalMs / 1000, ttkMob.seconds);
          cells.push({
            level,
            build,
            gear,
            formula,
            attrs: { ...c.attributes },
            stats: mirrored,
            dpsBasicAnalytical: Number(basicDps.toFixed(2)),
            skillModel: skillEst,
            ttkMob,
            ttkBoss,
            xpPerHourAnalytical: Number(((3600 / killTimeS) * (mob.xp || 1)).toFixed(1)),
            goldPerHourAnalytical: Number(((3600 / killTimeS) * (mob.gold || 0)).toFixed(1)),
            zoneId: zone.id,
            metricKinds: {
              dpsBasic: "analytical",
              skillDps: skillEst.kind,
              ttk: "analytical_basic_attack",
              xpGoldPerHour: "analytical_from_ttk",
            },
          });
        }
      }
    }
  }

  // Pós-ascensão: ritual real preservando attrs
  const preAsc = makeCharacter("ARQUEIRO", MORTAL_LEVEL_CAP, "str_heavy");
  equipTierGear(preAsc, 5, 10);
  const attrsBefore = { ...preAsc.attributes };
  const statsBefore = computeStats(preAsc);
  preAsc.gold = DIVINDADE_GOLD_COST;
  preAsc.inventory.push(createItem(SUCO_CELESTIAL_TEMPLATE_ID, "legendary", 1));
  performClassificationRitual(preAsc);
  const attrsAfter = { ...preAsc.attributes };
  const statsAfter = computeStats(preAsc);
  const ascension = {
    note: "attrs preservados pelo ritual; level→1; +20 unspent não redistribuídos nesta célula",
    attrsBefore,
    attrsAfter,
    attrsEqual: JSON.stringify(attrsBefore) === JSON.stringify(attrsAfter),
    levelBefore: MORTAL_LEVEL_CAP,
    levelAfter: preAsc.level,
    classification: preAsc.ascension,
    unspentAfter: preAsc.unspentPoints,
    statsBefore: {
      attack: statsBefore.attack,
      dps: Number(dpsOf(statsBefore, "ARQUEIRO").toFixed(2)),
      maxHp: statsBefore.maxHp,
    },
    statsAfterA: {
      attack: statsAfter.attack,
      dps: Number(dpsOf(statsAfter, "ARQUEIRO").toFixed(2)),
      maxHp: statsAfter.maxHp,
    },
    formulasPostAscension: ["A", "B", "C"].map((formula) => {
      const m =
        formula === "A"
          ? statsAfter
          : {
              ...mirrorStats(attrsAfter, 1, "ARQUEIRO", formula, b),
              attack:
                mirrorAttack(attrsAfter, "ARQUEIRO", formula, b) +
                (statsAfter.attack - Math.round(b.baseAttack + attrsAfter.str * b.kAtk)),
              attackIntervalMs: statsAfter.attackIntervalMs,
              critChance: statsAfter.critChance,
              maxHp: statsAfter.maxHp,
            };
      return {
        formula,
        attack: m.attack,
        dpsBasicAnalytical: Number(dpsOf(m, "ARQUEIRO").toFixed(2)),
        deltaAtkVsA: m.attack - statsAfter.attack,
        deltaDpsVsA: Number((dpsOf(m, "ARQUEIRO") - dpsOf(statsAfter, "ARQUEIRO")).toFixed(2)),
      };
    }),
  };

  // Impacto C em STR-existing @250 e @500
  const impactExisting = [250, 500].map((level) => {
    const c = makeCharacter("ARQUEIRO", level, "str_heavy");
    equipTierGear(c, tierForLevel(level), 5);
    const aStats = computeStats(c);
    const gearFlat = aStats.attack - Math.round(b.baseAttack + c.attributes.str * b.kAtk);
    const atkB = mirrorAttack(c.attributes, "ARQUEIRO", "B", b) + gearFlat;
    const atkC = mirrorAttack(c.attributes, "ARQUEIRO", "C", b) + gearFlat;
    const zone = zoneForLevel(level);
    const mob = scaleMonster(zone.monsters[0], zone);
    const sA = aStats;
    const sB = { ...aStats, attack: atkB };
    const sC = { ...aStats, attack: atkC };
    return {
      level,
      build: "str_heavy",
      gear: "mid_refine5",
      attackA: sA.attack,
      attackB: atkB,
      attackC: atkC,
      deltaAtkC_vs_A: atkC - sA.attack,
      deltaAtkPctC_vs_A: Number((((atkC - sA.attack) / sA.attack) * 100).toFixed(2)),
      dpsA: Number(dpsOf(sA, "ARQUEIRO").toFixed(2)),
      dpsB: Number(dpsOf(sB, "ARQUEIRO").toFixed(2)),
      dpsC: Number(dpsOf(sC, "ARQUEIRO").toFixed(2)),
      ttkA: ttk(sA, mob, "ARQUEIRO"),
      ttkC: ttk(sC, mob, "ARQUEIRO"),
      migrationNote:
        atkC < sA.attack
          ? "C reduz ATK de builds STR-heavy — reset/redistribuição para DEX mitigaria, mas exige decisão de produto"
          : "C não reduz ATK neste ponto",
    };
  });

  // processFarm medido (multi-seed) — Lv10 bosque, str_heavy vs dex_heavy, fórmula A only
  const farmMeasured = [];
  for (const build of ["str_heavy", "dex_heavy"]) {
    const seeds = [11, 22, 33];
    const runs = seeds.map((seed) => {
      const c = makeCharacter("ARQUEIRO", 10, build);
      c.attributes.con = Math.max(c.attributes.con, 80);
      startFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
      const t0 = Date.parse(c.lastTickAt);
      let xp = 0;
      let gold = 0;
      let kills = 0;
      let cursor = t0;
      for (let i = 0; i < 6; i += 1) {
        const r = processFarm(c, cursor + 10 * 60_000, { rng: makeSeededRng(seed + i) });
        xp += r.xpGained;
        gold += r.goldGained;
        kills += r.kills;
        cursor = Date.parse(c.lastTickAt || cursor + 10 * 60_000);
        if (!c.farmZoneId) break;
      }
      return { seed, kills, xp, gold, levelEnd: c.level };
    });
    const avg = (k) => runs.reduce((s, r) => s + r[k], 0) / runs.length;
    farmMeasured.push({
      build,
      formula: "A",
      window: "1h_chunks_10m",
      kind: "processFarm_measured",
      seeds,
      runs,
      avgKills: Number(avg("kills").toFixed(1)),
      avgXp: Number(avg("xp").toFixed(1)),
      avgGold: Number(avg("gold").toFixed(1)),
    });
  }

  return { cells, ascension, impactExisting, farmMeasured };
}

// ─── 3) TTK decomposition ────────────────────────────────────
function runTtkStudy() {
  const b = getBalance();
  const level = 250;
  const expected = expectedPlayerPower(level);
  const zone = findZone("floresta_amaldicoada");
  const mob = scaleMonster(zone.monsters[0], zone);
  const warrior = makeCharacter("GUERREIRO", level, "str_heavy");
  const wNaked = computeStats(warrior);
  equipTierGear(warrior, 3, 5);
  const wGeared = computeStats(warrior);

  const archerDex = makeCharacter("ARQUEIRO", level, "dex_heavy");
  const aDex = computeStats(archerDex);
  const archerStr = makeCharacter("ARQUEIRO", level, "str_heavy");
  const aStr = computeStats(archerStr);

  function pack(label, stats, classId) {
    const t = ttk(stats, mob, classId);
    return {
      label,
      attack: stats.attack,
      defense: stats.defense,
      intervalMs: stats.attackIntervalMs,
      crit: Number(stats.critChance.toFixed(4)),
      maxHp: stats.maxHp,
      ttkHits: t.hits,
      ttkSeconds: t.seconds,
      avgHit: t.avgHit,
      vsExpectedAtkRatio: Number((stats.attack / expected.attack).toFixed(3)),
    };
  }

  return {
    level,
    zoneId: zone.id,
    mob: { hp: mob.hp, attack: mob.attack, defense: monsterDefense(mob), xp: mob.xp, gold: mob.gold },
    balanceTargets: { mobHitsToKill: b.mobHitsToKill, bossHitsToKill: b.bossHitsToKill },
    expectedPlayerPower: expected,
    expectedFormula:
      "attack = baseAttack + (10+L*1.2)*kAtk + L*1.5; NÃO usa computeStats nem pontos reais",
    warriorNaked: pack("guerreiro_str65_naked", wNaked, "GUERREIRO"),
    warriorGeared: pack("guerreiro_str65_gear_r5", wGeared, "GUERREIRO"),
    archerDexNaked: pack("arqueiro_dex65_naked", aDex, "ARQUEIRO"),
    archerStrNaked: pack("arqueiro_str65_naked", aStr, "ARQUEIRO"),
    gapAnalysis: {
      expectedAtk: Number(expected.attack.toFixed(1)),
      warriorNakedAtk: wNaked.attack,
      delta: wNaked.attack - expected.attack,
      origins: [
        "expected usa attrs médios 10+L*1.2 (~310 @250) em kAtk + bônus L*1.5",
        "sim Guerreiro investe ~65% dos pontos em STR (~812 STR efetivo) → ATK muito acima",
        "gear mid aumenta ainda mais o chip → TTK < mobHitsToKill",
        "meta 8–12 hits calibra o monstro ao poder ESPERADO, não a builds otimizadas",
      ],
    },
  };
}

// ─── main ────────────────────────────────────────────────────
const catalogMeta = loadCatalogOverrides();
const offline = runOfflineMatrix();
const archer = runArcherStudy();
const ttkStudy = runTtkStudy();

const summary = {
  generatedAt: new Date().toISOString(),
  balanceDefaults: DEFAULT_BALANCE,
  activeBalance: getBalance(),
  balanceOverridesInMemory: getBalanceOverrides(),
  catalogMeta,
  dropChanceCode: DROP_CHANCE,
  offlineInterpretation: offline.interpretation,
  offlineHighlights: offline.rows
    .filter((r) =>
      /offline_6h_call1|offline_24h_call1|offline_6h_call2|maxTicks_5000_call1_fresh|maxTicks_5000_call2_same|6h_wall_then/.test(
        r.label,
      ),
    )
    .map((r) => ({
      label: r.label,
      rewardedMs: r.rewardedMs,
      ticks: r.ticks,
      pending: r.catchUpPending,
      elapsed: r.elapsedSinceLastMs,
      lastTickAt: r.lastTickAt,
      unrecoveredWallMs: r.unrecoveredWallMs,
      sumRewarded: r.sumRewarded,
      note: r.note,
    })),
  impactExistingStrArcher: archer.impactExisting,
  ascensionCheck: archer.ascension,
  ttkGap: ttkStudy.gapAnalysis,
  recommendationDraft: {
    note: "preenchido no markdown após leitura das tabelas — script não decide sozinho",
  },
};

writeJson("balance_study_meta.json", summary);
writeJson("balance_study_offline.json", offline);
writeJson("balance_study_archer.json", {
  cells: archer.cells,
  ascension: archer.ascension,
  impactExisting: archer.impactExisting,
  farmMeasured: archer.farmMeasured,
});
writeJson("balance_study_ttk.json", ttkStudy);

console.log("Wrote balance study to", OUT);
console.log(
  "Offline 6h call1 rewardedMs=",
  offline.rows.find((r) => r.label === "offline_6h_call1")?.rewardedMs,
);
console.log(
  "Offline 6h call2 same now ticks=",
  offline.rows.find((r) => r.label === "offline_6h_call2_same_now")?.ticks,
);
console.log("Impact C@250 ΔATK%=", archer.impactExisting[0]?.deltaAtkPctC_vs_A);
console.log("TTK warrior naked hits=", ttkStudy.warriorNaked.ttkHits);
