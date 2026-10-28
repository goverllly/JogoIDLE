// @ts-nocheck
/**
 * Serviço IDLE standalone — mesma lógica de jogo, sem Prisma/auth/missões de engajamento.
 */
import {
  allocateAttributes,
  computeStats,
  createCharacter as createGameCharacter,
  performClassificationRitual,
  drinkHpPotion,
  drinkManaPotion,
  ensureAttributeEconomy,
  publicCharacter,
  setAutoHpPotion as setAutoHpPotionDomain,
  useAttributeResetConsumable,
} from "../lib/jogo-idle/game/character";
import {
  applyEnterChapter,
  CHAPTER_CATALOG,
  ensureChapters,
  publicChaptersView,
  validateEnterChapter,
} from "../lib/jogo-idle/game/chapters";
import { processFarm, startFarm, stopFarm } from "../lib/jogo-idle/game/combat";
import {
  ensureJourney,
  publicJourney,
  resolveDisplayTotals,
  setJourneyPrivacy,
  takeFameDelta,
} from "../lib/jogo-idle/game/journey";
import {
  applyFameDelta,
  buildCategoryRanking,
  ensureFameState,
  FAME_HALL_CATEGORIES,
  publicFameOverview,
  reconcileFameFromCharacters,
} from "../lib/jogo-idle/game/fame";
import {
  buildZoneBoss,
  CLASSES,
  getZoneOverrides,
  ZONES,
  zoneBossWaveSize,
} from "../lib/jogo-idle/game/data";
import { cosmeticsMeta } from "../lib/jogo-idle/game/appearance";
import {
  buyBagUpgrade,
  buyPet,
  buyRefiner,
  buyAttributeReset,
  ensureGear,
  equipItem,
  unequipItem,
  refineItem,
  sellItem,
  sellJunk,
  sortInventory,
  setItemLocked,
} from "../lib/jogo-idle/game/inventory";
import { applyInventoryAutomationPatch } from "../lib/jogo-idle/inventory-automation";
import { petIdFromSku, setActivePet, publicPets } from "../lib/jogo-idle/game/pets";
import {
  applyCatalogStateSnapshot,
  catalogMeta,
  getCatalogStateSnapshot,
  isMerchantOfferEnabled,
  listCatalog,
  merchantMeta,
  setCatalogPersistHandler,
} from "../lib/jogo-idle/game/items";
import { getBalance, getBalanceOverrides } from "../lib/jogo-idle/game/balance";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  getGameMaintenance,
  publicGameMaintenance,
} from "../lib/jogo-idle/game/maintenance";
import { listJogoIdleAdminEmails } from "../lib/jogo-idle/admin";
import { unlockSkill, activateSkill } from "../lib/jogo-idle/game/skills";
import {
  queueCombatSkill as castCombatSkillDomain,
  setCombatAutoCast as setCombatAutoCastDomain,
} from "../lib/jogo-idle/game/combat-skills";
import { monsterVisualMeta } from "../lib/jogo-idle/game/monster-visuals";
import { resetHuntPerf } from "../lib/jogo-idle/hunt-perf";
import {
  ensureEngagementState,
  getIdleEngagementBonus,
} from "../lib/jogo-idle/engagement-bonus";
import { store, type CharacterRow } from "./store";

export const MODULE_KEY = "jogo-idleidle";
export const MAX_CHARACTERS_PER_USER = 3;
export const LOCAL_USER_ID = 1;
export const LOCAL_USER_EMAIL = "local@idle.local";

const ONLINE_WINDOW_MS = 30_000;
const DB_UPDATED_AT = "__dbUpdatedAt";

function blob(character) {
  return character;
}

function asJson(character) {
  const copy = { ...character };
  delete copy[DB_UPDATED_AT];
  return JSON.parse(JSON.stringify(copy));
}

function fromRow(row: CharacterRow) {
  const state = row.state && typeof row.state === "object" ? row.state : {};
  const character = {
    ...state,
    id: row.id,
    name: row.name,
    classId: row.classId,
    level: row.level,
    experience: row.experience,
    gold: row.gold,
  };
  ensureAttributeEconomy(blob(character));
  character[DB_UPDATED_AT] = row.updatedAt;
  return character;
}

