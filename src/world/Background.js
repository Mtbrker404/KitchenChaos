import * as THREE from 'three';
import { M } from './materials.js';
import { box, cyl, cabinet, faceCenter, seededRandom } from './helpers.js';
import { ROOM } from './Room.js';

// Low-poly kitchen "set dressing" around the play area: counters along every
// wall, a couple of background islands and some clutter. Purely static.
export function buildBackground() {
  const g = new THREE.Group();
  const rand = seededRandom(42); // fixed seed: identical kitchen on every client
  const half = ROOM.size / 2;
  const depth = 0.62;
  const inset = half - depth / 2 - 0.02;
  const bodies = [M.wood(), M.woodDark(), M.orange(), M.wood()];
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const clutter = (parent, topY) => {
    const r = rand();
    if (r < 0.25) cyl(0.12, 0.11, 0.18, 8, M.steel(), (rand() - 0.5) * 0.5, topY + 0.09, 0, parent);
    else if (r < 0.45) box(0.25, 0.2, 0.25, M.woodLight(), (rand() - 0.5) * 0.5, topY + 0.1, -0.05, parent);
    else if (r < 0.6) box(0.4, 0.02, 0.28, M.board(), 0, topY + 0.01, 0, parent);
    else if (r < 0.7) cyl(0.1, 0.1, 0.03, 10, M.plate(), 0.1, topY + 0.015, 0, parent);
  };

  // counters along the four walls (door gap on the wall behind the player)
  const slots = [-3.15, -2.25, -1.35, -0.45, 0.45, 1.35, 2.25, 3.15];
  const walls = [
    (s) => [s, -inset],
    (s) => [s, inset],
    (s) => [-inset, s],
    (s) => [inset, s],
  ];
  walls.forEach((pos, wi) => {
    for (const s of slots) {
      if (wi === 1 && Math.abs(s) < 1) continue; // doorway
      const c = cabinet({ w: 0.9, d: depth, body: pick(bodies), top: M.stone() });
      const [x, z] = pos(s);
      faceCenter(c, x, z);
      clutter(c, 0.9);
      // upper wall cabinets on the side walls
      if (wi >= 2 && rand() < 0.7) box(0.86, 0.6, 0.35, pick(bodies), 0, 1.95, -depth / 2 + 0.175, c);
      g.add(c);
    }
  });

  // doorway frame on the back wall
  box(1.5, 2.2, 0.06, M.woodDark(), 0, 1.1, half - 0.03, g);
  box(1.3, 2.05, 0.07, M.ceiling(), 0, 1.03, half - 0.03, g);

  // tall fridges in the corners
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const f = new THREE.Group();
    box(0.75, 2.0, 0.65, M.steel(), 0, 1.0, 0, f);
    box(0.02, 0.6, 0.03, M.steelDark(), 0.3, 1.3, 0.34, f);
    box(0.73, 0.01, 0.01, M.steelDark(), 0, 1.45, 0.33, f);
    faceCenter(f, x * (half - 0.45), z * (half - 0.45));
    g.add(f);
  }

  // two background islands, like low-poly copies of the player's kitchen
  for (const side of [-1, 1]) {
    const island = new THREE.Group();
    const a = cabinet({ w: 1.6, d: 0.8, body: pick(bodies), top: M.steel(), doors: 3 });
    island.add(a);
    box(0.7, 0.01, 0.5, M.stoveTop(), -0.35, 0.905, 0, island);
    for (const [bx, bz] of [[-0.53, -0.12], [-0.17, -0.12], [-0.53, 0.12], [-0.17, 0.12]]) {
      cyl(0.07, 0.07, 0.02, 8, M.castIron(), bx, 0.92, bz, island);
    }
    cyl(0.13, 0.12, 0.2, 8, M.red(), -0.53, 1.03, -0.12, island);
    box(0.4, 0.02, 0.3, M.board(), 0.4, 0.91, 0, island);
    faceCenter(island, side * 2.7, -0.4);
    island.rotation.y += side * 0.0;
    g.add(island);
  }

  return g;
}
