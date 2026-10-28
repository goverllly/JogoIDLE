/**
 * Quatro Eras — modelo de capítulos (MVP UI + persistência).
 * Spec: docs/capitulos/02_NAVEGACAO_CAPITULOS.md e 07_ARQUITETURA_E_PERSISTENCIA.md
 */
import { currentSeasonIdentity } from "../season";

export const CHAPTER_IDS = ["I", "II", "III", "IV"] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

export const CLASSIFICATION_BY_CHAPTER: Record<ChapterId, string> = {
  I: "MORTAL",
  II: "CELESTIAL",
  III: "DIVINO",
  IV: "SEMIDEUS",
};

export const CLASSIFICATION_LADDER = ["MORTAL", "CELESTIAL", "DIVINO", "SEMIDEUS"] as const;
export type ClassificationId = (typeof CLASSIFICATION_LADDER)[number];

/** Cadeia de rituais — por ora todos consomem Suco Divino + gold (recompensas futuras). */
export const CLASSIFICATION_RITUALS = {
  ritual_celestial: {
    id: "ritual_celestial",
    from: "MORTAL" as ClassificationId,
    to: "CELESTIAL" as ClassificationId,
    completesChapter: "I" as ChapterId,
    unlocksChapter: "II" as ChapterId,
    label: "Ritual Celestial",
    resultLabel: "Celestial",
    zoneHint: "Prova Divina",
    titleGrant: "Celestial",
  },
  ritual_divino: {
    id: "ritual_divino",
    from: "CELESTIAL" as ClassificationId,
    to: "DIVINO" as ClassificationId,
    completesChapter: "II" as ChapterId,
    unlocksChapter: "III" as ChapterId,
    label: "Classificação Divina",
    resultLabel: "Divino",
    zoneHint: "Julgamento das Almas",
    titleGrant: "Divino",
  },
  ritual_semideus: {
    id: "ritual_semideus",
    from: "DIVINO" as ClassificationId,
    to: "SEMIDEUS" as ClassificationId,
    completesChapter: "III" as ChapterId,
    unlocksChapter: "IV" as ChapterId,
    label: "Ritual do Semideus",
    resultLabel: "Semideus",
    zoneHint: "Coração da Chama",
    titleGrant: "Semideus",
  },
} as const;

export type RitualId = keyof typeof CLASSIFICATION_RITUALS;

export function classificationRank(id: string | null | undefined) {
  const i = CLASSIFICATION_LADDER.indexOf((id || "MORTAL") as ClassificationId);
  return i < 0 ? 0 : i;
}

export function meetsAscensionRequirement(
  character: any,
  required: string | null | undefined,
) {
  if (!required) return true;
  return classificationRank(character?.ascension || "MORTAL") >= classificationRank(required);
}

export function currentClassification(character: any): ClassificationId {
  const fromAsc = character?.ascension;
  if (fromAsc && CLASSIFICATION_LADDER.includes(fromAsc)) return fromAsc;
  const fromCh = character?.chapters?.season?.classification;
  if (fromCh && CLASSIFICATION_LADDER.includes(fromCh)) return fromCh as ClassificationId;
  return "MORTAL";
}

/** Próximo ritual da cadeia, ou null se já Semideus. */
export function getNextClassificationRitual(character: any) {
  const cur = currentClassification(character);
  return (
    Object.values(CLASSIFICATION_RITUALS).find((r) => r.from === cur) || null
  );
}

export const CHAPTER_CATALOG: Record<
  ChapterId,
  {
    id: ChapterId;
    number: string;
    name: string;
    classification: string;
    theme: string;
    art: string;
    /** Fundo full-bleed da intro / play-stage. */
    bgUrl: string;
    /** Frase curta da intro cinematográfica. */
    introLine: string;
    regions: { id: string; name: string; levelMin: number; levelMax: number }[];
    finalBoss: string;
    unlockMission: string | null;
    /** Missão de campanha do capítulo (display UI; não altera unlock). */
    campaignMission?: string | null;
    rewards: string[];
    unlockRequirements: string[];
  }
