import * as THREE from 'three';
import { Entity } from '../core/Entity.js';

// Doneness colour stops: 0 = raw, 1 = cooked, 2 = burnt.
const RAW = new THREE.Color(0xb8323f);
const COOKED = new THREE.Color(0x7b3d1e);
const BURNT = new THREE.Color(0x1f140e);

export function donenessColor(level, target = new THREE.Color()) {
  const l = THREE.MathUtils.clamp(level, 0, 2);
  return l <= 1 ? target.copy(RAW).lerp(COOKED, l) : target.copy(COOKED).lerp(BURNT, l - 1);
}

// Low-poly steak with two independently cooking sides.
// state: { top: 0..2, bottom: 0..2 }  (doneness per side; filled in by the heat timer later)
export class Steak extends Entity {
  constructor(id, { top = 0, bottom = 0 } = {}) {
    super(id, 'steak');

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

    // Cylinder material groups: 0 = side, 1 = top cap, 2 = bottom cap
    this.sideMat = new THREE.MeshStandardMaterial({ color: 0xd98a80, roughness: 0.7, flatShading: true });
    this.topMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
    this.bottomMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
    const mesh = new THREE.Mesh(geo, [this.sideMat, this.topMat, this.bottomMat]);
    mesh.position.y = 0.011;
    mesh.castShadow = mesh.receiveShadow = true;
    this.object3d.add(mesh);

    // strip of fat along one edge
    const fat = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.018, 0.012),
      new THREE.MeshStandardMaterial({ color: 0xf1ddc9, roughness: 0.6, flatShading: true }),
    );
    fat.position.set(0.0, 0.011, -0.072);
    fat.rotation.y = 0.15;
    this.object3d.add(fat);

    this.setState({ top, bottom });
  }

  onStateChanged() {
    donenessColor(this.state.top, this.topMat.color);
    donenessColor(this.state.bottom, this.bottomMat.color);
  }
}
