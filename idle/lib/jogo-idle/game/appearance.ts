// @ts-nocheck
/** Aparência de nascimento — imutável após create. Sync IDs com public/jogo-idle/appearance.js */

export const APPEARANCE_SCHEMA_VERSION = 1;

export const SKINS = {
  fair: { id: 'fair', name: 'Clara', hex: 0xffe0c8 },
  tan: { id: 'tan', name: 'Morena', hex: 0xd4a574 },
  olive: { id: 'olive', name: 'Oliva', hex: 0xb8956a },
  bronze: { id: 'bronze', name: 'Bronze', hex: 0x8d5a32 },
  pale: { id: 'pale', name: 'Pálida', hex: 0xf2e6dc },
  ash: { id: 'ash', name: 'Cinza', hex: 0xc4b8b0 },
};

export const ARMORS = {
  steel: { id: 'steel', name: 'Aço', hex: 0xd8d4cc },
  crimson: { id: 'crimson', name: 'Carmesim', hex: 0xe07070 },
  royal: { id: 'royal', name: 'Real', hex: 0x6a8cff },
  forest: { id: 'forest', name: 'Floresta', hex: 0x6cb87a },
  sand: { id: 'sand', name: 'Areia', hex: 0xe8c878 },
  shadow: { id: 'shadow', name: 'Sombra', hex: 0x6a6470 },
  ice: { id: 'ice', name: 'Gelo', hex: 0xb8d8f0 },
  abyss: { id: 'abyss', name: 'Abismo', hex: 0x8a6ad0 },
};

export const METALS = {
  gold: { id: 'gold', name: 'Ouro', hex: 0xe8c050 },
  silver: { id: 'silver', name: 'Prata', hex: 0xd0d4dc },
  copper: { id: 'copper', name: 'Cobre', hex: 0xc87840 },
  bronze: { id: 'bronze', name: 'Bronze', hex: 0xb07830 },
  emerald: { id: 'emerald', name: 'Esmeralda', hex: 0x40c878 },
  ruby: { id: 'ruby', name: 'Rubi', hex: 0xd04050 },
  sapphire: { id: 'sapphire', name: 'Safira', hex: 0x4080e0 },
};

export const CAPES = {
  crimson: { id: 'crimson', name: 'Carmesim', hex: 0xc04048 },
  navy: { id: 'navy', name: 'Marinho', hex: 0x3850a0 },
  forest: { id: 'forest', name: 'Floresta', hex: 0x2e6a3a },
  black: { id: 'black', name: 'Negra', hex: 0x2a2a30 },
  ivory: { id: 'ivory', name: 'Marfim', hex: 0xe8e0d0 },
  purple: { id: 'purple', name: 'Violeta', hex: 0x6a3a9a },
  gold: { id: 'gold', name: 'Dourada', hex: 0xc9a050 },
};

export const STANCES = [
  { id: 'Idle', name: 'Guarda' },
  { id: 'Unarmed_Idle', name: 'Relaxado' },
  { id: '2H_Melee_Idle', name: 'Armas em riste' },
  { id: 'Spellcasting', name: 'Canalizando' },
];

export const CLASS_PARTS = {
  GUERREIRO: {
    helmet: { mesh: 'Knight_Helmet', label: 'Elmo' },
    cape: { mesh: 'Knight_Cape', label: 'Capa' },
    head: 'Knight_Head',
    body: ['Knight_Body', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight'],
  },
  BARBARO: {
    helmet: { mesh: 'Barbarian_Hat', label: 'Chapéu' },
    cape: { mesh: 'Barbarian_Cape', label: 'Capa' },
    head: 'Barbarian_Head',
    body: ['Barbarian_Body', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_LegLeft', 'Barbarian_LegRight'],
  },
  MAGO: {
    helmet: { mesh: 'Mage_Hat', label: 'Chapéu' },
    cape: { mesh: 'Mage_Cape', label: 'Manto' },
    head: 'Mage_Head',
    body: ['Mage_Body', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_LegLeft', 'Mage_LegRight'],
  },
  ARQUEIRO: {
    cape: { mesh: 'Rogue_Cape', label: 'Capa' },
    head: 'Rogue_Head_Hooded',
    body: ['Rogue_Body', 'Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_LegLeft', 'Rogue_LegRight'],
  },
};

/** Default de criação no Studio: elmo oculto para ver a cabeça. */
export const DEFAULT_APPEARANCE = {
  schemaVersion: APPEARANCE_SCHEMA_VERSION,
  helmet: false,
  cape: true,
  skin: 'fair',
  armor: 'steel',
  metal: 'gold',
  capeColor: 'crimson',
  scale: 1,
  stance: 'Idle',
};

const SCALE_MIN = 0.9;
const SCALE_MAX = 1.12;

function pick(map, id, fallback) {
  return map[id] ? id : fallback;
}

export function normalizeAppearance(input = {}, classId = 'GUERREIRO') {
  const parts = CLASS_PARTS[classId] || CLASS_PARTS.GUERREIRO;
  const scale = Number(input.scale);
  return {
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    helmet: parts.helmet ? input.helmet !== false : false,
    cape: parts.cape ? input.cape !== false : false,
    skin: pick(SKINS, input.skin, DEFAULT_APPEARANCE.skin),
    armor: pick(ARMORS, input.armor, DEFAULT_APPEARANCE.armor),
    metal: pick(METALS, input.metal, DEFAULT_APPEARANCE.metal),
    capeColor: pick(CAPES, input.capeColor, DEFAULT_APPEARANCE.capeColor),
    scale: Number.isFinite(scale)
      ? Math.max(SCALE_MIN, Math.min(SCALE_MAX, Math.round(scale * 100) / 100))
      : 1,
    stance: STANCES.some((s) => s.id === input.stance) ? input.stance : 'Idle',
  };
}

/**
 * Look visual permanente do personagem.
 * Cosméticos desbloqueáveis NÃO sobrescrevem o birth look.
 * Equipamentos de gameplay (armas) são aplicados à parte pelo renderer.
 */
export function resolveVisualLook(character) {
  if (!character || typeof character !== 'object') {
    return normalizeAppearance(DEFAULT_APPEARANCE, 'GUERREIRO');
  }
  return normalizeAppearance(character.appearance, character.classId || 'GUERREIRO');
}

export function cosmeticsMeta() {
  return {
    schemaVersion: APPEARANCE_SCHEMA_VERSION,
    skins: Object.values(SKINS),
    armors: Object.values(ARMORS),
    metals: Object.values(METALS),
    capes: Object.values(CAPES),
    stances: STANCES,
    scale: { min: SCALE_MIN, max: SCALE_MAX, step: 0.01 },
    parts: Object.fromEntries(
      Object.entries(CLASS_PARTS).map(([id, p]) => [
        id,
        {
          helmet: p.helmet ? { label: p.helmet.label } : null,
          cape: p.cape ? { label: p.cape.label } : null,
        },
      ]),
    ),
    studioDefaults: {
      helmet: false,
      cape: true,
      skin: DEFAULT_APPEARANCE.skin,
      armor: DEFAULT_APPEARANCE.armor,
      metal: DEFAULT_APPEARANCE.metal,
      capeColor: DEFAULT_APPEARANCE.capeColor,
      scale: 1,
      stance: 'Idle',
    },
  };
}
