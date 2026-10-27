/**
 * Miniaturas 3D dos itens — malhas Adventurers + props standalone.
 * `fw_*` (Fantasy Weapons FREE) e `tool_*` (RPG Tools FREE + subset dungeon) são o GLTF inteiro.
 * `custom_*` em assets/custom/ (ex. elmo mago) também renderizam o GLB inteiro.
 * O herói não faz retarget de `fw_*` / custom no skeleton dos Adventurers — só o ícone do inventário/equip.
 * Armaduras sem visual custom continuam com ícone procedural (ou SVG se falhar).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RARITY_COLORS } from './weapons.js';

const MODEL_DIR = '/sinergia-idle/assets/models/';
const SIZE = 128;

/**
 * Miniaturas do inventário: malhas Adventurer → Fantasy Weapons (KayKit FREE).
 * O herói 3D continua com a visual Adventurer original em scene3d.
 */
const ICON_VISUAL_BY_ADVENTURER = {
  '1H_Sword': ['fw_sword_A', 'fw_sword_B', 'fw_sword_C'],
  '2H_Sword': ['fw_sword_D', 'fw_sword_E', 'fw_halberd'],
  '1H_Sword_Offhand': ['fw_dagger_A', 'fw_dagger_B', 'fw_sword_A'],
  Round_Shield: ['fw_shield_A', 'fw_shield_B'],
  Badge_Shield: ['fw_shield_B', 'fw_shield_C'],
  Rectangle_Shield: ['fw_shield_C', 'fw_shield_B'],
  Spike_Shield: ['fw_shield_C', 'fw_shield_A'],
  '1H_Axe': ['fw_axe_A', 'fw_axe_B', 'fw_hammer_A'],
  '2H_Axe': ['fw_axe_C', 'fw_hammer_C', 'fw_halberd'],
  '1H_Axe_Offhand': ['fw_axe_A', 'fw_dagger_B'],
  Barbarian_Round_Shield: ['fw_shield_A', 'fw_shield_B'],
  '1H_Wand': ['fw_wand_A', 'fw_staff_A'],
  '2H_Staff': ['fw_staff_A', 'fw_staff_B', 'fw_wand_A'],
  Spellbook: ['tool_journal_closed', 'tool_journal_open'],
  Spellbook_open: ['tool_journal_open', 'tool_journal_closed'],
  '1H_Crossbow': ['fw_bow_A_withString', 'fw_bow_A', 'fw_arrow_A'],
  '2H_Crossbow': ['fw_bow_B_withString', 'fw_bow_B', 'fw_arrow_B'],
  Knife_Offhand: ['fw_dagger_A', 'fw_dagger_B'],
  Knife: ['fw_dagger_B', 'fw_dagger_A'],
  Throwable: ['fw_arrow_A', 'fw_dagger_A'],
};

const CLASS_ARMOR_STYLE = {
  GUERREIRO: 'plate',
  BARBARO: 'tribal',
  MAGO: 'arcane',
  ARQUEIRO: 'ranger',
};

/** visual → arquivo Adventurer (extrai mesh pelo nome). */
const VISUAL_FILE = {
  '1H_Sword': 'Knight.glb',
  '2H_Sword': 'Knight.glb',
  '1H_Sword_Offhand': 'Knight.glb',
  Round_Shield: 'Knight.glb',
  Badge_Shield: 'Knight.glb',
  Rectangle_Shield: 'Knight.glb',
  Spike_Shield: 'Knight.glb',
  '1H_Axe': 'Barbarian.glb',
  '2H_Axe': 'Barbarian.glb',
  '1H_Axe_Offhand': 'Barbarian.glb',
  Barbarian_Round_Shield: 'Barbarian.glb',
  '1H_Wand': 'Mage.glb',
  '2H_Staff': 'Mage.glb',
  Spellbook: 'Mage.glb',
  Spellbook_open: 'Mage.glb',
  '1H_Crossbow': 'Rogue_Hooded.glb',
  '2H_Crossbow': 'Rogue_Hooded.glb',
  Knife_Offhand: 'Rogue_Hooded.glb',
  Knife: 'Rogue_Hooded.glb',
  Throwable: 'Rogue_Hooded.glb',
};

