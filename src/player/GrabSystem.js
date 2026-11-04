import * as THREE from 'three';
import { HEAT_ON_THRESHOLD, KNOB_RANGE } from '../entities/Burner.js';

const GRAB_RADIUS = 0.07; // how close the palm must be to an object's bounds
const KNOB_LET_GO = 0.18; // pulling the hand this far from a knob releases it
const HEAT_SEND_STEP = 0.02; // only send knob changes bigger than this (network-friendly)

const _box = new THREE.Box3();
const _p = new THREE.Vector3();
const _a = new THREE.Vector3();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _down = new THREE.Vector3(0, -1, 0);

/**
 * Grip button = grab. Handles two kinds of grabbable entities:
 *  - 'item' (pan, steak, tongs): follows the hand, dropped onto the surface below on release
 *  - 'knob' (stove burners):     grab, then twist your wrist to set the heat
 *
 * All game-state changes go through game.dispatch(), so the same actions can
 * be sent to other players later. The hand-follow itself is only visual.
 */
export class GrabSystem {
  constructor({ engine, game }) {
    this.engine = engine;
    this.game = game;
    this.raycaster = new THREE.Raycaster();
    this.hands = []; // { side, hand, grip, inputSource, held: null | {entity, kind, ...} }
  }

  addHand(side, hand, grip) {
    const h = { side, hand, grip, inputSource: null, held: null, squeezing: false };
    this.hands.push(h);
    return h;
  }

  /** Nearest grabbable entity within reach of this hand's palm. */
  findTarget(h) {
    h.hand.grabPoint.getWorldPosition(_p);
    let best = null;
    let bestD = GRAB_RADIUS;
    for (const e of this.game.entities.values()) {
      if (!e.grabKind) continue;
      if (e.state.held && e.state.held !== h.side) continue;
      if (this.hands.some((o) => o.held?.entity === e)) continue;
      const target = e.grabTarget();
      if (!target) continue;
      const d = _box.setFromObject(target).distanceToPoint(_p);
      // prefer the smaller / top-most thing when overlapping (steak over pan)
      const score = d - (e.type === 'steak' ? 0.03 : 0);
      if (score < bestD) {
        bestD = score;
        best = e;
      }
    }
    return best;
  }

  squeezeStart(h) {
    h.squeezing = true;
    if (h.held) return;
    const e = this.findTarget(h);
    if (!e) return;
    this.pulse(h, 0.4, 40);

    if (e.grabKind === 'item') {
      this.game.dispatch({ type: 'item/grab', id: e.id, hand: h.side });
      h.grip.attach(e.object3d); // follows the controller from now on
      h.held = { entity: e, kind: 'item' };
    } else if (e.grabKind === 'knob') {
      const axis = new THREE.Vector3();
      e.knob.getWorldDirection(axis); // knob's +Z, pointing out of the stove
      h.held = {
        entity: e,
        kind: 'knob',
        axis,
        ref: this.wristVector(h, axis),
        heat: e.state.heat,
        sent: e.state.heat,
      };
    }
  }

  squeezeEnd(h) {
    h.squeezing = false;
    const held = h.held;
    if (!held) return;
    h.held = null;
    if (held.kind === 'item') this.drop(held.entity);
    if (held.kind === 'knob') this.sendHeat(held, true);
  }

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
    const knob = held.entity.knob;
    knob.getWorldPosition(_a);
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
    const crossed = (before >= HEAT_ON_THRESHOLD) !== (held.heat >= HEAT_ON_THRESHOLD);
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

  /** Work out where a released item lands and send that as an 'item/place' action. */
  drop(item) {
    const o = item.object3d;
    const scene = this.game.scene;
    scene.attach(o); // back to world space (keeps the pose)

    const worldQuat = o.quaternion.clone();
    const restQuat = item.restQuaternion(worldQuat);

    // ray straight down from just above the item's centre
    _box.setFromObject(o);
    _box.getCenter(_p);
    this.raycaster.set(_p.set(_p.x, _box.max.y + 0.02, _p.z), _down);
    this.raycaster.far = 5;
    const hit = this.raycaster
      .intersectObjects(scene.children, true)
      .find((h) => !this.ignoreForDrop(h.object, o));
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
    o.quaternion.copy(restQuat);
    _box.setFromObject(o);
    const pos = o.position.clone();
    pos.y += floorY - _box.min.y;
    o.quaternion.copy(worldQuat); // let the item animate into place itself

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
      pos: pos.toArray().map((n) => Math.round(n * 1e4) / 1e4),
      quat: quat.toArray().map((n) => Math.round(n * 1e4) / 1e4),
    });
  }

  ignoreForDrop(obj, held) {
    for (let x = obj; x; x = x.parent) {
      if (x === held || x.userData.noRaycast || x.isLine) return true;
    }
    return false;
  }

  pulse(h, intensity, ms) {
    h.inputSource?.gamepad?.hapticActuators?.[0]?.pulse?.(intensity, ms);
  }

  update(dt) {
    for (const h of this.hands) {
      const pad = h.inputSource?.gamepad;
      const squeeze = pad?.buttons[1]?.value ?? (h.squeezing ? 1 : 0);
      const trigger = pad?.buttons[0]?.value ?? 0;
      if (h.held?.kind === 'knob') this.updateKnob(h);
      // holding something keeps the hand closed around it
      const gripTarget = h.held?.kind === 'item' ? 1 : h.held?.kind === 'knob' ? 0.75 : squeeze;
      h.hand.update(dt, gripTarget, trigger);
    }
  }
}