function listMeta() {
  return {
    classes: Object.values(CLASSES).map((cls) => ({
      id: cls.id,
      name: cls.name,
      description: cls.description,
      base: cls.base,
    })),
    zones: ZONES.map((zone) => {
      const boss = buildZoneBoss(zone);
      const scene = zone.scene && typeof zone.scene === "object" ? zone.scene : null;
      return {
        id: zone.id,
        name: zone.name,
        description: zone.description,
        minLevel: zone.minLevel,
        maxLevel: zone.maxLevel ?? null,
        chapterId: zone.chapterId || null,
        sceneProfileId: zone.sceneProfileId || null,
        trial: Boolean(zone.trial),
        tier: zone.tier,
        requiresAscension: zone.requiresAscension || null,
        mortalOnly: Boolean(zone.mortalOnly),
        dropChance: zone.dropChance,
        bossWaveSize: zoneBossWaveSize(zone),
        bossWaveSizeOverridden: (() => {
          const n = Number(zone.bossWaveSize);
          return Number.isFinite(n) && n >= 1;
        })(),
        scene,
        monsters: zone.monsters.map((monster) => ({
          name: monster.name,
          level: monster.level,
          hp: monster.hp,
          attack: monster.attack,
          defense: monster.defense,
          xp: monster.xp,
          gold: monster.gold,
          visualId: monster.visualId || null,
        })),
        boss: {
          name: boss.name,
          level: boss.level,
          hp: boss.hp,
          attack: boss.attack,
          defense: boss.defense,
          xp: boss.xp,
          gold: boss.gold,
          visualId: boss.visualId || zone.boss?.visualId || null,
          overridden: Boolean(zone.boss && typeof zone.boss === "object"),
        },
      };
    }),
    cosmetics: cosmeticsMeta(),
    maxCharacters: MAX_CHARACTERS_PER_USER,
    merchant: merchantMeta(),
    balance: getBalance(),
    monsterVisuals: monsterVisualMeta(),
  };
}

let catalogReady = null;
let catalogRevision = new Date(0).toISOString();

export function getCatalogRevision() {
  return catalogRevision;
}

async function writeCatalogState(raw) {
  const snap = {
    dropChance: Number(raw.dropChance) || 0.11,
    deletedIds: Array.isArray(raw.deletedIds) ? raw.deletedIds : [],
    overrides: raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
    updatedAt: new Date().toISOString(),
  };
  store.setCatalog(snap);
  catalogRevision = snap.updatedAt;
}

async function hydrateCatalogFromDb() {
  const row = store.getCatalog();
  if (row) {
    applyCatalogStateSnapshot({
      dropChance: row.dropChance,
      deletedIds: row.deletedIds,
      overrides: row.overrides,
    });
    if (row.updatedAt) catalogRevision = row.updatedAt;
  }
}

export async function ensureCatalogLoaded() {
  if (!catalogReady) {
    catalogReady = (async () => {
      setCatalogPersistHandler((snap) => writeCatalogState(snap));
      await hydrateCatalogFromDb();
    })();
  }
  await catalogReady;
}

async function assertGameplayOpen() {
  await ensureCatalogLoaded();
  const maintenance = getGameMaintenance();
  if (!maintenance.enabled) return;
  const error = new Error(maintenance.message || DEFAULT_MAINTENANCE_MESSAGE);
  error.status = 503;
  error.code = "MAINTENANCE";
  throw error;
}

async function persist(userId, character) {
  const expected = character[DB_UPDATED_AT];
  const fameDelta = takeFameDelta(character);
  const statePayload = { ...character };
  delete statePayload[DB_UPDATED_AT];
  delete statePayload._fameDelta;
  const row = store.updateCharacter(
    character.id,
    {
      name: character.name,
      classId: character.classId,
      level: character.level,
      experience: character.experience,
      gold: character.gold,
      state: asJson(statePayload),
      lastSeenAt: character.lastSeenAt || null,
    },
    typeof expected === "string" ? expected : undefined,
    (fame) => {
      const base = ensureFameState(fame, { scope: "local" });
      if (!fameDelta || Object.keys(fameDelta).length === 0) return base;
      return applyFameDelta(base, character, fameDelta, { touchHall: true });
    },
  );
  character[DB_UPDATED_AT] = row.updatedAt;
  return character;
}

async function worldSnapshot(character) {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const online = store.listOnline(cutoff);
  const players = online.map((row) => {
    const state = row.state || {};
    return {
      id: row.id,
      name: row.name,
      classId: row.classId,
      level: row.level,
      farmZoneId: typeof state.farmZoneId === "string" ? state.farmZoneId : null,
    };
  });
  const zonePlayers = character.farmZoneId
    ? players
        .filter((p) => p.id !== character.id && p.farmZoneId === character.farmZoneId)
        .slice(0, 20)
        .map((p) => ({ name: p.name, classId: p.classId, level: p.level }))
    : [];
  return {
    online: players.length,
    zonePlayers,
    catalogRevision: getCatalogRevision(),
  };
}

