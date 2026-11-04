import * as THREE from 'three';
import { HEAT_ON_THRESHOLD, KNOB_RANGE } from '../entities/Burner.js';

const GRAB_RADIUS = 0.07; // how close the palm must be to an object's bounds
const KNOB_LET_GO = 0.18; // pulling the hand this far from a knob releases it
const HEAT_SEND_STEP = 0.02; // only send knob changes bigger than this (network-friendly)
const MAX_HAND_OFFSET = 0.35; // if a collider holds an item this far from the hand, let go

// spatula
const SCOOP_FLAT = 0.6; // blade normal.y above this counts as "flat enough to scoop"
const FLIP_TILT = 0.35; // blade normal.y below this tips the steak off -> flip
const FLIP_TOSS = 1.3; // upward speed (m/s) of a flipped steak

const _box = new THREE.Box3();
const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();
const _down = new THREE.Vector3(0, -1, 0);
const round = (arr) => arr.map((n) => Math.round(n * 1e4) / 1e4);

/**
 * Grip button = grab. Handles two kinds of grabbable entities:
 *  - 'item' (pan, steak, spatula): follows the hand but can't pass through the
 *    kitchen's colliders; dropped onto the surface below on release
 *  - 'knob' (stove burners): grab, then twist your wrist to set the heat
 * Plus the spatula: slide the blade under a steak to scoop it, tip it over to flip.
 *
 * All game-state changes go through game.dispatch(), so the same actions can
 * be sent to other players later. The hand-follow itself is only visual.
 */
export class GrabSystem {
  constructor({ engine, game, colliders }) {
    this.engine = engine;
    this.game = game;
    this.colliders = colliders;
    this.raycaster = new THREE.Raycaster();
    this.hands = []; // { side, hand, grip, inputSource, held: null | {entity, kind, ...} }
  }

  addHand(side, hand, grip) {
    const h = { side, hand, grip, inputSource: null, held: null, squeezing: false };
    this.hands.push(h);
    return h;
  }

  isHeld(entity) {
    return this.hands.some((h) => h.held?.entity === entity);
  }

  /** Nearest grabbable entity within reach of this hand's palm. */
  findTarget(h) {
    h.hand.grabPoint.getWorldPosition(_p);
    let best = null;
    let bestD = GRAB_RADIUS;
    for (const e of this.game.entities.values()) {
      if (!e.grabKind || this.isHeld(e)) continue;
      const target = e.grabTarget();
      if (!target) continue;
      const d = _box.setFromObject(target).distanceToPoint(_p);
      // prefer the steak when it overlaps its pan / spatula
      const score = d - (e.type === 'steak' ? 0.03 : 0);
      if (score < bestD) {
        bestD = score;
        best = e;
      }
    }
    return best;
  }

  // ---------------------------------------------------------------- grab / release

  squeezeStart(h) {
    h.squeezing = true;
    if (h.held) return;
    const e = this.findTarget(h);
    if (!e) return;
    this.pulse(h, 0.4, 40);

    if (e.grabKind === 'item') {
      this.game.dispatch({ type: 'item/grab', id: e.id, hand: h.side });
      const o = e.object3d;
      this.game.scene.attach(o); // lift it off the pan / spatula / hook
      h.grip.updateMatrixWorld();
      // pose of the item relative to the hand, kept for as long as it's held
      const offset = new THREE.Matrix4().copy(h.grip.matrixWorld).invert().multiply(o.matrixWorld);
      h.held = { entity: e, kind: 'item', offset };
    } else if (e.grabKind === 'knob') {
      const axis = new THREE.Vector3();
      e.knob.getWorldDirection(axis); // knob's +Z, pointing out of the stove
      h.held = { entity: e, kind: 'knob', axis, ref: this.wristVector(h, axis), heat: e.state.heat, sent: e.state.heat };
    }
  }

  squeezeEnd(h) {
    h.squeezing = false;
    const held = h.held;
    if (!held) return;
    h.held = null;
    if (held.kind === 'knob') {
      this.sendHeat(held, true);
      return;
    }
    // a steak sitting on the spatula drops together with it, but lands on its own
    if (held.entity.type === 'spatula') {
      for (const s of this.riders(held.entity)) this.drop(s);
    }
    this.drop(held.entity);
  }

  // ---------------------------------------------------------------- held items + colliders

  /** Move a held item to follow the hand, then push it out of any collider. */
  updateHeldItem(h) {
    const o = h.held.entity.object3d;
    h.grip.updateMatrixWorld();
    _m.multiplyMatrices(h.grip.matrixWorld, h.held.offset);
    _m.decompose(o.position, o.quaternion, o.scale);
    _a.copy(o.position); // where the hand wants it
    this.resolveCollisions(h.held.entity, h.held.last);
    h.held.last = o.position.clone();
    if (o.position.distanceTo(_a) > MAX_HAND_OFFSET) this.squeezeEnd(h); // hand went deep into a counter
  }

