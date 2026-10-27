// @ts-nocheck
import {
  SLOTS,
  BAG_BASE_SLOTS,
  BAG_UPGRADE_SLOTS,
  MAX_BAG_UPGRADES,
  REFINER_TEMPLATE_ID,
  ATTR_RESET_TEMPLATE_ID,
  SUCO_CELESTIAL_TEMPLATE_ID,
  getTemplate,
  createItem,
  itemStats,
  sellPrice,
  publicItem,
  starterWeaponId,
  rarityRank,
  getBagUpgradePrice,
  getRefinerPrice,
  getAttrResetPrice,
  getPetPrice,
  itemQty,
} from './items';
import { MAX_REFINE, REFINE_STAT_BONUS } from './balance';
import { ensurePets, unlockPet, petHas, isPetId, petIdFromSku } from './pets';
import { careerAddPurchase } from './career';
import { applyJourneyEvent } from './journey';
import {
  ensureInventoryAutomation,
  isItemLocked,
  isEligibleForPetAutoSell,
  petAutoSellActive,
  petAutoEquipActive,
  primaryAttrForClass,
} from '../inventory-automation';

/** Classes jogáveis usam mão secundária (escudo, grimório, adaga, etc.). */
export function canUseOffhand(classId) {
  return ['GUERREIRO', 'BARBARO', 'MAGO', 'ARQUEIRO'].includes(classId);
}

function isTwoHanded(item) {
  return Boolean(item && getTemplate(item.templateId)?.twoHanded);
}

function isShieldTemplate(template) {
  return template?.slot === 'offhand';
}

export function bagUpgradesOf(character) {
  const n = Math.floor(Number(character.bagUpgrades) || 0);
  return Math.max(0, Math.min(MAX_BAG_UPGRADES, n));
}

/** Capacidade atual da mochila (base 20 + upgrades). */
export function inventoryCapacity(character) {
  return BAG_BASE_SLOTS + bagUpgradesOf(character) * BAG_UPGRADE_SLOTS;
}

/** Personagens antigos não têm inventário; todo personagem recebe uma arma inicial uma vez. */
export function ensureGear(character) {
  if (!Array.isArray(character.inventory)) character.inventory = [];
  if (!character.equipment || typeof character.equipment !== 'object') character.equipment = {};
  if (!Number.isFinite(character.bagUpgrades)) character.bagUpgrades = 0;
  character.bagUpgrades = bagUpgradesOf(character);

  for (const [slot, item] of Object.entries(character.equipment)) {
    if (!item || !getTemplate(item.templateId)) delete character.equipment[slot];
  }
  character.inventory = character.inventory.filter((i) => getTemplate(i.templateId));
  mergeStackableInventory(character);

  // Migração: quem já tinha mais de 20 itens ganha upgrades suficientes (até o máximo).
  while (
    character.inventory.length > inventoryCapacity(character) &&
    character.bagUpgrades < MAX_BAG_UPGRADES
  ) {
    character.bagUpgrades += 1;
  }

  const cap = inventoryCapacity(character);

  // Remove 2ª mão inválida (classe sem offhand).
  if (character.equipment.offhand && !canUseOffhand(character.classId)) {
    if (character.inventory.length < cap) {
      character.inventory.push(character.equipment.offhand);
    }
    delete character.equipment.offhand;
  }

  // Adaga/arma 1H que caiu na 2ª mão com principal vazia → sobe para a principal.
  if (
    character.equipment.offhand &&
    !character.equipment.weapon &&
    !isShieldTemplate(getTemplate(character.equipment.offhand.templateId))
  ) {
    character.equipment.weapon = character.equipment.offhand;
    delete character.equipment.offhand;
  }

  // 2H + offhand é inválido.
  if (character.equipment.weapon && isTwoHanded(character.equipment.weapon) && character.equipment.offhand) {
    if (character.inventory.length < inventoryCapacity(character)) {
      character.inventory.push(character.equipment.offhand);
    }
    delete character.equipment.offhand;
  }

  if (!character.starterGiven) {
    character.starterGiven = true;
    if (!character.equipment.weapon) {
      character.equipment.weapon = createItem(starterWeaponId(character.classId), 'common', 1);
    }
  }
}

