// @ts-nocheck
import { randomUUID } from 'crypto';
import {
  CLASSES,
  monsterDefense,
  ZONES,
  zoneBossWaveSize,
  resolveZoneId,
  findZone,
} from './data';
import {
  getBalance,
  levelCapFor,
  pointsForLevelUp,
  xpToNextLevel,
  MORTAL_LEVEL_CAP,
  CELESTIAL_ASCEND_BONUS,
  DIVINDADE_GOLD_COST,
} from './balance';
import { ensureGear, equipmentBonus, publicGear } from './inventory';
import { ATTR_RESET_TEMPLATE_ID, SUCO_CELESTIAL_TEMPLATE_ID, publicItem } from './items';
import { normalizeAppearance, DEFAULT_APPEARANCE } from './appearance';
import {
  ensureCosmetics,
  publicCosmetics,
  unlockCosmetic,
} from './cosmetics';
import { ensurePets, publicPets } from './pets';
import {
  ensureSkills,
  grantSkillPointOnLevelUp,
  publicSkills,
  resetSkillsForSeason,
} from './skills';
import { computeHuntRates } from '../hunt-perf';
import {
  defaultInventoryAutomationNew,
  publicInventoryAutomation,
} from '../inventory-automation';
import {
  ensureCombatSkills,
  publicCombatSkills,
  syncCombatSkillUnlocks,
} from './combat-skills';
import {
  ensureChapters,
  getNextClassificationRitual,
  onClassificationRitualComplete,
  currentClassification,
  getPlayIntroPayload,
} from './chapters';
import { listZones } from './data';
import {
  emptyCareer,
  ensureCareer,
  careerAddGoldEarned,
  careerAddGoldSpent,
} from './career';
import {
  applyJourneyEvent,
  ensureJourney,
  journeyOnSeasonRollover,
} from './journey';

export {
  ensureCareer,
  careerAddKills,
  careerAddGoldEarned,
  careerAddGoldSpent,
  careerAddPurchase,
  careerAddPlayMs,
} from './career';

const ATTR_KEYS = ['str', 'int', 'dex', 'con'];

function publicAscensionLegacy(raw) {
  if (!raw || typeof raw !== 'object') return null;
  return {
    characterName: String(raw.characterName || ''),
    classId: String(raw.classId || ''),
    className: String(raw.className || ''),
    ascendedAt: String(raw.ascendedAt || ''),
    createdAt: String(raw.createdAt || ''),
    elapsedMs: Math.max(0, Math.floor(Number(raw.elapsedMs) || 0)),
    playMs: Math.max(0, Math.floor(Number(raw.playMs) || 0)),
    kills: Math.max(0, Math.floor(Number(raw.kills) || 0)),
    bossKills: Math.max(0, Math.floor(Number(raw.bossKills) || 0)),
    goldEarned: Math.max(0, Math.floor(Number(raw.goldEarned) || 0)),
    goldSpent: Math.max(0, Math.floor(Number(raw.goldSpent) || 0)),
    itemsBought: Math.max(0, Math.floor(Number(raw.itemsBought) || 0)),
    levelAtRitual: Math.max(1, Math.floor(Number(raw.levelAtRitual) || MORTAL_LEVEL_CAP)),
    goldSpentOnRitual: Math.max(0, Math.floor(Number(raw.goldSpentOnRitual) || 0)),
  };
}

