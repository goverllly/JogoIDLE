// @ts-nocheck
/**
 * Agregados da Galeria da Fama (escopo local|global).
 * Updates incrementais + reconcile a partir dos journeys persistidos.
 */

import {
  compareRankEntries,
  emptyJourneyTotals,
  ensureJourney,
  JOURNEY_RARITIES,
  resolveDisplayTotals,
} from "./journey";

export const FAME_SCHEMA_VERSION = 1;

export const FAME_HALL_CATEGORIES = {
  soulReaper: { title: "Ceifador de Almas", field: "kills", kind: "total" },
  ancientSlayer: { title: "Carrasco dos Antigos", field: "bossKills", kind: "total" },
  deathChild: { title: "Filho da Morte", field: "faints", kind: "total" },
  fortuneLord: { title: "Senhor da Fortuna", field: "goldEarnedDisplay", kind: "total" },
  relicCollector: { title: "Colecionador de Relíquias", field: "legendaryFound", kind: "total" },
  divineStrike: { title: "Golpe Divino", field: "maxDamageHit", kind: "record" },
  enduranceLegend: { title: "Lenda da Resistência", field: "longestWin", kind: "record" },
  lightningExecutor: { title: "Executor Relâmpago", field: "fastestWin", kind: "record_min" },
};

export function emptyFameState({ scope = "local" } = {}) {
  return {
    schemaVersion: FAME_SCHEMA_VERSION,
    scope: scope === "global" ? "global" : "local",
    multiUser: scope === "global",
    globals: emptyJourneyTotals(),
    /** Soma de ouro importado não classificado (separado dos detalhados). */
    globalsExtra: {
      goldEarnedUnclassified: 0,
      goldSpentUnclassified: 0,
      characterCount: 0,
      playerCount: 0,
    },
    hall: {},
    updatedAt: null,
    lastReconciledAt: null,
  };
}

export function ensureFameState(raw, { scope = "local" } = {}) {
  const base = emptyFameState({ scope });
  if (!raw || typeof raw !== "object") return base;
  const fame = {
    ...base,
    ...raw,
    schemaVersion: FAME_SCHEMA_VERSION,
    scope: raw.scope === "global" ? "global" : "local",
    multiUser: Boolean(raw.multiUser) && raw.scope === "global",
    globals: { ...emptyJourneyTotals(), ...(raw.globals || {}) },
    globalsExtra: {
      goldEarnedUnclassified: Math.max(0, Math.floor(Number(raw.globalsExtra?.goldEarnedUnclassified) || 0)),
      goldSpentUnclassified: Math.max(0, Math.floor(Number(raw.globalsExtra?.goldSpentUnclassified) || 0)),
      characterCount: Math.max(0, Math.floor(Number(raw.globalsExtra?.characterCount) || 0)),
      playerCount: Math.max(0, Math.floor(Number(raw.globalsExtra?.playerCount) || 0)),
    },
    hall: raw.hall && typeof raw.hall === "object" ? { ...raw.hall } : {},
  };
  if (!fame.globals.byRarity) fame.globals.byRarity = emptyJourneyTotals().byRarity;
  return fame;
}

function publicDisplayName(character, privacyHidden) {
  if (privacyHidden) return "Aventureiro anônimo";
  return character.name || "Desconhecido";
}

function goldEarnedDisplay(totals) {
  return (
    (totals.goldEarnedCombat || 0) +
    (totals.goldEarnedSell || 0) +
    (totals.goldEarnedUnclassified || 0)
  );
}

function legendaryFound(totals) {
  return totals.byRarity?.legendary || 0;
}

function characterMetric(character, field, kind) {
  ensureJourney(character);
  const totals = resolveDisplayTotals(character.journey);
  const records = character.journey.records || {};
  if (kind === "record" || kind === "record_min") {
    const rec = records[field];
    if (!rec || !Number.isFinite(Number(rec.value))) return null;
    return { value: Number(rec.value), context: rec };
  }
  if (field === "goldEarnedDisplay") return { value: goldEarnedDisplay(totals), context: null };
  if (field === "legendaryFound") return { value: legendaryFound(totals), context: null };
  return { value: Math.floor(Number(totals[field]) || 0), context: null };
}

function hallEntryFromCharacter(character, categoryKey, metric) {
  const hidden = Boolean(character.journey?.privacy?.hideFromPublicRankings);
  const cat = FAME_HALL_CATEGORIES[categoryKey];
  return {
    categoryKey,
    title: cat.title,
    characterId: hidden ? null : character.id,
    characterName: publicDisplayName(character, hidden),
    classId: hidden ? null : character.classId,
    level: hidden ? null : character.level,
    value: metric.value,
    at: metric.context?.at || null,
    context: metric.context
      ? {
          enemyName: metric.context.enemyName,
          zoneId: metric.context.zoneId,
          durationMs: metric.context.durationMs,
          isBoss: metric.context.isBoss,
        }
      : null,
    anonymous: hidden,
  };
}

