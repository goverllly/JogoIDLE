// @ts-nocheck
/**
 * Admin Studio — APIs locais (sem Prisma / gate SinergIA).
 */
import { randomUUID } from "node:crypto";
import {
  addCharacterGold,
  ensureAttributeEconomy,
  publicCharacter,
  setCharacterLevel,
} from "../lib/sinergia-idle/game/character";
import { processFarm } from "../lib/sinergia-idle/game/combat";
import {
  getZoneOverrides,
  refreshZones,
  setZoneOverrides,
  ZONES,
} from "../lib/sinergia-idle/game/data";
import { getBalance, getBalanceOverrides, setBalanceOverrides } from "../lib/sinergia-idle/game/balance";
import {
  getGameMaintenance,
  publicGameMaintenance,
  setGameMaintenance,
} from "../lib/sinergia-idle/game/maintenance";
import { unlockCosmetic } from "../lib/sinergia-idle/game/cosmetics";
import { ensureGear, addItem, clearInventory } from "../lib/sinergia-idle/game/inventory";
import {
  catalogMeta,
  createItem,
  deleteTemplate,
  getCatalogStateSnapshot,
  listCatalog,
  merchantMeta,
  RARITIES,
  resetTemplate,
  setAttrResetPrice,
  setBagUpgradePrice,
  setDropChance,
  setEngagementEvent,
  setMerchantOffersEnabled,
  setPetCatPrice,
  setPetDogPrice,
  setPetParrotPrice,
  setRefinerPrice,
  upsertTemplate,
} from "../lib/sinergia-idle/game/items";
import { monsterVisualMeta, sanitizeMonsterVisualId } from "../lib/sinergia-idle/game/monster-visuals";
import { sanitizeZoneScene } from "../lib/sinergia-idle/game/zone-scene";
import { simulateFarmFight } from "../lib/sinergia-idle/admin-simulate";
import { listSinergiaIdleAdminEmails, isSinergiaIdleAdmin } from "../lib/sinergia-idle/admin";
import { getWorldSnapshot } from "../lib/sinergia-idle/content";
import {
  createEmptyHudDocument,
  findHudHistoryRevision,
  getHudDraft,
  getHudHistory,
  getHudPublished,
  pushHudHistory,
  sanitizeHudLayoutDocument,
  setHudDraft,
  setHudPublished,
} from "../lib/sinergia-idle/hud-layout";
import { HUD_COMPONENTS } from "../lib/sinergia-idle/hud-registry";
import {
  LOCAL_USER_EMAIL,
  LOCAL_USER_ID,
  ensureCatalogLoaded,
  getCatalogRevision,
  errorMessage,
  httpStatus,
} from "./local-service";
import { store } from "./store";

const DB_UPDATED_AT = "__dbUpdatedAt";

function blob(character) {
  return character;
}

function asJson(character) {
  const copy = { ...character };
  delete copy[DB_UPDATED_AT];
  return JSON.parse(JSON.stringify(copy));
}

function fromRow(row) {
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

async function writeCatalogState(raw) {
  const snap = {
    dropChance: Number(raw.dropChance) || 0.11,
    deletedIds: Array.isArray(raw.deletedIds) ? raw.deletedIds : [],
    overrides: raw.overrides && typeof raw.overrides === "object" ? raw.overrides : {},
    updatedAt: new Date().toISOString(),
  };
  store.setCatalog(snap);
}

function adminCatalogMetaPayload() {
  return { ...catalogMeta(), monsterVisuals: monsterVisualMeta() };
}

function listMetaZones() {
  return ZONES.map((zone) => {
    const scene = zone.scene && typeof zone.scene === "object" ? zone.scene : null;
    return {
      id: zone.id,
      name: zone.name,
      description: zone.description,
      minLevel: zone.minLevel,
      tier: zone.tier,
      requiresAscension: zone.requiresAscension || null,
      mortalOnly: Boolean(zone.mortalOnly),
      dropChance: zone.dropChance,
      bossWaveSize: zone.bossWaveSize,
      scene,
      monsters: zone.monsters,
      boss: zone.boss,
    };
  });
}

export function assertIdleAdmin(email = LOCAL_USER_EMAIL) {
  if (!isSinergiaIdleAdmin(email)) {
    const error = new Error("Apenas o admin do Sinergia IDLE pode fazer isso");
    error.status = 403;
    throw error;
  }
}

export { assertIdleAdmin as assertIdleAdminExport };

async function persist(userId, character) {
  const expected = character[DB_UPDATED_AT];
  const statePayload = { ...character };
  delete statePayload[DB_UPDATED_AT];
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
  );
  character[DB_UPDATED_AT] = row.updatedAt;
  return character;
}