> = {
  I: {
    id: "I",
    number: "I",
    name: "A Floresta Esquecida",
    classification: "Mortal",
    theme: "Floresta",
    art: "/jogo-idle/assets/chapters/cap-I.png",
    bgUrl: "/jogo-idle/assets/chapters/bg-cap-I.png",
    introLine: "Os antigos caminhos despertam novamente.",
    regions: [
      { id: "bosque_sussurros", name: "Bosque dos Sussurros", levelMin: 1, levelMax: 100 },
      { id: "pantano_sombras", name: "Pântano das Sombras", levelMin: 101, levelMax: 200 },
      { id: "floresta_amaldicoada", name: "Floresta Amaldiçoada", levelMin: 201, levelMax: 300 },
      { id: "ruinas_druidas", name: "Ruínas dos Druidas", levelMin: 301, levelMax: 400 },
      { id: "coracao_floresta", name: "Coração da Floresta", levelMin: 401, levelMax: 500 },
    ],
    finalBoss: "Guardião Ancestral",
    unlockMission: null,
    campaignMission: "A Seiva dos Deuses",
    rewards: ["Classificação Celestial (após ritual)", "Acesso ao Capítulo II"],
    unlockRequirements: [],
  },
  II: {
    id: "II",
    number: "II",
    name: "O Reino dos Mortos",
    classification: "Celestial",
    theme: "Cemitério",
    art: "/jogo-idle/assets/chapters/cap-II.png",
    bgUrl: "/jogo-idle/assets/chapters/bg-cap-II.png",
    introLine: "Entre lápides e névoa, os esquecidos aguardam.",
    regions: [
      { id: "cemiterio_esquecido", name: "Cemitério Esquecido", levelMin: 1, levelMax: 100 },
      { id: "criptas_profanadas", name: "Criptas Profanadas", levelMin: 101, levelMax: 200 },
      { id: "catacumbas_eternas", name: "Catacumbas Eternas", levelMin: 201, levelMax: 300 },
      { id: "necropole_reis", name: "Necrópole dos Reis", levelMin: 301, levelMax: 400 },
      { id: "trono_almas", name: "Trono das Almas", levelMin: 401, levelMax: 500 },
    ],
    finalBoss: "Rei dos Mortos",
    unlockMission: "A Seiva dos Deuses",
    rewards: ["Classificação Divina (após ritual)", "Acesso ao Capítulo III"],
    unlockRequirements: [
      "Capítulo I — nível 500",
      "Suco Divino (Prova Divina)",
      "10.000.000 gold",
      "Ritual Celestial",
    ],
  },
  III: {
    id: "III",
    number: "III",
    name: "O Inferno Primordial",
    classification: "Divino",
    theme: "Chamas",
    art: "/jogo-idle/assets/chapters/cap-III.png",
    bgUrl: "/jogo-idle/assets/chapters/bg-cap-III.png",
    introLine: "As cinzas se abrem — o fogo eterno chama.",
    regions: [
      { id: "campos_cinzas", name: "Campos de Cinzas", levelMin: 1, levelMax: 100 },
      { id: "rios_magma", name: "Rios de Magma", levelMin: 101, levelMax: 200 },
      { id: "fornalhas_malditas", name: "Fornalhas Malditas", levelMin: 201, levelMax: 300 },
      { id: "fortaleza_condenados", name: "Fortaleza dos Condenados", levelMin: 301, levelMax: 400 },
      { id: "trono_chama", name: "Trono da Chama Eterna", levelMin: 401, levelMax: 500 },
    ],
    finalBoss: "Soberano Ígneo",
    unlockMission: "O Julgamento das Mil Almas",
    rewards: ["Classificação Semideus (após ritual)", "Acesso ao Capítulo IV"],
    unlockRequirements: [
      "Capítulo II — nível 500",
      "Suco Divino (Julgamento das Almas)",
      "10.000.000 gold",
      "Classificação Divina (ritual)",
    ],
  },
  IV: {
    id: "IV",
    number: "IV",
    name: "O Abismo do Vazio",
    classification: "Semideus",
    theme: "Buraco Negro",
    art: "/jogo-idle/assets/chapters/cap-IV.png",
    bgUrl: "/jogo-idle/assets/chapters/bg-cap-IV.png",
    introLine: "Além do horizonte, a singularidade observa.",
    regions: [
      { id: "ruinas_orbitais", name: "Ruínas Orbitais", levelMin: 1, levelMax: 100 },
      { id: "abismo_esquecido", name: "Abismo Esquecido", levelMin: 101, levelMax: 200 },
      { id: "cemiterio_estrelas", name: "Cemitério das Estrelas", levelMin: 201, levelMax: 300 },
      { id: "horizonte_eventos", name: "Horizonte de Eventos", levelMin: 301, levelMax: 400 },
      { id: "singularidade", name: "A Singularidade", levelMin: 401, levelMax: 500 },
    ],
    finalBoss: "O Último Eco",
    unlockMission: "O Coração da Chama Primordial",
    rewards: ["Conclusão sazonal", "Registro na Galeria da Fama", "Cosmético exclusivo"],
    unlockRequirements: [
      "Capítulo III — nível 500",
      "Suco Divino (Coração da Chama)",
      "10.000.000 gold",
      "Ritual do Semideus",
    ],
  },
};

