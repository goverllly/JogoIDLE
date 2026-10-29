/** Preview 3D do personagem na criação — mesma malha/cores do jogo. */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SKINS, ARMORS, METALS, CAPES, CLASS_PARTS, DEFAULT_LOOK } from './appearance.js';
import { hallImageCandidates, hallProfile, normalizeClassId } from './class-halls.js';

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

const previewParams = new URLSearchParams(location.search);
const clearStage = previewParams.has("clear");
const hallStage = !clearStage && previewParams.has("hall");
const paintedHall = hallStage;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: clearStage || paintedHall,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = !paintedHall;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
if (clearStage || paintedHall) renderer.setClearColor(0x000000, 0);
const statusAnchor = document.getElementById('status');
root.insertBefore(renderer.domElement, statusAnchor);

const scene = new THREE.Scene();
if (clearStage) {
  scene.background = null;
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
} else {
  scene.background = new THREE.Color(0x0b1020);
  scene.fog = new THREE.Fog(0x0b1020, 8, 18);
}

const camera = new THREE.PerspectiveCamera(hallStage ? 30 : 32, 1, 0.1, 40);

const CAM_TARGET = clearStage
  ? { x: 0.05, y: 0.88, z: 0 }
  : hallStage
    ? { x: 0, y: 0.86, z: 0 }
    : { x: 0, y: 1.0, z: 0 };
const CAM_FRONT = clearStage
  ? { x: 0.05, y: 1.32, z: 3.95 }
  : hallStage
    ? { x: 0.04, y: 1.16, z: 4.15 }
    : { x: 0, y: 1.55, z: 4.2 };
const CAM_BACK = clearStage
  ? { x: 0.05, y: 1.32, z: -3.95 }
  : hallStage
    ? { x: 0.04, y: 1.16, z: -4.15 }
    : { x: 0, y: 1.55, z: -4.2 };

camera.position.set(CAM_FRONT.x, CAM_FRONT.y, CAM_FRONT.z);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.minDistance = hallStage ? 2.85 : 2.4;
controls.maxDistance = hallStage ? 6.2 : 6.5;
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
const fill = new THREE.AmbientLight(hallStage ? 0x3d4a38 : 0x405070, hallStage ? 0.28 : 0.35);
scene.add(fill);
const rimLight = new THREE.DirectionalLight(0x8eb6c8, 0.4);
rimLight.position.set(-2.2, 2.4, 3.1);
scene.add(rimLight);
const warmPoint = new THREE.PointLight(0xffb45a, 0, 6.5, 2);
warmPoint.position.set(-0.85, 1.35, 0.85);
const coolPoint = new THREE.PointLight(0xffb45a, 0, 6.5, 2);
coolPoint.position.set(0.9, 1.2, 0.7);
scene.add(warmPoint, coolPoint);
if (hallStage) {
  scene.background = null;
  scene.fog = null;
  document.documentElement.style.background = "transparent";
  document.body.style.background = "transparent";
  document.body.classList.add("preview-hall");
  sun.castShadow = false;
}

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 48),
  new THREE.MeshStandardMaterial({
    color: hallStage ? 0x6d675c : 0x1a2238,
    roughness: 0.92,
    metalness: hallStage ? 0.04 : 0.05,
  }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const ring = new THREE.Mesh(
  new THREE.RingGeometry(1.05, 1.12, 64),
  new THREE.MeshBasicMaterial({
    color: hallStage ? 0xc9a05a : 0x6366f1,
    transparent: true,
    opacity: hallStage ? 0.38 : 0.45,
    side: THREE.DoubleSide,
  }),
);
ring.rotation.x = -Math.PI / 2;
ring.position.y = 0.02;
if (clearStage || hallStage) {
  ground.visible = false;
  ring.visible = false;
}
scene.add(ring);

const contact = new THREE.Mesh(
  new THREE.CircleGeometry(0.46, 40),
  new THREE.MeshBasicMaterial({
    color: 0x05060a,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  }),
);
contact.rotation.x = -Math.PI / 2;
contact.position.y = 0.015;
contact.visible = hallStage;
scene.add(contact);

const PARTICLE_COUNT = 20;
const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
const particleSeeds = new Float32Array(PARTICLE_COUNT);
for (let i = 0; i < PARTICLE_COUNT; i += 1) particleSeeds[i] = Math.random();
const particleGeo = new THREE.BufferGeometry();
particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
const particleMat = new THREE.PointsMaterial({
  color: 0xffb45a,
  size: 0.045,
  transparent: true,
  opacity: 0.8,
  depthWrite: false,
  sizeAttenuation: true,
});
const particles = new THREE.Points(particleGeo, particleMat);
particles.visible = false;
scene.add(particles);
let particleKind = 'embers';

function seedParticle(i, kind) {
  const side = i % 2 === 0 ? -1 : 1;
  particlePositions[i * 3] = side * (0.62 + particleSeeds[i] * 0.85);
  particlePositions[i * 3 + 1] = kind === 'leaves' ? 0.35 + particleSeeds[i] * 1.45 : particleSeeds[(i + 3) % PARTICLE_COUNT] * 1.5;
  particlePositions[i * 3 + 2] = (particleSeeds[(i + 7) % PARTICLE_COUNT] - 0.5) * 0.9;
}

function applyClassLight(profile) {
  const light = profile.light;
  hemi.color.setHex(light.hemi);
  hemi.groundColor.setHex(light.ground);
  hemi.intensity = 0.72;
  sun.color.setHex(light.sun);
  sun.intensity = 1.25;
  fill.color.setHex(light.fill);
  fill.intensity = 0.22;
  rimLight.color.setHex(light.rim);
  rimLight.intensity = 0.38;
  warmPoint.color.setHex(light.point);
  coolPoint.color.setHex(light.point);
  warmPoint.intensity = 1.15;
  coolPoint.intensity = 0.72;
  particleMat.color.setHex(light.point);
  particleKind = profile.particle;
  particleMat.size = profile.particle === 'sparks' ? 0.03 : profile.particle === 'leaves' ? 0.055 : 0.042;
  for (let i = 0; i < PARTICLE_COUNT; i += 1) seedParticle(i, particleKind);
  particleGeo.attributes.position.needsUpdate = true;
  const layers = document.querySelectorAll('.hall-layer');
  layers.forEach((layer) => {
    layer.style.backgroundPosition = profile.backdrop || 'center 68%';
  });
}

const hallLayers = [document.getElementById('hall-a'), document.getElementById('hall-b')];
let hallFront = 0;
let hallUrl = '';
let hallToken = 0;
let fallbackStarted = false;

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error(url));
    img.src = url;
  });
}