export function equipmentBonus(character) {
  const total = { attack: 0, defense: 0, hp: 0, crit: 0, str: 0, dex: 0, int: 0, con: 0, mp: 0 };
  for (const item of Object.values(character.equipment || {})) {
    if (!item) continue;
    for (const [stat, v] of Object.entries(itemStats(item))) {
      total[stat] = (total[stat] || 0) + v;
    }
  }
  return total;
}

function findInInventory(character, uid) {
  const idx = character.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) throw new Error('Item não encontrado na mochila');
  return idx;
}

function putInSlot(character, invIdx, item, slot, { alsoFree = [] } = {}) {
  const eq = character.equipment;
  const freed = [];
  if (eq[slot]) freed.push(slot);
  for (const s of alsoFree) {
    if (eq[s] && !freed.includes(s)) freed.push(s);
  }

  const cap = inventoryCapacity(character);
  if (character.inventory.length - 1 + freed.length > cap) {
    throw new Error('Mochila cheia');
  }

  character.inventory.splice(invIdx, 1);
  for (const s of freed) {
    character.inventory.push(eq[s]);
    delete eq[s];
  }
  eq[slot] = item;
  return getTemplate(item.templateId);
}

/**
 * Equipa item.
 * `hand`: `auto` | `main` | `off`
 * - Guerreiro: 1H pode ir na principal ou secundária; escudo só na secundária.
 * - Outras classes: só arma principal (arco/cajado/machado etc.); sem 2ª mão.
 */
export function equipItem(character, uid, { hand = 'auto' } = {}) {
  const idx = findInInventory(character, uid);
  const item = character.inventory[idx];
  const t = getTemplate(item.templateId);
  if (t.consumable || t.slot === 'consumable') {
    if (item.templateId === SUCO_CELESTIAL_TEMPLATE_ID) {
      throw new Error('Suco Divino é item de ritual — fale com a Divindade');
    }
    throw new Error('Item consumível — use no contexto correto (Refinar / Divindade / Poção)');
  }
  if (!t.classes.includes(character.classId)) throw new Error('Sua classe não pode usar este item');
  if (t.requiresAscension === 'CELESTIAL' && character.ascension !== 'CELESTIAL') {
    throw new Error('Este equipamento exige ascensão Celestial');
  }
  if (character.level < t.level) throw new Error(`Requer nível ${t.level}`);

  const eq = character.equipment;
  const dual = canUseOffhand(character.classId);
  const mode = hand === 'off' || hand === 'main' ? hand : 'auto';

  if (isShieldTemplate(t)) {
    if (!dual) throw new Error('Sua classe não usa escudo na mão secundária');
    if (eq.weapon && isTwoHanded(eq.weapon)) {
      throw new Error('Guarde a arma de duas mãos antes de usar a mão secundária');
    }
    return putInSlot(character, idx, item, 'offhand');
  }

  if (t.slot === 'weapon' && t.twoHanded) {
    return putInSlot(character, idx, item, 'weapon', { alsoFree: eq.offhand ? ['offhand'] : [] });
  }

  if (t.slot === 'weapon' && !t.twoHanded) {
    const toOffhand =
      mode === 'off' ||
      (mode === 'auto' && dual && eq.weapon && !isTwoHanded(eq.weapon) && !eq.offhand);

    if (toOffhand) {
      if (!dual) throw new Error('Sua classe não usa duas armas de uma mão');
      if (!eq.weapon) throw new Error('Equipe primeiro uma arma principal de uma mão');
      if (isTwoHanded(eq.weapon)) throw new Error('Arma de duas mãos não combina com segunda arma');
      return putInSlot(character, idx, item, 'offhand');
    }

    return putInSlot(character, idx, item, 'weapon');
  }

  return putInSlot(character, idx, item, t.slot);
}

