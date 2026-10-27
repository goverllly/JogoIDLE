// @ts-nocheck
/**
 * Galeria da Fama — estatísticas históricas por personagem.
 * lifetime permanente; buckets season/year/day; imported ≠ coleta detalhada.
 * Fontes: farm (ativo) | duel | arena (stubs tipados).
 */

import { currentSeasonIdentity } from "../season";
import { ensureCareer } from "./career";

export const JOURNEY_SCHEMA_VERSION = 1;
export const JOURNEY_DAY_RETENTION = 90;

export const JOURNEY_RARITIES = ["common", "uncommon", "rare", "epic", "legendary"];

/** Campos career com equivalência comprovada → imported (não classificados por origem). */
export const CAREER_IMPORT_FIELDS = {
  kills: "kills",
  bossKills: "bossKills",
  goldEarned: "goldEarnedUnclassified",
  goldSpent: "goldSpentUnclassified",
  itemsBought: "itemsBought",
  playMs: "playMs",
};

export function emptyByRarity() {
  return Object.fromEntries(JOURNEY_RARITIES.map((r) => [r, 0]));
}

export function emptyJourneyTotals() {
  return {
    kills: 0,
    bossKills: 0,
    faints: 0,
    battlesStarted: 0,
    battlesWon: 0,
    battlesLost: 0,
    damageDealt: 0,
    damageTaken: 0,
    crits: 0,
    skillUses: 0,
    potionUses: 0,
    goldEarnedCombat: 0,
    goldEarnedSell: 0,
    goldSpentMerchant: 0,
    goldSpentRitual: 0,
    goldSpentOther: 0,
    maxGoldReward: 0,
    itemsFound: 0,
    byRarity: emptyByRarity(),
    itemsSold: 0,
    itemsBought: 0,
    refineSuccess: 0,
    refineFail: 0,
    playMs: 0,
    combatMs: 0,
    offlineMs: 0,
    xpEarned: 0,
    maxLevelReached: 0,
    ascensions: 0,
    zonesVisited: [],
    firstBoss: null,
  };
}

export function emptyJourneyImported() {
  return {
    source: "career",
    importedAt: null,
    kills: 0,
    bossKills: 0,
    goldEarnedUnclassified: 0,
    goldSpentUnclassified: 0,
    itemsBought: 0,
    playMs: 0,
  };
}

export function emptyPersonalRecords() {
  return {
    fastestWin: null,
    longestWin: null,
    fastestBoss: null,
    longestBoss: null,
    maxDamageHit: null,
    maxDamageBattle: null,
    maxDamageTakenBattle: null,
  };
}

export function emptyJourneyDayDelta() {
  return {
    kills: 0,
    bossKills: 0,
    faints: 0,
    goldEarnedCombat: 0,
    goldEarnedSell: 0,
    goldSpentMerchant: 0,
    goldSpentRitual: 0,
    goldSpentOther: 0,
    itemsFound: 0,
    playMs: 0,
    combatMs: 0,
    offlineMs: 0,
    xpEarned: 0,
  };
}

function floorNonNeg(n) {
  const v = Math.floor(Number(n) || 0);
  return Number.isFinite(v) && v > 0 ? v : 0;
}