export function createCharacter(name, classId, appearanceInput) {
  const cls = CLASSES[classId];
  if (!cls) throw new Error('Classe inválida');
  if (!name || name.trim().length < 2 || name.trim().length > 16) {
    throw new Error('Nome deve ter entre 2 e 16 caracteres');
  }

  const attrs = { ...cls.base };
  const character = {
    id: randomUUID(),
    name: name.trim(),
    classId: cls.id,
    level: 1,
    experience: 0,
    gold: 0,
    attributes: attrs,
    unspentPoints: 0,
    attrMigrationV1: true,
    ascension: null,
    currentHp: 0,
    currentMp: 0,
    farmZoneId: null,
    farmStartedAt: null,
    lastTickAt: null,
    autoRestartFarm: false,
    autoHpPotion: { enabled: false, thresholdPct: AUTO_HP_POTION_PCT_DEFAULT },
    combat: null,
    inventory: [],
    bagUpgrades: 0,
    equipment: {},
    engagement: { titles: [] },
    cosmetics: { unlocked: [], capeId: null, armorTintId: null },
    pets: { unlocked: [], activeId: null },
    inventoryAutomation: defaultInventoryAutomationNew(),
    skills: { unspent: 0, unlocked: [], active: null, cooldownUntil: {} },
    skillsMigrationV1: true,
    appearance: normalizeAppearance(appearanceInput || DEFAULT_APPEARANCE, cls.id),
    appearanceLocked: true,
    createdAt: new Date().toISOString(),
    career: emptyCareer(),
    ascensionLegacy: null,
    journey: null,
  };
  ensureGear(character);
  ensureSkills(character);
  ensureJourney(character);
  return character;
}

/** Migração única: concede backlog de pontos livres sem resetar attrs atuais. */
export function ensureAttributeEconomy(character) {
  if (!character.attributes) character.attributes = { str: 5, int: 5, dex: 5, con: 5 };
  for (const k of ATTR_KEYS) {
    character.attributes[k] = Math.max(1, Math.floor(Number(character.attributes[k]) || 1));
  }
  if (character.unspentPoints == null || !Number.isFinite(character.unspentPoints)) {
    character.unspentPoints = 0;
  }
  if (!character.attrMigrationV1) {
    const levelsGained = Math.max(0, (character.level || 1) - 1);
    character.unspentPoints = Math.max(
      0,
      Math.floor(character.unspentPoints) + levelsGained * pointsForLevelUp({ ascension: null }),
    );
    character.attrMigrationV1 = true;
  }
  if (
    character.ascension &&
    !['CELESTIAL', 'DIVINO', 'SEMIDEUS'].includes(character.ascension)
  ) {
    character.ascension = null;
  } else {
    character.ascension = character.ascension || null;
  }
  return character;
}

export function ensureAppearance(character) {
  character.appearance = normalizeAppearance(character.appearance, character.classId);
  return character.appearance;
}

/** Bloqueado após criação — aparência de nascimento é imutável. */
export function setAppearance(_character, _input) {
  const err = new Error('Aparência só pode ser definida na criação do personagem');
  err.status = 403;
  throw err;
}

export function effectiveAttributes(character) {
  ensureAttributeEconomy(character);
  ensureGear(character);
  const gear = equipmentBonus(character);
  return {
    str: character.attributes.str + (gear.str || 0),
    int: character.attributes.int + (gear.int || 0),
    dex: character.attributes.dex + (gear.dex || 0),
    con: character.attributes.con + (gear.con || 0),
    mpFlat: gear.mp || 0,
    attackFlat: gear.attack || 0,
    defenseFlat: gear.defense || 0,
    hpFlat: gear.hp || 0,
    critFlat: gear.crit || 0,
  };
}

export function computeStats(character) {
  ensureAttributeEconomy(character);
  ensureGear(character);
  const b = getBalance();
  const a = effectiveAttributes(character);
  const cls = CLASSES[character.classId];
  const isMagic = cls?.id === 'MAGO';

  const maxHp = Math.round(
    b.baseHp + a.con * b.kHp + character.level * b.levelHp + a.hpFlat,
  );
  const maxMp = Math.round(
    b.baseMp + a.int * b.kMp + character.level * b.levelMp + a.mpFlat,
  );
  const physicalAttack = Math.round(b.baseAttack + a.str * b.kAtk + a.attackFlat);
  const magicAttack = Math.round(b.baseAttack + a.int * b.kMagicAtk + a.attackFlat);
  const defense = Math.round(
    b.baseDefense + a.con * b.kDefCon + a.str * b.kDefStr + a.defenseFlat,
  );
  const attackIntervalMs = Math.max(
    b.minIntervalMs,
    Math.round(b.baseIntervalMs - a.dex * b.kSpeed),
  );
  const critChance = Math.min(b.maxCrit, a.dex * b.critPerDex + a.critFlat / 100);

  return {
    maxHp,
    maxMp,
    attack: isMagic ? magicAttack : physicalAttack,
    defense,
    attackIntervalMs,
    critChance,
    isMagic,
    effective: { str: a.str, int: a.int, dex: a.dex, con: a.con },
  };
}

