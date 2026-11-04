import * as THREE from 'three';
import { M } from '../materials.js';
import { box, cyl } from '../helpers.js';

const W = 1.2;
const D = 0.65;
const H = 0.9;

/** Steel prep / chopping table (left of the player). Ingredients spawn here later. Front faces local +Z. */
export function buildPrepCounter() {
  const g = new THREE.Group();
  g.name = 'station.prep';

  // open steel table: top, legs, under-shelf
  box(W, 0.04, D, M.steel(), 0, H - 0.02, 0, g);
  box(W, 0.06, 0.02, M.steel(), 0, H - 0.07, D / 2 - 0.01, g);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(0.04, H - 0.04, 0.04, M.steel(), x * (W / 2 - 0.04), (H - 0.04) / 2, z * (D / 2 - 0.04), g);
  }
  box(W - 0.04, 0.02, D - 0.04, M.steelDark(), 0, 0.2, 0, g);
  // some stock on the under-shelf
  box(0.3, 0.2, 0.3, M.woodLight(), -0.3, 0.31, 0, g);
  box(0.25, 0.15, 0.25, M.woodLight(), 0.05, 0.285, 0.05, g);
  cyl(0.1, 0.1, 0.22, 8, M.steel(), 0.35, 0.32, 0, g);
  box(W, 0.35, 0.03, M.steel(), 0, H + 0.175, -D / 2 + 0.015, g); // upstand

  // chopping area: board, knife, tomatoes
  box(0.42, 0.025, 0.3, M.board(), -0.15, H + 0.0125, 0.03, g);
  const knife = new THREE.Group();
  knife.position.set(-0.08, H + 0.03, 0.08);
  knife.rotation.y = 0.4;
  box(0.16, 0.004, 0.035, M.steel(), 0.08, 0, 0, knife);
  box(0.1, 0.018, 0.022, M.black(), -0.05, 0.005, 0, knife);
  g.add(knife);

  const tomatoGeo = new THREE.IcosahedronGeometry(0.035, 0);
  for (const [x, z] of [[-0.25, -0.03], [0.3, 0.05], [0.37, -0.06]]) {
    const t = new THREE.Mesh(tomatoGeo, M.tomato());
    t.scale.y = 0.85;
    t.position.set(x, H + (x < 0 ? 0.025 : 0) + 0.03, z);
    t.castShadow = true;
    g.add(t);
    box(0.02, 0.008, 0.02, M.leaf(), x, t.position.y + 0.03, z, g);
  }

  // ingredient spawn tray (Ring 3 spawns food here)
  box(0.36, 0.01, 0.28, M.steelDark(), 0.33, H + 0.005, 0, g);

  return { group: g, topY: H };
}