function isBetterHall(categoryKey, nextValue, current) {
  const cat = FAME_HALL_CATEGORIES[categoryKey];
  if (!current) return nextValue > 0;
  if (cat.kind === "record_min") {
    if (nextValue <= 0) return false;
    return nextValue < current.value;
  }
  return nextValue > current.value;
}

/**
 * Aplica delta incremental aos globals (após eventos do personagem).
 * hall: reavalia só as categorias afetadas para este personagem.
 */
export function applyFameDelta(fame, character, deltaTotals = {}, { touchHall = true } = {}) {
  const state = ensureFameState(fame, { scope: fame?.scope || "local" });
  for (const [key, delta] of Object.entries(deltaTotals)) {
    if (key === "byRarity" && delta && typeof delta === "object") {
      if (!state.globals.byRarity) state.globals.byRarity = emptyJourneyTotals().byRarity;
      for (const r of JOURNEY_RARITIES) {
        const d = Math.floor(Number(delta[r]) || 0);
        if (d) state.globals.byRarity[r] = (state.globals.byRarity[r] || 0) + d;
      }
      continue;
    }
    if (key === "goldEarnedUnclassified" || key === "goldSpentUnclassified") {
      state.globalsExtra[key] = (state.globalsExtra[key] || 0) + Math.floor(Number(delta) || 0);
      continue;
    }
    if (!(key in state.globals)) continue;
    if (key === "maxGoldReward" || key === "maxLevelReached") {
      const v = Math.floor(Number(delta) || 0);
      if (v > (state.globals[key] || 0)) state.globals[key] = v;
      continue;
    }
    const d = Math.floor(Number(delta) || 0);
    if (d) state.globals[key] = (state.globals[key] || 0) + d;
  }

  if (touchHall && character) {
    ensureJourney(character);
    for (const categoryKey of Object.keys(FAME_HALL_CATEGORIES)) {
      const cat = FAME_HALL_CATEGORIES[categoryKey];
      const metric = characterMetric(character, cat.field, cat.kind);
      if (!metric || metric.value <= 0) continue;
      const cur = state.hall[categoryKey];
      const sameChar =
        cur &&
        (cur.characterId === character.id ||
          (cur.anonymous && character.journey?.privacy?.hideFromPublicRankings));
      if (sameChar || isBetterHall(categoryKey, metric.value, cur)) {
        // Se anônimo e já é o recordista, atualiza valor sem expor id
        if (cur && cur.characterId === character.id) {
          state.hall[categoryKey] = hallEntryFromCharacter(character, categoryKey, metric);
        } else if (!cur || isBetterHall(categoryKey, metric.value, cur)) {
          state.hall[categoryKey] = hallEntryFromCharacter(character, categoryKey, metric);
        }
      }
    }
  }

  state.updatedAt = new Date().toISOString();
  return state;
}

/**
 * Reconstrói globals + hall a partir da lista de personagens.
 * Não chamar em cada request — só admin/cron/reconcile explícito.
 */
export function reconcileFameFromCharacters(characters, { scope = "local" } = {}) {
  const state = emptyFameState({ scope });
  const userIds = new Set();
  const list = Array.isArray(characters) ? characters : [];

  for (const character of list) {
    if (!character) continue;
    ensureJourney(character);
    const totals = resolveDisplayTotals(character.journey);
    const imp = character.journey.imported || {};

    for (const key of Object.keys(state.globals)) {
      if (key === "byRarity" || key === "zonesVisited" || key === "firstBoss") continue;
      if (key === "maxGoldReward" || key === "maxLevelReached") {
        state.globals[key] = Math.max(state.globals[key] || 0, totals[key] || 0);
        continue;
      }
      state.globals[key] = (state.globals[key] || 0) + (totals[key] || 0);
    }
    for (const r of JOURNEY_RARITIES) {
      state.globals.byRarity[r] =
        (state.globals.byRarity[r] || 0) + (totals.byRarity?.[r] || 0);
    }
    state.globalsExtra.goldEarnedUnclassified += imp.goldEarnedUnclassified || 0;
    // Unclassified already folded into display kills etc via resolveDisplayTotals for combat fields;
    // gold unclassified stays in extras only (not double-counted in goldEarnedCombat).
    state.globalsExtra.goldSpentUnclassified += imp.goldSpentUnclassified || 0;
    state.globalsExtra.characterCount += 1;
    if (character.userId != null) userIds.add(character.userId);

    for (const categoryKey of Object.keys(FAME_HALL_CATEGORIES)) {
      const cat = FAME_HALL_CATEGORIES[categoryKey];
      const metric = characterMetric(character, cat.field, cat.kind);
      if (!metric || metric.value <= 0) continue;
      const cur = state.hall[categoryKey];
      if (!cur || isBetterHall(categoryKey, metric.value, cur)) {
        state.hall[categoryKey] = hallEntryFromCharacter(character, categoryKey, metric);
      } else if (cur && metric.value === cur.value) {
        // Empate: characterId asc (entrada anônima perde para id estável se ambos iguais — prefer menor id)
        const next = hallEntryFromCharacter(character, categoryKey, metric);
        const a = { value: next.value, characterId: next.characterId || character.id };
        const b = { value: cur.value, characterId: cur.characterId || "\uffff" };
        if (compareRankEntries(a, b) < 0) state.hall[categoryKey] = next;
      }
    }
  }

  state.globalsExtra.playerCount = userIds.size || (list.length > 0 ? 1 : 0);
  const nowIso = new Date().toISOString();
  state.updatedAt = nowIso;
  state.lastReconciledAt = nowIso;
  return state;
}

