import * as THREE from 'three';
import { Item, box3 } from './Item.js';
import { mat, COLORS } from '../world/materials.js';
import { box } from '../world/helpers.js';

/** Height of the inside floor of the pan above its origin. */
export const PAN_FLOOR = 0.008;

// Frying pan. Origin = bottom centre, handle along local +X.
export class Pan extends Item {
  constructor(id) {
    super(id, 'pan');
    this.accepts = ['steak'];

    const profile = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.12, 0),
      new THREE.Vector2(0.135, 0.008),
      new THREE.Vector2(0.15, 0.045),
      new THREE.Vector2(0.156, 0.047),
      new THREE.Vector2(0.142, 0.047),
      new THREE.Vector2(0.128, 0.01),
      new THREE.Vector2(0.115, PAN_FLOOR),
      new THREE.Vector2(0, PAN_FLOOR),
    ];
    const iron = mat(COLORS.castIron, { metal: 0.45, rough: 0.55, side: THREE.DoubleSide });
    const body = new THREE.Mesh(new THREE.LatheGeometry(profile, 14), iron);
    body.castShadow = body.receiveShadow = true;
    this.object3d.add(body);

    const handle = new THREE.Group();
    handle.position.set(0.15, 0.04, 0);
    handle.rotation.z = 0.15;
    box(0.06, 0.014, 0.022, iron, 0.03, 0, 0, handle);
    box(0.15, 0.02, 0.028, mat(0x2a1a10), 0.13, 0, 0, handle);
    this.object3d.add(handle);

    // collision shapes (local): pan body + handle
    this.collisionBoxes = [box3(0, 0.024, 0, 0.31, 0.048, 0.31), box3(0.25, 0.055, 0, 0.2, 0.03, 0.03)];
  }
}
