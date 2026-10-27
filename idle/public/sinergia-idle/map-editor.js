/**
 * Preview 3D do editor de mapa admin — bioma estável + decorações com raycast.
 * Ferramentas: navigate | select | place (brush só arma ao escolher na paleta).
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  preloadKayKitProps,
  buildKayKitZone,
  spawnKayKitDecoration,
  preloadDecorationPacks,
  extractKayKitPlacements,
  zonePropSeed,
} from './kaykit-props.js';
import {
  HERO_X,
  MONSTER_X,
  PET_X,
  PET_Z,
  CAM_HOME,
  CAM_TARGET,
  CAM_FOV,
} from './admin-studio/arena-layout.js';

/** Alinhado a lib/sinergia-idle/game/zone-scene.ts (biomas densos como floresta). */
const MAX_DECOS = 160;

const canvas = document.getElementById('view');
const hintEl = document.getElementById('hint');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b1220);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 80);
camera.position.set(8, 10, 12);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = Math.PI * 0.48;

const hemi = new THREE.HemisphereLight(0x9fc8a8, 0x1a2414, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0c8, 1.4);
sun.position.set(6, 12, 4);
scene.add(sun);

const ground = new THREE.Mesh(
  new THREE.CircleGeometry(14, 48),
  new THREE.MeshStandardMaterial({ color: 0x2c4226, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.name = '__ground';
scene.add(ground);

let zoneGroup = new THREE.Group();
scene.add(zoneGroup);
let decoGroup = new THREE.Group();
scene.add(decoGroup);

const overlayGroup = new THREE.Group();
overlayGroup.name = '__overlays';
scene.add(overlayGroup);

let decorations = [];
let brush = { pack: 'nature', key: 'treeA', scale: 1 };
let brushArmed = false;
/** @type {'navigate'|'select'|'place'} */
let tool = 'navigate';
let selectedIndex = -1;
let dragging = false;
let lastZoneId = '';
let lastPropsKind = '';
let lastDensity = null;
let showPlayCamera = false;
let playCamHelper = null;
let playCamGhost = null;
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const decoMeshes = [];

function makePad(color, label, x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0.02, z);
  const pad = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      roughness: 0.8,
      metalness: 0.1,
    }),
  );
  pad.rotation.x = -Math.PI / 2;
  g.add(pad);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.2, 8),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25 }),
  );
  pole.position.y = 0.6;
  g.add(pole);
  g.userData.label = label;
  return g;
}

function buildOverlays() {
  while (overlayGroup.children.length) overlayGroup.remove(overlayGroup.children[0]);
  overlayGroup.add(makePad(0x3b82f6, 'Hero', HERO_X, 0));
  overlayGroup.add(makePad(0xef4444, 'Monster', MONSTER_X, 0));
  overlayGroup.add(makePad(0x22c55e, 'Pet', PET_X, PET_Z));
}

buildOverlays();

function updateHint() {
  if (!hintEl) return;
  if (tool === 'navigate') {
    hintEl.textContent = 'Navegar — orbite/zoom · props não são colocados';
  } else if (tool === 'select') {
    hintEl.textContent = 'Selecionar — clique prop · arraste · Q/E rotaciona · Delete remove';
  } else {
    hintEl.textContent = brushArmed
      ? `Colocar — clique no chão (${brush.pack}/${brush.key})`
      : 'Colocar — escolha um prop na paleta para armar o pincel';
  }
}