async function farmOptionsFor(userId, character) {
  return {
    engagement: { xpMult: 1, goldMult: 1, dropMult: 1 },
    opts: { xpMult: 1, goldMult: 1, dropMult: 1 },
  };
}

function loadCharacterForAdmin(characterId) {
  const row = store.findCharacter(String(characterId));
  if (!row) {
    const error = new Error("Personagem não encontrado");
    error.status = 404;
    throw error;
  }
  return { character: fromRow(row), ownerUserId: row.userId };
}

function recordAdminAction(email, action, summary, payload) {
  store.pushAdminAction({
    id: randomUUID(),
    at: new Date().toISOString(),
    adminEmail: String(email || "").slice(0, 191),
    action: String(action).slice(0, 32),
    summary: String(summary || "").slice(0, 255),
    payload: payload || null,
  });
}

export async function adminListActiveCharacters(email = LOCAL_USER_EMAIL) {
  assertIdleAdmin(email);
  return store.listActiveCharacters().map((row) => {
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
}

export async function adminMetaPayload() {
  await ensureCatalogLoaded();
  return {
    adminCatalog: listCatalog(),
    adminCatalogMeta: adminCatalogMetaPayload(),
    adminActiveCharacters: await adminListActiveCharacters(LOCAL_USER_EMAIL),
    adminBalance: getBalance(),
    adminBalanceOverrides: getBalanceOverrides(),
    adminZoneOverrides: getZoneOverrides(),
    adminEmails: listSinergiaIdleAdminEmails(),
  };
}

export async function adminGrantItem(userId, email, input) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  let character;
  let ownerUserId = userId;
  if (input.characterId) {
    const loaded = loadCharacterForAdmin(String(input.characterId));
    character = loaded.character;
    ownerUserId = loaded.ownerUserId;
  } else {
    const row = store.findActive(userId);
    if (!row) {
      const error = new Error("Crie ou selecione um personagem");
      error.status = 404;
      throw error;
    }
    character = fromRow(row);
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
  recordAdminAction(email, "grant", message, {
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

export async function adminUpsertCatalogItem(userId, email, input) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const creating = Boolean(input.creating ?? !input.id);
  const template = upsertTemplate(input, { creating, persist: false });
  await writeCatalogState(getCatalogStateSnapshot());
  const shouldGrant = input.grant !== false;
  if (!shouldGrant) {
    const message = creating ? "Item criado no catálogo" : "Item atualizado no catálogo";
    recordAdminAction(email, "catalog", `${message}: ${template.id}`, {
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
  recordAdminAction(email, "catalog", `Catálogo + grant: ${template.id}`, {
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

export async function adminDeleteCatalogItem(email, templateId) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  deleteTemplate(String(templateId || ""), { persist: false });
  await writeCatalogState(getCatalogStateSnapshot());
  recordAdminAction(email, "catalog_delete", `Item removido: ${templateId}`, { templateId });
  return {
    message: "Item removido do catálogo",
    catalog: listCatalog(),
    catalogMeta: adminCatalogMetaPayload(),
  };
}

export async function adminResetCatalogItem(email, templateId) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const template = resetTemplate(String(templateId || ""), { persist: false });
  await writeCatalogState(getCatalogStateSnapshot());
  recordAdminAction(email, "catalog_reset", `Item restaurado: ${templateId}`, { templateId });
  return {
    message: "Item restaurado ao original",
    template,
    catalog: listCatalog(),
    catalogMeta: adminCatalogMetaPayload(),
  };
}

export async function adminUpdateConfig(email, input) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  if (input.dropChance != null) setDropChance(input.dropChance, { persist: false });
  if (input.bagUpgradePrice != null) setBagUpgradePrice(input.bagUpgradePrice, { persist: false });
  if (input.refinerPrice != null) setRefinerPrice(input.refinerPrice, { persist: false });
  if (input.attrResetPrice != null) setAttrResetPrice(input.attrResetPrice, { persist: false });
  if (input.petDogPrice != null) setPetDogPrice(input.petDogPrice, { persist: false });
  if (input.petCatPrice != null) setPetCatPrice(input.petCatPrice, { persist: false });
  if (input.petParrotPrice != null) setPetParrotPrice(input.petParrotPrice, { persist: false });
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
              input.maintenance?.message != null ? String(input.maintenance.message) : undefined,
          };
    setGameMaintenance(patch);
  }
  if (input.zone?.id) {
    const all = { ...(getZoneOverrides() || {}) };
    if (input.zone.clear) {
      delete all[input.zone.id];
    } else {
      const prev = all[input.zone.id] || {};
      const next = {
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
                const m = raw && typeof raw === "object" ? raw : {};
                const visualId = sanitizeMonsterVisualId(m.visualId);
                return { ...m, ...(visualId ? { visualId } : { visualId: undefined }) };
              }),
            }
          : {}),
      };
      if (input.zone.boss !== undefined) {
        if (input.zone.boss === null) {
          delete next.boss;
        } else if (input.zone.boss && typeof input.zone.boss === "object") {
          const visualId = sanitizeMonsterVisualId(input.zone.boss.visualId);
          next.boss = { ...input.zone.boss, ...(visualId ? { visualId } : {}) };
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
          if (Number.isFinite(n) && n >= 1) next.bossWaveSize = Math.min(200, n);
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
  const bits = [];
  if (input.dropChance != null) bits.push("drop");
  if (input.bagUpgradePrice != null || input.refinerPrice != null || input.attrResetPrice != null) {
    bits.push("mercador");
  }
  if (input.engagementEvent !== undefined) bits.push("evento");
  if (input.balance !== undefined) bits.push("balance");
  if (input.zone?.id) bits.push(`zona:${input.zone.id}`);
  if (input.maintenance !== undefined) {
    bits.push(getGameMaintenance().enabled ? "manutenção ligada" : "manutenção desligada");
  }
  recordAdminAction(
    email,
    "config",
    bits.length ? `Config: ${bits.join(", ")}` : "Configuração atualizada",
    { zoneId: input.zone?.id, dropChance: input.dropChance },
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
    zones: listMetaZones(),
    maintenance,
  };
}

export async function adminUpdateActiveCharacter(userId, email, input) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  let character;
  let ownerUserId = userId;
  if (input.characterId) {
    const loaded = loadCharacterForAdmin(String(input.characterId));
    character = loaded.character;
    ownerUserId = loaded.ownerUserId;
  } else {
    const row = store.findActive(userId);
    if (!row) {
      const error = new Error("Crie ou selecione um personagem");
      error.status = 404;
      throw error;
    }
    character = fromRow(row);
  }
  {
    const { opts } = await farmOptionsFor(ownerUserId, character);
    processFarm(blob(character), Date.now(), opts);
  }
  ensureGear(blob(character));
  ensureAttributeEconomy(blob(character));
  const notes = [];

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
  recordAdminAction(email, "character", message, {
    characterId: character.id,
    characterName: character.name,
  });
  return {
    message,
    character: publicCharacter(blob(character)),
    adminActiveCharacters: await adminListActiveCharacters(email),
  };
}

export async function adminDeleteCharacter(email, characterId) {
  assertIdleAdmin(email);
  const row = store.findCharacter(String(characterId));
  if (!row) {
    const error = new Error("Personagem não encontrado");
    error.status = 404;
    throw error;
  }
  store.deleteCharacter(row.userId, row.id);
  recordAdminAction(email, "character_delete", `Personagem removido: ${row.name}`, {
    characterId: row.id,
  });
  return {
    message: `Personagem ${row.name} removido`,
    adminActiveCharacters: await adminListActiveCharacters(email),
  };
}

export async function listAdminActions(email, limit = 50) {
  assertIdleAdmin(email);
  const take = Math.max(1, Math.min(100, Math.floor(Number(limit) || 50)));
  return { actions: store.listAdminActions(take) };
}

export async function getAdminEngagementMetrics(email) {
  assertIdleAdmin(email);
  return {
    metrics: {
      claimsTotal: 0,
      uniqueClaimers: 0,
      note: "Missões SinergIA desligadas neste standalone.",
    },
  };
}

export async function adminSimulate(email, body) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const hero = body.hero && typeof body.hero === "object" ? body.hero : {};
  const result = simulateFarmFight({
    zoneId: String(body.zoneId || ""),
    monsterKey: body.monsterKey ?? 0,
    hero: {
      level: Number(hero.level) || 1,
      attack: Number(hero.attack) || 10,
      defense: Number(hero.defense) || 3,
      maxHp: Number(hero.maxHp) || 100,
      intervalMs: hero.intervalMs != null ? Number(hero.intervalMs) : undefined,
    },
    iterations: body.iterations != null ? Number(body.iterations) : undefined,
  });
  return { simulation: result };
}

export async function adminWorldSnapshot(email) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const snapshot = getWorldSnapshot({
    catalogRevision: null,
  });
  snapshot.revision.updatedAt = String(getCatalogRevision() || snapshot.revision.updatedAt);
  snapshot.revision.catalogRevision = null;
  return { snapshot };
}

export async function adminEndSeason(email, body) {
  assertIdleAdmin(email);
  if (!body?.confirm) {
    const error = new Error("Confirme o fim da temporada (confirm: true)");
    error.status = 400;
    throw error;
  }
  recordAdminAction(email, "season_end", "Fim de temporada (stub standalone)", {
    notes: body.notes,
    nextLabel: body.nextLabel,
  });
  return {
    message: "Temporada/reset não habilitado neste standalone — ação só registrada na auditoria.",
    seasons: [],
  };
}

/** Layout publicado — consumido pelo runtime do play (sem gate admin). */
export async function getPublishedHudLayout() {
  await ensureCatalogLoaded();
  return { layout: getHudPublished() };
}

export async function adminGetHudLayout(email) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const draft = getHudDraft();
  const published = getHudPublished();
  return {
    draft: draft || createEmptyHudDocument(email, "draft"),
    published,
    publishedRevision: published?.revision ?? null,
    history: getHudHistory().map((h) => ({
      revision: h.revision,
      name: h.name,
      status: h.status,
      updatedAt: h.updatedAt,
      updatedBy: h.updatedBy,
    })),
    registry: HUD_COMPONENTS,
    catalogRevision: getCatalogRevision(),
  };
}

export async function adminSaveHudDraft(email, body) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const doc = sanitizeHudLayoutDocument(body?.layout ?? body, email);
  if (!doc) {
    const error = new Error("Layout inválido");
    error.status = 400;
    throw error;
  }
  const published = getHudPublished();
  doc.status = "draft";
  doc.updatedAt = new Date().toISOString();
  doc.updatedBy = String(email || "").slice(0, 191);
  doc.revision = published?.revision ?? doc.revision ?? 0;
  if (published) doc.basedOnRevision = published.revision;
  setHudDraft(doc);
  await writeCatalogState(getCatalogStateSnapshot());
  recordAdminAction(email, "hud_draft", `HUD rascunho salvo: ${doc.name}`, {
    layoutId: doc.layoutId,
    componentCount: Object.keys(doc.components || {}).length,
  });
  return {
    message: "Rascunho da HUD salvo",
    draft: getHudDraft(),
    publishedRevision: published?.revision ?? null,
  };
}