export function unequipItem(character, slot) {
  if (!SLOTS.includes(slot)) throw new Error('Slot inválido');
  const item = character.equipment[slot];
  if (!item) throw new Error('Nada equipado neste slot');
  if (character.inventory.length >= inventoryCapacity(character)) throw new Error('Mochila cheia');
  character.inventory.push(item);
  delete character.equipment[slot];
}

export function sellItem(character, uid) {
  const idx = findInInventory(character, uid);
  const item = character.inventory[idx];
  if (isItemLocked(item)) {
    throw new Error('Item protegido — desbloqueie o cadeado antes de vender');
  }
  character.inventory.splice(idx, 1);
  const gold = sellPrice(item);
  character.gold += gold;
  applyJourneyEvent(character, { source: 'farm', type: 'gold_sell', amount: gold });
  applyJourneyEvent(character, { source: 'farm', type: 'item_sold', count: 1 });
  return gold;
}

/** Vende todos os comuns e os incomuns que a classe não pode usar. */
export function sellJunk(character) {
  let count = 0;
  let gold = 0;
  character.inventory = character.inventory.filter((item) => {
    if (isItemLocked(item)) return true;
    const t = getTemplate(item.templateId);
    const junk = item.rarity === 'common' || (item.rarity === 'uncommon' && !t.classes.includes(character.classId));
    if (!junk) return true;
    count += 1;
    gold += sellPrice(item);
    return false;
  });
  character.gold += gold;
  if (gold > 0) {
    applyJourneyEvent(character, { source: 'farm', type: 'gold_sell', amount: gold });
  }
  if (count > 0) {
    applyJourneyEvent(character, { source: 'farm', type: 'item_sold', count });
  }
  return { count, gold };
}

function isConsumableItem(item) {
  const t = getTemplate(item.templateId);
  return Boolean(t?.consumable || t?.slot === 'consumable');
}

/** Score simples para comparar poder de itens (attrs + crit). */
export function itemPowerScore(item) {
  if (!item) return 0;
  const s = itemStats(item);
  return (
    (s.str || 0) +
    (s.int || 0) +
    (s.dex || 0) +
    (s.con || 0) +
    (s.crit || 0) * 10
  );
}

/**
 * True se `candidate` é estritamente melhor que `equipped` (ou slot vazio).
 * Com `character`: exige score maior e atributo primário da classe não pior.
 */
export function isItemBetter(candidate, equipped, character = null) {
  if (!candidate) return false;
  if (!equipped) return true;
  if (itemPowerScore(candidate) <= itemPowerScore(equipped)) return false;
  if (character?.classId) {
    const key = primaryAttrForClass(character.classId);
    const c = Number(itemStats(candidate)[key]) || 0;
    const e = Number(itemStats(equipped)[key]) || 0;
    if (c < e) return false;
  }
  return true;
}

/**
 * Vende itens da mochila fora da classe, respeitando prefs do Inventário Inteligente.
 * Não vende consumíveis, locked, nem raridade acima do teto. Equipados não entram.
 * Sem pet de venda / prefs off → no-op (chame só com petAutoSellActive).
 */
export function sellWrongClassItems(character) {
  ensureGear(character);
  ensureInventoryAutomation(character);
  if (!petAutoSellActive(character)) {
    return { count: 0, gold: 0, sold: [] };
  }
  let count = 0;
  let gold = 0;
  const sold = [];
  character.inventory = character.inventory.filter((item) => {
    const t = getTemplate(item.templateId);
    if (!isEligibleForPetAutoSell(character, item, t)) return true;
    count += 1;
    const price = sellPrice(item);
    gold += price;
    sold.push({
      name: t.name,
      rarity: item.rarity,
      gold: price,
    });
    return false;
  });
  character.gold += gold;
  return { count, gold, sold };
}