function ensurePlayCameraHelpers() {
  if (!playCamGhost) {
    playCamGhost = new THREE.PerspectiveCamera(CAM_FOV, 1.4, 0.2, 18);
    playCamGhost.position.set(CAM_HOME.x, CAM_HOME.y, CAM_HOME.z);
    playCamGhost.lookAt(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
    playCamHelper = new THREE.CameraHelper(playCamGhost);
    playCamHelper.visible = false;
    scene.add(playCamHelper);
  }
  playCamGhost.aspect = camera.aspect;
  playCamGhost.updateProjectionMatrix();
  playCamHelper.update();
}

function setShowPlayCamera(on) {
  showPlayCamera = Boolean(on);
  ensurePlayCameraHelpers();
  playCamHelper.visible = showPlayCamera;
}

function snapToPlayCamera() {
  camera.position.set(CAM_HOME.x, CAM_HOME.y, CAM_HOME.z);
  controls.target.set(CAM_TARGET.x, CAM_TARGET.y, CAM_TARGET.z);
  camera.fov = CAM_FOV;
  camera.updateProjectionMatrix();
  controls.update();
}

function setTool(next) {
  tool = next === 'select' || next === 'place' ? next : 'navigate';
  if (tool !== 'select') {
    dragging = false;
    controls.enabled = true;
  }
  if (tool !== 'place') brushArmed = false;
  updateHint();
  window.parent?.postMessage(
    { type: 'sinergia-idle:map-editor-tool', tool, brushArmed },
    window.location.origin,
  );
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function resize() {
  const w = canvas.clientWidth || canvas.parentElement?.clientWidth || 640;
  const h = canvas.clientHeight || canvas.parentElement?.clientHeight || 360;
  renderer.setSize(w, h, false);
  camera.aspect = w / Math.max(1, h);
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement || document.body);
resize();

function postDecorations() {
  window.parent?.postMessage(
    {
      type: 'sinergia-idle:map-editor-decorations',
      decorations: decorations.map((d) => ({ ...d })),
      selectedIndex,
    },
    window.location.origin,
  );
}

function postSelection() {
  window.parent?.postMessage(
    { type: 'sinergia-idle:map-editor-selection', selectedIndex },
    window.location.origin,
  );
}

function postBaked(propsKind) {
  window.parent?.postMessage(
    {
      type: 'sinergia-idle:map-editor-baked',
      props: propsKind,
      decorations: decorations.map((d) => ({ ...d })),
      selectedIndex,
    },
    window.location.origin,
  );
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((o) => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m?.dispose?.();
      }
    });
  }
}

function rebuildDecorations() {
  const keep = selectedIndex;
  clearGroup(decoGroup);
  decoMeshes.length = 0;
  for (let i = 0; i < decorations.length; i++) {
    const d = decorations[i];
    const obj = spawnKayKitDecoration(d.pack, d.key, d);
    if (!obj) continue;
    obj.userData.decoIndex = i;
    obj.traverse((o) => {
      o.userData.decoIndex = i;
    });
    decoGroup.add(obj);
    decoMeshes.push(obj);
    if (i === keep) {
      obj.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material = o.material.clone();
          if (o.material.emissive) {
            o.material.emissive.setHex(0xf59e0b);
            o.material.emissiveIntensity = 0.45;
          }
        }
      });
    }
  }
  selectedIndex = keep >= 0 && keep < decorations.length ? keep : -1;
}

function applyThemeColors(sceneCfg) {
  if (sceneCfg.bg != null) scene.background = new THREE.Color(sceneCfg.bg);
  if (sceneCfg.ground != null) ground.material.color.setHex(sceneCfg.ground);
  if (sceneCfg.hemiSky != null) hemi.color.setHex(sceneCfg.hemiSky);
  if (sceneCfg.sunColor != null) sun.color.setHex(sceneCfg.sunColor);
}

async function rebuildZone(zoneId, propsKind, density) {
  await preloadKayKitProps(propsKind);
  clearGroup(zoneGroup);
  const seed = mulberry32(zonePropSeed(zoneId, propsKind, density));
  const built = buildKayKitZone(propsKind, seed, { density });
  zoneGroup.add(built);
  lastZoneId = zoneId || '';
  lastPropsKind = propsKind;
  lastDensity = density;
}

async function applyMessage(data) {
  if (data.tool) setTool(data.tool);
  if (data.brushArmed != null) {
    brushArmed = Boolean(data.brushArmed);
    updateHint();
  }
  if (data.brush) {
    brush = {
      pack: data.brush.pack || brush.pack,
      key: data.brush.key || brush.key,
      scale: Number(data.brush.scale) || 1,
    };
  }
  if (data.showPlayCamera != null) setShowPlayCamera(data.showPlayCamera);

  const mode = data.mode === 'theme' ? 'theme' : data.mode === 'brush' ? 'brush' : 'full';
  if (mode === 'brush') {
    updateHint();
    return;
  }

  const sceneCfg = data.scene || {};
  applyThemeColors(sceneCfg);

  const propsKind = sceneCfg.props || 'ruins';
  const density = Math.max(0.5, Math.min(2, Number(sceneCfg.propDensity) || 1));
  const zoneId = data.zoneId || lastZoneId;
  const zoneChanged =
    zoneId !== lastZoneId || propsKind !== lastPropsKind || density !== lastDensity;

  if (zoneChanged || mode === 'full') {
    await rebuildZone(zoneId, propsKind, density);
  }

  if (mode === 'full' && Array.isArray(sceneCfg.decorations)) {
    decorations = sceneCfg.decorations.slice(0, MAX_DECOS);
    if (decorations.length) await preloadDecorationPacks(decorations);
    selectedIndex = -1;
    rebuildDecorations();
    postSelection();
  }
}

