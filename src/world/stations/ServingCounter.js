import * as THREE from 'three';
import { M } from '../materials.js';
import { box, cyl, cabinet } from '../helpers.js';

const W = 1.4;
const D = 0.65;
const H = 0.9;
export const SHELF_Y = 1.72;
const SHELF_Z = -0.12;

/**
 * Serving counter behind the player, with a hanging shelf above it.
 * Orders (Ring 2) will clip onto the ticket rail; tools hang underneath.
 * Front faces local +Z.
 */
export function buildServingCounter({ ceilingY }) {
  const g = new THREE.Group();
  g.name = 'station.serving';

  g.add(cabinet({ w: W, d: D, h: H, body: M.orange(), top: M.stone(), doors: 3 }));

  // serving spot: plate on a steel pass tray
  box(0.5, 0.012, 0.38, M.steel(), 0.3, H + 0.006, 0.02, g);
  cyl(0.12, 0.1, 0.015, 12, M.plate(), 0.3, H + 0.02, 0.02, g);

  // hanging shelf, rods to the ceiling
  box(1.2, 0.04, 0.3, M.woodLight(), 0, SHELF_Y, SHELF_Z, g);
  for (const x of [-0.55, 0.55]) {
    const len = ceilingY - SHELF_Y;
    cyl(0.008, 0.008, len, 6, M.steelDark(), x, SHELF_Y + len / 2, SHELF_Z, g);
  }
  // ticket rail along the shelf front (orders go here in Ring 2)
  box(1.2, 0.04, 0.012, M.steel(), 0, SHELF_Y - 0.01, SHELF_Z + 0.156, g);

  // tool rail under the shelf (tongs hang here, see Kitchen.js)
  const railY = SHELF_Y - 0.09;
  const rail = cyl(0.008, 0.008, 1.1, 6, M.steelDark(), 0, railY, SHELF_Z + 0.05, g);
  rail.rotation.z = Math.PI / 2;
  for (const x of [-0.5, 0.5]) box(0.01, 0.08, 0.01, M.steelDark(), x, railY + 0.04, SHELF_Z + 0.05, g);

  // spatula
  const spat = new THREE.Group();
  spat.position.set(0.0, railY - 0.01, SHELF_Z + 0.05);
  cyl(0.008, 0.008, 0.2, 6, M.black(), 0, -0.1, 0, spat);
  box(0.08, 0.1, 0.004, M.steel(), 0, -0.25, 0, spat);
  g.add(spat);

  // where the tongs hang, in this station's local space
  const tongsHook = new THREE.Object3D();
  tongsHook.position.set(-0.25, railY - 0.01, SHELF_Z + 0.05);
  tongsHook.userData.dynamic = true; // keep it out of the merge so we can read its world pose
  g.add(tongsHook);

  return { group: g, tongsHook, topY: H };
}
