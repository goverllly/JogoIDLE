/**
 * Preferências do Inventário Inteligente (state.inventoryAutomation).
 * Autorização de execução continua sendo petHas — prefs só filtram.
 */

import { RARITIES, rarityRank } from "./game/items";
import { petHas, ensurePets, PET_DEFS } from "./game/pets";

export const SELL_RARITY_OPTIONS = Object.keys(RARITIES) as Array<
  keyof typeof RARITIES
>;

export type InventoryAutomationState = {
  autoSellEnabled: boolean;
  maxSellRarity: string;
  autoEquipEnabled: boolean;
  /** Se true, vender rare/epic/legendary no modo Vender pede confirmação. */
  confirmRareSell: boolean;
};

/** Defaults para personagens novos (mais conservador). */
export function defaultInventoryAutomationNew(): InventoryAutomationState {
  return {
    autoSellEnabled: true,
    maxSellRarity: "uncommon",
    autoEquipEnabled: true,
    confirmRareSell: true,
  };
}

/** Defaults de migração (preserva comportamento legado do Gato). */
export function defaultInventoryAutomationLegacy(): InventoryAutomationState {
  return {
    autoSellEnabled: true,
    maxSellRarity: "legendary",
    autoEquipEnabled: true,
    confirmRareSell: true,
  };
}

export function isValidSellRarity(rarity: unknown): boolean {
  return typeof rarity === "string" && rarity in RARITIES;
}

export function ensureInventoryAutomation(character: {
  inventoryAutomation?: unknown;
}): InventoryAutomationState {
  const raw = character.inventoryAutomation;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    const legacy = defaultInventoryAutomationLegacy();
    character.inventoryAutomation = legacy;
    return legacy;
  }
  const src = raw as Record<string, unknown>;
  const maxSellRarity = isValidSellRarity(src.maxSellRarity)
    ? String(src.maxSellRarity)
    : "legendary";
  const next: InventoryAutomationState = {
    autoSellEnabled: src.autoSellEnabled !== false,
    maxSellRarity,
    autoEquipEnabled: src.autoEquipEnabled !== false,
    confirmRareSell: src.confirmRareSell !== false,
  };
  character.inventoryAutomation = next;
  return next;
}

export function applyInventoryAutomationPatch(
  character: { inventoryAutomation?: unknown },
  patch: {
    autoSellEnabled?: boolean;
    maxSellRarity?: string;
    autoEquipEnabled?: boolean;
    confirmRareSell?: boolean;
  },
): InventoryAutomationState {
  const cur = ensureInventoryAutomation(character);
  if (typeof patch.autoSellEnabled === "boolean") {
    cur.autoSellEnabled = patch.autoSellEnabled;
  }
  if (patch.maxSellRarity != null) {
    if (!isValidSellRarity(patch.maxSellRarity)) {
      throw Object.assign(new Error("Raridade máxima inválida"), { status: 400 });
    }
    cur.maxSellRarity = String(patch.maxSellRarity);
  }
  if (typeof patch.autoEquipEnabled === "boolean") {
    cur.autoEquipEnabled = patch.autoEquipEnabled;
  }
  if (typeof patch.confirmRareSell === "boolean") {
    cur.confirmRareSell = patch.confirmRareSell;
  }
  character.inventoryAutomation = cur;
  return cur;
}

export function isItemLocked(item: { locked?: unknown } | null | undefined): boolean {
  return Boolean(item && item.locked === true);
}

/** Pet de venda ativo + prefs + raridade. */
export function petAutoSellActive(character: {
  inventoryAutomation?: unknown;
  pets?: unknown;
}): boolean {
  const prefs = ensureInventoryAutomation(character);
  return prefs.autoSellEnabled && petHas(character as never, "autoSellWrongClass");
}

export function petAutoEquipActive(character: {
  inventoryAutomation?: unknown;
  pets?: unknown;
}): boolean {
  const prefs = ensureInventoryAutomation(character);
  return prefs.autoEquipEnabled && petHas(character as never, "autoEquipBetter");
}

/**
 * Item elegível para venda automática do pet (wrong-class + teto de raridade + lock).
 * Não cobre bag-full nem sellJunk.
 */
export function isEligibleForPetAutoSell(
  character: { classId?: string; inventoryAutomation?: unknown },
  item: { rarity?: string; locked?: unknown; templateId?: string },
  template: { classes?: string[]; consumable?: boolean; slot?: string } | null,
): boolean {
  if (!item || !template) return false;
  if (isItemLocked(item)) return false;
  if (template.consumable || template.slot === "consumable") return false;
  if ((template.classes || []).includes(String(character.classId))) return false;
  const prefs = ensureInventoryAutomation(character);
  return rarityRank(item.rarity) <= rarityRank(prefs.maxSellRarity);
}

/**
 * Atributo preferido só para automação de inventário/pets (isItemBetter, scores).
 * Não define o dano do combate: em computeStats o ATK físico (incl. Arqueiro) usa STR;
 * DEX no Arqueiro afeta intervalo/crítico. Manter ARQUEIRO → dex aqui — não “corrigir”
 * para str sem retune explícito da automação.
 */
export function primaryAttrForClass(classId: string): "str" | "int" | "dex" {
  if (classId === "MAGO") return "int";
  if (classId === "ARQUEIRO") return "dex";
  return "str";
}

export function publicInventoryAutomation(character: {
  inventoryAutomation?: unknown;
  pets?: unknown;
  classId?: string;
}) {
  const prefs = ensureInventoryAutomation(character);
  const pets = ensurePets(character as never);
  const activeId = pets.activeId;
  const caps = activeId && PET_DEFS[activeId] ? [...PET_DEFS[activeId].caps] : [];
  const canSell = caps.includes("autoSellWrongClass");
  const canEquip = caps.includes("autoEquipBetter");
  return {
    ...prefs,
    maxSellRarityName: RARITIES[prefs.maxSellRarity as keyof typeof RARITIES]?.name || prefs.maxSellRarity,
    rarityOptions: SELL_RARITY_OPTIONS.map((id) => ({
      id,
      name: RARITIES[id].name,
    })),
    pet: {
      activeId,
      name: activeId ? PET_DEFS[activeId]?.name || activeId : null,
      caps,
      canSell,
      canEquip,
    },
    effective: {
      sell: Boolean(prefs.autoSellEnabled && canSell),
      equip: Boolean(prefs.autoEquipEnabled && canEquip),
    },
    notes: {
      sellWithoutPet:
        prefs.autoSellEnabled && !canSell
          ? "Preferência de venda salva, mas o pet ativo não vende automaticamente."
          : null,
      equipWithoutPet:
        prefs.autoEquipEnabled && !canEquip
          ? "Preferência de autoequip salva, mas o pet ativo não equipa automaticamente."
          : null,
      bagFull:
        "Mochila cheia ainda pode liquidar drops novos não protegidos (regra de capacidade). Cadeados e o Suco Celestial não são liquidados.",
      lockVsRarity:
        "Proteger (cadeado) vale para itens que você já tem. O limite de raridade só filtra o que o pet de venda pode vender automaticamente.",
    },
  };
}
