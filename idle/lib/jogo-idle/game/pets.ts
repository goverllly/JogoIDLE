/** Pets de companhia — compra no mercador; um ativo por vez; efeitos no farm (server-side). */

export const PET_IDS = ["dog", "cat", "parrot"] as const;
export type PetId = (typeof PET_IDS)[number];

export type PetCap = "autoEquipBetter" | "autoSellWrongClass";

export type PetsState = {
  unlocked: string[];
  activeId: PetId | null;
};

export const PET_DEFS: Record<
  PetId,
  {
    id: PetId;
    sku: string;
    name: string;
    description: string;
    icon: string;
    caps: PetCap[];
  }
> = {
  dog: {
    id: "dog",
    sku: "pet_dog",
    name: "Cachorro",
    description: "Ao dropar um item melhor, equipa automaticamente no slot certo.",
    icon: "dog",
    caps: ["autoEquipBetter"],
  },
  cat: {
    id: "cat",
    sku: "pet_cat",
    name: "Gato",
    description: "Vende automaticamente itens que não são da sua classe (como sell-junk).",
    icon: "cat",
    caps: ["autoSellWrongClass"],
  },
  parrot: {
    id: "parrot",
    sku: "pet_parrot",
    name: "Papagaio",
    description: "Faz o que o Cachorro e o Gato fazem (auto-equipar + vender fora da classe).",
    icon: "parrot",
    caps: ["autoEquipBetter", "autoSellWrongClass"],
  },
};

const PET_ID_SET = new Set<string>(PET_IDS);

export function isPetId(id: unknown): id is PetId {
  return typeof id === "string" && PET_ID_SET.has(id);
}

export function petIdFromSku(sku: string): PetId | null {
  const key = String(sku || "");
  for (const id of PET_IDS) {
    if (PET_DEFS[id].sku === key) return id;
  }
  return null;
}

/** Companheiro na arena = pet ativo (um só). */
export function companionPetId(character: { pets?: PetsState | null }): PetId | null {
  return ensurePets(character).activeId;
}

export function ensurePets(character: { pets?: PetsState | null }): PetsState {
  const raw = character.pets && typeof character.pets === "object" ? character.pets : null;
  const unlocked = Array.isArray(raw?.unlocked)
    ? [...new Set(raw!.unlocked.filter((id) => isPetId(id)))]
    : [];
  const activeRaw = raw?.activeId != null ? String(raw.activeId) : null;
  let activeId: PetId | null =
    activeRaw && isPetId(activeRaw) && unlocked.includes(activeRaw) ? activeRaw : null;
  // Se tem pets mas nenhum ativo (legado), ativa o último desbloqueado.
  if (!activeId && unlocked.length) {
    activeId = unlocked[unlocked.length - 1] as PetId;
  }
  const next: PetsState = { unlocked, activeId };
  character.pets = next;
  return next;
}

export function unlockPet(
  character: { pets?: PetsState | null },
  petId: string,
): PetsState {
  if (!isPetId(petId)) throw new Error("Pet desconhecido");
  const state = ensurePets(character);
  if (!state.unlocked.includes(petId)) state.unlocked.push(petId);
  state.activeId = petId;
  character.pets = state;
  return state;
}

export function setActivePet(
  character: { pets?: PetsState | null },
  petId: string | null,
): PetsState {
  const state = ensurePets(character);
  if (petId == null || petId === "") {
    state.activeId = null;
    character.pets = state;
    return state;
  }
  if (!isPetId(petId)) throw new Error("Pet desconhecido");
  if (!state.unlocked.includes(petId)) {
    const err = new Error("Pet não desbloqueado");
    (err as Error & { status?: number }).status = 400;
    throw err;
  }
  state.activeId = petId;
  character.pets = state;
  return state;
}

/** Caps só do pet ativo (um por vez). */
export function petHas(character: { pets?: PetsState | null }, cap: PetCap): boolean {
  const state = ensurePets(character);
  if (!state.activeId) return false;
  return PET_DEFS[state.activeId].caps.includes(cap);
}

export function effectivePetCaps(character: { pets?: PetsState | null }): PetCap[] {
  const state = ensurePets(character);
  if (!state.activeId) return [];
  return [...PET_DEFS[state.activeId].caps];
}

export function publicPets(character: { pets?: PetsState | null }) {
  const state = ensurePets(character);
  const caps = effectivePetCaps(character);
  return {
    unlocked: [...state.unlocked],
    activeId: state.activeId,
    companionId: companionPetId(character),
    caps,
    catalog: PET_IDS.map((id) => {
      const def = PET_DEFS[id];
      return {
        id: def.id,
        sku: def.sku,
        name: def.name,
        description: def.description,
        icon: def.icon,
        caps: [...def.caps],
        unlocked: state.unlocked.includes(id),
        active: state.activeId === id,
      };
    }),
  };
}
