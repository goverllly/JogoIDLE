/**
 * Preview 3D do Admin Studio — modos item | monster.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  canRenderItem3d,
  getStandaloneModelUrl,
  itemIcon3d,
  shouldLiveSpin3d,
} from '../item-icon3d.js';
import {
  DEFAULT_MONSTER_VISUAL,
  getMonsterVisual,
  monsterModelUrl,
  resolveMonsterVisualId,
} from './asset-registry.js';

const canvas = document.getElementById('view');
const emptyEl = document.getElementById('empty');
const labelEl = document.getElementById('label');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071524);

const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 40);
camera.position.set(1.6, 1.4, 2.4);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 1.15;
controls.target.set(0, 0.7, 0);
controls.minDistance = 0.15;
controls.maxDistance = 40;

let framedRoot = null;
let userOrbit = false;
controls.addEventListener('start', () => {
  userOrbit = true;
});

scene.add(new THREE.HemisphereLight(0xffe8c8, 0x2a2018, 0.85));
const key = new THREE.DirectionalLight(0xfff0d0, 1.35);
key.position.set(3, 5, 2);
scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.35);
fill.position.set(-3, 2, -2);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(2.2, 32),
  new THREE.MeshStandardMaterial({ color: 0x2c2418, roughness: 0.92, metalness: 0.05 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
scene.add(floor);

const stage = new THREE.Group();
scene.add(stage);

const loader = new GLTFLoader();
const gltfCache = new Map();
let mode = 'item';
let loadToken = 0;
/** visual+raridade ou visual de monstro já desenhados. Trocar o nome não recarrega o GLTF. */
let shownKey = '';
/** Item custom em GLB real (não billboard) — gira lentamente. */
let liveItemRoot = null;

function resize() {
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
  const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 280;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  if (framedRoot && !userOrbit) frameInView(framedRoot);
}
new ResizeObserver(resize).observe(canvas.parentElement || document.body);
resize();

function clearStage() {
  liveItemRoot = null;
  controls.autoRotate = false;
  floor.visible = true;
  while (stage.children.length) {
    const child = stage.children[0];
    stage.remove(child);
    child.traverse((o) => {
      if (!o.isMesh) return;
      if (!o.userData.sharedGeometry) o.geometry?.dispose?.();
      if (!o.userData.disposeMaterial) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (o.userData.disposeMap) m?.map?.dispose?.();
        m?.dispose?.();
      }
    });
  }
}

/** Materiais/texturas do GLB sem override de raridade (raridade = outro asset depois). */
function prepareOriginalMaterials(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.sharedGeometry = true;
    o.userData.disposeMaterial = true;
    if (!o.material) return;
    o.material = Array.isArray(o.material)
      ? o.material.map((m) => m.clone())
      : o.material.clone();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (m.map) m.map.colorSpace = THREE.SRGBColorSpace;
      if (m.emissiveMap) m.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      // Mantém emissive do Blender (runas etc.); não aplica cor de raridade.
    }
  });
}

function setEmpty(show, text) {
  emptyEl.classList.toggle('hidden', !show);
  if (text) emptyEl.textContent = text;
}

async function loadGltf(url) {
  if (gltfCache.has(url)) return gltfCache.get(url);
  const gltf = await loader.loadAsync(url);
  gltfCache.set(url, gltf);
  return gltf;
}

function placeOnGround(root) {
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  root.position.set(-center.x, -box.min.y, -center.z);
  root.updateMatrixWorld(true);
}

function frameInView(root) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const aspect = Math.max(0.25, camera.aspect || 1);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const margin = 1.32;
  const halfH = Math.max(size.y, 0.04) * 0.5;
  const halfW = Math.max(size.x, size.z, 0.04) * 0.5;
  const dist = Math.max(halfH / Math.tan(vFov / 2), halfW / Math.tan(hFov / 2)) * margin;
  controls.target.copy(center);
  camera.position.set(center.x + dist * 0.22, center.y + halfH * 0.15, center.z + dist);
  camera.near = Math.max(0.01, dist / 80);
  camera.far = Math.max(40, dist * 14);
  controls.minDistance = Math.max(0.05, dist * 0.25);
  controls.maxDistance = dist * 5;
  camera.updateProjectionMatrix();
  controls.update();
  framedRoot = root;
  userOrbit = false;
}

