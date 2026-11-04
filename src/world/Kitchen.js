import * as THREE from 'three';
import { buildRoom, ROOM } from './Room.js';
import { buildLighting } from './Lighting.js';
import { buildStove } from './stations/Stove.js';
import { buildSink } from './stations/Sink.js';
import { buildPrepCounter } from './stations/PrepCounter.js';
import { buildServingCounter } from './stations/ServingCounter.js';
import { faceCenter, mergeStatic } from './helpers.js';
import { GRATE_TOP } from '../entities/Burner.js';
import { Pan, PAN_FLOOR } from '../entities/Pan.js';
import { Steak } from '../entities/Steak.js';
import { Tongs } from '../entities/Tongs.js';

// How far each station's centre is from the player (who stands at the origin).
const REACH = 0.85;
const STEAK_HALF_THICKNESS = 0.011;

/** Put an item at a starting pose (world, or local to the entity it rests on). */
function placeInitial(item, { on = null, pos, quat = new THREE.Quaternion() }) {
  item.setState({ held: null, on, pos: pos.toArray(), quat: quat.toArray() });
  item.snap();
}

/**
 * Builds the whole kitchen into the scene and registers its entities in `game`.
 * Layout (from the proposal): stove in front (-Z), prep/chopping counter left,
 * sink right, serving counter with hanging shelf behind.
 */
export function buildKitchen(scene, game) {
  const root = new THREE.Group();
  const ceilingY = ROOM.height;

  const room = buildRoom();
  scene.add(room.floor);
  root.add(room.group);

  const stove = buildStove(game, { ceilingY });
  faceCenter(stove.group, 0, -REACH);
  root.add(stove.group);

  const prep = buildPrepCounter();
  faceCenter(prep.group, -REACH - 0.05, 0);
  root.add(prep.group);

  const sink = buildSink();
  faceCenter(sink.group, REACH + 0.05, 0);
  root.add(sink.group);

  const serving = buildServingCounter({ ceilingY });
  faceCenter(serving.group, 0, REACH + 0.05);
  root.add(serving.group);

  // one draw call per material for everything static; entities stay separate
  scene.add(mergeStatic(root));

  // pan on the front-left burner, handle towards the player's right
  const burner = game.get('burner.0');
  const pan = game.add(new Pan('pan.0'));
  placeInitial(pan, {
    pos: burner.object3d.position.clone().add(new THREE.Vector3(0, GRATE_TOP, 0)),
    quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.5),
  });

  // steak inside the pan (its pose is local to the pan)
  const steak = game.add(new Steak('steak.0'));
  placeInitial(steak, {
    on: pan.id,
    pos: new THREE.Vector3(0, PAN_FLOOR + STEAK_HALF_THICKNESS, 0),
    quat: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.8),
  });

  // tongs hanging from the rail behind the player
  const tongs = game.add(new Tongs('tongs.0'));
  const hook = serving.tongsHook;
  placeInitial(tongs, {
    pos: hook.position.clone(),
    quat: hook.quaternion.clone(),
  });
  hook.removeFromParent();

  buildLighting(scene, room.lamps);

  return { stove, prep, sink, serving };
}
