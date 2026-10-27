/** Paletas e malhas do KayKit — deve bater com server/game/appearance.js. */
export const SKINS = {
  fair: 0xffe0c8,
  tan: 0xd4a574,
  olive: 0xb8956a,
  bronze: 0x8d5a32,
  pale: 0xf2e6dc,
  ash: 0xc4b8b0,
};

export const ARMORS = {
  steel: 0xd8d4cc,
  crimson: 0xe07070,
  royal: 0x6a8cff,
  forest: 0x6cb87a,
  sand: 0xe8c878,
  shadow: 0x6a6470,
  ice: 0xb8d8f0,
  abyss: 0x8a6ad0,
};

export const METALS = {
  gold: 0xe8c050,
  silver: 0xd0d4dc,
  copper: 0xc87840,
  bronze: 0xb07830,
  emerald: 0x40c878,
  ruby: 0xd04050,
  sapphire: 0x4080e0,
};

export const CAPES = {
  crimson: 0xc04048,
  navy: 0x3850a0,
  forest: 0x2e6a3a,
  black: 0x2a2a30,
  ivory: 0xe8e0d0,
  purple: 0x6a3a9a,
  gold: 0xc9a050,
};

export const CLASS_PARTS = {
  GUERREIRO: {
    helmet: 'Knight_Helmet',
    cape: 'Knight_Cape',
    head: 'Knight_Head',
    body: ['Knight_Body', 'Knight_ArmLeft', 'Knight_ArmRight', 'Knight_LegLeft', 'Knight_LegRight'],
  },
  BARBARO: {
    helmet: 'Barbarian_Hat',
    cape: 'Barbarian_Cape',
    head: 'Barbarian_Head',
    body: ['Barbarian_Body', 'Barbarian_ArmLeft', 'Barbarian_ArmRight', 'Barbarian_LegLeft', 'Barbarian_LegRight'],
  },
  MAGO: {
    helmet: 'Mage_Hat',
    cape: 'Mage_Cape',
    head: 'Mage_Head',
    body: ['Mage_Body', 'Mage_ArmLeft', 'Mage_ArmRight', 'Mage_LegLeft', 'Mage_LegRight'],
  },
  ARQUEIRO: {
    helmet: null,
    cape: 'Rogue_Cape',
    head: 'Rogue_Head_Hooded',
    body: ['Rogue_Body', 'Rogue_ArmLeft', 'Rogue_ArmRight', 'Rogue_LegLeft', 'Rogue_LegRight'],
  },
};

export const DEFAULT_LOOK = {
  helmet: true,
  cape: true,
  skin: 'fair',
  armor: 'steel',
  metal: 'gold',
  capeColor: 'crimson',
  scale: 1,
  stance: 'Idle',
};
