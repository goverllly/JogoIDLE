import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sfx, setAmbience } from './audio.js';
import { createTimeline, floatText, flyCoins, coinCount, levelUpBurst, shake } from './fx.js';
import { weaponStyle, RARITY_COLORS } from './weapons.js';
import { SKINS, ARMORS, METALS, CAPES, CLASS_PARTS, DEFAULT_LOOK } from './appearance.js';
import {
  preloadKayKitProps,
  buildKayKitZone,
  zonePropSeed,
  kayKitResolvedCount,
  appendManualDecorations,
  preloadDecorationPacks,
} from './kaykit-props.js';
import { manualsVisibleInPlay } from './zone-compose.js';
import {
  HERO_HEIGHT,
  MONSTER_HEIGHT,
  HERO_X,
  MONSTER_X,
  PET_X,
  PET_Z,
  CAM_HOME as LAYOUT_CAM_HOME,
  CAM_TARGET as LAYOUT_CAM_TARGET,
} from './admin-studio/arena-layout.js';

const MODEL_DIR = '/jogo-idle/assets/models/';
const MIN_GAP = {
  attack: 340,
  hurt: 200,
  kill: 650,
  drop: 0,
  spawn: 450,
  levelup: 0,
  faint: 900,
  skill_cast: 200,
  skill_hit: 280,
};

/** Companion procedural simples (sem GLB) ao lado do herói. */
function createPetMesh(petId) {
  const root = new THREE.Group();
  root.name = `pet_${petId}`;

  if (petId === 'dog') {
    const mat = new THREE.MeshStandardMaterial({ color: 0xb07a45, roughness: 0.55, metalness: 0.05 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x5c3a22, roughness: 0.4, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 4, 8), mat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.22, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat);
    head.position.set(0.2, 0.32, 0);
    const snout = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.06, 3, 6), dark);
    snout.rotation.z = Math.PI / 2;
    snout.position.set(0.3, 0.28, 0);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.1, 5), dark);
    earL.position.set(0.14, 0.42, 0.06);
    const earR = earL.clone();
    earR.position.z = -0.06;
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 3, 6), mat);
    tail.position.set(-0.22, 0.28, 0);
    tail.rotation.z = -0.6;
    root.add(body, head, snout, earL, earR, tail);
  } else if (petId === 'cat') {
    const mat = new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.5, metalness: 0.08 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x5a6270, roughness: 0.45, metalness: 0.08 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.2, 4, 8), mat);
    body.rotation.z = Math.PI / 2;
    body.position.set(0, 0.2, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), mat);
    head.position.set(0.18, 0.3, 0);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), accent);
    earL.position.set(0.12, 0.42, 0.05);
    const earR = earL.clone();
    earR.position.z = -0.05;
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.2, 3, 6), mat);
    tail.position.set(-0.2, 0.32, 0);
    tail.rotation.z = 0.9;
    root.add(body, head, earL, earR, tail);
  } else if (petId === 'parrot') {
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x2f9e44, roughness: 0.45, metalness: 0.1 });
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe03131, roughness: 0.45, metalness: 0.1 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59f00, roughness: 0.4, metalness: 0.15 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x1971c2, roughness: 0.5, metalness: 0.08 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), bodyMat);
    body.scale.set(0.85, 1.15, 0.9);
    body.position.set(0, 0.28, 0);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), headMat);
    head.position.set(0.1, 0.42, 0);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), beakMat);
    beak.rotation.z = -Math.PI / 2;
    beak.position.set(0.18, 0.4, 0);
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), wingMat);
    wing.scale.set(0.35, 0.9, 1.4);
    wing.position.set(0, 0.28, 0.1);
    root.add(body, head, beak, wing);
  } else {
    return null;
  }

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  return root;
}
const CAM_HOME = new THREE.Vector3(LAYOUT_CAM_HOME.x, LAYOUT_CAM_HOME.y, LAYOUT_CAM_HOME.z);
const CAM_TARGET = new THREE.Vector3(LAYOUT_CAM_TARGET.x, LAYOUT_CAM_TARGET.y, LAYOUT_CAM_TARGET.z);