/** Protege / desprotege item na mochila ou equipamento (mesmo uid). */
export function setItemLocked(character, uid, locked) {
  ensureGear(character);
  const found = findItemAnywhere(character, uid);
  found.item.locked = Boolean(locked);
  return { uid: found.item.uid, locked: Boolean(found.item.locked), item: publicItem(found.item) };
}

/** Slot de comparação natural do item (antes do auto hand). */
function compareSlotForItem(character, template) {
  if (isShieldTemplate(template)) return 'offhand';
  if (template.slot === 'weapon') return 'weapon';
  return template.slot;
}

/**
 * Tenta equipar loot se for melhor que o item no slot alvo.
 * Retorna `{ equipped: true, slot, item }` ou null.
 */
export function tryAutoEquipLoot(character, uid) {
  ensureGear(character);
  if (!petAutoEquipActive(character)) return null;
  const idx = character.inventory.findIndex((i) => i.uid === uid);
  if (idx < 0) return null;
  const item = character.inventory[idx];
  const t = getTemplate(item.templateId);
  if (!t || t.consumable || t.slot === 'consumable') return null;
  if (!(t.classes || []).includes(character.classId)) return null;
  if (t.requiresAscension === 'CELESTIAL' && character.ascension !== 'CELESTIAL') return null;
  if (character.level < t.level) return null;

  const dual = canUseOffhand(character.classId);
  const eq = character.equipment;

  // Escudo / offhand dedicado
  if (isShieldTemplate(t)) {
    if (!dual) return null;
    if (eq.weapon && isTwoHanded(eq.weapon)) return null;
    if (isItemLocked(eq.offhand)) return null;
    if (!isItemBetter(item, eq.offhand, character)) return null;
    equipItem(character, uid, { hand: 'off' });
    return { equipped: true, slot: 'offhand', item };
  }

  // Arma 2H
  if (t.slot === 'weapon' && t.twoHanded) {
    if (isItemLocked(eq.weapon) || isItemLocked(eq.offhand)) return null;
    if (!isItemBetter(item, eq.weapon, character)) return null;
    equipItem(character, uid, { hand: 'main' });
    return { equipped: true, slot: 'weapon', item };
  }

  // Arma 1H: principal se melhor; senão offhand se dual e melhor que offhand
  if (t.slot === 'weapon' && !t.twoHanded) {
    if (isItemBetter(item, eq.weapon, character) && !isItemLocked(eq.weapon)) {
      equipItem(character, uid, { hand: 'main' });
      return { equipped: true, slot: 'weapon', item };
    }
    if (
      dual &&
      eq.weapon &&
      !isTwoHanded(eq.weapon) &&
      !isItemLocked(eq.offhand) &&
      isItemBetter(item, eq.offhand, character)
    ) {
      equipItem(character, uid, { hand: 'off' });
      return { equipped: true, slot: 'offhand', item };
    }
    return null;
  }

  const slot = compareSlotForItem(character, t);
  if (!SLOTS.includes(slot) || slot === 'consumable') return null;
  if (isItemLocked(eq[slot])) return null;
  if (!isItemBetter(item, eq[slot], character)) return null;
  equipItem(character, uid, { hand: 'auto' });
  return { equipped: true, slot, item };
}

/**
 * Resolve slot alvo e se o drop (ainda fora da mochila) deve substituir o equipado.
 * Retorna `{ slot, alsoFree }` ou null.
 */