function setPointerFromEvent(event) {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
}

function groundHit(event) {
  setPointerFromEvent(event);
  const hits = raycaster.intersectObject(ground);
  return hits[0] || null;
}

function pickDecoration(event) {
  setPointerFromEvent(event);
  const hits = raycaster.intersectObjects(decoMeshes, true);
  if (!hits.length) return -1;
  let obj = hits[0].object;
  while (obj && obj.userData.decoIndex == null) obj = obj.parent;
  return obj?.userData.decoIndex ?? -1;
}

/** Raiz de um prop do bioma procedural (com userData.kaykit). */
function pickBiomeRoot(event) {
  if (!zoneGroup || lastPropsKind === 'bare') return null;
  setPointerFromEvent(event);
  const hits = raycaster.intersectObject(zoneGroup, true);
  if (!hits.length) return null;
  let obj = hits[0].object;
  while (obj && obj !== zoneGroup && !obj.userData?.kaykit) obj = obj.parent;
  if (!obj?.userData?.kaykit) return null;
  return obj;
}

function nearestDecorationIndex(x, z) {
  let best = -1;
  let bestD = Infinity;
  for (let i = 0; i < decorations.length; i++) {
    const d = decorations[i];
    const dx = (d.x || 0) - x;
    const dz = (d.z || 0) - z;
    const dist = dx * dx + dz * dz;
    if (dist < bestD) {
      bestD = dist;
      best = i;
    }
  }
  return best;
}

/**
 * Assa paredes/escadas/etc. do bioma em decorações editáveis e troca props → bare.
 */
async function bakeBiome({ selectAt = null } = {}) {
  if (lastPropsKind === 'bare') return false;
  const extracted = extractKayKitPlacements(zoneGroup);
  if (!extracted.length) return false;

  const room = Math.max(0, MAX_DECOS - decorations.length);
  const take = extracted.slice(0, room);
  if (!take.length) {
    window.parent?.postMessage(
      {
        type: 'sinergia-idle:map-editor-toast',
        message: `Limite de ${MAX_DECOS} decorações atingido — remova algumas antes de editar o bioma`,
      },
      window.location.origin,
    );
    return false;
  }

  const density = lastDensity ?? 1;
  const zoneId = lastZoneId;
  await preloadDecorationPacks(take);
  decorations = [...decorations, ...take].slice(0, MAX_DECOS);
  await rebuildZone(zoneId, 'bare', density);
  if (selectAt) {
    selectedIndex = nearestDecorationIndex(selectAt.x, selectAt.z);
  } else {
    selectedIndex = decorations.length ? decorations.length - take.length : -1;
  }
  rebuildDecorations();
  postBaked('bare');
  postSelection();
  return true;
}

function selectDecoration(idx) {
  selectedIndex = idx;
  rebuildDecorations();
  postSelection();
}

function removeSelected() {
  if (selectedIndex < 0) return;
  decorations.splice(selectedIndex, 1);
  selectedIndex = -1;
  rebuildDecorations();
  postDecorations();
  postSelection();
}

