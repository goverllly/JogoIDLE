/**
 * Fase 4.5 — Simulação econômica isolada (somente leitura do motor).
 * Não altera fórmulas, save.json, nem docs/balanceamento/.
 *
 * Saída: AUDITORIA_JOGO_IDLE/fase4_economy/ (ou IDLE_P4_ECONOMY_OUT).
 * Uso: cd idle && npx tsx scripts/balance-audit/phase4-economy-sim.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_BALANCE,
  getBalance,
  setBalanceOverrides,
  xpToNextLevel,
  totalXpToReach,
  MORTAL_LEVEL_CAP,
  DIVINDADE_GOLD_COST,
} from "../../lib/jogo-idle/game/balance.ts";
import { CLASSES, findZone, scaleMonster, buildZoneBoss, monsterDefense } from "../../lib/jogo-idle/game/data.ts";
import { DROP_CHANCE, createItem, rollDrop } from "../../lib/jogo-idle/game/items.ts";
import {
  createCharacter,
  computeStats,
  applyRewards,
  performClassificationRitual,
} from "../../lib/jogo-idle/game/character.ts";
import { processFarm, startFarm } from "../../lib/jogo-idle/game/combat.ts";
import { ensureChapters } from "../../lib/jogo-idle/game/chapters.ts";
import { SUCO_CELESTIAL_TEMPLATE_ID } from "../../lib/jogo-idle/game/items.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const OUT =
  process.env.IDLE_P4_ECONOMY_OUT ||
  join(ROOT, "AUDITORIA_JOGO_IDLE/fase4_economy");

setBalanceOverrides(null);

function makeSeededRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function ensureOut() {
  mkdirSync(OUT, { recursive: true });
}

function writeJson(name, data) {
  ensureOut();
  writeFileSync(join(OUT, name), JSON.stringify(data, null, 2) + "\n", "utf8");
}

function attrsForLevel(classId, level, ascension = null) {
  const cls = CLASSES[classId];
  const base = { ...cls.base };
  const pointsPer = ascension ? 10 : 5;
  const gained = Math.max(0, level - 1) * pointsPer + (ascension ? 20 : 0);
  // Distribui no atributo primário + con
  const primary =
    classId === "MAGO" ? "int" : classId === "ARQUEIRO" ? "dex" : "str";
  base[primary] += Math.floor(gained * 0.65);
  base.con += Math.floor(gained * 0.35);
  return base;
}

function statsAt(classId, level, ascension = null) {
  const c = createCharacter(`Sim_${classId}`, classId);
  ensureChapters(c);
  c.level = level;
  c.ascension = ascension;
  c.attributes = attrsForLevel(classId, level, ascension);
  return { character: c, stats: computeStats(c) };
}

function dpsOf(stats) {
  const intervalS = stats.attackIntervalMs / 1000;
  const critMult = 1 + stats.critChance * 0.8; // crit = ×1.8 → +0.8
  return (stats.attack * critMult) / intervalS;
}

function ttkHits(playerAtk, monster, critChance = 0) {
  const mit = monsterDefense(monster);
  const base = Math.max(1, Math.floor(playerAtk - mit));
  const avg = base * (1 + critChance * 0.8);
  return monster.hp / Math.max(1, avg);
}

function zoneForChapterProgress(chapterId, band) {
  // band: start | mid | end — regiões canônicas Cap.I
  const map = {
    I: {
      start: "bosque_sussurros",
      mid: "floresta_amaldicoada",
      end: "coracao_floresta",
    },
  };
  return findZone(map[chapterId]?.[band] || "bosque_sussurros");
}

function levelForBand(band) {
  if (band === "start") return 1;
  if (band === "mid") return 250;
  return 500;
}

const CLASS_IDS = ["GUERREIRO", "BARBARO", "MAGO", "ARQUEIRO"];
const BANDS = ["start", "mid", "end"];

const classReport = [];

for (const classId of CLASS_IDS) {
  for (const band of BANDS) {
    const level = levelForBand(band);
    const zone = zoneForChapterProgress("I", band);
    const { stats } = statsAt(classId, level);
    const mob = scaleMonster(zone.monsters[0], zone);
    const boss = buildZoneBoss(zone);
    const dps = dpsOf(stats);
    const ttkMob = ttkHits(stats.attack, mob, stats.critChance);
    const ttkBoss = ttkHits(stats.attack, boss, stats.critChance);
    const killTimeS = Math.max(stats.attackIntervalMs / 1000, (ttkMob * stats.attackIntervalMs) / 1000);
    const xpPerKill = mob.xp || 1;
    const goldPerKill = mob.gold || 0;
    const killsPerHour = 3600 / killTimeS;
    classReport.push({
      classId,
      band,
      level,
      zoneId: zone.id,
      zoneName: zone.name,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: stats.defense,
      attackIntervalMs: stats.attackIntervalMs,
      critChance: Number(stats.critChance.toFixed(4)),
      dps: Number(dps.toFixed(2)),
      ttkMobHits: Number(ttkMob.toFixed(2)),
      ttkBossHits: Number(ttkBoss.toFixed(2)),
      xpPerHour: Number((killsPerHour * xpPerKill).toFixed(1)),
      goldPerHour: Number((killsPerHour * goldPerKill).toFixed(1)),
      mobHp: mob.hp,
      mobAtk: mob.attack,
      premises: "gear starter only; attrs 65% primary / 35% con; no skills; no engagement",
    });
  }
}

// Farm sim 1h online (tank mid Cap.I) por classe
const farmHour = [];
for (const classId of CLASS_IDS) {
  const c = createCharacter(`Farm_${classId}`, classId);
  ensureChapters(c);
  c.level = 10;
  c.attributes = attrsForLevel(classId, 10);
  c.attributes.con = Math.max(c.attributes.con, 80);
  const seed = 100 + CLASS_IDS.indexOf(classId);
  startFarm(c, "bosque_sussurros", { rng: makeSeededRng(seed) });
  const t0 = Date.parse(c.lastTickAt);
  // 1h em chunks de 10m para não depender só de 5k ticks
  let xp = 0;
  let gold = 0;
  let kills = 0;
  let cursor = t0;
  for (let i = 0; i < 6; i += 1) {
    const now = cursor + 10 * 60_000;
    const r = processFarm(c, now, { rng: makeSeededRng(seed + i) });
    xp += r.xpGained;
    gold += r.goldGained;
    kills += r.kills;
    cursor = Date.parse(c.lastTickAt || now);
    if (!c.farmZoneId) break;
  }
  farmHour.push({
    classId,
    levelStart: 10,
    levelEnd: c.level,
    windowMs: 60 * 60_000,
    kills,
    xpGained: xp,
    goldGained: gold,
    goldEnd: c.gold,
  });
}

// Pré / pós ritual (analítico)
const prePost = [];
for (const classId of CLASS_IDS) {
  const pre = statsAt(classId, MORTAL_LEVEL_CAP);
  const c = pre.character;
  c.gold = DIVINDADE_GOLD_COST;
  c.inventory = [createItem(SUCO_CELESTIAL_TEMPLATE_ID, "legendary", 1)];
  performClassificationRitual(c);
  const post = computeStats(c);
  prePost.push({
    classId,
    pre: {
      level: MORTAL_LEVEL_CAP,
      classification: "MORTAL",
      maxHp: pre.stats.maxHp,
      attack: pre.stats.attack,
      dps: Number(dpsOf(pre.stats).toFixed(2)),
    },
    post: {
      level: c.level,
      classification: c.ascension,
      chapter: c.chapters?.currentChapterId,
      maxHp: post.maxHp,
      attack: post.attack,
      dps: Number(dpsOf(post).toFixed(2)),
      unspentPoints: c.unspentPoints,
      gold: c.gold,
    },
  });
}

// XP curve milestones
const xpMilestones = [1, 10, 50, 100, 250, 500].map((L) => ({
  level: L,
  xpToNext: L < MORTAL_LEVEL_CAP ? xpToNextLevel(L) : null,
  totalXpToReach: totalXpToReach(L),
}));

const meta = {
  generatedAt: new Date().toISOString(),
  out: OUT,
  balance: DEFAULT_BALANCE,
  dropChance: DROP_CHANCE,
  divindadeGoldCost: DIVINDADE_GOLD_COST,
  notes: [
    "Somente leitura — sem retune de fórmulas/preços/probs.",
    "Não escreve idle/data/save.json nem docs/balanceamento/.",
    "Premissas explícitas em cada linha do classReport.",
    "Farm 1h: personagem Lv.10 tank-ish no Bosque; RNG seeded; sem engagement.",
  ],
  getBalanceSnapshot: getBalance(),
};

writeJson("00_meta.json", meta);
writeJson("class_power_bands.json", classReport);
writeJson("farm_1h_bosque.json", farmHour);
writeJson("ascension_pre_post.json", prePost);
writeJson("xp_milestones.json", xpMilestones);

console.log("Phase 4.5 economy sim written to", OUT);
console.log(
  "Sample DPS @ mid Cap.I:",
  classReport
    .filter((r) => r.band === "mid")
    .map((r) => `${r.classId}=${r.dps}`)
    .join(" "),
);
