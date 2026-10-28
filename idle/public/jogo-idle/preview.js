/** Preview 3D do personagem na criação — mesma malha/cores do jogo. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SKINS, ARMORS, METALS, CAPES, CLASS_PARTS, DEFAULT_LOOK } from './appearance.js';

const MODEL_DIR = '/jogo-idle/assets/models/';
const HERO_HEIGHT = 1.9;
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

const root = document.getElementById('root');
const statusEl = document.getElementById('status');
const loader = new GLTFLoader();
const modelCache = new Map();

function loadModel(file) {
  if (!modelCache.has(file)) modelCache.set(file, loader.loadAsync(MODEL_DIR + file));
  return modelCache.get(file);
}

function createActor(gltf, { hide = [], height }) {
  const model = cloneSkinned(gltf.scene);
  const meshes = [];
  const named = new Map();
  model.traverse((o) => {
    if (o.name) named.set(o.name, o);
    if (hide.includes(o.name)) o.visible = false;
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false;
      o.material = o.material.clone();
      o.userData.baseColor = o.material.color.clone();
      o.userData.baseEmissive = o.material.emissive.clone();
      meshes.push(o);
    }
  });

  const box = new THREE.Box3().setFromObject(model);
  const h = Math.max(0.01, box.max.y - box.min.y);
  const baseScale = height / h;
  model.scale.setScalar(baseScale);

  const holder = new THREE.Group();
  holder.add(model);

  const mixer = new THREE.AnimationMixer(model);
  const clips = new Map(gltf.animations.map((c) => [c.name, c]));
  let current = null;
  let idleName = 'Idle';

  function action(name) {
    const clip = clips.get(name);
    return clip ? mixer.clipAction(clip) : null;
  }

  function loop(name, fade = 0.2) {
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
    const stance = clips.has(next.stance) ? next.stance : 'Idle';
    loop(stance);
  }

  function update(dt) {
    mixer.update(dt);
  }

  function dispose() {
    mixer.stopAllAction();
    for (const m of meshes) m.material.dispose();
  }

  return { holder, update, dispose, applyLook };
}

const clearStage = new URLSearchParams(location.search).has("clear");
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: clearStage,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if (clearStage) renderer.setClearColor(0x000000, 0);
root.prepend(renderer.domElement);

const scene = new THREE.Scene();
if (clearStage) {
  scene.background = null;
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
} else {
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 8, 18);
}

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);

const CAM_TARGET = clearStage
  ? { x: 0.05, y: 0.88, z: 0 }
  : { x: 0, y: 1.0, z: 0 };
const CAM_FRONT = clearStage
  ? { x: 0.05, y: 1.32, z: 3.95 }
  : { x: 0, y: 1.55, z: 4.2 };
const CAM_BACK = clearStage
  ? { x: 0.05, y: 1.32, z: -3.95 }
  : { x: 0, y: 1.55, z: -4.2 };

camera.position.set(CAM_FRONT.x, CAM_FRONT.y, CAM_FRONT.z);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = 2.4;
controls.maxDistance = 6.5;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = Math.PI / 2 - 0.08;
controls.update();

function setCameraView(view) {
  const pos = view === 'back' ? CAM_BACK : CAM_FRONT;
  camera.position.set(pos.x, pos.y, pos.z);
  controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
  controls.update();
}

const hemi = new THREE.HemisphereLight(0xb8c8ff, 0x1a1420, 0.75);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d8, 1.35);
sun.position.set(3.2, 6, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 20;
scene.add(sun);
scene.add(new THREE.AmbientLight(0x405070, 0.35));

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 48),
  new THREE.MeshStandardMaterial({ color: 0x1a2238, roughness: 0.92, metalness: 0.05 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(1.05, 1.12, 64),
  new THREE.MeshBasicMaterial({ color: 0x6366f1, transparent: true, opacity: 0.45, side: THREE.DoubleSide }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
if (clearStage) {
  ground.visible = false;
  ring.visible = false;
}
scene.add(ring);

let hero = null;
let heroClass = null;
let pending = { classId: 'GUERREIRO', appearance: { ...DEFAULT_LOOK } };
let loadToken = 0;
const clock = new THREE.Clock();

function resize() {
  const w = root.clientWidth || 1;
  const h = root.clientHeight || 1;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function announceReady() {
  window.parent?.postMessage({ type: 'jogo-idle:preview-ready' }, window.location.origin);
}

async function setHero(classId, appearance) {
  const rawId = String(classId || 'GUERREIRO').trim().toUpperCase();
  const id = HEROES[rawId] ? rawId : 'GUERREIRO';
  const look = { ...DEFAULT_LOOK, ...(appearance && typeof appearance === 'object' ? appearance : {}) };
  pending = { classId: id, appearance: look };

  if (heroClass === id && hero) {
    hero.applyLook(look, id);
    return;
  }

  const token = ++loadToken;
  statusEl.hidden = false;
  statusEl.textContent = 'Carregando personagem…';
  const cfg = HEROES[id];
  try {
    const gltf = await loadModel(cfg.file);
    if (token !== loadToken) return;
    if (hero) {
      scene.remove(hero.holder);
      hero.dispose();
      hero = null;
    }
    hero = createActor(gltf, { hide: cfg.gear, height: HERO_HEIGHT });
    heroClass = id;
    // clear: leve deslocamento + yaw menor para centrar no pedestal da arte.
    hero.holder.position.set(clearStage ? 0.06 : 0, 0, 0);
    hero.holder.rotation.y = Math.PI * (clearStage ? 0.05 : 0.15);
    scene.add(hero.holder);
    // Aplica o look mais recente (pode ter mudado durante o load).
    const latest = pending.classId === id ? pending.appearance : look;
    hero.applyLook(latest, id);
    statusEl.hidden = true;
  } catch (err) {
    if (token !== loadToken) return;
    statusEl.hidden = false;
    statusEl.textContent = 'Não foi possível carregar o modelo';
    console.error('[jogo-idle preview]', err);
  }
}

function onMessage(event) {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (!data || typeof data !== 'object') return;
  if (data.type === 'jogo-idle:preview-ping') {
    announceReady();
    return;
  }
  if (data.type === 'jogo-idle:preview-camera') {
    const view = String(data.view || 'front');
    if (view === 'reset' || view === 'front') setCameraView('front');
    else if (view === 'back') setCameraView('back');
    return;
  }
  if (data.type !== 'jogo-idle:preview') return;
  void setHero(data.classId, data.appearance);
}

window.addEventListener('message', onMessage);
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(root);
resize();

announceReady();

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  controls.update();
  hero?.update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

void setHero(pending.classId, pending.appearance);
