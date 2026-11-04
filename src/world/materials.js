import * as THREE from 'three';

// Warm, slightly desaturated palette matching the concept render.
export const COLORS = {
  wall: 0xe9b35e,
  wallTrim: 0x8a5530,
  ceiling: 0x6b4426,
  floorLight: 0xf0dcb0,
  floorDark: 0xa04f27,
  wood: 0x9c6538,
  woodDark: 0x6f4425,
  woodLight: 0xc08850,
  cabinetOrange: 0xb4572c,
  stone: 0xd9d0bf,
  greyCabinet: 0xbdb7aa,
  steel: 0xbab7af,
  steelDark: 0x55534f,
  stoveTop: 0x2d2c2a,
  castIron: 0x272524,
  glass: 0x1c1a18,
  hood: 0xe6dcc3,
  board: 0xd59a5c,
  tomato: 0xd23a26,
  leaf: 0x4f8a2e,
  plate: 0xf4efe6,
  red: 0xc5352b,
  cream: 0xeee2c8,
};

const cache = new Map();

// Shared, flat-shaded material. Same args -> same material instance, which
// keeps draw calls down after static meshes are merged per material.
export function mat(color, { metal = 0, rough = 0.85, emissive = 0x000000, emissiveIntensity = 1, side } = {}) {
  const key = `${color}|${metal}|${rough}|${emissive}|${emissiveIntensity}|${side}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      new THREE.MeshStandardMaterial({
        color,
        metalness: metal,
        roughness: rough,
        emissive,
        emissiveIntensity,
        flatShading: true,
        side: side ?? THREE.FrontSide,
      }),
    );
  }
  return cache.get(key);
}

export const M = {
  wall: () => mat(COLORS.wall, { rough: 0.95 }),
  trim: () => mat(COLORS.wallTrim),
  ceiling: () => mat(COLORS.ceiling),
  wood: () => mat(COLORS.wood),
  woodDark: () => mat(COLORS.woodDark),
  woodLight: () => mat(COLORS.woodLight),
  orange: () => mat(COLORS.cabinetOrange),
  stone: () => mat(COLORS.stone, { rough: 0.6 }),
  grey: () => mat(COLORS.greyCabinet),
  steel: () => mat(COLORS.steel, { metal: 0.6, rough: 0.4 }),
  steelDark: () => mat(COLORS.steelDark, { metal: 0.5, rough: 0.5 }),
  stoveTop: () => mat(COLORS.stoveTop, { metal: 0.3, rough: 0.6 }),
  castIron: () => mat(COLORS.castIron, { metal: 0.4, rough: 0.7 }),
  glass: () => mat(COLORS.glass, { metal: 0.2, rough: 0.2 }),
  hood: () => mat(COLORS.hood, { metal: 0.2, rough: 0.5 }),
  board: () => mat(COLORS.board),
  tomato: () => mat(COLORS.tomato, { rough: 0.5 }),
  leaf: () => mat(COLORS.leaf),
  plate: () => mat(COLORS.plate, { rough: 0.4 }),
  red: () => mat(COLORS.red),
  cream: () => mat(COLORS.cream),
  black: () => mat(0x161412),
};