export function publicFameOverview(fame) {
  const state = ensureFameState(fame, { scope: fame?.scope || "local" });
  return {
    scope: state.scope,
    multiUser: state.multiUser,
    label:
      state.scope === "global"
        ? "Estatísticas da comunidade"
        : "Ambiente local — não representa o servidor de produção",
    globals: {
      ...state.globals,
      goldEarnedUnclassified: state.globalsExtra.goldEarnedUnclassified,
      goldSpentUnclassified: state.globalsExtra.goldSpentUnclassified,
      characterCount: state.globalsExtra.characterCount,
      playerCount: state.globalsExtra.playerCount,
      goldEarnedTotal:
        (state.globals.goldEarnedCombat || 0) +
        (state.globals.goldEarnedSell || 0) +
        (state.globalsExtra.goldEarnedUnclassified || 0),
    },
    hall: Object.fromEntries(
      Object.keys(FAME_HALL_CATEGORIES).map((key) => [
        key,
        state.hall[key] || {
          categoryKey: key,
          title: FAME_HALL_CATEGORIES[key].title,
          vacant: true,
        },
      ]),
    ),
    updatedAt: state.updatedAt,
    lastReconciledAt: state.lastReconciledAt,
  };
}

/**
 * Ranking por categoria a partir de personagens (leitura pontual / reconcile cache).
 * Respeita privacy (nome anônimo; ainda conta no ranking).
 */
export function buildCategoryRanking(characters, categoryKey, { limit = 20, offset = 0, selfId = null } = {}) {
  const cat = FAME_HALL_CATEGORIES[categoryKey];
  if (!cat) return { categoryKey, title: null, rows: [], total: 0, self: null };

  const rows = [];
  for (const character of characters || []) {
    if (!character) continue;
    ensureJourney(character);
    const metric = characterMetric(character, cat.field, cat.kind);
    if (!metric || !Number.isFinite(metric.value)) continue;
    if (cat.kind === "record_min" && metric.value <= 0) continue;
    if (cat.kind !== "record_min" && metric.value <= 0) continue;
    const hidden = Boolean(character.journey?.privacy?.hideFromPublicRankings);
    rows.push({
      characterId: hidden ? null : character.id,
      characterName: publicDisplayName(character, hidden),
      classId: hidden ? null : character.classId,
      level: hidden ? null : character.level,
      value: metric.value,
      at: metric.context?.at || null,
      anonymous: hidden,
      _sortId: character.id,
    });
  }

  if (cat.kind === "record_min") {
    rows.sort((a, b) => {
      if (a.value !== b.value) return a.value - b.value;
      return String(a._sortId).localeCompare(String(b._sortId));
    });
  } else {
    rows.sort((a, b) => compareRankEntries(
      { value: a.value, characterId: a._sortId },
      { value: b.value, characterId: b._sortId },
    ));
  }

  const total = rows.length;
  const page = rows.slice(offset, offset + limit).map((r, i) => {
    const { _sortId, ...rest } = r;
    return { rank: offset + i + 1, ...rest };
  });

  let self = null;
  if (selfId) {
    const idx = rows.findIndex((r) => r._sortId === selfId);
    if (idx >= 0) {
      const { _sortId, ...rest } = rows[idx];
      self = { rank: idx + 1, ...rest };
    }
  }

  return {
    categoryKey,
    title: cat.title,
    kind: cat.kind,
    rows: page,
    total,
    self,
  };
}