const HP_POTION_ID = 'consumable_hp_potion';
const MANA_POTION_ID = 'consumable_mana_potion';
const AUTO_HP_POTION_PCT_MIN = 5;
const AUTO_HP_POTION_PCT_MAX = 95;
const AUTO_HP_POTION_PCT_DEFAULT = 40;

export function ensureAutoHpPotion(character) {
  if (!character.autoHpPotion || typeof character.autoHpPotion !== 'object') {
    character.autoHpPotion = {
      enabled: false,
      thresholdPct: AUTO_HP_POTION_PCT_DEFAULT,
    };
  }
  const cfg = character.autoHpPotion;
  cfg.enabled = Boolean(cfg.enabled);
  const pct = Math.floor(Number(cfg.thresholdPct));
  cfg.thresholdPct = Number.isFinite(pct)
    ? Math.max(AUTO_HP_POTION_PCT_MIN, Math.min(AUTO_HP_POTION_PCT_MAX, pct))
    : AUTO_HP_POTION_PCT_DEFAULT;
  return cfg;
}

/** Liga/desliga auto-poção e/ou ajusta o limiar de HP (%). */
export function setAutoHpPotion(character, { enabled, thresholdPct } = {}) {
  const cfg = ensureAutoHpPotion(character);
  if (enabled != null) cfg.enabled = Boolean(enabled);
  if (thresholdPct != null && thresholdPct !== '') {
    const pct = Math.floor(Number(thresholdPct));
    if (!Number.isFinite(pct)) throw new Error('Informe a % de vida (5–95)');
    cfg.thresholdPct = Math.max(
      AUTO_HP_POTION_PCT_MIN,
      Math.min(AUTO_HP_POTION_PCT_MAX, pct),
    );
  }
  return { ...cfg };
}

/** Bebe poção de vida (restaura 35% do HP máximo). Consome 1 de um stack. */
export function drinkHpPotion(character, uid) {
  // journey potion_used após consumo bem-sucedido (abaixo)
  ensureGear(character);
  const idx = (character.inventory || []).findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error('Poção não encontrada');
  const item = character.inventory[idx];
  if (item.templateId !== HP_POTION_ID) {
    throw new Error('Isso não é uma poção de vida');
  }
  const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
  if (qty <= 1) {
    character.inventory.splice(idx, 1);
  } else {
    item.qty = qty - 1;
  }
  const stats = computeStats(character);
  const heal = Math.max(1, Math.floor(stats.maxHp * 0.35));
  const before = character.currentHp || 0;
  character.currentHp = Math.min(stats.maxHp, before + heal);
  applyJourneyEvent(character, { source: 'farm', type: 'potion_used' });
  return {
    healed: character.currentHp - before,
    currentHp: character.currentHp,
    maxHp: stats.maxHp,
    remaining: qty <= 1 ? 0 : qty - 1,
  };
}

/** Bebe poção de mana (restaura 35% do MP máximo). Consome 1 de um stack. */
export function drinkManaPotion(character, uid) {
  ensureGear(character);
  const idx = (character.inventory || []).findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error('Poção não encontrada');
  const item = character.inventory[idx];
  if (item.templateId !== MANA_POTION_ID) {
    throw new Error('Isso não é uma poção de mana');
  }
  const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
  if (qty <= 1) {
    character.inventory.splice(idx, 1);
  } else {
    item.qty = qty - 1;
  }
  const stats = computeStats(character);
  const restore = Math.max(1, Math.floor(stats.maxMp * 0.35));
  const before = character.currentMp || 0;
  character.currentMp = Math.min(stats.maxMp, before + restore);
  applyJourneyEvent(character, { source: 'farm', type: 'potion_used' });
  return {
    restored: character.currentMp - before,
    currentMp: character.currentMp,
    maxMp: stats.maxMp,
    remaining: qty <= 1 ? 0 : qty - 1,
  };
}

