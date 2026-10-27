import { RARITIES, DROP_CHANCE } from "../../lib/sinergia-idle/game/items.ts";
import { REFINE_STAT_BONUS, MAX_REFINE } from "../../lib/sinergia-idle/game/balance.ts";

const RARITY_ORDER = Object.keys(RARITIES);
const RARITY_WEIGHT = RARITY_ORDER.reduce((s, r) => s + RARITIES[r].weight, 0);

export function rollRarity(rng) {
  let t = rng() * RARITY_WEIGHT;
  for (const r of RARITY_ORDER) {
    t -= RARITIES[r].weight;
    if (t <= 0) return r;
  }
  return "common";
}

/** Gear flat bonus esperado por nível (aquisição progressiva). */
export function expectedGearBonus(level, {
  dropChance = DROP_CHANCE,
  refineModel = "current",
  classId = "GUERREIRO",
} = {}) {
  // dropChance alto → raridade efetiva sobe mais cedo
  const dropFactor = Math.min(2, dropChance / 0.11);
  const progress = Math.min(1, level / 500);
  const rarityScore = progress * dropFactor; // 0..2
  let mult = 1;
  if (rarityScore > 0.3) mult = 1.25;
  if (rarityScore > 0.6) mult = 1.55;
  if (rarityScore > 1.0) mult = 2.0;
  if (rarityScore > 1.4) mult = 2.8;

  let refine = 0;
  if (refineModel === "current") {
    refine = Math.min(MAX_REFINE, Math.floor(level / 45));
  } else if (refineModel === "B-det" || refineModel === "B-prob") {
    // mais lento: +1 a cada ~70 níveis efetivos
    refine = Math.min(MAX_REFINE, Math.floor(level / 70));
  }

  const pieces = Math.min(8, 2 + Math.floor(level / 60));
  const bonusPer = refineModel === "current" ? REFINE_STAT_BONUS : refine <= 4 ? 3 : 4;
  const refineFlat = pieces * refine * bonusPer * 0.35; // fraction of pieces on primary

  const base = Math.floor((8 + level / 12) * mult);
  const primary = classId === "MAGO" ? "int" : classId === "ARQUEIRO" ? "dex" : "str";
  const bonus = {
    str: primary === "str" ? base + refineFlat : Math.floor(base * 0.25),
    int: primary === "int" ? base + refineFlat : Math.floor(base * 0.2),
    dex: primary === "dex" ? base + refineFlat : Math.floor(base * 0.35),
    con: Math.floor(base * 0.45 + refineFlat * 0.3),
    attack: Math.floor(base * 0.35),
    defense: Math.floor(base * 0.3),
    hp: Math.floor(base * 2),
    pieces,
    refineAvg: refine,
    rarityMult: mult,
  };
  return bonus;
}

/** Custo esperado de refine por modelo (simulação econômica). */
export function refineCostTable(model) {
  const rows = [];
  for (let lv = 1; lv <= 10; lv++) {
    if (model === "current") {
      rows.push({
        level: lv,
        model,
        success: 1,
        refiners: 1,
        gold: 25000,
        materialTier: 0,
        bonusPerStat: 5,
      });
    } else if (model === "B-det") {
      const gold = Math.floor(15000 * Math.pow(1.55, lv - 1));
      const refiners = lv <= 3 ? 1 : lv <= 6 ? 2 : 3;
      const mat = lv <= 3 ? 1 : lv <= 6 ? 2 : 3;
      rows.push({
        level: lv,
        model,
        success: 1,
        refiners,
        gold,
        materialTier: mat,
        bonusPerStat: lv <= 4 ? 3 : 4,
      });
    } else {
      // B-prob
      const success = lv <= 4 ? 1 : lv <= 7 ? 0.85 - (lv - 5) * 0.05 : 0.6;
      const gold = Math.floor(15000 * Math.pow(1.45, lv - 1));
      const expectedAttempts = 1 / success;
      rows.push({
        level: lv,
        model,
        success,
        refiners: expectedAttempts,
        gold: Math.floor(gold * expectedAttempts),
        materialTier: lv <= 4 ? 1 : 2,
        bonusPerStat: lv <= 4 ? 3 : 4,
        break: false,
      });
    }
  }
  return rows;
}

export function totalRefineCostToMax(model, pieces = 8) {
  const table = refineCostTable(model);
  let refiners = 0;
  let gold = 0;
  for (const row of table) {
    refiners += row.refiners * pieces;
    gold += row.gold * pieces;
  }
  return { model, pieces, refiners: Math.round(refiners), gold, rows: table };
}