async function farmOptionsFor(userId, character) {
  const engagement = await getIdleEngagementBonus(userId, blob(character));
  return {
    engagement,
    opts: {
      xpMult: engagement.xpMult,
      goldMult: engagement.goldMult,
      dropMult: engagement.dropMult,
    },
  };
}

async function syncAndPublic(character, userId) {
  ensureAttributeEconomy(blob(character));
  const { engagement, opts } = await farmOptionsFor(userId, character);
  const farm = processFarm(blob(character), Date.now(), opts);
  character.lastSeenAt = new Date().toISOString();
  try {
    await persist(userId, character);
  } catch (err) {
    if (err?.code === "STALE_CHARACTER") {
      const fresh = await loadActive(userId);
      const refreshed = await getIdleEngagementBonus(userId, blob(fresh));
      return {
        character: {
          ...publicCharacter(blob(fresh)),
          engagementTitles: ensureEngagementState(blob(fresh)).titles,
          arenaMode: false,
        },
        farm: {
          ticks: 0,
          kills: 0,
          xpGained: 0,
          goldGained: 0,
          log: [],
          events: [],
          drops: 0,
          dropsKept: 0,
          dropsAutoSold: 0,
          windowMs: 0,
          elapsedSinceLastMs: 0,
          rewardedMs: 0,
          zoneId: null,
          zoneName: null,
          levelBefore: null,
          levelAfter: null,
          bossKills: 0,
          faints: 0,
          eventsTruncated: false,
          catchUpId: null,
          catchUpPending: false,
        },
        world: await worldSnapshot(fresh),
        engagement: refreshed,
        arena: { inArena: false, minStake: 100 },
        duel: null,
      };
    }
    throw err;
  }
  const refreshed = await getIdleEngagementBonus(userId, blob(character));
  return {
    character: {
      ...publicCharacter(blob(character)),
      engagementTitles: ensureEngagementState(blob(character)).titles,
      arenaMode: false,
    },
    farm,
    world: await worldSnapshot(character),
    engagement: refreshed,
    arena: { inArena: false, minStake: 100 },
    duel: null,
  };
}

async function loadActive(userId) {
  await assertGameplayOpen();
  await ensureCatalogLoaded();
  const row = store.findActive(userId);
  if (!row) {
    const error = new Error("Crie ou selecione um personagem");
    error.status = 404;
    throw error;
  }
  return fromRow(row);
}

export async function getMeta() {
  await ensureCatalogLoaded();
  const activeChars = store.listActiveCharacters().map((row) => {
    const character = fromRow(row);
    ensureGear(blob(character));
    return {
      ...publicCharacter(blob(character)),
      userId: row.userId,
      userName: "Local",
      userEmail: LOCAL_USER_EMAIL,
      isActive: row.isActive,
      lastSeenAt: row.lastSeenAt || null,
    };
  });
  return {
    ...listMeta(),
    catalogRevision: getCatalogRevision(),
    isAdmin: true,
    maintenance: publicGameMaintenance(),
    adminCatalog: listCatalog(),
    adminCatalogMeta: { ...catalogMeta(), monsterVisuals: monsterVisualMeta() },
    adminActiveCharacters: activeChars,
    adminBalance: getBalance(),
    adminBalanceOverrides: getBalanceOverrides(),
    adminZoneOverrides: getZoneOverrides(),
    adminEmails: listJogoIdleAdminEmails(),
  };
}

export async function listCharacters(userId) {
  await assertGameplayOpen();
  return store.listCharacters(userId).map((row) => {
    const character = fromRow(row);
    return { ...publicCharacter(blob(character)), isActive: row.isActive };
  });
}

/** Aparência de nascimento é imutável — sempre 403. */
export async function updateAppearance(_userId, _input) {
  const error = new Error("Aparência só pode ser definida na criação do personagem");
  error.status = 403;
  throw error;
}

