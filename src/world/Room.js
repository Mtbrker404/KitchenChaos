import * as THREE from 'three';
import { COLORS, M } from './materials.js';
import { box, collider } from './helpers.js';

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
  // ceiling
  box(size, 0.1, size, M.ceiling(), 0, height + 0.05, 0, g);

  // solid floor + walls (thick, so fast hand moves can't tunnel through)
  collider(size + 1, 1, size + 1, 0, -0.5, 0, g);
  collider(size, height, 1, 0, height / 2, -half - 0.5, g);
  collider(size, height, 1, 0, height / 2, half + 0.5, g);
  collider(1, height, size, -half - 0.5, height / 2, 0, g);
  collider(1, height, size, half + 0.5, height / 2, 0, g);

  // Positions for the warm point lights (lamp models removed for now).
  const lamps = [
    [-1.3, -1.3],
    [1.3, -1.3],
    [-1.3, 1.4],
    [1.3, 1.4],
  ].map(([x, z]) => new THREE.Vector3(x, height - 0.9, z));

  return { floor, group: g, lamps };
}