/** Arquivos do pack Fantasy Weapons Bits FREE → id `fw_<arquivo>`. */
const FW_MODELS = [
  'arrow_A', 'arrow_B',
  'axe_A', 'axe_B', 'axe_C',
  'bow_A', 'bow_A_withString', 'bow_B', 'bow_B_withString',
  'dagger_A', 'dagger_B',
  'fistweapon_A', 'fistweapon_A_stacked', 'fistweapon_B', 'fistweapon_B_stacked',
  'halberd',
  'hammer_A', 'hammer_B', 'hammer_C',
  'shield_A', 'shield_B', 'shield_C',
  'spear_A',
  'staff_A', 'staff_B',
  'sword_A', 'sword_B', 'sword_C', 'sword_D', 'sword_E',
  'wand_A',
];

/** Arquivos do pack RPG Tools Bits FREE → id `tool_<arquivo>`. Sem lantern (já é tool_lantern). */
const RPG_TOOL_MODELS = [
  'anvil', 'axe', 'blueprint', 'blueprint_stacked', 'bucket_metal', 'chisel',
  'compass_base', 'drafting_compass', 'file', 'grindstone', 'hammer', 'handdrill', 'handplane',
  'journal_closed', 'journal_open', 'knife', 'magnifying_glass', 'mallet',
  'map', 'map_empty', 'map_rolled', 'nail',
  'pencil_A_long', 'pencil_A_short', 'pencil_B_long', 'pencil_B_short',
  'pickaxe', 'rope_bundle_A', 'rope_bundle_B', 'saw', 'scissors',
  'screw_A', 'screw_B',
  'screwdriver_A_long', 'screwdriver_A_long_color', 'screwdriver_A_short', 'screwdriver_A_short_color',
  'screwdriver_B_long', 'screwdriver_B_long_color', 'screwdriver_B_short', 'screwdriver_B_short_color',
  'shovel', 'tongs', 'torch', 'torch_burnt', 'trowel', 'wrench_A', 'wrench_B',
];

/**
 * Standalone GLTF (arquivo inteiro = ícone).
 * tool_key / tool_skull / tool_lantern seguem o subset dungeon+halloween.
 */
const STANDALONE_FILE = {
  tool_key: '/sinergia-idle/assets/props/tools/key.glb',
  tool_lantern: '/sinergia-idle/assets/props/tools/lantern.gltf',
  tool_skull: '/sinergia-idle/assets/props/tools/skull.gltf',
  tool_chest: '/sinergia-idle/assets/props/tools/chest_gold.glb',
  tool_candle: '/sinergia-idle/assets/props/tools/candle.glb',
  tool_sword_shield: '/sinergia-idle/assets/props/tools/sword_shield.glb',
  /** Custom Blender — inventário/equip/admin (herói 3D do play continua com malhas Adventurer). */
  custom_elmo_mago: '/sinergia-idle/assets/custom/elmo-mago.glb',
  custom_peito_mago: '/sinergia-idle/assets/custom/peito-mago.glb',
  custom_calca_mago: '/sinergia-idle/assets/custom/calca-mago.glb',
  custom_luva_mago: '/sinergia-idle/assets/custom/luva-mago.glb',
  custom_bota_mago: '/sinergia-idle/assets/custom/bota-mago.glb',
  custom_elmo_guerreiro: '/sinergia-idle/assets/custom/elmo-guerreiro.glb',
  custom_peito_guerreiro: '/sinergia-idle/assets/custom/peito-guerreiro.glb',
  custom_calca_guerreiro: '/sinergia-idle/assets/custom/calca-guerreiro.glb',
  custom_luva_guerreiro: '/sinergia-idle/assets/custom/luva-guerreiro.glb',
  custom_bota_guerreiro: '/sinergia-idle/assets/custom/bota-guerreiro.glb',
  custom_elmo_barbaro: '/sinergia-idle/assets/custom/elmo-barbaro.glb',
  custom_peito_barbaro: '/sinergia-idle/assets/custom/peito-barbaro.glb',
  custom_calca_barbaro: '/sinergia-idle/assets/custom/calca-barbaro.glb',
  custom_luva_barbaro: '/sinergia-idle/assets/custom/luva-barbaro.glb',
  custom_bota_barbaro: '/sinergia-idle/assets/custom/bota-barbaro.glb',
  custom_elmo_arqueiro: '/sinergia-idle/assets/custom/elmo-arqueiro.glb',
  custom_peito_arqueiro: '/sinergia-idle/assets/custom/peito-arqueiro.glb',
  custom_calca_arqueiro: '/sinergia-idle/assets/custom/calca-arqueiro.glb',
  custom_luva_arqueiro: '/sinergia-idle/assets/custom/luva-arqueiro.glb',
  custom_bota_arqueiro: '/sinergia-idle/assets/custom/bota-arqueiro.glb',
  custom_machado_1: '/sinergia-idle/assets/custom/machado-1.glb',
  custom_anel_1: '/sinergia-idle/assets/custom/anel-1.glb',
  custom_anel_2: '/sinergia-idle/assets/custom/anel-2.glb',
};
for (const name of FW_MODELS) {
  // v2.0: biblioteca KayKit completa; props/ permanece como caminho legado compatível.
  STANDALONE_FILE[`fw_${name}`] = `/sinergia-idle/assets/kaykit/fantasy-weapons/${name}.gltf`;
}
for (const name of RPG_TOOL_MODELS) {
  STANDALONE_FILE[`tool_${name}`] = `/sinergia-idle/assets/props/tools/${name}.gltf`;
}