/**
 * Se auto-poção estiver ligada e HP ≤ limiar %, bebe 1 Poção de Vida.
 * Retorna o resultado do heal ou null (desligado / acima do limiar / sem poção).
 */
export function tryAutoHpPotion(character, stats) {
  const cfg = ensureAutoHpPotion(character);
  if (!cfg.enabled) return null;
  const maxHp = Number(stats?.maxHp) || computeStats(character).maxHp;
  if (maxHp <= 0) return null;
  const hpPct = ((character.currentHp || 0) / maxHp) * 100;
  if (hpPct > cfg.thresholdPct) return null;
  ensureGear(character);
  const potion = (character.inventory || []).find((i) => i.templateId === HP_POTION_ID);
  if (!potion) return null;
  return drinkHpPotion(character, potion.uid);
}

export function ensureCombatReady(character) {
  const stats = computeStats(character);
  if (!character.currentHp || character.currentHp <= 0) {
    character.currentHp = stats.maxHp;
  }
  if (character.currentHp > stats.maxHp) character.currentHp = stats.maxHp;
  if (!Number.isFinite(character.currentMp) || character.currentMp < 0) {
    character.currentMp = stats.maxMp;
  }
  if (character.currentMp > stats.maxMp) character.currentMp = stats.maxMp;
  return stats;
}

/** Aplica XP no servidor — level-up concede pontos livres (sem growth automático). */
export function applyRewards(character, { xp = 0, gold = 0 } = {}) {
  ensureAttributeEconomy(character);
  const goldGain = Math.max(0, Math.floor(gold));
  careerAddGoldEarned(character, goldGain);
  character.gold = Math.max(0, character.gold + goldGain);
  const xpGain = Math.max(0, Math.floor(xp));
  character.experience += xpGain;
  if (goldGain > 0) {
    applyJourneyEvent(character, { source: 'farm', type: 'gold_combat', amount: goldGain });
  }
  if (xpGain > 0) {
    applyJourneyEvent(character, { source: 'farm', type: 'xp', amount: xpGain });
  }

  const cap = levelCapFor(character);
  let leveled = 0;
  while (character.level < cap) {
    const need = xpToNextLevel(character.level);
    if (character.experience < need) break;
    character.experience -= need;
    character.level += 1;
    leveled += 1;
    character.unspentPoints += pointsForLevelUp(character);
  }
  if (leveled > 0) {
    grantSkillPointOnLevelUp(character, leveled);
    ensureCombatSkills(character);
    syncCombatSkillUnlocks(character);
    applyJourneyEvent(character, { source: 'farm', type: 'level', level: character.level });
  }

  const stats = computeStats(character);
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;
  return { leveled, stats };
}

/**
 * Distribui pontos livres. Deltas ≥ 0; soma ≤ unspentPoints.
 */
export function allocateAttributes(character, deltas = {}) {
  ensureAttributeEconomy(character);
  const add = {};
  let total = 0;
  for (const k of ATTR_KEYS) {
    const n = Math.floor(Number(deltas[k]) || 0);
    if (n < 0) throw new Error('Não é possível remover pontos');
    add[k] = n;
    total += n;
  }
  if (total <= 0) throw new Error('Informe pelo menos 1 ponto');
  if (total > character.unspentPoints) {
    throw new Error(`Você só tem ${character.unspentPoints} ponto(s) livre(s)`);
  }
  for (const k of ATTR_KEYS) {
    character.attributes[k] += add[k];
  }
  character.unspentPoints -= total;
  const stats = computeStats(character);
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;
  return { attributes: { ...character.attributes }, unspentPoints: character.unspentPoints, stats };
}