function normalizeTotals(raw) {
  const t = emptyJourneyTotals();
  if (!raw || typeof raw !== "object") return t;
  for (const key of Object.keys(t)) {
    if (key === "byRarity" || key === "zonesVisited" || key === "firstBoss") continue;
    const n = Math.floor(Number(raw[key]) || 0);
    t[key] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  t.byRarity = emptyByRarity();
  if (raw.byRarity && typeof raw.byRarity === "object") {
    for (const r of JOURNEY_RARITIES) {
      const n = Math.floor(Number(raw.byRarity[r]) || 0);
      t.byRarity[r] = Number.isFinite(n) && n >= 0 ? n : 0;
    }
  }
  t.zonesVisited = Array.isArray(raw.zonesVisited)
    ? [...new Set(raw.zonesVisited.map((z) => String(z)).filter(Boolean))]
    : [];
  if (raw.firstBoss && typeof raw.firstBoss === "object") {
    t.firstBoss = {
      name: raw.firstBoss.name != null ? String(raw.firstBoss.name) : null,
      zoneId: raw.firstBoss.zoneId != null ? String(raw.firstBoss.zoneId) : null,
      at: typeof raw.firstBoss.at === "string" ? raw.firstBoss.at : null,
    };
  } else {
    t.firstBoss = null;
  }
  return t;
}

function normalizeImported(raw) {
  const i = emptyJourneyImported();
  if (!raw || typeof raw !== "object") return i;
  i.source = raw.source === "career" ? "career" : String(raw.source || "career");
  i.importedAt = typeof raw.importedAt === "string" ? raw.importedAt : null;
  for (const k of [
    "kills",
    "bossKills",
    "goldEarnedUnclassified",
    "goldSpentUnclassified",
    "itemsBought",
    "playMs",
  ]) {
    const n = Math.floor(Number(raw[k]) || 0);
    i[k] = Number.isFinite(n) && n >= 0 ? n : 0;
  }
  return i;
}

function normalizeRecordEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const value = Number(raw.value);
  if (!Number.isFinite(value)) return null;
  return {
    value,
    enemyName: raw.enemyName != null ? String(raw.enemyName) : null,
    zoneId: raw.zoneId != null ? String(raw.zoneId) : null,
    at: typeof raw.at === "string" ? raw.at : null,
    durationMs:
      raw.durationMs != null && Number.isFinite(Number(raw.durationMs))
        ? Math.max(0, Math.floor(Number(raw.durationMs)))
        : null,
    isBoss: Boolean(raw.isBoss),
    characterName: raw.characterName != null ? String(raw.characterName) : null,
  };
}

function normalizeRecords(raw) {
  const r = emptyPersonalRecords();
  if (!raw || typeof raw !== "object") return r;
  for (const key of Object.keys(r)) {
    r[key] = normalizeRecordEntry(raw[key]);
  }
  return r;
}

function utcDayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function utcYearKey(date = new Date()) {
  return String(date.getUTCFullYear());
}

export function defaultSeasonKey(date = new Date()) {
  return currentSeasonIdentity(date).slug;
}

function pruneDays(days, now = new Date()) {
  const out = {};
  if (!days || typeof days !== "object") return out;
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - JOURNEY_DAY_RETENTION);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  for (const [key, val] of Object.entries(days)) {
    if (typeof key !== "string" || key < cutoffKey) continue;
    const d = emptyJourneyDayDelta();
    if (val && typeof val === "object") {
      for (const k of Object.keys(d)) {
        const n = Math.floor(Number(val[k]) || 0);
        d[k] = Number.isFinite(n) && n >= 0 ? n : 0;
      }
    }
    out[key] = d;
  }
  return out;
}

function seedImportedFromCareer(character, nowIso) {
  const career = ensureCareer(character);
  const imported = emptyJourneyImported();
  imported.importedAt = nowIso;
  imported.source = "career";
  for (const [careerKey, importKey] of Object.entries(CAREER_IMPORT_FIELDS)) {
    const n = Math.floor(Number(career[careerKey]) || 0);
    if (n > 0) imported[importKey] = n;
  }
  return imported;
}

/**
 * Garante journey no personagem. Seed idempotente a partir de career
 * (ouro/gasto como Unclassified — nunca como combate/mercador).
 */