export async function adminPublishHudLayout(email) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  const draft = getHudDraft();
  if (!draft) {
    const error = new Error("Nenhum rascunho para publicar");
    error.status = 400;
    throw error;
  }
  const prev = getHudPublished();
  if (prev) pushHudHistory(prev);
  const next = structuredClone(draft);
  next.status = "published";
  next.revision = (prev?.revision ?? 0) + 1;
  next.updatedAt = new Date().toISOString();
  next.updatedBy = String(email || "").slice(0, 191);
  setHudPublished(next);
  setHudDraft({ ...structuredClone(next), status: "draft" });
  await writeCatalogState(getCatalogStateSnapshot());
  recordAdminAction(email, "hud_publish", `HUD publicada rev ${next.revision}`, {
    revision: next.revision,
    layoutId: next.layoutId,
  });
  return {
    message: `HUD publicada (rev ${next.revision})`,
    published: getHudPublished(),
    draft: getHudDraft(),
  };
}

export async function adminRestoreHudLayout(email, body) {
  assertIdleAdmin(email);
  await ensureCatalogLoaded();
  if (body?.toDefault) {
    setHudDraft(createEmptyHudDocument(email, "draft"));
    await writeCatalogState(getCatalogStateSnapshot());
    recordAdminAction(email, "hud_restore", "HUD rascunho restaurado ao padrão", {});
    return {
      message: "Rascunho restaurado ao layout padrão",
      draft: getHudDraft(),
      published: getHudPublished(),
    };
  }
  const revision = Number(body?.revision);
  if (!Number.isFinite(revision)) {
    const error = new Error("Informe revision ou toDefault");
    error.status = 400;
    throw error;
  }
  const hit = findHudHistoryRevision(revision);
  if (!hit) {
    const error = new Error("Revisão não encontrada");
    error.status = 404;
    throw error;
  }
  const draft = structuredClone(hit);
  draft.status = "draft";
  draft.updatedAt = new Date().toISOString();
  draft.updatedBy = String(email || "").slice(0, 191);
  setHudDraft(draft);
  await writeCatalogState(getCatalogStateSnapshot());
  recordAdminAction(email, "hud_restore", `HUD rascunho restaurado da rev ${revision}`, {
    revision,
  });
  return {
    message: `Rascunho restaurado da rev ${revision}`,
    draft: getHudDraft(),
    published: getHudPublished(),
  };
}

export { errorMessage, httpStatus, LOCAL_USER_EMAIL, LOCAL_USER_ID };
