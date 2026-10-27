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
scene.background = new THREE.Color(0x1a1510);

const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 40);
camera.position.set(1.6, 1.4, 2.4);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.autoRotate = false;
controls.autoRotateSpeed = 1.15;
controls.target.set(0, 0.7, 0);
controls.minDistance = 0.8;
controls.maxDistance = 8;

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
/** Item custom em GLB real (não billboard) — gira lentamente. */
let liveItemRoot = null;

function resize() {
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 320;
  const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 280;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
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
      if (o.isMesh) {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m?.dispose?.();
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

function fitObject(root, targetSize = 1.6, { clearance = 0.04 } = {}) {
  // Reset antes de medir — evita acumular scale/posição em reloads.
  root.scale.setScalar(1);
  root.position.set(0, 0, 0);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = targetSize / maxDim;
  root.scale.setScalar(scale);
  root.position.set(-center.x * scale, -box.min.y * scale + clearance, -center.z * scale);
}

function frameLiveItem(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.4);
  controls.target.copy(center);
  camera.position.set(center.x + maxDim * 1.05, center.y + maxDim * 0.45, center.z + maxDim * 1.45);
  controls.update();
}

async function showItem({ visual, rarity = 'common', name = '' } = {}) {
  const token = ++loadToken;
  clearStage();
  // Itens não usam o disco de chão — ele cortava o GLB / billboard.
  floor.visible = false;
  labelEl.textContent = name || visual || 'Item';
  if (!visual || !canRenderItem3d(visual)) {
    setEmpty(true, 'Sem visual 3D — escolha um visual no formulário');
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
      fitObject(root, 1.55, { clearance: 0.06 });
      stage.add(root);
      liveItemRoot = root;
      controls.autoRotate = true;
      frameLiveItem(root);
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
    stage.add(mesh);
    controls.target.set(0, 0.85, 0);
    camera.position.set(0, 1.1, 2.2);
  } catch {
    if (token !== loadToken) return;
    setEmpty(true, 'Falha ao carregar preview do item');
  }
}

async function showMonster({ visualId, name = '' } = {}) {
  const token = ++loadToken;
  clearStage();
  floor.visible = true;
  const id = resolveMonsterVisualId({ visualId, name });
  const meta = getMonsterVisual(id) || getMonsterVisual(DEFAULT_MONSTER_VISUAL);
  labelEl.textContent = `${name || meta.label} · ${meta.id}`;
  setEmpty(false);
  try {
    const gltf = await loadGltf(monsterModelUrl(id));
    if (token !== loadToken) return;
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    fitObject(root, 1.85);
    stage.add(root);
    controls.target.set(0, 0.9, 0);
    camera.position.set(1.8, 1.5, 2.6);
  } catch {
    if (token !== loadToken) return;
    setEmpty(true, 'Falha ao carregar modelo do monstro');
  }
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (data?.type !== 'sinergia-idle:admin-preview') return;
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

window.parent?.postMessage({ type: 'sinergia-idle:admin-preview-ready' }, window.location.origin);