const cache = new Map();
const inflight = new Map();
const gltfCache = new Map();

let renderer = null;
let scene = null;
let camera = null;
let loader = null;
let light = null;

function ensureRenderer() {
  if (renderer) return;
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
    powerPreference: 'low-power',
  });
  renderer.setSize(SIZE, SIZE, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(32, 1, 0.01, 20);
  light = new THREE.DirectionalLight(0xffffff, 1.55);
  light.position.set(2.4, 3.6, 2.6);
  scene.add(light);
  const fill = new THREE.DirectionalLight(0xb8d4ff, 0.45);
  fill.position.set(-2.2, 1.4, -1.2);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xfff0d8, 0.62));
  scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a1a10, 0.5));

  loader = new GLTFLoader();
}

async function loadGltfUrl(url) {
  if (gltfCache.has(url)) return gltfCache.get(url);
  ensureRenderer();
  try {
    const gltf = await loader.loadAsync(url);
    gltfCache.set(url, gltf);
    return gltf;
  } catch (err) {
    if (url.includes('/kaykit/fantasy-weapons/')) {
      const fallback = url.replace('/kaykit/fantasy-weapons/', '/props/weapons/');
      const gltf = await loader.loadAsync(fallback);
      gltfCache.set(url, gltf);
      return gltf;
    }
    throw err;
  }
}

async function loadGltf(file) {
  return loadGltfUrl(`${MODEL_DIR}${file}`);
}

function findNamed(root, name) {
  let found = null;
  root.traverse((o) => {
    if (!found && o.name === name) found = o;
  });
  return found;
}

function fitCamera(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 0.05);
  const dist = maxDim * 2.15;
  camera.position.set(center.x + dist * 0.55, center.y + dist * 0.35, center.z + dist * 0.85);
  camera.near = Math.max(0.01, dist / 100);
  camera.far = dist * 20;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

function extractStatic(source, rarity, { preserveMaterials = false } = {}) {
  source.updateWorldMatrix(true, true);
  const group = new THREE.Group();
  source.traverse((m) => {
    if (!m.isMesh || !m.geometry) return;
    const geom = m.geometry.clone();
    if (m.isSkinnedMesh && m.skeleton) {
      geom.applyMatrix4(m.matrixWorld);
    } else {
      geom.applyMatrix4(m.matrixWorld);
    }
    const mat = Array.isArray(m.material)
      ? m.material.map((x) => x.clone())
      : m.material.clone();
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const material of mats) {
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      if (material.emissiveMap) material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      if (!preserveMaterials && material.emissive) {
        material.emissive.setHex(RARITY_COLORS[rarity] ?? 0xb5ad9c);
        material.emissiveIntensity = 0.4;
      }
      // preserveMaterials (custom_*): deixa emissive/map como no Blender.
    }
    const mesh = new THREE.Mesh(geom, Array.isArray(mat) ? mats : mats[0]);
    group.add(mesh);
  });
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);
  return group;
}

