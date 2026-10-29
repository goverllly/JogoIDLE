/**
 * Gizmo do editor de mapas. Não entra no jogo.
 * Mover: eixos X/Z e o plano. Rotacionar: anel Y. Escalar: alça uniforme.
 */
import * as THREE from 'three';

const GOLD = 0xf4d6a0;
const AXIS_X = 0xf0c36a;
const AXIS_Z = 0xc5d6b0;

function basic(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthTest: false,
    toneMapped: false,
  });
}

function arrow(color, part, rotation) {
  const material = basic(color);
  const group = new THREE.Group();
  group.userData.part = part;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.72, 8), material);
  shaft.position.y = 0.36;
  shaft.userData.part = part;
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 10), material);
  head.position.y = 0.8;
  head.userData.part = part;
  group.add(shaft, head);
  group.rotation.copy(rotation);
  return group;
}

export function createEditorGizmo() {
  const root = new THREE.Group();
  root.name = '__editorGizmo';
  root.visible = false;
  root.renderOrder = 1000;

  const move = new THREE.Group();
  move.add(arrow(AXIS_X, 'x', new THREE.Euler(0, 0, -Math.PI / 2)));
  move.add(arrow(AXIS_Z, 'z', new THREE.Euler(Math.PI / 2, 0, 0)));
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.28, 0.28),
    basic(GOLD, 0.35),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(0.24, 0.02, 0.24);
  plane.userData.part = 'xz';
  move.add(plane);
  root.add(move);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.055, 8, 48),
    basic(GOLD, 0.92),
  );
  ring.rotation.x = Math.PI / 2;
  ring.userData.part = 'rot';
  root.add(ring);

  const scale = new THREE.Group();
  const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1.05, 6), basic(GOLD, 0.8));
  spoke.rotation.z = -Math.PI / 4;
  spoke.position.set(0.38, 0, 0.38);
  spoke.userData.part = 'scale';
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), basic(GOLD));
  handle.position.set(0.78, 0.04, 0.78);
  handle.userData.part = 'scale';
  scale.add(spoke, handle);
  root.add(scale);

  root.traverse((node) => {
    node.frustumCulled = false;
    node.renderOrder = 1000;
  });

  let target = null;
  let mode = 'off';

  function setMode(next) {
    mode = next === 'move' || next === 'rotate' || next === 'scale' ? next : 'off';
    move.visible = mode === 'move';
    ring.visible = mode === 'rotate';
    scale.visible = mode === 'scale';
    root.visible = Boolean(target) && mode !== 'off';
  }

  function attach(object) {
    target = object || null;
    root.visible = Boolean(target) && mode !== 'off';
  }

  function update(camera) {
    if (!target || !root.visible) return;
    root.position.set(target.position.x, target.position.y || 0, target.position.z);
    const distance = camera.position.distanceTo(root.position);
    const size = THREE.MathUtils.clamp(distance * 0.085, 0.55, 3.2);
    root.scale.setScalar(size);
  }

  function pick(raycaster) {
    if (!root.visible) return null;
    const active = mode === 'move' ? move : mode === 'rotate' ? ring : mode === 'scale' ? scale : null;
    if (!active) return null;
    const hits = raycaster.intersectObject(active, true);
    if (!hits.length) return null;
    let node = hits[0].object;
    while (node && !node.userData.part) node = node.parent;
    return node?.userData.part || null;
  }

  return { root, setMode, attach, update, pick };
}
