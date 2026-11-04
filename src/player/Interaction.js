import * as THREE from 'three';

// Turns "the player pointed at something and clicked / pulled the trigger"
// into game.interact(entityId). Works with the mouse on desktop and with
// controller rays in VR. In Ring 5 the phone does the same raycast and sends
// the entityId over the network instead.
export class Interaction {
  constructor({ engine, game, player }) {
    this.engine = engine;
    this.game = game;
    this.player = player;
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 3;

    const el = engine.renderer.domElement;
    el.addEventListener('click', (e) => {
      if (player.dragged || engine.isXR) return;
      const ndc = new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      this.raycaster.far = player.usingOverview ? 50 : 3;
      this.raycaster.setFromCamera(ndc, engine.camera);
      this.pick();
    });

    for (const controller of player.controllers) {
      controller.addEventListener('select', () => {
        this.raycaster.far = 3;
        this.raycaster.setFromXRController(controller);
        this.pick();
      });
    }
  }

  /** First thing the ray hits; if it belongs to an entity, interact with it. */
  pick() {
    const hit = this.raycaster.intersectObjects(this.engine.scene.children, true).find((h) => h.object.visible && h.object.type !== 'Line');
    if (!hit) return;
    let o = hit.object;
    while (o && !o.userData.entityId) o = o.parent;
    if (o) this.game.interact(o.userData.entityId);
  }
}
