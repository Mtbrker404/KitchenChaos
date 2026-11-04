import * as THREE from 'three';
import { M } from '../materials.js';
import { box, cyl, cabinet } from '../helpers.js';

const W = 1.0;
const D = 0.65;
const H = 0.9;

/** Sink counter (right of the player). Front faces local +Z. */
export function buildSink() {
  const g = new THREE.Group();
  g.name = 'station.sink';

  // cabinet without its solid top, then a steel top with a hole for the basin
  const cab = cabinet({ w: W, d: D, h: H, body: M.grey(), top: M.steel() });
  cab.remove(cab.children[2]); // drop the solid top slab
  g.add(cab);

  const t = 0.04;
  const y = H - t / 2;
  const hole = { x0: -0.25, x1: 0.25, z0: -0.16, z1: 0.2 };
  const L = -W / 2 - 0.015;
  const R = W / 2 + 0.015;
  const F = D / 2 + 0.02;
  const B = -D / 2;
  box(hole.x0 - L, t, F - B, M.steel(), (L + hole.x0) / 2, y, (F + B) / 2, g);
  box(R - hole.x1, t, F - B, M.steel(), (R + hole.x1) / 2, y, (F + B) / 2, g);
  box(hole.x1 - hole.x0, t, F - hole.z1, M.steel(), 0, y, (F + hole.z1) / 2, g);
  box(hole.x1 - hole.x0, t, hole.z0 - B, M.steel(), 0, y, (hole.z0 + B) / 2, g);

  // basin: floor + 4 walls
  const depth = 0.2;
  const bw = hole.x1 - hole.x0;
  const bd = hole.z1 - hole.z0;
  const bz = (hole.z0 + hole.z1) / 2;
  box(bw, 0.01, bd, M.steelDark(), 0, H - depth, bz, g);
  box(bw, depth, 0.01, M.steel(), 0, H - depth / 2, hole.z1 - 0.005, g);
  box(bw, depth, 0.01, M.steel(), 0, H - depth / 2, hole.z0 + 0.005, g);
  box(0.01, depth, bd, M.steel(), hole.x0 + 0.005, H - depth / 2, bz, g);
  box(0.01, depth, bd, M.steel(), hole.x1 - 0.005, H - depth / 2, bz, g);
  cyl(0.025, 0.025, 0.004, 8, M.black(), 0, H - depth + 0.007, bz, g); // drain

  // gooseneck faucet
  const fz = -0.25;
  cyl(0.028, 0.032, 0.04, 8, M.steel(), 0, H + 0.02, fz, g);
  cyl(0.013, 0.013, 0.3, 8, M.steel(), 0, H + 0.19, fz, g);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.013, 6, 10, Math.PI), M.steel());
  neck.rotation.y = Math.PI / 2;
  neck.position.set(0, H + 0.34, fz + 0.08);
  neck.castShadow = true;
  g.add(neck);
  cyl(0.013, 0.016, 0.05, 8, M.steel(), 0, H + 0.315, fz + 0.16, g);
  for (const x of [-0.09, 0.09]) {
    cyl(0.015, 0.018, 0.03, 6, M.steel(), x, H + 0.015, fz, g);
    box(0.05, 0.01, 0.012, M.steel(), x * 1.25, H + 0.035, fz, g);
  }

  // backsplash
  box(W, 0.4, 0.03, M.cream(), 0, H + 0.2, -D / 2 + 0.015, g);

  return { group: g, topY: H };
}
