import * as THREE from 'three';
import { M } from '../materials.js';
import { box } from '../helpers.js';

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
  box(W, 0.35, 0.03, M.steel(), 0, H + 0.175, -D / 2 + 0.015, g); // upstand

  // chopping board
  box(0.42, 0.025, 0.3, M.board(), -0.15, H + 0.0125, 0.03, g);

  return { group: g, topY: H };
}