/**
 * Devolve pontos investidos acima da base da classe para o pool livre.
 * Não altera nível, skills nem equipamento.
 */
export function resetAllocatedAttributePoints(character) {
  ensureAttributeEconomy(character);
  const cls = CLASSES[character.classId];
  if (!cls?.base) throw new Error('Classe inválida');
  let refunded = 0;
  for (const k of ATTR_KEYS) {
    const base = Math.max(0, Math.floor(Number(cls.base[k]) || 0));
    const cur = Math.max(0, Math.floor(Number(character.attributes?.[k]) || 0));
    if (cur > base) {
      refunded += cur - base;
      character.attributes[k] = base;
    } else {
      character.attributes[k] = base;
    }
  }
  if (refunded <= 0) {
    throw new Error('Nenhum ponto distribuído para resetar');
  }
  character.unspentPoints = Math.max(0, Math.floor(Number(character.unspentPoints) || 0) + refunded);
  const stats = computeStats(character);
  character.currentHp = Math.min(Math.max(1, Number(character.currentHp) || 1), stats.maxHp);
  character.currentMp = Math.min(Math.max(0, Number(character.currentMp) || 0), stats.maxMp);
  return {
    refunded,
    attributes: { ...character.attributes },
    unspentPoints: character.unspentPoints,
    stats,
  };
}

/**
 * Consome 1 Reset de Pontos da mochila e devolve attrs investidos ao pool livre.
 */
export function useAttributeResetConsumable(character, uid) {
  ensureGear(character);
  ensureAttributeEconomy(character);
  const idx = (character.inventory || []).findIndex(
    (i) => i.uid === uid && i.templateId === ATTR_RESET_TEMPLATE_ID,
  );
  if (idx < 0) throw new Error('Reset de Pontos não encontrado na mochila');
  const [item] = character.inventory.splice(idx, 1);
  try {
    const result = resetAllocatedAttributePoints(character);
    return {
      ...result,
      item: publicItem(item),
      message: `Pontos resetados: +${result.refunded.toLocaleString('pt-BR')} livres`,
    };
  } catch (error) {
    character.inventory.splice(idx, 0, item);
    throw error;
  }
}

/**
 * Ritual de classificação (Suco Divino + gold).
 * Mortal→Celestial, Celestial→Divino, Divino→Semideus.
 * Mantém atributos, unspent, inventário e equipamento; recomeça o próximo capítulo no Lv.1.
 */