export function ensureJourney(character, { now = new Date(), seasonKey } = {}) {
  const nowIso = now.toISOString();
  const sk = seasonKey || defaultSeasonKey(now);

  if (!character.journey || typeof character.journey !== "object") {
    const imported = seedImportedFromCareer(character, nowIso);
    character.journey = {
      schemaVersion: JOURNEY_SCHEMA_VERSION,
      collectionStartedAt: nowIso,
      privacy: { hideFromPublicRankings: false },
      imported,
      lifetime: emptyJourneyTotals(),
      seasons: { [sk]: emptyJourneyTotals() },
      years: { [utcYearKey(now)]: emptyJourneyTotals() },
      days: {},
      records: emptyPersonalRecords(),
      meta: {
        lastOfflineCatchUpId: null,
        pendingOfflineCatchUpId: null,
        activeSeasonKey: sk,
        encounter: null,
      },
    };
    const level = Math.floor(Number(character.level) || 0);
    if (level > 0) {
      character.journey.lifetime.maxLevelReached = level;
      character.journey.seasons[sk].maxLevelReached = level;
    }
    return character.journey;
  }

  const j = character.journey;
  j.schemaVersion = JOURNEY_SCHEMA_VERSION;
  if (!j.collectionStartedAt) j.collectionStartedAt = nowIso;
  if (!j.privacy || typeof j.privacy !== "object") j.privacy = { hideFromPublicRankings: false };
  j.privacy.hideFromPublicRankings = Boolean(j.privacy.hideFromPublicRankings);
  j.imported = normalizeImported(j.imported);
  if (!j.imported.importedAt) {
    j.imported = seedImportedFromCareer(character, nowIso);
  }
  j.lifetime = normalizeTotals(j.lifetime);
  if (!j.seasons || typeof j.seasons !== "object") j.seasons = {};
  for (const key of Object.keys(j.seasons)) {
    j.seasons[key] = normalizeTotals(j.seasons[key]);
  }
  if (!j.seasons[sk]) j.seasons[sk] = emptyJourneyTotals();
  if (!j.years || typeof j.years !== "object") j.years = {};
  for (const key of Object.keys(j.years)) {
    j.years[key] = normalizeTotals(j.years[key]);
  }
  const yk = utcYearKey(now);
  if (!j.years[yk]) j.years[yk] = emptyJourneyTotals();
  j.days = pruneDays(j.days, now);
  j.records = normalizeRecords(j.records);
  if (!j.meta || typeof j.meta !== "object") j.meta = {};
  if (j.meta.lastOfflineCatchUpId === undefined) j.meta.lastOfflineCatchUpId = null;
  if (j.meta.pendingOfflineCatchUpId === undefined) j.meta.pendingOfflineCatchUpId = null;
  if (!j.meta.activeSeasonKey) j.meta.activeSeasonKey = sk;
  return j;
}

function bumpTotals(t, patch) {
  if (!t || !patch) return;
  for (const [key, delta] of Object.entries(patch)) {
    if (key === "byRarity" && patch.byRarity && typeof patch.byRarity === "object") {
      if (!t.byRarity) t.byRarity = emptyByRarity();
      for (const [r, d] of Object.entries(patch.byRarity)) {
        if (!JOURNEY_RARITIES.includes(r)) continue;
        t.byRarity[r] = (t.byRarity[r] || 0) + floorNonNeg(d);
      }
      continue;
    }
    if (key === "maxGoldReward" || key === "maxLevelReached") {
      const v = Math.floor(Number(delta) || 0);
      if (v > (t[key] || 0)) t[key] = v;
      continue;
    }
    if (key === "zonesVisited" || key === "firstBoss") continue;
    if (!(key in t)) continue;
    t[key] = (t[key] || 0) + floorNonNeg(delta);
  }
}

function bumpDay(j, now, patch) {
  const key = utcDayKey(now);
  if (!j.days[key]) j.days[key] = emptyJourneyDayDelta();
  const d = j.days[key];
  for (const [k, delta] of Object.entries(patch)) {
    if (!(k in d)) continue;
    d[k] = (d[k] || 0) + floorNonNeg(delta);
  }
}

/**
 * Aplica um patch de totais em lifetime + season ativa + year + day.
 * Não grava I/O — só muta o blob do personagem.
 */
export function applyJourneyPatch(character, patch, { now = new Date(), seasonKey } = {}) {
  if (!patch || typeof patch !== "object") return null;
  const j = ensureJourney(character, { now, seasonKey });
  const sk = seasonKey || j.meta.activeSeasonKey || defaultSeasonKey(now);
  if (!j.seasons[sk]) j.seasons[sk] = emptyJourneyTotals();
  j.meta.activeSeasonKey = sk;
  const yk = utcYearKey(now);
  if (!j.years[yk]) j.years[yk] = emptyJourneyTotals();

  bumpTotals(j.lifetime, patch);
  bumpTotals(j.seasons[sk], patch);
  bumpTotals(j.years[yk], patch);
  bumpDay(j, now, patch);
  j.days = pruneDays(j.days, now);
  accumulateFameDelta(character, patch);
  return j;
}

