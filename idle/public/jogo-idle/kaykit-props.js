/**
 * Cenário KayKit + Kenney + Quaternius (CC0).
 * https://kaylousberg.com/ · https://kenney.nl/ · https://quaternius.com/
 * Preload é lazy por kind de zona (não carrega todos os packs no boot).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { ensurePropCatalog, placeableEntry, searchPlaceables } from './prop-catalog.js';

export { ensurePropCatalog, placeableEntry, searchPlaceables };

/** Biblioteca KayKit completa (v2.0); dungeon/halloween/forest preferem kaykit/ com fallback em props/. */
const DUNGEON_DIR = '/jogo-idle/assets/kaykit/dungeon/';
const DUNGEON_FALLBACK_DIR = '/jogo-idle/assets/props/dungeon/';
const NATURE_DIR = '/jogo-idle/assets/props/nature/';
const FOREST_DIR = '/jogo-idle/assets/kaykit/forest/';
const CITY_DIR = '/jogo-idle/assets/props/city/';
const SPACE_DIR = '/jogo-idle/assets/props/space/';
const HALLOWEEN_DIR = '/jogo-idle/assets/kaykit/halloween/';
const HALLOWEEN_FALLBACK_DIR = '/jogo-idle/assets/props/halloween/';
const KENNEY_GRAVEYARD_DIR = '/jogo-idle/assets/kenney/graveyard/';
const KENNEY_NATURE_DIR = '/jogo-idle/assets/kenney/nature/';
const QUATERNIUS_SPACE_DIR = '/jogo-idle/assets/quaternius/space/';

/** Kenney Nature costuma ser ~5× maior — escala tipica nos decors. */
const KENNEY_NATURE_SCALE = 0.18;

const DUNGEON = {
  barrelL: 'barrel_large.gltf',
  barrelS: 'barrel_small.gltf',
  barrelStack: 'barrel_small_stack.gltf',
  barrelDeco: 'barrel_large_decorated.gltf',
  chest: 'chest.gltf',
  chestGold: 'chest_gold.gltf',
  column: 'column.gltf',
  pillar: 'pillar.gltf',
  pillarDeco: 'pillar_decorated.gltf',
  crates: 'crates_stacked.gltf',
  box: 'box_large.gltf',
  boxStack: 'box_stacked.gltf',
  candle: 'candle_lit.gltf',
  candleTrip: 'candle_triple.gltf',
  torch: 'torch_lit.gltf',
  torchBare: 'torch.gltf',
  torchWall: 'torch_mounted.gltf',
  tableS: 'table_small.gltf',
  tableM: 'table_medium.gltf',
  tableL: 'table_long.gltf',
  chair: 'chair.gltf',
  bannerR: 'banner_red.gltf',
  bannerB: 'banner_blue.gltf',
  bannerShield: 'banner_shield_red.gltf',
  bannerPattern: 'banner_patternA_red.gltf',
  wall: 'wall.gltf',
  wallBroken: 'wall_broken.gltf',
  wallCorner: 'wall_corner.gltf',
  wallDoor: 'wall_doorway.gltf',
  wallArch: 'wall_arched.gltf',
  wallCrack: 'wall_cracked.gltf',
  floorS: 'floor_tile_small.gltf',
  floorL: 'floor_tile_large.gltf',
  floorBroken: 'floor_tile_small_broken_A.gltf',
  floorWeed: 'floor_tile_small_weeds_A.gltf',
  floorRock: 'floor_tile_large_rocks.gltf',
  stairs: 'stairs.gltf',
  stairsWood: 'stairs_wood.gltf',
  shelf: 'shelf_large.gltf',
  shelfCandles: 'shelf_small_candles.gltf',
  swordShield: 'sword_shield.gltf',
  swordShieldGold: 'sword_shield_gold.gltf',
  barrier: 'barrier.gltf',
  barrierCol: 'barrier_column.gltf',
  key: 'key.gltf',
};

const DUNGEON_LEGACY = {
  barrelL: 'barrel_large.gltf.glb',
  barrelS: 'barrel_small.gltf.glb',
  barrelStack: 'barrel_small_stack.gltf.glb',
  barrelDeco: 'barrel_large_decorated.gltf.glb',
  chest: 'chest.glb',
  chestGold: 'chest_gold.glb',
  column: 'column.gltf.glb',
  pillar: 'pillar.gltf.glb',
  pillarDeco: 'pillar_decorated.gltf.glb',
  crates: 'crates_stacked.gltf.glb',
  box: 'box_large.gltf.glb',
  boxStack: 'box_stacked.gltf.glb',
  candle: 'candle_lit.gltf.glb',
  candleTrip: 'candle_triple.gltf.glb',
  torch: 'torch_lit.gltf.glb',
  torchBare: 'torch.gltf.glb',
  torchWall: 'torch_mounted.gltf.glb',
  tableS: 'table_small.gltf.glb',
  tableM: 'table_medium.gltf.glb',
  tableL: 'table_long.gltf.glb',
  chair: 'chair.gltf.glb',
  bannerR: 'banner_red.gltf.glb',
  bannerB: 'banner_blue.gltf.glb',
  bannerShield: 'banner_shield_red.gltf.glb',
  bannerPattern: 'banner_patternA_red.gltf.glb',
  wall: 'wall.gltf.glb',
  wallBroken: 'wall_broken.gltf.glb',
  wallCorner: 'wall_corner.gltf.glb',
  wallDoor: 'wall_doorway.glb',
  wallArch: 'wall_arched.gltf.glb',
  wallCrack: 'wall_cracked.gltf.glb',
  floorS: 'floor_tile_small.gltf.glb',
  floorL: 'floor_tile_large.gltf.glb',
  floorBroken: 'floor_tile_small_broken_A.gltf.glb',
  floorWeed: 'floor_tile_small_weeds_A.gltf.glb',
  floorRock: 'floor_tile_large_rocks.gltf.glb',
  stairs: 'stairs.gltf.glb',
  stairsWood: 'stairs_wood.gltf.glb',
  shelf: 'shelf_large.gltf.glb',
  shelfCandles: 'shelf_small_candles.gltf.glb',
  swordShield: 'sword_shield.gltf.glb',
  swordShieldGold: 'sword_shield_gold.gltf.glb',
  barrier: 'barrier.gltf.glb',
  barrierCol: 'barrier_column.gltf.glb',
  key: 'key.gltf.glb',
};

const NATURE = {
  treeA: 'tree_single_A.gltf',
  treeB: 'tree_single_B.gltf',
  treesS: 'trees_A_small.gltf',
  treesM: 'trees_A_medium.gltf',
  treesL: 'trees_A_large.gltf',
  treesBS: 'trees_B_small.gltf',
  treesBM: 'trees_B_medium.gltf',
  rockA: 'rock_single_A.gltf',
  rockB: 'rock_single_B.gltf',
  rockC: 'rock_single_C.gltf',
  rockD: 'rock_single_D.gltf',
  rockE: 'rock_single_E.gltf',
  hill: 'hill_single_A.gltf',
  hillsTrees: 'hills_A_trees.gltf',
};