export function performClassificationRitual(character) {
  ensureAttributeEconomy(character);
  ensureChapters(character);
  const ritual = getNextClassificationRitual(character);
  if (!ritual) {
    throw new Error('Você já alcançou a classificação máxima (Semideus)');
  }
  if ((character.level || 0) < MORTAL_LEVEL_CAP) {
    throw new Error(
      `Precisa ser nível ${MORTAL_LEVEL_CAP} para o ${ritual.label}`,
    );
  }
  const bal = getBalance();
  const goldCost = Math.max(
    1,
    Math.floor(Number(bal.divindadeGoldCost) || DIVINDADE_GOLD_COST),
  );
  if ((character.gold || 0) < goldCost) {
    throw new Error(`Precisa de ${goldCost.toLocaleString('pt-BR')} gold para o ritual`);
  }
  const inv = Array.isArray(character.inventory) ? character.inventory : [];
  const sucoIdx = inv.findIndex((i) => i.templateId === SUCO_CELESTIAL_TEMPLATE_ID);
  if (sucoIdx < 0) {
    throw new Error(
      `Precisa do Suco Divino (MEGA BOSS: ${ritual.zoneHint})`,
    );
  }
  inv.splice(sucoIdx, 1);
  character.inventory = inv;

  const career = ensureCareer(character);
  careerAddGoldSpent(character, goldCost);
  ensureJourney(character);
  applyJourneyEvent(character, {
    source: 'farm',
    type: 'gold_spent_ritual',
    amount: goldCost,
  });
  applyJourneyEvent(character, { source: 'farm', type: 'ascension' });
  const createdAt = character.createdAt || new Date().toISOString();
  const createdMs = Date.parse(createdAt);
  const now = Date.now();
  const ascendedAt = new Date(now).toISOString();
  const cls = CLASSES[character.classId];
  character.ascensionLegacy = {
    characterName: character.name,
    classId: character.classId,
    className: cls?.name || character.classId,
    ascendedAt,
    createdAt,
    elapsedMs: Number.isFinite(createdMs) ? Math.max(0, now - createdMs) : 0,
    playMs: career.playMs,
    kills: career.kills,
    bossKills: career.bossKills,
    goldEarned: career.goldEarned,
    goldSpent: career.goldSpent,
    itemsBought: career.itemsBought,
    levelAtRitual: character.level,
    goldSpentOnRitual: goldCost,
    ritualId: ritual.id,
    classificationTo: ritual.to,
  };

  character.gold = Math.max(0, (character.gold || 0) - goldCost);
  character.unspentPoints = (character.unspentPoints || 0) + CELESTIAL_ASCEND_BONUS;

  character.farmZoneId = null;
  character.farmStartedAt = null;
  character.lastTickAt = null;
  character.combat = null;
  character.farmKills = 0;
  character.farmXp = 0;
  character.farmGold = 0;
  character.farmWaveKills = 0;
  character.farmBossKills = 0;

  onClassificationRitualComplete(character, ritual);

  const eng = character.engagement && typeof character.engagement === 'object'
    ? character.engagement
    : { titles: [] };
  if (!Array.isArray(eng.titles)) eng.titles = [];
  if (ritual.titleGrant && !eng.titles.includes(ritual.titleGrant)) {
    eng.titles.push(ritual.titleGrant);
  }
  character.engagement = eng;
  if (ritual.to === 'CELESTIAL') unlockCosmetic(character, 'cape_celestial');

  const stats = computeStats(character);
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;

  return {
    ritualId: ritual.id,
    ritualLabel: ritual.label,
    resultLabel: ritual.resultLabel,
    ascension: character.ascension,
    classification: ritual.to,
    unlocksChapter: ritual.unlocksChapter,
    level: character.level,
    gold: character.gold,
    unspentPoints: character.unspentPoints,
    stats,
    ascensionLegacy: publicAscensionLegacy(character.ascensionLegacy),
  };
}

/** Compat: primeiro elo da cadeia (Mortal → Celestial). */
export function ascendToCelestial(character) {
  const next = getNextClassificationRitual(character);
  if (!next || next.id !== 'ritual_celestial') {
    throw new Error(
      next
        ? `Use o ritual atual: ${next.label}`
        : 'Já concluiu todos os rituais de classificação',
    );
  }
  return performClassificationRitual(character);
}

/** Elegibilidade do próximo ritual (UI) — server revalida na execução. */
export function canRitualAscend(character) {
  if (!character) return false;
  const ritual = getNextClassificationRitual(character);
  if (!ritual) return false;
  if ((character.level || 0) < MORTAL_LEVEL_CAP) return false;
  const bal = getBalance();
  const goldCost = Math.max(
    1,
    Math.floor(Number(bal.divindadeGoldCost) || DIVINDADE_GOLD_COST),
  );
  if ((character.gold || 0) < goldCost) return false;
  const inv = Array.isArray(character.inventory) ? character.inventory : [];
  return inv.some((i) => i.templateId === SUCO_CELESTIAL_TEMPLATE_ID);
}

