export type AscensionTier = "CELESTIAL" | null;

export type RankableCharacter = {
  userId: number;
  level: number;
  experience: number;
  gold: number;
  /** null/ausente = Mortal */
  ascension?: AscensionTier;
  /** Desempate determinístico (opcional). */
  characterId?: string;
};

function isCelestial(row: RankableCharacter): boolean {
  return row.ascension === "CELESTIAL";
}

function compareRankStrength(a: RankableCharacter, b: RankableCharacter): number {
  const aCel = isCelestial(a);
  const bCel = isCelestial(b);
  if (aCel !== bCel) return aCel ? -1 : 1;
  if (a.level !== b.level) return b.level - a.level;
  if (a.experience !== b.experience) return b.experience - a.experience;
  if (a.gold !== b.gold) return b.gold - a.gold;
  const idA = a.characterId || "";
  const idB = b.characterId || "";
  if (idA !== idB) return idA < idB ? -1 : 1;
  return a.userId - b.userId;
}

/** true se `a` é mais forte que `b` (Celestial > Mortal, depois nível → XP → ouro). */
export function isStrongerCharacter(a: RankableCharacter, b: RankableCharacter): boolean {
  return compareRankStrength(a, b) < 0;
}

/** Uma linha por usuário: melhor personagem (Celestial acima de Mortal). */
export function pickBestCharacterPerUser<T extends RankableCharacter>(rows: T[]): T[] {
  const best = new Map<number, T>();
  for (const row of rows) {
    const current = best.get(row.userId);
    if (!current || isStrongerCharacter(row, current)) best.set(row.userId, row);
  }
  return [...best.values()].sort(compareRankStrength);
}

export function ascensionFromState(state: unknown): AscensionTier {
  if (!state || typeof state !== "object" || Array.isArray(state)) return null;
  const raw = (state as Record<string, unknown>).ascension;
  return raw === "CELESTIAL" ? "CELESTIAL" : null;
}

/** Equipamento público para ranking — sem stats/preço. */
export type RankingEquipmentItem = {
  uid: string;
  templateId: string;
  name: string;
  displayName?: string;
  slot: string;
  icon: string;
  visual: string | null;
  rarity: string;
  rarityName: string;
  tier?: number;
  refineLevel?: number;
};

export function stripItemForRanking(item: Record<string, unknown> | null | undefined): RankingEquipmentItem | null {
  if (!item || typeof item !== "object") return null;
  const uid = String(item.uid || "");
  const templateId = String(item.templateId || "");
  if (!uid || !templateId) return null;
  return {
    uid,
    templateId,
    name: String(item.name || templateId),
    displayName: item.displayName ? String(item.displayName) : undefined,
    slot: String(item.slot || "weapon"),
    icon: String(item.icon || "sword"),
    visual: item.visual != null ? String(item.visual) : null,
    rarity: String(item.rarity || "common"),
    rarityName: String(item.rarityName || item.rarity || "common"),
    tier: typeof item.tier === "number" ? item.tier : undefined,
    refineLevel: typeof item.refineLevel === "number" ? item.refineLevel : undefined,
  };
}

export function equipmentFromState(state: unknown): Record<string, RankingEquipmentItem> {
  if (!state || typeof state !== "object" || Array.isArray(state)) return {};
  const raw = (state as Record<string, unknown>).equipment;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, RankingEquipmentItem> = {};
  for (const [slot, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    // Estado interno guarda { uid, templateId, rarity, ... } — enriquecer via publicItem no service.
    out[slot] = value as RankingEquipmentItem;
  }
  return out;
}
