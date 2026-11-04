import * as THREE from 'three';
import { Entity } from '../core/Entity.js';
import { M } from '../world/materials.js';
import { box, cyl, mergeStatic } from '../world/helpers.js';

const FLAME_COUNT = 10;
const flameMat = new THREE.MeshBasicMaterial({
  color: 0x4f9bff,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const flameTipMat = new THREE.MeshBasicMaterial({
  color: 0xffa040,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});

/** Grate height above the stove top: where pans sit. */
export const GRATE_TOP = 0.05;

// Gas burner. Origin = centre of the burner on the stove-top surface.
// state: { on: boolean }
export class Burner extends Entity {
  constructor(id, { on = true } = {}) {
    super(id, 'burner');
    // Build into a temp group, then merge to a few meshes (draw calls matter on Pico).
    const g = new THREE.Group();

    cyl(0.11, 0.11, 0.006, 10, M.steelDark(), 0, 0.003, 0, g); // drip tray
    cyl(0.055, 0.06, 0.022, 10, M.castIron(), 0, 0.011, 0, g); // burner head
    cyl(0.038, 0.04, 0.01, 10, M.black(), 0, 0.027, 0, g); // cap

    // grate: square frame + cross, sitting on 4 feet
    const s = 0.13;
    const t = 0.012;
    const y = GRATE_TOP - t / 2;
    box(2 * s, t, t, M.castIron(), 0, y, s, g);
    box(2 * s, t, t, M.castIron(), 0, y, -s, g);
    box(t, t, 2 * s, M.castIron(), s, y, 0, g);
    box(t, t, 2 * s, M.castIron(), -s, y, 0, g);
    box(2 * s, t, t, M.castIron(), 0, y, 0, g).rotation.y = Math.PI / 4;
    box(2 * s, t, t, M.castIron(), 0, y, 0, g).rotation.y = -Math.PI / 4;
    for (const [fx, fz] of [[s, s], [-s, s], [s, -s], [-s, -s]]) box(t, GRATE_TOP, t, M.castIron(), fx, GRATE_TOP / 2, fz, g);

    this.object3d.add(mergeStatic(g));

    // flames: ring of small cones around the head, split into two merged
    // halves that flicker out of sync
    const cone = new THREE.ConeGeometry(0.009, 0.035, 4);
    const tip = new THREE.ConeGeometry(0.005, 0.02, 4);
    this.flames = [0, 1].map((half) => {
      const ring = new THREE.Group();
      for (let i = half; i < FLAME_COUNT; i += 2) {
        const a = (i / FLAME_COUNT) * Math.PI * 2;
        const f = new THREE.Group();
        f.position.set(Math.cos(a) * 0.05, 0.03, Math.sin(a) * 0.05);
        f.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); // lean outward
        const base = new THREE.Mesh(cone, flameMat);
        base.position.y = 0.0175;
        const top = new THREE.Mesh(tip, flameTipMat);
        top.position.y = 0.035;
        f.add(base, top);
        ring.add(f);
      }
      const merged = mergeStatic(ring);
      merged.traverse((o) => (o.castShadow = o.receiveShadow = false));
      merged.userData.phase = Math.random() * 10;
      this.object3d.add(merged);
      return merged;
    });

    // Fake glow disc instead of a real light: toggling real lights forces a
    // shader recompile (stutter) and every light costs fill-rate on Pico.
    this.glow = new THREE.Mesh(new THREE.CircleGeometry(0.075, 12), flameTipMat);
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.023;
    this.object3d.add(this.glow);

    this.knob = null;
    this.setState({ on });
  }

  /** The knob lives on the stove front, but clicking it controls this burner. */
  attachKnob(knob) {
    this.knob = this.tag(knob);
    knob.traverse((o) => this.tag(o));
    this.onStateChanged();
  }

  onStateChanged() {
    for (const f of this.flames) f.visible = this.state.on;
    this.glow.visible = this.state.on;
    if (this.knob) this.knob.rotation.z = this.state.on ? -Math.PI / 2 : 0;
  }

  update(_dt, time) {
    if (!this.state.on) return;
    for (const f of this.flames) {
      const p = f.userData.phase;
      f.scale.y = 0.8 + 0.25 * Math.sin(time * 23 + p) + 0.15 * Math.sin(time * 41 + p * 2);
    }
  }

  interact() {
    return { type: 'burner/setOn', id: this.id, on: !this.state.on };
  }
}

/** A stove knob, front facing +Z. Pointer at 12 o'clock = off. */
export function makeKnob() {
  const knob = new THREE.Group();
  const dial = cyl(0.024, 0.026, 0.025, 10, M.black(), 0, 0, 0, knob);
  dial.rotation.x = Math.PI / 2;
  box(0.008, 0.03, 0.012, M.steel(), 0, 0.006, 0.016, knob);
  return knob;
}
