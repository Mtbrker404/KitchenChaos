import * as THREE from 'three';
import { M } from '../materials.js';
import { box, cyl } from '../helpers.js';
import { Burner, makeKnob } from '../../entities/Burner.js';

const W = 1.0;
const D = 0.65;
const H = 0.9;

// Burner layout (local, front = +Z):  2 3   (back)
//                                     0 1   (front)
const BURNERS = [
  [-0.24, 0.13],
  [0.24, 0.13],
  [-0.24, -0.15],
  [0.24, -0.15],
];
// Knobs left->right control: back-left, front-left, front-right, back-right
const KNOB_ORDER = [2, 0, 1, 3];

/** Stove with 4 gas burners, oven and extractor hood. Front faces local +Z. */
export function buildStove(game, { ceilingY }) {
  const g = new THREE.Group();
  g.name = 'station.stove';

  // body + oven
  box(W, H - 0.04, D, M.steelDark(), 0, (H - 0.04) / 2, 0, g);
  box(W - 0.08, 0.5, 0.012, M.steel(), 0, 0.4, D / 2 + 0.006, g);
  box(W - 0.22, 0.34, 0.01, M.glass(), 0, 0.38, D / 2 + 0.015, g);
  const bar = cyl(0.012, 0.012, W - 0.2, 6, M.steel(), 0, 0.62, D / 2 + 0.05, g);
  bar.rotation.z = Math.PI / 2;
  for (const x of [-(W - 0.26) / 2, (W - 0.26) / 2]) box(0.02, 0.02, 0.05, M.steel(), x, 0.62, D / 2 + 0.03, g);
  box(W, 0.12, 0.03, M.steel(), 0, H - 0.1, D / 2 + 0.015, g); // control strip
  box(W + 0.02, 0.04, D + 0.02, M.stoveTop(), 0, H - 0.02, 0, g); // cooktop
  box(W, 0.35, 0.03, M.steel(), 0, H + 0.175, -D / 2 + 0.015, g); // backsplash

  // burners (entities)
  const burners = BURNERS.map(([x, z], i) => {
    const b = game.add(new Burner(`burner.${i}`));
    b.object3d.position.set(x, H, z);
    g.add(b.object3d);
    return b;
  });

  // knobs on the control strip
  KNOB_ORDER.forEach((burnerIndex, i) => {
    const knob = makeKnob();
    knob.position.set(-0.36 + i * 0.24, H - 0.1, D / 2 + 0.035);
    g.add(knob);
    burners[burnerIndex].attachKnob(knob);
  });

  // extractor hood: square frustum (4-sided cylinder) + rim + chimney
  const hoodBottom = 1.78;
  const hoodH = 0.42;
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.72, hoodH, 4, 1), M.hood());
  hood.rotation.y = Math.PI / 4;
  hood.scale.set(1, 1, 1);
  hood.position.set(0, hoodBottom + hoodH / 2, -0.08);
  hood.castShadow = hood.receiveShadow = true;
  const hoodPivot = new THREE.Group();
  hoodPivot.scale.z = 0.78;
  hoodPivot.add(hood);
  g.add(hoodPivot);
  box(1.04, 0.07, 0.82, M.hood(), 0, hoodBottom - 0.02, -0.08 * 0.78, g);
  box(0.8, 0.01, 0.55, mat_glow(), 0, hoodBottom - 0.06, -0.06, g); // hood light panel
  const chimneyH = ceilingY - (hoodBottom + hoodH) + 0.05;
  box(0.3, chimneyH, 0.28, M.hood(), 0, hoodBottom + hoodH + chimneyH / 2 - 0.05, -0.08 * 0.78, g);

  return { group: g, burners, topY: H };
}

function mat_glow() {
  return new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd89a, emissiveIntensity: 1.2, flatShading: true });
}
