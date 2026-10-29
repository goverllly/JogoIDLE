/**
 * Preview 3D do editor de mapa admin — bioma estável + decorações com raycast.
 * Ferramentas: navigate | select | move | rotate | scale | place.
 * Atalhos: 1 navegar, 2 selecionar, 3 inserir, 4 mover, 5 girar, 6 escalar,
 * Q/E giram, Delete exclui, Ctrl/Cmd+D duplica, Ctrl/Cmd+Z desfaz (no React),
 * G grade, F enquadra a seleção, Shift+F enquadra o cenário, Escape cancela.
 * Gizmos não existem no runtime do jogo.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createEditorGizmo } from './admin-studio/map-gizmo.js';
import {
  preloadKayKitProps,
  buildKayKitZone,
  spawnKayKitDecoration,
  preloadDecorationPacks,
  extractKayKitPlacements,
  zonePropSeed,
} from './kaykit-props.js';
import { layerForDecoration, manualsVisibleInPlay } from './zone-compose.js';
import {
  HERO_X,
  MONSTER_X,
  PET_X,
  PET_Z,
  CAM_HOME,
  CAM_TARGET,
  CAM_FOV,
} from './admin-studio/arena-layout.js';

/** Alinhado a lib/jogo-idle/game/zone-scene.ts (biomas densos como floresta). */
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
const previewGroup = new THREE.Group();
previewGroup.name = 'prop-preview';
scene.add(previewGroup);
let previewToken = 0;

const overlayGroup = new THREE.Group();
overlayGroup.name = '__overlays';
scene.add(overlayGroup);

let decorations = [];
let brush = { pack: 'nature', key: 'treeA', scale: 1 };
let brushArmed = false;
/** @type {'navigate'|'select'|'move'|'rotate'|'scale'|'place'} */
let tool = 'navigate';
let selectedIndex = -1;
let editorEpoch = 0;
let editorSeq = 1;
let snapEnabled = false;
let posStep = 1;
let rotStepDeg = 15;
let scaleStep = 0.1;
let gridOn = false;
let grid = null;
/** @type {null | { part: string, x: number, z: number, rotY: number, scale: number, hitX: number, hitZ: number, angle: number, dist: number }} */
let gesture = null;
let liveFrame = 0;
let lastZoneId = '';
let lastPropsKind = '';
let lastDensity = null;
let lastVariant = '';
let decorationMode = null;
const hiddenLayers = new Set();
const lockedLayers = new Set();
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

const gizmo = createEditorGizmo();
scene.add(gizmo.root);
const selectionBox = new THREE.BoxHelper(ground, 0xf4d6a0);
selectionBox.visible = false;
if (!Array.isArray(selectionBox.material)) selectionBox.material.depthTest = false;
selectionBox.renderOrder = 999;
scene.add(selectionBox);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function snapTo(value, step, enabled = snapEnabled) {
  if (!enabled || !step) return value;
  return Math.round(value / step) * step;
}

function nextEditorId() {
  editorSeq += 1;
  return `ed${editorSeq.toString(36)}`;
}

function ensureEditorId(item) {
  if (!item.editorId) item.editorId = nextEditorId();
  return item;
}

function selectedId() {
  return selectedIndex >= 0 ? decorations[selectedIndex]?.editorId || null : null;
}

function rebuildGrid() {
  if (grid) {
    scene.remove(grid);
    grid.geometry?.dispose?.();
    const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const material of mats) material?.dispose?.();
  }
  const divisions = Math.max(2, Math.round(28 / (posStep || 1)));
  grid = new THREE.GridHelper(28, divisions, 0xd6aa50, 0x2a4a38);
  grid.position.y = 0.03;
  grid.visible = gridOn;
  grid.traverse((node) => {
    node.raycast = () => {};
  });
  scene.add(grid);
}

rebuildGrid();

function refreshGizmo() {
  gizmo.setMode(tool);
  const mesh = selectedIndex >= 0 ? decoMeshes[selectedIndex] : null;
  const blocked = selectedIndex >= 0 && layerLocked(decorations[selectedIndex]);
  gizmo.attach(mesh && mesh.visible && !blocked ? mesh : null);
}