/** KayKit Forest Nature Pack (FREE) — já no repo, subset curado para arenas. */
const FOREST = {
  tree1a: 'Tree_1_A_Color1.gltf',
  tree1b: 'Tree_1_B_Color1.gltf',
  tree1c: 'Tree_1_C_Color1.gltf',
  tree2a: 'Tree_2_A_Color1.gltf',
  tree2b: 'Tree_2_B_Color1.gltf',
  tree2c: 'Tree_2_C_Color1.gltf',
  tree2d: 'Tree_2_D_Color1.gltf',
  tree2e: 'Tree_2_E_Color1.gltf',
  tree3a: 'Tree_3_A_Color1.gltf',
  tree3b: 'Tree_3_B_Color1.gltf',
  tree3c: 'Tree_3_C_Color1.gltf',
  tree4a: 'Tree_4_A_Color1.gltf',
  tree4b: 'Tree_4_B_Color1.gltf',
  tree4c: 'Tree_4_C_Color1.gltf',
  bare1a: 'Tree_Bare_1_A_Color1.gltf',
  bare1b: 'Tree_Bare_1_B_Color1.gltf',
  bare2a: 'Tree_Bare_2_A_Color1.gltf',
  bare2b: 'Tree_Bare_2_B_Color1.gltf',
  bush1a: 'Bush_1_A_Color1.gltf',
  bush1b: 'Bush_1_B_Color1.gltf',
  bush2a: 'Bush_2_A_Color1.gltf',
  bush2c: 'Bush_2_C_Color1.gltf',
  bush3a: 'Bush_3_A_Color1.gltf',
  bush4a: 'Bush_4_A_Color1.gltf',
  grass1a: 'Grass_1_A_Color1.gltf',
  grass1b: 'Grass_1_B_Color1.gltf',
  grass2a: 'Grass_2_A_Color1.gltf',
  rock1a: 'Rock_1_A_Color1.gltf',
  rock1c: 'Rock_1_C_Color1.gltf',
  rock1f: 'Rock_1_F_Color1.gltf',
  rock1j: 'Rock_1_J_Color1.gltf',
  rock2a: 'Rock_2_A_Color1.gltf',
  rock2d: 'Rock_2_D_Color1.gltf',
  rock3a: 'Rock_3_A_Color1.gltf',
  rock3e: 'Rock_3_E_Color1.gltf',
  rock3k: 'Rock_3_K_Color1.gltf',
};

const CITY = {
  buildingA: 'building_A_withoutBase.gltf',
  buildingB: 'building_B_withoutBase.gltf',
  buildingC: 'building_C_withoutBase.gltf',
  buildingD: 'building_D_withoutBase.gltf',
  buildingE: 'building_E_withoutBase.gltf',
  buildingH: 'building_H_withoutBase.gltf',
  bench: 'bench.gltf',
  boxA: 'box_A.gltf',
  boxB: 'box_B.gltf',
  bush: 'bush.gltf',
  streetlight: 'streetlight.gltf',
  waterTower: 'watertower.gltf',
  dumpster: 'dumpster.gltf',
  base: 'base.gltf',
};

const SPACE = {
  moduleA: 'basemodule_A.gltf',
  moduleB: 'basemodule_B.gltf',
  moduleC: 'basemodule_C.gltf',
  moduleE: 'basemodule_E.gltf',
  contA: 'containers_A.gltf',
  contB: 'containers_B.gltf',
  contC: 'containers_C.gltf',
  cargoA: 'cargo_A.gltf',
  cargoStack: 'cargo_B_stacked.gltf',
  landerA: 'lander_A.gltf',
  landerB: 'lander_B.gltf',
  pad: 'landingpad_small.gltf',
  lights: 'lights.gltf',
  rockA: 'rock_A.gltf',
  rockB: 'rock_B.gltf',
  rocksA: 'rocks_A.gltf',
  solar: 'solarpanel.gltf',
  structL: 'structure_low.gltf',
  structT: 'structure_tall.gltf',
  terrain: 'terrain_low.gltf',
  turbine: 'windturbine_low.gltf',
  roofSolar: 'roofmodule_solarpanels.gltf',
};

const HALLOWEEN = {
  coffin: 'coffin.gltf',
  coffinDeco: 'coffin_decorated.gltf',
  crypt: 'crypt.gltf',
  fence: 'fence.gltf',
  fenceBroken: 'fence_broken.gltf',
  fenceGate: 'fence_gate.gltf',
  fencePillar: 'fence_pillar.gltf',
  markerA: 'gravemarker_A.gltf',
  markerB: 'gravemarker_B.gltf',
  stone: 'gravestone.gltf',
  graveA: 'grave_A.gltf',
  graveB: 'grave_B.gltf',
  lanternH: 'lantern_hanging.gltf',
  lanternS: 'lantern_standing.gltf',
  pillar: 'pillar.gltf',
  plaque: 'plaque_candles.gltf',
  postSkull: 'post_skull.gltf',
  jack: 'pumpkin_orange_jackolantern.gltf',
  ribcage: 'ribcage.gltf',
  shrine: 'shrine.gltf',
  shrineCandles: 'shrine_candles.gltf',
  skull: 'skull.gltf',
  skullCandle: 'skull_candle.gltf',
  treeL: 'tree_dead_large.gltf',
  treeM: 'tree_dead_medium.gltf',
  treeS: 'tree_dead_small.gltf',
  candles: 'candle_triple.gltf',
  arch: 'arch_gate.gltf',
};

/** Kenney Graveyard Kit — Cap II / túmulos. */
const KENNEY_GRAVEYARD = {
  coffin: 'coffin.glb',
  coffinOld: 'coffin-old.glb',
  crypt: 'crypt.glb',
  cryptA: 'crypt-a.glb',
  cryptB: 'crypt-b.glb',
  cryptSmall: 'crypt-small.glb',
  cryptLarge: 'crypt-large.glb',
  grave: 'grave.glb',
  graveBorder: 'grave-border.glb',
  stoneBevel: 'gravestone-bevel.glb',
  stoneBroken: 'gravestone-broken.glb',
  stoneCross: 'gravestone-cross.glb',
  stoneCrossL: 'gravestone-cross-large.glb',
  stoneRound: 'gravestone-round.glb',
  stoneWide: 'gravestone-wide.glb',
  stoneDeco: 'gravestone-decorative.glb',
  fence: 'fence.glb',
  fenceDamaged: 'fence-damaged.glb',
  fenceGate: 'fence-gate.glb',
  ironFence: 'iron-fence.glb',
  ironDamaged: 'iron-fence-damaged.glb',
  ironGate: 'iron-fence-border-gate.glb',
  ironCol: 'iron-fence-border-column.glb',
  cross: 'cross.glb',
  crossWood: 'cross-wood.glb',
  crossCol: 'cross-column.glb',
  pillar: 'pillar-small.glb',
  pillarL: 'pillar-large.glb',
  obelisk: 'pillar-obelisk.glb',
  altar: 'altar-stone.glb',
  altarWood: 'altar-wood.glb',
  lantern: 'lantern-candle.glb',
  lanternGlass: 'lantern-glass.glb',
  lightpost: 'lightpost-single.glb',
  lightpostD: 'lightpost-double.glb',
  candle: 'candle.glb',
  candleM: 'candle-multiple.glb',
  pine: 'pine.glb',
  pineCrooked: 'pine-crooked.glb',
  pineFall: 'pine-fall.glb',
  rocks: 'rocks.glb',
  rocksTall: 'rocks-tall.glb',
  urn: 'urn-round.glb',
  bench: 'bench.glb',
  stoneWall: 'stone-wall.glb',
  stoneWallDmg: 'stone-wall-damaged.glb',
  brickWall: 'brick-wall.glb',
  column: 'column-large.glb',
  borderPillar: 'border-pillar.glb',
  fireBasket: 'fire-basket.glb',
};