function resolveBetterEquipTarget(character, item) {
  const t = getTemplate(item.templateId);
  if (!t || t.consumable || t.slot === 'consumable') return null;
  if (!(t.classes || []).includes(character.classId)) return null;
  if (t.requiresAscension === 'CELESTIAL' && character.ascension !== 'CELESTIAL') return null;
  if (character.level < t.level) return null;

  const dual = canUseOffhand(character.classId);
  const eq = character.equipment;

  if (isShieldTemplate(t)) {
    if (!dual) return null;
    if (eq.weapon && isTwoHanded(eq.weapon)) return null;
    if (isItemLocked(eq.offhand)) return null;
    if (!isItemBetter(item, eq.offhand, character)) return null;
    return { slot: 'offhand', alsoFree: [] };
  }

  if (t.slot === 'weapon' && t.twoHanded) {
    if (isItemLocked(eq.weapon) || isItemLocked(eq.offhand)) return null;
    if (!isItemBetter(item, eq.weapon, character)) return null;
    return { slot: 'weapon', alsoFree: eq.offhand ? ['offhand'] : [] };
  }

  if (t.slot === 'weapon' && !t.twoHanded) {
    if (!isItemLocked(eq.weapon) && isItemBetter(item, eq.weapon, character)) {
      return { slot: 'weapon', alsoFree: [] };
    }
    if (
      dual &&
      eq.weapon &&
      !isTwoHanded(eq.weapon) &&
      !isItemLocked(eq.offhand) &&
      isItemBetter(item, eq.offhand, character)
    ) {
      return { slot: 'offhand', alsoFree: [] };
    }
    return null;
  }

  const slot = compareSlotForItem(character, t);
  if (!SLOTS.includes(slot) || slot === 'consumable') return null;
  if (isItemLocked(eq[slot])) return null;
  if (!isItemBetter(item, eq[slot], character)) return null;
  return { slot, alsoFree: [] };
}

/**
 * Equipa um drop que ainda não está na mochila (swap direto).
 * Peças antigas vão para a mochila; se não couber e forem unlocked, vendas bag-full.
 * Abort se algum deslocado estiver locked (sem destino seguro).
 */
export function tryAutoEquipDropDirect(character, item) {
  ensureGear(character);
  if (!petAutoEquipActive(character)) return null;
  const target = resolveBetterEquipTarget(character, item);
  if (!target) return null;

  const eq = character.equipment;
  const displaced = [];
  if (eq[target.slot]) displaced.push(eq[target.slot]);
  for (const s of target.alsoFree) {
    if (eq[s]) displaced.push(eq[s]);
  }
  if (displaced.some((old) => isItemLocked(old))) {
    return null;
  }

  // Simula espaço: após liberar slots de eq, precisamos caber `displaced.length` na bag.
  // Se bag estiver cheia, addItem venderá unlocked — permitido só se nenhum locked (já checado).
  for (const s of target.alsoFree) {
    delete eq[s];
  }
  delete eq[target.slot];
  eq[target.slot] = item;

  let soldGold = 0;
  let soldCount = 0;
  for (const old of displaced) {
    const put = addItem(character, old);
    if (!put.added && !put.held) {
      soldGold += put.gold;
      soldCount += 1;
    }
    // put.held: item locked/protegido já barrado antes do swap; mantém no estado sem ouro.
  }
  return { equipped: true, slot: target.slot, item, soldGold, soldCount };
}

/**
 * Pipeline de loot com pet ativo.
 * 1) Vende fora da classe (gato/papagaio) — libera espaço antes do add
 * 2) Se mochila cheia e drop é melhor (cachorro/papagaio) — swap direto
 * 3) Senão addItem; se entrou, tenta auto-equipar da mochila
 *
 * Antes: `applyPetAfterLoot` só rodava com `added:true`, então mochila cheia
 * vendia o drop e o pet nunca agia.
 */