function layerLocked(decoration) {
  return Boolean(decoration) && lockedLayers.has(layerForDecoration(decoration));
}

function applyDecorationVisibility() {
  const play = manualsVisibleInPlay(lastPropsKind, decorationMode);
  for (let i = 0; i < decorations.length; i++) {
    const mesh = decoMeshes[i];
    if (!mesh) continue;
    const layer = layerForDecoration(decorations[i]);
    mesh.visible = play && !hiddenLayers.has(layer);
  }
  refreshGizmo();
}

function updateHint() {
  if (!hintEl) return;
  const snapNote = snapEnabled ? ` · snap ${posStep}` : '';
  if (tool === 'navigate') hintEl.textContent = `Navegar — orbite e zoom${snapNote}`;
  else if (tool === 'select') hintEl.textContent = `Selecionar — clique, arraste no chão, Q/E gira${snapNote}`;
  else if (tool === 'move') hintEl.textContent = `Mover — setas X/Z ou o plano${snapNote}`;
  else if (tool === 'rotate') hintEl.textContent = `Rotacionar — anel dourado ou Q/E${snapNote}`;
  else if (tool === 'scale') hintEl.textContent = `Escalar — alça uniforme${snapNote}`;
  else {
    hintEl.textContent = brushArmed
      ? `Inserir — clique no chão (${brush.pack}/${brush.key})`
      : 'Inserir — escolha um asset e clique no chão';
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

const TOOLS = ['navigate', 'select', 'move', 'rotate', 'scale', 'place'];

function stopLive() {
  if (!liveFrame) return;
  cancelAnimationFrame(liveFrame);
  liveFrame = 0;
}

/** Abandona o gesto sem devolver a transformação e sem avisar o React. */
function abortGesture() {
  stopLive();
  gesture = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}

function setTool(next, notify = true) {
  tool = TOOLS.includes(next) ? next : 'navigate';
  if (gesture) cancelGesture();
  controls.enabled = true;
  if (tool !== 'place') {
    brushArmed = false;
    clearPreview();
  }
  refreshGizmo();
  updateHint();
  if (!notify) return;
  window.parent?.postMessage(
    { type: 'jogo-idle:map-editor-tool', tool, brushArmed, epoch: editorEpoch, zoneId: lastZoneId },
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

function postDecorations(commit) {
  window.parent?.postMessage(
    {
      type: 'jogo-idle:map-editor-decorations',
      decorations: decorations.map((d) => ({ ...d })),
      selectedIndex,
      selectedId: selectedId(),
      commit: Boolean(commit),
      epoch: editorEpoch,
      zoneId: lastZoneId,
    },
    window.location.origin,
  );
}

function postLive() {
  if (liveFrame) return;
  liveFrame = requestAnimationFrame(() => {
    liveFrame = 0;
    postDecorations(false);
  });
}

function postSelection() {
  window.parent?.postMessage(
    {
      type: 'jogo-idle:map-editor-selection',
      selectedIndex,
      selectedId: selectedId(),
      epoch: editorEpoch,
      zoneId: lastZoneId,
    },
    window.location.origin,
  );
}

function postShortcut(action) {
  window.parent?.postMessage(
    { type: 'jogo-idle:map-editor-shortcut', action, epoch: editorEpoch, zoneId: lastZoneId },
    window.location.origin,
  );
}

function postBaked(propsKind) {
  window.parent?.postMessage(
    {
      type: 'jogo-idle:map-editor-baked',
      props: propsKind,
      decorations: decorations.map((d) => ({ ...d })),
      selectedIndex,
      selectedId: selectedId(),
      epoch: editorEpoch,
      zoneId: lastZoneId,
    },
    window.location.origin,
  );
}

function detachPreview(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((node) => {
      if (!node.isMesh || !node.material) return;
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of mats) material.dispose?.();
    });
  }
}

function clearPreview() {
  previewToken += 1;
  detachPreview(previewGroup);
}

async function showPropPreview(pack, key, scale) {
  const token = ++previewToken;
  detachPreview(previewGroup);
  await preloadDecorationPacks([{ pack, key }]);
  if (token !== previewToken) return;
  const obj = spawnKayKitDecoration(pack, key, { scale, x: 0, y: 0, z: 0 });
  if (!obj || token !== previewToken) {
    if (token === previewToken) {
      window.parent?.postMessage(
        { type: 'jogo-idle:map-editor-toast', message: `Não foi possível pré-visualizar ${pack}/${key}` },
        window.location.origin,
      );
    }
    return;
  }
  obj.position.set(11, 0, 6);
  obj.traverse((node) => {
    node.raycast = () => {};
  });
  previewGroup.add(obj);
}

function clearGroup(group) {
  while (group.children.length) {
    const child = group.children[0];
    group.remove(child);
    child.traverse((o) => {
      if (o.isMesh) {
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) m?.dispose?.();
      }
    });
  }
}

function rebuildDecorations() {
  clearGroup(decoGroup);
  decoMeshes.length = 0;
  for (let i = 0; i < decorations.length; i++) {
    const d = decorations[i];
    ensureEditorId(d);
    const obj = spawnKayKitDecoration(d.pack, d.key, d);
    if (!obj) {
      decoMeshes.push(null);
      continue;
    }
    obj.userData.decoIndex = i;
    obj.userData.editorId = d.editorId;
    obj.traverse((node) => {
      node.userData.decoIndex = i;
      node.userData.editorId = d.editorId;
    });
    decoGroup.add(obj);
    decoMeshes.push(obj);
  }
  if (selectedIndex >= decorations.length) selectedIndex = -1;
  applyDecorationVisibility();
}

function applyThemeColors(sceneCfg) {
  if (sceneCfg.bg != null) scene.background = new THREE.Color(sceneCfg.bg);
  if (sceneCfg.ground != null) ground.material.color.setHex(sceneCfg.ground);
  if (sceneCfg.hemiSky != null) hemi.color.setHex(sceneCfg.hemiSky);
  if (sceneCfg.hemiGround != null) hemi.groundColor.setHex(sceneCfg.hemiGround);
  if (sceneCfg.hemiIntensity != null) hemi.intensity = Number(sceneCfg.hemiIntensity) || hemi.intensity;
  if (sceneCfg.sunColor != null) sun.color.setHex(sceneCfg.sunColor);
  if (sceneCfg.sunIntensity != null) sun.intensity = Number(sceneCfg.sunIntensity) || sun.intensity;
  if (sceneCfg.fogNear != null || sceneCfg.fogFar != null) {
    const near = Number(sceneCfg.fogNear ?? scene.fog?.near ?? 10);
    const far = Number(sceneCfg.fogFar ?? scene.fog?.far ?? 34);
    const color = sceneCfg.bg != null ? sceneCfg.bg : scene.background;
    scene.fog = new THREE.Fog(color, near, far);
  }
  if ('decorationMode' in sceneCfg) {
    decorationMode = sceneCfg.decorationMode === 'overlay' || sceneCfg.decorationMode === 'off'
      ? sceneCfg.decorationMode
      : null;
  }
}

async function rebuildZone(zoneId, propsKind, density, variant) {
  await preloadKayKitProps(propsKind);
  clearGroup(zoneGroup);
  const seed = mulberry32(zonePropSeed(zoneId, propsKind, density));
  const built = buildKayKitZone(propsKind, seed, { density, variant: variant || undefined });
  zoneGroup.add(built);
  lastZoneId = zoneId || '';
  lastPropsKind = propsKind;
  lastDensity = density;
  lastVariant = variant || '';
}

async function applyMessage(data) {
  const mode = data.mode === 'theme' ? 'theme' : data.mode === 'brush' ? 'brush' : 'full';
  if (data.zoneId && lastZoneId && data.zoneId !== lastZoneId && mode !== 'full') return;
  const incomingEpoch = data.epoch != null ? Number(data.epoch) || 0 : 0;
  if (mode === 'full' && incomingEpoch && editorEpoch && incomingEpoch < editorEpoch) return;
  if (mode === 'full') abortGesture();
  if (incomingEpoch) editorEpoch = incomingEpoch;
  if (data.tool) setTool(data.tool, false);
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

  if (mode === 'brush') {
    updateHint();
    return;
  }

  const sceneCfg = data.scene || {};
  applyThemeColors(sceneCfg);

  const propsKind = sceneCfg.props || lastPropsKind || 'ruins';
  const density = Math.max(0.5, Math.min(2, Number(sceneCfg.propDensity) || lastDensity || 1));
  const variant = typeof sceneCfg.variant === 'string' ? sceneCfg.variant : (mode === 'full' ? '' : lastVariant);
  const zoneId = data.zoneId || lastZoneId;
  const zoneChanged =
    zoneId !== lastZoneId || propsKind !== lastPropsKind || density !== lastDensity || variant !== lastVariant;

  if (zoneChanged || mode === 'full') {
    await rebuildZone(zoneId, propsKind, density, variant);
  }

  if (mode === 'full' && Array.isArray(sceneCfg.decorations)) {
    decorations = sceneCfg.decorations.slice(0, MAX_DECOS).map((row) => ensureEditorId({ ...row }));
    if (decorations.length) await preloadDecorationPacks(decorations);
    selectedIndex = -1;
    rebuildDecorations();
    postSelection();
  }
  applyDecorationVisibility();
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
  const meshes = decoMeshes.filter(Boolean);
  if (!meshes.length) return -1;
  const hits = raycaster.intersectObjects(meshes, true);
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
  const take = extracted.slice(0, room).map((row) => ensureEditorId({ ...row }));
  if (!take.length) {
    window.parent?.postMessage(
      {
        type: 'jogo-idle:map-editor-toast',
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

function indexById(id) {
  if (!id) return -1;
  return decorations.findIndex((item) => item.editorId === id);
}

function selectDecoration(idx) {
  selectedIndex = idx >= 0 && idx < decorations.length ? idx : -1;
  refreshGizmo();
  postSelection();
}

function writeTransform(index) {
  const d = decorations[index];
  const mesh = decoMeshes[index];
  if (!d || !mesh) return;
  mesh.position.x = d.x;
  mesh.position.z = d.z;
  mesh.rotation.y = d.rotY || 0;
  mesh.scale.setScalar(d.scale || 1);
}

function removeAt(index) {
  if (index < 0 || index >= decorations.length) return;
  if (layerLocked(decorations[index])) {
    window.parent?.postMessage(
      { type: 'jogo-idle:map-editor-toast', message: 'Esta camada está bloqueada. O objeto não foi excluído.' },
      window.location.origin,
    );
    return;
  }
  decorations.splice(index, 1);
  selectedIndex = -1;
  rebuildDecorations();
  postDecorations(true);
}

function removeSelected() {
  removeAt(selectedIndex);
}

function duplicateAt(index) {
  if (index < 0 || index >= decorations.length) return;
  if (layerLocked(decorations[index])) {
    window.parent?.postMessage(
      { type: 'jogo-idle:map-editor-toast', message: 'Esta camada está bloqueada. A cópia não foi criada.' },
      window.location.origin,
    );
    return;
  }
  if (decorations.length >= MAX_DECOS) {
    window.parent?.postMessage(
      {
        type: 'jogo-idle:map-editor-toast',
        message: `Limite de ${MAX_DECOS} decorações. A cópia não foi criada.`,
      },
      window.location.origin,
    );
    return;
  }
  const src = decorations[index];
  const copy = ensureEditorId({
    pack: src.pack,
    key: src.key,
    x: clamp((Number(src.x) || 0) + 0.75, -24, 24),
    z: Number(src.z) || 0,
    scale: src.scale,
    rotY: src.rotY,
  });
  if (typeof src.y === 'number') copy.y = src.y;
  if (src.tint != null) copy.tint = src.tint;
  if (src.layer) copy.layer = src.layer;
  if (snapEnabled) {
    copy.x = clamp(snapTo(copy.x, posStep), -24, 24);
    copy.z = clamp(snapTo(copy.z, posStep), -24, 24);
  }
  decorations.splice(index + 1, 0, copy);
  selectedIndex = index + 1;
  rebuildDecorations();
  postDecorations(true);
  window.parent?.postMessage(
    { type: 'jogo-idle:map-editor-toast', message: 'Objeto duplicado.' },
    window.location.origin,
  );
}

function focusSelection() {
  const mesh = decoMeshes[selectedIndex];
  if (!mesh) return;
  const box = new THREE.Box3().setFromObject(mesh);
  if (box.isEmpty()) return;
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const dist = Math.max(size.x, size.y, size.z, 1) * 2.4;
  camera.position.set(center.x + dist * 0.75, center.y + dist * 0.55, center.z + dist);
  controls.target.copy(center);
  controls.update();
}

function focusScene() {
  camera.position.set(8, 10, 12);
  controls.target.set(0, 0, 0);
  camera.fov = 42;
  camera.updateProjectionMatrix();
  controls.update();
}

function typingTarget(event) {
  const tag = event.target?.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable;
}

function beginGesture(part, event) {
  const d = decorations[selectedIndex];
  if (layerLocked(d)) return;
  const hit = groundHit(event);
  if (!d || !hit) return;
  gesture = {
    part,
    x: d.x,
    z: d.z,
    rotY: d.rotY || 0,
    scale: d.scale || 1,
    hitX: hit.point.x,
    hitZ: hit.point.z,
    angle: Math.atan2(hit.point.x - d.x, hit.point.z - d.z),
    dist: Math.max(0.25, Math.hypot(hit.point.x - d.x, hit.point.z - d.z)),
  };
  controls.enabled = false;
  canvas.style.cursor = 'grabbing';
}

function moveGesture(event) {
  if (!gesture || selectedIndex < 0) return;
  const d = decorations[selectedIndex];
  const hit = groundHit(event);
  if (!d || !hit) return;
  if (gesture.part === 'x' || gesture.part === 'z' || gesture.part === 'xz') {
    const dx = hit.point.x - gesture.hitX;
    const dz = hit.point.z - gesture.hitZ;
    if (gesture.part !== 'z') d.x = clamp(snapTo(gesture.x + dx, posStep), -24, 24);
    if (gesture.part !== 'x') d.z = clamp(snapTo(gesture.z + dz, posStep), -24, 24);
    if (gesture.part === 'x') d.z = gesture.z;
    if (gesture.part === 'z') d.x = gesture.x;
  } else if (gesture.part === 'rot') {
    const angle = Math.atan2(hit.point.x - gesture.x, hit.point.z - gesture.z);
    let rotY = gesture.rotY + (angle - gesture.angle);
    const step = snapEnabled ? (rotStepDeg * Math.PI) / 180 : 0;
    rotY = snapTo(rotY, step, snapEnabled);
    d.rotY = clamp(rotY, -Math.PI * 4, Math.PI * 4);
  } else if (gesture.part === 'scale') {
    const dist = Math.max(0.2, Math.hypot(hit.point.x - gesture.x, hit.point.z - gesture.z));
    d.scale = clamp(snapTo(gesture.scale * (dist / gesture.dist), scaleStep), 0.15, 4);
  }
  writeTransform(selectedIndex);
  postLive();
}

function cancelGesture() {
  stopLive();
  if (!gesture || selectedIndex < 0) {
    gesture = null;
    controls.enabled = true;
    return;
  }
  const d = decorations[selectedIndex];
  if (d) {
    d.x = gesture.x;
    d.z = gesture.z;
    d.rotY = gesture.rotY;
    d.scale = gesture.scale;
    writeTransform(selectedIndex);
    postDecorations(false);
  }
  gesture = null;
  controls.enabled = true;
  canvas.style.cursor = '';
}

function finishGesture() {
  stopLive();
  if (!gesture) return;
  gesture = null;
  controls.enabled = true;
  canvas.style.cursor = '';
  postDecorations(true);
}

canvas.addEventListener('pointerdown', async (event) => {
  if (event.button !== 0) return;
  canvas.focus?.();
  if (tool === 'navigate') return;

  if (tool === 'place') {
    event.stopPropagation();
    if (!brushArmed) {
      window.parent?.postMessage(
        { type: 'jogo-idle:map-editor-toast', message: 'Escolha um asset para inserir.' },
        window.location.origin,
      );
      return;
    }
    const hit = groundHit(event);
    if (!hit) return;
    await preloadDecorationPacks([{ pack: brush.pack, key: brush.key }]);
    if (decorations.length >= MAX_DECOS) {
      window.parent?.postMessage(
        { type: 'jogo-idle:map-editor-toast', message: `Limite de ${MAX_DECOS} decorações. Nada foi inserido.` },
        window.location.origin,
      );
      return;
    }
    decorations.push(ensureEditorId({
      pack: brush.pack,
      key: brush.key,
      x: clamp(snapTo(hit.point.x, posStep), -24, 24),
      z: clamp(snapTo(hit.point.z, posStep), -24, 24),
      scale: clamp(brush.scale || 1, 0.15, 4),
      rotY: 0,
    }));
    selectedIndex = decorations.length - 1;
    brushArmed = false;
    clearPreview();
    rebuildDecorations();
    postDecorations(true);
    setTool('select');
    if (!manualsVisibleInPlay(lastPropsKind, decorationMode)) {
      window.parent?.postMessage(
        {
          type: 'jogo-idle:map-editor-overlay-offer',
          count: decorations.length,
          epoch: editorEpoch,
          zoneId: lastZoneId,
        },
        window.location.origin,
      );
    }
    return;
  }

  setPointerFromEvent(event);
  const part = gizmo.pick(raycaster);
  if (part && selectedIndex >= 0) {
    event.stopPropagation();
    beginGesture(part, event);
    return;
  }

  const decoIdx = pickDecoration(event);
  if (decoIdx >= 0) {
    event.stopPropagation();
    if (layerLocked(decorations[decoIdx])) {
      window.parent?.postMessage(
        { type: 'jogo-idle:map-editor-toast', message: 'Esta camada está bloqueada.' },
        window.location.origin,
      );
      return;
    }
    if (decoIdx !== selectedIndex) selectDecoration(decoIdx);
    if (tool === 'select' || tool === 'move') beginGesture('xz', event);
    return;
  }

  if (tool === 'select') {
    const biomeRoot = pickBiomeRoot(event);
    if (biomeRoot) {
      event.stopPropagation();
      const at = { x: biomeRoot.position.x, z: biomeRoot.position.z };
      const ok = await bakeBiome({ selectAt: at });
      if (ok && selectedIndex >= 0) setTool('select');
      return;
    }
  }

  if (selectedIndex >= 0) {
    selectedIndex = -1;
    refreshGizmo();
    postSelection();
  }
}, true);

canvas.addEventListener('pointermove', (event) => {
  if (gesture) {
    moveGesture(event);
    return;
  }
  if (tool === 'navigate' || tool === 'place') {
    canvas.style.cursor = '';
    return;
  }
  setPointerFromEvent(event);
  canvas.style.cursor = gizmo.pick(raycaster) || pickDecoration(event) >= 0 ? 'grab' : '';
});

function endPointer(event) {
  if (!gesture) return;
  finishGesture(event);
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);

function rotateSelected(direction) {
  if (selectedIndex < 0) return;
  if (layerLocked(decorations[selectedIndex])) return;
  const delta = snapEnabled ? (rotStepDeg * Math.PI) / 180 : Math.PI / 12;
  const d = decorations[selectedIndex];
  d.rotY = clamp((Number(d.rotY) || 0) + direction * delta, -Math.PI * 4, Math.PI * 4);
  writeTransform(selectedIndex);
  postDecorations(true);
}

function patchSelected(data) {
  const idx = data.editorId ? indexById(data.editorId) : selectedIndex;
  if (idx < 0 || !decorations[idx]) return;
  const layerOnly = data.layer != null && data.x == null && data.z == null && data.rotY == null && data.scale == null;
  if (!layerOnly && layerLocked(decorations[idx])) {
    window.parent?.postMessage(
      { type: 'jogo-idle:map-editor-toast', message: 'Esta camada está bloqueada.' },
      window.location.origin,
    );
    return;
  }
  selectedIndex = idx;
  const d = decorations[idx];
  if (data.x != null) d.x = clamp(data.x, -24, 24);
  if (data.z != null) d.z = clamp(data.z, -24, 24);
  if (data.rotY != null) d.rotY = clamp(data.rotY, -Math.PI * 4, Math.PI * 4);
  if (data.scale != null) d.scale = clamp(data.scale, 0.15, 4);
  if (data.layer === 'vegetacao' || data.layer === 'estrutura' || data.layer === 'decoracao' || data.layer === 'efeito') {
    d.layer = data.layer;
  }
  writeTransform(idx);
  applyDecorationVisibility();
  postDecorations(data.commit !== false);
}

async function applyEditorState(data) {
  abortGesture();
  if (data.epoch != null) editorEpoch = Number(data.epoch) || editorEpoch;
  const sceneCfg = data.scene || {};
  applyThemeColors(sceneCfg);
  const propsKind = sceneCfg.props || lastPropsKind || 'ruins';
  const density = Math.max(0.5, Math.min(2, Number(sceneCfg.propDensity) || lastDensity || 1));
  const variant = 'variant' in sceneCfg ? (sceneCfg.variant || '') : lastVariant;
  if (propsKind !== lastPropsKind || density !== lastDensity || variant !== lastVariant) {
    await rebuildZone(lastZoneId, propsKind, density, variant);
  }
  if (Array.isArray(data.decorations)) {
    decorations = data.decorations.slice(0, MAX_DECOS).map((row) => ensureEditorId({ ...row }));
    if (decorations.length) await preloadDecorationPacks(decorations);
    selectedIndex = indexById(data.selectedId);
    rebuildDecorations();
  }
  if (data.scene && 'decorationMode' in data.scene) {
    decorationMode = data.scene.decorationMode === 'overlay' || data.scene.decorationMode === 'off'
      ? data.scene.decorationMode
      : null;
  }
  applyDecorationVisibility();
  postSelection();
}

window.addEventListener('keydown', (event) => {
  if (typingTarget(event)) return;
  const mod = event.metaKey || event.ctrlKey;
  if (mod && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (!event.repeat) postShortcut(event.shiftKey ? 'redo' : 'undo');
    return;
  }
  if (mod && event.key.toLowerCase() === 'y') {
    event.preventDefault();
    if (!event.repeat) postShortcut('redo');
    return;
  }
  if (mod && event.key.toLowerCase() === 'd') {
    event.preventDefault();
    if (!event.repeat) duplicateAt(selectedIndex);
    return;
  }
  if (event.key === 'Delete' || event.key === 'Backspace') {
    event.preventDefault();
    removeSelected();
    return;
  }
  if (event.key === 'Escape') {
    if (gesture) cancelGesture();
    else {
      selectedIndex = -1;
      brushArmed = false;
      clearPreview();
      refreshGizmo();
      updateHint();
      postSelection();
    }
    return;
  }
  if (event.key === 'q' || event.key === 'Q') {
    event.preventDefault();
    rotateSelected(-1);
    return;
  }
  if (event.key === 'e' || event.key === 'E') {
    event.preventDefault();
    rotateSelected(1);
    return;
  }
  if (event.key === 'g' || event.key === 'G') {
    if (mod) return;
    gridOn = !gridOn;
    if (grid) grid.visible = gridOn;
    window.parent?.postMessage(
      { type: 'jogo-idle:map-editor-prefs', grid: gridOn, epoch: editorEpoch },
      window.location.origin,
    );
    return;
  }
  if (event.key === 'f' || event.key === 'F') {
    if (event.shiftKey) focusScene();
    else focusSelection();
    return;
  }
  if (event.key === '1') setTool('navigate');
  if (event.key === '2') setTool('select');
  if (event.key === '3') setTool('place');
  if (event.key === '4') setTool('move');
  if (event.key === '5') setTool('rotate');
  if (event.key === '6') setTool('scale');
});

window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin) return;
  const data = event.data;
  if (data?.type === 'jogo-idle:map-editor-command') {
    if (data.epoch != null && editorEpoch && Number(data.epoch) !== editorEpoch) return;
    if (data.command === 'delete-selected') removeSelected();
    if (data.command === 'delete-id') removeAt(indexById(data.editorId));
    if (data.command === 'duplicate-selected') duplicateAt(selectedIndex);
    if (data.command === 'duplicate-id') duplicateAt(indexById(data.editorId));
    if (data.command === 'bake-biome') void bakeBiome();
    if (data.command === 'clear-selection') selectDecoration(-1);
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
      void showPropPreview(brush.pack, brush.key, brush.scale);
    }
    if (data.command === 'disarm-brush') {
      brushArmed = false;
      clearPreview();
      updateHint();
    }
    if (data.command === 'nudge-rot') rotateSelected(Number(data.direction) < 0 ? -1 : 1);
    if (data.command === 'set-rotY') patchSelected({ rotY: data.rotY, editorId: data.editorId });
    if (data.command === 'select-index') selectDecoration(Number(data.index));
    if (data.command === 'select-id') selectDecoration(indexById(data.editorId));
    if (data.command === 'set-layer') patchSelected({ editorId: data.editorId, layer: data.layer, commit: true });
    if (data.command === 'set-layer-view') {
      hiddenLayers.clear();
      lockedLayers.clear();
      for (const id of Array.isArray(data.hidden) ? data.hidden : []) hiddenLayers.add(id);
      for (const id of Array.isArray(data.locked) ? data.locked : []) lockedLayers.add(id);
      applyDecorationVisibility();
    }
    if (data.command === 'patch-selected') patchSelected(data);
    if (data.command === 'apply-editor-state') void applyEditorState(data);
    if (data.command === 'set-grid') {
      gridOn = Boolean(data.enabled);
      if (data.step) posStep = Number(data.step) || posStep;
      rebuildGrid();
      if (grid) grid.visible = gridOn;
    }
    if (data.command === 'set-snap') {
      snapEnabled = Boolean(data.enabled);
      if (data.posStep) posStep = Number(data.posStep) || posStep;
      if (data.rotStep) rotStepDeg = Number(data.rotStep) || rotStepDeg;
      if (data.scaleStep) scaleStep = Number(data.scaleStep) || scaleStep;
      rebuildGrid();
      updateHint();
    }
    if (data.command === 'focus-selection') focusSelection();
    if (data.command === 'focus-scene') focusScene();
    if (data.command === 'snap-play-camera') snapToPlayCamera();
    if (data.command === 'toggle-play-camera') setShowPlayCamera(!showPlayCamera);
    if (data.command === 'set-play-camera') setShowPlayCamera(Boolean(data.enabled));
    return;
  }
  if (data?.type !== 'jogo-idle:map-editor') return;
  void applyMessage(data);
});

function loop() {
  requestAnimationFrame(loop);
  if (showPlayCamera) ensurePlayCameraHelpers();
  const mesh = selectedIndex >= 0 ? decoMeshes[selectedIndex] : null;
  if (mesh && mesh.visible) {
    selectionBox.setFromObject(mesh);
    selectionBox.visible = true;
  } else {
    selectionBox.visible = false;
  }
  gizmo.update(camera);
  controls.update();
  renderer.render(scene, camera);
}

loop();
updateHint();

window.parent?.postMessage({ type: 'jogo-idle:map-editor-ready' }, window.location.origin);