export async function createCharacterForUser(userId, name, classId, appearance) {
  await assertGameplayOpen();
  await ensureCatalogLoaded();
  if (store.countCharacters(userId) >= MAX_CHARACTERS_PER_USER) {
    throw new Error(`Limite de ${MAX_CHARACTERS_PER_USER} personagens por usuário`);
  }
  const character = createGameCharacter(name, classId, appearance);
  character.appearanceLocked = true;
  const stats = computeStats(character);
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;
  const now = new Date().toISOString();
  store.createCharacter({
    id: character.id,
    userId,
    name: character.name,
    classId: character.classId,
    level: character.level,
    experience: character.experience,
    gold: character.gold,
    isActive: true,
    state: asJson(character),
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  });
  return publicCharacter(blob(character));
}

export async function selectCharacter(userId, characterId) {
  await assertGameplayOpen();
  const row = store.selectCharacter(userId, characterId);
  return publicCharacter(fromRow(row));
}

export async function deleteCharacter(userId, characterId) {
  await assertGameplayOpen();
  store.deleteCharacter(userId, characterId);
  return { ok: true };
}

export async function getActiveState(userId) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  return syncAndPublic(character, userId);
}

export async function startActiveFarm(userId, zoneId) {
  const character = await loadActive(userId);
  character.arenaMode = false;
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const zone = startFarm(blob(character), zoneId);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    zone: { id: zone.id, name: zone.name },
    character: { ...publicCharacter(blob(character)), arenaMode: false },
    engagement,
    arena: { inArena: false, minStake: 100 },
    leftArena: false,
  };
}

export async function stopActiveFarm(userId) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  stopFarm(blob(character), opts);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { character: publicCharacter(blob(character)), engagement };
}

export async function setAutoRestartFarm(userId, enabled) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  character.autoRestartFarm = Boolean(enabled);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: character.autoRestartFarm
      ? "Restart automático ligado — a caça retoma sozinha após desmaio"
      : "Restart automático desligado",
    autoRestartFarm: Boolean(character.autoRestartFarm),
    character: publicCharacter(blob(character)),
    engagement,
  };
}

export async function applyItemOp(userId, op, body) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  let message = "Ok";
  if (op === "equip") {
    const hand = body.hand === "main" || body.hand === "off" ? body.hand : "auto";
    const template = equipItem(blob(character), String(body.uid || ""), { hand });
    message = `${template.name} equipado`;
  } else if (op === "unequip") {
    unequipItem(blob(character), String(body.slot || ""));
    message = "Item removido";
  } else if (op === "sell") {
    message = `Vendido por ${sellItem(blob(character), String(body.uid || ""))} gold`;
  } else if (op === "sell-junk") {
    const result = sellJunk(blob(character));
    message = result.count ? `${result.count} itens vendidos por ${result.gold} gold` : "Nada para limpar";
  } else if (op === "sort") {
    sortInventory(blob(character));
    message = "Mochila organizada";
  } else if (op === "refine") {
    const result = refineItem(blob(character), String(body.itemId || body.uid || ""));
    message = result.message;
  } else if (op === "usePotion") {
    const result = drinkHpPotion(blob(character), String(body.uid || ""));
    message = `Poção: +${result.healed} HP`;
  } else if (op === "useManaPotion") {
    const result = drinkManaPotion(blob(character), String(body.uid || ""));
    message = `Poção: +${result.restored} MP`;
  } else if (op === "useAttrReset") {
    const result = useAttributeResetConsumable(blob(character), String(body.uid || ""));
    message = result.message;
  } else if (op === "lock") {
    setItemLocked(blob(character), String(body.uid || ""), true);
    message = "Item protegido";
  } else if (op === "unlock") {
    setItemLocked(blob(character), String(body.uid || ""), false);
    message = "Proteção removida";
  } else {
    const error = new Error("Rota não encontrada");
    error.status = 404;
    throw error;
  }
  const stats = computeStats(character);
  character.currentHp = Math.min(character.currentHp, stats.maxHp);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { message, character: publicCharacter(blob(character)), engagement };
}

export async function buyMerchantOffering(userId, sku) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const key = String(sku || "");
  if (!isMerchantOfferEnabled(key)) {
    const error = new Error("Esta oferta do mercador está indisponível");
    error.status = 403;
    throw error;
  }
  let message = "Ok";
  if (key === "bag_upgrade") {
    const result = buyBagUpgrade(blob(character));
    message = `Mochila expandida para ${result.inventorySize} espaços (−${result.price.toLocaleString("pt-BR")} gold)`;
  } else if (key === "refiner") {
    const result = buyRefiner(blob(character));
    message = `Refinador comprado (−${result.price.toLocaleString("pt-BR")} gold)`;
  } else if (key === "attr_reset") {
    const result = buyAttributeReset(blob(character));
    message = `Reset de Pontos comprado (−${result.price.toLocaleString("pt-BR")} gold)`;
  } else if (petIdFromSku(key)) {
    const result = buyPet(blob(character), key);
    message = `Pet adquirido (−${result.price.toLocaleString("pt-BR")} gold)`;
  } else {
    throw new Error("Oferta do mercador não encontrada");
  }
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { message, character: publicCharacter(blob(character)), merchant: merchantMeta() };
}