const FALLBACK_BG = "/jogo-idle/assets/hud/fundo-jogo.png";

/** Payload da intro cinematográfica de play.html. */
export function getPlayIntroPayload(
  character: any,
  zones?: { id: string; name: string; chapterId?: string | null }[] | null,
) {
  const ch = ensureChapters(character);
  const id = (ch.currentChapterId as ChapterId) || "I";
  const meta = CHAPTER_CATALOG[id] || CHAPTER_CATALOG.I;
  const bucket = ch.season.progress[id];
  const level = Math.max(1, Math.floor(Number(bucket?.level || character.level) || 1));

  let regionId: string | null = null;
  let regionName: string | null = null;

  const farmId = character.farmZoneId ? String(character.farmZoneId) : null;
  if (farmId && Array.isArray(zones)) {
    const z = zones.find((row) => row.id === farmId);
    if (z && (!z.chapterId || z.chapterId === id)) {
      regionId = z.id;
      regionName = z.name;
    }
  }
  if (!regionName) {
    const region =
      meta.regions.find((r) => level >= r.levelMin && level <= r.levelMax) || meta.regions[0];
    if (region) {
      regionId = region.id;
      regionName = region.name;
    }
  }

  return {
    chapterId: meta.id,
    chapterNumber: meta.number,
    chapterName: meta.name,
    theme: meta.theme,
    bgUrl: meta.bgUrl || FALLBACK_BG,
    introLine: meta.introLine || "",
    regionId,
    regionName,
    art: meta.art,
  };
}

type ChapterStatus = "locked" | "available" | "in_progress" | "completed";

type ChapterBucket = {
  level: number;
  xp: number;
  status: ChapterStatus;
  campaignComplete: boolean;
  unlockedZoneIds: string[];
};

function emptyBucket(status: ChapterStatus = "locked"): ChapterBucket {
  return {
    level: status === "locked" ? 0 : 1,
    xp: 0,
    status,
    campaignComplete: false,
    unlockedZoneIds: [],
  };
}

function clampLevel(n: unknown) {
  const v = Math.floor(Number(n) || 0);
  return Math.max(0, Math.min(500, v));
}

function chapterRank(id: ChapterId) {
  return CHAPTER_IDS.indexOf(id);
}

function maxUnlockedId(ids: ChapterId[]): ChapterId {
  return ids.reduce((a, b) => (chapterRank(a) >= chapterRank(b) ? a : b), "I");
}

/** Garante blob chapters no personagem; migra a partir de level/ascension legados. */
export function ensureChapters(character: any) {
  const seasonKey = currentSeasonIdentity().slug;
  const existing = character.chapters;
  if (existing && existing.schemaVersion === 1 && existing.season?.progress) {
    if (existing.season.seasonKey !== seasonKey) {
      // Temporada mudou: recria progresso competitivo, preserva legacy
      const legacy = existing.legacy || defaultLegacy(character);
      character.chapters = buildFreshChapters(character, seasonKey, legacy);
    } else {
      syncBucketStatuses(character);
    }
    return character.chapters;
  }

  character.chapters = buildFreshChapters(character, seasonKey, defaultLegacy(character));
  return character.chapters;
}

