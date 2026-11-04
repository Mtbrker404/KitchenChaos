import * as THREE from 'three';
import { Item } from './Item.js';

// Doneness colour stops: 0 = raw, 1 = cooked, 2 = burnt.
const RAW = new THREE.Color(0xb8323f);
const COOKED = new THREE.Color(0x7b3d1e);
const BURNT = new THREE.Color(0x1f140e);

export function donenessColor(level, target = new THREE.Color()) {
  const l = THREE.MathUtils.clamp(level, 0, 2);
  return l <= 1 ? target.copy(RAW).lerp(COOKED, l) : target.copy(COOKED).lerp(BURNT, l - 1);
}

const _up = new THREE.Vector3();
const _e = new THREE.Euler();

// Low-poly steak with two independently cooking sides. Origin = centre of the steak.
// Extra state: { sideA: 0..2, sideB: 0..2 } doneness per side (driven by the heat timer later).
// sideA is the side facing up when the steak isn't flipped.
export class Steak extends Item {
  constructor(id) {
    super(id, 'steak');
    Object.assign(this.state, { sideA: 0, sideB: 0 });

    const geo = new THREE.CylinderGeometry(0.07, 0.07, 0.022, 9, 1);
    // squash into an irregular steak outline; jitter by angle so cap and side rims stay welded
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-4) continue;
      const a = Math.atan2(z, x);
      const k = 1 + 0.12 * Math.sin(a * 2 + 0.6) + 0.07 * Math.sin(a * 3 + 1.7);
      pos.setX(i, x * k * 1.35);
      pos.setZ(i, z * k);
    }
    geo.computeVertexNormals();

    // Cylinder material groups: 0 = side, 1 = top cap (side A), 2 = bottom cap (side B)
    this.sideMat = new THREE.MeshStandardMaterial({ color: 0xd98a80, roughness: 0.7, flatShading: true });
    this.aMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
    this.bMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
    const mesh = new THREE.Mesh(geo, [this.sideMat, this.aMat, this.bMat]);
    mesh.castShadow = mesh.receiveShadow = true;
    this.object3d.add(mesh);

    const fat = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.018, 0.012),
      new THREE.MeshStandardMaterial({ color: 0xf1ddc9, roughness: 0.6, flatShading: true }),
    );
    fat.position.set(0.0, 0, -0.072);
    fat.rotation.y = 0.15;
    fat.castShadow = true;
    this.object3d.add(fat);
  }

  /** Lands flat, on whichever side is closer to facing down: this is how flipping works. */
  restQuaternion(worldQuat) {
    _up.set(0, 1, 0).applyQuaternion(worldQuat);
    _e.setFromQuaternion(worldQuat, 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, _e.y, 0, 'YXZ'));
    if (_up.y < 0) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI));
    return q;
  }

  /** Which side is touching the pan: 'A' or 'B'. Used by the cooking logic next. */
  get downSide() {
    _up.set(0, 1, 0).applyQuaternion(new THREE.Quaternion().fromArray(this.state.quat));
    return _up.y >= 0 ? 'B' : 'A';
  }

  onStateChanged(patch) {
    super.onStateChanged(patch);
    donenessColor(this.state.sideA, this.aMat.color);
    donenessColor(this.state.sideB, this.bMat.color);
  }
}