function disposeRenderedGroup(group) {
  group.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry?.dispose?.();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const material of mats) material?.dispose?.();
  });
}

function renderMesh(source, rarity, { preserveMaterials = false } = {}) {
  ensureRenderer();
  const group = extractStatic(source, rarity, { preserveMaterials });
  scene.add(group);
  fitCamera(group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(group);
  disposeRenderedGroup(group);
  return url;
}

const ARMOR_SLOT_VISUALS = {
  head: 'armor_head',
  chest: 'armor_chest',
  legs: 'armor_legs',
  gloves: 'armor_gloves',
  boots: 'armor_boots',
};

function parseArmorVisual(visual) {
  const m = String(visual || '').match(/^armor_(head|chest|legs|gloves|boots)(?:_(plate|tribal|arcane|ranger))?$/);
  return {
    slot: m?.[1] || 'chest',
    style: m?.[2] || 'plate',
  };
}

function armorMaterials(style, rarity) {
  const accent = RARITY_COLORS[rarity] ?? 0xb5ad9c;
  const palettes = {
    plate: { base: 0xc9c5bc, trim: 0x8a8f9a, soft: 0xd4a84b },
    tribal: { base: 0x8b5a2b, trim: 0x3f2a1a, soft: 0xb45309 },
    arcane: { base: 0x6d28d9, trim: 0xc4b5fd, soft: 0x22d3ee },
    ranger: { base: 0x3f6212, trim: 0xa3a3a3, soft: 0x65a30d },
  };
  const p = palettes[style] || palettes.plate;
  const metal = new THREE.MeshStandardMaterial({
    color: p.base,
    metalness: style === 'arcane' ? 0.35 : 0.78,
    roughness: style === 'tribal' ? 0.55 : 0.32,
    emissive: accent,
    emissiveIntensity: 0.28,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: p.trim,
    metalness: 0.65,
    roughness: 0.4,
    emissive: accent,
    emissiveIntensity: 0.2,
  });
  const gem = new THREE.MeshStandardMaterial({
    color: accent,
    metalness: 0.25,
    roughness: 0.18,
    emissive: accent,
    emissiveIntensity: 0.55,
  });
  const soft = new THREE.MeshStandardMaterial({
    color: p.soft,
    metalness: 0.15,
    roughness: 0.7,
    emissive: accent,
    emissiveIntensity: 0.15,
  });
  return { metal, trim, gem, soft, accent };
}

/** Miniatura 3D procedural por slot + estilo de classe. */
function renderProceduralArmor(visual, rarity) {
  ensureRenderer();
  const { style, slot } = parseArmorVisual(visual);
  const { metal, trim, gem, soft } = armorMaterials(style, rarity);
  const group = new THREE.Group();

  if (slot === 'head') {
    if (style === 'arcane') {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.72), soft);
      hood.position.y = 0.05;
      group.add(hood);
      const brim = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.35, 16, 1, true), soft.clone());
      brim.position.y = 0.42;
      group.add(brim);
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), gem);
      crystal.position.set(0, 0.55, 0.12);
      group.add(crystal);
    } else if (style === 'tribal') {
      group.add(new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14), soft));
      const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.42, 8), trim);
      const hornR = hornL.clone();
      hornL.position.set(-0.28, 0.32, 0);
      hornR.position.set(0.28, 0.32, 0);
      hornL.rotation.z = 0.55;
      hornR.rotation.z = -0.55;
      group.add(hornL, hornR);
    } else if (style === 'ranger') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.65), soft);
      group.add(cap);
      const peak = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.28), trim);
      peak.position.set(0, -0.05, 0.28);
      group.add(peak);
    } else {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.44, 22, 16), metal);
      group.add(helm);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.18), trim);
      visor.position.set(0, 0.05, 0.32);
      group.add(visor);
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.35), gem);
      crest.position.set(0, 0.42, 0);
      group.add(crest);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.18, 16), metal.clone());
      neck.position.y = -0.32;
      group.add(neck);
    }
  } else if (slot === 'chest') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.92, 0.38), metal);
    group.add(body);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.42, 0.14), gem);
    plate.position.z = 0.22;
    group.add(plate);
    if (style === 'arcane') {
      const rune = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 10, 24), gem.clone());
      rune.position.z = 0.3;
      group.add(rune);
    }
    if (style !== 'ranger') {
      const pauldronL = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), trim);
      const pauldronR = pauldronL.clone();
      pauldronL.position.set(-0.42, 0.28, 0);
      pauldronR.position.set(0.42, 0.28, 0);
      group.add(pauldronL, pauldronR);
    } else {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.08), soft);
      strap.position.set(-0.22, 0, 0.22);
      group.add(strap);
    }
  } else if (slot === 'legs') {
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.78, 14), metal);
    const b = a.clone();
    a.position.x = -0.2;
    b.position.x = 0.2;
    group.add(a, b);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.07, 10, 24), trim);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.32;
    group.add(belt);
    if (style === 'tribal') {
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.55, 0.28, 12, 1, true), soft);
      skirt.position.y = 0.18;
      group.add(skirt);
    }
  } else if (slot === 'gloves') {
    const makeGlove = (x) => {
      const g = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.38), metal);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.18, 12), trim);
      cuff.rotation.z = Math.PI / 2;
      cuff.position.z = -0.22;
      const knuckle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.12), gem);
      knuckle.position.set(0, 0.14, 0.08);
      g.add(palm, cuff, knuckle);
      g.position.x = x;
      return g;
    };
    group.add(makeGlove(-0.32), makeGlove(0.32));
  } else {
    const makeBoot = (x) => {
      const g = new THREE.Group();
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.5), metal);
      foot.position.z = 0.06;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.35, 12), trim);
      shaft.position.y = 0.22;
      const toe = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.14, 0.16), gem);
      toe.position.set(0, -0.02, 0.28);
      g.add(foot, shaft, toe);
      g.position.x = x;
      return g;
    };
    group.add(makeBoot(-0.22), makeBoot(0.22));
  }

  scene.add(group);
  fitCamera(group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(group);
  disposeRenderedGroup(group);
  return url;
}

