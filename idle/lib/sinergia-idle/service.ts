import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getActiveUserTeamIds } from "@/lib/permissions";
import {
  addCharacterGold,
  allocateAttributes,
  ascendToCelestial,
  computeStats,
  createCharacter as createGameCharacter,
  drinkHpPotion,
  drinkManaPotion,
  ensureAttributeEconomy,
  publicCharacter,
  setAutoHpPotion as setAutoHpPotionDomain,
  setCharacterLevel,
  softResetCharacterForSeason,
  useAttributeResetConsumable,
} from "@/lib/sinergia-idle/game/character";
import {
  SEASON_STATUS,
  assertExactlyOneOpenSeason,
  currentSeasonIdentity,
  nextSeasonIdentity,
  newRankingRowId,
  newSeasonId,
} from "@/lib/sinergia-idle/season";
import { processFarm, startFarm, stopFarm } from "@/lib/sinergia-idle/game/combat";
import { resetHuntPerf } from "@/lib/sinergia-idle/hunt-perf";
import {
  buildZoneBoss,
  CLASSES,
  ZONES,
  getZoneOverrides,
  setZoneOverrides,
  refreshZones,
  zoneBossWaveSize,
} from "@/lib/sinergia-idle/game/data";
import { cosmeticsMeta } from "@/lib/sinergia-idle/game/appearance";
import {
  setEquippedCosmetics,
  unlockCosmetic,
  publicCosmetics,
  ensureCosmetics,
} from "@/lib/sinergia-idle/game/cosmetics";
import {
  addItem,
  buyBagUpgrade,
  buyPet,
  buyRefiner,
  buyAttributeReset,
  clearInventory,
  ensureGear,
  equipItem,
  unequipItem,
  refineItem,
  sellItem,
  sellJunk,
  sortInventory,
  setItemLocked,
} from "@/lib/sinergia-idle/game/inventory";
import { applyInventoryAutomationPatch } from "@/lib/sinergia-idle/inventory-automation";
import { petIdFromSku, setActivePet, publicPets } from "@/lib/sinergia-idle/game/pets";
import {
  DUEL_CHALLENGE_TTL_MS,
  DUEL_MIN_STAKE,
  DUEL_STATUS,
  farmEventsForViewer,
  processDuel,
  snapshotFighter,
  validateStake,
  type DuelEvent,
  type DuelFighter,
  type DuelResult,
} from "@/lib/sinergia-idle/game/duel";
import {
  ascensionFromState,
  pickBestCharacterPerUser,
  stripItemForRanking,
  type AscensionTier,
  type RankingEquipmentItem,
} from "@/lib/sinergia-idle/ranking";
import {
  isSinergiaIdleAdmin,
  listSinergiaIdleAdminEmails,
} from "@/lib/sinergia-idle/admin";
import { sanitizeZoneScene, type ZoneScene } from "@/lib/sinergia-idle/game/zone-scene";
import {
  monsterVisualMeta,
  sanitizeMonsterVisualId,
} from "@/lib/sinergia-idle/game/monster-visuals";
import {
  applyCatalogStateSnapshot,
  catalogMeta,
  createItem,
  deleteTemplate,
  getCatalogStateSnapshot,
  isMerchantOfferEnabled,
  listCatalog,
  merchantMeta,
  publicItem,
  RARITIES,
  resetTemplate,
  setBagUpgradePrice,
  setMerchantOffersEnabled,
  setRefinerPrice,
  setAttrResetPrice,
  setPetDogPrice,
  setPetCatPrice,
  setPetParrotPrice,
  setCatalogPersistHandler,
  setDropChance,
  setEngagementEvent,
  upsertTemplate,
} from "@/lib/sinergia-idle/game/items";
import {
  getBalance,
  getBalanceOverrides,
  setBalanceOverrides,
} from "@/lib/sinergia-idle/game/balance";
import {
  DEFAULT_MAINTENANCE_MESSAGE,
  getGameMaintenance,
  publicGameMaintenance,
  setGameMaintenance,
} from "@/lib/sinergia-idle/game/maintenance";
import { unlockSkill, activateSkill } from "@/lib/sinergia-idle/game/skills";
import {
  queueCombatSkill as queueCombatSkillDomain,
  setCombatAutoCast as setCombatAutoCastDomain,
} from "@/lib/sinergia-idle/game/combat-skills";
import {
  CHECKIN_GOLD,
  ensureEngagementState,
  FLOWTIME_CLAIM_GOLD,
  getIdleEngagementBonus,
  todayKey,
  type IdleEngagementBonus,
} from "@/lib/sinergia-idle/engagement-bonus";
import {
  computeIdleEngagementMetrics,
  recordEngagementClaimEvent,
} from "@/lib/sinergia-idle/engagement-metrics";
import {
  listIdleAnnouncements,
  pushIdleAnnouncement,
  shouldAnnounceDrop,
} from "@/lib/sinergia-idle/announcements";

export const MODULE_KEY = "sinergiaidle";
export const MAX_CHARACTERS_PER_USER = 3;

function blob(character: GameCharacter): any {
  return character;
}
const ONLINE_WINDOW_MS = 30_000;

type GameCharacter = {
  id: string;
  name: string;
  classId: string;
  level: number;
  experience: number;
  gold: number;
  currentHp: number;
  currentMp: number;
  farmZoneId?: string | null;
  lastSeenAt?: string;
  farmKills?: number;
  farmXp?: number;
  farmGold?: number;
  [key: string]: unknown;
};

function asJson(character: GameCharacter): Prisma.InputJsonValue {
  const copy = { ...(character as GameCharacter & Record<string, unknown>) };
  delete copy.__dbUpdatedAt;
  return JSON.parse(JSON.stringify(copy)) as Prisma.InputJsonValue;
}

type CharacterRow = {
  id: string;
  name: string;
  classId: string;
  level: number;
  experience: number;
  gold: number;
  state: Prisma.JsonValue;
  updatedAt?: Date;
};

/** Marcador interno para lock otimista em persist (não vai no JSON público). */
const DB_UPDATED_AT = "__dbUpdatedAt";

function fromRow(row: CharacterRow): GameCharacter {
  const state = row.state && typeof row.state === "object" && !Array.isArray(row.state) ? (row.state as Record<string, unknown>) : {};
  const character = {
    ...(state as GameCharacter),
    id: row.id,
    name: row.name,
    classId: row.classId,
    level: row.level,
    experience: row.experience,
    gold: row.gold,
  };
  ensureAttributeEconomy(blob(character));
  if (row.updatedAt) {
    (character as GameCharacter & Record<string, unknown>)[DB_UPDATED_AT] = row.updatedAt;
  }
  return character;
}

function staleCharacterError() {
  const error = new Error("Personagem atualizado em paralelo — tente de novo");
  (error as Error & { status?: number; code?: string }).status = 409;
  (error as Error & { code?: string }).code = "STALE_CHARACTER";
  return error;
}

