import * as THREE from 'three';
import { COLORS, M, mat } from './materials.js';
import { box, cyl } from './helpers.js';

export const ROOM = { size: 9, height: 3.2 };

function checkerTexture(tileSize) {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const ctx = c.getContext('2d');
  const a = `#${COLORS.floorLight.toString(16).padStart(6, '0')}`;
  const b = `#${COLORS.floorDark.toString(16).padStart(6, '0')}`;
  ctx.fillStyle = a;
  ctx.fillRect(0, 0, 2, 2);
  ctx.fillStyle = b;
  ctx.fillRect(1, 0, 1, 1);
  ctx.fillRect(0, 1, 1, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestMipmapLinearFilter;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(ROOM.size / (tileSize * 2), ROOM.size / (tileSize * 2));
  tex.anisotropy = 4;
  return tex;
}

/**
 * Floor (separate, receives shadows only) + walls, ceiling and pendant lamps.
 * Returns { floor, group, lamps } where lamps are world positions of the bulbs.
 */
export function buildRoom() {
  const { size, height } = ROOM;
  const half = size / 2;
  const g = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ map: checkerTexture(0.45), roughness: 0.7 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.name = 'floor';

  // walls
  box(size, height, 0.1, M.wall(), 0, height / 2, -half - 0.05, g);
  box(size, height, 0.1, M.wall(), 0, height / 2, half + 0.05, g);
  box(0.1, height, size, M.wall(), -half - 0.05, height / 2, 0, g);
  box(0.1, height, size, M.wall(), half + 0.05, height / 2, 0, g);
  // skirting + a darker band at the top of the walls
  for (const [w, d, x, z] of [
    [size, 0.02, 0, -half],
    [size, 0.02, 0, half],
    [0.02, size, -half, 0],
    [0.02, size, half, 0],
  ]) {
    box(w, 0.12, d, M.trim(), x, 0.06, z, g);
    box(w, 0.25, d, M.trim(), x, height - 0.125, z, g);
  }
  // ceiling + beams
  box(size, 0.1, size, M.ceiling(), 0, height + 0.05, 0, g);
  for (const x of [-3, -1, 1, 3]) box(0.18, 0.2, size, M.woodDark(), x, height - 0.1, 0, g);

  // pendant lamps
  const lampPositions = [
    [-1.3, -1.3],
    [1.3, -1.3],
    [-1.3, 1.4],
    [1.3, 1.4],
    [-3.0, 0],
    [3.0, 0],
  ];
  const shadeMat = mat(0x1d1a17, { side: THREE.DoubleSide });
  const bulbMat = mat(0xfff0c8, { emissive: 0xffd28a, emissiveIntensity: 3 });
  const lamps = [];
  for (const [x, z] of lampPositions) {
    const drop = 0.75;
    const y = height - drop;
    cyl(0.004, 0.004, drop, 4, M.black(), x, height - drop / 2, z, g);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.2, 0.16, 8, 1, true), shadeMat);
    shade.position.set(x, y - 0.08, z);
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), bulbMat);
    bulb.position.set(x, y - 0.14, z);
    g.add(bulb);
    lamps.push(new THREE.Vector3(x, y - 0.16, z));
  }

  return { floor, group: g, lamps };
}
