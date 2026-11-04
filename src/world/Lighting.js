import * as THREE from 'three';

// Warm, yellowish kitchen lighting. Kept to a small, fixed number of lights
// (lights must never be added/removed at runtime: that recompiles shaders).
export function buildLighting(scene, lampPositions) {
  scene.add(new THREE.HemisphereLight(0xffe3b5, 0x7a4426, 1.2));

  // main "key" light: casts the only real-time shadows
  const sun = new THREE.DirectionalLight(0xffd49a, 1.6);
  sun.position.set(1.8, 4.5, 1.2);
  sun.target.position.set(0, 0.8, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  const s = sun.shadow.camera;
  s.left = -2.2;
  s.right = 2.2;
  s.top = 2.2;
  s.bottom = -2.2;
  s.near = 0.5;
  s.far = 8;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);

  // warm pools from the pendant lamps nearest the player (no shadows)
  for (const p of lampPositions.slice(0, 4)) {
    const l = new THREE.PointLight(0xffb45e, 2.2, 5, 1.6);
    l.position.copy(p);
    scene.add(l);
  }
}
