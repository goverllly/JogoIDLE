/**
 * Registro de assets do Admin Studio.
 * Novos modelos Blender: coloque em /jogo-idle/assets/custom/ e registre aqui.
 */
import { MODEL_DIR } from './arena-layout.js';

/** Modelos de monstro (id estável ≠ nome de exibição). */
export const MONSTER_VISUALS = [
  {
    id: 'skeleton_minion',
    label: 'Esqueleto Minion',
    file: 'Skeleton_Minion.glb',
    attacks: ['Unarmed_Melee_Attack_Punch_A'],
  },
  {
    id: 'skeleton_rogue',
    label: 'Esqueleto Rogue',
    file: 'Skeleton_Rogue.glb',
    attacks: ['Dualwield_Melee_Attack_Stab'],
  },
  {
    id: 'skeleton_warrior',
    label: 'Esqueleto Guerreiro',
    file: 'Skeleton_Warrior.glb',
    attacks: ['1H_Melee_Attack_Chop'],
  },
  {
    id: 'skeleton_mage',
    label: 'Esqueleto Mago',
    file: 'Skeleton_Mage.glb',
    attacks: ['Spellcast_Shoot'],
  },
];

/** Alias nome legado → visualId (compat com MONSTERS do scene3d). */
export const MONSTER_NAME_TO_VISUAL = {
  'Esqueleto Errante': 'skeleton_minion',
  'Saqueador Ósseo': 'skeleton_rogue',
  'Guerreiro Ósseo': 'skeleton_warrior',
  'Necromante Aprendiz': 'skeleton_mage',
  'Espectro Musgoso': 'skeleton_rogue',
  'Guardião Espinhoso': 'skeleton_warrior',
  'Campeão Flamejante': 'skeleton_warrior',
  'Arquimago Cinzento': 'skeleton_mage',
  'Afogado do Pântano': 'skeleton_minion',
  'Bruxo Lodoso': 'skeleton_mage',
  'Sentinela Congelada': 'skeleton_warrior',
  'Caçador da Nevasca': 'skeleton_rogue',
};

export const DEFAULT_MONSTER_VISUAL = 'skeleton_minion';

export function getMonsterVisual(id) {
  const key = String(id || '').trim();
  return MONSTER_VISUALS.find((v) => v.id === key) || null;
}

export function resolveMonsterVisualId({ visualId, name } = {}) {
  if (visualId && getMonsterVisual(visualId)) return visualId;
  const fromName = MONSTER_NAME_TO_VISUAL[String(name || '').trim()];
  if (fromName) return fromName;
  return DEFAULT_MONSTER_VISUAL;
}

export function monsterModelUrl(visualId) {
  const v = getMonsterVisual(visualId) || getMonsterVisual(DEFAULT_MONSTER_VISUAL);
  return `${MODEL_DIR}${v.file}`;
}

/**
 * Assets custom (Blender). Exemplo:
 * { id: 'custom_wolf', label: 'Lobo', kind: 'monster', url: '/jogo-idle/assets/custom/wolf.glb' }
 */
export const CUSTOM_ASSETS = [
  { id: 'custom_elmo_mago', label: 'Elmo do Mago', kind: 'item', url: '/jogo-idle/assets/custom/elmo-mago.glb' },
  { id: 'custom_peito_mago', label: 'Peitoral do Mago', kind: 'item', url: '/jogo-idle/assets/custom/peito-mago.glb' },
  { id: 'custom_calca_mago', label: 'Calças do Mago', kind: 'item', url: '/jogo-idle/assets/custom/calca-mago.glb' },
  { id: 'custom_luva_mago', label: 'Luvas do Mago', kind: 'item', url: '/jogo-idle/assets/custom/luva-mago.glb' },
  { id: 'custom_bota_mago', label: 'Botas do Mago', kind: 'item', url: '/jogo-idle/assets/custom/bota-mago.glb' },
  { id: 'custom_elmo_guerreiro', label: 'Elmo do Guerreiro', kind: 'item', url: '/jogo-idle/assets/custom/elmo-guerreiro.glb' },
  { id: 'custom_peito_guerreiro', label: 'Peitoral do Guerreiro', kind: 'item', url: '/jogo-idle/assets/custom/peito-guerreiro.glb' },
  { id: 'custom_calca_guerreiro', label: 'Grevas do Guerreiro', kind: 'item', url: '/jogo-idle/assets/custom/calca-guerreiro.glb' },
  { id: 'custom_luva_guerreiro', label: 'Manoplas do Guerreiro', kind: 'item', url: '/jogo-idle/assets/custom/luva-guerreiro.glb' },
  { id: 'custom_bota_guerreiro', label: 'Botas do Guerreiro', kind: 'item', url: '/jogo-idle/assets/custom/bota-guerreiro.glb' },
  { id: 'custom_elmo_barbaro', label: 'Elmo do Bárbaro', kind: 'item', url: '/jogo-idle/assets/custom/elmo-barbaro.glb' },
  { id: 'custom_peito_barbaro', label: 'Peitoral do Bárbaro', kind: 'item', url: '/jogo-idle/assets/custom/peito-barbaro.glb' },
  { id: 'custom_calca_barbaro', label: 'Calças do Bárbaro', kind: 'item', url: '/jogo-idle/assets/custom/calca-barbaro.glb' },
  { id: 'custom_luva_barbaro', label: 'Luvas do Bárbaro', kind: 'item', url: '/jogo-idle/assets/custom/luva-barbaro.glb' },
  { id: 'custom_bota_barbaro', label: 'Botas do Bárbaro', kind: 'item', url: '/jogo-idle/assets/custom/bota-barbaro.glb' },
  { id: 'custom_elmo_arqueiro', label: 'Elmo do Arqueiro', kind: 'item', url: '/jogo-idle/assets/custom/elmo-arqueiro.glb' },
  { id: 'custom_peito_arqueiro', label: 'Peitoral do Arqueiro', kind: 'item', url: '/jogo-idle/assets/custom/peito-arqueiro.glb' },
  { id: 'custom_calca_arqueiro', label: 'Calças do Arqueiro', kind: 'item', url: '/jogo-idle/assets/custom/calca-arqueiro.glb' },
  { id: 'custom_luva_arqueiro', label: 'Luvas do Arqueiro', kind: 'item', url: '/jogo-idle/assets/custom/luva-arqueiro.glb' },
  { id: 'custom_bota_arqueiro', label: 'Botas do Arqueiro', kind: 'item', url: '/jogo-idle/assets/custom/bota-arqueiro.glb' },
  { id: 'custom_machado_1', label: 'Machado', kind: 'item', url: '/jogo-idle/assets/custom/machado-1.glb' },
  { id: 'custom_anel_1', label: 'Anel 1', kind: 'item', url: '/jogo-idle/assets/custom/anel-1.glb' },
  { id: 'custom_anel_2', label: 'Anel 2', kind: 'item', url: '/jogo-idle/assets/custom/anel-2.glb' },
];

export function listMonsterVisualOptions() {
  return [
    ...MONSTER_VISUALS.map((v) => ({ id: v.id, label: v.label, kind: 'built-in' })),
    ...CUSTOM_ASSETS.filter((a) => a.kind === 'monster').map((a) => ({
      id: a.id,
      label: a.label,
      kind: 'custom',
    })),
  ];
}
