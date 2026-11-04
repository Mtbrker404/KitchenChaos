import * as THREE from 'three';
import { VRButton } from 'three/addons/webxr/VRButton.js';

// Renderer, scene, render loop and WebXR. No game logic in here.
export class Engine {
  constructor(container) {
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.xr.enabled = true;
    renderer.xr.setReferenceSpaceType('local-floor');
    renderer.xr.setFoveation(1); // cheaper edges, helps hit 72 fps on Pico
    container.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x2b1a0e);
    this.camera = null; // active camera, set by PlayerRig
    this.cameras = []; // all cameras that need aspect updates on resize
    this.clock = new THREE.Clock();
    this.updaters = [];

    window.addEventListener('resize', () => this.resize());
  }

  get isXR() {
    return this.renderer.xr.isPresenting;
  }

  onUpdate(fn) {
    this.updaters.push(fn);
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    for (const cam of this.cameras) {
      cam.aspect = w / h;
      cam.updateProjectionMatrix();
    }
  }

  start() {
    this.renderer.setAnimationLoop(() => {
      const dt = Math.min(this.clock.getDelta(), 0.1);
      const t = this.clock.elapsedTime;
      for (const fn of this.updaters) fn(dt, t);
      this.renderer.render(this.scene, this.camera);
    });
  }
}