/**
 * Delta pendente para agregados fame — consumido no mesmo save do personagem.
 * Evita I/O por tick; só memória até persist().
 */
export function accumulateFameDelta(character, patch) {
  if (!patch || typeof patch !== "object") return;
  if (!character._fameDelta || typeof character._fameDelta !== "object") {
    character._fameDelta = {};
  }
  const d = character._fameDelta;
  for (const [key, val] of Object.entries(patch)) {
    if (key === "byRarity" && val && typeof val === "object") {
      if (!d.byRarity) d.byRarity = {};
      for (const [r, n] of Object.entries(val)) {
        d.byRarity[r] = (d.byRarity[r] || 0) + floorNonNeg(n);
      }
      continue;
    }
    if (key === "maxGoldReward" || key === "maxLevelReached") {
      const v = Math.floor(Number(val) || 0);
      if (v > (d[key] || 0)) d[key] = v;
      continue;
    }
    d[key] = (d[key] || 0) + floorNonNeg(val);
  }
}

export function takeFameDelta(character) {
  const delta = character._fameDelta && typeof character._fameDelta === "object"
    ? character._fameDelta
    : null;
  delete character._fameDelta;
  return delta;
}

/** Fontes tipadas; duel/arena reservados (no-op até integração). */
export const JOURNEY_SOURCES = ["farm", "duel", "arena"];

function maybeUpdateRecord(j, key, value, ctx, mode) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return;
  const cur = j.records[key];
  const better =
    !cur || (mode === "min" && v < cur.value) || (mode === "max" && v > cur.value);
  if (!better) return;
  j.records[key] = {
    value: v,
    enemyName: ctx.enemyName ?? null,
    zoneId: ctx.zoneId ?? null,
    at: ctx.at ?? null,
    durationMs: ctx.durationMs ?? null,
    isBoss: Boolean(ctx.isBoss),
    characterName: ctx.characterName ?? null,
  };
}

/**
 * Evento de estatística. Retorna false se ignorado (fonte stub / idempotência).
 */