/** Kenney Nature Kit — subset curado (escala ~5×; ver KENNEY_NATURE_SCALE). */
const KENNEY_NATURE = {
  treeOak: 'tree_oak.glb',
  treeTall: 'tree_tall.glb',
  treeDefault: 'tree_default.glb',
  treeDetailed: 'tree_detailed.glb',
  treeSimple: 'tree_simple.glb',
  treeThin: 'tree_thin.glb',
  treeSmall: 'tree_small.glb',
  treePineA: 'tree_pineTallA.glb',
  treePineB: 'tree_pineTallB.glb',
  treePineRound: 'tree_pineRoundA.glb',
  treePineSmall: 'tree_pineSmallA.glb',
  treeCone: 'tree_cone.glb',
  treeFat: 'tree_fat.glb',
  treePlateau: 'tree_plateau.glb',
  treeFall: 'tree_oak_fall.glb',
  bush: 'plant_bush.glb',
  bushL: 'plant_bushLarge.glb',
  bushS: 'plant_bushSmall.glb',
  bushDetail: 'plant_bushDetailed.glb',
  grass: 'grass_large.glb',
  grassLeaf: 'grass_leafs.glb',
  flowerP: 'flower_purpleA.glb',
  flowerR: 'flower_redA.glb',
  flowerY: 'flower_yellowA.glb',
  rockLA: 'rock_largeA.glb',
  rockLB: 'rock_largeB.glb',
  rockLC: 'rock_largeC.glb',
  rockSA: 'rock_smallA.glb',
  rockSB: 'rock_smallB.glb',
  rockTall: 'rock_tallA.glb',
  rockTallB: 'rock_tallB.glb',
  stoneLA: 'stone_largeA.glb',
  stoneLB: 'stone_largeB.glb',
  stoneTall: 'stone_tallA.glb',
  pathStone: 'path_stone.glb',
  pathWood: 'path_wood.glb',
};

/** Quaternius Ultimate Space — Cap III (lava) + Cap IV (espaço/vazio). */
const QUATERNIUS_SPACE = {
  treeLava: 'Tree Lava.glb',
  treeLavaB: 'Tree Lava-9gRfmVKx9W.glb',
  treeLavaC: 'Tree Lava-sTYjmQObr1.glb',
  treeBlob: 'Tree Blob.glb',
  treeFloat: 'Tree Floating.glb',
  treeLight: 'Tree Light.glb',
  treeSpikes: 'Tree Spikes.glb',
  treeSpiral: 'Tree Spiral.glb',
  treeSwirl: 'Tree Swirl.glb',
  rock: 'Rock.glb',
  rockB: 'Rock-34W5ymEePk.glb',
  rockC: 'Rock-R2UjZAX3By.glb',
  rockL: 'Rock Large.glb',
  rockLB: 'Rock Large-d2VWOdthtR.glb',
  bush: 'Bush.glb',
  bushB: 'Bush-RfUP3gXj69.glb',
  plant: 'Plant.glb',
  grass: 'Grass.glb',
  planet: 'Planet.glb',
  planetB: 'Planet-18Uxrb2dIc.glb',
  planetC: 'Planet-pHZz4EMvVM.glb',
};

const PACKS = {
  dungeon: { dir: DUNGEON_DIR, files: DUNGEON },
  nature: { dir: NATURE_DIR, files: NATURE },
  forest: { dir: FOREST_DIR, files: FOREST },
  city: { dir: CITY_DIR, files: CITY },
  space: { dir: SPACE_DIR, files: SPACE },
  halloween: { dir: HALLOWEEN_DIR, files: HALLOWEEN },
  kenneyGraveyard: { dir: KENNEY_GRAVEYARD_DIR, files: KENNEY_GRAVEYARD },
  kenneyNature: { dir: KENNEY_NATURE_DIR, files: KENNEY_NATURE },
  quaterniusSpace: { dir: QUATERNIUS_SPACE_DIR, files: QUATERNIUS_SPACE },
};

/** Quais packs cada kind precisa (lazy). */
const KIND_PACKS = {
  forest: ['dungeon', 'nature', 'forest', 'kenneyNature'],
  graveyard: ['dungeon', 'nature', 'halloween', 'kenneyGraveyard'],
  garden: ['dungeon', 'nature', 'forest', 'kenneyNature'],
  swamp: ['dungeon', 'nature', 'forest', 'kenneyNature'],
  crypt: ['dungeon', 'nature', 'kenneyGraveyard'],
  ice: ['dungeon', 'nature', 'kenneyNature'],
  abyss: ['dungeon', 'nature', 'quaterniusSpace', 'space'],
  ruins: ['dungeon', 'nature', 'kenneyNature'],
  fortress: ['dungeon', 'city'],
  volcano: ['dungeon', 'nature', 'quaterniusSpace', 'kenneyNature'],
  tomb: ['dungeon', 'halloween', 'kenneyGraveyard'],
  mist: ['dungeon', 'nature', 'halloween', 'kenneyGraveyard', 'kenneyNature'],
  relic: ['dungeon', 'nature', 'kenneyGraveyard'],
  throne: ['dungeon', 'city'],
  ether: ['space', 'quaterniusSpace'],
  firmament: ['space', 'quaterniusSpace'],
  nexus: ['space', 'quaterniusSpace'],
  halloween: ['halloween', 'dungeon', 'kenneyGraveyard'],
  /** Só piso — usado após assar o bioma no editor (paredes/escadas viram decorações). */
  bare: ['dungeon'],
};

const inflight = new Map();
const resolved = new Map();
const packReady = new Map();

function fallbackFor(dir, file) {
  if (dir === DUNGEON_DIR) {
    const legacyKey = Object.keys(DUNGEON).find((k) => DUNGEON[k] === file);
    const legacyFile = legacyKey ? DUNGEON_LEGACY[legacyKey] : file.replace(/\.gltf$/, '.gltf.glb');
    return { dir: DUNGEON_FALLBACK_DIR, file: legacyFile || file };
  }
  if (dir === HALLOWEEN_DIR) {
    return { dir: HALLOWEEN_FALLBACK_DIR, file };
  }
  return null;
}

function assetUrl(dir, file) {
  // encodeURI preserva `/` do dir e escapa espaços (ex.: "Tree Lava.glb")
  return encodeURI(dir + file);
}

function loadFile(dir, file) {
  const key = dir + file;
  if (resolved.has(key)) return Promise.resolve(resolved.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const loader = new GLTFLoader();
  const job = loader
    .loadAsync(assetUrl(dir, file))
    .then((gltf) => {
      resolved.set(key, gltf);
      inflight.delete(key);
      return gltf;
    })
    .catch(() => {
      const alt = fallbackFor(dir, file);
      if (!alt) {
        console.warn('[jogo-idle] falha ao carregar prop', key);
        resolved.set(key, null);
        inflight.delete(key);
        return null;
      }
      return loader
        .loadAsync(assetUrl(alt.dir, alt.file))
        .then((gltf) => {
          resolved.set(key, gltf);
          inflight.delete(key);
          return gltf;
        })
        .catch((err) => {
          console.warn('[jogo-idle] falha ao carregar prop', key, 'e fallback', alt.dir + alt.file, err);
          resolved.set(key, null);
          inflight.delete(key);
          return null;
        });
    });

  inflight.set(key, job);
  return job;
}

function preloadPack(packId) {
  if (packReady.has(packId)) return packReady.get(packId);
  const pack = PACKS[packId];
  if (!pack) return Promise.resolve(true);
  const entries =
    packId === 'dungeon'
      ? Object.keys(pack.files).map((k) => loadFile(pack.dir, pack.files[k]))
      : Object.values(pack.files).map((f) => loadFile(pack.dir, f));
  const job = Promise.allSettled(entries).then(() => true);
  packReady.set(packId, job);
  return job;
}

/** Preload só dos packs necessários para o kind (default: dungeon+nature). */
export function preloadKayKitProps(kind = 'ruins') {
  const packs = KIND_PACKS[kind] || KIND_PACKS.ruins;
  return Promise.all(packs.map((id) => preloadPack(id))).then(() => true);
}

function getGltf(dir, file) {
  return resolved.get(dir + file) || null;
}

function authorizedPropUrl(url) {
  return typeof url === 'string'
    && url.startsWith('/jogo-idle/assets/')
    && !url.includes('..')
    && !url.includes('\\');
}

function loadUrl(url, packId, key) {
  if (!authorizedPropUrl(url)) {
    console.warn('[jogo-idle] url de prop recusada', url);
    return Promise.resolve(null);
  }
  if (resolved.has(url)) return Promise.resolve(resolved.get(url));
  if (inflight.has(url)) return inflight.get(url);
  const loader = new GLTFLoader();
  const job = loader
    .loadAsync(url)
    .then((gltf) => {
      tagGltf(gltf, packId, key);
      resolved.set(url, gltf);
      inflight.delete(url);
      return gltf;
    })
    .catch((err) => {
      console.warn('[jogo-idle] falha ao carregar prop', packId, key, url, err);
      resolved.set(url, null);
      inflight.delete(url);
      return null;
    });
  inflight.set(url, job);
  return job;
}

function preloadOne(packId, key) {
  const pack = PACKS[packId];
  const file = pack?.files?.[key];
  if (file) return loadFile(pack.dir, file);
  const entry = placeableEntry(packId, key);
  if (!entry?.url) {
    console.warn('[jogo-idle] prop fora do manifesto', packId, key);
    return Promise.resolve(null);
  }
  return loadUrl(entry.url, packId, key);
}

function tagGltf(gltf, pack, key) {
  if (gltf) gltf.__kaykit = { pack, key };
  return gltf;
}

function cloneProp(gltf, { scale = 1, y = 0, rotY = 0, tint } = {}) {
  if (!gltf?.scene) return null;
  const root = gltf.scene.clone(true);
  root.userData.occluder = true;
  const meta = gltf.__kaykit;
  if (meta?.pack && meta?.key) {
    root.userData.kaykit = { pack: meta.pack, key: meta.key };
  }
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.frustumCulled = false;
    o.userData.sharedGeometry = true;
    if (o.material) {
      o.material = o.material.clone();
      if (tint != null) o.material.color.multiply(new THREE.Color(tint));
    }
  });
  root.scale.setScalar(scale);
  root.position.y = y;
  root.rotation.y = rotY;
  return root;
}