export async function allocateActiveAttributes(userId, allocations) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  allocateAttributes(blob(character), allocations);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { character: publicCharacter(blob(character)), engagement };
}

export async function unlockActiveSkill(userId, skillId) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = unlockSkill(blob(character), String(skillId || ""));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { ...result, character: publicCharacter(blob(character)), engagement };
}

export async function activateActiveSkill(userId, skillId) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = activateSkill(blob(character), String(skillId || ""));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { ...result, character: publicCharacter(blob(character)), engagement };
}

export async function castCombatSkill(userId, skillId) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = castCombatSkillDomain(blob(character), String(skillId || ""));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { ...result, character: publicCharacter(blob(character)), engagement };
}

export async function setCombatAutoCast(userId, enabled) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  setCombatAutoCastDomain(blob(character), Boolean(enabled));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { character: publicCharacter(blob(character)), engagement };
}

export async function setAutoHpPotion(userId, enabled, thresholdPct) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  setAutoHpPotionDomain(blob(character), { enabled, thresholdPct: thresholdPct });
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { character: publicCharacter(blob(character)), engagement };
}

export async function updateActivePet(userId, petId) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  setActivePet(blob(character), petId);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    character: publicCharacter(blob(character)),
    pets: publicPets(blob(character)),
    engagement,
  };
}

export async function updateInventoryAutomationPrefs(userId, patch) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  applyInventoryAutomationPatch(blob(character), patch);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Preferências do inventário salvas",
    character: publicCharacter(blob(character)),
  };
}

export async function resetActiveHuntPerf(userId) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const zone = character.farmZoneId
    ? ZONES.find((z) => z.id === character.farmZoneId) || null
    : null;
  resetHuntPerf(blob(character), zone);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Medição de desempenho reiniciada",
    character: publicCharacter(blob(character)),
  };
}

export async function ascendActiveCharacter(userId) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = performClassificationRitual(blob(character));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const chapterName =
    CHAPTER_CATALOG[result.unlocksChapter]?.name || result.unlocksChapter;
  return {
    message: `${result.ritualLabel} concluído — você é ${result.resultLabel || result.classification} no nível 1. ${chapterName} desbloqueado nas Crônicas.`,
    character: publicCharacter(blob(character)),
    chapters: publicChaptersView(blob(character)),
    ...result,
  };
}

export async function getActiveChapters(userId) {
  await assertGameplayOpen();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  ensureChapters(blob(character));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { chapters: publicChaptersView(blob(character)) };
}

/**
 * Enter chapter: validate first (farm untouched on failure), then stop/persist farm and switch.
 */
export async function enterActiveChapter(userId, chapterId) {
  await assertGameplayOpen();
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  // Catch-up ticks without stopping yet
  processFarm(blob(character), Date.now(), opts);

  const validation = validateEnterChapter(blob(character), chapterId);
  if (!validation.ok) {
    const err = new Error(
      `Capítulo bloqueado. Faltam: ${validation.missingRequirements.join("; ") || "requisitos"}`,
    );
    err.status = 403;
    err.code = "CHAPTER_LOCKED";
    err.missingRequirements = validation.missingRequirements;
    throw err;
  }

  // Validation OK — now stop farm if active
  if (blob(character).farmZoneId) {
    stopFarm(blob(character), opts);
  }

  const result = applyEnterChapter(blob(character), validation.chapterId);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const chapterName = CHAPTER_CATALOG[validation.chapterId]?.name || validation.chapterId;
  return {
    message: result.switched
      ? `Você entrou em ${chapterName}.`
      : "Você já está neste capítulo.",
    switched: result.switched,
    chapters: result.view,
    character: publicCharacter(blob(character)),
    engagement,
  };
}

export async function getAnnouncements() {
  return { announcements: [] };
}

function characterFromRow(row) {
  const character = fromRow(row);
  ensureJourney(blob(character));
  return character;
}

