// @ts-nocheck
import { randomUUID } from 'crypto';
import { getBalanceOverrides, setBalanceOverrides, REFINE_STAT_BONUS } from './balance';
import { getZoneOverrides, setZoneOverrides, refreshZones } from './data';
import { applyGameMaintenance, maintenanceSnapshot } from './maintenance';
import {
  HUD_CONFIG_KEY,
  applyHudCatalogPayload,
  getHudCatalogPayload,
} from '../hud-layout';

export const SLOTS = ['weapon', 'offhand', 'head', 'chest', 'legs', 'gloves', 'boots', 'ring', 'necklace', 'consumable'];
/** @deprecated use BAG_BASE_SLOTS — mantido para imports antigos. */
export const INVENTORY_SIZE = 20;
export const BAG_BASE_SLOTS = 20;
export const BAG_UPGRADE_SLOTS = 20;
/** No 1º momento: 1 compra libera a página 2 (40 slots). */
export const MAX_BAG_UPGRADES = 1;
export const DEFAULT_BAG_UPGRADE_PRICE = 150_000;
/** Preço default do Refinador no mercador (admin pode sobrescrever). */
export const DEFAULT_REFINER_PRICE = 25_000;
/** Preço default do Reset de Pontos no mercador (admin pode sobrescrever). */
export const DEFAULT_ATTR_RESET_PRICE = 1_000_000;
/** Preços default dos pets no mercador (admin pode sobrescrever). */
export const DEFAULT_PET_DOG_PRICE = 40_000;
export const DEFAULT_PET_CAT_PRICE = 40_000;
/** >2× do maior individual (40k). */
export const DEFAULT_PET_PARROT_PRICE = 100_000;
/** Drop base em trash; boss usa × bossDropMult (~2.5). Leve escassez vs 0.14 legado. */
export const DROP_CHANCE = 0.11;
export const MERCHANT_CONFIG_KEY = '__merchant';
/** Evento global de engajamento (admin) — xp/gold/drop extras até endsAt. */
export const ENGAGEMENT_EVENT_KEY = '__engagement_event';
/** Overrides de mundo (balance + zonas). */
export const WORLD_CONFIG_KEY = '__world';
export { HUD_CONFIG_KEY };
/** Template id do consumível Refinador. */
export const REFINER_TEMPLATE_ID = 'consumable_refiner';
/** Template id do consumível Reset de Pontos (respec de atributos). */
export const ATTR_RESET_TEMPLATE_ID = 'consumable_attr_reset';
export const SUCO_CELESTIAL_TEMPLATE_ID = 'consumable_suco_celestial';
/** Tiers 14+ (Éter / Estelar / Nexus) exigem ascensão Celestial. */
export const CELESTIAL_GEAR_MIN_TIER = 14;

/** SKUs oficiais do mercador (preço + toggle de venda). */
export const MERCHANT_OFFER_SKUS = [
  'bag_upgrade',
  'refiner',
  'attr_reset',
  'pet_dog',
  'pet_cat',
  'pet_parrot',
];

export const DEFAULT_MERCHANT_OFFERS_ENABLED = Object.freeze({
  bag_upgrade: true,
  refiner: true,
  attr_reset: true,
  pet_dog: true,
  pet_cat: true,
  pet_parrot: true,
});

/** @type {{ label: string, xpMult: number, goldMult: number, dropMult: number, endsAt: string } | null} */
let engagementEvent = null;

export const CLASS_IDS = ['GUERREIRO', 'BARBARO', 'MAGO', 'ARQUEIRO'];
export const ICONS = ['sword', 'greatsword', 'shield', 'wand', 'staff', 'book', 'crossbow', 'dagger', 'head', 'chest', 'legs', 'gloves', 'boots', 'ring', 'necklace'];

/**
 * KayKit Fantasy Weapons Bits 1.0 FREE (CC0).
 * Ícone 3D no inventário (`fw_*`). Sem retarget no skeleton dos Adventurers.
 * `weapons[0]` de cada classe continua sendo a arma inicial embutida.
 */