function pick(rand, list) {
  return list[Math.floor(rand() * list.length) % list.length];
}

/** Densidade de scatter/ring (0.5–2). Definida por `buildKayKitZone`. */
let propDensityFactor = 1;

function densityCount(count) {
  return Math.max(1, Math.round(Number(count) * propDensityFactor));
}

function placeRing(rand, count, factory, { minR = 3.6, maxR = 10.5, y = 0 } = {}) {
  const group = new THREE.Group();
  count = densityCount(count);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.35;
    const r = minR + rand() * (maxR - minR);
    const node = factory(rand);
    if (!node) continue;
    node.position.x = Math.cos(a) * r;
    node.position.z = Math.sin(a) * r;
    node.position.y += y;
    node.rotation.y += a + Math.PI + (rand() - 0.5) * 0.8;
    group.add(node);
  }
  return group;
}

function scatter(rand, count, factory, { minR = 3.5, maxR = 12, y = 0 } = {}) {
  const group = new THREE.Group();
  count = densityCount(count);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const r = minR + rand() * (maxR - minR);
    const node = factory(rand);
    if (!node) continue;
    node.position.x = Math.cos(a) * r;
    node.position.z = Math.sin(a) * r;
    node.position.y += y;
    node.rotation.y += rand() * Math.PI * 2;
    group.add(node);
  }
  return group;
}

function dungeonOf(key) {
  return tagGltf(getGltf(DUNGEON_DIR, DUNGEON[key]), 'dungeon', key);
}
function natureOf(key) {
  return tagGltf(getGltf(NATURE_DIR, NATURE[key]), 'nature', key);
}
function forestOf(key) {
  return tagGltf(getGltf(FOREST_DIR, FOREST[key]), 'forest', key);
}
function cityOf(key) {
  return tagGltf(getGltf(CITY_DIR, CITY[key]), 'city', key);
}
function spaceOf(key) {
  return tagGltf(getGltf(SPACE_DIR, SPACE[key]), 'space', key);
}
function halloweenOf(key) {
  return tagGltf(getGltf(HALLOWEEN_DIR, HALLOWEEN[key]), 'halloween', key);
}
function kenneyGraveyardOf(key) {
  return tagGltf(getGltf(KENNEY_GRAVEYARD_DIR, KENNEY_GRAVEYARD[key]), 'kenneyGraveyard', key);
}
function kenneyNatureOf(key) {
  return tagGltf(getGltf(KENNEY_NATURE_DIR, KENNEY_NATURE[key]), 'kenneyNature', key);
}
function quaterniusSpaceOf(key) {
  return tagGltf(getGltf(QUATERNIUS_SPACE_DIR, QUATERNIUS_SPACE[key]), 'quaterniusSpace', key);
}

/** Primeiro glTF resolvido (permite preferir pack novo com fallback legado). */
function firstGltf(...gltfs) {
  for (const g of gltfs) {
    if (g?.scene) return g;
  }
  return null;
}

const FLOOR_KEYS = new Set([
  'floorS',
  'floorL',
  'floorBroken',
  'floorWeed',
  'floorRock',
  'base',
  'terrain',
  'pad',
]);

/**
 * Seed estável compartilhado entre editor e jogo (zoneId + kind + density).
 * Garante o mesmo layout procedural nos dois lados quando o bioma não está assado.
 */
export function zonePropSeed(zoneId, propsKind, density = 1) {
  const key = `${zoneId || 'idle'}|${propsKind || 'ruins'}|${Number(density) || 1}`;
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Extrai props KayKit colocados no grupo (para assar bioma → decorações editáveis).
 * Usa transform em espaço do `root` (não só position local do nó).
 * Ignora pisos (ficam no bioma `bare`).
 */
export function extractKayKitPlacements(root, { includeFloors = false } = {}) {
  const out = [];
  if (!root) return out;
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const pos = new THREE.Vector3();
  const quat = new THREE.Quaternion();
  const scl = new THREE.Vector3();
  const local = new THREE.Matrix4();
  const euler = new THREE.Euler();
  root.traverse((o) => {
    const k = o.userData?.kaykit;
    if (!k?.pack || !k?.key) return;
    if (!includeFloors && FLOOR_KEYS.has(k.key)) return;
    local.multiplyMatrices(rootInv, o.matrixWorld);
    local.decompose(pos, quat, scl);
    euler.setFromQuaternion(quat, 'YXZ');
    const scale = Number(scl.x);
    out.push({
      pack: k.pack,
      key: k.key,
      x: Math.round(pos.x * 1000) / 1000,
      z: Math.round(pos.z * 1000) / 1000,
      y: Math.round(pos.y * 1000) / 1000,
      scale: Number.isFinite(scale) && scale > 0 ? Math.round(scale * 100) / 100 : 1,
      rotY: Math.round(euler.y * 1000) / 1000,
    });
  });
  return out;
}

function arenaFloor(rand) {
  const g = new THREE.Group();
  const tiles = ['floorL', 'floorS', 'floorBroken', 'floorWeed', 'floorRock'];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const tile = cloneProp(dungeonOf(pick(rand, tiles)), {
      scale: 1.05 + rand() * 0.2,
      rotY: a + Math.PI / 2,
    });
    if (!tile) continue;
    tile.position.set(Math.cos(a) * 2.55, 0.01, Math.sin(a) * 2.55);
    g.add(tile);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const tile = cloneProp(dungeonOf(pick(rand, ['floorS', 'floorWeed', 'floorBroken'])), {
      scale: 0.85 + rand() * 0.2,
      rotY: rand() * Math.PI,
    });
    if (!tile) continue;
    tile.position.set(Math.cos(a) * 1.1, 0.012, Math.sin(a) * 1.1);
    g.add(tile);
  }
  return g;
}

