import * as THREE from 'three';
import { Entity } from '../core/Entity.js';

const GRAVITY = 9.81;
const _e = new THREE.Euler();

/** Local-space collision box helper: centre (x,y,z) + size (w,h,d). */
export function box3(x, y, z, w, h, d) {
  return new THREE.Box3(new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2), new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2));
}

/**
 * Something you can pick up and put down (pan, steak, spatula; later: pot, tomato...).
 *
 * state: {
 *   held: null | 'left' | 'right'   which hand holds it
 *   on:   null | entityId           what it rests on (e.g. steak on "pan.0"); null = the world
 *   pos:  [x,y,z]  quat: [x,y,z,w]  rest pose, local to `on` (or world)
 *   toss: number                    upward speed (m/s) when it was flicked, for the arc
 * }
 * While held, the hand drives the transform directly (it's a visual, not state).
 * Putting it down is an 'item/place' action, so a second client can mirror it.
 */
export class Item extends Entity {
  constructor(id, type) {
    super(id, type);
    this.grabKind = 'item';
    /** Entity types that may rest on/in this one (e.g. a pan accepts steaks). */
    this.accepts = [];
    /** Local-space boxes used to keep the item out of counters while held. */
    this.collisionBoxes = [];
    this.state = { held: null, on: null, pos: [0, 0, 0], quat: [0, 0, 0, 1], toss: 0 };
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
    const toss = this.state.toss || 0;
    this.falling = {
      pos: new THREE.Vector3().fromArray(this.state.pos),
      quat: new THREE.Quaternion().fromArray(this.state.quat).normalize(), // rounded for the wire, so re-normalise
      startQuat: this.object3d.quaternion.clone(),
      vy: -toss, // negative = moving up
      // a tossed item spins over the whole arc; a dropped one settles quickly
      spinTime: toss > 0 ? (2 * toss) / GRAVITY + 0.05 : 0,
      t: 0,
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
    f.t += dt;
    // fly up (if tossed) then fall with gravity; glide sideways
    f.vy += GRAVITY * dt;
    o.position.y -= f.vy * dt;
    if (f.vy > 0 && o.position.y < f.pos.y) o.position.y = f.pos.y;
    const k = 1 - Math.exp(-18 * dt);
    o.position.x += (f.pos.x - o.position.x) * k;
    o.position.z += (f.pos.z - o.position.z) * k;
    if (f.spinTime > 0) o.quaternion.slerpQuaternions(f.startQuat, f.quat, Math.min(1, f.t / f.spinTime));
    else o.quaternion.slerp(f.quat, k);

    const landed = f.vy > 0 && o.position.y === f.pos.y;
    const settled = landed && o.position.distanceToSquared(f.pos) < 1e-6 && o.quaternion.angleTo(f.quat) < 0.01;
    if (settled || f.t > 2) this.snap();
  }
}
