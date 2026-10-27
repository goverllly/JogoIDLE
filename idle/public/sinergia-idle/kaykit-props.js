/**
 * Cenário KayKit (CC0) — Dungeon, Hexagon nature, City, Space, Halloween.
 * https://kaylousberg.com/ · https://github.com/KayKit-Game-Assets
 * Preload é lazy por kind de zona (não carrega todos os packs no boot).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Biblioteca KayKit completa (v2.0); dungeon/halloween preferem kaykit/ com fallback em props/. */
const DUNGEON_DIR = '/sinergia-idle/assets/kaykit/dungeon/';
const DUNGEON_FALLBACK_DIR = '/sinergia-idle/assets/props/dungeon/';
const NATURE_DIR = '/sinergia-idle/assets/props/nature/';
const CITY_DIR = '/sinergia-idle/assets/props/city/';
const SPACE_DIR = '/sinergia-idle/assets/props/space/';
const HALLOWEEN_DIR = '/sinergia-idle/assets/kaykit/halloween/';
const HALLOWEEN_FALLBACK_DIR = '/sinergia-idle/assets/props/halloween/';

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

const PACKS = {
  dungeon: { dir: DUNGEON_DIR, files: DUNGEON },
  nature: { dir: NATURE_DIR, files: NATURE },
  city: { dir: CITY_DIR, files: CITY },
  space: { dir: SPACE_DIR, files: SPACE },
  halloween: { dir: HALLOWEEN_DIR, files: HALLOWEEN },
};