function ruinsDecor(rand, tint) {
  const g = new THREE.Group();
  g.add(arenaFloor(rand));
  g.add(
    placeRing(rand, 18, (r) =>
      cloneProp(dungeonOf(pick(r, ['wall', 'wallBroken', 'wallCrack', 'wallArch', 'wallCorner', 'wallDoor'])), {
        scale: 0.85 + r() * 0.4,
        tint,
      }),
    { minR: 5.0, maxR: 10.5 }),
  );
  g.add(
    placeRing(rand, 14, (r) =>
      cloneProp(dungeonOf(pick(r, ['column', 'pillar', 'pillarDeco', 'barrierCol', 'barrier'])), {
        scale: 0.7 + r() * 0.5,
        tint,
      }),
    { minR: 4.0, maxR: 8.8 }),
  );
  g.add(
    scatter(rand, 28, (r) =>
      cloneProp(
        dungeonOf(
          pick(r, [
            'barrelL', 'barrelS', 'barrelStack', 'barrelDeco', 'crates', 'box', 'boxStack',
            'chest', 'tableS', 'tableM', 'chair', 'shelf', 'shelfCandles', 'key',
          ]),
        ),
        { scale: 0.85 + r() * 0.45, tint },
      ),
    { minR: 3.6, maxR: 9.2 }),
  );
  g.add(
    placeRing(rand, 12, (r) =>
      cloneProp(
        dungeonOf(pick(r, ['bannerR', 'bannerB', 'bannerShield', 'bannerPattern', 'torchWall', 'swordShield', 'torch', 'torchBare', 'candleTrip', 'stairsWood'])),
        { scale: 0.9 + r() * 0.3, tint },
      ),
    { minR: 5.2, maxR: 9.8 }),
  );
  g.add(
    scatter(rand, 8, (r) =>
      cloneProp(natureOf(pick(r, ['rockA', 'rockB', 'rockC', 'rockD', 'rockE'])), {
        scale: 0.6 + r() * 0.9,
        tint,
      }),
    { minR: 6, maxR: 12 }),
  );
  return g;
}

const FOREST_TREE_KEYS = [
  'tree1a', 'tree1b', 'tree1c', 'tree2a', 'tree2b', 'tree2c', 'tree2d', 'tree2e',
  'tree3a', 'tree3b', 'tree3c', 'tree4a', 'tree4b', 'tree4c',
];
const FOREST_BARE_KEYS = ['bare1a', 'bare1b', 'bare2a', 'bare2b'];
const FOREST_BUSH_KEYS = ['bush1a', 'bush1b', 'bush2a', 'bush2c', 'bush3a', 'bush4a'];
const FOREST_ROCK_KEYS = ['rock1a', 'rock1c', 'rock1f', 'rock1j', 'rock2a', 'rock2d', 'rock3a', 'rock3e', 'rock3k'];
const FOREST_GRASS_KEYS = ['grass1a', 'grass1b', 'grass2a'];

/**
 * @param {() => number} rand
 * @param {'clearing'|'dense'|'swamp'|'cursed'|'ruins'|'heart'} [variant]
 */
function forestDecor(rand, variant = 'clearing') {
  const g = new THREE.Group();
  g.add(arenaFloor(rand));
  const dense = variant === 'dense' || variant === 'cursed' || variant === 'heart';
  const open = variant === 'clearing';
  const swampy = variant === 'swamp';
  const ruined = variant === 'ruins' || variant === 'heart';
  const cursed = variant === 'cursed';
  const treeCount = open ? 22 : dense ? 44 : swampy ? 28 : 36;
  const bushCount = open ? 10 : dense ? 26 : 18;
  const rockCount = ruined ? 28 : swampy ? 20 : 16;
  const treeKeys = cursed
    ? [...FOREST_TREE_KEYS, ...FOREST_BARE_KEYS]
    : variant === 'heart'
      ? FOREST_TREE_KEYS.filter((k) => k.startsWith('tree3') || k.startsWith('tree4'))
      : FOREST_TREE_KEYS;
  const tint = cursed ? 0xb8c8a0 : swampy ? 0x9aaa70 : variant === 'heart' ? 0xc8ffb0 : undefined;

  const kenneyTrees = [
    'treeOak', 'treeTall', 'treeDefault', 'treeDetailed', 'treeSimple', 'treeThin', 'treeSmall',
    'treePineA', 'treePineB', 'treePineRound', 'treePineSmall', 'treeCone', 'treeFat', 'treePlateau',
  ];
  const kenneyBushes = ['bush', 'bushL', 'bushS', 'bushDetail', 'grass', 'grassLeaf'];
  const kenneyRocks = ['rockLA', 'rockLB', 'rockLC', 'rockSA', 'rockSB', 'rockTall', 'rockTallB', 'stoneLA', 'stoneLB'];

  g.add(
    scatter(rand, treeCount, (r) => {
      const kay = forestOf(pick(r, treeKeys));
      if (kay?.scene) {
        return cloneProp(kay, { scale: (open ? 0.55 : 0.7) + r() * (dense ? 1.1 : 0.75), tint });
      }
      const ken = kenneyNatureOf(pick(r, kenneyTrees));
      if (ken?.scene) {
        return cloneProp(ken, {
          scale: KENNEY_NATURE_SCALE * ((open ? 0.85 : 1) + r() * (dense ? 0.7 : 0.45)),
          tint,
        });
      }
      return cloneProp(
        natureOf(pick(r, ['treeA', 'treeB', 'treesS', 'treesM', 'treesL', 'treesBS', 'treesBM'])),
        { scale: 0.5 + r() * 0.85, tint },
      );
    }, { minR: open ? 5.0 : 4.0, maxR: dense ? 13.5 : 12 }),
  );
  g.add(
    scatter(rand, bushCount, (r) => {
      const kay = forestOf(pick(r, FOREST_BUSH_KEYS));
      if (kay?.scene) return cloneProp(kay, { scale: 0.45 + r() * 0.55, tint });
      const ken = kenneyNatureOf(pick(r, kenneyBushes));
      if (ken?.scene) {
        return cloneProp(ken, { scale: KENNEY_NATURE_SCALE * (0.9 + r() * 0.6), tint });
      }
      return cloneProp(natureOf('treesS'), { scale: 0.45 + r() * 0.55, tint });
    }, { minR: 3.6, maxR: 10.5 }),
  );
  g.add(
    scatter(rand, rockCount, (r) => {
      const kay = forestOf(pick(r, FOREST_ROCK_KEYS));
      if (kay?.scene) return cloneProp(kay, { scale: 0.55 + r() * 1.1, tint: swampy ? 0x889870 : tint });
      const ken = kenneyNatureOf(pick(r, kenneyRocks));
      if (ken?.scene) {
        return cloneProp(ken, {
          scale: KENNEY_NATURE_SCALE * (1.1 + r() * 1.2),
          tint: swampy ? 0x889870 : tint,
        });
      }
      return cloneProp(natureOf(pick(r, ['rockA', 'rockB', 'rockC', 'rockD', 'rockE'])), {
        scale: 0.65 + r() * 1.2,
        tint,
      });
    }, { minR: 3.4, maxR: 11 }),
  );
  if (open || variant === 'heart') {
    g.add(
      scatter(rand, 16, (r) =>
        cloneProp(forestOf(pick(r, FOREST_GRASS_KEYS)), { scale: 0.8 + r() * 0.6, tint }),
      { minR: 3.2, maxR: 8.5 }),
    );
  }
  if (ruined) {
    g.add(
      placeRing(rand, variant === 'heart' ? 10 : 14, (r) =>
        cloneProp(
          dungeonOf(pick(r, ['column', 'pillar', 'wallBroken', 'wallArch', 'stairs', 'barrierCol'])),
          { scale: 0.85 + r() * 0.4, tint: 0xc8d8b8 },
        ),
      { minR: 4.2, maxR: 9.5 }),
    );
  }
  if (variant === 'heart') {
    g.add(
      placeRing(rand, 6, (r) =>
        cloneProp(dungeonOf(pick(r, ['pillarDeco', 'bannerB', 'chestGold', 'candleTrip'])), {
          scale: 1.05 + r() * 0.25,
          tint: 0xd0ffb0,
        }),
      { minR: 3.4, maxR: 5.2 }),
    );
  } else if (!ruined) {
    g.add(
      scatter(rand, open ? 8 : 14, (r) =>
        cloneProp(dungeonOf(pick(r, ['barrelS', 'crates', 'chest', 'torch', 'box', 'barrelStack'])), {
          scale: 0.9 + r() * 0.35,
        }),
      { minR: 3.5, maxR: 7.2 }),
    );
  }
  g.add(
    placeRing(rand, open ? 6 : 10, (r) => cloneProp(natureOf('hill'), { scale: 0.28 + r() * 0.35, tint }), {
      minR: 9,
      maxR: 13.5,
    }),
  );
  return g;
}

