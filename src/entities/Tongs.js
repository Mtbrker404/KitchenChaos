import * as THREE from 'three';
import { Item } from './Item.js';
import { M } from '../world/materials.js';
import { box, cyl } from '../world/helpers.js';

const _d = new THREE.Vector3();

// Kitchen tongs, length along local -Y (hinge ring at the origin, so they hang from a hook).
// Using them to pick up the steak comes in a later step.
export class Tongs extends Item {
  constructor(id) {
    super(id, 'tongs');
    const g = this.object3d;
    const len = 0.28;
    for (const side of [-1, 1]) {
      const arm = box(0.016, len, 0.004, M.steel(), side * 0.012, -len / 2, 0, g);
      arm.rotation.z = side * 0.06;
      box(0.022, 0.03, 0.008, M.steel(), side * 0.022, -len + 0.01, 0, g); // grip pads
      box(0.018, 0.09, 0.008, M.black(), side * 0.008, -0.06, 0, g); // rubber handle
    }
    const ring = cyl(0.014, 0.014, 0.01, 8, M.steelDark(), 0, 0.005, 0, g);
    ring.rotation.x = Math.PI / 2;
  }

  /** Lie flat on the counter, pointing the way they were held. */
  restQuaternion(worldQuat) {
    _d.set(0, -1, 0).applyQuaternion(worldQuat);
    const yaw = Math.atan2(_d.x, _d.z);
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, yaw, 0, 'YXZ'));
  }
}
