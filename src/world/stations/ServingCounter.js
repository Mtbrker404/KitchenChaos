import * as THREE from 'three';
import { M } from '../materials.js';
import { box, cyl, cabinet } from '../helpers.js';
import { Tongs } from '../../entities/Tongs.js';

const W = 1.4;
const D = 0.65;
const H = 0.9;
const SHELF_Y = 1.72;

/**
 * Serving counter behind the player, with a hanging shelf above it.
 * Orders (Ring 2) will clip onto the ticket rail; tools hang underneath.
 * Front faces local +Z.
 */
export function buildServingCounter(game, { ceilingY }) {
  const g = new THREE.Group();
  g.name = 'station.serving';

  g.add(cabinet({ w: W, d: D, h: H, body: M.orange(), top: M.stone(), doors: 3 }));

  // serving spot: plate on a steel pass tray
  box(0.5, 0.012, 0.38, M.steel(), 0.3, H + 0.006, 0.02, g);
  cyl(0.12, 0.1, 0.015, 12, M.plate(), 0.3, H + 0.02, 0.02, g);
  // small board + bell for the pass
  box(0.3, 0.02, 0.2, M.board(), -0.4, H + 0.01, -0.05, g);
  const bell = cyl(0.01, 0.045, 0.04, 8, M.steel(), -0.12, H + 0.02, -0.15, g);
  bell.castShadow = true;

  // hanging shelf, rods to the ceiling
  const shelfZ = -0.12;
  box(1.2, 0.04, 0.3, M.woodLight(), 0, SHELF_Y, shelfZ, g);
  for (const x of [-0.55, 0.55]) {
    const len = ceilingY - SHELF_Y;
    cyl(0.008, 0.008, len, 6, M.steelDark(), x, SHELF_Y + len / 2, shelfZ, g);
  }
  // stuff on the shelf
  box(0.12, 0.12, 0.12, M.orange(), -0.4, SHELF_Y + 0.08, shelfZ, g);
  box(0.16, 0.16, 0.14, M.red(), 0.05, SHELF_Y + 0.1, shelfZ, g);
  cyl(0.05, 0.05, 0.1, 8, M.cream(), 0.35, SHELF_Y + 0.07, shelfZ, g);
  cyl(0.04, 0.04, 0.14, 8, M.woodDark(), 0.48, SHELF_Y + 0.09, shelfZ, g);

  // ticket rail along the shelf front (orders go here in Ring 2)
  box(1.2, 0.04, 0.012, M.steel(), 0, SHELF_Y - 0.01, shelfZ + 0.156, g);

  // tool rail under the shelf + hanging tools
  const railY = SHELF_Y - 0.09;
  const rail = cyl(0.008, 0.008, 1.1, 6, M.steelDark(), 0, railY, shelfZ + 0.05, g);
  rail.rotation.z = Math.PI / 2;
  for (const x of [-0.5, 0.5]) box(0.01, 0.08, 0.01, M.steelDark(), x, railY + 0.04, shelfZ + 0.05, g);

  const tongs = game.add(new Tongs('tongs.0'));
  tongs.object3d.position.set(-0.25, railY - 0.01, shelfZ + 0.05);
  g.add(tongs.object3d);

  // spatula
  const spat = new THREE.Group();
  spat.position.set(0.0, railY - 0.01, shelfZ + 0.05);
  cyl(0.008, 0.008, 0.2, 6, M.black(), 0, -0.1, 0, spat);
  box(0.08, 0.1, 0.004, M.steel(), 0, -0.25, 0, spat);
  g.add(spat);

  // ladle
  const ladle = new THREE.Group();
  ladle.position.set(0.2, railY - 0.01, shelfZ + 0.05);
  cyl(0.006, 0.006, 0.26, 6, M.steel(), 0, -0.13, 0, ladle);
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.steel());
  bowl.position.y = -0.27;
  ladle.add(bowl);
  g.add(ladle);

  // small copper pan hanging by its handle
  const hp = new THREE.Group();
  hp.position.set(0.42, railY - 0.01, shelfZ + 0.05);
  box(0.02, 0.14, 0.006, M.woodDark(), 0, -0.07, 0, hp);
  const disc = cyl(0.09, 0.09, 0.03, 10, M.orange(), 0, -0.23, 0, hp);
  disc.rotation.x = Math.PI / 2;
  g.add(hp);

  return { group: g, tongs, topY: H };
}