canvas.addEventListener('pointerdown', async (event) => {
  if (event.button !== 0) return;
  canvas.focus?.();

  if (tool === 'navigate') {
    // OrbitControls cuida do drag; não seleciona/coloca.
    return;
  }

  if (tool === 'select') {
    const decoIdx = pickDecoration(event);
    if (decoIdx >= 0) {
      selectDecoration(decoIdx);
      dragging = true;
      controls.enabled = false;
      canvas.setPointerCapture?.(event.pointerId);
      return;
    }
    const biomeRoot = pickBiomeRoot(event);
    if (biomeRoot) {
      const at = { x: biomeRoot.position.x, z: biomeRoot.position.z };
      const ok = await bakeBiome({ selectAt: at });
      if (ok && selectedIndex >= 0) {
        setTool('select');
      }
      return;
    }
    selectedIndex = -1;
    rebuildDecorations();
    postSelection();
    return;
  }

  // tool === 'place'
  if (!brushArmed) {
    window.parent?.postMessage(
      {
        type: 'sinergia-idle:map-editor-toast',
        message: 'Escolha um prop na paleta para armar o pincel',
      },
      window.location.origin,
    );
    return;
  }
  const hit = groundHit(event);
  if (!hit) return;
  await preloadDecorationPacks([{ pack: brush.pack }]);
  if (decorations.length >= MAX_DECOS) {
    window.parent?.postMessage(
      {
        type: 'sinergia-idle:map-editor-toast',
        message: `Limite de ${MAX_DECOS} decorações`,
      },
      window.location.origin,
    );
    return;
  }
  decorations.push({
    pack: brush.pack,
    key: brush.key,
    x: hit.point.x,
    z: hit.point.z,
    scale: brush.scale || 1,
    rotY: 0,
  });
  selectedIndex = -1;
  brushArmed = false;
  rebuildDecorations();
  postDecorations();
  postSelection();
  setTool('select');
  window.parent?.postMessage(
    { type: 'sinergia-idle:map-editor-tool', tool: 'select', brushArmed: false },
    window.location.origin,
  );
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragging || selectedIndex < 0) return;
  const hit = groundHit(event);
  if (!hit) return;
  const d = decorations[selectedIndex];
  if (!d) return;
  d.x = hit.point.x;
  d.z = hit.point.z;
  const mesh = decoMeshes[selectedIndex];
  if (mesh) {
    mesh.position.x = d.x;
    mesh.position.z = d.z;
  }
});

function endDrag(event) {
  if (!dragging) return;
  dragging = false;
  controls.enabled = true;
  try {
    if (event?.pointerId != null) canvas.releasePointerCapture?.(event.pointerId);
  } catch {
    /* ignore */
  }
  postDecorations();
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);

function rotateSelected(delta) {
  if (selectedIndex < 0) return;
  const d = decorations[selectedIndex];
  if (!d) return;
  d.rotY = (Number(d.rotY) || 0) + delta;
  const mesh = decoMeshes[selectedIndex];
  if (mesh) mesh.rotation.y = d.rotY;
  postDecorations();
}

function setSelectedRotY(rotY) {
  if (selectedIndex < 0) return;
  const d = decorations[selectedIndex];
  if (!d) return;
  d.rotY = Number(rotY) || 0;
  const mesh = decoMeshes[selectedIndex];
  if (mesh) mesh.rotation.y = d.rotY;
  postDecorations();
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    removeSelected();
  }
  if (event.key === 'Escape') {
    selectedIndex = -1;
    brushArmed = false;
    setTool('navigate');
    rebuildDecorations();
    postSelection();
  }
  if (event.key === 'q' || event.key === 'Q') {
    event.preventDefault();
    rotateSelected(-Math.PI / 12);
  }
  if (event.key === 'e' || event.key === 'E') {
    event.preventDefault();
    rotateSelected(Math.PI / 12);
  }
  if (event.key === '1') setTool('navigate');
  if (event.key === '2') setTool('select');
  if (event.key === '3') setTool('place');
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (data?.type === 'sinergia-idle:map-editor-command') {
    if (data.command === 'delete-selected') removeSelected();
    if (data.command === 'bake-biome') void bakeBiome();
    if (data.command === 'clear-selection') {
      selectedIndex = -1;
      rebuildDecorations();
      postSelection();
    }
    if (data.command === 'set-tool') setTool(data.tool);
    if (data.command === 'arm-brush') {
      if (data.brush) {
        brush = {
          pack: data.brush.pack || brush.pack,
          key: data.brush.key || brush.key,
          scale: Number(data.brush.scale) || 1,
        };
      }
      brushArmed = true;
      setTool('place');
    }
    if (data.command === 'disarm-brush') {
      brushArmed = false;
      updateHint();
    }
    if (data.command === 'set-rotY') setSelectedRotY(data.rotY);
    if (data.command === 'snap-play-camera') snapToPlayCamera();
    if (data.command === 'toggle-play-camera') setShowPlayCamera(!showPlayCamera);
    if (data.command === 'set-play-camera') setShowPlayCamera(Boolean(data.enabled));
    return;
  }
  if (data?.type !== 'sinergia-idle:map-editor') return;
  void applyMessage(data);
});

function loop() {
  requestAnimationFrame(loop);
  if (showPlayCamera) ensurePlayCameraHelpers();
  controls.update();
  renderer.render(scene, camera);
}
loop();
updateHint();

window.parent?.postMessage({ type: 'sinergia-idle:map-editor-ready' }, window.location.origin);