export function applyJourneyEvent(character, event) {
  if (!event || typeof event !== "object") return false;
  const source = event.source || "farm";
  if (source === "duel" || source === "arena") {
    return false;
  }
  if (source !== "farm") return false;

  const now = event.at ? new Date(event.at) : new Date();
  const nowIso = now.toISOString();
  const j = ensureJourney(character, { now, seasonKey: event.seasonKey });

  switch (event.type) {
    case "offline_catchup_begin": {
      const id = event.catchUpId != null ? String(event.catchUpId) : null;
      if (!id) return false;
      if (j.meta.lastOfflineCatchUpId === id) return false;
      j.meta.pendingOfflineCatchUpId = id;
      return true;
    }
    case "offline_catchup_commit": {
      const id =
        event.catchUpId != null ? String(event.catchUpId) : j.meta.pendingOfflineCatchUpId;
      if (!id) return false;
      if (j.meta.lastOfflineCatchUpId === id) return false;
      j.meta.lastOfflineCatchUpId = id;
      j.meta.pendingOfflineCatchUpId = null;
      // offlineMs já acumulado por chunk via type offline_ms
      return true;
    }
    case "encounter_start": {
      applyJourneyPatch(character, { battlesStarted: 1 }, { now });
      j.meta.encounter = {
        startedAt: nowIso,
        enemyName: event.enemyName || null,
        zoneId: event.zoneId || null,
        isBoss: Boolean(event.isBoss),
        damageDealt: 0,
        damageTaken: 0,
        online: event.online !== false && !event.catchUpId,
        catchUpId: event.catchUpId || null,
      };
      return true;
    }
    case "hit_dealt": {
      const dmg = floorNonNeg(event.damage);
      const patch = { damageDealt: dmg };
      if (event.crit) patch.crits = 1;
      if (event.skill) patch.skillUses = 1;
      applyJourneyPatch(character, patch, { now });
      if (j.meta.encounter && event.online !== false && !event.catchUpId && dmg > 0) {
        j.meta.encounter.damageDealt = (j.meta.encounter.damageDealt || 0) + dmg;
        maybeUpdateRecord(
          j,
          "maxDamageHit",
          dmg,
          {
            enemyName: j.meta.encounter.enemyName,
            zoneId: j.meta.encounter.zoneId,
            at: nowIso,
            isBoss: j.meta.encounter.isBoss,
            characterName: character.name,
          },
          "max",
        );
      } else if (j.meta.encounter) {
        j.meta.encounter.damageDealt = (j.meta.encounter.damageDealt || 0) + dmg;
      }
      return true;
    }
    case "hit_taken": {
      const dmg = floorNonNeg(event.damage);
      applyJourneyPatch(character, { damageTaken: dmg }, { now });
      if (j.meta.encounter) {
        j.meta.encounter.damageTaken = (j.meta.encounter.damageTaken || 0) + dmg;
      }
      return true;
    }
    case "potion_used": {
      applyJourneyPatch(character, { potionUses: 1 }, { now });
      return true;
    }
    case "kill": {
      const wasBoss = Boolean(event.isBoss);
      applyJourneyPatch(
        character,
        {
          kills: 1,
          battlesWon: 1,
          bossKills: wasBoss ? 1 : 0,
        },
        { now },
      );
      if (!j.lifetime.firstBoss && wasBoss) {
        j.lifetime.firstBoss = {
          name: event.enemyName || null,
          zoneId: event.zoneId || null,
          at: nowIso,
        };
      }
      const enc = j.meta.encounter;
      const online = event.online === true || (enc && enc.online && !event.catchUpId);
      const durationMs = floorNonNeg(event.durationMs);
      if (online && durationMs > 0) {
        const ctx = {
          enemyName: event.enemyName || enc?.enemyName || null,
          zoneId: event.zoneId || enc?.zoneId || null,
          at: nowIso,
          durationMs,
          isBoss: wasBoss,
          characterName: character.name,
        };
        maybeUpdateRecord(j, "fastestWin", durationMs, ctx, "min");
        maybeUpdateRecord(j, "longestWin", durationMs, ctx, "max");
        if (wasBoss) {
          maybeUpdateRecord(j, "fastestBoss", durationMs, ctx, "min");
          maybeUpdateRecord(j, "longestBoss", durationMs, ctx, "max");
        }
        applyJourneyPatch(character, { combatMs: durationMs }, { now });
      }
      if (enc && online) {
        maybeUpdateRecord(
          j,
          "maxDamageBattle",
          enc.damageDealt || 0,
          {
            enemyName: enc.enemyName,
            zoneId: enc.zoneId,
            at: nowIso,
            isBoss: wasBoss,
            characterName: character.name,
          },
          "max",
        );
        maybeUpdateRecord(
          j,
          "maxDamageTakenBattle",
          enc.damageTaken || 0,
          {
            enemyName: enc.enemyName,
            zoneId: enc.zoneId,
            at: nowIso,
            isBoss: wasBoss,
            characterName: character.name,
          },
          "max",
        );
      }
      j.meta.encounter = null;
      return true;
    }
    case "faint": {
      applyJourneyPatch(character, { faints: 1, battlesLost: 1 }, { now });
      j.meta.encounter = null;
      return true;
    }
    case "gold_combat": {
      const amount = floorNonNeg(event.amount);
      applyJourneyPatch(character, { goldEarnedCombat: amount, maxGoldReward: amount }, { now });
      return true;
    }
    case "gold_sell": {
      applyJourneyPatch(character, { goldEarnedSell: floorNonNeg(event.amount) }, { now });
      return true;
    }
    case "gold_spent_merchant": {
      applyJourneyPatch(
        character,
        {
          goldSpentMerchant: floorNonNeg(event.amount),
          itemsBought: event.itemsBought ? 1 : 0,
        },
        { now },
      );
      return true;
    }
    case "gold_spent_ritual": {
      applyJourneyPatch(character, { goldSpentRitual: floorNonNeg(event.amount) }, { now });
      return true;
    }
    case "xp": {
      applyJourneyPatch(character, { xpEarned: floorNonNeg(event.amount) }, { now });
      return true;
    }
    case "play_ms": {
      applyJourneyPatch(character, { playMs: floorNonNeg(event.ms) }, { now });
      return true;
    }
    case "offline_ms": {
      applyJourneyPatch(character, { offlineMs: floorNonNeg(event.ms) }, { now });
      return true;
    }
    case "item_found": {
      const rarity = JOURNEY_RARITIES.includes(event.rarity) ? event.rarity : "common";
      applyJourneyPatch(character, { itemsFound: 1, byRarity: { [rarity]: 1 } }, { now });
      return true;
    }
    case "item_sold": {
      applyJourneyPatch(character, { itemsSold: floorNonNeg(event.count) || 1 }, { now });
      return true;
    }
    case "refine": {
      if (event.success) applyJourneyPatch(character, { refineSuccess: 1 }, { now });
      else applyJourneyPatch(character, { refineFail: 1 }, { now });
      return true;
    }
    case "level": {
      const level = Math.floor(Number(event.level) || 0);
      if (level > 0) applyJourneyPatch(character, { maxLevelReached: level }, { now });
      return true;
    }
    case "zone_visit": {
      const zoneId = event.zoneId != null ? String(event.zoneId) : null;
      if (!zoneId) return false;
      if (!Array.isArray(j.lifetime.zonesVisited)) j.lifetime.zonesVisited = [];
      if (!j.lifetime.zonesVisited.includes(zoneId)) j.lifetime.zonesVisited.push(zoneId);
      return true;
    }
    case "ascension": {
      applyJourneyPatch(character, { ascensions: 1 }, { now });
      return true;
    }
    default:
      return false;
  }
}