function graveyardDecor(rand) {
  const g = ruinsDecor(rand, 0xb0b8c8);
  const tint = 0xa8b0c0;
  g.add(
    placeRing(rand, 14, (r) =>
      cloneProp(
        firstGltf(
          kenneyGraveyardOf(pick(r, ['fence', 'fenceDamaged', 'ironFence', 'ironDamaged', 'stoneWall', 'brickWall', 'column', 'borderPillar', 'pillar', 'obelisk'])),
          dungeonOf(pick(r, ['wallBroken', 'barrier', 'column', 'candleTrip', 'shelfCandles', 'stairs'])),
        ),
        { scale: 0.8 + r() * 0.45, tint: 0x9aa3b5 },
      ),
    { minR: 3.8, maxR: 9 }),
  );
  g.add(
    scatter(rand, 22, (r) =>
      cloneProp(
        firstGltf(
          kenneyGraveyardOf(
            pick(r, [
              'coffin', 'coffinOld', 'grave', 'graveBorder', 'stoneBevel', 'stoneBroken', 'stoneCross',
              'stoneCrossL', 'stoneRound', 'stoneWide', 'stoneDeco', 'cross', 'crossWood', 'lantern',
              'lightpost', 'candle', 'candleM', 'urn', 'altar',
            ]),
          ),
          halloweenOf(pick(r, ['coffin', 'graveA', 'graveB', 'stone', 'markerA', 'markerB', 'fence', 'fenceBroken', 'lanternS', 'treeM', 'skull', 'ribcage'])),
        ),
        { scale: 0.7 + r() * 0.55, tint },
      ),
    { minR: 4.2, maxR: 11.5 }),
  );
  g.add(
    scatter(rand, 12, (r) =>
      cloneProp(
        firstGltf(
          kenneyGraveyardOf(pick(r, ['pine', 'pineCrooked', 'pineFall', 'rocks', 'rocksTall'])),
          natureOf(pick(r, ['treeA', 'treeB', 'treesS', 'treesBS', 'rockC', 'rockE'])),
        ),
        { scale: 0.65 + r() * 0.6, tint: 0x8890a0 },
      ),
    { minR: 6.5, maxR: 12.5 }),
  );
  return g;
}

function gardenDecor(rand) {
  const g = forestDecor(rand, 'dense');
  g.add(
    scatter(rand, 12, (r) =>
      cloneProp(
        dungeonOf(pick(r, ['bannerB', 'candle', 'candleTrip', 'tableS', 'chestGold', 'shelfCandles'])),
        { scale: 0.85 + r() * 0.35, tint: 0xffd0f0 },
      ),
    { minR: 3.5, maxR: 7.5 }),
  );
  return g;
}

function swampDecor(rand) {
  const g = forestDecor(rand, 'swamp');
  g.add(
    scatter(rand, 10, (r) =>
      cloneProp(natureOf(pick(r, ['treesBM', 'treesL', 'rockD', 'hill'])), {
        scale: 0.55 + r() * 0.5,
        tint: 0xb8d080,
      }),
    { minR: 5, maxR: 12 }),
  );
  g.traverse((o) => {
    if (o.isMesh && o.material?.color) o.material.color.multiply(new THREE.Color(0xb8d080));
  });
  return g;
}

function cryptDecor(rand) {
  const g = ruinsDecor(rand, 0xffa070);
  g.add(
    placeRing(rand, 12, (r) =>
      cloneProp(dungeonOf(pick(r, ['torch', 'torchWall', 'chestGold', 'swordShieldGold', 'stairs', 'pillarDeco'])), {
        scale: 0.9 + r() * 0.4,
        tint: 0xffc090,
      }),
    { minR: 3.8, maxR: 8.5 }),
  );
  return g;
}

/** Picos gelados: exterior nevado (sem ruínas/barris/escadas de dungeon). */
function iceDecor(rand) {
  const g = new THREE.Group();
  const tint = 0xd8ecff;
  g.add(arenaFloor(rand));
  g.add(
    scatter(rand, 28, (r) => {
      const ken = kenneyNatureOf(pick(r, ['rockLA', 'rockLB', 'rockTall', 'rockTallB', 'stoneLA', 'stoneTall', 'rockSA']));
      if (ken?.scene) {
        return cloneProp(ken, { scale: KENNEY_NATURE_SCALE * (1.2 + r() * 1.4), tint });
      }
      return cloneProp(natureOf(pick(r, ['rockA', 'rockB', 'rockC', 'rockD', 'rockE', 'hill'])), {
        scale: 0.7 + r() * 1.1,
        tint,
      });
    }, { minR: 3.6, maxR: 11.5 }),
  );
  g.add(
    scatter(rand, 22, (r) => {
      const ken = kenneyNatureOf(pick(r, ['treePineA', 'treePineB', 'treePineSmall', 'treeTall', 'treeThin', 'treeOak']));
      if (ken?.scene) {
        return cloneProp(ken, { scale: KENNEY_NATURE_SCALE * (0.9 + r() * 0.7), tint: 0xc8e0f0 });
      }
      return cloneProp(natureOf(pick(r, ['treesS', 'treesBS', 'treeA', 'treeB'])), {
        scale: 0.45 + r() * 0.7,
        tint: 0xc8e0f0,
      });
    }, { minR: 5.0, maxR: 12.5 }),
  );
  g.add(
    placeRing(rand, 8, (r) => cloneProp(natureOf('hill'), { scale: 0.35 + r() * 0.45, tint: 0xe8f2ff }), {
      minR: 8.5,
      maxR: 13.5,
    }),
  );
  g.add(
    placeRing(rand, 5, (r) =>
      cloneProp(natureOf('hillsTrees'), { scale: 0.22 + r() * 0.2, tint: 0xd0e8ff }),
    { minR: 10.5, maxR: 14 }),
  );
  return g;
}

function abyssDecor(rand) {
  const g = ruinsDecor(rand, 0xa078ff);
  g.add(
    placeRing(rand, 12, (r) =>
      cloneProp(dungeonOf(pick(r, ['pillarDeco', 'wallArch', 'bannerShield', 'chestGold', 'stairs', 'column'])), {
        scale: 1 + r() * 0.45,
        tint: 0xb06aff,
      }),
    { minR: 4.0, maxR: 9.2 }),
  );
  g.add(
    scatter(rand, 10, (r) =>
      cloneProp(
        firstGltf(
          quaterniusSpaceOf(pick(r, ['treeFloat', 'treeSpiral', 'treeSwirl', 'treeLight', 'rockL', 'planet'])),
          spaceOf(pick(r, ['rockA', 'rockB', 'moduleE'])),
        ),
        { scale: 0.45 + r() * 0.5, tint: 0xc080ff },
      ),
    { minR: 5.5, maxR: 12 }),
  );
  g.add(
    scatter(rand, 10, (r) =>
      cloneProp(natureOf(pick(r, ['rockC', 'rockE', 'hill'])), {
        scale: 0.7 + r() * 0.8,
        tint: 0x8060c0,
      }),
    { minR: 6, maxR: 12 }),
  );
  return g;
}

