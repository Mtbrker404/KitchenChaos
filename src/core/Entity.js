import * as THREE from 'three';

// Base class for everything the game (and later the network) cares about.
//
// Rules that keep this multiplayer-ready:
//  - every entity has a stable string id ("burner.0", "steak.0") that is the
//    same on every client, so a phone can say "sabotage burner.0"
//  - `state` is plain JSON (no Three.js objects) so it can be sent over the wire
//  - visuals are derived from state in onStateChanged(); never the other way round
export class Entity {
  constructor(id, type) {
    this.id = id;
    this.type = type;
    this.state = {};
    this.object3d = new THREE.Group();
    this.object3d.name = id;
    this.object3d.userData.entityId = id;
    // Tells the static-mesh merger to leave this subtree alone.
    this.object3d.userData.dynamic = true;
  }

  setState(patch) {
    Object.assign(this.state, patch);
    this.onStateChanged(patch);
  }

  getState() {
    return structuredClone(this.state);
  }

  /** Update visuals after a state change. */
  onStateChanged(_patch) {}

  /** Per-frame visual update (animation, flicker). Must not change game state. */
  update(_dt, _time) {}

  /** What happens when a player points at this and clicks/triggers. Returns an action or null. */
  interact() {
    return null;
  }

  /** Lets child meshes (e.g. a knob outside the group) count as part of this entity. */
  tag(mesh) {
    mesh.userData.entityId = this.id;
    mesh.userData.dynamic = true;
    return mesh;
  }
}