const FANTASY_WEAPON_DEFS = [
  { id: 'fw_sword_A', label: 'Espada curta', name: 'Espada Curta', classId: 'GUERREIRO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1, dex: 0.45 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_sword_B', label: 'Espada reta', name: 'Espada Reta', classId: 'GUERREIRO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1, dex: 0.45 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_sword_C', label: 'Florete', name: 'Florete', classId: 'GUERREIRO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 0.7, dex: 0.85 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_sword_D', label: 'Espada bastarda', name: 'Espada Bastarda', classId: 'GUERREIRO', slot: 'weapon', icon: 'greatsword', material: 'metal', twoHanded: true, stats: { str: 1.4, dex: 0.35 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_sword_E', label: 'Claymore', name: 'Claymore', classId: 'GUERREIRO', slot: 'weapon', icon: 'greatsword', material: 'metal', twoHanded: true, stats: { str: 1.55, dex: 0.25 }, refineTargets: ['str'] },
  { id: 'fw_dagger_A', label: 'Punhal', name: 'Punhal', classId: 'GUERREIRO', slot: 'weapon', icon: 'dagger', material: 'metal', twoHanded: false, stats: { str: 0.45, dex: 1.1 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_dagger_B', label: 'Adaga curva', name: 'Adaga Curva', classId: 'GUERREIRO', slot: 'weapon', icon: 'dagger', material: 'metal', twoHanded: false, stats: { str: 0.45, dex: 1.1 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_spear_A', label: 'Lança', name: 'Lança', classId: 'GUERREIRO', slot: 'weapon', icon: 'greatsword', material: 'metal', twoHanded: true, stats: { str: 1.25, dex: 0.55 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_halberd', label: 'Alabarda', name: 'Alabarda', classId: 'GUERREIRO', slot: 'weapon', icon: 'greatsword', material: 'metal', twoHanded: true, stats: { str: 1.6, dex: 0.25 }, refineTargets: ['str'] },
  { id: 'fw_shield_A', label: 'Broquel', name: 'Broquel', classId: 'GUERREIRO', slot: 'offhand', icon: 'shield', material: 'metal', stats: { con: 1.05, int: 0.2 }, refineTargets: ['con'] },
  { id: 'fw_shield_B', label: 'Escudo oval', name: 'Escudo Oval', classId: 'GUERREIRO', slot: 'offhand', icon: 'shield', material: 'metal', stats: { con: 1.2, int: 0.2 }, refineTargets: ['con'] },
  { id: 'fw_shield_C', label: 'Escudo torre', name: 'Escudo Torre', classId: 'GUERREIRO', slot: 'offhand', icon: 'shield', material: 'metal', stats: { con: 1.35, int: 0.15 }, refineTargets: ['con'] },
  { id: 'fw_axe_A', label: 'Machado curto', name: 'Machado Curto', classId: 'BARBARO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1.2, dex: 0.35 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_axe_B', label: 'Machado de mão', name: 'Machado de Mão', classId: 'BARBARO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1.25, dex: 0.3 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_axe_C', label: 'Machado largo', name: 'Machado Largo', classId: 'BARBARO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1.35, dex: 0.25 }, refineTargets: ['str'] },
  { id: 'fw_hammer_A', label: 'Martelo', name: 'Martelo', classId: 'BARBARO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1.2, dex: 0.3 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_hammer_B', label: 'Martelo de guerra', name: 'Martelo de Guerra', classId: 'BARBARO', slot: 'weapon', icon: 'greatsword', material: 'metal', twoHanded: false, stats: { str: 1.35, dex: 0.25 }, refineTargets: ['str'] },
  { id: 'fw_hammer_C', label: 'Marreta', name: 'Marreta', classId: 'BARBARO', slot: 'weapon', icon: 'greatsword', material: 'metal', twoHanded: false, stats: { str: 1.4, dex: 0.2 }, refineTargets: ['str'] },
  { id: 'fw_fistweapon_A', label: 'Manopla', name: 'Manopla', classId: 'BARBARO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1.05, dex: 0.55 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_fistweapon_A_stacked', label: 'Manoplas', name: 'Manoplas', classId: 'BARBARO', slot: 'weapon', icon: 'sword', material: 'metal', twoHanded: false, stats: { str: 1.1, dex: 0.5 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_fistweapon_B', label: 'Garra', name: 'Garra', classId: 'BARBARO', slot: 'weapon', icon: 'dagger', material: 'metal', twoHanded: false, stats: { str: 0.9, dex: 0.7 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_fistweapon_B_stacked', label: 'Garras', name: 'Garras', classId: 'BARBARO', slot: 'weapon', icon: 'dagger', material: 'metal', twoHanded: false, stats: { str: 0.95, dex: 0.65 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_wand_A', label: 'Varinha rúnica', name: 'Varinha Rúnica', classId: 'MAGO', slot: 'weapon', icon: 'wand', material: 'wood', twoHanded: false, stats: { int: 1.05, mp: 0.8 }, refineTargets: ['int'] },
  { id: 'fw_staff_A', label: 'Cajado rúnico', name: 'Cajado Rúnico', classId: 'MAGO', slot: 'weapon', icon: 'staff', material: 'wood', twoHanded: true, stats: { int: 1.55, mp: 1.2 }, refineTargets: ['int'] },
  { id: 'fw_staff_B', label: 'Cajado longo', name: 'Cajado Longo', classId: 'MAGO', slot: 'weapon', icon: 'staff', material: 'wood', twoHanded: true, stats: { int: 1.45, mp: 1.35 }, refineTargets: ['int'] },
  { id: 'fw_bow_A', label: 'Arco', name: 'Arco', classId: 'ARQUEIRO', slot: 'weapon', icon: 'crossbow', material: 'wood', twoHanded: true, stats: { str: 0.55, dex: 1.2 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_bow_A_withString', label: 'Arco armado', name: 'Arco Armado', classId: 'ARQUEIRO', slot: 'weapon', icon: 'crossbow', material: 'wood', twoHanded: true, stats: { str: 0.6, dex: 1.25 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_bow_B', label: 'Arco longo', name: 'Arco Longo', classId: 'ARQUEIRO', slot: 'weapon', icon: 'crossbow', material: 'wood', twoHanded: true, stats: { str: 0.7, dex: 1.4 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_bow_B_withString', label: 'Arco longo armado', name: 'Arco Longo Armado', classId: 'ARQUEIRO', slot: 'weapon', icon: 'crossbow', material: 'wood', twoHanded: true, stats: { str: 0.7, dex: 1.45 }, refineTargets: ['str', 'dex'] },
  { id: 'fw_arrow_A', label: 'Flecha', name: 'Flecha', classId: 'ARQUEIRO', slot: 'weapon', icon: 'dagger', material: 'wood', twoHanded: false, stats: { str: 0.35, dex: 1.05 }, refineTargets: ['dex'] },
  { id: 'fw_arrow_B', label: 'Flecha larga', name: 'Flecha Larga', classId: 'ARQUEIRO', slot: 'weapon', icon: 'dagger', material: 'wood', twoHanded: false, stats: { str: 0.45, dex: 1 }, refineTargets: ['dex'] },
];

/** KayKit RPG Tools Bits 1.0 FREE (CC0). Não substitui tool_key / tool_skull / tool_lantern. */
const RPG_TOOL_VISUALS = [
  { id: 'tool_anvil', label: 'Bigorna', slots: ['consumable'] },
  { id: 'tool_axe', label: 'Machado de lenha', slots: ['consumable'] },
  { id: 'tool_blueprint', label: 'Planta', slots: ['consumable'] },
  { id: 'tool_blueprint_stacked', label: 'Plantas empilhadas', slots: ['consumable'] },
  { id: 'tool_bucket_metal', label: 'Balde de metal', slots: ['consumable'] },
  { id: 'tool_chisel', label: 'Formão', slots: ['consumable'] },
  { id: 'tool_compass_base', label: 'Bússola', slots: ['ring', 'necklace', 'consumable'] },
  { id: 'tool_drafting_compass', label: 'Compasso', slots: ['ring', 'consumable'] },
  { id: 'tool_file', label: 'Lima', slots: ['consumable'] },
  { id: 'tool_grindstone', label: 'Rebolo', slots: ['consumable'] },
  { id: 'tool_hammer', label: 'Martelo de ferreiro', slots: ['consumable'] },
  { id: 'tool_handdrill', label: 'Furadeira manual', slots: ['consumable'] },
  { id: 'tool_handplane', label: 'Plaina', slots: ['consumable'] },
  { id: 'tool_journal_closed', label: 'Diário fechado', slots: ['consumable'] },
  { id: 'tool_journal_open', label: 'Diário aberto', slots: ['consumable'] },
  { id: 'tool_knife', label: 'Faca de ofício', slots: ['consumable'] },
  { id: 'tool_magnifying_glass', label: 'Lupa', slots: ['ring', 'consumable'] },
  { id: 'tool_mallet', label: 'Macete', slots: ['consumable'] },
  { id: 'tool_map', label: 'Mapa', slots: ['consumable'] },
  { id: 'tool_map_empty', label: 'Mapa em branco', slots: ['consumable'] },
  { id: 'tool_map_rolled', label: 'Mapa enrolado', slots: ['consumable'] },
  { id: 'tool_nail', label: 'Prego', slots: ['consumable'] },
  { id: 'tool_pencil_A_long', label: 'Lápis longo', slots: ['consumable'] },
  { id: 'tool_pencil_A_short', label: 'Lápis curto', slots: ['consumable'] },
  { id: 'tool_pencil_B_long', label: 'Lápis longo (B)', slots: ['consumable'] },
  { id: 'tool_pencil_B_short', label: 'Lápis curto (B)', slots: ['consumable'] },
  { id: 'tool_pickaxe', label: 'Picareta', slots: ['consumable'] },
  { id: 'tool_rope_bundle_A', label: 'Rolo de corda', slots: ['consumable'] },
  { id: 'tool_rope_bundle_B', label: 'Feixe de corda', slots: ['consumable'] },
  { id: 'tool_saw', label: 'Serrote', slots: ['consumable'] },
  { id: 'tool_scissors', label: 'Tesoura', slots: ['consumable'] },
  { id: 'tool_screw_A', label: 'Parafuso', slots: ['consumable'] },
  { id: 'tool_screw_B', label: 'Parafuso largo', slots: ['consumable'] },
  { id: 'tool_screwdriver_A_long', label: 'Chave de fenda longa', slots: ['consumable'] },
  { id: 'tool_screwdriver_A_long_color', label: 'Chave de fenda longa colorida', slots: ['consumable'] },
  { id: 'tool_screwdriver_A_short', label: 'Chave de fenda curta', slots: ['consumable'] },
  { id: 'tool_screwdriver_A_short_color', label: 'Chave de fenda curta colorida', slots: ['consumable'] },
  { id: 'tool_screwdriver_B_long', label: 'Chave Phillips longa', slots: ['consumable'] },
  { id: 'tool_screwdriver_B_long_color', label: 'Chave Phillips longa colorida', slots: ['consumable'] },
  { id: 'tool_screwdriver_B_short', label: 'Chave Phillips curta', slots: ['consumable'] },
  { id: 'tool_screwdriver_B_short_color', label: 'Chave Phillips curta colorida', slots: ['consumable'] },
  { id: 'tool_shovel', label: 'Pá', slots: ['consumable'] },
  { id: 'tool_tongs', label: 'Tenaz', slots: ['consumable'] },
  { id: 'tool_torch', label: 'Tocha', slots: ['consumable'] },
  { id: 'tool_torch_burnt', label: 'Tocha apagada', slots: ['consumable'] },
  { id: 'tool_trowel', label: 'Colher de pedreiro', slots: ['consumable'] },
  { id: 'tool_wrench_A', label: 'Chave inglesa', slots: ['consumable'] },
  { id: 'tool_wrench_B', label: 'Chave de boca', slots: ['consumable'] },
];

export const VISUALS = [
  { id: '1H_Sword', label: 'Espada (1 mão)', slots: ['weapon'] },
  { id: '2H_Sword', label: 'Montante (2 mãos)', slots: ['weapon'] },
  { id: '1H_Axe', label: 'Machado (1 mão)', slots: ['weapon'] },
  { id: '2H_Axe', label: 'Machado (2 mãos)', slots: ['weapon'] },
  { id: '1H_Axe_Offhand', label: 'Machado (mão secundária)', slots: ['weapon', 'offhand'] },
  { id: '1H_Wand', label: 'Varinha', slots: ['weapon'] },
  { id: '2H_Staff', label: 'Cajado (2 mãos)', slots: ['weapon'] },
  { id: '1H_Crossbow', label: 'Besta leve', slots: ['weapon'] },
  { id: '2H_Crossbow', label: 'Besta pesada', slots: ['weapon'] },
  { id: 'Round_Shield', label: 'Escudo redondo', slots: ['offhand'] },
  { id: 'Badge_Shield', label: 'Escudo com brasão', slots: ['offhand'] },
  { id: 'Rectangle_Shield', label: 'Escudo retangular', slots: ['offhand'] },
  { id: 'Spike_Shield', label: 'Escudo com espinhos', slots: ['offhand'] },
  { id: 'Barbarian_Round_Shield', label: 'Escudo bárbaro', slots: ['offhand'] },
  { id: 'Spellbook', label: 'Grimório', slots: ['offhand'] },
  { id: 'Spellbook_open', label: 'Grimório aberto', slots: ['offhand'] },
  { id: '1H_Sword_Offhand', label: 'Adaga (1 mão)', slots: ['weapon', 'offhand'] },
  { id: 'Knife_Offhand', label: 'Adaga (secundária)', slots: ['weapon', 'offhand'] },
  { id: 'Knife', label: 'Faca', slots: ['weapon', 'offhand'] },
  { id: 'Throwable', label: 'Arremesso', slots: ['weapon'] },
  /** Anel procedural (torus+gema) — não usar tool_key como anel. */
  { id: 'jewel_ring', label: 'Anel (joia)', slots: ['ring'] },
  /** Standalone: dungeon/halloween (tool_key/skull/lantern) + RPG Tools FREE + Fantasy Weapons FREE */
  { id: 'tool_key', label: 'Chave', slots: ['necklace', 'consumable'] },
  { id: 'tool_lantern', label: 'Lanterna', slots: ['necklace', 'consumable'] },
  { id: 'tool_skull', label: 'Caveira ritual', slots: ['necklace', 'consumable'] },
  { id: 'tool_chest', label: 'Baú dourado', slots: ['consumable'] },
  { id: 'tool_candle', label: 'Vela', slots: ['consumable'] },
  { id: 'tool_sword_shield', label: 'Espada e escudo', slots: ['ring'] },
  /** Custom Blender em public/jogo-idle/assets/custom/*.glb */
  { id: 'custom_elmo_mago', label: 'Elmo do Mago (custom)', slots: ['head'] },
  { id: 'custom_peito_mago', label: 'Peitoral do Mago (custom)', slots: ['chest'] },
  { id: 'custom_calca_mago', label: 'Calças do Mago (custom)', slots: ['legs'] },
  { id: 'custom_luva_mago', label: 'Luvas do Mago (custom)', slots: ['gloves'] },
  { id: 'custom_bota_mago', label: 'Botas do Mago (custom)', slots: ['boots'] },
  { id: 'custom_elmo_guerreiro', label: 'Elmo do Guerreiro (custom)', slots: ['head'] },
  { id: 'custom_peito_guerreiro', label: 'Peitoral do Guerreiro (custom)', slots: ['chest'] },
  { id: 'custom_calca_guerreiro', label: 'Grevas do Guerreiro (custom)', slots: ['legs'] },
  { id: 'custom_luva_guerreiro', label: 'Manoplas do Guerreiro (custom)', slots: ['gloves'] },
  { id: 'custom_bota_guerreiro', label: 'Botas do Guerreiro (custom)', slots: ['boots'] },
  { id: 'custom_elmo_barbaro', label: 'Elmo do Bárbaro (custom)', slots: ['head'] },
  { id: 'custom_peito_barbaro', label: 'Peitoral do Bárbaro (custom)', slots: ['chest'] },
  { id: 'custom_calca_barbaro', label: 'Calças do Bárbaro (custom)', slots: ['legs'] },
  { id: 'custom_luva_barbaro', label: 'Luvas do Bárbaro (custom)', slots: ['gloves'] },
  { id: 'custom_bota_barbaro', label: 'Botas do Bárbaro (custom)', slots: ['boots'] },
  { id: 'custom_elmo_arqueiro', label: 'Elmo do Arqueiro (custom)', slots: ['head'] },
  { id: 'custom_peito_arqueiro', label: 'Peitoral do Arqueiro (custom)', slots: ['chest'] },
  { id: 'custom_calca_arqueiro', label: 'Calças do Arqueiro (custom)', slots: ['legs'] },
  { id: 'custom_luva_arqueiro', label: 'Luvas do Arqueiro (custom)', slots: ['gloves'] },
  { id: 'custom_bota_arqueiro', label: 'Botas do Arqueiro (custom)', slots: ['boots'] },
  { id: 'custom_machado_1', label: 'Machado (custom)', slots: ['weapon'] },
  { id: 'custom_anel_1', label: 'Anel 1 (custom)', slots: ['ring'] },
  { id: 'custom_anel_2', label: 'Anel 2 (custom)', slots: ['ring'] },
  ...FANTASY_WEAPON_DEFS.map((d) => ({
    id: d.id,
    label: d.label,
    slots: d.slot === 'offhand' ? ['offhand'] : ['weapon'],
  })),
  ...RPG_TOOL_VISUALS,
];

/** Armadura custom por classe/slot → visualId `custom_*` (GLB em assets/custom). */
const CUSTOM_ARMOR_VISUAL = {
  MAGO: {
    head: 'custom_elmo_mago',
    chest: 'custom_peito_mago',
    legs: 'custom_calca_mago',
    gloves: 'custom_luva_mago',
    boots: 'custom_bota_mago',
  },
  GUERREIRO: {
    head: 'custom_elmo_guerreiro',
    chest: 'custom_peito_guerreiro',
    legs: 'custom_calca_guerreiro',
    gloves: 'custom_luva_guerreiro',
    boots: 'custom_bota_guerreiro',
  },
  BARBARO: {
    head: 'custom_elmo_barbaro',
    chest: 'custom_peito_barbaro',
    legs: 'custom_calca_barbaro',
    gloves: 'custom_luva_barbaro',
    boots: 'custom_bota_barbaro',
  },
  ARQUEIRO: {
    head: 'custom_elmo_arqueiro',
    chest: 'custom_peito_arqueiro',
    legs: 'custom_calca_arqueiro',
    gloves: 'custom_luva_arqueiro',
    boots: 'custom_bota_arqueiro',
  },
};

export const RARITIES = {
  common: { name: 'Comum', mult: 1, weight: 600, sell: 1 },
  uncommon: { name: 'Incomum', mult: 1.25, weight: 260, sell: 1.5 },
  rare: { name: 'Raro', mult: 1.6, weight: 100, sell: 3 },
  epic: { name: 'Épico', mult: 2.1, weight: 32, sell: 7 },
  legendary: { name: 'Lendário', mult: 2.8, weight: 8, sell: 20 },
};
const RARITY_ORDER = Object.keys(RARITIES);

/** Nível mínimo de cada tier — acompanha o nível das zonas (até Celestial). */
export const TIER_LEVELS = [1, 10, 25, 35, 50, 70, 90, 120, 180, 250, 320, 400, 450, 500, 560, 620];

const MATERIALS = {
  metal: [
    'Ferro', 'Aço', 'Prata', 'Obsidiana', 'Escamas de Dragão', 'Gelo Eterno', 'Abismo',
    'Adamante', 'Magma', 'Osso Negro', 'Névoa', 'Relíquia', 'Trono', 'Éter', 'Estelar', 'Nexus',
  ],
  wood: [
    'Carvalho', 'Freixo', 'Runas', 'Obsidiana', 'Chamas', 'Geada', 'Abismo',
    'Carvalho Ancestral', 'Cinzas', 'Ébano', 'Névoa', 'Relíquia', 'Trono', 'Éter', 'Estelar', 'Nexus',
  ],
  cloth: [
    'Linho', 'Seda', 'Runas', 'Sombras', 'Chamas', 'Geada', 'Abismo',
    'Veludo', 'Brasas', 'Mortalha', 'Névoa', 'Relíquia', 'Trono', 'Éter', 'Estelar', 'Nexus',
  ],
  leather: [
    'Couro', 'Couro Curtido', 'Pele de Lobo', 'Escamas', 'Couro de Dragão', 'Pele Glacial', 'Abismo',
    'Couraça', 'Salamandra', 'Couro Profano', 'Névoa', 'Relíquia', 'Trono', 'Éter', 'Estelar', 'Nexus',
  ],
  gem: [
    'Cobre', 'Prata', 'Ouro', 'Ônix', 'Dragão', 'Gelo', 'Abismo',
    'Rubi', 'Âmbar', 'Ametista', 'Névoa', 'Relíquia', 'Trono', 'Éter', 'Estelar', 'Nexus',
  ],
};

const SHIELDS = [
  'Round_Shield', 'Badge_Shield', 'Rectangle_Shield', 'Rectangle_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield',
  'Spike_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield', 'Spike_Shield',
];

/** Armaduras: INT + CON (roupas). */
const ARMOR_PARTS = {
  head: { int: 0.35, con: 0.55 },
  chest: { int: 0.55, con: 1 },
  legs: { int: 0.4, con: 0.75 },
  gloves: { int: 0.45, con: 0.35 },
  boots: { int: 0.3, con: 0.5 },
};

function fantasyGear(classId, slot) {
  return FANTASY_WEAPON_DEFS.filter((d) => d.classId === classId && d.slot === slot).map((d) => ({
    key: d.id,
    name: d.name,
    material: d.material,
    visual: d.slot === 'offhand' ? () => d.id : d.id,
    icon: d.icon,
    twoHanded: Boolean(d.twoHanded),
    stats: d.stats,
    refineTargets: d.refineTargets,
  }));
}

const CLASS_GEAR = {
  GUERREIRO: {
    armor: { material: 'metal', int: 0.7, con: 1.25, names: { head: 'Elmo', chest: 'Peitoral', legs: 'Grevas', gloves: 'Manoplas', boots: 'Botas' } },
    weapons: [
      { key: 'espada', name: 'Espada', material: 'metal', visual: '1H_Sword', icon: 'sword', stats: { str: 1, dex: 0.45 }, refineTargets: ['str', 'dex'] },
      { key: 'montante', name: 'Montante', material: 'metal', visual: '2H_Sword', icon: 'greatsword', twoHanded: true, stats: { str: 1.55, dex: 0.25 }, refineTargets: ['str', 'dex'] },
      { key: 'adaga', name: 'Adaga', material: 'metal', visual: '1H_Sword_Offhand', icon: 'dagger', stats: { str: 0.45, dex: 1.1 }, refineTargets: ['str', 'dex'] },
      ...fantasyGear('GUERREIRO', 'weapon'),
    ],
    offhand: { key: 'escudo', name: 'Escudo', material: 'metal', visual: (t) => SHIELDS[t - 1], icon: 'shield', stats: { con: 1.2, int: 0.2 }, refineTargets: ['con'] },
    extraOffhands: fantasyGear('GUERREIRO', 'offhand'),
  },
  BARBARO: {
    armor: { material: 'leather', int: 0.55, con: 1.35, names: { head: 'Capuz', chest: 'Pele', legs: 'Calças', gloves: 'Braceletes', boots: 'Botas' } },
    weapons: [
      { key: 'machado', name: 'Machado', material: 'metal', visual: 'custom_machado_1', icon: 'sword', stats: { str: 1.2, dex: 0.35 }, refineTargets: ['str', 'dex'] },
      { key: 'machado_pesado', name: 'Machado Pesado', material: 'metal', visual: 'custom_machado_1', icon: 'greatsword', twoHanded: true, stats: { str: 1.7, dex: 0.2 }, refineTargets: ['str'] },
      ...fantasyGear('BARBARO', 'weapon'),
    ],
    offhand: {
      key: 'escudo_barbaro',
      name: 'Escudo Bárbaro',
      material: 'leather',
      visual: () => 'Barbarian_Round_Shield',
      icon: 'shield',
      stats: { con: 1.1, str: 0.35 },
      refineTargets: ['con', 'str'],
    },
  },
  MAGO: {
    armor: { material: 'cloth', int: 1.2, con: 0.75, names: { head: 'Chapéu', chest: 'Manto', legs: 'Calças', gloves: 'Luvas', boots: 'Sandálias' } },
    weapons: [
      { key: 'varinha', name: 'Varinha', material: 'wood', visual: '1H_Wand', icon: 'wand', stats: { int: 1.05, mp: 0.8 }, refineTargets: ['int'] },
      { key: 'cajado', name: 'Cajado', material: 'wood', visual: '2H_Staff', icon: 'staff', twoHanded: true, stats: { int: 1.55, mp: 1.2 }, refineTargets: ['int'] },
      {
        key: 'fenix',
        name: 'Fênix',
        material: 'wood',
        visual: '1H_Wand',
        icon: 'wand',
        stats: { int: 0.95, mp: 0.65 },
        refineTargets: ['int'],
        element: 'fire',
      },
      {
        key: 'zeus',
        name: 'Zeus',
        material: 'wood',
        visual: '1H_Wand',
        icon: 'wand',
        stats: { int: 0.95, mp: 0.65 },
        refineTargets: ['int'],
        element: 'lightning',
      },
      {
        key: 'nevasca',
        name: 'Nevasca',
        material: 'wood',
        visual: '1H_Wand',
        icon: 'wand',
        stats: { int: 0.95, mp: 0.65 },
        refineTargets: ['int'],
        element: 'ice',
      },
      ...fantasyGear('MAGO', 'weapon'),
    ],
    offhand: {
      key: 'grimorio',
      name: 'Grimório',
      material: 'cloth',
      visual: (t) => (t >= 8 ? 'Spellbook_open' : 'Spellbook'),
      icon: 'book',
      stats: { int: 1.15, mp: 0.9 },
      refineTargets: ['int'],
    },
  },
  ARQUEIRO: {
    armor: { material: 'leather', int: 0.7, con: 0.95, names: { head: 'Capuz', chest: 'Colete', legs: 'Calças', gloves: 'Luvas', boots: 'Botas' } },
    weapons: [
      { key: 'besta_leve', name: 'Besta Leve', material: 'wood', visual: '1H_Crossbow', icon: 'crossbow', stats: { str: 0.55, dex: 1.15 }, refineTargets: ['str', 'dex'] },
      { key: 'besta', name: 'Besta Pesada', material: 'wood', visual: '2H_Crossbow', icon: 'crossbow', twoHanded: true, stats: { str: 0.7, dex: 1.45 }, refineTargets: ['str', 'dex'] },
      ...fantasyGear('ARQUEIRO', 'weapon'),
    ],
    offhand: {
      key: 'adaga_secundaria',
      name: 'Adaga Secundária',
      material: 'metal',
      visual: () => 'Knife_Offhand',
      icon: 'dagger',
      stats: { dex: 1.1, str: 0.35 },
      refineTargets: ['dex'],
    },
  },
};

const JEWELRY = [
  {
    key: 'anel',
    slot: 'ring',
    name: 'Anel',
    icon: 'ring',
    visual: 'custom_anel_1',
    stats: { str: 0.4, dex: 0.55 },
    refineTargets: ['str', 'dex'],
  },
  {
    key: 'colar',
    slot: 'necklace',
    name: 'Colar',
    icon: 'necklace',
    visual: 'tool_lantern',
    stats: { int: 0.5, con: 0.55 },
    refineTargets: ['int', 'con'],
  },
];

/** Joias só-mago com bônus % na skill elemental. */
const MAGE_JEWELRY = [
  {
    key: 'anel_fogo',
    slot: 'ring',
    name: 'Anel da Fênix',
    icon: 'ring',
    visual: 'custom_anel_2',
    stats: { int: 0.35, mp: 0.25 },
    refineTargets: ['int'],
    element: 'fire',
    classes: ['MAGO'],
  },
  {
    key: 'anel_raio',
    slot: 'ring',
    name: 'Anel de Zeus',
    icon: 'ring',
    visual: 'custom_anel_2',
    stats: { int: 0.35, mp: 0.25 },
    refineTargets: ['int'],
    element: 'lightning',
    classes: ['MAGO'],
  },
  {
    key: 'anel_gelo',
    slot: 'ring',
    name: 'Anel da Nevasca',
    icon: 'ring',
    visual: 'custom_anel_2',
    stats: { int: 0.35, mp: 0.25 },
    refineTargets: ['int'],
    element: 'ice',
    classes: ['MAGO'],
  },
];

function weaponElementBonus(tier) {
  return Math.round((0.06 + (tier - 1) * 0.012) * 1000) / 1000;
}

function jewelElementBonus(tier) {
  return Math.round((0.03 + (tier - 1) * 0.006) * 1000) / 1000;
}

const ATTR_STAT_KEYS = ['str', 'dex', 'int', 'con', 'mp', 'attack', 'defense', 'hp', 'crit'];

function baseStat(stat, tier) {
  const t = Math.max(1, tier);
  switch (stat) {
    case 'str':
    case 'dex':
    case 'int':
    case 'con':
      return 2 + Math.pow(t, 1.35) * 2.4;
    case 'mp':
      return 8 + Math.pow(t, 1.3) * 10;
    case 'attack':
      return 5 + Math.pow(t, 1.55) * 6;
    case 'defense':
      return 2 + Math.pow(t, 1.45) * 3;
    case 'hp':
      return 15 + Math.pow(t, 1.5) * 20;
    case 'crit':
      return 1 + t * 0.5;
    default:
      return 0;
  }
}

function scaledStats(weights, tier, extra = {}) {
  const out = {};
  for (const [stat, w] of Object.entries(weights)) {
    out[stat] = baseStat(stat, tier) * w * (extra[stat] ?? 1);
  }
  return out;
}

const CATALOG = new Map();

function add(template) {
  CATALOG.set(template.id, template);
}

for (let tier = 1; tier <= TIER_LEVELS.length; tier++) {
  const level = TIER_LEVELS[tier - 1];
  const price = tier * 12;
  const requiresAscension = tier >= CELESTIAL_GEAR_MIN_TIER ? 'CELESTIAL' : null;

  for (const [classId, gear] of Object.entries(CLASS_GEAR)) {
    for (const w of gear.weapons) {
      add({
        id: `${classId}_${w.key}_t${tier}`,
        name: `${w.name} de ${MATERIALS[w.material][tier - 1]}`,
        slot: 'weapon',
        classes: [classId],
        tier,
        level,
        icon: w.icon,
        visual: w.visual,
        twoHanded: Boolean(w.twoHanded),
        requiresAscension,
        stats: scaledStats(w.stats, tier),
        refineTargets: w.refineTargets || ['str'],
        price: price * (w.twoHanded ? 1.4 : 1),
        ...(w.element
          ? { skillElementBonus: { [w.element]: weaponElementBonus(tier) } }
          : {}),
      });
    }

    const offhands = [gear.offhand, ...(gear.extraOffhands || [])].filter(Boolean);
    for (const o of offhands) {
      add({
        id: `${classId}_${o.key}_t${tier}`,
        name: `${o.name} de ${MATERIALS[o.material][tier - 1]}`,
        slot: 'offhand',
        classes: [classId],
        tier,
        level,
        icon: o.icon,
        visual: typeof o.visual === 'function' ? o.visual(tier) : o.visual,
        requiresAscension,
        stats: scaledStats(o.stats, tier),
        refineTargets: o.refineTargets || ['con'],
        price,
      });
    }

    const a = gear.armor;
    for (const [slot, weights] of Object.entries(ARMOR_PARTS)) {
      const armorVisual = CUSTOM_ARMOR_VISUAL[classId]?.[slot];
      add({
        id: `${classId}_${slot}_t${tier}`,
        name: `${a.names[slot]} de ${MATERIALS[a.material][tier - 1]}`,
        slot,
        classes: [classId],
        tier,
        level,
        icon: slot,
        ...(armorVisual ? { visual: armorVisual } : {}),
        requiresAscension,
        stats: scaledStats(weights, tier, { int: a.int, con: a.con }),
        refineTargets: ['int', 'con'],
        price,
      });
    }
  }

  for (const j of JEWELRY) {
    add({
      id: `${j.key}_t${tier}`,
      name: `${j.name} de ${MATERIALS.gem[tier - 1]}`,
      slot: j.slot,
      classes: Object.keys(CLASS_GEAR),
      tier,
      level,
      icon: j.icon,
      visual: j.visual || null,
      requiresAscension,
      stats: scaledStats(j.stats, tier),
      refineTargets: j.refineTargets || ['str'],
      price: price * 1.2,
    });
  }

  for (const j of MAGE_JEWELRY) {
    add({
      id: `${j.key}_t${tier}`,
      name: `${j.name} de ${MATERIALS.gem[tier - 1]}`,
      slot: j.slot,
      classes: j.classes || ['MAGO'],
      tier,
      level,
      icon: j.icon,
      visual: j.visual || null,
      requiresAscension,
      stats: scaledStats(j.stats, tier),
      refineTargets: j.refineTargets || ['int'],
      price: price * 1.35,
      skillElementBonus: { [j.element]: jewelElementBonus(tier) },
    });
  }
}

add({
  id: REFINER_TEMPLATE_ID,
  name: 'Refinador',
  slot: 'consumable',
  classes: CLASS_IDS,
  tier: 1,
  level: 1,
  icon: 'book',
  visual: null,
  art: '/jogo-idle/assets/potions/dragons_breath.png',
  twoHanded: false,
  consumable: true,
  announce: true,
  stats: {},
  refineTargets: [],
  price: 5000,
});

add({
  id: ATTR_RESET_TEMPLATE_ID,
  name: 'Reset de Pontos',
  slot: 'consumable',
  classes: CLASS_IDS,
  tier: 1,
  level: 1,
  icon: 'book',
  visual: 'tool_skull',
  twoHanded: false,
  consumable: true,
  announce: true,
  stats: {},
  refineTargets: [],
  price: DEFAULT_ATTR_RESET_PRICE,
});

add({
  id: 'consumable_hp_potion',
  name: 'Poção de Vida',
  slot: 'consumable',
  classes: CLASS_IDS,
  tier: 1,
  level: 1,
  icon: 'book',
  visual: null,
  art: '/jogo-idle/assets/potions/greater_healing.png',
  twoHanded: false,
  consumable: true,
  announce: false,
  /** Chance absoluta por kill (boss usa ×5). Editável no admin. */
  dropChance: 0.008,
  /** Empilha na mochila (um slot, qty). */
  stackable: true,
  stats: {},
  refineTargets: [],
  price: 80,
});

add({
  id: 'consumable_mana_potion',
  name: 'Poção de Mana',
  slot: 'consumable',
  classes: CLASS_IDS,
  tier: 1,
  level: 1,
  icon: 'book',
  visual: null,
  art: '/jogo-idle/assets/potions/greater_mana.png',
  twoHanded: false,
  consumable: true,
  announce: false,
  dropChance: 0.008,
  stackable: true,
  stats: {},
  refineTargets: [],
  price: 80,
});

add({
  id: SUCO_CELESTIAL_TEMPLATE_ID,
  name: 'Suco Divino',
  slot: 'consumable',
  classes: CLASS_IDS,
  tier: 13,
  level: 500,
  icon: 'book',
  visual: null,
  art: '/jogo-idle/assets/potions/eternal_potion.png',
  twoHanded: false,
  consumable: true,
  announce: true,
  stats: {},
  refineTargets: [],
  /** Valor alto se a mochila estiver cheia — item de ritual. */
  price: 500_000,
});

/** Infere classe a partir do id gerado (`BARBARO_gloves_t3`, `GUERREIRO_espada_t1`, …). */
function classesFromTemplateId(id) {
  const prefix = String(id || '').split('_')[0];
  return CLASS_IDS.includes(prefix) ? [prefix] : [];
}

function normalizeClasses(raw, templateId) {
  const fromRaw = Array.isArray(raw)
    ? [...new Set(raw.map((c) => String(c || '').trim()).filter((c) => CLASS_IDS.includes(c)))]
    : [];
  if (fromRaw.length) return fromRaw;
  return classesFromTemplateId(templateId);
}

/** Normaliza chance/peso de drop (0–1). `null` = default do pool (peso 1). */
function normalizeDropChance(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.max(0, Math.min(1, n)) * 10000) / 10000;
}

function cloneTemplate(t) {
  const id = t.id;
  const dropChance = normalizeDropChance(t.dropChance);
  return {
    id,
    name: t.name,
    slot: t.slot,
    classes: normalizeClasses(t.classes, id),
    tier: Number(t.tier),
    level: Number(t.level),
    icon: t.icon,
    visual: t.visual || null,
    art: typeof t.art === 'string' && t.art.trim() ? t.art.trim() : null,
    twoHanded: Boolean(t.twoHanded),
    consumable: Boolean(t.consumable),
    announce: Boolean(t.announce),
    requiresAscension: t.requiresAscension === 'CELESTIAL' ? 'CELESTIAL' : null,
    stats: { ...(t.stats || {}) },
    refineTargets: Array.isArray(t.refineTargets) ? [...t.refineTargets] : [],
    price: Number(t.price),
    ...(dropChance != null ? { dropChance } : {}),
    ...(t.stackable ? { stackable: true } : {}),
    ...(t.skillElementBonus && typeof t.skillElementBonus === 'object'
      ? { skillElementBonus: { ...t.skillElementBonus } }
      : {}),
  };
}

const BASE_CATALOG = new Map();
for (const [id, t] of CATALOG) BASE_CATALOG.set(id, cloneTemplate(t));


let dropChance = DROP_CHANCE;
let bagUpgradePrice = DEFAULT_BAG_UPGRADE_PRICE;
let refinerPrice = DEFAULT_REFINER_PRICE;
let attrResetPrice = DEFAULT_ATTR_RESET_PRICE;
let petDogPrice = DEFAULT_PET_DOG_PRICE;
let petCatPrice = DEFAULT_PET_CAT_PRICE;
let petParrotPrice = DEFAULT_PET_PARROT_PRICE;
/** @type {Record<string, boolean>} */
let merchantOffersEnabled = { ...DEFAULT_MERCHANT_OFFERS_ENABLED };
/** @type {Set<string>} */
const deleted = new Set();
/** @type {Map<string, object>} */
const overrides = new Map();
/** @type {null | ((snap: { dropChance: number, deletedIds: string[], overrides: Record<string, object> }) => void | Promise<void>)} */
let catalogPersistHandler = null;

function rebuildCatalog() {
  CATALOG.clear();
  for (const [id, t] of BASE_CATALOG) {
    if (!deleted.has(id)) CATALOG.set(id, cloneTemplate(t));
  }
  for (const [id, t] of overrides) CATALOG.set(id, cloneTemplate(t));
}

export function getCatalogStateSnapshot() {
  return {
    dropChance,
    deletedIds: [...deleted],
    overrides: {
      ...Object.fromEntries([...overrides.entries()].map(([id, t]) => [id, cloneTemplate(t)])),
      [MERCHANT_CONFIG_KEY]: {
        bagUpgradePrice,
        refinerPrice,
        attrResetPrice,
        petDogPrice,
        petCatPrice,
        petParrotPrice,
        offersEnabled: { ...merchantOffersEnabled },
      },
      ...(engagementEvent ? { [ENGAGEMENT_EVENT_KEY]: { ...engagementEvent } } : {}),
      [WORLD_CONFIG_KEY]: {
        balance: getBalanceOverrides(),
        zones: getZoneOverrides(),
        maintenance: maintenanceSnapshot(),
      },
      [HUD_CONFIG_KEY]: getHudCatalogPayload(),
    },
  };
}

export function applyCatalogStateSnapshot(data = {}) {
  const nextDrop = Number(data.dropChance);
  if (Number.isFinite(nextDrop) && nextDrop >= 0 && nextDrop <= 1) {
    dropChance = Math.round(nextDrop * 1000) / 1000;
  }
  deleted.clear();
  const deletedIds = Array.isArray(data.deletedIds) ? data.deletedIds : [];
  for (const id of deletedIds) {
    if (typeof id === 'string' && id) deleted.add(id);
  }
  overrides.clear();
  const rawOverrides =
    data.overrides && typeof data.overrides === 'object' && !Array.isArray(data.overrides)
      ? data.overrides
      : {};
  engagementEvent = null;
  merchantOffersEnabled = { ...DEFAULT_MERCHANT_OFFERS_ENABLED };
  applyGameMaintenance(null);
  applyHudCatalogPayload(null);
  for (const [id, template] of Object.entries(rawOverrides)) {
    if (id === MERCHANT_CONFIG_KEY) {
      const price = Number(template?.bagUpgradePrice);
      if (Number.isFinite(price) && price >= 0) {
        bagUpgradePrice = Math.floor(price);
      }
      const refPrice = Number(template?.refinerPrice);
      if (Number.isFinite(refPrice) && refPrice >= 0) {
        refinerPrice = Math.floor(refPrice);
      }
      const resetPrice = Number(template?.attrResetPrice);
      if (Number.isFinite(resetPrice) && resetPrice >= 0) {
        attrResetPrice = Math.floor(resetPrice);
      }
      const dogP = Number(template?.petDogPrice);
      if (Number.isFinite(dogP) && dogP >= 0) petDogPrice = Math.floor(dogP);
      const catP = Number(template?.petCatPrice);
      if (Number.isFinite(catP) && catP >= 0) petCatPrice = Math.floor(catP);
      const parrotP = Number(template?.petParrotPrice);
      if (Number.isFinite(parrotP) && parrotP >= 0) petParrotPrice = Math.floor(parrotP);
      merchantOffersEnabled = normalizeOffersEnabled(template?.offersEnabled);
      continue;
    }
    if (id === ENGAGEMENT_EVENT_KEY) {
      engagementEvent = normalizeEngagementEvent(template);
      continue;
    }
    if (id === WORLD_CONFIG_KEY) {
      if (template?.balance) setBalanceOverrides(template.balance);
      // Sempre aplica o mapa de zonas (mesmo vazio) para sync entre réplicas.
      if (template?.zones !== undefined) {
        setZoneOverrides(
          template.zones && typeof template.zones === 'object' ? template.zones : {},
        );
      }
      applyGameMaintenance(template?.maintenance);
      refreshZones();
      continue;
    }
    if (id === HUD_CONFIG_KEY) {
      applyHudCatalogPayload(template);
      continue;
    }
    if (!template || typeof template !== 'object') continue;
    overrides.set(id, cloneTemplate({ ...template, id }));
  }
  rebuildCatalog();
}

export function setCatalogPersistHandler(handler) {
  catalogPersistHandler = typeof handler === 'function' ? handler : null;
}

function persistCatalog() {
  if (!catalogPersistHandler) return;
  const snap = getCatalogStateSnapshot();
  Promise.resolve(catalogPersistHandler(snap)).catch((err) => {
    console.error('[jogo-idle] falha ao persistir catálogo', err);
  });
}

/** @deprecated use applyCatalogStateSnapshot via ensureCatalogLoaded */
export function loadCatalog() {}

export function getDropChance() {
  return dropChance;
}

export function setDropChance(value, { persist = true } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error('Chance de drop deve estar entre 0 e 1');
  dropChance = Math.round(n * 1000) / 1000;
  if (persist) persistCatalog();
  return dropChance;
}

/**
 * Parse de ouro admin: aceita inteiro puro ou strings BR/US (`20.000.000`, `20,000,000`).
 * Teto: Number.MAX_SAFE_INTEGER (sem limite artificial de 100M).
 */
export function parseAdminGold(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) return null;
    const n = Math.floor(value);
    if (n > Number.MAX_SAFE_INTEGER) return null;
    return n;
  }
  let raw = String(value ?? '').trim();
  if (!raw) return null;
  raw = raw.replace(/\s/g, '');
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw)) {
    // BR: 20.000.000 ou 20.000.000,50
    raw = raw.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(raw)) {
    // US: 20,000,000 ou 20,000,000.50
    raw = raw.replace(/,/g, '');
  } else if (/^\d+,\d+$/.test(raw)) {
    raw = raw.replace(',', '.');
  }
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 0 || n > Number.MAX_SAFE_INTEGER) return null;
  return n;
}

function assertMerchantPrice(value, label) {
  const n = parseAdminGold(value);
  if (n == null) {
    throw new Error(
      `Preço do ${label} inválido (informe um inteiro ≥ 0; recebido: ${JSON.stringify(String(value ?? ''))})`,
    );
  }
  return n;
}

function normalizeOffersEnabled(raw) {
  const next = { ...DEFAULT_MERCHANT_OFFERS_ENABLED };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return next;
  for (const sku of MERCHANT_OFFER_SKUS) {
    if (typeof raw[sku] === 'boolean') next[sku] = raw[sku];
  }
  return next;
}

export function getMerchantOffersEnabled() {
  return { ...merchantOffersEnabled };
}

export function isMerchantOfferEnabled(sku) {
  const key = String(sku || '');
  if (!MERCHANT_OFFER_SKUS.includes(key)) return false;
  return merchantOffersEnabled[key] !== false;
}

/** Patch parcial de toggles; chaves desconhecidas são ignoradas. */
export function setMerchantOffersEnabled(patch, { persist = true } = {}) {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('offersEnabled inválido');
  }
  const next = { ...merchantOffersEnabled };
  for (const sku of MERCHANT_OFFER_SKUS) {
    if (typeof patch[sku] === 'boolean') next[sku] = patch[sku];
  }
  merchantOffersEnabled = next;
  if (persist) persistCatalog();
  return getMerchantOffersEnabled();
}

export function getBagUpgradePrice() {
  return bagUpgradePrice;
}

export function setBagUpgradePrice(value, { persist = true } = {}) {
  bagUpgradePrice = assertMerchantPrice(value, 'mochila');
  if (persist) persistCatalog();
  return bagUpgradePrice;
}

export function getRefinerPrice() {
  return refinerPrice;
}

export function setRefinerPrice(value, { persist = true } = {}) {
  refinerPrice = assertMerchantPrice(value, 'Refinador');
  if (persist) persistCatalog();
  return refinerPrice;
}

export function getAttrResetPrice() {
  return attrResetPrice;
}

export function setAttrResetPrice(value, { persist = true } = {}) {
  attrResetPrice = assertMerchantPrice(value, 'Reset de Pontos');
  if (persist) persistCatalog();
  return attrResetPrice;
}

export function getPetDogPrice() {
  return petDogPrice;
}

export function setPetDogPrice(value, { persist = true } = {}) {
  petDogPrice = assertMerchantPrice(value, 'Cachorro');
  if (persist) persistCatalog();
  return petDogPrice;
}

export function getPetCatPrice() {
  return petCatPrice;
}

export function setPetCatPrice(value, { persist = true } = {}) {
  petCatPrice = assertMerchantPrice(value, 'Gato');
  if (persist) persistCatalog();
  return petCatPrice;
}

export function getPetParrotPrice() {
  return petParrotPrice;
}

export function setPetParrotPrice(value, { persist = true } = {}) {
  petParrotPrice = assertMerchantPrice(value, 'Papagaio');
  if (persist) persistCatalog();
  return petParrotPrice;
}

/** Preço do pet por id (`dog` | `cat` | `parrot`). */
export function getPetPrice(petId) {
  if (petId === 'dog') return petDogPrice;
  if (petId === 'cat') return petCatPrice;
  if (petId === 'parrot') return petParrotPrice;
  throw new Error('Pet desconhecido');
}

export function setPetPrice(petId, value, opts = {}) {
  if (petId === 'dog') return setPetDogPrice(value, opts);
  if (petId === 'cat') return setPetCatPrice(value, opts);
  if (petId === 'parrot') return setPetParrotPrice(value, opts);
  throw new Error('Pet desconhecido');
}

function normalizeEngagementEvent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const label = String(raw.label || '').trim().slice(0, 80);
  const endsAt = String(raw.endsAt || '').trim();
  const ends = Date.parse(endsAt);
  if (!label || !Number.isFinite(ends) || ends <= Date.now()) return null;
  const xpMult = Number(raw.xpMult);
  const goldMult = Number(raw.goldMult);
  const dropMult = Number(raw.dropMult);
  return {
    label,
    endsAt: new Date(ends).toISOString(),
    xpMult: Number.isFinite(xpMult) && xpMult >= 1 && xpMult <= 3 ? Math.round(xpMult * 100) / 100 : 1,
    goldMult: Number.isFinite(goldMult) && goldMult >= 1 && goldMult <= 3 ? Math.round(goldMult * 100) / 100 : 1,
    dropMult: Number.isFinite(dropMult) && dropMult >= 1 && dropMult <= 3 ? Math.round(dropMult * 100) / 100 : 1,
  };
}

/** Evento admin ativo; null se expirado/ausente. */
export function getEngagementEvent() {
  if (!engagementEvent) return null;
  if (Date.parse(engagementEvent.endsAt) <= Date.now()) {
    engagementEvent = null;
    return null;
  }
  return { ...engagementEvent };
}

export function setEngagementEvent(input, { persist = true } = {}) {
  if (input == null || input === false || input.clear) {
    engagementEvent = null;
    if (persist) persistCatalog();
    return null;
  }
  const next = normalizeEngagementEvent(input);
  if (!next && input?.label) {
    throw new Error('Evento inválido: informe label e endsAt futuro (ISO)');
  }
  engagementEvent = next;
  if (persist) persistCatalog();
  return getEngagementEvent();
}

export function merchantMeta() {
  const allOfferings = [
    {
      sku: 'bag_upgrade',
      name: 'Expansão de mochila',
      description: `+${BAG_UPGRADE_SLOTS} espaços (libera a página 2)`,
      price: bagUpgradePrice,
      maxPurchases: MAX_BAG_UPGRADES,
      icon: 'bag',
    },
    {
      sku: 'refiner',
      name: 'Refinador',
      description: 'Consome 1 para refinar equipamento até +10 (+5 no attr primário por nível)',
      price: refinerPrice,
      maxPurchases: null,
      icon: 'refiner',
      art: '/jogo-idle/assets/potions/dragons_breath.png',
    },
    {
      sku: 'attr_reset',
      name: 'Reset de Pontos',
      description: 'Zera pontos distribuídos (mantém base da classe) e devolve ao pool livre',
      price: attrResetPrice,
      maxPurchases: null,
      icon: 'attr_reset',
    },
    {
      sku: 'pet_dog',
      name: 'Cachorro',
      description: 'Companheiro: auto-equipa drops melhores que o item no slot.',
      price: petDogPrice,
      maxPurchases: 1,
      icon: 'dog',
    },
    {
      sku: 'pet_cat',
      name: 'Gato',
      description: 'Companheiro: vende itens que não são da sua classe.',
      price: petCatPrice,
      maxPurchases: 1,
      icon: 'cat',
    },
    {
      sku: 'pet_parrot',
      name: 'Papagaio',
      description: 'Companheiro premium: auto-equipa e vende fora da classe.',
      price: petParrotPrice,
      maxPurchases: 1,
      icon: 'parrot',
    },
  ];
  return {
    bagBaseSlots: BAG_BASE_SLOTS,
    bagUpgradeSlots: BAG_UPGRADE_SLOTS,
    maxBagUpgrades: MAX_BAG_UPGRADES,
    bagUpgradePrice,
    refinerPrice,
    attrResetPrice,
    petDogPrice,
    petCatPrice,
    petParrotPrice,
    offersEnabled: getMerchantOffersEnabled(),
    offerings: allOfferings.filter((o) => isMerchantOfferEnabled(o.sku)),
  };
}

/** Filtra templates públicos para o painel admin (classe/slot/tier/busca). */
export function filterCatalog(items, filters = {}) {
  const classId = filters.classId && filters.classId !== 'all' ? String(filters.classId) : null;
  const slot = filters.slot && filters.slot !== 'all' ? String(filters.slot) : null;
  const tier = filters.tier != null && filters.tier !== '' && filters.tier !== 'all'
    ? Number(filters.tier)
    : null;
  const query = String(filters.query || '').trim().toLowerCase();
  return (items || []).filter((item) => {
    if (classId && !(item.classes || []).includes(classId)) return false;
    if (slot && item.slot !== slot) return false;
    if (Number.isFinite(tier) && item.tier !== tier) return false;
    if (query) {
      const hay = `${item.id} ${item.name}`.toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });
}

function previewStats(template, rarity, roll = 1) {
  const mult = RARITIES[rarity].mult * roll;
  const out = {};
  for (const [stat, v] of Object.entries(template.stats || {})) {
    if (!v) continue;
    out[stat] = stat === 'crit' ? Math.round(v * mult * 10) / 10 : Math.max(1, Math.round(v * mult));
  }
  return out;
}

export function publicTemplate(t) {
  const builtIn = BASE_CATALOG.has(t.id);
  return {
    ...cloneTemplate(t),
    custom: !builtIn,
    overridden: builtIn && overrides.has(t.id),
    previews: Object.fromEntries(RARITY_ORDER.map((r) => [r, previewStats(t, r)])),
  };
}

export function listCatalog() {
  return [...CATALOG.values()]
    .map(publicTemplate)
    .sort((a, b) => a.tier - b.tier || a.slot.localeCompare(b.slot) || a.name.localeCompare(b.name, 'pt'));
}

export function catalogMeta() {
  return {
    slots: SLOTS,
    classes: CLASS_IDS,
    icons: ICONS,
    visuals: VISUALS,
    rarities: Object.fromEntries(RARITY_ORDER.map((id) => [id, { id, ...RARITIES[id] }])),
    tiers: TIER_LEVELS.map((level, i) => ({ tier: i + 1, level })),
    dropChance,
    bagUpgradePrice,
    refinerPrice,
    attrResetPrice,
    petDogPrice,
    petCatPrice,
    petParrotPrice,
    offersEnabled: getMerchantOffersEnabled(),
    engagementEvent: getEngagementEvent(),
    ...merchantMeta(),
  };
}

function slugify(name) {
  return String(name || 'item')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 24) || 'item';
}

function cleanStats(stats = {}, { allowEmpty = false } = {}) {
  const out = {};
  for (const key of ATTR_STAT_KEYS) {
    const n = Number(stats[key]);
    if (Number.isFinite(n) && n > 0) {
      out[key] = key === 'crit' ? Math.round(n * 10) / 10 : Math.round(n);
    }
  }
  if (!Object.keys(out).length && !allowEmpty) throw new Error('Informe pelo menos um atributo');
  return out;
}

function normalizeRefineTargets(raw, stats) {
  if (Array.isArray(raw) && raw.length) {
    return raw.filter((k) => ['str', 'dex', 'int', 'con'].includes(k));
  }
  return ['str', 'dex', 'int', 'con'].filter((k) => stats[k] > 0);
}

function normalizeTemplate(input, { id, creating }) {
  const name = String(input.name || '').trim();
  if (name.length < 2 || name.length > 40) throw new Error('Nome deve ter entre 2 e 40 caracteres');
  if (!SLOTS.includes(input.slot)) throw new Error('Slot inválido');
  const classes = [...new Set((input.classes || []).filter((c) => CLASS_IDS.includes(c)))];
  if (!classes.length) throw new Error('Escolha pelo menos uma classe');
  const tier = Math.max(1, Math.min(TIER_LEVELS.length, Number(input.tier) || 1));
  const level = Math.max(1, Math.min(700, Number(input.level) || TIER_LEVELS[tier - 1]));
  const icon = ICONS.includes(input.icon) ? input.icon : 'sword';
  const visual = VISUALS.some((v) => v.id === input.visual) ? input.visual : null;
  const price = Math.max(1, Math.round(Number(input.price) || 12));
  const twoHanded = visual ? visual.startsWith('2H_') : Boolean(input.twoHanded);
  const consumable = Boolean(input.consumable) || input.slot === 'consumable';
  const stats = cleanStats(input.stats, { allowEmpty: consumable });
  const requiresAscension =
    input.requiresAscension === 'CELESTIAL' ||
    (tier >= CELESTIAL_GEAR_MIN_TIER && !consumable)
      ? 'CELESTIAL'
      : null;
  const dropChance = normalizeDropChance(
    input.dropChance != null ? input.dropChance : input.dropPct != null ? Number(input.dropPct) / 100 : null,
  );
  const stackable =
    Boolean(input.stackable) ||
    id === 'consumable_hp_potion' ||
    id === 'consumable_mana_potion';
  const art =
    typeof input.art === 'string' && input.art.trim().startsWith('/')
      ? input.art.trim().slice(0, 200)
      : null;
  return {
    id,
    name,
    slot: input.slot,
    classes,
    tier,
    level,
    icon,
    visual,
    ...(art ? { art } : {}),
    twoHanded,
    consumable,
    announce: Boolean(input.announce),
    requiresAscension: consumable ? null : requiresAscension,
    stats,
    refineTargets: normalizeRefineTargets(input.refineTargets, stats),
    price,
    ...(dropChance != null ? { dropChance } : {}),
    ...(stackable ? { stackable: true } : {}),
  };
}

export function upsertTemplate(input, { creating = false, persist = true } = {}) {
  let id = String(input.id || '').trim();
  if (creating || !id) {
    id = `custom_${slugify(input.name)}_${randomUUID().slice(0, 6)}`;
  } else if (!CATALOG.has(id) && !BASE_CATALOG.has(id)) {
    throw new Error('Item não encontrado');
  }
  const template = normalizeTemplate(input, { id, creating });
  overrides.set(id, template);
  deleted.delete(id);
  rebuildCatalog();
  if (persist) persistCatalog();
  return publicTemplate(CATALOG.get(id));
}

export function deleteTemplate(id, { persist = true } = {}) {
  if (!CATALOG.has(id)) throw new Error('Item não encontrado');
  if (BASE_CATALOG.has(id)) deleted.add(id);
  overrides.delete(id);
  rebuildCatalog();
  if (persist) persistCatalog();
}

export function resetTemplate(id, { persist = true } = {}) {
  if (!BASE_CATALOG.has(id)) throw new Error('Só itens originais podem ser restaurados');
  deleted.delete(id);
  overrides.delete(id);
  rebuildCatalog();
  if (persist) persistCatalog();
  return publicTemplate(CATALOG.get(id));
}

export function getTemplate(id) {
  return CATALOG.get(id);
}

loadCatalog();

export function createItem(templateId, rarity = 'common', roll, rng = Math.random) {
  if (!CATALOG.has(templateId)) throw new Error(`Item desconhecido: ${templateId}`);
  const t = CATALOG.get(templateId);
  const rollFn = typeof rng === 'function' ? rng : Math.random;
  const resolvedRoll =
    roll != null && Number.isFinite(Number(roll))
      ? Number(roll)
      : 0.9 + rollFn() * 0.2;
  const item = {
    uid: randomUUID(),
    templateId,
    rarity,
    roll: Math.round(resolvedRoll * 1000) / 1000,
  };
  if (t?.stackable) item.qty = 1;
  return item;
}

/** Peso relativo no pool de gear (`dropChance` 0–1; default 1). */
export function templateDropWeight(t) {
  const w = Number(t?.dropChance);
  if (!Number.isFinite(w) || w < 0) return 1;
  return w;
}

/** Chance absoluta de Poção de Vida por kill (boss ×5). */
export function getHpPotionDropChance({ wasBoss = false } = {}) {
  const t = getTemplate('consumable_hp_potion');
  const base = Number.isFinite(Number(t?.dropChance)) ? Number(t.dropChance) : 0.008;
  return Math.min(1, Math.max(0, wasBoss ? base * 5 : base));
}

/** Chance absoluta de Poção de Mana por kill (boss ×5). */
export function getManaPotionDropChance({ wasBoss = false } = {}) {
  const t = getTemplate('consumable_mana_potion');
  const base = Number.isFinite(Number(t?.dropChance)) ? Number(t.dropChance) : 0.008;
  return Math.min(1, Math.max(0, wasBoss ? base * 5 : base));
}

export function isStackableItem(item) {
  if (!item) return false;
  const t = getTemplate(item.templateId);
  return Boolean(t?.stackable);
}

export function itemQty(item) {
  const q = Math.floor(Number(item?.qty) || 0);
  return Math.max(1, q || 1);
}

export function itemStats(item) {
  const t = getTemplate(item.templateId);
  if (!t) return {};
  const mult = (RARITIES[item.rarity]?.mult || 1) * (item.roll || 1);
  const out = {};
  for (const [stat, v] of Object.entries(t.stats || {})) {
    out[stat] = stat === 'crit' ? Math.round(v * mult * 10) / 10 : Math.max(1, Math.round(v * mult));
  }
  const refine = Math.max(0, Math.min(10, Math.floor(Number(item.refineLevel) || 0)));
  if (refine > 0) {
    const targets = (t.refineTargets || []).length
      ? t.refineTargets
      : ['str', 'dex', 'int', 'con'].filter((k) => out[k] > 0);
    for (const key of targets) {
      out[key] = (out[key] || 0) + refine * REFINE_STAT_BONUS;
    }
  }
  return out;
}

export function sellPrice(item) {
  const t = getTemplate(item.templateId);
  if (!t) return 0;
  const unit = Math.round(t.price * RARITIES[item.rarity].sell);
  const qty = t.stackable ? itemQty(item) : 1;
  return unit * qty;
}

export function publicItem(item) {
  const t = getTemplate(item.templateId);
  if (!t) {
    return {
      uid: item.uid,
      templateId: item.templateId,
      name: 'Item removido',
      slot: 'weapon',
      classes: classesFromTemplateId(item.templateId),
      tier: 1,
      level: 1,
      icon: 'sword',
      visual: null,
      twoHanded: false,
      rarity: item.rarity,
      rarityName: RARITIES[item.rarity]?.name || item.rarity,
      stats: {},
      sellPrice: 0,
    };
  }
  const refineLevel = Math.max(0, Math.min(10, Math.floor(Number(item.refineLevel) || 0)));
  const qty = t.stackable ? itemQty(item) : 1;
  return {
    uid: item.uid,
    templateId: item.templateId,
    name: t.name,
    displayName: refineLevel > 0 ? `${t.name} +${refineLevel}` : t.name,
    slot: t.slot,
    classes: normalizeClasses(t.classes, t.id || item.templateId),
    tier: t.tier,
    level: t.level,
    icon: t.icon,
    visual: t.visual || null,
    art: typeof t.art === 'string' && t.art.trim() ? t.art.trim() : null,
    twoHanded: Boolean(t.twoHanded),
    consumable: Boolean(t.consumable),
    stackable: Boolean(t.stackable),
    qty,
    dropChance: t.dropChance != null ? t.dropChance : null,
    refineLevel,
    refineTargets: t.refineTargets || [],
    rarity: item.rarity,
    rarityName: RARITIES[item.rarity]?.name || item.rarity,
    locked: Boolean(item.locked),
    stats: itemStats(item),
    sellPrice: sellPrice(item),
    ...(t.skillElementBonus && typeof t.skillElementBonus === 'object'
      ? { skillElementBonus: { ...t.skillElementBonus } }
      : {}),
  };
}

function rollRarity(rng = Math.random) {
  const total = RARITY_ORDER.reduce((s, r) => s + RARITIES[r].weight, 0);
  let n = rng() * total;
  for (const r of RARITY_ORDER) {
    n -= RARITIES[r].weight;
    if (n <= 0) return r;
  }
  return 'common';
}

/**
 * 65% das vezes o drop é da classe do jogador; o resto é qualquer item do tier.
 * Gear com `requiresAscension` só entra no pool em zonas celestiais.
 * Consumíveis especiais (Refinador / Suco) não saem por este path.
 */
function pickWeightedTemplate(list, rng = Math.random) {
  const eligible = list.filter((t) => templateDropWeight(t) > 0);
  if (!eligible.length) return null;
  const total = eligible.reduce((sum, t) => sum + templateDropWeight(t), 0);
  let n = rng() * total;
  for (const t of eligible) {
    n -= templateDropWeight(t);
    if (n <= 0) return t;
  }
  return eligible[eligible.length - 1];
}

/**
 * 65% das vezes o drop é da classe do jogador; o resto é qualquer item do tier.
 * Gear com `requiresAscension` só entra no pool em zonas celestiais.
 * `dropChance` no template = peso relativo (0 = nunca; ausente = 1).
 * Consumíveis especiais (Refinador / Suco / Poção) não saem por este path.
 */
export function rollDrop(tier, classId, { celestialZone = false, rng = Math.random } = {}) {
  const roll = typeof rng === 'function' ? rng : Math.random;
  const pool = [...CATALOG.values()].filter((t) => {
    if (t.tier !== tier) return false;
    if (t.consumable || t.slot === 'consumable') return false;
    if (t.requiresAscension === 'CELESTIAL' && !celestialZone) return false;
    if (!t.requiresAscension && celestialZone) {
      /* em zona celestial o pool é o gear celestial do tier */
    }
    return templateDropWeight(t) > 0;
  });
  if (!pool.length) return null;
  const own = pool.filter((t) => t.classes.includes(classId));
  const from = roll() < 0.65 && own.length ? own : pool;
  const template = pickWeightedTemplate(from, roll);
  if (!template) return null;
  return createItem(template.id, rollRarity(roll), undefined, roll);
}

/** Exposto para testes de faixa de raridade. */
export function rollRarityForTests(rng) {
  return rollRarity(rng);
}

export function starterWeaponId(classId) {
  return `${classId}_${CLASS_GEAR[classId].weapons[0].key}_t1`;
}

export function rarityRank(rarity) {
  return RARITY_ORDER.indexOf(rarity);
}