function defaultLegacy(character: any) {
  const cls = currentClassification(character);
  const completed: ChapterId[] = [];
  if (classificationRank(cls) >= classificationRank("CELESTIAL")) completed.push("I");
  if (classificationRank(cls) >= classificationRank("DIVINO")) completed.push("II");
  if (classificationRank(cls) >= classificationRank("SEMIDEUS")) completed.push("III");
  return {
    maxClassificationEver: cls,
    chaptersCompletedEver: completed,
    lifetimeLevelsGained: Math.max(1, Math.floor(Number(character.level) || 1)),
    permanentBonuses: [] as unknown[],
    cosmeticsGranted: [] as string[],
    legacyCelestialOverflow: 0,
  };
}

function unlockBucket(id: ChapterId, level: number, xp: number, complete = false): ChapterBucket {
  const lv = Math.max(1, clampLevel(level) || 1);
  return {
    level: complete ? 500 : lv,
    xp: complete ? 0 : Math.max(0, xp),
    status: complete ? "completed" : lv > 1 || xp > 0 ? "in_progress" : "available",
    campaignComplete: complete,
    unlockedZoneIds: CHAPTER_CATALOG[id].regions.map((r) => r.id),
  };
}

function buildFreshChapters(character: any, seasonKey: string, legacy: any) {
  const cls = currentClassification(character);
  const level = clampLevel(character.level) || 1;
  const xp = Math.max(0, Math.floor(Number(character.experience) || 0));
  const rank = classificationRank(cls);

  const progress: Record<ChapterId, ChapterBucket> = {
    I: emptyBucket("available"),
    II: emptyBucket("locked"),
    III: emptyBucket("locked"),
    IV: emptyBucket("locked"),
  };

  let currentChapterId: ChapterId = "I";
  let highestUnlockedChapter: ChapterId = "I";
  const completedRitualIds: string[] = [];

  if (rank <= 0) {
    progress.I = unlockBucket("I", level, xp, false);
  } else {
    // Cap.I sempre completo após qualquer ascensão
    progress.I = unlockBucket("I", 500, 0, true);
    completedRitualIds.push("ritual_celestial");
    highestUnlockedChapter = "II";
    currentChapterId = "II";

    if (rank === classificationRank("CELESTIAL")) {
      progress.II = unlockBucket("II", level, xp, false);
    } else {
      progress.II = unlockBucket("II", 500, 0, true);
      completedRitualIds.push("ritual_divino");
      highestUnlockedChapter = "III";
      currentChapterId = "III";

      if (rank === classificationRank("DIVINO")) {
        progress.III = unlockBucket("III", level, xp, false);
      } else {
        progress.III = unlockBucket("III", 500, 0, true);
        completedRitualIds.push("ritual_semideus");
        highestUnlockedChapter = "IV";
        currentChapterId = "IV";
        progress.IV = unlockBucket("IV", level, xp, false);
      }
    }

    legacy = {
      ...legacy,
      maxClassificationEver:
        classificationRank(legacy?.maxClassificationEver) >= rank
          ? legacy.maxClassificationEver
          : cls,
      chaptersCompletedEver: Array.from(
        new Set([
          ...(legacy.chaptersCompletedEver || []),
          ...(rank >= 1 ? ["I"] : []),
          ...(rank >= 2 ? ["II"] : []),
          ...(rank >= 3 ? ["III"] : []),
        ]),
      ),
      legacyCelestialOverflow: Math.max(0, Math.floor(Number(character.level) || 0) - 500),
    };
  }

  return {
    schemaVersion: 1,
    currentChapterId,
    season: {
      seasonKey,
      highestUnlockedChapter,
      classification: cls,
      progress,
      completedQuestIds: [] as string[],
      completedRitualIds,
    },
    legacy,
  };
}