/** Anel procedural (torus + gema). */
function renderProceduralRing(rarity) {
  ensureRenderer();
  const accent = RARITY_COLORS[rarity] ?? 0x60a5fa;
  const group = new THREE.Group();
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.42, 0.12, 18, 36),
    new THREE.MeshStandardMaterial({
      color: 0xd4a84b,
      metalness: 0.88,
      roughness: 0.28,
      emissive: accent,
      emissiveIntensity: 0.28,
    }),
  );
  band.rotation.x = Math.PI / 2.4;
  const setting = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.8, roughness: 0.3 }),
  );
  setting.position.set(0, 0.32, 0);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({
      color: accent,
      metalness: 0.35,
      roughness: 0.15,
      emissive: accent,
      emissiveIntensity: 0.65,
    }),
  );
  gem.position.set(0, 0.46, 0);
  group.add(band, setting, gem);
  scene.add(group);
  fitCamera(group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(group);
  disposeRenderedGroup(group);
  return url;
}

/** Colar / amuleto procedural (substitui lanterna no slot necklace). */
function renderProceduralAmulet(rarity) {
  ensureRenderer();
  const accent = RARITY_COLORS[rarity] ?? 0xfbbf24;
  const group = new THREE.Group();
  const chain = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.035, 10, 36),
    new THREE.MeshStandardMaterial({
      color: 0xd4a84b,
      metalness: 0.9,
      roughness: 0.25,
      emissive: accent,
      emissiveIntensity: 0.15,
    }),
  );
  chain.rotation.x = Math.PI / 2.1;
  chain.position.y = 0.22;
  const pendant = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.26, 0),
    new THREE.MeshStandardMaterial({
      color: accent,
      metalness: 0.4,
      roughness: 0.2,
      emissive: accent,
      emissiveIntensity: 0.6,
    }),
  );
  pendant.position.y = -0.22;
  const bail = new THREE.Mesh(
    new THREE.TorusGeometry(0.1, 0.03, 8, 16),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.85, roughness: 0.3 }),
  );
  bail.position.y = 0.02;
  group.add(chain, bail, pendant);
  scene.add(group);
  fitCamera(group);
  renderer.render(scene, camera);
  const url = renderer.domElement.toDataURL('image/png');
  scene.remove(group);
  disposeRenderedGroup(group);
  return url;
}

