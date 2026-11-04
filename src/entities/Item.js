import * as THREE from 'three';
import { Entity } from '../core/Entity.js';

const GRAVITY = 9.81;
const _e = new THREE.Euler();

/**
 * Something you can pick up and put down (pan, steak, tongs, later: pot, tomato...).
 *
 * state: {
 *   held: null | 'left' | 'right'   which hand holds it
 *   on:   null | entityId           what it rests on (e.g. steak on "pan.0"); null = the world
 *   pos:  [x,y,z]  quat: [x,y,z,w]  rest pose, local to `on` (or world)
 * }
 * While held, the hand drives the transform directly (it's a visual, not state).
 * Putting it down is an 'item/place' action, so a second client can mirror it.
 */
export class Item extends Entity {
  constructor(id, type) {
    super(id, type);
    this.grabKind = 'item';
    /** Entity types that may rest inside this one (e.g. a pan accepts steaks). */
    this.accepts = [];
    this.state = { held: null, on: null, pos: [0, 0, 0], quat: [0, 0, 0, 1] };
    this.falling = null;
  }

  /** Orientation it settles into when put down. Default: stand upright, keep the heading. */
  restQuaternion(worldQuat) {
    _e.setFromQuaternion(worldQuat, 'YXZ');
    return new THREE.Quaternion().setFromEuler(new THREE.Euler(0, _e.y, 0, 'YXZ'));
  }

  supportObject() {
    return this.state.on ? this.game.get(this.state.on).object3d : this.game.scene;
  }

  onStateChanged() {
    if (this.state.held) {
      this.falling = null;
      return; // the hand is in charge
    }
    const parent = this.supportObject();
    if (this.object3d.parent !== parent) parent.attach(this.object3d); // keeps the world pose
    this.falling = {
      pos: new THREE.Vector3().fromArray(this.state.pos),
      quat: new THREE.Quaternion().fromArray(this.state.quat).normalize(), // rounded for the wire, so re-normalise
      vy: 0,
    };
  }

  /** Jump straight to the rest pose (initial placement). */
  snap() {
    if (!this.falling) return;
    this.object3d.position.copy(this.falling.pos);
    this.object3d.quaternion.copy(this.falling.quat);
    this.falling = null;
  }

  update(dt) {
    const f = this.falling;
    if (!f) return;
    const o = this.object3d;
    // drop with gravity, glide sideways, rotate into the rest orientation
    if (o.position.y > f.pos.y) {
      f.vy += GRAVITY * dt;
      o.position.y = Math.max(f.pos.y, o.position.y - f.vy * dt);
    } else {
      o.position.y = f.pos.y;
    }
    const k = 1 - Math.exp(-18 * dt);
    o.position.x += (f.pos.x - o.position.x) * k;
    o.position.z += (f.pos.z - o.position.z) * k;
    o.quaternion.slerp(f.quat, k);
    f.t = (f.t ?? 0) + dt;
    const settled = o.position.y === f.pos.y && o.position.distanceToSquared(f.pos) < 1e-6 && o.quaternion.angleTo(f.quat) < 0.01;
    if (settled || f.t > 1.5) {
      this.snap();
    }
  }
}