async function showItem({ visual, rarity = 'common', name = '' } = {}) {
  const key = `item\0${visual || ''}\0${rarity}`;
  labelEl.textContent = name || visual || 'Item';
  if (key === shownKey) return;
  const token = ++loadToken;
  shownKey = '';
  clearStage();
  // Itens não usam o disco de chão — ele cortava o GLB / billboard.
  floor.visible = false;
  if (!visual || !canRenderItem3d(visual)) {
    if (token !== loadToken) return;
    shownKey = key;
    setEmpty(true, 'Sem modelo 3D para este item');
    return;
  }
  setEmpty(false);
  try {
    // Custom Blender (ex. elmo mago): GLB real + rotação lenta, cores originais.
    const modelUrl = shouldLiveSpin3d(visual) ? getStandaloneModelUrl(visual) : null;
    if (modelUrl) {
      const gltf = await loadGltf(modelUrl);
      if (token !== loadToken) return;
      const root = gltf.scene.clone(true);
      prepareOriginalMaterials(root);
      placeOnGround(root);
      if (token !== loadToken) return;
      stage.add(root);
      liveItemRoot = root;
      controls.autoRotate = true;
      frameInView(root);
      shownKey = key;
      return;
    }

    // Demais visuais: sprite billboard (pipeline do inventário).
    const url = await itemIcon3d(visual, rarity);
    if (token !== loadToken) return;
    if (!url) {
      setEmpty(true, 'Não foi possível renderizar este visual');
      return;
    }
    const tex = new THREE.TextureLoader().load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), mat);
    mesh.position.y = 0.85;
    mesh.userData.disposeMaterial = true;
    mesh.userData.disposeMap = true;
    if (token !== loadToken) {
      mesh.geometry?.dispose?.();
      mat.map?.dispose?.();
      mat.dispose();
      return;
    }
    stage.add(mesh);
    frameInView(mesh);
    shownKey = key;
  } catch {
    if (token !== loadToken) return;
    setEmpty(true, 'Falha ao carregar preview do item');
  }
}

async function showMonster({ visualId, name = '' } = {}) {
  const id = resolveMonsterVisualId({ visualId, name });
  const meta = getMonsterVisual(id) || getMonsterVisual(DEFAULT_MONSTER_VISUAL);
  const key = `monster\0${meta.id}`;
  labelEl.textContent = `${name || meta.label} · ${meta.id}`;
  if (key === shownKey) return;
  const token = ++loadToken;
  shownKey = '';
  clearStage();
  floor.visible = true;
  setEmpty(false);
  try {
    const gltf = await loadGltf(monsterModelUrl(meta.id));
    if (token !== loadToken) return;
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.sharedGeometry = true;
      o.userData.disposeMaterial = true;
      if (!o.material) return;
      o.material = Array.isArray(o.material) ? o.material.map((m) => m.clone()) : o.material.clone();
    });
    if (token !== loadToken) return;
    placeOnGround(root);
    stage.add(root);
    frameInView(root);
    shownKey = key;
  } catch {
    if (token !== loadToken) return;
    setEmpty(true, 'Falha ao carregar modelo do monstro');
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (data?.type === 'jogo-idle:admin-preview-frame') {
    if (framedRoot) frameInView(framedRoot);
    return;
  }
  if (data?.type !== 'jogo-idle:admin-preview') return;
  mode = data.mode === 'monster' ? 'monster' : 'item';
  if (mode === 'monster') {
    void showMonster(data.payload || {});
  } else {
    void showItem(data.payload || {});
  }
});

function loop() {
  requestAnimationFrame(loop);
  // Billboard estático: plano sempre de frente à câmera.
  // Item live (GLB custom): OrbitControls.autoRotate cuida da volta lenta.
  if (!liveItemRoot) {
    for (const child of stage.children) {
      if (child.isMesh && child.material?.map) child.quaternion.copy(camera.quaternion);
    }
  }
  controls.update();
  renderer.render(scene, camera);
}
loop();

window.parent?.postMessage({ type: 'jogo-idle:admin-preview-ready' }, window.location.origin);
