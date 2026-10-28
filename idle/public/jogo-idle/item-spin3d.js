/**
 * Preview 3D ao vivo com rotação lenta para ícones `custom_*`
 * (inventário + equipamento). Um WebGL compartilhado; cada slot
 * recebe um <canvas class="item-3d"> atualizado por frame.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { getStandaloneModelUrl, shouldLiveSpin3d } from './item-icon3d.js';

export { shouldLiveSpin3d };

const SIZE = 128;
/** ~1 volta a cada ~14s */
const SPIN_RAD_PER_SEC = 0.45;

const gltfCache = new Map();
const views = new Map();
const disposeByHost = new WeakMap();

let renderer = null;
let scene = null;
let camera = null;
let loader = null;
let raf = 0;
let lastTs = 0;

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
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  key.position.set(2.4, 3.6, 2.6);
  scene.add(key);
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
  const gltf = await loader.loadAsync(url);
  gltfCache.set(url, gltf);
  return gltf;
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

/** Clona a malha preservando cores/texturas do asset (sem tint de raridade). */
function extractStatic(source) {
  source.updateWorldMatrix(true, true);
  const group = new THREE.Group();
  source.traverse((m) => {
    if (!m.isMesh || !m.geometry) return;
    const geom = m.geometry.clone();
    geom.applyMatrix4(m.matrixWorld);
    const mat = Array.isArray(m.material)
      ? m.material.map((x) => x.clone())
      : m.material.clone();
    const mats = Array.isArray(mat) ? mat : [mat];
    for (const material of mats) {
      if (material.map) material.map.colorSpace = THREE.SRGBColorSpace;
      if (material.emissiveMap) material.emissiveMap.colorSpace = THREE.SRGBColorSpace;
      // Sem tint de raridade — cor/emissive como no Blender.
    }
    group.add(new THREE.Mesh(geom, Array.isArray(mat) ? mats : mats[0]));
  });
  const box = new THREE.Box3().setFromObject(group);
  const center = box.getCenter(new THREE.Vector3());
  group.position.sub(center);
  return group;
}

function disposeGroup(group) {
  group.traverse((m) => {
    if (!m.isMesh) return;
    m.geometry?.dispose?.();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const material of mats) material?.dispose?.();
  });
}

async function getRoot(visual) {
  const url = getStandaloneModelUrl(visual);
  if (!url) return null;
  const gltf = await loadGltfUrl(url);
  // extractStatic clona geom/mat por view — seguro para dispose no unmount.
  return extractStatic(gltf.scene);
}

function stopLoop() {
  if (!raf) return;
  cancelAnimationFrame(raf);
  raf = 0;
  lastTs = 0;
}

function tick(ts) {
  raf = requestAnimationFrame(tick);
  if (!views.size) {
    stopLoop();
    return;
  }
  const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
  lastTs = ts;
  ensureRenderer();

  for (const view of views.values()) {
    if (!view.root || !view.canvas.isConnected) continue;
    view.yaw += SPIN_RAD_PER_SEC * dt;
    view.root.rotation.y = view.yaw;
    scene.add(view.root);
    fitCamera(view.root);
    renderer.render(scene, camera);
    scene.remove(view.root);
    const ctx = view.canvas.getContext('2d');
    if (!ctx) continue;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(renderer.domElement, 0, 0);
  }
}

function startLoop() {
  if (raf) return;
  raf = requestAnimationFrame(tick);
}

function unmountHost(hostEl) {
  const prev = disposeByHost.get(hostEl);
  if (prev) {
    prev();
    disposeByHost.delete(hostEl);
  }
}

/**
 * Substitui o ícone SVG/img por canvas 3D girando.
 * Retorna dispose(); também limpa mounts anteriores no mesmo host.
 */
export function mountItemSpin3d(hostEl, { visual, token } = {}) {
  unmountHost(hostEl);
  if (!hostEl || !shouldLiveSpin3d(visual)) return null;

  const canvas = document.createElement('canvas');
  canvas.className = 'item-3d item-3d--spin';
  canvas.width = SIZE;
  canvas.height = SIZE;
  canvas.setAttribute('aria-hidden', 'true');

  const svg = hostEl.querySelector('svg');
  const img = hostEl.querySelector('img.item-3d');
  if (svg) svg.replaceWith(canvas);
  else if (img) img.replaceWith(canvas);
  else hostEl.insertBefore(canvas, hostEl.firstChild);

  const view = {
    canvas,
    visual,
    token,
    root: null,
    yaw: Math.random() * Math.PI * 2,
  };
  views.set(canvas, view);
  startLoop();

  let cancelled = false;
  void getRoot(visual)
    .then((root) => {
      if (cancelled || !canvas.isConnected || hostEl.dataset.iconToken !== String(token)) {
        if (root) disposeGroup(root);
        return;
      }
      if (!root) {
        console.warn('[jogo-idle] item spin3d: sem malha', visual);
        return;
      }
      view.root = root;
    })
    .catch((err) => {
      console.warn('[jogo-idle] item spin3d', visual, err);
    });

  const dispose = () => {
    cancelled = true;
    views.delete(canvas);
    if (view.root) {
      disposeGroup(view.root);
      view.root = null;
    }
    canvas.remove();
    if (!views.size) stopLoop();
  };
  disposeByHost.set(hostEl, dispose);
  return dispose;
}

/** Remove mount 3D ao vivo do host (ex. antes de re-render do slot). */
export function disposeItemSpin3d(hostEl) {
  unmountHost(hostEl);
}
