/** Allowlist de visualId de monstros (espelha admin-studio/asset-registry.js). */

export const MONSTER_VISUAL_IDS = [
  "skeleton_minion",
  "skeleton_rogue",
  "skeleton_warrior",
  "skeleton_mage",
] as const;

export type MonsterVisualId = (typeof MONSTER_VISUAL_IDS)[number];

export const DEFAULT_MONSTER_VISUAL_ID: MonsterVisualId = "skeleton_minion";

const ALLOWED = new Set<string>(MONSTER_VISUAL_IDS);

/** Mapa nome legado → visualId (quando o override ainda não tem visualId). */
export const MONSTER_NAME_TO_VISUAL: Record<string, MonsterVisualId> = {
  "Esqueleto Errante": "skeleton_minion",
  "Saqueador Ósseo": "skeleton_rogue",
  "Guerreiro Ósseo": "skeleton_warrior",
  "Necromante Aprendiz": "skeleton_mage",
  "Espectro Musgoso": "skeleton_rogue",
  "Guardião Espinhoso": "skeleton_warrior",
  "Campeão Flamejante": "skeleton_warrior",
  "Arquimago Cinzento": "skeleton_mage",
  "Afogado do Pântano": "skeleton_minion",
  "Bruxo Lodoso": "skeleton_mage",
  "Sentinela Congelada": "skeleton_warrior",
  "Caçador da Nevasca": "skeleton_rogue",
};

export function isMonsterVisualId(value: unknown): value is MonsterVisualId {
  return typeof value === "string" && ALLOWED.has(value);
}

export function sanitizeMonsterVisualId(raw: unknown): MonsterVisualId | null {
  if (raw == null || raw === "") return null;
  const id = String(raw).trim();
  return isMonsterVisualId(id) ? id : null;
}

export function resolveMonsterVisualId(input: {
  visualId?: unknown;
  name?: unknown;
}): MonsterVisualId {
  const direct = sanitizeMonsterVisualId(input.visualId);
  if (direct) return direct;
  const name = String(input.name || "").trim();
  return MONSTER_NAME_TO_VISUAL[name] || DEFAULT_MONSTER_VISUAL_ID;
}

export function monsterVisualMeta() {
  return MONSTER_VISUAL_IDS.map((id) => ({
    id,
    label: id
      .split("_")
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join(" "),
  }));
}