  /**
   * Push the item's collision boxes out of the static colliders.
   * `last` (previous resolved position) tells us which side it came from, so a pan
   * lowered onto a counter gets stopped on top instead of popping out sideways.
   */
  resolveCollisions(item, last) {
    const o = item.object3d;
    if (!item.collisionBoxes.length) return;
    const from = last ? _v.subVectors(last, o.position) : _v.set(0, 0, 0); // shift back to last frame
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const local of item.collisionBoxes) {
        o.updateMatrixWorld(); // earlier boxes may have moved the item already
        const b = _box.copy(local).applyMatrix4(o.matrixWorld);
        for (const c of this.colliders) {
          if (!b.intersectsBox(c)) continue;
          const push = this.pushOut(b, c, from);
          o.position.add(push);
          b.translate(push);
          from.sub(push);
          moved = true;
        }
      }
      if (!moved) break;
    }
  }

  /** Smallest push that separates box b from collider c, preferring the side it came from. */
  pushOut(b, c, from) {
    const eps = 0.0005;
    const prevMinY = b.min.y + from.y;
    const prevMaxY = b.max.y + from.y;
    if (prevMinY >= c.max.y - 0.004) return new THREE.Vector3(0, c.max.y - b.min.y + eps, 0); // came from above
    if (prevMaxY <= c.min.y + 0.004) return new THREE.Vector3(0, c.min.y - b.max.y - eps, 0); // from below
    const opts = [
      [c.max.x - b.min.x + eps, 'x', 1],
      [b.max.x - c.min.x + eps, 'x', -1],
      [c.max.y - b.min.y + eps, 'y', 1],
      [b.max.y - c.min.y + eps, 'y', -1],
      [c.max.z - b.min.z + eps, 'z', 1],
      [b.max.z - c.min.z + eps, 'z', -1],
    ];
    opts.sort((p, q) => p[0] - q[0]);
    const [d, axis, sign] = opts[0];
    const v = new THREE.Vector3();
    v[axis] = d * sign;
    return v;
  }

  // ---------------------------------------------------------------- spatula

  /** Steaks currently sitting on this spatula. */
  riders(spatula) {
    return [...this.game.entities.values()].filter((e) => e.state.on === spatula.id && !this.isHeld(e));
  }

  updateSpatula(spatula) {
    spatula.bladeNormal(_n);
    const riders = this.riders(spatula);

    // tipped over with a steak on it -> flip!
    if (riders.length && _n.y < FLIP_TILT) {
      for (const s of riders) this.flip(s, _n);
      return;
    }

    // blade flat and under a resting steak -> scoop it up
    if (_n.y < SCOOP_FLAT) return;
    const blade = spatula.blade;
    blade.updateMatrixWorld();
    _m.copy(blade.matrixWorld).invert();
    for (const e of this.game.entities.values()) {
      if (e.type !== 'steak' || this.isHeld(e) || e.state.on === spatula.id) continue;
      e.object3d.getWorldPosition(_p).applyMatrix4(_m); // steak centre in blade space
      const onBlade = Math.abs(_p.x) < 0.06 && _p.z < 0.01 && _p.z > -0.13;
      const justAbove = _p.y > 0 && _p.y < 0.03; // blade is under the steak, not on top of it
      if (onBlade && justAbove) this.scoop(e, spatula);
    }
  }

  scoop(steak, spatula) {
    const o = steak.object3d;
    const blade = spatula.blade;
    // sit it flat on the blade, keeping its heading and which side is up
    o.getWorldPosition(_p);
    blade.worldToLocal(_p);
    _p.y = 0.011;
    blade.localToWorld(_p);
    const bladeQuat = blade.getWorldQuaternion(new THREE.Quaternion());
    const inBlade = bladeQuat.clone().invert().multiply(o.getWorldQuaternion(new THREE.Quaternion()));
    const restWorld = bladeQuat.multiply(steak.restQuaternion(inBlade));
    // express in the spatula's space (its `on` parent)
    const sp = spatula.object3d;
    sp.updateMatrixWorld();
    const pos = sp.worldToLocal(_p.clone());
    const quat = sp.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(restWorld);
    this.game.dispatch({ type: 'item/place', id: steak.id, on: spatula.id, pos: round(pos.toArray()), quat: round(quat.toArray()) });
    const h = this.hands.find((x) => x.held?.entity === spatula);
    if (h) this.pulse(h, 0.3, 25);
  }

  /** Toss the steak off the blade, turning it over around the tilt axis. */
  flip(steak, bladeNormal) {
    const o = steak.object3d;
    this.game.scene.attach(o);
    // axis we're tipping around: horizontal, perpendicular to the blade's lean
    const axis = new THREE.Vector3(bladeNormal.z, 0, -bladeNormal.x);
    if (axis.lengthSq() < 1e-6) axis.set(1, 0, 0);
    axis.normalize();
    const flipped = new THREE.Quaternion().setFromAxisAngle(axis, Math.PI).multiply(o.quaternion);
    this.drop(steak, { worldQuat: flipped, toss: FLIP_TOSS });
  }

  // ---------------------------------------------------------------- knobs

  /** Hand "up" direction projected onto the knob's face plane: twisting rotates this. */
  wristVector(h, axis) {
    h.grip.getWorldQuaternion(_q);
    const v = new THREE.Vector3(0, 1, 0).applyQuaternion(_q);
    v.addScaledVector(axis, -v.dot(axis));
    if (v.lengthSq() < 0.05) {
      v.set(1, 0, 0).applyQuaternion(_q);
      v.addScaledVector(axis, -v.dot(axis));
    }
    return v.normalize();
  }

  updateKnob(h) {
    const held = h.held;
    held.entity.knob.getWorldPosition(_a);
    h.hand.grabPoint.getWorldPosition(_p);
    if (_p.distanceTo(_a) > KNOB_LET_GO) {
      this.squeezeEnd(h);
      return;
    }
    const cur = this.wristVector(h, held.axis);
    // signed angle from the previous wrist vector to the current one, around the knob axis
    _v.crossVectors(held.ref, cur);
    const delta = Math.atan2(_v.dot(held.axis), held.ref.dot(cur));
    held.ref = cur;
    // knob rotation.z = -heat * RANGE, so a positive (counter-clockwise) twist lowers the heat
    const before = held.heat;
    held.heat = THREE.MathUtils.clamp(held.heat - delta / KNOB_RANGE, 0, 1);
    const crossed = before >= HEAT_ON_THRESHOLD !== held.heat >= HEAT_ON_THRESHOLD;
    if (crossed) this.pulse(h, 0.6, 30); // the "click" of the gas igniting / shutting off
    this.sendHeat(held, crossed);
  }

  sendHeat(held, force) {
    let heat = held.heat;
    if (heat < HEAT_ON_THRESHOLD) heat = 0;
    if (!force && Math.abs(heat - held.sent) < HEAT_SEND_STEP) return;
    if (heat === held.entity.state.heat) return;
    held.sent = heat;
    this.game.dispatch({ type: 'burner/setHeat', id: held.entity.id, heat: Math.round(heat * 100) / 100 });
  }

  // ---------------------------------------------------------------- dropping

  /**
   * Work out where an item lands and send that as an 'item/place' action.
   * opts.worldQuat: orientation to land from (default: current); opts.toss: upward speed.
   */
  drop(item, { worldQuat, toss = 0 } = {}) {
    const o = item.object3d;
    const scene = this.game.scene;
    scene.attach(o); // back to world space (keeps the pose)

    const fromQuat = worldQuat ?? o.quaternion.clone();
    const restQuat = item.restQuaternion(fromQuat);

    // ray straight down from just above the item's centre
    _box.setFromObject(o);
    _box.getCenter(_p);
    this.raycaster.set(_p.set(_p.x, _box.max.y + 0.02, _p.z), _down);
    this.raycaster.far = 5;
    const hit = this.raycaster.intersectObjects(scene.children, true).find((x) => !this.ignoreForDrop(x.object, o));
    const floorY = hit ? hit.point.y : 0;

    // support: an entity that accepts this kind of item (e.g. steak -> pan)
    let support = null;
    for (let x = hit?.object; x; x = x.parent) {
      const id = x.userData.entityId;
      if (id) {
        const e = this.game.get(id);
        if (e?.accepts?.includes(item.type)) support = e;
        break;
      }
    }

    // rest height: rotate into the rest orientation, then sit the bounding box on the surface
    const keepQuat = o.quaternion.clone();
    o.quaternion.copy(restQuat);
    _box.setFromObject(o);
    const pos = o.position.clone();
    pos.y += floorY - _box.min.y;
    o.quaternion.copy(keepQuat); // the item animates into place itself

    let quat = restQuat;
    if (support) {
      support.object3d.updateMatrixWorld();
      support.object3d.worldToLocal(pos);
      quat = support.object3d.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(restQuat);
    }
    this.game.dispatch({
      type: 'item/place',
      id: item.id,
      on: support?.id ?? null,
      pos: round(pos.toArray()),
      quat: round(quat.toArray()),
      toss,
    });
  }

  ignoreForDrop(obj, dropping) {
    for (let x = obj; x; x = x.parent) {
      if (x === dropping || x.userData.noRaycast || x.isLine) return true;
      const id = x.userData.entityId;
      if (id && this.isHeld(this.game.get(id))) return true; // things in someone's hand
    }
    return false;
  }

  pulse(h, intensity, ms) {
    h.inputSource?.gamepad?.hapticActuators?.[0]?.pulse?.(intensity, ms);
  }

  // ---------------------------------------------------------------- per frame

  update(dt) {
    for (const h of this.hands) {
      const pad = h.inputSource?.gamepad;
      const squeeze = pad?.buttons[1]?.value ?? (h.squeezing ? 1 : 0);
      const trigger = pad?.buttons[0]?.value ?? 0;
      if (h.held?.kind === 'knob') this.updateKnob(h);
      if (h.held?.kind === 'item') {
        this.updateHeldItem(h);
        if (h.held?.entity.type === 'spatula') this.updateSpatula(h.held.entity);
      }
      // holding something keeps the hand closed around it
      const gripTarget = h.held?.kind === 'item' ? 1 : h.held?.kind === 'knob' ? 0.75 : squeeze;
      h.hand.update(dt, gripTarget, trigger);
    }
  }
}