export function ingestLootWithPets(character, item) {
  const events = [];
  if (!item) return { added: false, gold: 0, events };
  ensureInventoryAutomation(character);

  // A) Venda do pet (prefs + lock + raridade) — separado de bag-full.
  if (petAutoSellActive(character)) {
    const sold = sellWrongClassItems(character);
    if (sold.count > 0) {
      events.push({
        type: 'pet_sell',
        count: sold.count,
        gold: sold.gold,
        petId: ensurePets(character).activeId,
      });
    }
  }

  const bagFull = character.inventory.length >= inventoryCapacity(character);
  if (bagFull && petAutoEquipActive(character)) {
    const swapped = tryAutoEquipDropDirect(character, item);
    if (swapped?.equipped) {
      const info = publicItem(swapped.item);
      events.push({
        type: 'pet_equip',
        slot: swapped.slot,
        name: info.displayName || info.name,
        rarity: info.rarity,
        petId: ensurePets(character).activeId,
      });
      if (swapped.soldCount > 0) {
        events.push({
          type: 'pet_sell',
          count: swapped.soldCount,
          gold: swapped.soldGold,
          petId: ensurePets(character).activeId,
          reason: 'displaced',
        });
      }
      return { added: true, gold: 0, equippedDirect: true, events };
    }
  }

  // B) addItem / bag-full (capacidade) — independente do teto de raridade do pet.
  const result = addItem(character, item);
  if (result.held) {
    return { added: false, gold: 0, held: true, events };
  }

  if (result.added && petAutoEquipActive(character)) {
    try {
      const equipped = tryAutoEquipLoot(character, item.uid);
      if (equipped?.equipped) {
        const info = publicItem(equipped.item);
        events.push({
          type: 'pet_equip',
          slot: equipped.slot,
          name: info.displayName || info.name,
          rarity: info.rarity,
          petId: ensurePets(character).activeId,
        });
      }
    } catch {
      // Mochila cheia / regra de mão — deixa o item na mochila.
    }
  }

  return { added: result.added, gold: result.gold, events };
}

/** @deprecated use ingestLootWithPets — mantido para testes/compat. */
export function applyPetAfterLoot(character, item, { added } = {}) {
  if (!added || !item) {
    // Compat: ainda aplica venda fora da classe mesmo sem o drop na bag.
    const events = [];
    if (petHas(character, 'autoSellWrongClass')) {
      const sold = sellWrongClassItems(character);
      if (sold.count > 0) {
        events.push({
          type: 'pet_sell',
          count: sold.count,
          gold: sold.gold,
          petId: ensurePets(character).activeId,
        });
      }
    }
    return events;
  }
  // Simula pós-add: item já está na bag.
  const events = [];
  if (petHas(character, 'autoSellWrongClass')) {
    const sold = sellWrongClassItems(character);
    if (sold.count > 0) {
      events.push({
        type: 'pet_sell',
        count: sold.count,
        gold: sold.gold,
        petId: ensurePets(character).activeId,
      });
    }
  }
  if (petHas(character, 'autoEquipBetter')) {
    const stillInBag = character.inventory.some((i) => i.uid === item.uid);
    if (stillInBag) {
      try {
        const result = tryAutoEquipLoot(character, item.uid);
        if (result?.equipped) {
          const info = publicItem(result.item);
          events.push({
            type: 'pet_equip',
            slot: result.slot,
            name: info.displayName || info.name,
            rarity: info.rarity,
            petId: ensurePets(character).activeId,
          });
        }
      } catch {
        /* ignore */
      }
    }
  }
  return events;
}

/** Compra pet no mercador (desbloqueio permanente + ativa). */
export function buyPet(character, skuOrId) {
  ensureGear(character);
  ensurePets(character);
  let petId = petIdFromSku(String(skuOrId || ''));
  if (!petId && isPetId(skuOrId)) petId = skuOrId;
  if (!petId) throw new Error('Oferta de pet não encontrada');

  const state = ensurePets(character);
  if (state.unlocked.includes(petId)) {
    throw new Error('Você já possui este pet');
  }
  const price = getPetPrice(petId);
  if (character.gold < price) {
    throw new Error(`Ouro insuficiente (precisa de ${price.toLocaleString('pt-BR')})`);
  }
  character.gold -= price;
  careerAddPurchase(character, price);
  applyJourneyEvent(character, {
    source: 'farm',
    type: 'gold_spent_merchant',
    amount: price,
    itemsBought: true,
  });
  unlockPet(character, petId);

  // Limpa lixo fora da classe imediatamente ao ativar gato/papagaio.
  let sold = { count: 0, gold: 0 };
  if (petHas(character, 'autoSellWrongClass')) {
    sold = sellWrongClassItems(character);
  }

  return { price, petId, pets: ensurePets(character), sold };
}