export async function getActiveJourney(userId, period = "all") {
  await assertGameplayOpen();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { journey: publicJourney(blob(character), String(period || "all")) };
}

export async function patchJourneyPrivacy(userId, hideFromPublicRankings) {
  await assertGameplayOpen();
  const character = await loadActive(userId);
  const privacy = setJourneyPrivacy(blob(character), hideFromPublicRankings);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { privacy };
}

export async function getFameOverview(userId) {
  await assertGameplayOpen();
  let fame = ensureFameState(store.getFame(), { scope: "local" });
  if (!fame.updatedAt) {
    fame = reconcileFameFromCharacters(
      store.listAllCharacters().map((row) => characterFromRow(row)),
      { scope: "local" },
    );
    store.setFame(fame);
  }
  const overview = publicFameOverview(fame);
  let selfId = null;
  try {
    const active = store.findActive(userId);
    if (active) selfId = active.id;
  } catch {
    /* ignore */
  }
  return { ...overview, selfCharacterId: selfId };
}

export async function getFameRankings(userId, { category, period = "lifetime", page = 1, limit = 20 } = {}) {
  await assertGameplayOpen();
  const cat = String(category || "");
  if (!FAME_HALL_CATEGORIES[cat]) {
    const err = new Error("Categoria de ranking inválida");
    err.status = 400;
    throw err;
  }
  const pageN = Math.max(1, Math.floor(Number(page) || 1));
  const limitN = Math.min(50, Math.max(1, Math.floor(Number(limit) || 20)));
  const offset = (pageN - 1) * limitN;
  const characters = store.listAllCharacters().map((row) => characterFromRow(row));
  // period filter: for season/year/last30d use period totals as value source via temporary metric —
  // rankings de totais usam lifetime display; períodos futuros podem filtrar. Por ora lifetime + records.
  void period;
  let selfId = null;
  const active = store.findActive(userId);
  if (active) selfId = active.id;
  const ranking = buildCategoryRanking(characters, cat, {
    limit: limitN,
    offset,
    selfId,
  });
  return {
    scope: "local",
    multiUser: false,
    period: period || "lifetime",
    page: pageN,
    limit: limitN,
    ...ranking,
  };
}

export async function compareFameCharacters(userId, idA, idB) {
  await assertGameplayOpen();
  const a = store.findCharacter(String(idA || ""));
  const b = store.findCharacter(String(idB || ""));
  if (!a || !b) {
    const err = new Error("Personagem não encontrado para comparação");
    err.status = 404;
    throw err;
  }
  const ca = characterFromRow(a);
  const cb = characterFromRow(b);
  const hideA = Boolean(ca.journey?.privacy?.hideFromPublicRankings);
  const hideB = Boolean(cb.journey?.privacy?.hideFromPublicRankings);
  const active = store.findActive(userId);
  const selfId = active?.id || null;
  const canSeeA = !hideA || ca.id === selfId;
  const canSeeB = !hideB || cb.id === selfId;

  const publicSide = (c, canSee) => {
    const totals = resolveDisplayTotals(c.journey);
    const records = c.journey.records || {};
    return {
      characterId: canSee ? c.id : null,
      characterName: canSee ? c.name : "Aventureiro anônimo",
      classId: canSee ? c.classId : null,
      level: canSee ? c.level : null,
      anonymous: !canSee,
      kills: totals.kills,
      bossKills: totals.bossKills,
      faints: totals.faints,
      goldEarned:
        (totals.goldEarnedCombat || 0) +
        (totals.goldEarnedSell || 0) +
        (totals.goldEarnedUnclassified || 0),
      damageDealt: totals.damageDealt,
      combatMs: totals.combatMs,
      maxDamageHit: records.maxDamageHit?.value ?? null,
    };
  };

  return {
    scope: "local",
    multiUser: false,
    a: publicSide(ca, canSeeA),
    b: publicSide(cb, canSeeB),
    note: "Comparação informativa — maior tempo de jogo não implica maior habilidade.",
  };
}

/** Reconciliação sob demanda (não por request de overview). */
export async function reconcileFameStore() {
  const characters = store.listAllCharacters().map((row) => characterFromRow(row));
  const fame = reconcileFameFromCharacters(characters, { scope: "local" });
  store.setFame(fame);
  return publicFameOverview(fame);
}

export function errorMessage(error) {
  if (error instanceof Error && error.message) return error.message;
  return "Erro inesperado";
}

export function httpStatus(error) {
  return typeof error?.status === "number" ? error.status : 400;
}
