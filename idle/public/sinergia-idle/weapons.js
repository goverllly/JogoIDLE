/** Estilo de ataque por arma equipada. `fw_*` usa o clipe, sem trocar a malha do herói. */
const ATTACK = {
  slash: {
    melee: true,
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Horizontal'],
  },
  stab: {
    melee: true,
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Stab', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop'],
  },
  heavy1: {
    melee: true,
    sound: 'heavy',
    attacks: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Stab'],
  },
  heavy2: {
    melee: true,
    sound: 'heavy',
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice', '2H_Melee_Attack_Spin'],
  },
  bow: { projectile: 'arrow', sound: 'crossbow', attacks: ['2H_Ranged_Shoot'] },
  arrow: { projectile: 'arrow', sound: 'slash', attacks: ['1H_Melee_Attack_Stab'] },
  wand: { projectile: 'orb', sound: 'wand', attacks: ['Spellcast_Shoot'] },
  staff: { projectile: 'orb', big: true, sound: 'staff', attacks: ['Spellcast_Shoot'] },
};

/** visual fw_* → preset. Escudos só entram se alguém equipar a malha na mão da arma. */
const FW_STYLE_KEY = {
  fw_arrow_A: 'arrow',
  fw_arrow_B: 'arrow',
  fw_axe_A: 'heavy1',
  fw_axe_B: 'heavy1',
  fw_axe_C: 'heavy1',
  fw_bow_A: 'bow',
  fw_bow_A_withString: 'bow',
  fw_bow_B: 'bow',
  fw_bow_B_withString: 'bow',
  fw_dagger_A: 'stab',
  fw_dagger_B: 'stab',
  fw_fistweapon_A: 'heavy1',
  fw_fistweapon_A_stacked: 'heavy1',
  fw_fistweapon_B: 'heavy1',
  fw_fistweapon_B_stacked: 'heavy1',
  fw_halberd: 'heavy2',
  fw_hammer_A: 'heavy1',
  fw_hammer_B: 'heavy1',
  fw_hammer_C: 'heavy1',
  fw_shield_A: 'slash',
  fw_shield_B: 'slash',
  fw_shield_C: 'slash',
  fw_spear_A: 'heavy2',
  fw_staff_A: 'staff',
  fw_staff_B: 'staff',
  fw_sword_A: 'slash',
  fw_sword_B: 'slash',
  fw_sword_C: 'stab',
  fw_sword_D: 'heavy2',
  fw_sword_E: 'heavy2',
  fw_wand_A: 'wand',
};

const STYLES = {
  '1H_Sword': {
    melee: true,
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Horizontal'],
  },
  '1H_Sword_Offhand': {
    melee: true,
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Stab', '1H_Melee_Attack_Chop'],
  },
  Knife_Offhand: {
    melee: true,
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Stab', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Chop'],
  },
  Knife: {
    melee: true,
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Stab', '1H_Melee_Attack_Slice_Diagonal'],
  },
  '1H_Axe_Offhand': {
    melee: true,
    sound: 'heavy',
    attacks: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal'],
  },
  Throwable: {
    projectile: 'arrow',
    sound: 'slash',
    attacks: ['1H_Melee_Attack_Stab'],
  },
  '2H_Sword': {
    melee: true,
    sound: 'heavy',
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice', '2H_Melee_Attack_Spin'],
  },
  '1H_Axe': {
    melee: true,
    sound: 'heavy',
    attacks: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal', '1H_Melee_Attack_Stab'],
  },
  '2H_Axe': {
    melee: true,
    sound: 'heavy',
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Spin', '2H_Melee_Attack_Slice'],
  },
  '1H_Wand': { projectile: 'orb', sound: 'wand', attacks: ['Spellcast_Shoot'] },
  '2H_Staff': { projectile: 'orb', big: true, sound: 'staff', attacks: ['Spellcast_Shoot'] },
  '1H_Crossbow': { projectile: 'arrow', sound: 'crossbow', attacks: ['1H_Ranged_Shoot'] },
  '2H_Crossbow': { projectile: 'arrow', sound: 'crossbow_heavy', attacks: ['2H_Ranged_Shoot'] },
  ...Object.fromEntries(Object.entries(FW_STYLE_KEY).map(([id, key]) => [id, ATTACK[key]])),
};

const UNARMED = {
  melee: true,
  sound: 'punch',
  attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Punch_B', 'Unarmed_Melee_Attack_Kick'],
};

export function weaponStyle(equipment) {
  return STYLES[equipment?.weapon?.visual] || UNARMED;
}

export const RARITY_COLORS = {
  common: 0xb5ad9c,
  uncommon: 0x63c763,
  rare: 0x4f9fff,
  epic: 0xb46cff,
  legendary: 0xff9a2e,
};