function pickTierVariant(list, tier) {
  if (!list?.length) return null;
  const t = Math.max(1, Math.floor(Number(tier) || 1));
  const idx = Math.min(list.length - 1, Math.floor((t - 1) / Math.ceil(10 / list.length)));
  return list[idx] || list[0];
}

/** Retorna dataURL PNG da malha `visual`, ou null se não houver modelo. */
export async function itemIcon3d(visual, rarity = 'common') {
  if (!visual) return null;
  if (
    visual !== 'jewel_ring' &&
    visual !== 'jewel_amulet' &&
    !String(visual).startsWith('armor_') &&
    !VISUAL_FILE[visual] &&
    !STANDALONE_FILE[visual]
  ) {
    return null;
  }
  const key = `${visual}|${rarity}`;
  if (cache.has(key)) return cache.get(key);
  if (inflight.has(key)) return inflight.get(key);

  const job = (async () => {
    try {
      if (visual === 'jewel_ring') {
        const url = renderProceduralRing(rarity);
        cache.set(key, url);
        return url;
      }
      if (visual === 'jewel_amulet') {
        const url = renderProceduralAmulet(rarity);
        cache.set(key, url);
        return url;
      }
      if (String(visual).startsWith('armor_')) {
        const url = renderProceduralArmor(visual, rarity);
        cache.set(key, url);
        return url;
      }
      if (STANDALONE_FILE[visual]) {
        const gltf = await loadGltfUrl(STANDALONE_FILE[visual]);
        const preserveMaterials = String(visual).startsWith('custom_');
        const url = renderMesh(gltf.scene, rarity, { preserveMaterials });
        cache.set(key, url);
        return url;
      }
      const gltf = await loadGltf(VISUAL_FILE[visual]);
      const node = findNamed(gltf.scene, visual);
      if (!node) return null;
      const url = renderMesh(node, rarity);
      cache.set(key, url);
      return url;
    } catch (err) {
      console.warn('[sinergia-idle] item 3d', visual, err);
      return null;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, job);
  return job;
}

export function canRenderItem3d(visual) {
  return Boolean(
    visual &&
      (visual === 'jewel_ring' ||
        visual === 'jewel_amulet' ||
        String(visual).startsWith('armor_') ||
        VISUAL_FILE[visual] ||
        STANDALONE_FILE[visual]),
  );
}

/** URL do GLB/GLTF standalone (ex. custom_elmo_mago), ou null. */
export function getStandaloneModelUrl(visual) {
  return STANDALONE_FILE[visual] || null;
}

/**
 * Assets custom (`custom_*`) usam preview 3D ao vivo com rotação lenta
 * (admin, inventário e equipamento) em vez de PNG estático.
 */
export function shouldLiveSpin3d(visual) {
  return Boolean(visual && String(visual).startsWith('custom_') && STANDALONE_FILE[visual]);
}

/**
 * Resolve visual só para miniatura do inventário/equip.
 * Armas Adventurer → KayKit Fantasy Weapons; armadura → procedural por classe
 * (ou GLB custom em `item.visual` / elmo mago); colar → amuleto (não lanterna).
 */
export function resolveItemVisual(item) {
  if (!item) return null;
  if (item.slot === 'ring' && (item.visual === 'tool_key' || !item.visual)) return 'jewel_ring';
  if (item.slot === 'necklace') return 'jewel_amulet';

  // GLB custom (armaduras/machado/anéis) tem prioridade sobre procedural.
  if (item.visual && STANDALONE_FILE[item.visual]) return item.visual;

  if (ARMOR_SLOT_VISUALS[item.slot]) {
    const classId = item.classes?.[0] || item.classId;
    // Fallback legado: elmo mago se o template ainda não trouxe visual.
    if (item.slot === 'head' && classId === 'MAGO' && STANDALONE_FILE.custom_elmo_mago) {
      return 'custom_elmo_mago';
    }
    const style = CLASS_ARMOR_STYLE[classId] || 'plate';
    return `armor_${item.slot}_${style}`;
  }

  const mapped = ICON_VISUAL_BY_ADVENTURER[item.visual];
  if (mapped) {
    const picked = pickTierVariant(mapped, item.tier);
    if (picked && (STANDALONE_FILE[picked] || VISUAL_FILE[picked])) return picked;
  }

  return item.visual || null;
}