function adminCatalogMetaPayload() {
  return { ...catalogMeta(), monsterVisuals: monsterVisualMeta() };
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
      const scene =
        zone.scene && typeof zone.scene === "object" ? (zone.scene as ZoneScene) : null;
      return {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      minLevel: zone.minLevel,
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
        monsters: zone.monsters.map(
          (monster: {
            name: string;
            level: number;
            hp: number;
            attack: number;
            defense?: number;
            xp?: number;
            gold?: number;
            visualId?: string | null;
          }) => ({
            name: monster.name,
            level: monster.level,
            hp: monster.hp,
            attack: monster.attack,
            defense: monster.defense,
            xp: monster.xp,
            gold: monster.gold,
            visualId: monster.visualId || null,
          }),
        ),
        boss: {
          name: boss.name,
          level: boss.level,
          hp: boss.hp,
          attack: boss.attack,
          defense: boss.defense,
          xp: boss.xp,
          gold: boss.gold,
          visualId: (boss as { visualId?: string }).visualId || zone.boss?.visualId || null,
          overridden: Boolean(
            zone.boss &&
              typeof zone.boss === "object" &&
              (zone.boss.hpOverride != null ||
                zone.boss.attackOverride != null ||
                zone.boss.defenseOverride != null ||
                zone.boss.xpOverride != null ||
                zone.boss.goldOverride != null ||
                zone.boss.hp != null ||
                zone.boss.attack != null),
          ),
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

async function announceFarmDrops(userId: number, character: GameCharacter, farm: { drops?: unknown[]; events?: { type?: string; rarity?: string; name?: string; templateId?: string; announce?: boolean }[] }) {
  const events = farm?.events || [];
  const dropEvents = events.filter((e) => e.type === "drop" && shouldAnnounceDrop(e));
  if (!dropEvents.length) return;
  const teamIds = await getActiveUserTeamIds(userId);
  if (!teamIds.length) return;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const userName = user?.name || character.name;
  for (const ev of dropEvents) {
    pushIdleAnnouncement({
      userName,
      itemName: String(ev.name || "item"),
      rarity: String(ev.rarity || "rare"),
      teamIds,
    });
  }
}

let catalogReady: Promise<void> | null = null;

type CatalogSnap = {
  dropChance: number;
  deletedIds: string[];
  overrides: Record<string, unknown>;
};

function normalizeCatalogSnap(snap: {
  dropChance?: number;
  deletedIds?: unknown;
  overrides?: unknown;
}): CatalogSnap {
  const deletedIds = Array.isArray(snap.deletedIds)
    ? snap.deletedIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : [];
  const overrides =
    snap.overrides && typeof snap.overrides === "object" && !Array.isArray(snap.overrides)
      ? (snap.overrides as Record<string, unknown>)
      : {};
  const dropChance = Number(snap.dropChance);
  return {
    dropChance: Number.isFinite(dropChance) ? dropChance : 0.11,
    deletedIds,
    overrides,
  };
}

function prismaMissingTableName(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error || "");
  const named =
    message.match(/sinergia_idle_[a-z0-9_]+/i)?.[0] ||
    message.match(/`?(sinergia_idle_[a-z0-9_]+)`?/i)?.[0];
  if (named) return named.replace(/`/g, "").toLowerCase();
  const code = (error as { code?: string })?.code;
  if (code === "P2021" || /does not exist in the current database/i.test(message)) {
    return "__unknown__";
  }
  return null;
}

function isMissingCatalogTable(error: unknown) {
  const table = prismaMissingTableName(error);
  return table === "sinergia_idle_catalog_state";
}

function catalogTableMissingError() {
  const error = new Error(
    "Tabela sinergia_idle_catalog_state ausente. Aplique a migration 20261015010000 (prisma migrate deploy) e reinicie o app.",
  );
  (error as Error & { status?: number }).status = 503;
  return error;
}

/** TTL para re-hidratar do DB (múltiplas réplicas Docker não compartilham memória). */
const CATALOG_HYDRATE_TTL_MS = 1500;
let catalogHydratedAt = 0;
/** ISO do último update do catálogo (temas de zona / economia) — cliente reaplica mapas. */
let catalogRevision = new Date(0).toISOString();

export function getCatalogRevision() {
  return catalogRevision;
}

async function writeCatalogState(raw: {
  dropChance?: number;
  deletedIds?: unknown;
  overrides?: unknown;
}) {
  const snap = normalizeCatalogSnap(raw);
  try {
    await prisma.sinergiaIdleCatalogState.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        dropChance: snap.dropChance,
        deletedIds: snap.deletedIds as Prisma.InputJsonValue,
        overrides: snap.overrides as Prisma.InputJsonValue,
      },
      update: {
        dropChance: snap.dropChance,
        deletedIds: snap.deletedIds as Prisma.InputJsonValue,
        overrides: snap.overrides as Prisma.InputJsonValue,
      },
    });
    catalogHydratedAt = Date.now();
    catalogRevision = new Date().toISOString();
  } catch (error) {
    if (isMissingCatalogTable(error)) throw catalogTableMissingError();
    throw error;
  }
}

async function hydrateCatalogFromDb() {
  try {
    const row = await prisma.sinergiaIdleCatalogState.findUnique({ where: { id: 1 } });
    if (row) {
      applyCatalogStateSnapshot({
        dropChance: row.dropChance,
        deletedIds: row.deletedIds,
        overrides: row.overrides,
      });
      if (row.updatedAt) catalogRevision = new Date(row.updatedAt).toISOString();
    }
    catalogHydratedAt = Date.now();
  } catch (error) {
    if (isMissingCatalogTable(error)) {
      console.warn(
        "[sinergia-idle] tabela sinergia_idle_catalog_state ausente — catálogo só em memória até migrate deploy (20261015010000)",
      );
    } else {
      console.error("[sinergia-idle] falha ao carregar catálogo persistido", error);
    }
  }
}

/**
 * Carrega overrides do catálogo do banco e registra o persister.
 * Re-lê periodicamente para refletir gravações de outras réplicas em tempo quase real.
 */
export async function ensureCatalogLoaded(opts?: { force?: boolean }) {
  if (!catalogReady) {
    catalogReady = (async () => {
      setCatalogPersistHandler((snap: {
        dropChance?: number;
        deletedIds?: unknown;
        overrides?: unknown;
      }) => writeCatalogState(snap));
      await hydrateCatalogFromDb();
    })();
  }
  await catalogReady;
  const stale = Date.now() - catalogHydratedAt >= CATALOG_HYDRATE_TTL_MS;
  if (opts?.force || stale) {
    await hydrateCatalogFromDb();
  }
}

async function persist(userId: number, character: GameCharacter, isActive?: boolean) {
  const expectedUpdatedAt = (character as GameCharacter & Record<string, unknown>)[DB_UPDATED_AT] as
    | Date
    | undefined;
  // Não persistir marcadores internos no JSON de estado.
  const statePayload = { ...character } as GameCharacter & Record<string, unknown>;
  delete statePayload[DB_UPDATED_AT];

  const data = {
    name: character.name,
    classId: character.classId,
    level: character.level,
    experience: character.experience,
    gold: character.gold,
    ...(isActive === undefined ? {} : { isActive }),
    state: asJson(statePayload as GameCharacter),
    lastSeenAt: character.lastSeenAt ? new Date(character.lastSeenAt) : null,
  };

  if (expectedUpdatedAt instanceof Date) {
    const result = await prisma.sinergiaIdleCharacter.updateMany({
      where: { id: character.id, updatedAt: expectedUpdatedAt },
      data,
    });
    if (result.count === 0) throw staleCharacterError();
  } else {
    await prisma.sinergiaIdleCharacter.update({
      where: { id: character.id },
      data,
    });
  }
  return character;
}

async function worldSnapshot(character: GameCharacter) {
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  const online = await prisma.sinergiaIdleCharacter.findMany({
    where: { lastSeenAt: { gte: cutoff } },
    select: { id: true, name: true, classId: true, level: true, state: true },
  });
  const players = online.map((row) => {
    const state = row.state && typeof row.state === "object" && !Array.isArray(row.state) ? (row.state as Record<string, unknown>) : {};
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
        .filter((player) => player.id !== character.id && player.farmZoneId === character.farmZoneId)
        .slice(0, 20)
        .map((player) => ({ name: player.name, classId: player.classId, level: player.level }))
    : [];
  return {
    online: players.length,
    zonePlayers,
    catalogRevision: getCatalogRevision(),
  };
}

async function farmOptionsFor(userId: number, character: GameCharacter) {
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

function maybeUnlockPlantonista(character: GameCharacter, engagement: IdleEngagementBonus) {
  if (!engagement.plantaoToday) return;
  const eng = ensureEngagementState(blob(character));
  if (!eng.titles.includes("Plantonista")) {
    eng.titles.push("Plantonista");
  }
}

async function syncAndPublic(character: GameCharacter, userId: number) {
  ensureAttributeEconomy(blob(character));
  const { engagement, opts } = await farmOptionsFor(userId, character);
  maybeUnlockPlantonista(character, engagement);
  await expireStaleDuelsForCharacter(character.id);
  const busy = await characterHasOpenDuel(character.id);
  // Farm não corre durante Arena / duelo aberto.
  const emptyFarm = {
    ticks: 0,
    kills: 0,
    xpGained: 0,
    goldGained: 0,
    log: [] as string[],
    events: [] as unknown[],
    drops: 0,
    dropsKept: 0,
    dropsAutoSold: 0,
    windowMs: 0,
    elapsedSinceLastMs: 0,
    rewardedMs: 0,
    zoneId: null as string | null,
    zoneName: null as string | null,
    levelBefore: null as number | null,
    levelAfter: null as number | null,
    bossKills: 0,
    faints: 0,
    eventsTruncated: false,
    catchUpId: null as string | null,
    catchUpPending: false,
  };
  const farm =
    character.arenaMode || busy ? emptyFarm : processFarm(blob(character), Date.now(), opts);

  if (!character.arenaMode && !busy) {
    await announceFarmDrops(userId, character, farm as never);
  }
  character.lastSeenAt = new Date().toISOString();
  try {
    await persist(userId, character);
  } catch (err) {
    // Corrida: outro /me já persistiu o mesmo catch-up — devolve estado fresco sem reaplicar economia.
    if ((err as Error & { code?: string }).code === "STALE_CHARACTER") {
      const fresh = await loadActive(userId);
      const refreshed = await getIdleEngagementBonus(userId, blob(fresh));
      const arena = await arenaPayloadFor(fresh);
      return {
        character: {
          ...publicCharacter(blob(fresh)),
          engagementTitles: ensureEngagementState(blob(fresh)).titles,
          arenaMode: Boolean(fresh.arenaMode),
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
        arena: arena.lobby,
        duel: arena.duel,
      };
    }
    throw err;
  }
  const refreshed = await getIdleEngagementBonus(userId, blob(character));
  const arena = await arenaPayloadFor(character);
  return {
    character: {
      ...publicCharacter(blob(character)),
      engagementTitles: ensureEngagementState(blob(character)).titles,
      arenaMode: Boolean(character.arenaMode),
    },
    farm,
    world: await worldSnapshot(character),
    engagement: refreshed,
    arena: arena.lobby,
    duel: arena.duel,
  };
}

export async function allocateActiveAttributes(
  userId: number,
  deltas: { str?: number; int?: number; dex?: number; con?: number },
) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = allocateAttributes(blob(character), deltas);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Pontos distribuídos",
    character: publicCharacter(blob(character)),
    ...result,
  };
}

export async function unlockActiveSkill(userId: number, skillId: string) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = unlockSkill(blob(character), String(skillId || ""));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Skill desbloqueada",
    character: publicCharacter(blob(character)),
    ...result,
  };
}

export async function activateActiveSkill(userId: number, skillId: string) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = activateSkill(blob(character), String(skillId || ""));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Skill ativada",
    character: publicCharacter(blob(character)),
    ...result,
  };
}

export async function castCombatSkill(userId: number, skillId: string) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = queueCombatSkillDomain(blob(character), String(skillId || ""));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Skill enfileirada — sai no próximo golpe",
    character: publicCharacter(blob(character)),
    ...result,
  };
}

export async function setCombatAutoCast(userId: number, enabled: boolean) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const autoCast = setCombatAutoCastDomain(blob(character), enabled);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: autoCast
      ? "Auto-usar skills ligado"
      : "Auto-usar skills desligado (padrão)",
    autoCast,
    character: publicCharacter(blob(character)),
  };
}

export async function setAutoHpPotion(
  userId: number,
  { enabled, thresholdPct }: { enabled?: boolean; thresholdPct?: number } = {},
) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const autoHpPotion = setAutoHpPotionDomain(blob(character), { enabled, thresholdPct });
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const parts: string[] = [];
  if (enabled != null) {
    parts.push(autoHpPotion.enabled ? "Auto poção ligada" : "Auto poção desligada");
  }
  if (thresholdPct != null) {
    parts.push(`usa com HP ≤ ${autoHpPotion.thresholdPct}%`);
  }
  return {
    message: parts.join(" · ") || "Auto poção atualizada",
    autoHpPotion,
    character: publicCharacter(blob(character)),
  };
}

export async function ascendActiveCharacter(userId: number) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const result = ascendToCelestial(blob(character));
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message:
      "Ritual da Divindade concluído — você é Celestial no nível 1. Atributos e equipamento permanecem; reconquiste as áreas até o Éter.",
    character: publicCharacter(blob(character)),
    ...result,
  };
}

export async function getAnnouncements(userId: number, since?: string | null) {
  const teamIds = await getActiveUserTeamIds(userId);
  return { announcements: listIdleAnnouncements(since, teamIds) };
}

export async function getMeta(email?: string | null) {
  await ensureCatalogLoaded();
  const admin = isSinergiaIdleAdmin(email);
  return {
    ...listMeta(),
    catalogRevision: getCatalogRevision(),
    isAdmin: admin,
    maintenance: publicGameMaintenance(),
    ...(admin
      ? {
          adminCatalog: listCatalog(),
          adminCatalogMeta: adminCatalogMetaPayload(),
          adminActiveCharacters: await adminListActiveCharacters(email),
          adminBalance: getBalance(),
          adminBalanceOverrides: getBalanceOverrides(),
          adminZoneOverrides: getZoneOverrides(),
          adminEmails: listSinergiaIdleAdminEmails(),
        }
      : {}),
  };
}

async function assertGameplayOpen() {
  await ensureCatalogLoaded();
  const maintenance = getGameMaintenance();
  if (!maintenance.enabled) return;
  const error = new Error(maintenance.message || DEFAULT_MAINTENANCE_MESSAGE);
  (error as Error & { status?: number; code?: string }).status = 503;
  (error as Error & { code?: string }).code = "MAINTENANCE";
  throw error;
}

/** Personagens com isActive=true (um por conta em uso) — só admin IDLE. */
export async function adminListActiveCharacters(email: string | null | undefined) {
  assertIdleAdmin(email);
  const rows = await prisma.sinergiaIdleCharacter.findMany({
    where: {
      isActive: true,
      user: { deletedAt: null, isActive: true },
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ level: "desc" }, { name: "asc" }],
  });
  return rows.map((row) => {
    const character = fromRow(row);
    ensureGear(blob(character));
    return {
      ...publicCharacter(blob(character)),
      userId: row.userId,
      userName: row.user.name,
      userEmail: row.user.email,
      isActive: row.isActive,
      lastSeenAt: row.lastSeenAt?.toISOString() || null,
    };
  });
}

async function loadCharacterForAdmin(
  characterId: string,
): Promise<{ character: GameCharacter; ownerUserId: number }> {
  const row = await prisma.sinergiaIdleCharacter.findUnique({ where: { id: characterId } });
  if (!row) {
    const error = new Error("Personagem não encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return { character: fromRow(row), ownerUserId: row.userId };
}

export async function listCharacters(userId: number) {
  await assertGameplayOpen();
  const rows = await prisma.sinergiaIdleCharacter.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
  });
  return rows.map((row) => {
    const character = fromRow(row);
    return {
    ...publicCharacter(blob(character)),
      isActive: row.isActive,
    };
  });
}

export async function createCharacterForUser(
  userId: number,
  name: string,
  classId: string,
  appearance?: unknown,
) {
  await assertGameplayOpen();
  await ensureCatalogLoaded();
  const count = await prisma.sinergiaIdleCharacter.count({ where: { userId } });
  if (count >= MAX_CHARACTERS_PER_USER) {
    throw new Error(`Limite de ${MAX_CHARACTERS_PER_USER} personagens por usuário`);
  }
  const character = createGameCharacter(name, classId, appearance) as GameCharacter;
  character.appearanceLocked = true;
  const stats = computeStats(character as never) as { maxHp: number; maxMp: number };
  character.currentHp = stats.maxHp;
  character.currentMp = stats.maxMp;

  await prisma.$transaction([
    prisma.sinergiaIdleCharacter.updateMany({
      where: { userId },
      data: { isActive: false },
    }),
    prisma.sinergiaIdleCharacter.create({
      data: {
        id: character.id,
        userId,
        name: character.name,
        classId: character.classId,
        level: character.level,
        experience: character.experience,
        gold: character.gold,
        isActive: true,
        state: asJson(character),
      },
    }),
  ]).catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("Você já tem um personagem com esse nome");
    }
    throw error;
  });

  return publicCharacter(blob(character));
}

export async function selectCharacter(userId: number, characterId: string) {
  await assertGameplayOpen();
  const row = await prisma.sinergiaIdleCharacter.findFirst({
    where: { id: characterId, userId },
  });
  if (!row) throw new Error("Personagem não encontrado");
  await prisma.$transaction([
    prisma.sinergiaIdleCharacter.updateMany({
      where: { userId },
      data: { isActive: false },
    }),
    prisma.sinergiaIdleCharacter.update({
      where: { id: characterId },
      data: { isActive: true },
    }),
  ]);
  return publicCharacter(fromRow(row));
}

async function deleteCharacterRow(row: {
  id: string;
  userId: number;
  name: string;
  isActive: boolean;
}) {
  await prisma.$transaction(async (tx) => {
    await tx.sinergiaIdleCharacter.delete({ where: { id: row.id } });
    if (row.isActive) {
      const next = await tx.sinergiaIdleCharacter.findFirst({
        where: { userId: row.userId },
        orderBy: { createdAt: "asc" },
      });
      if (next) {
        await tx.sinergiaIdleCharacter.update({
          where: { id: next.id },
          data: { isActive: true },
        });
      }
    }
  });
}

/** Exclui personagem do próprio usuário. Se era o ativo, promove outro (se houver). */
export async function deleteCharacter(userId: number, characterId: string) {
  await assertGameplayOpen();
  const row = await prisma.sinergiaIdleCharacter.findFirst({
    where: { id: characterId, userId },
  });
  if (!row) {
    const error = new Error("Personagem não encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  await deleteCharacterRow(row);

  return {
    message: `Personagem ${row.name} excluído`,
    deletedId: characterId,
  };
}

/** Admin allowlist: exclui qualquer personagem (qualquer conta). */
export async function adminDeleteCharacter(email: string, characterId: string) {
  assertIdleAdmin(email);
  const id = String(characterId || "").trim();
  if (!id) throw new Error("Informe o personagem");

  const row = await prisma.sinergiaIdleCharacter.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });
  if (!row) {
    const error = new Error("Personagem não encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  await deleteCharacterRow(row);

  const owner = row.user?.name || row.user?.email || `user#${row.userId}`;
  const message = `Personagem ${row.name} (Lv.${row.level}) de ${owner} excluído`;
  await recordAdminAction(email, "character_delete", message, {
    characterId: row.id,
    characterName: row.name,
    ownerUserId: row.userId,
    ownerName: row.user?.name || null,
    ownerEmail: row.user?.email || null,
  });

  return {
    message,
    deletedId: row.id,
    adminActiveCharacters: await adminListActiveCharacters(email),
  };
}

async function loadActive(
  userId: number,
  opts?: { bypassMaintenance?: boolean },
): Promise<GameCharacter> {
  if (!opts?.bypassMaintenance) await assertGameplayOpen();
  await ensureCatalogLoaded();
  const row = await prisma.sinergiaIdleCharacter.findFirst({
    where: { userId, isActive: true },
  });
  if (!row) {
    const error = new Error("Crie ou selecione um personagem");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  return fromRow(row);
}

export async function getActiveState(userId: number) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  return syncAndPublic(character, userId);
}

export async function updateAppearance(_userId: number, _input: unknown) {
  const error = new Error("Aparência só pode ser definida na criação do personagem");
  (error as Error & { status?: number }).status = 403;
  throw error;
}

/** Salão cosmético — só IDs em state.cosmetics.unlocked. */
export async function updateCosmetics(
  userId: number,
  input: { capeId?: string | null; armorTintId?: string | null },
) {
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  ensureCosmetics(blob(character));
  setEquippedCosmetics(blob(character), input);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message: "Cosméticos atualizados",
    character: publicCharacter(blob(character)),
    cosmetics: publicCosmetics(blob(character)),
  };
}

/** Escolhe o pet ativo (um por vez). `petId` null desativa. */
export async function updateActivePet(userId: number, petId: string | null) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  setActivePet(blob(character), petId);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const pets = publicPets(blob(character));
  const names: Record<string, string> = {
    dog: "Cachorro",
    cat: "Gato",
    parrot: "Papagaio",
  };
  const message = pets.activeId
    ? `${names[pets.activeId] || "Pet"} ativo no campo`
    : "Nenhum pet ativo";
  return {
    message,
    character: publicCharacter(blob(character)),
    pets,
  };
}

export async function adminGrantCosmetic(
  userId: number,
  email: string,
  input: { cosmeticId?: string; characterId?: string },
) {
  assertIdleAdmin(email);
  let character: GameCharacter;
  let ownerUserId = userId;
  if (input.characterId) {
    const loaded = await loadCharacterForAdmin(String(input.characterId));
    character = loaded.character;
    ownerUserId = loaded.ownerUserId;
  } else {
    character = await loadActive(userId, { bypassMaintenance: true });
  }
  const id = String(input.cosmeticId || "");
  unlockCosmetic(blob(character), id);
  character.lastSeenAt = new Date().toISOString();
  await persist(ownerUserId, character);
  const message = `Cosmético ${id} concedido a ${character.name}`;
  await recordAdminAction(email, "cosmetic", message, {
    cosmeticId: id,
    characterId: character.id,
  });
  return {
    message,
    character: publicCharacter(blob(character)),
    cosmetics: publicCosmetics(blob(character)),
  };
}

function assertIdleAdmin(email: string | null | undefined) {
  if (!isSinergiaIdleAdmin(email)) {
    const error = new Error("Apenas o admin do Sinergia IDLE pode fazer isso");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

/** Exposto para rotas admin read-only (ex.: simulate). */
export function assertIdleAdminExport(email: string | null | undefined) {
  assertIdleAdmin(email);
}

type AdminActionKind =
  | "grant"
  | "config"
  | "season_end"
  | "character"
  | "character_delete"
  | "catalog"
  | "catalog_delete"
  | "catalog_reset"
  | "cosmetic";

async function recordAdminAction(
  email: string,
  action: AdminActionKind,
  summary: string,
  payload?: Record<string, unknown> | null,
) {
  try {
    const { randomUUID } = await import("crypto");
    await prisma.sinergiaIdleAdminAction.create({
      data: {
        id: randomUUID(),
        adminEmail: String(email || "").slice(0, 191),
        action: String(action).slice(0, 32),
        summary: String(summary || "").slice(0, 255),
        payload: payload ? (payload as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (err) {
    console.warn("[sinergia-idle] falha ao gravar auditoria admin", err);
  }
}

/** Métricas de retenção / claims — só allowlist admin IDLE. */
export async function getAdminEngagementMetrics(email: string) {
  assertIdleAdmin(email);
  const metrics = await computeIdleEngagementMetrics();
  return { metrics };
}

export async function listAdminActions(email: string, limit = 50) {
  assertIdleAdmin(email);
  const take = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
  const rows = await prisma.sinergiaIdleAdminAction.findMany({
    orderBy: { at: "desc" },
    take,
    select: {
      id: true,
      at: true,
      adminEmail: true,
      action: true,
      summary: true,
    },
  });
  return {
    actions: rows.map((row) => ({
      id: row.id,
      at: row.at.toISOString(),
      adminEmail: row.adminEmail,
      action: row.action,
      summary: row.summary,
    })),
  };
}

/** Concede um item do catálogo à mochila do personagem alvo (admin). */
export async function adminGrantItem(
  userId: number,
  email: string,
  input: { templateId?: string; rarity?: string; characterId?: string },
) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  let character: GameCharacter;
  let ownerUserId = userId;
  if (input.characterId) {
    const loaded = await loadCharacterForAdmin(String(input.characterId));
    character = loaded.character;
    ownerUserId = loaded.ownerUserId;
  } else {
    character = await loadActive(userId, { bypassMaintenance: true });
  }
  {
    const { opts } = await farmOptionsFor(ownerUserId, character);
    processFarm(blob(character), Date.now(), opts);
  }
  ensureGear(blob(character));
  const rarity = String(input.rarity || "common");
  if (!(rarity in RARITIES)) throw new Error("Raridade inválida");
  const item = createItem(String(input.templateId || ""), rarity);
  const result = addItem(blob(character), item);
  character.lastSeenAt = new Date().toISOString();
  await persist(ownerUserId, character);
  const message = result.added
    ? `Item concedido à mochila de ${character.name}`
    : `Mochila cheia — item vendido por ${result.gold} gold`;
  await recordAdminAction(email, "grant", message, {
    templateId: input.templateId,
    rarity,
    characterId: character.id,
    characterName: character.name,
  });
  return {
    message,
    character: publicCharacter(blob(character)),
    catalog: listCatalog(),
    catalogMeta: adminCatalogMetaPayload(),
  };
}

/** Cria/atualiza template no catálogo (persiste) e opcionalmente concede 1 cópia. */
export async function adminUpsertCatalogItem(
  userId: number,
  email: string,
  input: Record<string, unknown>,
) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const creating = Boolean(input.creating ?? !input.id);
  const template = upsertTemplate(input, { creating, persist: false });
  await writeCatalogState(getCatalogStateSnapshot());
  const shouldGrant = input.grant !== false;
  if (!shouldGrant) {
    const message = creating ? "Item criado no catálogo" : "Item atualizado no catálogo";
    await recordAdminAction(email, "catalog", `${message}: ${template.id}`, {
      templateId: template.id,
      creating,
    });
    return {
      template,
      message,
      catalog: listCatalog(),
      catalogMeta: adminCatalogMetaPayload(),
    };
  }
  await recordAdminAction(email, "catalog", `Catálogo + grant: ${template.id}`, {
    templateId: template.id,
    creating,
  });
  const grant = await adminGrantItem(userId, email, {
    templateId: template.id,
    rarity: String(input.rarity || "rare"),
    characterId: input.characterId ? String(input.characterId) : undefined,
  });
  return { template, ...grant };
}

export async function adminDeleteCatalogItem(email: string, templateId: string) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  deleteTemplate(String(templateId || ""), { persist: false });
  await writeCatalogState(getCatalogStateSnapshot());
  await recordAdminAction(email, "catalog_delete", `Item removido: ${templateId}`, {
    templateId,
  });
  return {
    message: "Item removido do catálogo",
    catalog: listCatalog(),
    catalogMeta: adminCatalogMetaPayload(),
  };
}

export async function adminResetCatalogItem(email: string, templateId: string) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const template = resetTemplate(String(templateId || ""), { persist: false });
  await writeCatalogState(getCatalogStateSnapshot());
  await recordAdminAction(email, "catalog_reset", `Item restaurado: ${templateId}`, {
    templateId,
  });
  return {
    message: "Item restaurado ao original",
    template,
    catalog: listCatalog(),
    catalogMeta: adminCatalogMetaPayload(),
  };
}

export async function adminUpdateConfig(
  email: string,
  input: {
    dropChance?: number;
    bagUpgradePrice?: number | string;
    refinerPrice?: number | string;
    attrResetPrice?: number | string;
    petDogPrice?: number | string;
    petCatPrice?: number | string;
    petParrotPrice?: number | string;
    merchantOffersEnabled?: Record<string, boolean>;
    engagementEvent?: {
      label?: string;
      xpMult?: number;
      goldMult?: number;
      dropMult?: number;
      endsAt?: string;
      clear?: boolean;
    } | null;
    balance?: Record<string, number | string | null> | null;
    zone?: {
      id: string;
      minLevel?: number;
      tier?: number;
      dropChance?: number | null;
      requiresAscension?: string | null;
      bossHpMult?: number | null;
      bossAtkMult?: number | null;
      bossDropMult?: number | null;
      refineDropChance?: number | null;
      monsters?: Array<Record<string, unknown>>;
      /** Override absoluto do boss da macro; `null` remove o override (volta ao derivado). */
      boss?: Record<string, unknown> | null;
      /** Kills de mobs até o boss; `null` remove override (volta a 2× qtd de mobs). */
      bossWaveSize?: number | null;
      scene?: ZoneScene | null;
      clear?: boolean;
    };
    maintenance?: { enabled?: boolean; message?: string } | boolean;
  },
) {
  assertIdleAdmin(email);
  // Force: pega o estado mais recente de outra réplica antes de mesclar o patch.
  await ensureCatalogLoaded({ force: true });
  if (input.dropChance != null) {
    setDropChance(input.dropChance, { persist: false });
  }
  if (input.bagUpgradePrice != null) {
    setBagUpgradePrice(input.bagUpgradePrice, { persist: false });
  }
  if (input.refinerPrice != null) {
    setRefinerPrice(input.refinerPrice, { persist: false });
  }
  if (input.attrResetPrice != null) {
    setAttrResetPrice(input.attrResetPrice, { persist: false });
  }
  if (input.petDogPrice != null) {
    setPetDogPrice(input.petDogPrice, { persist: false });
  }
  if (input.petCatPrice != null) {
    setPetCatPrice(input.petCatPrice, { persist: false });
  }
  if (input.petParrotPrice != null) {
    setPetParrotPrice(input.petParrotPrice, { persist: false });
  }
  if (input.merchantOffersEnabled != null) {
    setMerchantOffersEnabled(input.merchantOffersEnabled, { persist: false });
  }
  if (input.engagementEvent !== undefined) {
    setEngagementEvent(input.engagementEvent, { persist: false });
  }
  if (input.balance !== undefined) {
    setBalanceOverrides(input.balance, { persist: false });
  }
  if (input.maintenance !== undefined) {
    const patch =
      typeof input.maintenance === "boolean"
        ? { enabled: input.maintenance }
        : {
            enabled: Boolean(input.maintenance?.enabled),
            message:
              input.maintenance?.message != null
                ? String(input.maintenance.message)
                : undefined,
          };
    setGameMaintenance(patch);
  }
  if (input.zone?.id) {
    const all = getZoneOverrides() as Record<string, Record<string, unknown>>;
    if (input.zone.clear) {
      delete all[input.zone.id];
    } else {
      const prev = (all[input.zone.id] || {}) as Record<string, unknown>;
      const next: Record<string, unknown> = {
        ...prev,
        ...(input.zone.minLevel != null ? { minLevel: Number(input.zone.minLevel) } : {}),
        ...(input.zone.tier != null ? { tier: Number(input.zone.tier) } : {}),
        ...(input.zone.dropChance !== undefined ? { dropChance: input.zone.dropChance } : {}),
        ...(input.zone.requiresAscension !== undefined
          ? { requiresAscension: input.zone.requiresAscension }
          : {}),
        ...(input.zone.bossHpMult !== undefined ? { bossHpMult: input.zone.bossHpMult } : {}),
        ...(input.zone.bossAtkMult !== undefined ? { bossAtkMult: input.zone.bossAtkMult } : {}),
        ...(input.zone.bossDropMult !== undefined ? { bossDropMult: input.zone.bossDropMult } : {}),
        ...(input.zone.refineDropChance !== undefined
          ? { refineDropChance: input.zone.refineDropChance }
          : {}),
        ...(Array.isArray(input.zone.monsters)
          ? {
              monsters: input.zone.monsters.map((raw) => {
                const m = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
                const visualId = sanitizeMonsterVisualId(m.visualId);
                return {
                  ...m,
                  ...(visualId ? { visualId } : { visualId: undefined }),
                };
              }),
            }
          : {}),
      };
      if (input.zone.boss !== undefined) {
        if (input.zone.boss === null) {
          delete next.boss;
        } else if (input.zone.boss && typeof input.zone.boss === "object") {
          const visualId = sanitizeMonsterVisualId(
            (input.zone.boss as Record<string, unknown>).visualId,
          );
          next.boss = {
            ...input.zone.boss,
            ...(visualId ? { visualId } : {}),
          };
          if (typeof input.zone.boss.name === "string" && input.zone.boss.name.trim()) {
            next.bossName = String(input.zone.boss.name).trim().slice(0, 48);
          }
        }
      }
      if (input.zone.bossWaveSize !== undefined) {
        if (input.zone.bossWaveSize === null) {
          delete next.bossWaveSize;
        } else {
          const n = Math.floor(Number(input.zone.bossWaveSize));
          if (Number.isFinite(n) && n >= 1) {
            next.bossWaveSize = Math.min(200, n);
          }
        }
      }
      if (input.zone.scene !== undefined) {
        if (input.zone.scene === null) {
          delete next.scene;
        } else {
          const scene = sanitizeZoneScene(input.zone.scene);
          if (scene) next.scene = scene;
        }
      }
      all[input.zone.id] = next;
    }
    setZoneOverrides(all);
    refreshZones();
  }
  await writeCatalogState(getCatalogStateSnapshot());
  const bits: string[] = [];
  if (input.dropChance != null) bits.push("drop");
  if (
    input.bagUpgradePrice != null ||
    input.refinerPrice != null ||
    input.attrResetPrice != null
  ) {
    bits.push("mercador");
  }
  if (input.engagementEvent !== undefined) bits.push("evento");
  if (input.balance !== undefined) bits.push("balance");
  if (input.zone?.id) bits.push(`zona:${input.zone.id}`);
  if (input.maintenance !== undefined) {
    bits.push(getGameMaintenance().enabled ? "manutenção ligada" : "manutenção desligada");
  }
  await recordAdminAction(
    email,
    "config",
    bits.length ? `Config: ${bits.join(", ")}` : "Configuração atualizada",
    {
      zoneId: input.zone?.id,
      dropChance: input.dropChance,
    },
  );
  const maintenance = publicGameMaintenance();
  return {
    message:
      input.maintenance !== undefined
        ? maintenance.enabled
          ? "Jogo em manutenção — jogadores bloqueados"
          : "Jogo liberado para os jogadores"
        : "Configuração atualizada",
    catalogMeta: adminCatalogMetaPayload(),
    merchant: merchantMeta(),
    balance: getBalance(),
    balanceOverrides: getBalanceOverrides(),
    zones: listMeta().zones,
    maintenance,
  };
}

/** Compra no mercador (mochila / Refinador / pets). Autoridade 100% server-side. */
export async function buyMerchantOffering(userId: number, sku: string) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const key = String(sku || "");
  if (!isMerchantOfferEnabled(key)) {
    const error = new Error("Esta oferta do mercador está indisponível");
    (error as Error & { status?: number }).status = 403;
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
    const names: Record<string, string> = {
      dog: "Cachorro",
      cat: "Gato",
      parrot: "Papagaio",
    };
    message = `${names[result.petId] || "Pet"} adquirido (−${result.price.toLocaleString("pt-BR")} gold)`;
    if (result.sold?.count) {
      message += ` · pet vendeu ${result.sold.count} item(ns) fora da classe (+${result.sold.gold.toLocaleString("pt-BR")} gold)`;
    }
  } else {
    throw new Error("Oferta do mercador não encontrada");
  }
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message,
    character: publicCharacter(blob(character)),
    merchant: merchantMeta(),
  };
}

export async function adminUpdateActiveCharacter(
  userId: number,
  email: string,
  input: {
    characterId?: string;
    addGold?: number;
    setLevel?: number;
    grantPoints?: number;
    clearInventory?: boolean;
    grantCosmeticId?: string;
  },
) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  let character: GameCharacter;
  let ownerUserId = userId;
  if (input.characterId) {
    const loaded = await loadCharacterForAdmin(String(input.characterId));
    character = loaded.character;
    ownerUserId = loaded.ownerUserId;
  } else {
    character = await loadActive(userId, { bypassMaintenance: true });
  }
  {
    const { opts } = await farmOptionsFor(ownerUserId, character);
    processFarm(blob(character), Date.now(), opts);
  }
  ensureGear(blob(character));
  ensureAttributeEconomy(blob(character));
  const notes: string[] = [];

  if (input.clearInventory) {
    clearInventory(blob(character));
    notes.push(`Mochila de ${character.name} limpa`);
  }
  if (input.addGold != null) {
    const gold = addCharacterGold(blob(character), input.addGold);
    notes.push(`${character.name}: ouro agora ${gold}`);
  }
  if (input.setLevel != null) {
    setCharacterLevel(blob(character), input.setLevel);
    notes.push(`${character.name}: nível ${character.level}`);
  }
  if (input.grantPoints != null) {
    const pts = Math.floor(Number(input.grantPoints));
    if (!Number.isFinite(pts) || pts <= 0) throw new Error("Informe pontos > 0");
    character.unspentPoints = Math.max(0, Math.floor(Number(character.unspentPoints) || 0) + pts);
    notes.push(`${character.name}: +${pts} pontos livres (total ${character.unspentPoints})`);
  }
  if (input.grantCosmeticId) {
    unlockCosmetic(blob(character), String(input.grantCosmeticId));
    notes.push(`${character.name}: cosmético ${input.grantCosmeticId}`);
  }
  if (!notes.length) throw new Error("Nenhuma alteração informada");

  character.lastSeenAt = new Date().toISOString();
  await persist(ownerUserId, character);
  const message = notes.join(" · ");
  await recordAdminAction(email, "character", message, {
    characterId: character.id,
    characterName: character.name,
  });
  return {
    message,
    character: publicCharacter(blob(character)),
    adminActiveCharacters: await adminListActiveCharacters(email),
  };
}

export async function startActiveFarm(userId: number, zoneId: string) {
  const character = await loadActive(userId);
  await expireStaleDuelsForCharacter(character.id);
  if (await characterHasOpenDuel(character.id)) {
    const error = new Error("Duelo em andamento — caça bloqueada");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  // Iniciar caça sai da Arena automaticamente (evita ficar preso sem farm).
  const leftArena = Boolean(character.arenaMode);
  character.arenaMode = false;
  const { engagement, opts } = await farmOptionsFor(userId, character);
  maybeUnlockPlantonista(character, engagement);
  processFarm(blob(character), Date.now(), opts);
  const zone = startFarm(blob(character), zoneId) as { id: string; name: string };
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    zone: { id: zone.id, name: zone.name },
    character: { ...publicCharacter(blob(character)), arenaMode: false },
    engagement,
    arena: { inArena: false, minStake: DUEL_MIN_STAKE },
    leftArena,
  };
}

export async function stopActiveFarm(userId: number) {
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  stopFarm(blob(character), opts);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return { character: publicCharacter(blob(character)), engagement };
}

/** Liga/desliga restart automático da caça após desmaio (persistido no state). */
export async function setAutoRestartFarm(userId: number, enabled: boolean) {
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

/**
 * Zera só o agregado huntPerf (nova janela de medição).
 * Não para o farm, não altera combate, inventário nem economia.
 */
export async function resetActiveHuntPerf(userId: number) {
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

export async function applyItemOp(
  userId: number,
  op: string,
  body: { uid?: string; slot?: string; hand?: string; itemId?: string },
) {
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
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  const stats = computeStats(character as never) as { maxHp: number };
  character.currentHp = Math.min(character.currentHp, stats.maxHp);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  return {
    message,
    character: publicCharacter(blob(character)),
    engagement,
  };
}

/** Preferências do Inventário Inteligente (não concede automação sem pet). */
export async function updateInventoryAutomationPrefs(
  userId: number,
  patch: {
    autoSellEnabled?: boolean;
    maxSellRarity?: string;
    autoEquipEnabled?: boolean;
    confirmRareSell?: boolean;
  },
) {
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

/**
 * Missões leves de participação (1×/dia local). Não usa horas como performance —
 * check-in = abriu o IDLE; flowtime = existe lançamento TicTac no dia.
 */
export async function claimEngagementMission(
  userId: number,
  kind: "checkin" | "flowtime",
) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  processFarm(blob(character), Date.now(), opts);
  const eng = ensureEngagementState(blob(character));
  const day = todayKey();

  if (kind === "checkin") {
    if (eng.checkInDay === day) {
      throw new Error("Check-in de hoje já resgatado");
    }
    eng.checkInDay = day;
    addCharacterGold(blob(character), CHECKIN_GOLD);
    character.lastSeenAt = new Date().toISOString();
    await persist(userId, character);
    await recordEngagementClaimEvent({
      userId,
      characterId: character.id,
      kind: "checkin",
      day,
    });
    const refreshed = await getIdleEngagementBonus(userId, blob(character));
    return {
      message: `Check-in SinergIA: +${CHECKIN_GOLD.toLocaleString("pt-BR")} gold`,
      character: publicCharacter(blob(character)),
      engagement: refreshed,
    };
  }

  if (kind === "flowtime") {
    if (eng.flowtimeDay === day) {
      throw new Error("Bônus TicTac de hoje já resgatado");
    }
    if (!engagement.missions.flowtimeAvailable) {
      throw new Error("Registre um lançamento no TicTac hoje para resgatar");
    }
    eng.flowtimeDay = day;
    eng.dropBoostDay = day;
    addCharacterGold(blob(character), FLOWTIME_CLAIM_GOLD);
    character.lastSeenAt = new Date().toISOString();
    await persist(userId, character);
    await recordEngagementClaimEvent({
      userId,
      characterId: character.id,
      kind: "flowtime",
      day,
    });
    const refreshed = await getIdleEngagementBonus(userId, blob(character));
    return {
      message: `Participação TicTac: +${FLOWTIME_CLAIM_GOLD.toLocaleString("pt-BR")} gold e boost de drop até o fim do dia`,
      character: publicCharacter(blob(character)),
      engagement: refreshed,
    };
  }

  throw new Error("Missão inválida");
}

type RankingRow = {
  rank: number;
  userId: number;
  userName: string;
  characterId: string;
  characterName: string;
  classId: string;
  className: string;
  level: number;
  experience: number;
  gold: number;
  /** CELESTIAL | null — null no live = Mortal; em snapshot legado omitido/ausente = histórico. */
  ascension?: AscensionTier;
  /** Presente no live; em CLOSED legado pode ser undefined (não inventar). */
  ascensionKnown?: boolean;
  appearance?: Record<string, unknown> | null;
  equipment?: Record<string, RankingEquipmentItem> | null;
};

const MORTAL_RANK_POOL = 400;

function appearanceFromState(state: unknown): Record<string, unknown> | null {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const appearance = (state as Record<string, unknown>).appearance;
  if (!appearance || typeof appearance !== "object" || Array.isArray(appearance)) return null;
  return appearance as Record<string, unknown>;
}

function rankingEquipmentFromState(state: unknown): Record<string, RankingEquipmentItem> {
  if (!state || typeof state !== "object" || Array.isArray(state)) return {};
  const raw = (state as Record<string, unknown>).equipment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, RankingEquipmentItem> = {};
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    try {
      const pub = publicItem(value) as Record<string, unknown>;
      const slim = stripItemForRanking(pub);
      if (slim) out[slot] = slim;
    } catch {
      /* template removido — ignora slot */
    }
  }
  return out;
}

type RankingCandidate = {
  userId: number;
  userName: string;
  characterId: string;
  characterName: string;
  classId: string;
  className: string;
  level: number;
  experience: number;
  gold: number;
  ascension: AscensionTier;
  appearance: Record<string, unknown> | null;
  state: unknown;
};

type RankingCharacterRow = {
  id: string;
  userId: number;
  name: string;
  classId: string;
  level: number;
  experience: number;
  gold: number;
  state: unknown;
  user: { name: string; deletedAt: Date | null; isActive: boolean };
};

function mapCharacterRow(row: RankingCharacterRow): RankingCandidate | null {
  if (row.user.deletedAt || !row.user.isActive) return null;
  return {
    userId: row.userId,
    userName: row.user.name,
    characterId: row.id,
    characterName: row.name,
    classId: row.classId,
    className: CLASSES[row.classId as keyof typeof CLASSES]?.name ?? row.classId,
    level: row.level,
    experience: row.experience,
    gold: row.gold,
    ascension: ascensionFromState(row.state),
    appearance: appearanceFromState(row.state),
    state: row.state,
  };
}

/**
 * Pool: Celestiais via JSON (MySQL) + top Mortais por nível.
 * Fallback: se o path JSON falhar, inclui Celestiais detectados no top e,
 * se necessário, uma varredura só de ativos para não perder Celestial Lv.1.
 */
async function buildLiveRanking(limit = 50): Promise<RankingRow[]> {
  const userSelect = { select: { id: true, name: true, deletedAt: true, isActive: true } } as const;

  let celestialRows: RankingCharacterRow[] = [];
  try {
    celestialRows = (await prisma.sinergiaIdleCharacter.findMany({
      where: {
        isActive: true,
        state: { path: "$.ascension", equals: "CELESTIAL" },
      },
      include: { user: userSelect },
    })) as RankingCharacterRow[];
  } catch {
    celestialRows = [];
  }

  const topByLevel = (await prisma.sinergiaIdleCharacter.findMany({
    where: { isActive: true },
    include: { user: userSelect },
    orderBy: [{ level: "desc" }, { experience: "desc" }, { gold: "desc" }],
    take: MORTAL_RANK_POOL,
  })) as RankingCharacterRow[];

  const byId = new Map<string, RankingCandidate>();
  for (const row of [...celestialRows, ...topByLevel]) {
    const mapped = mapCharacterRow(row);
    if (mapped) byId.set(mapped.characterId, mapped);
  }

  const celestialCovered = [...byId.values()].some((c) => c.ascension === "CELESTIAL");
  if (celestialRows.length === 0 && !celestialCovered) {
    // Path JSON indisponível: varredura completa só para capturar Celestiais fora do top.
    const allActive = (await prisma.sinergiaIdleCharacter.findMany({
      where: { isActive: true },
      include: { user: userSelect },
    })) as RankingCharacterRow[];
    for (const row of allActive) {
      const mapped = mapCharacterRow(row);
      if (mapped?.ascension === "CELESTIAL") byId.set(mapped.characterId, mapped);
    }
  }

  const best = pickBestCharacterPerUser([...byId.values()]);
  const sliced = best.slice(0, Math.max(1, Math.min(200, limit)));

  return sliced.map((row, index) => {
    const base: RankingRow = {
      rank: index + 1,
      userId: row.userId,
      userName: row.userName,
      characterId: row.characterId,
      characterName: row.characterName,
      classId: row.classId,
      className: row.className,
      level: row.level,
      experience: row.experience,
      gold: row.gold,
      ascension: row.ascension,
      ascensionKnown: true,
      appearance: row.appearance ?? null,
    };
    if (index < 3) {
      base.equipment = rankingEquipmentFromState(row.state);
    }
    return base;
  });
}

/** Garante exatamente uma temporada OPEN (cria a do quarter atual ou a seguinte à última fechada). */
export async function ensureOpenSeason(openedByEmail?: string | null) {
  const open = await prisma.sinergiaIdleSeason.findFirst({
    where: { status: SEASON_STATUS.OPEN },
  });
  if (open) return open;

  const last = await prisma.sinergiaIdleSeason.findFirst({
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
  });
  const identity = last
    ? nextSeasonIdentity(last.year, last.quarter)
    : currentSeasonIdentity();

  return prisma.sinergiaIdleSeason.create({
    data: {
      id: newSeasonId(),
      year: identity.year,
      quarter: identity.quarter,
      slug: identity.slug,
      label: identity.label,
      status: SEASON_STATUS.OPEN,
      openedByEmail: openedByEmail || null,
    },
  });
}

export async function getCurrentSeason() {
  return ensureOpenSeason();
}

export async function listSeasons() {
  await ensureOpenSeason();
  const seasons = await prisma.sinergiaIdleSeason.findMany({
    orderBy: [{ year: "desc" }, { quarter: "desc" }],
  });
  const current = seasons.find((s) => s.status === SEASON_STATUS.OPEN) || null;
  return {
    current,
    seasons: seasons.map((s) => ({
      id: s.id,
      year: s.year,
      quarter: s.quarter,
      slug: s.slug,
      label: s.label,
      notes: s.notes,
      status: s.status,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() || null,
    })),
  };
}

export async function getRanking(limit = 50, seasonId?: string | null) {
  const capped = Math.max(1, Math.min(100, limit));
  if (seasonId) {
    const season = await prisma.sinergiaIdleSeason.findUnique({ where: { id: seasonId } });
    if (!season) {
      const error = new Error("Temporada não encontrada");
      (error as Error & { status?: number }).status = 404;
      throw error;
    }
    if (season.status === SEASON_STATUS.OPEN) {
      return {
        season: {
          id: season.id,
          slug: season.slug,
          label: season.label,
          status: season.status,
        },
        ranking: await buildLiveRanking(capped),
        live: true,
      };
    }
    const rows = await prisma.sinergiaIdleSeasonRanking.findMany({
      where: { seasonId: season.id },
      orderBy: { rank: "asc" },
      take: capped,
    });
    return {
      season: {
        id: season.id,
        slug: season.slug,
        label: season.label,
        status: season.status,
      },
      ranking: rows.map((row) => {
        // Snapshots novos gravam CELESTIAL | MORTAL; legado null = histórico indisponível.
        const rawAsc = row.ascension;
        const ascensionKnown = rawAsc === "CELESTIAL" || rawAsc === "MORTAL";
        const ascension: AscensionTier | undefined = !ascensionKnown
          ? undefined
          : rawAsc === "CELESTIAL"
            ? "CELESTIAL"
            : null;
        let equipment: Record<string, RankingEquipmentItem> | null = null;
        if (row.equipment && typeof row.equipment === "object" && !Array.isArray(row.equipment)) {
          equipment = {};
          for (const [slot, value] of Object.entries(row.equipment as Record<string, unknown>)) {
            const slim = stripItemForRanking(value as Record<string, unknown>);
            if (slim) equipment[slot] = slim;
          }
        }
        return {
          rank: row.rank,
          userId: row.userId,
          userName: row.userName,
          characterId: row.characterId,
          characterName: row.characterName,
          classId: row.classId,
          className: CLASSES[row.classId as keyof typeof CLASSES]?.name ?? row.classId,
          level: row.level,
          experience: row.experience,
          gold: row.gold,
          ascension,
          ascensionKnown,
          equipment: row.rank <= 3 ? equipment : null,
        };
      }),
      live: false,
    };
  }

  const current = await ensureOpenSeason();
  return {
    season: {
      id: current.id,
      slug: current.slug,
      label: current.label,
      status: current.status,
    },
    ranking: await buildLiveRanking(capped),
    live: true,
  };
}

/**
 * Encerrar temporada: snapshot do ranking → soft-reset de todos os personagens → abre a próxima.
 * Destrutivo; exige confirm: true e allowlist admin.
 */
export async function endSeasonAndReset(
  email: string,
  input: { confirm?: boolean; notes?: string; nextLabel?: string } = {},
) {
  assertIdleAdmin(email);
  if (!input.confirm) {
    const error = new Error('Confirme com confirm: true para encerrar a temporada e resetar o progresso');
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const snapshot = await buildLiveRanking(200);

  const result = await prisma.$transaction(
    async (tx) => {
      const openSeasons = await tx.sinergiaIdleSeason.findMany({
        where: { status: SEASON_STATUS.OPEN },
      });
      assertExactlyOneOpenSeason(openSeasons.length);
      const open = openSeasons[0];

      if (snapshot.length) {
        await tx.sinergiaIdleSeasonRanking.createMany({
          data: snapshot.map((row) => ({
            id: newRankingRowId(),
            seasonId: open.id,
            rank: row.rank,
            userId: row.userId,
            userName: row.userName,
            characterId: row.characterId,
            characterName: row.characterName,
            classId: row.classId,
            level: row.level,
            experience: row.experience,
            gold: row.gold,
            ascension: row.ascension === "CELESTIAL" ? "CELESTIAL" : "MORTAL",
            equipment: row.rank <= 3 && row.equipment ? row.equipment : Prisma.JsonNull,
          })),
        });
      }

      const characters = await tx.sinergiaIdleCharacter.findMany();
      for (const row of characters) {
        const character = softResetCharacterForSeason(blob(fromRow(row)));
        await tx.sinergiaIdleCharacter.update({
          where: { id: row.id },
          data: {
            level: 1,
            experience: 0,
            gold: 0,
            state: asJson(character),
            lastSeenAt: null,
          },
        });
      }

      const closed = await tx.sinergiaIdleSeason.update({
        where: { id: open.id },
        data: {
          status: SEASON_STATUS.CLOSED,
          closedAt: new Date(),
          closedByEmail: email,
          notes: input.notes != null ? String(input.notes).slice(0, 4000) : open.notes,
        },
      });

      const nextId = nextSeasonIdentity(open.year, open.quarter);
      const opened = await tx.sinergiaIdleSeason.create({
        data: {
          id: newSeasonId(),
          year: nextId.year,
          quarter: nextId.quarter,
          slug: nextId.slug,
          label: input.nextLabel?.trim() || nextId.label,
          status: SEASON_STATUS.OPEN,
          openedByEmail: email,
        },
      });

      return {
        closed: {
          id: closed.id,
          slug: closed.slug,
          label: closed.label,
          notes: closed.notes,
        },
        opened: {
          id: opened.id,
          slug: opened.slug,
          label: opened.label,
        },
        snapshotCount: snapshot.length,
        charactersReset: characters.length,
      };
    },
    { timeout: 120_000, maxWait: 20_000 },
  );

  const message = `Temporada ${result.closed.slug} encerrada · ${result.snapshotCount} no ranking · ${result.charactersReset} personagens resetados · aberta ${result.opened.slug}`;
  await recordAdminAction(email, "season_end", message, {
    closedSlug: result.closed.slug,
    openedSlug: result.opened.slug,
    snapshotCount: result.snapshotCount,
    charactersReset: result.charactersReset,
  });
  return {
    message,
    ...result,
  };
}

const DUEL_REPLAY_WINDOW_MS = 120_000;
const OPEN_DUEL_STATUSES = [DUEL_STATUS.PENDING, DUEL_STATUS.ACTIVE] as const;

function isMissingDuelTable(error: unknown): boolean {
  return prismaMissingTableName(error) === "sinergia_idle_duels";
}

function isMissingEngagementEventsTable(error: unknown): boolean {
  return prismaMissingTableName(error) === "sinergia_idle_engagement_events";
}

function engagementEventsTableMissingError() {
  const error = new Error(
    "Tabela sinergia_idle_engagement_events ausente. Aplique a migration 20261017010000 (prisma migrate deploy) e reinicie o app.",
  );
  (error as Error & { status?: number }).status = 503;
  return error;
}

function duelTableMissingError() {
  const error = new Error(
    "Tabela sinergia_idle_duels ausente. Aplique a migration 20261015160000 (prisma migrate deploy) e reinicie o app.",
  );
  (error as Error & { status?: number }).status = 503;
  return error;
}

async function characterHasOpenDuel(characterId: string): Promise<boolean> {
  try {
    const row = await prisma.sinergiaIdleDuel.findFirst({
      where: {
        status: { in: [...OPEN_DUEL_STATUSES] },
        OR: [{ challengerCharacterId: characterId }, { opponentCharacterId: characterId }],
      },
      select: { id: true },
    });
    return Boolean(row);
  } catch (error) {
    if (isMissingDuelTable(error)) return false;
    throw error;
  }
}

async function expireStaleDuelsForCharacter(characterId: string) {
  try {
    const now = new Date();
    await prisma.sinergiaIdleDuel.updateMany({
      where: {
        status: DUEL_STATUS.PENDING,
        expiresAt: { lt: now },
        OR: [{ challengerCharacterId: characterId }, { opponentCharacterId: characterId }],
      },
      data: { status: DUEL_STATUS.EXPIRED },
    });
  } catch (error) {
    if (isMissingDuelTable(error)) return;
    throw error;
  }
}

type StoredDuelPayload = {
  challenger: DuelFighter;
  opponent: DuelFighter;
} & DuelResult;

function parseStoredFighters(result: unknown): { challenger: DuelFighter; opponent: DuelFighter } | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const c = r.challenger;
  const o = r.opponent;
  if (!c || !o || typeof c !== "object" || typeof o !== "object") return null;
  return { challenger: c as DuelFighter, opponent: o as DuelFighter };
}

function publicDuelRow(
  row: {
    id: string;
    challengerCharacterId: string;
    opponentCharacterId: string;
    stake: number;
    status: string;
    winnerCharacterId: string | null;
    events: Prisma.JsonValue | null;
    result: Prisma.JsonValue | null;
    expiresAt: Date | null;
    updatedAt: Date;
  },
  viewer: GameCharacter,
  foeName?: string,
) {
  const fighters = parseStoredFighters(row.result);
  const rawEvents = Array.isArray(row.events) ? (row.events as DuelEvent[]) : [];
  const storedResult = (row.result && typeof row.result === "object" ? row.result : {}) as DuelResult & {
    challenger?: DuelFighter;
    opponent?: DuelFighter;
  };
  let events: DuelEvent[] = [];
  if (
    fighters &&
    (row.status === DUEL_STATUS.FINISHED || row.status === DUEL_STATUS.ACTIVE) &&
    Date.now() - row.updatedAt.getTime() <= DUEL_REPLAY_WINDOW_MS
  ) {
    events = farmEventsForViewer(rawEvents, storedResult, viewer.id, fighters.challenger, fighters.opponent);
  }
  const isChallenger = viewer.id === row.challengerCharacterId;
  const foeId = isChallenger ? row.opponentCharacterId : row.challengerCharacterId;
  const foe =
    fighters &&
    (isChallenger ? fighters.opponent : fighters.challenger);
  return {
    id: row.id,
    status: row.status,
    stake: row.stake,
    role: isChallenger ? "challenger" : "opponent",
    expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
    winnerCharacterId: row.winnerCharacterId,
    draw: Boolean(storedResult.draw),
    reason: storedResult.reason || null,
    foe: {
      characterId: foeId,
      name: foe?.name || foeName || "Oponente",
      classId: foe?.classId || null,
      level: foe?.level || null,
    },
    events,
    result: row.status === DUEL_STATUS.FINISHED
      ? {
          draw: Boolean(storedResult.draw),
          winnerCharacterId: row.winnerCharacterId,
          reason: storedResult.reason || null,
          pot: row.stake * 2,
        }
      : null,
  };
}

async function arenaPayloadFor(character: GameCharacter) {
  const lobby = {
    inArena: Boolean(character.arenaMode),
    minStake: DUEL_MIN_STAKE,
  };
  try {
    await expireStaleDuelsForCharacter(character.id);
    const row = await prisma.sinergiaIdleDuel.findFirst({
      where: {
        OR: [
          {
            status: { in: [...OPEN_DUEL_STATUSES] },
            OR: [
              { challengerCharacterId: character.id },
              { opponentCharacterId: character.id },
            ],
          },
          {
            status: DUEL_STATUS.FINISHED,
            updatedAt: { gte: new Date(Date.now() - DUEL_REPLAY_WINDOW_MS) },
            OR: [
              { challengerCharacterId: character.id },
              { opponentCharacterId: character.id },
            ],
          },
        ],
      },
      orderBy: { updatedAt: "desc" },
    });
    if (!row) return { lobby, duel: null };
    return { lobby, duel: publicDuelRow(row, character) };
  } catch (error) {
    if (isMissingDuelTable(error)) return { lobby, duel: null };
    throw error;
  }
}

export async function enterArena(userId: number) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  const { engagement, opts } = await farmOptionsFor(userId, character);
  if (character.farmZoneId) stopFarm(blob(character), opts);
  character.arenaMode = true;
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const players = await listArenaPlayers(userId);
  return {
    message: "Entrou na Arena — caça pausada",
    character: { ...publicCharacter(blob(character)), arenaMode: true },
    arena: { inArena: true, minStake: DUEL_MIN_STAKE },
    players: players.players,
    engagement,
  };
}

/**
 * Cancela desafio PENDING do personagem (sem escrow). Sempre permite sair da Arena.
 * Retorna nota opcional para a mensagem.
 */
async function cancelPendingDuelsOnLeave(characterId: string): Promise<string | null> {
  try {
    const pending = await prisma.sinergiaIdleDuel.findMany({
      where: {
        status: DUEL_STATUS.PENDING,
        OR: [{ challengerCharacterId: characterId }, { opponentCharacterId: characterId }],
      },
    });
    if (!pending.length) return null;
    await prisma.sinergiaIdleDuel.updateMany({
      where: {
        id: { in: pending.map((d) => d.id) },
        status: DUEL_STATUS.PENDING,
      },
      data: { status: DUEL_STATUS.CANCELLED },
    });
    return pending.length === 1 ? "desafio cancelado" : `${pending.length} desafios cancelados`;
  } catch (error) {
    if (isMissingDuelTable(error)) return null;
    throw error;
  }
}

export async function leaveArena(userId: number) {
  const character = await loadActive(userId);
  await expireStaleDuelsForCharacter(character.id);
  // Duelo ACTIVE (raro): forfeit com pot antes de sair
  try {
    const active = await prisma.sinergiaIdleDuel.findFirst({
      where: {
        status: DUEL_STATUS.ACTIVE,
        OR: [{ challengerCharacterId: character.id }, { opponentCharacterId: character.id }],
      },
    });
    if (active) {
      await forfeitDuel(userId);
    }
  } catch (error) {
    if (!isMissingDuelTable(error)) throw error;
  }
  const cancelledNote = await cancelPendingDuelsOnLeave(character.id);
  character.arenaMode = false;
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const message = cancelledNote ? `Saiu da Arena (${cancelledNote})` : "Saiu da Arena";
  return {
    message,
    character: { ...publicCharacter(blob(character)), arenaMode: false },
    arena: { inArena: false, minStake: DUEL_MIN_STAKE },
    duel: null,
  };
}

export async function listArenaPlayers(userId: number) {
  const character = await loadActive(userId);
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  const online = await prisma.sinergiaIdleCharacter.findMany({
    where: { lastSeenAt: { gte: cutoff }, isActive: true },
    select: { id: true, name: true, classId: true, level: true, gold: true, state: true, userId: true },
  });
  const players = online
    .filter((row) => row.id !== character.id && row.userId !== userId)
    .map((row) => {
      const state =
        row.state && typeof row.state === "object" && !Array.isArray(row.state)
          ? (row.state as Record<string, unknown>)
          : {};
      return {
        characterId: row.id,
        name: row.name,
        classId: row.classId,
        level: row.level,
        gold: row.gold,
        inArena: Boolean(state.arenaMode),
      };
    });
  return {
    players,
    arena: { inArena: Boolean(character.arenaMode), minStake: DUEL_MIN_STAKE },
    character: { ...publicCharacter(blob(character)), arenaMode: Boolean(character.arenaMode) },
  };
}

export async function challengeDuel(userId: number, opponentCharacterId: string, stakeRaw: unknown) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  if (!character.arenaMode) {
    const error = new Error("Entre na Arena para desafiar");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  await expireStaleDuelsForCharacter(character.id);
  if (await characterHasOpenDuel(character.id)) {
    const error = new Error("Você já tem um duelo pendente");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const oppId = String(opponentCharacterId || "");
  if (!oppId || oppId === character.id) {
    const error = new Error("Oponente inválido");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const oppRow = await prisma.sinergiaIdleCharacter.findUnique({ where: { id: oppId } });
  if (!oppRow || !oppRow.isActive) {
    const error = new Error("Oponente não encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  if (oppRow.userId === userId) {
    const error = new Error("Não pode duelar com outro personagem seu");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const cutoff = new Date(Date.now() - ONLINE_WINDOW_MS);
  if (!oppRow.lastSeenAt || oppRow.lastSeenAt < cutoff) {
    const error = new Error("Oponente offline");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  if (await characterHasOpenDuel(oppId)) {
    const error = new Error("Oponente já está em um duelo");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  const stake = validateStake(stakeRaw, character.gold, oppRow.gold);
  if (character.farmZoneId) {
    const { opts } = await farmOptionsFor(userId, character);
    stopFarm(blob(character), opts);
  }
  character.lastSeenAt = new Date().toISOString();
  await persist(userId, character);

  try {
    const { randomUUID } = await import("crypto");
    const expiresAt = new Date(Date.now() + DUEL_CHALLENGE_TTL_MS);
    const duel = await prisma.sinergiaIdleDuel.create({
      data: {
        id: randomUUID(),
        challengerCharacterId: character.id,
        opponentCharacterId: oppId,
        stake,
        status: DUEL_STATUS.PENDING,
        escrowed: false,
        expiresAt,
      },
    });
    return {
      message: `Desafio enviado a ${oppRow.name} (${stake.toLocaleString("pt-BR")} gold)`,
      duel: publicDuelRow(duel, character, oppRow.name),
      character: { ...publicCharacter(blob(character)), arenaMode: true },
      arena: { inArena: true, minStake: DUEL_MIN_STAKE },
    };
  } catch (error) {
    if (isMissingDuelTable(error)) throw duelTableMissingError();
    throw error;
  }
}

export async function respondDuel(userId: number, duelId: string, accept: boolean) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  await expireStaleDuelsForCharacter(character.id);

  let row;
  try {
    row = await prisma.sinergiaIdleDuel.findUnique({ where: { id: String(duelId || "") } });
  } catch (error) {
    if (isMissingDuelTable(error)) throw duelTableMissingError();
    throw error;
  }
  if (!row) {
    const error = new Error("Duelo não encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }
  if (row.opponentCharacterId !== character.id) {
    const error = new Error("Só o desafiado pode responder");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  if (row.status !== DUEL_STATUS.PENDING) {
    const error = new Error("Este desafio não está mais pendente");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    await prisma.sinergiaIdleDuel.update({
      where: { id: row.id },
      data: { status: DUEL_STATUS.EXPIRED },
    });
    const error = new Error("Desafio expirado");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  if (!accept) {
    const updated = await prisma.sinergiaIdleDuel.update({
      where: { id: row.id },
      data: { status: DUEL_STATUS.DECLINED },
    });
    character.arenaMode = true;
    character.lastSeenAt = new Date().toISOString();
    await persist(userId, character);
    return {
      message: "Desafio recusado",
      duel: publicDuelRow(updated, character),
      character: { ...publicCharacter(blob(character)), arenaMode: true },
    };
  }

  const challengerRow = await prisma.sinergiaIdleCharacter.findUnique({
    where: { id: row.challengerCharacterId },
  });
  if (!challengerRow) {
    const error = new Error("Desafiante não encontrado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const challenger = fromRow(challengerRow);
  const opponent = character;
  const stake = row.stake;

  if (challenger.gold < stake || opponent.gold < stake) {
    await prisma.sinergiaIdleDuel.update({
      where: { id: row.id },
      data: { status: DUEL_STATUS.CANCELLED },
    });
    const error = new Error("Saldo insuficiente para a aposta");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  // Para farms e entra na arena nos dois lados
  {
    const { opts } = await farmOptionsFor(challengerRow.userId, challenger);
    if (challenger.farmZoneId) stopFarm(blob(challenger), opts);
  }
  {
    const { opts } = await farmOptionsFor(userId, opponent);
    if (opponent.farmZoneId) stopFarm(blob(opponent), opts);
  }
  challenger.arenaMode = true;
  opponent.arenaMode = true;

  challenger.gold -= stake;
  opponent.gold -= stake;

  const snapA = snapshotFighter(challenger);
  const snapB = snapshotFighter(opponent);
  const { events, result } = processDuel(snapA, snapB);
  const stored: StoredDuelPayload = {
    ...result,
    challenger: snapA,
    opponent: snapB,
  };

  let winnerCharacterId = result.winnerCharacterId;
  if (result.draw) {
    challenger.gold += stake;
    opponent.gold += stake;
  } else if (winnerCharacterId === challenger.id) {
    challenger.gold += stake * 2;
  } else if (winnerCharacterId === opponent.id) {
    opponent.gold += stake * 2;
  }

  // HP pós-duelo: 50% max se perdeu/empate parcial — só cosmético de idle
  const statsA = computeStats(challenger as never) as { maxHp: number };
  const statsB = computeStats(opponent as never) as { maxHp: number };
  if (result.draw) {
    challenger.currentHp = Math.max(1, Math.floor(statsA.maxHp * 0.5));
    opponent.currentHp = Math.max(1, Math.floor(statsB.maxHp * 0.5));
  } else if (winnerCharacterId === challenger.id) {
    challenger.currentHp = Math.max(1, result.challengerHp || Math.floor(statsA.maxHp * 0.5));
    opponent.currentHp = Math.max(1, Math.floor(statsB.maxHp * 0.5));
  } else {
    opponent.currentHp = Math.max(1, result.opponentHp || Math.floor(statsB.maxHp * 0.5));
    challenger.currentHp = Math.max(1, Math.floor(statsA.maxHp * 0.5));
  }

  challenger.lastSeenAt = new Date().toISOString();
  opponent.lastSeenAt = new Date().toISOString();

  const updated = await prisma.$transaction(async (tx) => {
    await tx.sinergiaIdleCharacter.update({
      where: { id: challenger.id },
      data: {
        gold: challenger.gold,
        level: challenger.level,
        experience: challenger.experience,
        state: asJson(challenger),
        lastSeenAt: new Date(),
      },
    });
    await tx.sinergiaIdleCharacter.update({
      where: { id: opponent.id },
      data: {
        gold: opponent.gold,
        level: opponent.level,
        experience: opponent.experience,
        state: asJson(opponent),
        lastSeenAt: new Date(),
      },
    });
    return tx.sinergiaIdleDuel.update({
      where: { id: row.id },
      data: {
        status: DUEL_STATUS.FINISHED,
        escrowed: true,
        winnerCharacterId,
        events: events as unknown as Prisma.InputJsonValue,
        result: stored as unknown as Prisma.InputJsonValue,
      },
    });
  });

  const msg = result.draw
    ? `Empate — apostas devolvidas (${stake.toLocaleString("pt-BR")} gold)`
    : winnerCharacterId === opponent.id
      ? `Vitória! +${(stake * 2).toLocaleString("pt-BR")} gold`
      : `Derrota — perdeu ${stake.toLocaleString("pt-BR")} gold`;

  return {
    message: msg,
    duel: publicDuelRow(updated, opponent),
    character: { ...publicCharacter(blob(opponent)), arenaMode: true },
    arena: { inArena: true, minStake: DUEL_MIN_STAKE },
  };
}

export async function forfeitDuel(userId: number) {
  await ensureCatalogLoaded();
  const character = await loadActive(userId);
  let row;
  try {
    row = await prisma.sinergiaIdleDuel.findFirst({
      where: {
        status: { in: [...OPEN_DUEL_STATUSES] },
        OR: [{ challengerCharacterId: character.id }, { opponentCharacterId: character.id }],
      },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    if (isMissingDuelTable(error)) throw duelTableMissingError();
    throw error;
  }
  if (!row) {
    const error = new Error("Nenhum duelo para abandonar");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  if (row.status === DUEL_STATUS.PENDING) {
    const updated = await prisma.sinergiaIdleDuel.update({
      where: { id: row.id },
      data: { status: DUEL_STATUS.CANCELLED },
    });
    return {
      message: "Desafio cancelado",
      duel: publicDuelRow(updated, character),
      character: { ...publicCharacter(blob(character)), arenaMode: Boolean(character.arenaMode) },
      arena: { inArena: Boolean(character.arenaMode), minStake: DUEL_MIN_STAKE },
    };
  }

  // ACTIVE: adversário leva o pot (escrow já debitado)
  const foeId =
    row.challengerCharacterId === character.id ? row.opponentCharacterId : row.challengerCharacterId;
  const foeRow = await prisma.sinergiaIdleCharacter.findUnique({ where: { id: foeId } });
  if (row.escrowed && foeRow) {
    const pot = row.stake * 2;
    const foe = fromRow(foeRow);
    foe.gold += pot;
    foe.lastSeenAt = new Date().toISOString();
    await prisma.sinergiaIdleCharacter.update({
      where: { id: foe.id },
      data: { gold: foe.gold, state: asJson(foe), lastSeenAt: new Date() },
    });
  }
  const updated = await prisma.sinergiaIdleDuel.update({
    where: { id: row.id },
    data: {
      status: DUEL_STATUS.FINISHED,
      winnerCharacterId: foeId,
      result: {
        winnerCharacterId: foeId,
        draw: false,
        reason: "forfeit",
        ticks: 0,
        durationMs: 0,
        challengerHp: 0,
        opponentHp: 0,
      } as unknown as Prisma.InputJsonValue,
    },
  });
  return {
    message: "Duelo abandonado — adversário ficou com o pot",
    duel: publicDuelRow(updated, character),
    character: { ...publicCharacter(blob(character)), arenaMode: Boolean(character.arenaMode) },
    arena: { inArena: Boolean(character.arenaMode), minStake: DUEL_MIN_STAKE },
  };
}

export function httpStatus(error: unknown): number {
  const status = (error as { status?: number })?.status;
  return typeof status === "number" ? status : 400;
}

export function errorMessage(error: unknown): string {
  if (isMissingCatalogTable(error)) {
    return catalogTableMissingError().message;
  }
  if (isMissingEngagementEventsTable(error)) {
    return engagementEventsTableMissingError().message;
  }
  if (isMissingDuelTable(error)) {
    return duelTableMissingError().message;
  }
  const missing = prismaMissingTableName(error);
  if (missing === "__unknown__") {
    return "Tabela do Sinergia IDLE ausente no banco. Rode prisma migrate deploy (via update.sh ou docker exec) e reinicie o app.";
  }
  if (missing) {
    return `Tabela ${missing} ausente. Aplique as migrations do Sinergia IDLE (prisma migrate deploy) e reinicie o app.`;
  }
  return error instanceof Error ? error.message : "Erro interno";
}
