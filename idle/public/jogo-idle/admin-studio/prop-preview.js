/**
 * Uma cena só, para o asset escolhido na biblioteca.
 * Usa o mesmo loader de kaykit-props.js. Não lista o catálogo.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { preloadDecorationPacks, spawnKayKitDecoration } from '../kaykit-props.js';

const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 80);
camera.position.set(1.6, 1.1, 2.2);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0.2, 0);

scene.add(new THREE.HemisphereLight(0xfff4d0, 0x1a2a3a, 1.1));
const sun = new THREE.DirectionalLight(0xfff0c8, 1.4);
sun.position.set(2, 4, 3);
scene.add(sun);

const holder = new THREE.Group();
scene.add(holder);
let token = 0;
let framed = null;
let userOrbit = false;
controls.addEventListener('start', () => { userOrbit = true; });

function resize() {
  const w = canvas.clientWidth || 280;
  const h = canvas.clientHeight || 160;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
  if (framed && !userOrbit) frameObject(framed);
}
new ResizeObserver(resize).observe(canvas.parentElement || document.body);
resize();

function clearHolder() {
  while (holder.children.length) {
    const child = holder.children[0];
    holder.remove(child);
    child.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of mats) material.dispose?.();
    });
  }
}

function frameObject(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  obj.position.sub(center);
  obj.updateMatrixWorld(true);
  const placed = new THREE.Box3().setFromObject(obj);
  const placedSize = placed.getSize(new THREE.Vector3());
  const placedCenter = placed.getCenter(new THREE.Vector3());
  const aspect = Math.max(0.25, camera.aspect || 1);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const margin = 1.35;
  const halfH = Math.max(placedSize.y, 0.04) * 0.5;
  const halfW = Math.max(placedSize.x, placedSize.z, size.x, 0.04) * 0.5;
  const dist = Math.max(halfH / Math.tan(vFov / 2), halfW / Math.tan(hFov / 2)) * margin;
  controls.target.copy(placedCenter);
  camera.position.set(placedCenter.x + dist * 0.3, placedCenter.y + halfH * 0.2, placedCenter.z + dist);
  camera.near = Math.max(0.01, dist / 80);
  camera.far = Math.max(20, dist * 16);
  controls.minDistance = dist * 0.3;
  controls.maxDistance = dist * 5;
  camera.updateProjectionMatrix();
  controls.update();
  framed = obj;
  userOrbit = false;
}

async function show(pack, key, scale) {
  const current = ++token;
  clearHolder();
  await preloadDecorationPacks([{ pack, key }]);
  if (current !== token) return;
  const obj = spawnKayKitDecoration(pack, key, { scale: scale || 1, x: 0, y: 0, z: 0 });
  if (!obj || current !== token) {
    window.parent?.postMessage(
      { type: 'jogo-idle:prop-preview-error', pack, key },
      window.location.origin,
    );
    return;
  }
  holder.add(obj);
  frameObject(obj);
  framed = obj;
}

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (data?.type !== 'jogo-idle:prop-preview') return;
  if (!data.pack || !data.key) return;
  void show(data.pack, data.key, Number(data.scale) || 1);
});

function loop() {
  requestAnimationFrame(loop);
  controls.update();
  renderer.render(scene, camera);
}
loop();

window.parent?.postMessage({ type: 'jogo-idle:prop-preview-ready' }, window.location.origin);