export function publicDivindadeState(character) {
  const ritual = getNextClassificationRitual(character);
  const bal = getBalance();
  const goldCost = Math.max(
    1,
    Math.floor(Number(bal.divindadeGoldCost) || DIVINDADE_GOLD_COST),
  );
  const hasSuco = Array.isArray(character?.inventory)
    ? character.inventory.some((i) => i.templateId === SUCO_CELESTIAL_TEMPLATE_ID)
    : false;
  const levelOk = (character?.level || 0) >= MORTAL_LEVEL_CAP;
  const goldOk = (character?.gold || 0) >= goldCost;
  const classification = currentClassification(character);
  return {
    goldCost,
    hasSuco,
    eligible: canRitualAscend(character),
    classification,
    maxed: !ritual,
    nextRitual: ritual
      ? {
          id: ritual.id,
          label: ritual.label,
          resultLabel: ritual.resultLabel,
          from: ritual.from,
          to: ritual.to,
          unlocksChapter: ritual.unlocksChapter,
          zoneHint: ritual.zoneHint,
          levelRequired: MORTAL_LEVEL_CAP,
          levelOk,
          goldOk,
          hasSuco,
        }
      : null,
  };
}

/**
 * Soft reset de temporada: preserva id/nome/classe/aparência; zera progresso econômico.
 * Recria arma starter via ensureGear (starterGiven = false).
 * Preserva journey.lifetime, seasons anteriores e ascensionLegacy.
 * Opcional: closedSeasonKey / nextSeasonKey para arquivar bucket de temporada.
 */
export function softResetCharacterForSeason(character, opts = {}) {
  const cls = CLASSES[character.classId];
  if (!cls) throw new Error('Classe inválida');
  ensureJourney(character);
  const appearance = normalizeAppearance(character.appearance || DEFAULT_APPEARANCE, cls.id);
  const appearanceLocked = Boolean(character.appearanceLocked);
  character.level = 1;
  character.experience = 0;
  character.gold = 0;
  character.attributes = { ...cls.base };
  character.unspentPoints = 0;
  character.attrMigrationV1 = true;
  character.ascension = null;
  character.farmZoneId = null;
  character.farmStartedAt = null;
  character.lastTickAt = null;
  character.combat = null;
  character.arenaMode = false;
  character.inventory = [];
  character.bagUpgrades = 0;
  character.equipment = {};
  character.engagement = { titles: [] };
  const cosmetics = ensureCosmetics(character);
  character.cosmetics = {
    unlocked: [...cosmetics.unlocked],
    capeId: cosmetics.capeId || null,
    armorTintId: cosmetics.armorTintId || null,
  };
  character.farmKills = 0;
  character.farmXp = 0;
  character.farmGold = 0;
  character.farmWaveKills = 0;
  character.starterGiven = false;
  character.appearance = appearance;
  character.appearanceLocked = appearanceLocked;
  character.career = emptyCareer();
  // Preserva ascensionLegacy e journey (lifetime + seasons históricas).
  journeyOnSeasonRollover(character, {
    closedSeasonKey: opts.closedSeasonKey,
    nextSeasonKey: opts.nextSeasonKey,
  });
  resetSkillsForSeason(character);
  ensureGear(character);
  const stats = computeStats(character);
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;
  return character;
}

/** Admin: redefine nível; concede backlog de pontos; mantém attrs base + unspent. */
export function setCharacterLevel(character, targetLevel) {
  const cls = CLASSES[character.classId];
  if (!cls) throw new Error('Classe inválida');
  ensureAttributeEconomy(character);
  const cap = levelCapFor(character);
  const level = Math.max(1, Math.min(cap, Math.floor(Number(targetLevel) || 1)));
  character.attributes = { ...cls.base };
  character.level = level;
  character.experience = 0;
  character.unspentPoints = Math.max(0, (level - 1) * pointsForLevelUp(character));
  character.attrMigrationV1 = true;
  ensureSkills(character);
  character.skills.unlocked = [];
  character.skills.active = null;
  character.skills.cooldownUntil = {};
  character.skills.unspent = Math.max(0, level - 1);
  character.skillsMigrationV1 = true;
  const stats = computeStats(character);
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;
  return stats;
}