/**
 * Soft reset de temporada: NÃO toca lifetime nem seasons passadas.
 * Abre bucket da próxima temporada. Ascensão não deve chamar isto.
 */
export function journeyOnSeasonRollover(
  character,
  { closedSeasonKey, nextSeasonKey, now = new Date() } = {},
) {
  const j = ensureJourney(character, {
    now,
    seasonKey: closedSeasonKey || defaultSeasonKey(now),
  });
  const next = nextSeasonKey || defaultSeasonKey(now);
  if (closedSeasonKey && !j.seasons[closedSeasonKey]) {
    j.seasons[closedSeasonKey] = emptyJourneyTotals();
  }
  if (!j.seasons[next]) j.seasons[next] = emptyJourneyTotals();
  j.meta.activeSeasonKey = next;
  return j;
}

export function setJourneyPrivacy(character, hideFromPublicRankings) {
  const j = ensureJourney(character);
  j.privacy.hideFromPublicRankings = Boolean(hideFromPublicRankings);
  return j.privacy;
}

/** Soma imported (não classificado) + lifetime (detalhado) para exibição. */
export function resolveDisplayTotals(journey) {
  const life = normalizeTotals(journey?.lifetime);
  const imp = normalizeImported(journey?.imported);
  return {
    ...life,
    kills: life.kills + imp.kills,
    bossKills: life.bossKills + imp.bossKills,
    itemsBought: life.itemsBought + imp.itemsBought,
    playMs: life.playMs + imp.playMs,
    goldEarnedUnclassified: imp.goldEarnedUnclassified,
    goldSpentUnclassified: imp.goldSpentUnclassified,
    goldEarnedCombat: life.goldEarnedCombat,
    goldEarnedSell: life.goldEarnedSell,
    goldSpentMerchant: life.goldSpentMerchant,
    goldSpentRitual: life.goldSpentRitual,
    goldSpentOther: life.goldSpentOther,
  };
}

export function sumDayRange(days, fromKey, toKey) {
  const out = emptyJourneyDayDelta();
  if (!days || typeof days !== "object") return out;
  for (const [key, val] of Object.entries(days)) {
    if (key < fromKey || key > toKey) continue;
    for (const k of Object.keys(out)) {
      out[k] += Math.floor(Number(val?.[k]) || 0);
    }
  }
  return out;
}

/**
 * Resolve totais para um período. last30d usa days (pode ser parcial se coleta recente).
 */