export function sortInventory(character) {
  const slotOrder = (i) => SLOTS.indexOf(getTemplate(i.templateId).slot);
  character.inventory.sort(
    (a, b) =>
      slotOrder(a) - slotOrder(b) ||
      rarityRank(b.rarity) - rarityRank(a.rarity) ||
      getTemplate(b.templateId).tier - getTemplate(a.templateId).tier,
  );
}

/** Itens de ritual nunca são auto-vendidos (mochila cheia). */
export function isProtectedLoot(item) {
  return item?.templateId === SUCO_CELESTIAL_TEMPLATE_ID;
}


/**
 * Retorna `{ added: true }` ou, com mochila cheia, vende na hora e retorna o gold.
 * Exceção: Suco Celestial e outros protegidos → `{ added: false, gold: 0, held: true }`.
 */
/** Consolida stacks duplicados (ex.: Poção de Vida) em um único slot. */
function mergeStackableInventory(character) {
  const byTid = new Map();
  const next = [];
  for (const item of character.inventory) {
    const t = getTemplate(item.templateId);
    if (!t?.stackable) {
      next.push(item);
      continue;
    }
    const qty = itemQty(item);
    const existing = byTid.get(item.templateId);
    if (existing) {
      existing.qty = itemQty(existing) + qty;
    } else {
      item.qty = qty;
      byTid.set(item.templateId, item);
      next.push(item);
    }
  }
  character.inventory = next;
}

export function addItem(character, item) {
  const t = getTemplate(item?.templateId);
  if (t?.stackable) {
    const qtyToAdd = itemQty(item);
    const existing = character.inventory.find((i) => i.templateId === item.templateId);
    if (existing) {
      existing.qty = itemQty(existing) + qtyToAdd;
      return { added: true, gold: 0, stacked: true };
    }
    item.qty = qtyToAdd;
  }
  if (character.inventory.length < inventoryCapacity(character)) {
    character.inventory.push(item);
    return { added: true, gold: 0 };
  }
  // Bag-full: Suco / protegidos / locked nunca liquidados. Demais: regra econômica atual.
  if (isProtectedLoot(item) || isItemLocked(item)) {
    return { added: false, gold: 0, held: true };
  }
  const gold = sellPrice(item);
  character.gold += gold;
  return { added: false, gold };
}

/** Compra expansão de mochila no mercador (server-side). */
export function buyBagUpgrade(character) {
  ensureGear(character);
  if (bagUpgradesOf(character) >= MAX_BAG_UPGRADES) {
    throw new Error('Sua mochila já está no tamanho máximo');
  }
  const price = getBagUpgradePrice();
  if (character.gold < price) {
    throw new Error(`Ouro insuficiente (precisa de ${price.toLocaleString('pt-BR')})`);
  }
  character.gold -= price;
  careerAddPurchase(character, price);
  applyJourneyEvent(character, {
    source: 'farm',
    type: 'gold_spent_merchant',
    amount: price,
    itemsBought: true,
  });
  character.bagUpgrades = bagUpgradesOf(character) + 1;
  return {
    price,
    bagUpgrades: character.bagUpgrades,
    inventorySize: inventoryCapacity(character),
  };
}

/** Compra Refinador no mercador (ilimitado; exige espaço na mochila). */
export function buyRefiner(character) {
  ensureGear(character);
  const price = getRefinerPrice();
  if (character.gold < price) {
    throw new Error(`Ouro insuficiente (precisa de ${price.toLocaleString('pt-BR')})`);
  }
  if (character.inventory.length >= inventoryCapacity(character)) {
    throw new Error('Mochila cheia — liberte um espaço antes de comprar o Refinador');
  }
  character.gold -= price;
  const item = createItem(REFINER_TEMPLATE_ID, 'epic', 1);
  const result = addItem(character, item);
  if (!result.added) {
    character.gold += price;
    throw new Error('Não foi possível adicionar o Refinador à mochila');
  }
  careerAddPurchase(character, price);
  applyJourneyEvent(character, {
    source: 'farm',
    type: 'gold_spent_merchant',
    amount: price,
    itemsBought: true,
  });
  return { price, item: publicItem(item) };
}