function syncBucketStatuses(character: any) {
  const ch = character.chapters;
  const cur = ch.currentChapterId as ChapterId;
  const bucket = ch.season.progress[cur];
  if (!bucket || bucket.status === "locked") return;
  // Espelha level/xp ativos no bucket atual
  bucket.level = clampLevel(character.level) || 1;
  bucket.xp = Math.max(0, Math.floor(Number(character.experience) || 0));
  if (bucket.campaignComplete) {
    bucket.status = "completed";
  } else if (bucket.level > 1 || bucket.xp > 0) {
    bucket.status = "in_progress";
  } else if (bucket.status !== "completed") {
    bucket.status = "available";
  }
}

function isUnlocked(character: any, id: ChapterId): boolean {
  const ch = ensureChapters(character);
  return chapterRank(id) <= chapterRank(ch.season.highestUnlockedChapter as ChapterId);
}

function missingRequirements(character: any, id: ChapterId): string[] {
  if (isUnlocked(character, id)) return [];
  return [...CHAPTER_CATALOG[id].unlockRequirements];
}

function resolveCardStatus(character: any, id: ChapterId): ChapterStatus {
  const ch = ensureChapters(character);
  const bucket = ch.season.progress[id] as ChapterBucket;
  if (!isUnlocked(character, id)) return "locked";
  if (bucket?.campaignComplete || bucket?.status === "completed") return "completed";
  if ((bucket?.level || 0) > 1 || (bucket?.xp || 0) > 0) return "in_progress";
  return "available";
}

/** Vista pública para a UI das Crônicas. */
export function publicChaptersView(character: any) {
  const ch = ensureChapters(character);
  const activeId = ch.currentChapterId as ChapterId;

  const cards = CHAPTER_IDS.map((id) => {
    const meta = CHAPTER_CATALOG[id];
    const bucket = ch.season.progress[id] as ChapterBucket;
    const status = resolveCardStatus(character, id);
    const locked = status === "locked";
    const level = locked ? 0 : bucket?.level || 0;
    const xp = locked ? 0 : bucket?.xp || 0;
    // XP to next: approximate using same curve would need balance import — show level progress % within 500
    const progressPct =
      status === "completed" ? 100 : locked ? 0 : Math.min(100, Math.round(((level - 1) / 499) * 1000) / 10);

    return {
      id,
      number: meta.number,
      name: meta.name,
      classification: meta.classification,
      theme: meta.theme,
      art: meta.art,
      bgUrl: meta.bgUrl,
      introLine: meta.introLine,
      status,
      isActive: id === activeId,
      level,
      xp,
      progressPct,
      regions: meta.regions,
      finalBoss: meta.finalBoss,
      unlockMission: meta.unlockMission,
      campaignMission: meta.campaignMission || meta.unlockMission || null,
      rewards: meta.rewards,
      missingRequirements: locked ? missingRequirements(character, id) : [],
      canEnter: !locked,
    };
  });

  return {
    schemaVersion: 1,
    seasonKey: ch.season.seasonKey,
    currentChapterId: activeId,
    highestUnlockedChapter: ch.season.highestUnlockedChapter,
    classification: ch.season.classification,
    legacy: {
      maxClassificationEver: ch.legacy?.maxClassificationEver || "MORTAL",
      chaptersCompletedEver: ch.legacy?.chaptersCompletedEver || [],
    },
    cards,
  };
}

/**
 * Valida entrada sem alterar farm.
 * Retorna { ok, missing } — callers must stop farm only after ok.
 */
export function validateEnterChapter(character: any, chapterId: string) {
  const id = String(chapterId || "").toUpperCase() as ChapterId;
  if (!CHAPTER_IDS.includes(id)) {
    const err = new Error("Capítulo inválido");
    (err as any).status = 400;
    (err as any).code = "CHAPTER_INVALID";
    throw err;
  }
  ensureChapters(character);
  if (!isUnlocked(character, id)) {
    return {
      ok: false as const,
      chapterId: id,
      missingRequirements: missingRequirements(character, id),
    };
  }
  return { ok: true as const, chapterId: id, missingRequirements: [] as string[] };
}

/**
 * Aplica troca de capítulo (após validação OK e stop farm).
 * Preserva buckets; espelha level/xp do destino em character.
 */