/** visualId estável → cfg de modelo (Admin Studio). */
const MONSTER_BY_VISUAL = {
  skeleton_minion: { file: 'Skeleton_Minion.glb', attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Punch_B'] },
  skeleton_rogue: { file: 'Skeleton_Rogue.glb', attacks: ['Dualwield_Melee_Attack_Stab', '1H_Melee_Attack_Stab'] },
  skeleton_warrior: { file: 'Skeleton_Warrior.glb', attacks: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal'] },
  skeleton_mage: { file: 'Skeleton_Mage.glb', attacks: ['Spellcast_Shoot'], cast: 0x9f7aff },
};

function resolveMonsterCfg(target) {
  const byVisual = target?.visualId && MONSTER_BY_VISUAL[target.visualId];
  if (byVisual) return byVisual;
  return MONSTERS[target?.name] || MONSTERS[DEFAULT_MONSTER];
}

/** `gear`: malhas de arma/escudo do modelo; ficam visíveis só se o item equipado as usar. */
const HEROES = {
  GUERREIRO: {
    file: 'Knight.glb',
    gear: ['1H_Sword', '2H_Sword', '1H_Sword_Offhand', 'Round_Shield', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield'],
  },
  BARBARO: {
    file: 'Barbarian.glb',
    gear: ['1H_Axe', '2H_Axe', '1H_Axe_Offhand', 'Barbarian_Round_Shield'],
  },
  MAGO: {
    file: 'Mage.glb',
    gear: ['1H_Wand', '2H_Staff', 'Spellbook', 'Spellbook_open'],
  },
  ARQUEIRO: {
    file: 'Rogue_Hooded.glb',
    gear: ['1H_Crossbow', '2H_Crossbow', 'Knife_Offhand', 'Knife', 'Throwable'],
  },
};

const MONSTERS = {
  'Esqueleto Errante': {
    file: 'Skeleton_Minion.glb',
    attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Punch_B'],
  },
  'Saqueador Ósseo': {
    file: 'Skeleton_Rogue.glb',
    attacks: ['Dualwield_Melee_Attack_Stab', '1H_Melee_Attack_Stab'],
  },
  'Guerreiro Ósseo': {
    file: 'Skeleton_Warrior.glb',
    attacks: ['1H_Melee_Attack_Chop', '1H_Melee_Attack_Slice_Diagonal'],
  },
  'Necromante Aprendiz': {
    file: 'Skeleton_Mage.glb',
    attacks: ['Spellcast_Shoot'],
    cast: 0x9f7aff,
  },
  'Espectro Musgoso': {
    file: 'Skeleton_Rogue.glb',
    tint: 0x8fffb0,
    emissive: 0x06301a,
    attacks: ['Dualwield_Melee_Attack_Slice'],
  },
  'Guardião Espinhoso': {
    file: 'Skeleton_Warrior.glb',
    tint: 0x9fcf7a,
    scale: 1.15,
    attacks: ['2H_Melee_Attack_Chop'],
  },
  'Campeão Flamejante': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xffa070,
    emissive: 0x3a0d00,
    scale: 1.35,
    attacks: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop'],
  },
  'Arquimago Cinzento': {
    file: 'Skeleton_Mage.glb',
    tint: 0xd0c8ff,
    scale: 1.3,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xff7a3d,
  },
  'Afogado do Pântano': {
    file: 'Skeleton_Minion.glb',
    tint: 0x9fb07a,
    emissive: 0x0a1a06,
    scale: 1.1,
    attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Kick'],
  },
  'Bruxo Lodoso': {
    file: 'Skeleton_Mage.glb',
    tint: 0xa8d08a,
    scale: 1.15,
    attacks: ['Spellcast_Shoot'],
    cast: 0x7fff5a,
  },
  'Sentinela Congelada': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xa8d8ff,
    emissive: 0x06223a,
    scale: 1.2,
    attacks: ['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop'],
  },
  'Caçador da Nevasca': {
    file: 'Skeleton_Rogue.glb',
    tint: 0xd8ecff,
    scale: 1.15,
    attacks: ['Dualwield_Melee_Attack_Stab', 'Dualwield_Melee_Attack_Slice'],
  },
  'Cavaleiro do Abismo': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xa078ff,
    emissive: 0x1a0638,
    scale: 1.45,
    attacks: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Spin'],
  },
  'Lich Abissal': {
    file: 'Skeleton_Mage.glb',
    tint: 0x7a6890,
    emissive: 0x200a34,
    scale: 1.4,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xc05aff,
  },
  /* Bosses finais de cada macro */
  'Senhor da Clareira': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xc8e070,
    emissive: 0x1a2808,
    scale: 1.55,
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Spin'],
  },
  'Rei das Lápides': {
    file: 'Skeleton_Mage.glb',
    tint: 0xb0c0e8,
    emissive: 0x101828,
    scale: 1.6,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0x9fc4ff,
  },
  'Lorde do Espinheiro': {
    file: 'Skeleton_Warrior.glb',
    tint: 0x7fff9a,
    emissive: 0x0a2810,
    scale: 1.65,
    attacks: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop'],
  },
  'Primordial do Lodo': {
    file: 'Skeleton_Minion.glb',
    tint: 0x88a060,
    emissive: 0x142008,
    scale: 1.7,
    attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Kick'],
  },
  'Tirano da Cripta': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xff7040,
    emissive: 0x3a0a00,
    scale: 1.75,
    attacks: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Slice'],
  },
  'Colosso Glacial': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xe8f4ff,
    emissive: 0x204060,
    scale: 1.8,
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Spin'],
  },
  'Soberano do Vazio': {
    file: 'Skeleton_Mage.glb',
    tint: 0x9060ff,
    emissive: 0x280848,
    scale: 1.85,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xd060ff,
  },
  /* Mid / high / Celestial */
  'Sentinela da Muralha': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xc8b890,
    scale: 1.25,
    attacks: ['1H_Melee_Attack_Chop', '2H_Melee_Attack_Chop'],
  },
  'Arqueiro Espectral': {
    file: 'Skeleton_Rogue.glb',
    tint: 0xb0c8e8,
    emissive: 0x102030,
    scale: 1.15,
    attacks: ['Dualwield_Melee_Attack_Stab', '1H_Melee_Attack_Stab'],
  },
  'Marechal Fantasma': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xe0d0a0,
    emissive: 0x282010,
    scale: 1.7,
    attacks: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Slice'],
  },
  'Elemental de Cinzas': {
    file: 'Skeleton_Minion.glb',
    tint: 0xff7040,
    emissive: 0x3a1000,
    scale: 1.2,
    attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Kick'],
  },
  'Golem Magmático': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xff5020,
    emissive: 0x401000,
    scale: 1.4,
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Slice'],
  },
  'Senhor do Magma': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xff3800,
    emissive: 0x501000,
    scale: 1.8,
    attacks: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Chop'],
  },
  'Devorador de Almas': {
    file: 'Skeleton_Rogue.glb',
    tint: 0x708090,
    emissive: 0x101820,
    scale: 1.25,
    attacks: ['Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Stab'],
  },
  'Sacerdote Cadavérico': {
    file: 'Skeleton_Mage.glb',
    tint: 0xa8b0c0,
    scale: 1.2,
    attacks: ['Spellcast_Shoot', 'Spellcast_Long'],
    cast: 0x90a8ff,
  },
  'Guardião do Ossuário': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xc0c8d0,
    emissive: 0x181c24,
    scale: 1.75,
    attacks: ['2H_Melee_Attack_Chop', '2H_Melee_Attack_Spin'],
  },
  'Sombra Errante': {
    file: 'Skeleton_Rogue.glb',
    tint: 0x687088,
    emissive: 0x0a1018,
    scale: 1.15,
    attacks: ['Dualwield_Melee_Attack_Stab'],
  },
  'Caçador Nebuloso': {
    file: 'Skeleton_Rogue.glb',
    tint: 0x90a0b8,
    scale: 1.2,
    attacks: ['Dualwield_Melee_Attack_Slice', '1H_Melee_Attack_Stab'],
  },
  'Avatar da Névoa': {
    file: 'Skeleton_Mage.glb',
    tint: 0xc0d0e8,
    emissive: 0x182030,
    scale: 1.7,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xd0e8ff,
  },
  'Golem de Runas': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xe8d070,
    emissive: 0x302800,
    scale: 1.35,
    attacks: ['2H_Melee_Attack_Chop'],
  },
  'Lacaio Arcano': {
    file: 'Skeleton_Mage.glb',
    tint: 0xffe8a0,
    scale: 1.15,
    attacks: ['Spellcast_Shoot'],
    cast: 0xffe060,
  },
  'Curador das Relíquias': {
    file: 'Skeleton_Mage.glb',
    tint: 0xfff0b0,
    emissive: 0x403800,
    scale: 1.75,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xffe080,
  },
  'Cavaleiro do Trono': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xe0c070,
    scale: 1.3,
    attacks: ['2H_Melee_Attack_Slice', '1H_Melee_Attack_Chop'],
  },
  'Algoz Imperial': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xffd070,
    emissive: 0x281800,
    scale: 1.35,
    attacks: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Chop'],
  },
  'Regente Final': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xffe090,
    emissive: 0x382800,
    scale: 1.85,
    attacks: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Slice'],
  },
  'Serafim Caído': {
    file: 'Skeleton_Mage.glb',
    tint: 0xa0d8ff,
    emissive: 0x104060,
    scale: 1.35,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0x80e0ff,
  },
  'Sentinela Astral': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xc0e8ff,
    emissive: 0x183848,
    scale: 1.3,
    attacks: ['2H_Melee_Attack_Chop', '1H_Melee_Attack_Chop'],
  },
  'Arauto do Éter': {
    file: 'Skeleton_Mage.glb',
    tint: 0xe0f4ff,
    emissive: 0x206080,
    scale: 1.8,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xa0f0ff,
  },
  'Cometa Vivo': {
    file: 'Skeleton_Minion.glb',
    tint: 0xffe8c0,
    emissive: 0x403010,
    scale: 1.25,
    attacks: ['Unarmed_Melee_Attack_Punch_A', 'Unarmed_Melee_Attack_Kick'],
  },
  'Guardião da Aurora': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xfff0d0,
    emissive: 0x504020,
    scale: 1.4,
    attacks: ['2H_Melee_Attack_Slice', '2H_Melee_Attack_Chop'],
  },
  'Colosso Estelar': {
    file: 'Skeleton_Warrior.glb',
    tint: 0xfff8e0,
    emissive: 0x605030,
    scale: 1.9,
    attacks: ['2H_Melee_Attack_Spin', '2H_Melee_Attack_Chop'],
  },
  'Fragmento do Infinito': {
    file: 'Skeleton_Rogue.glb',
    tint: 0xd080ff,
    emissive: 0x280848,
    scale: 1.3,
    attacks: ['Dualwield_Melee_Attack_Slice', 'Dualwield_Melee_Attack_Stab'],
  },
  'Eco do Criador': {
    file: 'Skeleton_Mage.glb',
    tint: 0xf0c0ff,
    emissive: 0x380860,
    scale: 1.4,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xff80ff,
  },
  'Núcleo do Nexus': {
    file: 'Skeleton_Mage.glb',
    tint: 0xffe0ff,
    emissive: 0x481070,
    scale: 2.0,
    attacks: ['Spellcast_Long', 'Spellcast_Shoot'],
    cast: 0xffa0ff,
  },
};
const DEFAULT_MONSTER = 'Esqueleto Errante';