/** Compra Reset de Pontos no mercador (ilimitado; exige espaço na mochila). */
export function buyAttributeReset(character) {
  ensureGear(character);
  const price = getAttrResetPrice();
  if (character.gold < price) {
    throw new Error(`Ouro insuficiente (precisa de ${price.toLocaleString('pt-BR')})`);
  }
  if (character.inventory.length >= inventoryCapacity(character)) {
    throw new Error('Mochila cheia — liberte um espaço antes de comprar o Reset de Pontos');
  }
  character.gold -= price;
  const item = createItem(ATTR_RESET_TEMPLATE_ID, 'epic', 1);
  const result = addItem(character, item);
  if (!result.added) {
    character.gold += price;
    throw new Error('Não foi possível adicionar o Reset de Pontos à mochila');
  }
  careerAddPurchase(character, price);
  applyJourneyEvent(character, {
    source: 'farm',
    type: 'gold_spent_merchant',
    amount: price,
    itemsBought: true,
  });
  return { price, item: publicItem(item) };
}

/** Esvazia mochila e equipamento; `ensureGear` devolve a arma inicial. */
export function clearInventory(character) {
  character.inventory = [];
  character.equipment = {};
  character.starterGiven = false;
  ensureGear(character);
}

function findItemAnywhere(character, uid) {
  const invIdx = character.inventory.findIndex((i) => i.uid === uid);
  if (invIdx >= 0) return { item: character.inventory[invIdx], where: 'inventory', invIdx, slot: null };
  for (const [slot, item] of Object.entries(character.equipment || {})) {
    if (item?.uid === uid) return { item, where: 'equipment', invIdx: -1, slot };
  }
  throw new Error('Item não encontrado');
}

/**
 * Consome 1 Refinador e aplica +1 refine no item alvo (máx +10).
 * Cada nível: +REFINE_STAT_BONUS nos refineTargets do template.
 */
export function refineItem(character, targetUid) {
  ensureGear(character);
  const refinerIdx = character.inventory.findIndex((i) => i.templateId === REFINER_TEMPLATE_ID);
  if (refinerIdx < 0) throw new Error('Você precisa de um Refinador na mochila');
  const found = findItemAnywhere(character, targetUid);
  const t = getTemplate(found.item.templateId);
  if (!t || t.consumable || t.slot === 'consumable') {
    throw new Error('Não é possível refinar este item');
  }
  const current = Math.max(0, Math.floor(Number(found.item.refineLevel) || 0));
  if (current >= MAX_REFINE) throw new Error(`Refine máximo (+${MAX_REFINE})`);
  character.inventory.splice(refinerIdx, 1);
  found.item.refineLevel = current + 1;
  // Refine atual não tem falha no motor — só sucesso confiável.
  applyJourneyEvent(character, { source: 'farm', type: 'refine', success: true });
  const targets = (t.refineTargets || []).length
    ? t.refineTargets
    : ['str', 'dex', 'int', 'con'].filter((k) => (t.stats || {})[k] > 0);
  return {
    item: publicItem(found.item),
    refineLevel: found.item.refineLevel,
    bonusPerLevel: REFINE_STAT_BONUS,
    targets,
    message: `${t.name} agora está +${found.item.refineLevel}`,
  };
}

export function publicGear(character) {
  ensureGear(character);
  const equipment = {};
  for (const [slot, item] of Object.entries(character.equipment)) {
    if (item) equipment[slot] = publicItem(item);
  }
  const upgrades = bagUpgradesOf(character);
  return {
    inventory: character.inventory.map(publicItem),
    inventorySize: inventoryCapacity(character),
    bagUpgrades: upgrades,
    bagUpgradeMax: MAX_BAG_UPGRADES,
    equipment,
    canUseOffhand: canUseOffhand(character.classId),
  };
}
