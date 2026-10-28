/** Cosméticos desbloqueáveis — só aparência, sem poder. */

export const COSMETIC_CAPES = {
  cape_celestial: { id: "cape_celestial", label: "Manto Celestial", capeColor: "gold" },
  cape_ember: { id: "cape_ember", label: "Manto de Brasas", capeColor: "crimson" },
  cape_mist: { id: "cape_mist", label: "Véu da Névoa", capeColor: "purple" },
} as const;

export const COSMETIC_ARMOR_TINTS = {
  tint_gold: { id: "tint_gold", label: "Brilho Dourado", armor: "sand" },
  tint_obsidian: { id: "tint_obsidian", label: "Obsidiana", armor: "shadow" },
  tint_jade: { id: "tint_jade", label: "Jade", armor: "forest" },
} as const;

export type CosmeticCapeId = keyof typeof COSMETIC_CAPES;
export type CosmeticArmorTintId = keyof typeof COSMETIC_ARMOR_TINTS;

export type CosmeticsState = {
  unlocked: string[];
  capeId?: string | null;
  armorTintId?: string | null;
};

const ALL_IDS = new Set([
  ...Object.keys(COSMETIC_CAPES),
  ...Object.keys(COSMETIC_ARMOR_TINTS),
]);

export function cosmeticsCatalog() {
  return {
    capes: Object.values(COSMETIC_CAPES),
    armorTints: Object.values(COSMETIC_ARMOR_TINTS),
  };
}

export function ensureCosmetics(character: { cosmetics?: CosmeticsState | null }): CosmeticsState {
  const raw = character.cosmetics && typeof character.cosmetics === "object" ? character.cosmetics : null;
  const unlocked = Array.isArray(raw?.unlocked)
    ? [...new Set(raw!.unlocked.filter((id) => typeof id === "string" && ALL_IDS.has(id)))]
    : [];
  const capeId =
    raw?.capeId && unlocked.includes(String(raw.capeId)) ? String(raw.capeId) : null;
  const armorTintId =
    raw?.armorTintId && unlocked.includes(String(raw.armorTintId))
      ? String(raw.armorTintId)
      : null;
  const next: CosmeticsState = { unlocked, capeId, armorTintId };
  character.cosmetics = next;
  return next;
}

export function unlockCosmetic(
  character: { cosmetics?: CosmeticsState | null },
  cosmeticId: string,
): CosmeticsState {
  const state = ensureCosmetics(character);
  const id = String(cosmeticId || "");
  if (!ALL_IDS.has(id)) throw new Error("Cosmético desconhecido");
  if (!state.unlocked.includes(id)) state.unlocked.push(id);
  character.cosmetics = state;
  return state;
}

export function isCosmeticUnlocked(character: { cosmetics?: CosmeticsState | null }, id: string) {
  return ensureCosmetics(character).unlocked.includes(id);
}

/**
 * Aplica seleção do salão — só IDs já desbloqueados.
 * Nunca muta character.appearance (birth look permanente).
 */
export function setEquippedCosmetics(
  character: { cosmetics?: CosmeticsState | null; appearance?: Record<string, unknown> },
  input: { capeId?: string | null; armorTintId?: string | null },
): CosmeticsState {
  const state = ensureCosmetics(character);
  if (input.capeId !== undefined) {
    const id = input.capeId ? String(input.capeId) : null;
    if (id && !state.unlocked.includes(id)) {
      const err = new Error("Cosmético não desbloqueado");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    if (id && !(id in COSMETIC_CAPES)) throw new Error("Capa inválida");
    state.capeId = id;
  }
  if (input.armorTintId !== undefined) {
    const id = input.armorTintId ? String(input.armorTintId) : null;
    if (id && !state.unlocked.includes(id)) {
      const err = new Error("Cosmético não desbloqueado");
      (err as Error & { status?: number }).status = 400;
      throw err;
    }
    if (id && !(id in COSMETIC_ARMOR_TINTS)) throw new Error("Tint inválido");
    state.armorTintId = id;
  }
  character.cosmetics = state;
  return state;
}

export function publicCosmetics(character: { cosmetics?: CosmeticsState | null }) {
  const state = ensureCosmetics(character);
  return {
    unlocked: [...state.unlocked],
    capeId: state.capeId || null,
    armorTintId: state.armorTintId || null,
    catalog: cosmeticsCatalog(),
  };
}