/** `particles`: float | embers | snow | rise; `fog`: [perto, longe]; `density`: 0.5–2; `variant`: layout. */
const ZONES = {
  idle: { bg: 0x0d0b09, ground: 0x1f1a14, hemi: [0x6a5a48, 0x1a120a, 0.5], sun: [0xffe2b0, 1.2], particle: 0xc9a050, props: 'ruins', particles: 'float', fog: [11, 32], density: 0.8 },
  bosque_sussurros: { bg: 0x1a3a28, ground: 0x3a5a32, hemi: [0xb8e0c0, 0x1a2814, 0.75], sun: [0xfff4d0, 1.55], particle: 0xe8ff8a, props: 'forest', variant: 'clearing', particles: 'float', fog: [12, 36], density: 1.05 },
  pantano_sombras: { bg: 0x121a10, ground: 0x243018, hemi: [0x8aaa6a, 0x10140a, 0.55], sun: [0xd8e8a0, 0.9], particle: 0xb8ff6a, props: 'swamp', variant: 'swamp', particles: 'rise', fog: [5, 18], density: 1.15 },
  floresta_amaldicoada: { bg: 0x142018, ground: 0x2a3820, hemi: [0x70a070, 0x10180c, 0.6], sun: [0xc8e0a0, 1.0], particle: 0xa0ff70, props: 'forest', variant: 'cursed', particles: 'float', fog: [7, 24], density: 1.45 },
  ruinas_druidas: { bg: 0x182820, ground: 0x304028, hemi: [0xa0c8a8, 0x142018, 0.65], sun: [0xe8f0c8, 1.2], particle: 0xd0e890, props: 'forest', variant: 'ruins', particles: 'float', fog: [9, 28], density: 1.2 },
  coracao_floresta: { bg: 0x0e2818, ground: 0x1e4028, hemi: [0x80ffb0, 0x0c2010, 0.7], sun: [0xe0ffc0, 1.4], particle: 0xa0ff80, props: 'forest', variant: 'heart', particles: 'embers', fog: [8, 26], density: 0.95 },
  cemiterio_esquecido: { bg: 0x10131e, ground: 0x2a2a30, hemi: [0x8aa0d0, 0x101018, 0.55], sun: [0xb8c8ff, 1.1], particle: 0x9fc4ff, props: 'graveyard', particles: 'rise', fog: [5, 18], density: 0.95 },
  criptas_profanadas: { bg: 0x140c10, ground: 0x241820, hemi: [0xa08090, 0x100808, 0.5], sun: [0xffb070, 1.1], particle: 0xffab4a, props: 'crypt', particles: 'embers', fog: [6, 20], density: 0.85 },
  catacumbas_eternas: { bg: 0x0c0e12, ground: 0x1c1e24, hemi: [0x8890a0, 0x080a10, 0.5], sun: [0xa8b0c0, 0.95], particle: 0xc0c8d8, props: 'tomb', particles: 'float', fog: [4, 15], density: 0.9 },
  necropole_reis: { bg: 0x121018, ground: 0x2a2430, hemi: [0xc0b0e0, 0x100c18, 0.55], sun: [0xe8d0ff, 1.15], particle: 0xd0c0ff, props: 'relic', particles: 'rise', fog: [7, 24], density: 1.05 },
  trono_almas: { bg: 0x0c1018, ground: 0x1a2028, hemi: [0x90a8c8, 0x080c14, 0.55], sun: [0xc0d0e8, 1.2], particle: 0xa8c8ff, props: 'throne', particles: 'rise', fog: [6, 22], density: 0.8 },
  campos_cinzas: { bg: 0x1a1008, ground: 0x2a1c10, hemi: [0xd09060, 0x140804, 0.55], sun: [0xffa060, 1.25], particle: 0xff8040, props: 'volcano', particles: 'embers', fog: [8, 26], density: 0.85 },
  rios_magma: { bg: 0x1a0804, ground: 0x2a140c, hemi: [0xff8050, 0x180604, 0.55], sun: [0xff9040, 1.4], particle: 0xff6020, props: 'volcano', particles: 'embers', fog: [5, 20], density: 1.05 },
  fornalhas_malditas: { bg: 0x160604, ground: 0x28100c, hemi: [0xff6040, 0x140404, 0.55], sun: [0xff7030, 1.3], particle: 0xff5020, props: 'crypt', particles: 'embers', fog: [6, 22], density: 0.9 },
  fortaleza_condenados: { bg: 0x1a1008, ground: 0x3a2818, hemi: [0xffb080, 0x181008, 0.6], sun: [0xffc090, 1.35], particle: 0xff9060, props: 'fortress', particles: 'embers', fog: [10, 32], density: 1.2 },
  trono_chama: { bg: 0x120402, ground: 0x220c08, hemi: [0xff7030, 0x100402, 0.6], sun: [0xff9020, 1.5], particle: 0xff4000, props: 'volcano', particles: 'embers', fog: [5, 18], density: 0.85 },
  ruinas_orbitais: { bg: 0x0a1218, ground: 0x142028, hemi: [0x80a0c0, 0x081018, 0.65], sun: [0xb0d0e8, 1.0], particle: 0xe0ecff, props: 'mist', particles: 'snow', fog: [6, 22], density: 0.7 },
  abismo_esquecido: { bg: 0x0a0612, ground: 0x1a1224, hemi: [0x8a6ad0, 0x0a0410, 0.5], sun: [0xc0a0ff, 0.9], particle: 0xb06aff, props: 'abyss', particles: 'rise', fog: [5, 20], density: 0.8 },
  cemiterio_estrelas: { bg: 0x061018, ground: 0x0e1c28, hemi: [0x80c0e8, 0x040c14, 0.7], sun: [0xa0d8ff, 1.2], particle: 0xc0e8ff, props: 'ether', particles: 'rise', fog: [8, 28], density: 0.9 },
  horizonte_eventos: { bg: 0x081428, ground: 0x102038, hemi: [0xa0c0ff, 0x060e1c, 0.75], sun: [0xffe8c0, 1.35], particle: 0xfff0d0, props: 'firmament', particles: 'float', fog: [9, 30], density: 0.75 },
  singularidade: { bg: 0x060418, ground: 0x100c28, hemi: [0xc080ff, 0x080410, 0.7], sun: [0xe0a0ff, 1.2], particle: 0xf0c0ff, props: 'nexus', particles: 'rise', fog: [6, 22], density: 1.1 },
  prova_divina: { bg: 0x120818, ground: 0x1a1228, hemi: [0xc0a0e8, 0x100818, 0.6], sun: [0xe8d0ff, 1.2], particle: 0xd8b0ff, props: 'throne', particles: 'embers', fog: [7, 26], density: 0.75 },
  julgamento_almas: { bg: 0x0c1018, ground: 0x1a2028, hemi: [0x90a8c8, 0x080c14, 0.55], sun: [0xc0d0e8, 1.1], particle: 0xa8c8ff, props: 'graveyard', particles: 'rise', fog: [5, 20], density: 0.85 },
  coracao_chama: { bg: 0x1a0804, ground: 0x2a140c, hemi: [0xff8050, 0x180604, 0.55], sun: [0xff9040, 1.4], particle: 0xff6020, props: 'volcano', particles: 'embers', fog: [6, 22], density: 0.95 },
};
// Aliases legados
Object.assign(ZONES, {
  floresta: ZONES.bosque_sussurros,
  pantano: ZONES.pantano_sombras,
  jardim: ZONES.floresta_amaldicoada,
  gelo: ZONES.bosque_sussurros,
  cemiterio: ZONES.cemiterio_esquecido,
  hidra: ZONES.criptas_profanadas,
  catacumbas: ZONES.catacumbas_eternas,
  reliquias: ZONES.necropole_reis,
  trono: ZONES.trono_almas,
  vulcao: ZONES.campos_cinzas,
  abismo: ZONES.abismo_esquecido,
  fortaleza: ZONES.fortaleza_condenados,
  nevoa: ZONES.ruinas_orbitais,
  eter: ZONES.cemiterio_estrelas,
  firmamento: ZONES.horizonte_eventos,
  nexus: ZONES.singularidade,
});

/** Preset público por zoneId (admin “Aplicar preset”). */
export function getZoneScenePreset(zoneId) {
  const z = ZONES[zoneId] || ZONES.idle;
  const fog = z.fog || [11, 32];
  return {
    bg: z.bg,
    ground: z.ground,
    hemiSky: z.hemi?.[0],
    hemiGround: z.hemi?.[1],
    hemiIntensity: z.hemi?.[2],
    sunColor: z.sun?.[0],
    sunIntensity: z.sun?.[1],
    props: z.props,
    particles: z.particles || 'float',
    particleColor: z.particle,
    propDensity: z.density ?? 1,
    fogNear: fog[0],
    fogFar: fog[1],
    variant: z.variant || undefined,
  };
}