/** Quais packs cada kind precisa (lazy). */
const KIND_PACKS = {
  forest: ['dungeon', 'nature'],
  graveyard: ['dungeon', 'nature', 'halloween'],
  garden: ['dungeon', 'nature'],
  swamp: ['dungeon', 'nature'],
  crypt: ['dungeon', 'nature'],
  ice: ['dungeon', 'nature'],
  abyss: ['dungeon', 'nature'],
  ruins: ['dungeon', 'nature'],
  fortress: ['dungeon', 'city'],
  volcano: ['dungeon', 'nature'],
  tomb: ['dungeon', 'halloween'],
  mist: ['dungeon', 'nature', 'halloween'],
  relic: ['dungeon', 'nature'],
  throne: ['dungeon', 'city'],
  ether: ['space'],
  firmament: ['space'],
  nexus: ['space'],
  halloween: ['halloween', 'dungeon'],
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

function loadFile(dir, file) {
  const key = dir + file;
  if (resolved.has(key)) return Promise.resolve(resolved.get(key));
  if (inflight.has(key)) return inflight.get(key);

  const loader = new GLTFLoader();
  const job = loader
    .loadAsync(dir + file)
    .then((gltf) => {
      resolved.set(key, gltf);
      inflight.delete(key);
      return gltf;
    })
    .catch(() => {
      const alt = fallbackFor(dir, file);
      if (!alt) {
        console.warn('[sinergia-idle] falha ao carregar prop', key);
        resolved.set(key, null);
        inflight.delete(key);
        return null;
      }
      return loader
        .loadAsync(alt.dir + alt.file)
        .then((gltf) => {
          resolved.set(key, gltf);
          inflight.delete(key);
          return gltf;
        })
        .catch((err) => {
          console.warn('[sinergia-idle] falha ao carregar prop', key, 'e fallback', alt.dir + alt.file, err);
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
function cityOf(key) {
  return tagGltf(getGltf(CITY_DIR, CITY[key]), 'city', key);
}
function spaceOf(key) {
  return tagGltf(getGltf(SPACE_DIR, SPACE[key]), 'space', key);
}
function halloweenOf(key) {
  return tagGltf(getGltf(HALLOWEEN_DIR, HALLOWEEN[key]), 'halloween', key);
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

function forestDecor(rand) {
  const g = new THREE.Group();
  g.add(arenaFloor(rand));
  g.add(
    scatter(rand, 36, (r) =>
      cloneProp(natureOf(pick(r, ['treeA', 'treeB', 'treesS', 'treesM', 'treesL', 'treesBS', 'treesBM'])), {
        scale: 0.5 + r() * 0.85,
      }),
    { minR: 4.2, maxR: 12.5 }),
  );
  g.add(
    placeRing(rand, 8, (r) => cloneProp(natureOf('hillsTrees'), { scale: 0.28 + r() * 0.22 }), {
      minR: 9.5,
      maxR: 14,
    }),
  );
  g.add(
    scatter(rand, 22, (r) =>
      cloneProp(natureOf(pick(r, ['rockA', 'rockB', 'rockC', 'rockD', 'rockE'])), {
        scale: 0.65 + r() * 1.2,
      }),
    { minR: 3.4, maxR: 10.5 }),
  );
  g.add(
    placeRing(rand, 10, (r) => cloneProp(natureOf('hill'), { scale: 0.32 + r() * 0.4 }), {
      minR: 8.5,
      maxR: 13.5,
    }),
  );
  g.add(
    scatter(rand, 14, (r) =>
      cloneProp(dungeonOf(pick(r, ['barrelS', 'crates', 'chest', 'torch', 'box', 'barrelStack'])), {
        scale: 0.9 + r() * 0.35,
      }),
    { minR: 3.5, maxR: 7.2 }),
  );
  return g;
}

function graveyardDecor(rand) {
  const g = ruinsDecor(rand, 0xb0b8c8);
  g.add(
    placeRing(rand, 14, (r) =>
      cloneProp(dungeonOf(pick(r, ['wallBroken', 'barrier', 'column', 'candleTrip', 'shelfCandles', 'stairs'])), {
        scale: 0.8 + r() * 0.45,
        tint: 0x9aa3b5,
      }),
    { minR: 3.8, maxR: 9 }),
  );
  g.add(
    scatter(rand, 18, (r) =>
      cloneProp(
        halloweenOf(pick(r, ['coffin', 'graveA', 'graveB', 'stone', 'markerA', 'markerB', 'fence', 'fenceBroken', 'lanternS', 'treeM', 'skull', 'ribcage'])),
        { scale: 0.7 + r() * 0.55, tint: 0xa8b0c0 },
      ),
    { minR: 4.2, maxR: 11.5 }),
  );
  g.add(
    scatter(rand, 10, (r) =>
      cloneProp(natureOf(pick(r, ['treeA', 'treeB', 'treesS', 'treesBS', 'rockC', 'rockE'])), {
        scale: 0.65 + r() * 0.6,
        tint: 0x8890a0,
      }),
    { minR: 6.5, maxR: 12.5 }),
  );
  return g;
}

function gardenDecor(rand) {
  const g = new THREE.Group();
  g.add(arenaFloor(rand));
  g.add(
    scatter(rand, 24, (r) =>
      cloneProp(natureOf(pick(r, ['treesS', 'treesBS', 'treeA', 'treeB', 'treesBM', 'rockA', 'rockB'])), {
        scale: 0.45 + r() * 0.65,
      }),
    { minR: 4.0, maxR: 11 }),
  );
  g.add(
    placeRing(rand, 6, (r) => cloneProp(natureOf('hill'), { scale: 0.28 + r() * 0.25 }), {
      minR: 9,
      maxR: 13,
    }),
  );
  g.add(
    scatter(rand, 22, (r) =>
      cloneProp(
        dungeonOf(pick(r, ['bannerB', 'candle', 'candleTrip', 'tableS', 'tableM', 'chair', 'barrelDeco', 'chestGold', 'shelfCandles'])),
        { scale: 0.85 + r() * 0.35, tint: 0xffd0f0 },
      ),
    { minR: 3.5, maxR: 8.2 }),
  );
  return g;
}

function swampDecor(rand) {
  const g = forestDecor(rand);
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
    scatter(rand, 28, (r) =>
      cloneProp(natureOf(pick(r, ['rockA', 'rockB', 'rockC', 'rockD', 'rockE', 'hill'])), {
        scale: 0.7 + r() * 1.1,
        tint,
      }),
    { minR: 3.6, maxR: 11.5 }),
  );
  g.add(
    scatter(rand, 22, (r) =>
      cloneProp(natureOf(pick(r, ['treesS', 'treesBS', 'treeA', 'treeB'])), {
        scale: 0.45 + r() * 0.7,
        tint: 0xc8e0f0,
      }),
    { minR: 5.0, maxR: 12.5 }),
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
    scatter(rand, 12, (r) =>
      cloneProp(natureOf(pick(r, ['rockA', 'rockC', 'rockE', 'hill'])), {
        scale: 0.8 + r() * 0.9,
        tint: 0xff6030,
      }),
    { minR: 5, maxR: 12 }),
  );
  return g;
}

function tombDecor(rand) {
  const g = graveyardDecor(rand);
  g.add(
    placeRing(rand, 8, (r) =>
      cloneProp(halloweenOf(pick(r, ['crypt', 'arch', 'shrine', 'coffinDeco', 'pillar'])), {
        scale: 0.85 + r() * 0.4,
        tint: 0x9098a8,
      }),
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
      cloneProp(spaceOf(pick(r, ['moduleA', 'moduleB', 'moduleC', 'moduleE', 'structT', 'structL'])), {
        scale: 0.4 + r() * 0.35,
        tint: 0xc8e0ff,
      }),
    { minR: 6.5, maxR: 12 }),
  );
  g.add(
    scatter(rand, 16, (r) =>
      cloneProp(spaceOf(pick(r, ['contA', 'contB', 'cargoA', 'cargoStack', 'lights', 'solar', 'rockA', 'rockB'])), {
        scale: 0.7 + r() * 0.5,
        tint: 0xd0e8ff,
      }),
    { minR: 3.8, maxR: 10 }),
  );
  return g;
}

function firmamentDecor(rand) {
  const g = etherDecor(rand);
  g.add(
    placeRing(rand, 6, (r) =>
      cloneProp(spaceOf(pick(r, ['landerA', 'landerB', 'turbine', 'roofSolar', 'rocksA'])), {
        scale: 0.45 + r() * 0.3,
        tint: 0xffe8c0,
      }),
    { minR: 8, maxR: 13.5 }),
  );
  return g;
}

function nexusDecor(rand) {
  const g = firmamentDecor(rand);
  g.add(
    placeRing(rand, 8, (r) =>
      cloneProp(spaceOf(pick(r, ['moduleA', 'moduleE', 'structT', 'pad', 'lights'])), {
        scale: 0.55 + r() * 0.35,
        tint: 0xe0b0ff,
      }),
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
  let group;
  switch (kind) {
    case 'bare':
      group = bareDecor(rand);
      break;
    case 'forest':
      group = forestDecor(rand);
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
    console.warn('[sinergia-idle] zona KayKit vazia após preload — props não resolvidos?', kind);
  }
  propDensityFactor = 1;
  return group;
}

export function kayKitResolvedCount() {
  let ok = 0;
  for (const v of resolved.values()) if (v?.scene) ok += 1;
  return ok;
}

/** Catálogo de props disponíveis para o editor de mapa admin. */
export function listKayKitPalette() {
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [packId, pack] of Object.entries(PACKS)) {
    out[packId] = Object.keys(pack.files);
  }
  return out;
}

export function listKayKitPropKinds() {
  return Object.keys(KIND_PACKS);
}

/** Coloca um prop avulso (decoração do editor) no mundo. */
export function spawnKayKitDecoration(packId, key, opts = {}) {
  const pack = PACKS[packId];
  if (!pack) return null;
  const file = pack.files[key];
  if (!file) return null;
  const gltf = getGltf(pack.dir, file);
  const obj = cloneProp(gltf, {
    scale: opts.scale ?? 1,
    y: opts.y ?? 0,
    rotY: opts.rotY ?? 0,
    tint: opts.tint,
  });
  if (!obj) return null;
  obj.position.x = Number(opts.x) || 0;
  obj.position.z = Number(opts.z) || 0;
  return obj;
}

/** Garante preload dos packs usados pelas decorações. */
export function preloadDecorationPacks(decorations = []) {
  const packs = new Set();
  for (const d of decorations) {
    if (d?.pack) packs.add(d.pack);
  }
  return Promise.all([...packs].map((id) => preloadPack(id))).then(() => true);
}