function showHallImage(url, profile) {
  if (!hallLayers[0] || url === hallUrl) return;
  hallUrl = url;
  const next = hallLayers[1 - hallFront];
  const prev = hallLayers[hallFront];
  next.style.backgroundImage = `url("${url}")`;
  next.style.backgroundPosition = profile.backdrop || 'center 68%';
  if (reduceMotion) {
    next.style.transition = 'none';
    prev.style.transition = 'none';
  }
  next.style.opacity = '1';
  prev.style.opacity = '0';
  hallFront = 1 - hallFront;
  ground.visible = false;
  ring.visible = false;
  contact.visible = true;
  particles.visible = hallStage && !reduceMotion;
  scene.background = null;
  scene.fog = null;
  renderer.setClearColor(0x000000, 0);
}

function useGeometryHall() {
  if (fallbackStarted) return;
  fallbackStarted = true;
  hallLayers.forEach((layer) => {
    if (layer) layer.style.opacity = '0';
  });
  scene.background = new THREE.Color(0x1a2624);
  scene.fog = new THREE.Fog(0x24302c, 6.5, 15);
  renderer.setClearColor(0x1a2624, 1);
  ground.visible = true;
  ring.visible = true;
  contact.visible = false;
  particles.visible = false;
  document.body.style.background = '#1a2624';
  void buildHall();
}

function applyPaintedHall(classId) {
  if (!hallStage) return;
  const id = normalizeClassId(classId);
  const profile = hallProfile(id);
  applyClassLight(profile);
  const urls = hallImageCandidates(id);
  const currentSlug = profile.slug;
  if (hallUrl.includes(`/${currentSlug}.`)) return;
  const token = ++hallToken;
  loadImage(urls[0])
    .catch(() => loadImage(urls[1]))
    .then((url) => {
      if (token !== hallToken) return;
      showHallImage(url, profile);
    })
    .catch(() => {
      if (token !== hallToken) return;
      useGeometryHall();
    });
}

let hero = null;
let heroClass = null;
let pending = { classId: 'GUERREIRO', appearance: { ...DEFAULT_LOOK } };
let loadToken = 0;
const clock = new THREE.Clock();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
  if (hallStage) applyPaintedHall(id);

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
    hero = createActor(gltf, { hide: cfg.gear, height: hallStage ? 1.72 : HERO_HEIGHT });
    heroClass = id;
    hero.holder.position.set(clearStage ? 0.06 : 0, 0, hallStage ? 0.08 : 0);
    hero.holder.rotation.y = Math.PI * (clearStage ? 0.05 : 0.08);
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

