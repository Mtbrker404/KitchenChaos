import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Hand } from './Hand.js';

const EYE_HEIGHT = 1.6;

// The chef. Stands still at the origin (no artificial locomotion, no motion
// sickness). On desktop you drag to look around; in VR the headset drives the
// camera and the two controllers are children of the rig.
export class PlayerRig {
  constructor(engine, grab) {
    this.grab = grab; // GrabSystem: the hands register with it
    this.engine = engine;
    this.rig = new THREE.Group();
    this.rig.name = 'player-rig';
    engine.scene.add(this.rig);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(70, aspect, 0.05, 50);
    this.camera.rotation.order = 'YXZ';
    this.rig.add(this.camera);
    this.yaw = 0; // facing -Z = the stove
    this.pitch = -0.3;
    this.resetDesktopPose();

    // Debug overview camera (roughly the concept-render angle). Also a preview
    // of what the phone player's top-down view in Ring 5 could look like.
    this.overview = new THREE.PerspectiveCamera(50, aspect, 0.1, 50);
    this.overview.position.set(2.6, 3.0, 3.4);
    this.orbit = new OrbitControls(this.overview, engine.renderer.domElement);
    this.orbit.target.set(0, 0.9, 0);
    this.orbit.enabled = false;
    this.orbit.update();

    engine.cameras.push(this.camera, this.overview);
    engine.camera = this.camera;

    this.controllers = [0, 1].map((i) => this.makeController(i));

    this.initDesktopLook();
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV' && !engine.isXR) this.toggleOverview();
    });

    const xr = engine.renderer.xr;
    xr.addEventListener('sessionstart', () => {
      if (this.usingOverview) this.toggleOverview();
    });
    xr.addEventListener('sessionend', () => this.resetDesktopPose());
  }

  get usingOverview() {
    return this.engine.camera === this.overview;
  }

  toggleOverview() {
    const toOverview = !this.usingOverview;
    this.engine.camera = toOverview ? this.overview : this.camera;
    this.orbit.enabled = toOverview;
  }

  resetDesktopPose() {
    this.camera.position.set(0, EYE_HEIGHT, 0);
    this.camera.rotation.set(this.pitch, this.yaw, 0);
  }

  initDesktopLook() {
    const el = this.engine.renderer.domElement;
    let down = null;
    this.dragged = false;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
      this.dragged = false;
    });
    window.addEventListener('pointerup', () => (down = null));
    el.addEventListener('pointermove', (e) => {
      if (!down || this.usingOverview || this.engine.isXR) return;
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 4) this.dragged = true;
      if (!this.dragged) return;
      this.yaw -= e.movementX * 0.004;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.004, -1.4, 1.4);
      this.camera.rotation.set(this.pitch, this.yaw, 0);
    });
  }

  makeController(index) {
    const xr = this.engine.renderer.xr;

    // target ray: only used for pointing at menus (trigger), so keep it short and faint
    const controller = xr.getController(index);
    const ray = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.35 }),
    );
    ray.scale.z = 0.6;
    ray.name = 'ray';
    ray.userData.noRaycast = true;
    controller.add(ray);
    controller.addEventListener('select', () => this.engine.bus?.emit('ui/select', { controller }));
    this.rig.add(controller);

    // grip space: the hand lives here. Handedness is only known once connected.
    const grip = xr.getControllerGrip(index);
    this.rig.add(grip);
    let slot = null;
    grip.addEventListener('connected', (e) => {
      const side = e.data.handedness === 'left' ? 'left' : 'right';
      if (!slot || slot.side !== side) {
        if (slot) {
          slot.hand.root.removeFromParent();
          this.grab.hands.splice(this.grab.hands.indexOf(slot), 1);
        }
        const hand = new Hand(side);
        grip.add(hand.root);
        slot = this.grab.addHand(side, hand, grip);
      }
      slot.inputSource = e.data;
      slot.hand.root.visible = true;
    });
    grip.addEventListener('disconnected', () => {
      if (!slot) return;
      this.grab.squeezeEnd(slot);
      slot.inputSource = null;
      slot.hand.root.visible = false;
    });
    grip.addEventListener('squeezestart', () => slot && this.grab.squeezeStart(slot));
    grip.addEventListener('squeezeend', () => slot && this.grab.squeezeEnd(slot));

    return controller;
  }
}