export function applyEnterChapter(character: any, chapterId: ChapterId) {
  const ch = ensureChapters(character);
  const fromId = ch.currentChapterId as ChapterId;

  // Salva progresso atual no bucket de origem
  const fromBucket = ch.season.progress[fromId] as ChapterBucket;
  if (fromBucket && fromBucket.status !== "locked") {
    fromBucket.level = clampLevel(character.level) || 1;
    fromBucket.xp = Math.max(0, Math.floor(Number(character.experience) || 0));
    if (!fromBucket.campaignComplete) {
      fromBucket.status =
        fromBucket.level > 1 || fromBucket.xp > 0 ? "in_progress" : "available";
    }
  }

  if (fromId === chapterId) {
    return { switched: false, chapterId, view: publicChaptersView(character) };
  }

  const toBucket = ch.season.progress[chapterId] as ChapterBucket;
  if (!toBucket || toBucket.status === "locked") {
    const err = new Error("Capítulo bloqueado");
    (err as any).status = 403;
    (err as any).code = "CHAPTER_LOCKED";
    throw err;
  }

  ch.currentChapterId = chapterId;
  character.level = Math.max(1, clampLevel(toBucket.level) || 1);
  character.experience = Math.max(0, Math.floor(Number(toBucket.xp) || 0));
  ch.season.classification = CLASSIFICATION_BY_CHAPTER[chapterId];

  // Limpa farm zone — zonas cross-chapter ainda não filtradas no MVP
  character.farmZoneId = null;
  character.farmStartedAt = null;
  character.lastTickAt = null;
  character.combat = null;

  return { switched: true, chapterId, fromChapterId: fromId, view: publicChaptersView(character) };
}

/** Marca Cap.I completo e libera Cap.II após ritual celestial legado. */
export function onCelestialRitualComplete(character: any) {
  onClassificationRitualComplete(character, CLASSIFICATION_RITUALS.ritual_celestial);
}

/** Completa o capítulo atual da cadeia e desbloqueia o próximo @ L1. */
export function onClassificationRitualComplete(
  character: any,
  ritual: (typeof CLASSIFICATION_RITUALS)[RitualId],
) {
  const ch = ensureChapters(character);
  const doneId = ritual.completesChapter;
  const nextId = ritual.unlocksChapter;

  const done = ch.season.progress[doneId] as ChapterBucket;
  done.level = 500;
  done.xp = 0;
  done.campaignComplete = true;
  done.status = "completed";
  if (!done.unlockedZoneIds?.length) {
    done.unlockedZoneIds = CHAPTER_CATALOG[doneId].regions.map((r) => r.id);
  }

  ch.season.highestUnlockedChapter = maxUnlockedId([
    ch.season.highestUnlockedChapter as ChapterId,
    nextId,
  ]);
  if (!Array.isArray(ch.season.completedRitualIds)) ch.season.completedRitualIds = [];
  if (!ch.season.completedRitualIds.includes(ritual.id)) {
    ch.season.completedRitualIds.push(ritual.id);
  }

  const next = ch.season.progress[nextId] as ChapterBucket;
  if (!next || next.status === "locked") {
    ch.season.progress[nextId] = unlockBucket(nextId, 1, 0, false);
  } else {
    // Já desbloqueado: força recomeço do capítulo destino após ritual.
    next.level = 1;
    next.xp = 0;
    next.campaignComplete = false;
    next.status = "available";
    if (!next.unlockedZoneIds?.length) {
      next.unlockedZoneIds = CHAPTER_CATALOG[nextId].regions.map((r) => r.id);
    }
  }

  ch.currentChapterId = nextId;
  ch.season.classification = ritual.to;
  if (
    classificationRank(ch.legacy?.maxClassificationEver) < classificationRank(ritual.to)
  ) {
    ch.legacy.maxClassificationEver = ritual.to;
  }
  ch.legacy.chaptersCompletedEver = Array.from(
    new Set([...(ch.legacy.chaptersCompletedEver || []), doneId]),
  );

  character.ascension = ritual.to;
  character.level = 1;
  character.experience = 0;
}