export function getJourneyPeriodTotals(character, period = "all", { now = new Date(), seasonKey } = {}) {
  const j = ensureJourney(character, { now, seasonKey });
  const sk = seasonKey || j.meta.activeSeasonKey || defaultSeasonKey(now);

  if (period === "all" || period === "lifetime") {
    return {
      period: "lifetime",
      totals: resolveDisplayTotals(j),
      records: j.records,
      imported: j.imported,
      collectionStartedAt: j.collectionStartedAt,
      partialHistory: true,
    };
  }
  if (period === "season" || period === "current_season") {
    return {
      period: "season",
      seasonKey: sk,
      totals: normalizeTotals(j.seasons[sk]),
      records: j.records,
      collectionStartedAt: j.collectionStartedAt,
      partialHistory: true,
    };
  }
  if (typeof period === "string" && period.startsWith("season:")) {
    const key = period.slice("season:".length);
    return {
      period: "season",
      seasonKey: key,
      totals: normalizeTotals(j.seasons[key] || emptyJourneyTotals()),
      records: j.records,
      collectionStartedAt: j.collectionStartedAt,
      partialHistory: true,
    };
  }
  if (period === "year" || period === "current_year") {
    const yk = utcYearKey(now);
    return {
      period: "year",
      year: yk,
      totals: normalizeTotals(j.years[yk]),
      records: j.records,
      collectionStartedAt: j.collectionStartedAt,
      partialHistory: true,
    };
  }
  if (typeof period === "string" && period.startsWith("year:")) {
    const yk = period.slice("year:".length);
    return {
      period: "year",
      year: yk,
      totals: normalizeTotals(j.years[yk] || emptyJourneyTotals()),
      records: j.records,
      collectionStartedAt: j.collectionStartedAt,
      partialHistory: true,
    };
  }
  if (period === "last30d") {
    const to = utcDayKey(now);
    const fromDate = new Date(now);
    fromDate.setUTCDate(fromDate.getUTCDate() - 29);
    const from = fromDate.toISOString().slice(0, 10);
    const daySum = sumDayRange(j.days, from, to);
    const totals = emptyJourneyTotals();
    for (const k of Object.keys(daySum)) {
      if (k in totals) totals[k] = daySum[k];
    }
    const started = j.collectionStartedAt ? j.collectionStartedAt.slice(0, 10) : to;
    return {
      period: "last30d",
      from,
      to,
      totals,
      records: j.records,
      collectionStartedAt: j.collectionStartedAt,
      partialHistory: started > from,
      insufficientHistory: started > from,
    };
  }
  return getJourneyPeriodTotals(character, "all", { now, seasonKey });
}

export function journeyFieldAvailability(journey, field) {
  if (!journey) return "unavailable";
  if (field === "goldEarnedUnclassified" || field === "goldSpentUnclassified") {
    return journey.imported?.importedAt ? "available" : "unavailable";
  }
  if (journey.collectionStartedAt) return "available";
  return "unavailable";
}

export function publicJourney(character, period = "all") {
  ensureJourney(character);
  const resolved = getJourneyPeriodTotals(character, period);
  const j = character.journey;
  return {
    collectionStartedAt: j.collectionStartedAt,
    privacy: { ...j.privacy },
    imported: { ...j.imported },
    period: resolved.period,
    seasonKey: resolved.seasonKey || null,
    year: resolved.year || null,
    from: resolved.from || null,
    to: resolved.to || null,
    partialHistory: Boolean(resolved.partialHistory),
    insufficientHistory: Boolean(resolved.insufficientHistory),
    totals: resolved.totals,
    records: resolved.records,
    seasonsAvailable: Object.keys(j.seasons || {}).sort(),
    yearsAvailable: Object.keys(j.years || {}).sort(),
    currentGold: Math.floor(Number(character.gold) || 0),
    character: {
      id: character.id,
      name: character.name,
      classId: character.classId,
      level: character.level,
      createdAt: character.createdAt || null,
      ascension: character.ascension || null,
    },
  };
}

/** Desempate determinístico: value desc, characterId asc. */
export function compareRankEntries(a, b) {
  const va = Number(a.value) || 0;
  const vb = Number(b.value) || 0;
  if (vb !== va) return vb - va;
  const ida = String(a.characterId || "");
  const idb = String(b.characterId || "");
  if (ida < idb) return -1;
  if (ida > idb) return 1;
  return 0;
}