const loader = new GLTFLoader();
const modelCache = new Map();
function loadModel(file) {
  if (!modelCache.has(file)) modelCache.set(file, loader.loadAsync(MODEL_DIR + file));
  return modelCache.get(file);
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

function createActor(gltf, { hide = [], tint, emissive, height, scale = 1 }) {
  const model = cloneSkinned(gltf.scene);
  const meshes = [];
  const tintColor = tint != null ? new THREE.Color(tint) : null;
  const named = new Map();
  model.traverse((o) => {
    if (o.name) named.set(o.name, o);
    if (hide.includes(o.name)) o.visible = false;
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      if (tintColor) o.material.color.multiply(tintColor);
      if (emissive != null) o.material.emissive = new THREE.Color(emissive);
      o.userData.baseEmissive = o.material.emissive.clone();
      o.userData.baseColor = o.material.color.clone();
      meshes.push(o);
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const h = Math.max(0.01, box.max.y - box.min.y);
  const baseScale = (height / h) * scale;
  model.scale.setScalar(baseScale);
  const realHeight = height * scale;

  const holder = new THREE.Group();
  holder.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(gltf.animations.map((c) => [c.name, c]));

  let current = null;
  let idleName = 'Idle';
  let flashLeft = 0;
  let clock = 0;
  let returnAt = null;
  const RETURN_FADE = 0.15;

  function action(name) {
    const clip = clips.get(name);
    return clip ? mixer.clipAction(clip) : null;
  }

  function loop(name, fade = 0.28) {
    const a = action(name);
    if (!a) return;
    idleName = name;
    if (current === a) return;
    a.reset();
    a.setLoop(THREE.LoopRepeat, Infinity);
    a.timeScale = 1;
    a.fadeIn(fade).play();
    current?.fadeOut(fade);
    current = a;
  }

  /** Toca uma vez e volta ao idle; `hold` congela no último quadro (morte). */
  function once(name, { speed = 1, fade = 0.14, hold = false } = {}) {
    const a = action(name);
    if (!a) return 0;
    a.reset();
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = hold;
    a.timeScale = speed;
    a.fadeIn(fade).play();
    if (current && current !== a) current.fadeOut(fade);
    current = a;
    const duration = a.getClip().duration / speed;
    // Volta ao idle antes do fim do clip para não expor a pose de bind entre as animações.
    returnAt = hold ? null : { action: a, at: clock + Math.max(0.05, duration - RETURN_FADE) };
    return duration;
  }

  function flash(color, seconds = 0.14) {
    for (const m of meshes) m.material.emissive.setHex(color);
    flashLeft = seconds;
  }

  function update(dt) {
    clock += dt;
    if (returnAt && clock >= returnAt.at) {
      if (current === returnAt.action) {
        current = null;
        loop(idleName, RETURN_FADE);
      }
      returnAt = null;
    }
    mixer.update(dt);
    if (flashLeft > 0) {
      flashLeft -= dt;
      if (flashLeft <= 0) for (const m of meshes) m.material.emissive.copy(m.userData.baseEmissive);
    }
  }

  function dispose() {
    mixer.stopAllAction();
    for (const m of meshes) m.material.dispose();
  }

  function tintNamed(name, hex) {
    const o = named.get(name);
    if (!o || hex == null) return;
    const tint = new THREE.Color(hex);
    o.traverse((m) => {
      if (!m.isMesh || !m.userData.baseColor) return;
      m.material.color.copy(m.userData.baseColor).multiply(tint);
    });
  }

  function setPartVisible(name, visible) {
    const o = named.get(name);
    if (o) o.visible = Boolean(visible);
  }

  function applyLook(look = DEFAULT_LOOK, classId = 'GUERREIRO') {
    const parts = CLASS_PARTS[classId] || CLASS_PARTS.GUERREIRO;
    const next = { ...DEFAULT_LOOK, ...look };
    if (parts.head) tintNamed(parts.head, SKINS[next.skin] ?? SKINS.fair);
    for (const name of parts.body || []) tintNamed(name, ARMORS[next.armor] ?? ARMORS.steel);
    if (parts.helmet) {
      setPartVisible(parts.helmet, next.helmet !== false);
      tintNamed(parts.helmet, METALS[next.metal] ?? METALS.gold);
    }
    if (parts.cape) {
      setPartVisible(parts.cape, next.cape !== false);
      tintNamed(parts.cape, CAPES[next.capeColor] ?? CAPES.crimson);
    }
    const s = Number(next.scale);
    model.scale.setScalar(baseScale * (Number.isFinite(s) ? s : 1));
    idleName = clips.has(next.stance) ? next.stance : 'Idle';
    if (!returnAt) loop(idleName);
  }

  /** Mostra só as malhas em `glowByName` e dá a elas um brilho na cor da raridade. */
  function setGear(all, glowByName) {
    for (const name of all) {
      const o = named.get(name);
      if (!o) continue;
      const glow = glowByName.get(name);
      o.visible = glow !== undefined;
      o.traverse((m) => {
        if (!m.isMesh) return;
        m.userData.baseEmissive.setHex(glow ?? 0x000000);
        m.material.emissive.copy(m.userData.baseEmissive);
        m.material.emissiveIntensity = glow ? 0.55 : 1;
      });
    }
  }

  /** Brilho suave nas peças de corpo conforme raridade da armadura equipada. */
  function applyArmorGlow(parts, rarityHex) {
    const names = [...(parts.body || [])];
    if (typeof parts.helmet === 'string') names.push(parts.helmet);
    for (const name of names) {
      const o = named.get(name);
      if (!o) continue;
      o.traverse((m) => {
        if (!m.isMesh || !m.material?.emissive) return;
        if (rarityHex == null) {
          m.material.emissive.copy(m.userData.baseEmissive || new THREE.Color(0x000000));
          m.material.emissiveIntensity = 1;
          return;
        }
        m.material.emissive.setHex(rarityHex);
        m.material.emissiveIntensity = 0.28;
      });
    }
  }

  return {
    holder,
    height: realHeight,
    loop,
    once,
    flash,
    update,
    dispose,
    setGear,
    applyLook,
    applyArmorGlow,
  };
}

export function createScene3D(root, { goldTarget, onTarget = () => {}, onTargetHp = () => {}, onHeroHp = () => {} }) {
  const arena = root;
  const fxLayer = arena.querySelector('.arena__fx');
  const idleMsg = arena.querySelector('.arena__idle-msg');

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.className = 'arena__canvas';
  renderer.domElement.style.cursor = 'grab';
  arena.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 2, 0.1, 90);
  camera.position.copy(CAM_HOME);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(CAM_TARGET);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 3.5;
  controls.maxDistance = 14;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = 1.45;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.update();

  let camReturn = null;
  controls.addEventListener('start', () => {
    camReturn = null;
    renderer.domElement.style.cursor = 'grabbing';
  });
  controls.addEventListener('end', () => {
    renderer.domElement.style.cursor = 'grab';
  });
  renderer.domElement.addEventListener('dblclick', resetCamera);

  function resetCamera() {
    camReturn = { from: camera.position.clone(), t: 0 };
  }

  const fsBtn = document.createElement('button');
  fsBtn.type = 'button';
  fsBtn.className = 'arena__fs';
  fsBtn.title = 'Tela cheia';
  fsBtn.textContent = '⛶';
  arena.appendChild(fsBtn);
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else arena.requestFullscreen?.().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    arena.classList.toggle('is-fullscreen', document.fullscreenElement === arena);
  });

  const hemi = new THREE.HemisphereLight(0xfff0d8, 0x2a1c14, 0.72);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b8, 1.55);
  sun.position.set(-4, 8, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -5;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffc878, 0.35);
  fill.position.set(2, 3, 4);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x8fb0ff, 0.55);
  rim.position.set(3, 4, -6);
  scene.add(rim);
  const torch = new THREE.PointLight(0xff8a3d, 0.85, 14, 2);
  torch.position.set(-2.2, 2.4, 1.2);
  scene.add(torch);

  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(30, 64),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.9, 3.0, 64),
    new THREE.MeshBasicMaterial({ color: 0xc9a050, transparent: true, opacity: 0.18 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.01;
  scene.add(ring);

  const glow = glowTexture();
  const tweens = [];
  const flickers = [];
  const floaters = [];
  let zoneGroup = null;
  let particles = null;
  let particleMode = 'float';
  let zoneId = null;
  let shakeLeft = 0;
  let active = false;
  let elapsed = 0;

  const loadingEl = document.createElement('div');
  loadingEl.className = 'arena__loading hidden';
  loadingEl.textContent = 'Carregando modelos 3D…';
  arena.appendChild(loadingEl);

  const plate = document.createElement('div');
  plate.className = 'plate3d hidden';
  plate.innerHTML = '<div class="plate3d__name"><strong></strong><span></span></div><div class="bar"><span></span></div>';
  arena.appendChild(plate);
  const plateName = plate.querySelector('strong');
  const plateLevel = plate.querySelector('.plate3d__name span');
  const plateBar = plate.querySelector('.bar span');

  const heroPlate = document.createElement('div');
  heroPlate.className = 'plate3d plate3d--hero hidden';
  heroPlate.innerHTML = '<div class="bar hp"><span></span></div>';
  arena.appendChild(heroPlate);
  const heroBar = heroPlate.querySelector('.bar span');

  let hero = null;
  let heroCfg = null;
  let heroClass = null;
  let petMesh = null;
  let petId = null;
  let attackStyle = weaponStyle(null);
  let monster = null;
  let monsterCfg = null;
  let monsterName = null;
  let monsterVisualId = null;
  let dyingMonster = null;
  let pendingLoads = 0;

  function tween(dur, apply, { ease = easeOut, done } = {}) {
    tweens.push({ dur, t: 0, apply, ease, done });
  }

  function setLoading(delta) {
    pendingLoads += delta;
    loadingEl.classList.toggle('hidden', pendingLoads <= 0 || !active);
  }

  function setBar(span, value, max) {
    span.style.width = `${Math.max(0, Math.min(100, (value / max) * 100))}%`;
  }

  function toScreen(v) {
    const p = v.clone().project(camera);
    const w = renderer.domElement.clientWidth;
    const h = renderer.domElement.clientHeight;
    return { x: ((p.x + 1) / 2) * w, y: ((1 - p.y) / 2) * h };
  }

  function headOf(actor, extra = 0.15) {
    return actor.holder.position.clone().add(new THREE.Vector3(0, actor.height + extra, 0));
  }

  function chestOf(actor) {
    return actor.holder.position.clone().add(new THREE.Vector3(0, actor.height * 0.55, 0));
  }

  function textOver(actor, text, cls) {
    if (!actor) return;
    const p = toScreen(headOf(actor, -0.1));
    floatText(fxLayer, p.x, p.y, text, cls);
  }

  function viewportPoint(v) {
    const p = toScreen(v);
    const r = renderer.domElement.getBoundingClientRect();
    return { x: r.left + p.x, y: r.top + p.y };
  }

  // ——— Cenário ———
  function disposeGroup(group) {
    group.traverse((o) => {
      if (o.isInstancedMesh && o.instanceMatrix) o.instanceMatrix = null;
      if (!o.isSprite && !o.userData?.sharedGeometry) o.geometry?.dispose();
      if (o.material && !o.userData?.sharedMaterial) {
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
      }
    });
    scene.remove(group);
  }

  function std(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...opts });
  }

  function shadowed(obj) {
    obj.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    obj.userData.occluder = true;
    return obj;
  }

  /** Espalha objetos em anel ao redor da arena (a câmera pode girar 360°). */
  function placeAround(rand, count, build, { minR = 4.5, maxR = 11 } = {}) {
    const group = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const r = minR + rand() * (maxR - minR);
      const obj = build(rand, i);
      obj.position.set(Math.cos(a) * r * 1.15, obj.position.y, Math.sin(a) * r);
      obj.rotation.y = rand() * Math.PI * 2;
      group.add(shadowed(obj));
    }
    return group;
  }

  let occluders = [];
  function collectOccluders() {
    occluders = [];
    zoneGroup.traverse((o) => {
      if (!o.userData.occluder) return;
      const mats = new Set();
      o.traverse((m) => m.isMesh && mats.add(m.material));
      o.userData.mats = [...mats];
      o.userData.fade = 1;
      occluders.push(o);
    });
  }

  const tmpV = new THREE.Vector3();
  /** Deixa semitransparente o que estiver entre a câmera e a luta. */
  function fadeOccluders(dt) {
    const cam = camera.position;
    const tgt = controls.target;
    const dx = cam.x - tgt.x;
    const dz = cam.z - tgt.z;
    const len = Math.hypot(dx, dz) || 1;
    for (const o of occluders) {
      o.getWorldPosition(tmpV);
      const px = tmpV.x - tgt.x;
      const pz = tmpV.z - tgt.z;
      const t = (px * dx + pz * dz) / (len * len);
      const lateral = Math.abs(px * dz - pz * dx) / len;
      const blocks = t > 0.15 && t < 1.15 && lateral < 2.3;
      const goal = blocks ? 0.15 : 1;
      const prev = o.userData.fade;
      const next = prev + (goal - prev) * Math.min(1, dt * 8);
      if (Math.abs(next - prev) < 0.002 && next === goal) continue;
      o.userData.fade = Math.abs(next - goal) < 0.01 ? goal : next;
      const f = o.userData.fade;
      for (const m of o.userData.mats) {
        if (m.userData.baseOpacity == null) m.userData.baseOpacity = m.opacity;
        m.transparent = f < 1 || m.userData.baseOpacity < 1;
        m.depthWrite = f >= 1;
        m.opacity = m.userData.baseOpacity * f;
      }
    }
  }

  const PROPS = {
    forest(rand) {
      return placeAround(rand, 44, (r) => {
        const g = new THREE.Group();
        const s = 0.8 + r() * 0.9;
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.13, 0.9, 6), std(0x4a3222));
        trunk.position.y = 0.45;
        g.add(trunk);
        const leaf = std(r() > 0.5 ? 0x2c5a34 : 0x24482c);
        for (let k = 0; k < 3; k++) {
          const cone = new THREE.Mesh(new THREE.ConeGeometry(0.7 - k * 0.15, 1.1, 7), leaf);
          cone.position.y = 1.0 + k * 0.5;
          g.add(cone);
        }
        g.scale.setScalar(s);
        return g;
      });
    },
    graveyard(rand) {
      const group = placeAround(rand, 36, (r) => {
        const g = new THREE.Group();
        const stone = std(0x6a6a72);
        if (r() > 0.4) {
          const slab = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.7, 0.12), stone);
          slab.position.y = 0.35;
          const top = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 12, 1, false, 0, Math.PI), stone);
          top.rotation.x = Math.PI / 2;
          top.rotation.z = Math.PI / 2;
          top.position.y = 0.7;
          g.add(slab, top);
        } else {
          const v = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), stone);
          v.position.y = 0.45;
          const hz = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.1, 0.1), stone);
          hz.position.y = 0.65;
          g.add(v, hz);
        }
        g.rotation.z = (r() - 0.5) * 0.25;
        return g;
      }, { minR: 3.8, maxR: 9 });
      group.add(
        placeAround(rand, 10, (r) => {
          const g = new THREE.Group();
          const bark = std(0x2a2420);
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 2.2, 5), bark);
          trunk.position.y = 1.1;
          g.add(trunk);
          for (let k = 0; k < 3; k++) {
            const br = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.9, 4), bark);
            br.position.y = 1.3 + k * 0.3;
            br.rotation.z = (r() > 0.5 ? 1 : -1) * (0.6 + r() * 0.5);
            br.position.x = br.rotation.z > 0 ? -0.3 : 0.3;
            g.add(br);
          }
          return g;
        }, { minR: 7, maxR: 12 }),
      );
      return group;
    },
    garden(rand) {
      return placeAround(rand, 48, (r) => {
        const g = new THREE.Group();
        const s = 0.5 + r() * 1.1;
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 0.5, 6), std(0xe8dcc8));
        stem.position.y = 0.25;
        const hue = r() > 0.5 ? 0xff5fb0 : 0x5fffd0;
        const cap = new THREE.Mesh(
          new THREE.SphereGeometry(0.28, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2),
          std(hue, { emissive: hue, emissiveIntensity: 0.6, flatShading: false }),
        );
        cap.position.y = 0.48;
        g.add(stem, cap);
        g.scale.setScalar(s);
        return g;
      }, { minR: 3.6, maxR: 10 });
    },
    crypt(rand) {
      const group = placeAround(rand, 22, (r) => {
        const g = new THREE.Group();
        const stone = std(0x4a3a34);
        const hgt = 1.2 + r() * 2.4;
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, hgt, 8), stone);
        col.position.y = hgt / 2;
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.25, 0.9), stone);
        base.position.y = 0.12;
        g.add(col, base);
        return g;
      }, { minR: 4.5, maxR: 10 });
      for (const x of [-3.6, 3.6]) {
        const g = new THREE.Group();
        const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.18, 0.3, 10), std(0x2a2220));
        bowl.position.y = 0.9;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 0.8, 6), std(0x2a2220));
        leg.position.y = 0.4;
        const fire = new THREE.Mesh(
          new THREE.SphereGeometry(0.22, 10, 8),
          new THREE.MeshBasicMaterial({ color: 0xffa040 }),
        );
        fire.position.y = 1.15;
        const light = new THREE.PointLight(0xff7a2a, 6, 7, 1.6);
        light.position.y = 1.3;
        g.add(bowl, leg, fire, light);
        g.position.set(x, 0, -1.6);
        flickers.push({ light, base: 6, fire });
        group.add(shadowed(g));
      }
      return group;
    },
    ruins(rand) {
      return placeAround(rand, 20, (r) => {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.3 + r() * 0.6), std(0x3a332c));
        rock.position.y = 0.2;
        return rock;
      });
    },
    swamp(rand) {
      const group = new THREE.Group();
      for (let i = 0; i < 9; i++) {
        const a = rand() * Math.PI * 2;
        const r = 3.4 + rand() * 7;
        const pool = new THREE.Mesh(
          new THREE.CircleGeometry(0.8 + rand() * 1.6, 20),
          std(0x2c4a2a, { roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.85, flatShading: false }),
        );
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(Math.cos(a) * r, 0.012, Math.sin(a) * r);
        pool.receiveShadow = true;
        group.add(pool);
      }
      group.add(
        placeAround(rand, 12, (r) => {
          const g = new THREE.Group();
          const bark = std(0x3a3424);
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 2.6, 6), bark);
          trunk.position.y = 1.3;
          trunk.rotation.z = (r() - 0.5) * 0.3;
          g.add(trunk);
          for (let k = 0; k < 4; k++) {
            const br = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 1.1, 4), bark);
            br.position.set((r() - 0.5) * 0.4, 1.5 + k * 0.3, (r() - 0.5) * 0.3);
            br.rotation.z = (r() > 0.5 ? 1 : -1) * (0.7 + r() * 0.6);
            g.add(br);
            const moss = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.6, 4), std(0x5a7a3a));
            moss.position.set(br.position.x + Math.sign(br.rotation.z) * -0.35, br.position.y - 0.3, br.position.z);
            moss.rotation.x = Math.PI;
            g.add(moss);
          }
          return g;
        }, { minR: 5.5, maxR: 12 }),
        placeAround(rand, 26, (r) => {
          const g = new THREE.Group();
          const reed = std(r() > 0.5 ? 0x6a7a3a : 0x55642e);
          const n = 4 + Math.floor(r() * 4);
          for (let k = 0; k < n; k++) {
            const h = 0.5 + r() * 0.7;
            const s = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, h, 3), reed);
            s.position.set((r() - 0.5) * 0.35, h / 2, (r() - 0.5) * 0.35);
            s.rotation.z = (r() - 0.5) * 0.3;
            g.add(s);
            if (r() > 0.6) {
              const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.14, 5), std(0x4a3420));
              tip.position.set(s.position.x, h, s.position.z);
              g.add(tip);
            }
          }
          return g;
        }, { minR: 3.2, maxR: 10 }),
        placeAround(rand, 10, (r) => {
          const hue = 0x9aff5a;
          const cap = new THREE.Mesh(
            new THREE.SphereGeometry(0.12 + r() * 0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            std(hue, { emissive: hue, emissiveIntensity: 0.8, flatShading: false }),
          );
          cap.position.y = 0.02;
          return cap;
        }, { minR: 3.5, maxR: 9 }),
      );
      return group;
    },
    ice(rand) {
      const group = new THREE.Group();
      const iceMat = () =>
        std(0xbfe8ff, { emissive: 0x2a6a9a, emissiveIntensity: 0.45, roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.88 });
      group.add(
        placeAround(rand, 30, (r) => {
          const g = new THREE.Group();
          const s = 0.8 + r() * 1.0;
          const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.6, 6), std(0x3a2a20));
          trunk.position.y = 0.3;
          g.add(trunk);
          for (let k = 0; k < 3; k++) {
            const w = 0.75 - k * 0.18;
            const cone = new THREE.Mesh(new THREE.ConeGeometry(w, 0.95, 7), std(0x1f3a34));
            cone.position.y = 0.8 + k * 0.48;
            const snow = new THREE.Mesh(new THREE.ConeGeometry(w * 0.72, 0.45, 7), std(0xf4f8ff));
            snow.position.y = cone.position.y + 0.3;
            g.add(cone, snow);
          }
          g.scale.setScalar(s);
          return g;
        }, { minR: 6, maxR: 13 }),
        placeAround(rand, 16, (r) => {
          const g = new THREE.Group();
          const n = 2 + Math.floor(r() * 3);
          for (let k = 0; k < n; k++) {
            const h = 0.6 + r() * 1.6;
            const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), iceMat());
            c.scale.set(0.6 + r() * 0.4, h, 0.6 + r() * 0.4);
            c.position.set((r() - 0.5) * 0.7, h * 0.28, (r() - 0.5) * 0.7);
            c.rotation.set((r() - 0.5) * 0.5, r() * 3, (r() - 0.5) * 0.5);
            g.add(c);
          }
          return g;
        }, { minR: 3.8, maxR: 10 }),
        placeAround(rand, 14, (r) => {
          const mound = new THREE.Mesh(
            new THREE.SphereGeometry(0.5 + r() * 0.9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
            std(0xf0f4fa),
          );
          mound.scale.y = 0.35 + r() * 0.3;
          return mound;
        }, { minR: 3.5, maxR: 11 }),
      );
      return group;
    },
    abyss(rand) {
      const group = new THREE.Group();
      const crystal = () => std(0xb06aff, { emissive: 0x7a2aff, emissiveIntensity: 0.9 });
      group.add(
        placeAround(rand, 8, (r) => {
          const g = new THREE.Group();
          const h = 2.6 + r() * 2.2;
          const stone = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, h, 4), std(0x1e1828));
          stone.position.y = h / 2;
          const rune = new THREE.Mesh(new THREE.BoxGeometry(0.06, h * 0.55, 0.06), crystal());
          rune.position.set(0, h * 0.5, 0.3);
          rune.rotation.y = Math.PI / 4;
          const tip = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), crystal());
          tip.position.y = h + 0.35;
          g.add(stone, rune, tip);
          floaters.push({ obj: tip, base: tip.position.y, speed: 1.2 + r(), phase: r() * 6, amp: 0.12 });
          return g;
        }, { minR: 5, maxR: 11 }),
        placeAround(rand, 18, (r) => {
          const g = new THREE.Group();
          const n = 1 + Math.floor(r() * 3);
          for (let k = 0; k < n; k++) {
            const h = 0.4 + r() * 1.1;
            const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), crystal());
            c.scale.set(0.7, h * 2, 0.7);
            c.position.set((r() - 0.5) * 0.6, h * 0.35, (r() - 0.5) * 0.6);
            c.rotation.z = (r() - 0.5) * 0.6;
            g.add(c);
          }
          return g;
        }, { minR: 3.6, maxR: 10 }),
      );
      const rocks = placeAround(rand, 12, (r) => {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.35 + r() * 0.7, 0), std(0x2a2236));
        rock.position.y = 2.2 + r() * 3;
        floaters.push({ obj: rock, base: rock.position.y, speed: 0.4 + r() * 0.5, phase: r() * 6, amp: 0.3, spin: (r() - 0.5) * 0.4 });
        return rock;
      }, { minR: 5, maxR: 13 });
      group.add(rocks);
      const ringGlow = new THREE.Mesh(
        new THREE.RingGeometry(3.2, 3.5, 64),
        new THREE.MeshBasicMaterial({ color: 0x9a4aff, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      ringGlow.rotation.x = -Math.PI / 2;
      ringGlow.position.y = 0.015;
      group.add(ringGlow);
      floaters.push({ obj: ringGlow, pulse: true });
      return group;
    },
  };

  function buildParticles(cfg) {
    if (particles) {
      particles.geometry.dispose();
      particles.material.dispose();
      scene.remove(particles);
    }
    particleMode = cfg.particles || 'float';
    const snow = particleMode === 'snow';
    const count = snow ? 420 : 220;
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 26;
      pos[i * 3 + 1] = Math.random() * (snow ? 7 : 4);
      pos[i * 3 + 2] = (Math.random() - 0.5) * 24;
      seed[i] = Math.random() * 100;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.userData.seed = seed;
    geo.userData.base = pos.slice();
    const mat = new THREE.PointsMaterial({
      color: cfg.particle,
      size: snow ? 0.075 : 0.09,
      map: glow,
      transparent: true,
      depthWrite: false,
      blending: snow ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    particles = new THREE.Points(geo, mat);
    scene.add(particles);
  }

  function updateParticles(dt) {
    if (!particles) return;
    const pos = particles.geometry.attributes.position;
    const { seed, base } = particles.geometry.userData;
    for (let i = 0; i < seed.length; i++) {
      const s = seed[i];
      const bx = base[i * 3];
      if (particleMode === 'embers' || particleMode === 'rise') {
        const speed = particleMode === 'rise' ? 0.25 + (s % 1) * 0.35 : 0.4 + (s % 1) * 0.6;
        let y = pos.getY(i) + dt * speed;
        if (y > 4.5) y = 0;
        pos.setY(i, y);
        pos.setX(i, bx + Math.sin(elapsed * 0.8 + s) * 0.3);
        if (particleMode === 'rise') pos.setZ(i, base[i * 3 + 2] + Math.cos(elapsed * 0.6 + s) * 0.3);
      } else if (particleMode === 'snow') {
        let y = pos.getY(i) - dt * (0.6 + (s % 1) * 0.5);
        if (y < 0) y = 7;
        pos.setY(i, y);
        pos.setX(i, bx + Math.sin(elapsed * 0.7 + s) * 0.4 + elapsed * 0.15 % 1);
      } else {
        pos.setX(i, bx + Math.sin(elapsed * 0.3 + s) * 0.5);
        pos.setY(i, base[i * 3 + 1] + Math.sin(elapsed * 0.5 + s * 2) * 0.3);
      }
    }
    pos.needsUpdate = true;
    particles.material.opacity = particleMode === 'snow' ? 0.9 : 0.65 + Math.sin(elapsed * 2) * 0.2;
  }

  function updateFloaters(dt) {
    for (const f of floaters) {
      if (f.pulse) {
        f.obj.material.opacity = 0.25 + Math.sin(elapsed * 1.6) * 0.12;
        continue;
      }
      f.obj.position.y = f.base + Math.sin(elapsed * f.speed + f.phase) * f.amp;
      if (f.spin) f.obj.rotation.y += dt * f.spin;
    }
  }

  /** Temas salvos pelo admin (id → scene override). */
  let zoneThemes = {};

  function mergeZoneCfg(id) {
    const base = ZONES[id] || ZONES.idle;
    const o = zoneThemes[id] || {};
    const hemi = [...(base.hemi || [0x888888, 0x222222, 0.5])];
    const sun = [...(base.sun || [0xffffff, 1])];
    if (o.hemiSky != null) hemi[0] = o.hemiSky;
    if (o.hemiGround != null) hemi[1] = o.hemiGround;
    if (o.hemiIntensity != null) hemi[2] = o.hemiIntensity;
    if (o.sunColor != null) sun[0] = o.sunColor;
    if (o.sunIntensity != null) sun[1] = o.sunIntensity;
    const fog = base.fog ? [...base.fog] : [11, 32];
    if (o.fogNear != null) fog[0] = o.fogNear;
    if (o.fogFar != null) fog[1] = o.fogFar;
    const particles =
      o.particles === null ? null : o.particles != null ? o.particles : base.particles || 'float';
    const particle = o.particleColor != null ? o.particleColor : base.particle;
    const density =
      o.propDensity != null
        ? Math.max(0.5, Math.min(2, Number(o.propDensity) || 1))
        : base.density ?? 1;
    return {
      ...base,
      bg: o.bg != null ? o.bg : base.bg,
      ground: o.ground != null ? o.ground : base.ground,
      hemi,
      sun,
      fog,
      props: o.props || base.props,
      particles,
      particle,
      density,
      variant: o.variant || base.variant || undefined,
      decorationMode: o.decorationMode === 'overlay' || o.decorationMode === 'off' ? o.decorationMode : undefined,
      decorations: Array.isArray(o.decorations) ? o.decorations : undefined,
    };
  }

  /** Evita corrida idle×primeira zona no boot (última applyZone ganhava e apagava o override). */
  let applyZoneToken = 0;

  async function applyZone(id) {
    const token = ++applyZoneToken;
    const cfg = mergeZoneCfg(id);
    const density = cfg.density ?? 1;
    const propsKind = cfg.props || 'ruins';
    const seed = rng(zonePropSeed(id, propsKind, density));

    const showManuals = manualsVisibleInPlay(propsKind, cfg.decorationMode)
      && Array.isArray(cfg.decorations)
      && cfg.decorations.length > 0;

    await preloadKayKitProps(propsKind);
    if (token !== applyZoneToken) return;
    if (showManuals) await preloadDecorationPacks(cfg.decorations);
    if (token !== applyZoneToken) return;

    let built = buildKayKitZone(propsKind, seed, { density, variant: cfg.variant });
    let meshCount = 0;
    built?.traverse((o) => {
      if (o.isMesh) meshCount += 1;
    });
    // Se o pack KayKit não resolveu (cache async/404), usa o cenário procedural completo.
    if (meshCount === 0) {
      console.warn(
        '[jogo-idle] KayKit vazio (resolved=',
        kayKitResolvedCount(),
        ') — fallback procedural',
        propsKind,
      );
      if (built) disposeGroup(built);
      const build = PROPS[propsKind] || PROPS.ruins;
      built = build(seed);
    }
    if (showManuals) appendManualDecorations(built, cfg.decorations);
    if (token !== applyZoneToken) {
      if (built) disposeGroup(built);
      return;
    }

    const [near, far] = cfg.fog || [11, 32];
    scene.background = new THREE.Color(cfg.bg);
    scene.fog = new THREE.Fog(cfg.bg, near, far);
    ground.material.color.setHex(cfg.ground);
    hemi.color.setHex(cfg.hemi[0]);
    hemi.groundColor.setHex(cfg.hemi[1]);
    hemi.intensity = cfg.hemi[2];
    sun.color.setHex(cfg.sun[0]);
    sun.intensity = cfg.sun[1];
    ring.material.color.setHex(id === 'gelo' ? 0x8ab4e8 : id === 'abismo' ? 0x9a4aff : 0x818cf8);
    flickers.length = 0;
    floaters.length = 0;
    if (zoneGroup) disposeGroup(zoneGroup);
    zoneGroup = built;
    scene.add(zoneGroup);
    collectOccluders();
    buildParticles(cfg);
    setAmbience(id === 'idle' ? null : id);
  }
  // ——— Efeitos ———
  function spark(at, color = 0xfff0c8, size = 1.2) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glow, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
    );
    s.position.copy(at);
    scene.add(s);
    tween(0.32, (k) => {
      s.scale.setScalar(0.2 + k * size);
      s.material.opacity = 1 - k;
    }, {
      done: () => {
        s.material.dispose();
        scene.remove(s);
      },
    });
  }

  function projectile(kind, from, to, onHit, color) {
    let obj;
    if (kind === 'arrow') {
      obj = new THREE.Group();
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5),
        new THREE.MeshBasicMaterial({ color: 0xe8e0c8 }),
      );
      shaft.rotation.z = Math.PI / 2;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.1, 5), new THREE.MeshBasicMaterial({ color: 0xcfd8dc }));
      tip.rotation.z = -Math.PI / 2;
      tip.position.x = 0.32;
      obj.add(shaft, tip);
      if (to.x < from.x) obj.rotation.y = Math.PI;
    } else {
      obj = new THREE.Group();
      const c = color ?? 0x9fd6ff;
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      const halo = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: glow, color: c, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
      );
      halo.scale.setScalar(0.7);
      obj.add(core, halo);
    }
    obj.position.copy(from);
    scene.add(obj);
    const lift = kind === 'arrow' ? 0.35 : 0.15;
    tween(0.26, (k) => {
      obj.position.lerpVectors(from, to, k);
      obj.position.y += Math.sin(k * Math.PI) * lift;
    }, {
      ease: (k) => k,
      done: () => {
        disposeGroup(obj);
        onHit();
      },
    });
  }

  function levelRing(at) {
    for (const delay of [0, 0.18]) {
      const m = new THREE.Mesh(
        new THREE.RingGeometry(0.35, 0.45, 48),
        new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
      );
      m.rotation.x = -Math.PI / 2;
      m.position.set(at.x, 0.05, at.z);
      m.visible = false;
      scene.add(m);
      setTimeout(() => {
        m.visible = true;
        tween(1.0, (k) => {
          m.scale.setScalar(1 + k * 6);
          m.material.opacity = 1 - k;
        }, { done: () => disposeGroup(m) });
      }, delay * 1000);
    }
    const pillar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.7, 3, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }),
    );
    pillar.position.set(at.x, 1.5, at.z);
    scene.add(pillar);
    tween(1.3, (k) => {
      pillar.material.opacity = Math.sin(k * Math.PI) * 0.35;
      pillar.scale.set(1 - k * 0.4, 1, 1 - k * 0.4);
    }, { ease: (k) => k, done: () => disposeGroup(pillar) });
  }

  // ——— Personagens ———
  /** Birth look permanente — cosméticos de salão não sobrescrevem estas tintas. */
  let heroLook = DEFAULT_LOOK;

  function applyGear(equipment) {
    attackStyle = weaponStyle(equipment);
    if (!hero || !heroCfg) return;
    const glow = new Map();
    const w = equipment?.weapon;
    const o = equipment?.offhand;
    if (w?.visual) glow.set(w.visual, RARITY_COLORS[w.rarity] ?? 0xb5ad9c);
    if (o?.visual) glow.set(o.visual, RARITY_COLORS[o.rarity] ?? 0xb5ad9c);
    hero.setGear(heroCfg.gear, glow);

    // Tint/emissive nas partes do Adventurer conforme slots de armadura (sem trocar malha).
    const parts = CLASS_PARTS[heroClass] || CLASS_PARTS.GUERREIRO;
    const armorSlots = ['head', 'chest', 'legs', 'gloves', 'boots'];
    let armorTint = null;
    for (const slot of armorSlots) {
      const piece = equipment?.[slot];
      if (piece?.rarity && RARITY_COLORS[piece.rarity] != null) {
        armorTint = RARITY_COLORS[piece.rarity];
        break;
      }
    }
    hero.applyArmorGlow?.(parts, armorTint);
  }

  function applyHeroLook() {
    if (!hero) return;
    hero.applyLook(heroLook, heroClass);
  }

  function clearPet() {
    if (!petMesh) return;
    scene.remove(petMesh);
    petMesh.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    petMesh = null;
    petId = null;
  }

  function setPetCompanion(nextId) {
    const id = nextId && typeof nextId === 'string' ? nextId : null;
    if (id === petId) return;
    clearPet();
    if (!id) return;
    const mesh = createPetMesh(id);
    if (!mesh) return;
    mesh.position.set(PET_X, 0, PET_Z);
    mesh.rotation.y = Math.PI / 2;
    scene.add(mesh);
    petMesh = mesh;
    petId = id;
  }

  async function setHero(id, hp, maxHp, equipment, appearance, nextPetId) {
    if (appearance) heroLook = { ...DEFAULT_LOOK, ...appearance };
    if (!timeline.busy()) setBar(heroBar, hp, maxHp);
    setPetCompanion(nextPetId);
    const cfg = HEROES[id] || HEROES.GUERREIRO;
    if (heroClass === id && hero) {
      applyGear(equipment);
      applyHeroLook();
      return;
    }
    heroClass = id;
    setLoading(1);
    try {
      const gltf = await loadModel(cfg.file);
      if (heroClass !== id) return;
      if (hero) {
        scene.remove(hero.holder);
        hero.dispose();
      }
      hero = createActor(gltf, { hide: cfg.gear, height: HERO_HEIGHT });
      heroCfg = cfg;
      hero.holder.position.set(HERO_X, 0, 0);
      hero.holder.rotation.y = Math.PI / 2;
      scene.add(hero.holder);
      applyGear(equipment);
      applyHeroLook();
    } finally {
      setLoading(-1);
    }
  }

  function removeMonster(m) {
    if (!m) return;
    scene.remove(m.holder);
    m.dispose();
  }

  async function setMonster(target, animate) {
    if (!target) {
      monsterName = null;
      removeMonster(monster);
      removeMonster(dyingMonster);
      monster = dyingMonster = null;
      onTarget(null);
      return;
    }
    plateName.textContent = target.name;
    plateLevel.textContent = `Nv. ${target.level}`;
    setBar(plateBar, target.hp, target.maxHp);
    onTarget(target);

    const nextVisual = target.visualId || null;
    if (monsterName === target.name && monsterVisualId === nextVisual && monster && !animate) return;
    monsterName = target.name;
    monsterVisualId = nextVisual;
    const cfg = resolveMonsterCfg(target);
    setLoading(1);
    try {
      const gltf = await loadModel(cfg.file);
      if (monsterName !== target.name || monsterVisualId !== nextVisual) return;
      removeMonster(monster);
      monster = createActor(gltf, { tint: cfg.tint, emissive: cfg.emissive, height: MONSTER_HEIGHT, scale: cfg.scale });
      monsterCfg = cfg;
      monster.holder.position.set(MONSTER_X, 0, 0);
      monster.holder.rotation.y = -Math.PI / 2;
      monster.loop('Idle_Combat');
      if (animate) {
        monster.once('Spawn_Ground_Skeletons', { speed: 3, fade: 0 });
        spark(new THREE.Vector3(MONSTER_X, 0.2, 0), 0x9fc4ff, 2.2);
      }
      scene.add(monster.holder);
    } finally {
      setLoading(-1);
    }
  }

  // ——— Eventos de combate ———
  function onAttack(e) {
    if (!hero || !monster) return;
    const target = monster;
    const hit = () => {
      if (target !== monster) return;
      const at = chestOf(target);
      spark(at, e.crit ? 0xffd54a : 0xfff0c8, e.crit ? 2.4 : 1.3);
      sfx(e.crit ? 'crit' : 'hit');
      target.flash(e.crit ? 0xffd080 : 0xffffff);
      if (e.monsterHp > 0) target.once('Hit_A', { speed: 1.6 });
      textOver(target, e.crit ? `${e.dmg}!` : `${e.dmg}`, e.crit ? 'crit' : 'dmg');
      setBar(plateBar, e.monsterHp, e.monsterMaxHp);
      onTargetHp(e.monsterHp, e.monsterMaxHp);
      if (e.crit) {
        shakeLeft = 0.25;
        shake(arena, 4);
      }
    };

    const style = attackStyle;
    const attack = style.attacks[Math.floor(Math.random() * style.attacks.length)];
    if (style.melee) {
      sfx(style.sound);
      const h = hero.holder;
      tween(0.16, (k) => (h.position.x = HERO_X + (MONSTER_X - 1.15 - HERO_X) * k));
      hero.once(attack, { speed: 1.7 });
      timeline.later(260, hit);
      timeline.later(520, () => tween(0.25, (k) => (h.position.x = MONSTER_X - 1.15 + (HERO_X - (MONSTER_X - 1.15)) * k), { ease: easeInOut }));
    } else {
      hero.once(attack, { speed: 1.7 });
      timeline.later(140, () => {
        sfx(style.sound);
        const from = hero.holder.position.clone().add(new THREE.Vector3(0.45, hero.height * 0.62, 0));
        projectile(style.projectile, from, chestOf(target), hit);
      });
    }
  }

  function onHurt(e) {
    if (!hero || !monster) return;
    const cfg = monsterCfg;
    const anim = cfg.attacks[Math.floor(Math.random() * cfg.attacks.length)];
    monster.once(anim, { speed: 1.6 });

    const react = () => {
      if (!hero) return;
      if (e.dmg > 0) {
        sfx('hurt');
        hero.flash(0xff2a1a);
        hero.once('Hit_A', { speed: 1.5 });
        textOver(hero, `-${e.dmg}`, 'hurt');
      } else {
        hero.once('Block', { speed: 1.8 });
        textOver(hero, 'Bloqueio', 'block');
        spark(chestOf(hero).add(new THREE.Vector3(0.3, 0, 0)), 0x9fc4ff, 0.9);
      }
      setBar(heroBar, e.hp, e.maxHp);
      onHeroHp(e.hp, e.maxHp);
    };

    if (cfg.cast) {
      timeline.later(220, () => {
        if (!monster || !hero) return;
        sfx('magic');
        const from = monster.holder.position.clone().add(new THREE.Vector3(-0.4, monster.height * 0.6, 0));
        projectile('orb', from, chestOf(hero), react, cfg.cast);
      });
    } else {
      const m = monster.holder;
      tween(0.14, (k) => (m.position.x = MONSTER_X - 0.5 * k));
      timeline.later(240, react);
      timeline.later(420, () => tween(0.2, (k) => (m.position.x = MONSTER_X - 0.5 + 0.5 * k)));
    }
  }

  function onKill(e) {
    if (!monster) return;
    sfx('kill');
    const dying = monster;
    monster = null;
    monsterName = null;
    removeMonster(dyingMonster);
    dyingMonster = dying;
    dying.once('Death_C_Skeletons', { speed: 2, hold: true });
    textOver(dying, `+${e.xp} XP`, 'xp');
    flyCoins(viewportPoint(chestOf(dying)), goldTarget, coinCount(e.gold));
    setBar(heroBar, 1, 1);
    timeline.later(450, () => {
      if (dyingMonster !== dying) return;
      const y0 = dying.holder.position.y;
      tween(0.4, (k) => (dying.holder.position.y = y0 - k * 1.2), {
        ease: (k) => k * k,
        done: () => {
          if (dyingMonster === dying) dyingMonster = null;
          removeMonster(dying);
        },
      });
    });
  }

  function onDrop(e) {
    sfx('drop', { rarity: e.rarity });
    const actor = dyingMonster || monster;
    if (!actor) return;
    const p = toScreen(headOf(actor, 0.35));
    floatText(
      fxLayer,
      p.x,
      p.y,
      e.autoSoldFor ? `${e.name} → ${e.autoSoldFor}g` : e.name,
      `drop r-${e.rarity}`,
    );
  }

  function onSpawn(e) {
    sfx('spawn');
    setMonster(
      {
        name: e.monster,
        level: e.level,
        hp: e.monsterHp,
        maxHp: e.monsterMaxHp,
        attack: e.attack,
        defense: e.defense,
        isBoss: Boolean(e.isBoss),
      },
      true,
    );
  }

  function onLevelUp(e) {
    if (!hero) return;
    sfx('levelup');
    hero.once('Cheer', { speed: 1.2 });
    hero.flash(0xffd54a, 0.5);
    levelRing(hero.holder.position);
    const p = toScreen(headOf(hero, 0.2));
    levelUpBurst(fxLayer, p.x, p.y, e.level);
  }

  function onFaint() {
    if (!hero) return;
    sfx('faint');
    hero.once('Death_A', { speed: 1.2, hold: true });
    timeline.later(1800, () => hero?.once('Lie_StandUp', { speed: 1.4 }));
  }

  function skillTint(vfx) {
    if (vfx?.includes('rage') || vfx?.includes('massacre') || vfx?.includes('cleave')) return 0xff4422;
    if (vfx === 'fireball' || vfx?.includes('fire')) return 0xff6a2a;
    if (vfx === 'lightning' || vfx?.includes('lightning')) return 0x7ec8ff;
    if (vfx === 'ice' || vfx?.includes('ice') || vfx?.includes('frost')) return 0xa8e7ff;
    if (vfx?.includes('arcane') || vfx?.includes('mana') || vfx?.includes('nova')) return 0x6b7cff;
    if (vfx?.includes('arrow') || vfx?.includes('pierce') || vfx?.includes('rapid')) return 0x7dcea0;
    if (vfx?.includes('shield') || vfx?.includes('taunt')) return 0x9fc4ff;
    return 0xffd54a;
  }

  function onSkillCast(e) {
    if (!hero) return;
    if (e.sfx) sfx(e.sfx);
    const tint = skillTint(e.vfx);
    hero.flash(tint, 0.35);
    if (e.vfx === 'dash_gold' || e.vfx === 'rage_roar') {
      const h = hero.holder;
      tween(0.12, (k) => (h.position.x = HERO_X + 0.55 * k));
      timeline.later(220, () =>
        tween(0.2, (k) => (h.position.x = HERO_X + 0.55 - 0.55 * k), { ease: easeInOut }),
      );
    }
    if (e.vfx === 'rage_roar' || e.vfx === 'taunt_ring' || e.vfx === 'arcane_nova') {
      levelRing(hero.holder.position);
    }
    spark(chestOf(hero), tint, 1.2);
  }

  function onSkillHit(e) {
    if (!monster) return;
    if (e.sfx) sfx(e.sfx);
    else sfx(e.crit ? 'crit' : 'hit');
    const tint = skillTint(e.vfx);
    monster.flash(tint);
    spark(chestOf(monster), tint, e.crit ? 1.6 : 1.1);
    textOver(monster, `${e.crit ? '✦' : ''}-${e.dmg}`, e.crit ? 'crit' : 'dmg');
    setBar(monsterBar, e.monsterHp, e.monsterMaxHp);
    if (
      e.vfx === 'arcane_bolts' ||
      e.vfx === 'fireball' ||
      e.vfx === 'lightning' ||
      e.vfx === 'ice' ||
      e.vfx === 'rapid_shots' ||
      e.vfx === 'arrow_rain'
    ) {
      const from = hero.holder.position.clone().add(new THREE.Vector3(0.45, hero.height * 0.62, 0));
      const kind =
        e.vfx === 'rapid_shots' || e.vfx === 'arrow_rain'
          ? 'arrow'
          : 'orb';
      projectile(kind, from, chestOf(monster), () => {}, tint);
    }
    if (e.vfx === 'lightning') {
      levelRing(monster.holder.position);
    }
  }

  const timeline = createTimeline(
    {
      attack: onAttack,
      hurt: onHurt,
      kill: onKill,
      drop: onDrop,
      spawn: onSpawn,
      levelup: onLevelUp,
      faint: onFaint,
      skill_cast: onSkillCast,
      skill_hit: onSkillHit,
    },
    { minGap: MIN_GAP, maxBacklogMs: 3000 },
  );

  function play(events, finalTarget, opts) {
    if (opts?.duel) idleMsg.classList.add('hidden');
    timeline.play(
      events,
      () => {
        setMonster(finalTarget, false);
        opts?.onComplete?.();
      },
      opts,
    );
  }

  function clearCombat() {
    timeline.clear();
    setMonster(null);
  }

  function setZone(id) {
    arena.dataset.zone = id || 'idle';
    idleMsg.classList.toggle('hidden', Boolean(id));
    if (zoneId !== (id || 'idle')) {
      zoneId = id || 'idle';
      void applyZone(zoneId);
    }
    if (!id) {
      timeline.clear();
      setMonster(null);
    }
  }

  function setZoneThemes(map) {
    zoneThemes = map && typeof map === 'object' ? { ...map } : {};
    if (zoneId) void applyZone(zoneId);
  }

  // ——— Loop ———
  function resize() {
    const w = arena.clientWidth;
    const h = arena.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1.4 ? 46 : w / h > 2.4 ? 32 : 36;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(arena);

  function placePlate(el, actor, extra) {
    if (!actor || !active) {
      el.classList.add('hidden');
      return;
    }
    const p = toScreen(headOf(actor, extra));
    el.classList.remove('hidden');
    el.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
  }

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      tw.t += dt;
      const k = Math.min(1, tw.t / tw.dur);
      tw.apply(tw.ease(k));
      if (k >= 1) {
        tweens.splice(i, 1);
        tw.done?.();
      }
    }

    hero?.update(dt);
    monster?.update(dt);
    dyingMonster?.update(dt);
    if (petMesh) {
      petMesh.position.y = Math.sin(elapsed * 2.4) * 0.03;
      if (petId === 'parrot') {
        const wing = petMesh.children[3];
        if (wing) wing.rotation.x = Math.sin(elapsed * 8) * 0.35;
      }
    }
    updateParticles(dt);
    updateFloaters(dt);
    for (const f of flickers) {
      const n = Math.sin(elapsed * 13 + f.base) * 0.5 + Math.sin(elapsed * 7.3) * 0.5;
      f.light.intensity = f.base * (0.8 + n * 0.25);
      f.fire.scale.setScalar(1 + n * 0.12);
    }

    if (camReturn) {
      camReturn.t = Math.min(1, camReturn.t + dt / 0.6);
      camera.position.lerpVectors(camReturn.from, CAM_HOME, easeInOut(camReturn.t));
      controls.target.copy(CAM_TARGET);
      if (camReturn.t >= 1) camReturn = null;
    }
    controls.update(dt);
    fadeOccluders(dt);

    const shakeOffset = new THREE.Vector3();
    if (shakeLeft > 0) {
      shakeLeft -= dt;
      shakeOffset.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.08, 0);
      camera.position.add(shakeOffset);
    }
    renderer.render(scene, camera);
    camera.position.sub(shakeOffset);
    placePlate(plate, monster, 0.25);
    placePlate(heroPlate, hero, 0.2);
  }

  /** Arena explicitamente ligada via setActive — independente de aba oculta. */
  let explicitlyActive = false;
  /** Suspensão temporária (document.hidden) — NÃO limpa timeline nem combate. */
  let renderSuspended = false;

  function frameInstrumented(time) {
    frame(time);
    try {
      if (typeof globalThis.__idleNoteWebglFrame === 'function') {
        globalThis.__idleNoteWebglFrame(renderer);
      }
    } catch {
      /* probe opcional */
    }
  }

  function syncAnimationLoop() {
    const shouldRun = explicitlyActive && !renderSuspended;
    if (shouldRun) {
      resize();
      // Descarta delta acumulado em background — evita salto de animação.
      clock.getDelta();
      renderer.setAnimationLoop(frameInstrumented);
    } else {
      renderer.setAnimationLoop(null);
    }
  }

  /**
   * Suspensão temporária da renderização (aba oculta).
   * Não chama timeline.clear() nem esconde plates — distinto de setActive(false).
   */
  function setRenderSuspended(on) {
    renderSuspended = Boolean(on);
    syncAnimationLoop();
  }

  function setActive(on) {
    explicitlyActive = Boolean(on);
    active = explicitlyActive;
    renderer.domElement.classList.toggle('hidden', !on);
    if (on) {
      renderSuspended = false;
      syncAnimationLoop();
    } else {
      renderer.setAnimationLoop(null);
      timeline.clear();
      plate.classList.add('hidden');
      heroPlate.classList.add('hidden');
      renderSuspended = false;
    }
    setLoading(0);
  }

  /**
   * Destruição definitiva do contexto WebGL desta instância.
   * Não usar em troca de zona — só ao descartar a arena por completo.
   */
  function destroy() {
    explicitlyActive = false;
    active = false;
    renderSuspended = false;
    renderer.setAnimationLoop(null);
    timeline.clear();
    try {
      controls.dispose?.();
    } catch {
      /* ignore */
    }
    disposeGroup(zoneGroup);
    if (hero) {
      hero.dispose();
      scene.remove(hero.holder);
      hero = null;
    }
    removeMonster();
    clearPet();
    if (particles) {
      scene.remove(particles);
      particles.geometry.dispose();
      particles.material.dispose();
      particles = null;
    }
    try {
      renderer.dispose();
    } catch {
      /* ignore */
    }
    try {
      renderer.domElement.remove();
    } catch {
      /* ignore */
    }
  }

  zoneId = 'idle';
  void preloadKayKitProps('ruins').then(() => applyZone('idle'));

  return {
    play,
    setZone,
    setZoneThemes,
    setHero,
    setMonster,
    setActive,
    setRenderSuspended,
    destroy,
    clearCombat,
    clearQueue: timeline.clear,
  };
}
