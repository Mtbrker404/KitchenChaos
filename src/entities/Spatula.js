import * as THREE from 'three';
import { Item, box3 } from './Item.js';
import { M, mat } from '../world/materials.js';
import { box, cyl } from '../world/helpers.js';

const HANDLE_LEN = 0.17;
const NECK_LEN = 0.06;
const NECK_BEND = 0.5; // radians: angle between handle and neck
export const BLADE = { w: 0.09, len: 0.11, t: 0.003 };

const _d = new THREE.Vector3();

/**
 * Metal spatula / turner: handle -> bent neck -> flat blade.
 * Origin = top end of the handle (it hangs from the rail by it), handle along local -Y.
 *
 * `this.blade` is a frame on the blade surface: its XZ plane is the blade's top
 * surface, +Y is the blade's normal (what a steak sits on), the blade extends
 * along -Z from the neck. The grab system uses it to scoop and flip steaks.
 */
export class Spatula extends Item {
  constructor(id) {
    super(id, 'spatula');
    this.accepts = ['steak'];
    const g = this.object3d;

    // handle (dark wood) with a hanging hole ring at the top
    cyl(0.011, 0.013, HANDLE_LEN, 6, mat(0x3a2414), 0, -HANDLE_LEN / 2, 0, g);
    const ring = cyl(0.012, 0.012, 0.006, 6, M.steelDark(), 0, 0.002, 0, g);
    ring.rotation.x = Math.PI / 2;

    // neck: steel strip, bent towards +Z (away from the blade's top face, like a real turner)
    const neck = new THREE.Group();
    neck.position.y = -HANDLE_LEN;
    neck.rotation.x = -NECK_BEND;
    box(0.014, NECK_LEN, 0.004, M.steel(), 0, -NECK_LEN / 2, 0, neck);
    g.add(neck);

    // blade frame at the end of the neck, bent back so the blade runs parallel to the
    // handle; blade top face (+Y in blade space) ends up facing local -Z
    this.blade = new THREE.Group();
    this.blade.position.y = -NECK_LEN;
    this.blade.rotation.x = -Math.PI / 2 + NECK_BEND;
    neck.add(this.blade);
    // the flat plate, its top surface at blade-local y = 0
    const plate = box(BLADE.w, BLADE.t, BLADE.len, M.steel(), 0, -BLADE.t / 2, -BLADE.len / 2, this.blade);
    plate.castShadow = true;
    // slight bevel at the front edge
    box(BLADE.w, BLADE.t * 0.6, 0.012, M.steelDark(), 0, -BLADE.t / 2, -BLADE.len + 0.006, this.blade);

    // collision shapes (local): handle and blade. The blade box is built in blade space,
    // so compute it once from the blade's local matrix.
    g.updateMatrixWorld(true);
    const bladeBox = box3(0, -BLADE.t / 2, -BLADE.len / 2, BLADE.w, 0.006, BLADE.len);
    const toLocal = new THREE.Matrix4().copy(g.matrixWorld).invert().multiply(this.blade.matrixWorld);
    this.collisionBoxes = [box3(0, -HANDLE_LEN / 2, 0, 0.026, HANDLE_LEN, 0.026), bladeBox.applyMatrix4(toLocal)];
  }

  /** Lie flat with the blade face up, pointing the way it was held. */
  restQuaternion(worldQuat) {
    _d.set(0, -1, 0).applyQuaternion(worldQuat);
    const yaw = Math.atan2(-_d.x, -_d.z);
    // rotate +90° around X: handle (-Y) becomes horizontal (-Z), blade face (-Z) turns up (+Y)
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, yaw, 0, 'YXZ'));
  }

  /** World-space normal of the blade's top surface. */
  bladeNormal(target = new THREE.Vector3()) {
    return target.set(0, 1, 0).applyQuaternion(this.blade.getWorldQuaternion(new THREE.Quaternion()));
  }
}