function fortressDecor(rand) {
  const g = ruinsDecor(rand, 0xc8b090);
  g.add(
    placeRing(rand, 10, (r) =>
      cloneProp(cityOf(pick(r, ['buildingA', 'buildingB', 'buildingC', 'buildingD', 'buildingE', 'buildingH'])), {
        scale: 0.35 + r() * 0.25,
        tint: 0xd0c0a0,
      }),
    { minR: 7.5, maxR: 13 }),
  );
  g.add(
    scatter(rand, 16, (r) =>
      cloneProp(cityOf(pick(r, ['bench', 'boxA', 'boxB', 'bush', 'streetlight', 'dumpster', 'base'])), {
        scale: 0.9 + r() * 0.4,
      }),
    { minR: 3.8, maxR: 9 }),
  );
  g.add(
    placeRing(rand, 4, (r) => cloneProp(cityOf('waterTower'), { scale: 0.45 + r() * 0.2 }), {
      minR: 10,
      maxR: 14,
    }),
  );
  return g;
}

function volcanoDecor(rand) {
  const g = cryptDecor(rand);
  g.traverse((o) => {
    if (o.isMesh && o.material?.color) o.material.color.multiply(new THREE.Color(0xff7040));
  });
  g.add(
    scatter(rand, 14, (r) => {
      const q = quaterniusSpaceOf(pick(r, ['treeLava', 'treeLavaB', 'treeLavaC', 'treeSpikes', 'treeSpiral']));
      if (q?.scene) return cloneProp(q, { scale: 0.55 + r() * 0.55, tint: 0xff6030 });
      return cloneProp(kenneyNatureOf(pick(r, ['treeTall', 'treeThin', 'treePineA'])), {
        scale: KENNEY_NATURE_SCALE * (1.1 + r() * 0.6),
        tint: 0xff6030,
      });
    }, { minR: 5, maxR: 12.5 }),
  );
  g.add(
    scatter(rand, 16, (r) =>
      cloneProp(
        firstGltf(
          quaterniusSpaceOf(pick(r, ['rock', 'rockB', 'rockC', 'rockL', 'rockLB'])),
          kenneyNatureOf(pick(r, ['rockLA', 'rockLB', 'rockTall', 'stoneLA'])),
          natureOf(pick(r, ['rockA', 'rockC', 'rockE', 'hill'])),
        ),
        {
          scale: 0.7 + r() * 0.95,
          tint: 0xff5020,
        },
      ),
    { minR: 4.5, maxR: 12 }),
  );
  return g;
}

function tombDecor(rand) {
  const g = graveyardDecor(rand);
  g.add(
    placeRing(rand, 8, (r) =>
      cloneProp(
        firstGltf(
          kenneyGraveyardOf(pick(r, ['crypt', 'cryptA', 'cryptB', 'cryptSmall', 'cryptLarge', 'altar', 'obelisk', 'pillarL'])),
          halloweenOf(pick(r, ['crypt', 'arch', 'shrine', 'coffinDeco', 'pillar'])),
        ),
        { scale: 0.85 + r() * 0.4, tint: 0x9098a8 },
      ),
    { minR: 5.5, maxR: 10 }),
  );
  return g;
}

function mistDecor(rand) {
  const g = swampDecor(rand);
  g.add(
    scatter(rand, 14, (r) =>
      cloneProp(halloweenOf(pick(r, ['treeL', 'treeM', 'lanternH', 'fenceGate', 'postSkull', 'skullCandle'])), {
        scale: 0.7 + r() * 0.5,
        tint: 0xc0c8d8,
      }),
    { minR: 4.5, maxR: 12 }),
  );
  return g;
}

function relicDecor(rand) {
  const g = ruinsDecor(rand, 0xe8d080);
  g.add(
    placeRing(rand, 10, (r) =>
      cloneProp(dungeonOf(pick(r, ['chestGold', 'swordShieldGold', 'pillarDeco', 'bannerPattern', 'stairs', 'key'])), {
        scale: 1 + r() * 0.35,
        tint: 0xffe8a0,
      }),
    { minR: 3.8, maxR: 8.5 }),
  );
  return g;
}

function throneDecor(rand) {
  const g = fortressDecor(rand);
  g.add(
    placeRing(rand, 8, (r) =>
      cloneProp(dungeonOf(pick(r, ['bannerShield', 'bannerPattern', 'swordShieldGold', 'pillarDeco', 'stairsWood'])), {
        scale: 1.05 + r() * 0.3,
        tint: 0xffd070,
      }),
    { minR: 4.0, maxR: 8.0 }),
  );
  return g;
}

function spaceArenaFloor(rand) {
  const g = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const pad = cloneProp(spaceOf(pick(rand, ['pad', 'terrain', 'structL'])), {
      scale: 0.55 + rand() * 0.25,
      rotY: a,
    });
    if (!pad) continue;
    pad.position.set(Math.cos(a) * 2.2, 0.01, Math.sin(a) * 2.2);
    g.add(pad);
  }
  return g;
}

function etherDecor(rand) {
  const g = new THREE.Group();
  g.add(spaceArenaFloor(rand));
  g.add(
    placeRing(rand, 10, (r) =>
      cloneProp(
        firstGltf(
          quaterniusSpaceOf(pick(r, ['treeFloat', 'treeBlob', 'treeLight', 'treeSpiral', 'planet', 'planetB'])),
          spaceOf(pick(r, ['moduleA', 'moduleB', 'moduleC', 'moduleE', 'structT', 'structL'])),
        ),
        { scale: 0.4 + r() * 0.4, tint: 0xc8e0ff },
      ),
    { minR: 6.5, maxR: 12 }),
  );
  g.add(
    scatter(rand, 18, (r) =>
      cloneProp(
        firstGltf(
          quaterniusSpaceOf(pick(r, ['rock', 'rockB', 'rockC', 'rockL', 'bush', 'plant', 'grass'])),
          spaceOf(pick(r, ['contA', 'contB', 'cargoA', 'cargoStack', 'lights', 'solar', 'rockA', 'rockB'])),
        ),
        { scale: 0.65 + r() * 0.55, tint: 0xd0e8ff },
      ),
    { minR: 3.8, maxR: 10 }),
  );
  return g;
}

function firmamentDecor(rand) {
  const g = etherDecor(rand);
  g.add(
    placeRing(rand, 6, (r) =>
      cloneProp(
        firstGltf(
          quaterniusSpaceOf(pick(r, ['planet', 'planetB', 'planetC', 'treeSwirl', 'treeSpikes'])),
          spaceOf(pick(r, ['landerA', 'landerB', 'turbine', 'roofSolar', 'rocksA'])),
        ),
        { scale: 0.4 + r() * 0.35, tint: 0xffe8c0 },
      ),
    { minR: 8, maxR: 13.5 }),
  );
  return g;
}

function nexusDecor(rand) {
  const g = firmamentDecor(rand);
  g.add(
    placeRing(rand, 8, (r) =>
      cloneProp(
        firstGltf(
          quaterniusSpaceOf(pick(r, ['treeFloat', 'treeLight', 'planet', 'rockL', 'treeSpiral'])),
          spaceOf(pick(r, ['moduleA', 'moduleE', 'structT', 'pad', 'lights'])),
        ),
        { scale: 0.5 + r() * 0.4, tint: 0xe0b0ff },
      ),
    { minR: 4.5, maxR: 9.5 }),
  );
  return g;
}

function countMeshes(group) {
  let n = 0;
  group?.traverse((o) => {
    if (o.isMesh) n += 1;
  });
  return n;
}

/** @returns {THREE.Group} */
function bareDecor(rand) {
  const g = new THREE.Group();
  g.add(arenaFloor(rand));
  return g;
}

