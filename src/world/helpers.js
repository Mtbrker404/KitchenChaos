import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { M } from './materials.js';

function finish(mesh, x, y, z, parent) {
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent?.add(mesh);
  return mesh;
}

export function box(w, h, d, material, x = 0, y = 0, z = 0, parent) {
  return finish(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material), x, y, z, parent);
}

export function cyl(rTop, rBottom, h, segments, material, x = 0, y = 0, z = 0, parent) {
  return finish(new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, segments), material), x, y, z, parent);
}

/**
 * Invisible solid box (centre x,y,z / size w,h,d in the parent's space).
 * Held items get pushed out of these. Collected by collectColliders().
 */
export function collider(w, h, d, x, y, z, parent) {
  const o = new THREE.Object3D();
  o.position.set(x, y, z);
  o.userData.collider = new THREE.Vector3(w, h, d);
  parent?.add(o);
  return o;
}

/** World-space Box3 for every collider() under root. Call before mergeStatic(). */
export function collectColliders(root) {
  root.updateMatrixWorld(true);
  const boxes = [];
  root.traverse((o) => {
    const s = o.userData.collider;
    if (!s) return;
    const b = new THREE.Box3(new THREE.Vector3(-s.x / 2, -s.y / 2, -s.z / 2), new THREE.Vector3(s.x / 2, s.y / 2, s.z / 2));
    boxes.push(b.applyMatrix4(o.matrixWorld));
  });
  return boxes;
}

/** Position a station so its local +Z (its front) faces the player at the origin. */
export function faceCenter(obj, x, z) {
  obj.position.set(x, 0, z);
  obj.rotation.y = Math.atan2(-x, -z);
  return obj;
}

/** Deterministic RNG: phone and headset must generate the identical kitchen. */
export function seededRandom(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A kitchen cabinet with its front at local +Z, sitting on the floor.
 * Returns a group; `topY` is the work surface height.
 */
export function cabinet({ w = 1, d = 0.65, h = 0.9, body = M.wood(), top = M.stone(), doors = 2, handle = M.steel() } = {}) {
  const g = new THREE.Group();
  const topT = 0.04;
  const kick = 0.08;
  const bodyH = h - topT - kick;
  box(w - 0.04, kick, d - 0.08, M.black(), 0, kick / 2, -0.03, g);
  box(w, bodyH, d - 0.03, body, 0, kick + bodyH / 2, -0.015, g);
  box(w + 0.03, topT, d + 0.02, top, 0, h - topT / 2, 0.01, g);
  // door panels + handles
  const dw = w / doors;
  for (let i = 0; i < doors; i++) {
    const cx = -w / 2 + dw * (i + 0.5);
    box(dw - 0.03, bodyH - 0.06, 0.015, body, cx, kick + bodyH / 2, d / 2 - 0.02, g);
    const hx = cx + (i % 2 === 0 ? dw / 2 - 0.07 : -dw / 2 + 0.07);
    box(0.015, 0.12, 0.02, handle, doors === 1 ? cx + dw / 2 - 0.07 : hx, kick + bodyH - 0.12, d / 2 + 0.0, g);
  }
  g.userData.topY = h;
  return g;
}

/**
 * Merge every static mesh under `root` into one mesh per material (huge draw-call
 * saving on Pico). Subtrees flagged userData.dynamic (entities) are kept as-is
 * and re-parented with their world transform preserved.
 */
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const byMaterial = new Map();
  const dynamics = [];

  (function walk(obj) {
    for (const child of obj.children) {
      if (child.userData.dynamic) {
        dynamics.push(child);
        continue;
      }
      if (child.isMesh) {
        let g = child.geometry.clone().applyMatrix4(child.matrixWorld);
        if (g.index) g = g.toNonIndexed();
        g.clearGroups();
        for (const name of Object.keys(g.attributes)) {
          if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
        }
        if (!byMaterial.has(child.material)) byMaterial.set(child.material, []);
        byMaterial.get(child.material).push(g);
      }
      walk(child);
    }
  })(root);

  const out = new THREE.Group();
  out.name = 'static-merged';
  for (const [material, geos] of byMaterial) {
    const mesh = new THREE.Mesh(mergeGeometries(geos), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    out.add(mesh);
    geos.forEach((g) => g.dispose());
  }
  for (const d of dynamics) {
    d.updateMatrixWorld(true);
    d.matrixWorld.decompose(d.position, d.quaternion, d.scale);
    d.removeFromParent();
    out.add(d);
  }
  return out;
}