export function addCharacterGold(character, amount) {
  const delta = Math.floor(Number(amount) || 0);
  if (!Number.isFinite(delta) || delta === 0) throw new Error('Informe um valor de ouro diferente de zero');
  character.gold = Math.max(0, character.gold + delta);
  return character.gold;
}

export function publicCharacter(character) {
  ensureAttributeEconomy(character);
  ensureSkills(character);
  ensureCareer(character);
  ensureJourney(character);
  const autoHpPotion = ensureAutoHpPotion(character);
  const stats = computeStats(character);
  const need = xpToNextLevel(character.level);
  ensureAppearance(character);
  ensureCosmetics(character);
  ensurePets(character);
  const chapters = ensureChapters(character);
  const resolvedFarm = resolveZoneId(character.farmZoneId);
  if (resolvedFarm && resolvedFarm !== character.farmZoneId) {
    character.farmZoneId = resolvedFarm;
  }
  const out = {
    id: character.id,
    name: character.name,
    classId: character.classId,
    className: CLASSES[character.classId]?.name,
    currentChapterId: chapters.currentChapterId || 'I',
    playIntro: getPlayIntroPayload(character, listZones()),
    level: character.level,
    experience: character.experience,
    experienceToNext: need,
    gold: character.gold,
    attributes: { ...character.attributes },
    effectiveAttributes: stats.effective,
    unspentPoints: character.unspentPoints || 0,
    skills: publicSkills(character),
    combatSkills: (() => {
      const pub = publicCombatSkills(character);
      if (pub.resource?.type === 'mp') pub.resource.max = stats.maxMp;
      return pub;
    })(),
    currentRage: character.classId === 'BARBARO' ? Math.floor(character.currentRage || 0) : undefined,
    maxRage: character.classId === 'BARBARO' ? character.maxRage || 100 : undefined,
    ascension: character.ascension || null,
    classification: currentClassification(character),
    canAscend: canRitualAscend(character),
    ascensionLegacy: publicAscensionLegacy(character.ascensionLegacy),
    divindade: publicDivindadeState(character),
    levelCap: levelCapFor(character),
    currentHp: character.currentHp,
    currentMp: character.currentMp,
    stats,
    ...publicGear(character),
    appearance: { ...character.appearance },
    appearanceLocked: Boolean(character.appearanceLocked),
    cosmetics: publicCosmetics(character),
    pets: publicPets(character),
    engagementTitles: Array.isArray(character.engagement?.titles)
      ? [...character.engagement.titles]
      : [],
    farmZoneId: character.farmZoneId,
    farmStartedAt: character.farmStartedAt,
    autoRestartFarm: Boolean(character.autoRestartFarm),
    autoHpPotion: {
      enabled: Boolean(autoHpPotion.enabled),
      thresholdPct: autoHpPotion.thresholdPct,
    },
    arenaMode: Boolean(character.arenaMode),
    session: {
      kills: character.farmKills || 0,
      xp: character.farmXp || 0,
      gold: character.farmGold || 0,
      farmWaveKills: Math.max(0, Math.floor(Number(character.farmWaveKills) || 0)),
      bossWaveSize: (() => {
        const zone =
          findZone(character.farmZoneId) ||
          ZONES.find((z) => z.id === character.farmZoneId);
        return zone ? zoneBossWaveSize(zone) : 0;
      })(),
    },
    target: character.combat
      ? {
          name: character.combat.monster.name,
          level: character.combat.monster.level,
          hp: character.combat.monsterHp,
          maxHp: character.combat.monster.hp,
          attack: character.combat.monster.attack,
          defense: monsterDefense(character.combat.monster),
          isBoss: Boolean(character.combat.monster.isBoss),
          visualId: character.combat.monster.visualId || null,
        }
      : null,
  };

  const target = out.target;
  out.huntPerf = computeHuntRates(
    { ...character, target, classId: character.classId },
    stats,
  );
  out.inventoryAutomation = publicInventoryAutomation(character);
  return out;
}