export function buildKayKitZone(kind, rand, opts = {}) {
  const d = Number(opts?.density);
  propDensityFactor = Number.isFinite(d) ? Math.max(0.5, Math.min(2, d)) : 1;
  const variant = typeof opts?.variant === 'string' ? opts.variant : 'clearing';
  let group;
  switch (kind) {
    case 'bare':
      group = bareDecor(rand);
      break;
    case 'forest':
      group = forestDecor(rand, variant);
      break;
    case 'graveyard':
    case 'halloween':
      group = graveyardDecor(rand);
      break;
    case 'garden':
      group = gardenDecor(rand);
      break;
    case 'swamp':
      group = swampDecor(rand);
      break;
    case 'crypt':
      group = cryptDecor(rand);
      break;
    case 'ice':
      group = iceDecor(rand);
      break;
    case 'abyss':
      group = abyssDecor(rand);
      break;
    case 'fortress':
      group = fortressDecor(rand);
      break;
    case 'volcano':
      group = volcanoDecor(rand);
      break;
    case 'tomb':
      group = tombDecor(rand);
      break;
    case 'mist':
      group = mistDecor(rand);
      break;
    case 'relic':
      group = relicDecor(rand);
      break;
    case 'throne':
      group = throneDecor(rand);
      break;
    case 'ether':
      group = etherDecor(rand);
      break;
    case 'firmament':
      group = firmamentDecor(rand);
      break;
    case 'nexus':
      group = nexusDecor(rand);
      break;
    case 'ruins':
    default:
      group = ruinsDecor(rand);
      break;
  }
  if (countMeshes(group) === 0) {
    console.warn('[jogo-idle] zona KayKit vazia após preload — props não resolvidos?', kind);
  }
  propDensityFactor = 1;
  return group;
}

export function kayKitResolvedCount() {
  let ok = 0;
  for (const v of resolved.values()) if (v?.scene) ok += 1;
  return ok;
}

/** Catálogo de props. Depois do manifesto carregado, inclui todo placeable, não só o PACKS histórico. */
export function listKayKitPalette() {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [packId, pack] of Object.entries(PACKS)) {
    out[packId] = Object.keys(pack.files);
  }
  for (const asset of searchPlaceables()) {
    if (!out[asset.pack]) out[asset.pack] = [];
    if (!out[asset.pack].includes(asset.key)) out[asset.pack].push(asset.key);
  }
  return out;
}

export function listKayKitPropKinds() {
  return Object.keys(KIND_PACKS);
}

function resolveDecorationGltf(packId, key) {
  const pack = PACKS[packId];
  const file = pack?.files?.[key];
  let gltf = file ? tagGltf(getGltf(pack.dir, file), packId, key) : null;
  let defaultScale = 1;
  if (!gltf?.scene) {
    const entry = placeableEntry(packId, key);
    if (entry?.url) {
      gltf = resolved.get(entry.url) || null;
      if (typeof entry.defaultScale === 'number') defaultScale = entry.defaultScale;
    }
  }
  return { gltf, defaultScale };
}

function instanceCompatible(gltf) {
  let meshes = 0;
  let ok = true;
  gltf.scene.traverse((node) => {
    if (!node.isMesh) return;
    meshes += 1;
    if (node.isSkinnedMesh || Array.isArray(node.material) || !node.geometry) ok = false;
    if (node.morphTargetInfluences?.length) ok = false;
  });
  return ok && meshes > 0;
}

const _instanceDummy = new THREE.Object3D();
const _instanceFinal = new THREE.Matrix4();

/**
 * Desenha a lista manual no jogo.
 * Repetidos compatíveis viram InstancedMesh (uma malha por parte do GLTF).
 * O editor continua com um objeto por peça, para seleção e gizmo.
 * Geometria permanece a do cache. Material com tint é clone; sem tint, é o do cache.
 */
export function appendManualDecorations(parent, decorations) {
  const group = new THREE.Group();
  group.name = 'manual-decorations';
  const buckets = new Map();
  for (const deco of decorations || []) {
    if (!deco?.pack || !deco?.key) continue;
    const tintKey = deco.tint == null || deco.tint === '' ? '' : String(deco.tint);
    const id = `${deco.pack}/${deco.key}/${tintKey}`;
    if (!buckets.has(id)) buckets.set(id, []);
    buckets.get(id).push(deco);
  }
  for (const list of buckets.values()) {
    const first = list[0];
    const { gltf, defaultScale } = resolveDecorationGltf(first.pack, first.key);
    if (list.length < 2 || !gltf?.scene || !instanceCompatible(gltf)) {
      for (const deco of list) {
        const obj = spawnKayKitDecoration(deco.pack, deco.key, deco);
        if (obj) group.add(obj);
      }
      continue;
    }
    const probe = gltf.scene.clone(true);
    probe.position.set(0, 0, 0);
    probe.rotation.set(0, 0, 0);
    probe.scale.set(1, 1, 1);
    probe.updateMatrixWorld(true);
    const rootInv = new THREE.Matrix4().copy(probe.matrixWorld).invert();
    const parts = [];
    probe.traverse((node) => {
      if (!node.isMesh) return;
      parts.push({
        geometry: node.geometry,
        material: node.material,
        local: new THREE.Matrix4().multiplyMatrices(rootInv, node.matrixWorld),
      });
    });
    if (!parts.length) {
      for (const deco of list) {
        const obj = spawnKayKitDecoration(deco.pack, deco.key, deco);
        if (obj) group.add(obj);
      }
      continue;
    }
    const tint = first.tint == null || first.tint === '' ? null : Number(first.tint);
    for (const part of parts) {
      let material = part.material;
      let sharedMaterial = true;
      if (tint != null && Number.isFinite(tint) && material?.color) {
        material = material.clone();
        material.color.multiply(new THREE.Color(tint));
        sharedMaterial = false;
      }
      const inst = new THREE.InstancedMesh(part.geometry, material, list.length);
      inst.userData.sharedGeometry = true;
      inst.userData.sharedMaterial = sharedMaterial;
      inst.castShadow = true;
      inst.receiveShadow = true;
      inst.frustumCulled = false;
      list.forEach((deco, index) => {
        const scale = deco.scale ?? defaultScale;
        _instanceDummy.position.set(Number(deco.x) || 0, Number(deco.y) || 0, Number(deco.z) || 0);
        _instanceDummy.rotation.set(0, Number(deco.rotY) || 0, 0);
        _instanceDummy.scale.setScalar(scale);
        _instanceDummy.updateMatrix();
        _instanceFinal.multiplyMatrices(_instanceDummy.matrix, part.local);
        inst.setMatrixAt(index, _instanceFinal);
      });
      inst.instanceMatrix.needsUpdate = true;
      group.add(inst);
    }
  }
  if (group.children.length) parent.add(group);
  return group;
}

/** Coloca um prop avulso (decoração do editor) no mundo. */
export function spawnKayKitDecoration(packId, key, opts = {}) {
  const { gltf, defaultScale } = resolveDecorationGltf(packId, key);
  if (!gltf?.scene) return null;
  const obj = cloneProp(gltf, {
    scale: opts.scale ?? defaultScale,
    y: opts.y ?? 0,
    rotY: opts.rotY ?? 0,
    tint: opts.tint,
  });
  if (!obj) return null;
  obj.position.x = Number(opts.x) || 0;
  obj.position.z = Number(opts.z) || 0;
  return obj;
}

/** Garante preload só dos props citados. Sem key, mantém o preload do pack histórico. */
export function preloadDecorationPacks(decorations = []) {
  return ensurePropCatalog().then(() => {
    const jobs = [];
    for (const d of decorations) {
      if (!d?.pack) continue;
      if (d.key) jobs.push(preloadOne(d.pack, d.key));
      else jobs.push(preloadPack(d.pack));
    }
    return Promise.all(jobs).then(() => true);
  });
}