function tickParticles(dt) {
  if (!particles.visible) return;
  const t = clock.elapsedTime;
  for (let i = 0; i < PARTICLE_COUNT; i += 1) {
    const y = i * 3 + 1;
    const x = i * 3;
    if (particleKind === 'leaves') {
      particlePositions[y] -= dt * (0.12 + particleSeeds[i] * 0.18);
      particlePositions[x] += Math.sin(t * 1.4 + i) * dt * 0.08;
      if (particlePositions[y] < 0.05) seedParticle(i, particleKind);
    } else if (particleKind === 'magic') {
      particlePositions[y] += dt * (0.08 + particleSeeds[i] * 0.12);
      particlePositions[x] += Math.sin(t * 0.8 + i) * dt * 0.05;
      if (particlePositions[y] > 1.7) seedParticle(i, particleKind);
    } else {
      const rise = particleKind === 'sparks' ? 0.55 : 0.28;
      particlePositions[y] += dt * (rise + particleSeeds[i] * 0.25);
      if (particlePositions[y] > 1.65) seedParticle(i, particleKind);
    }
  }
  particleGeo.attributes.position.needsUpdate = true;
  if (!reduceMotion) {
    const n = Math.sin(t * 2.4);
    warmPoint.intensity = 1.05 + n * 0.12;
    coolPoint.intensity = 0.68 - n * 0.08;
  }
}

function tick() {
  const dt = Math.min(0.05, clock.getDelta());
  controls.update();
  hero?.update(dt);
  tickParticles(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

function prepareProp(object, height) {
  object.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;
  });
  const box = new THREE.Box3().setFromObject(object);
  const size = Math.max(0.01, box.max.y - box.min.y);
  object.scale.multiplyScalar(height / size);
  const grounded = new THREE.Box3().setFromObject(object);
  object.position.y -= grounded.min.y;
}

async function placeHallProp(spec) {
  const gltf = await loader.loadAsync(spec.url);
  const model = gltf.scene.clone(true);
  prepareProp(model, spec.height);
  model.position.x += spec.x;
  model.position.z += spec.z;
  model.rotation.y = spec.rotY || 0;
  scene.add(model);
}

async function buildHall() {
  const props = [
    { url: "/jogo-idle/assets/kaykit/dungeon/wall_arched.gltf", x: 0, z: -2.35, height: 2.7, rotY: 0 },
    { url: "/jogo-idle/assets/kaykit/dungeon/pillar.gltf", x: -1.55, z: -1.5, height: 2.15, rotY: 0.15 },
    { url: "/jogo-idle/assets/kaykit/dungeon/pillar.gltf", x: 1.55, z: -1.5, height: 2.15, rotY: -0.15 },
    { url: "/jogo-idle/assets/kaykit/dungeon/torch_lit.gltf", x: -1.05, z: -0.28, height: 1.05, rotY: 0.35 },
    { url: "/jogo-idle/assets/kaykit/dungeon/torch_lit.gltf", x: 1.05, z: -0.28, height: 1.05, rotY: -0.35 },
    { url: "/jogo-idle/assets/kaykit/forest/Tree_1_A_Color1.gltf", x: -2.2, z: -1.25, height: 1.65, rotY: 0.5 },
    { url: "/jogo-idle/assets/props/nature/tree_single_A.gltf", x: 2.25, z: -1.65, height: 1.5, rotY: -0.4 },
    { url: "/jogo-idle/assets/kaykit/dungeon/floor_tile_small_weeds_A.gltf", x: -0.9, z: 0.82, height: 0.2, rotY: 0.4 },
    { url: "/jogo-idle/assets/kaykit/dungeon/floor_tile_small_weeds_A.gltf", x: 0.95, z: 0.72, height: 0.2, rotY: 1.2 },
  ];
  await Promise.all(props.map((spec) => placeHallProp(spec).catch((err) => {
    console.error("[jogo-idle preview] prop", spec.url, err);
  })));
}

if (hallStage) {
  const initial = normalizeClassId(previewParams.get('class') || 'GUERREIRO');
  applyPaintedHall(initial);
  if (previewParams.get('class')) {
    void setHero(initial, pending.appearance);
  } else {
    statusEl.hidden = false;
    statusEl.textContent = 'O salão espera um aventureiro.';
  }
} else {
  void setHero(pending.classId, pending.appearance);
}
