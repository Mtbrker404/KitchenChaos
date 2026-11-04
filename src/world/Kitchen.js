import * as THREE from 'three';
import { buildRoom, ROOM } from './Room.js';
import { buildBackground } from './Background.js';
import { buildLighting } from './Lighting.js';
import { buildStove } from './stations/Stove.js';
import { buildSink } from './stations/Sink.js';
import { buildPrepCounter } from './stations/PrepCounter.js';
import { buildServingCounter } from './stations/ServingCounter.js';
import { faceCenter, mergeStatic } from './helpers.js';
import { GRATE_TOP } from '../entities/Burner.js';
import { Pan, PAN_FLOOR } from '../entities/Pan.js';
import { Steak } from '../entities/Steak.js';

// How far each station's centre is from the player (who stands at the origin).
const REACH = 0.85;

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
  root.add(buildBackground());

  const stove = buildStove(game, { ceilingY });
  faceCenter(stove.group, 0, -REACH);
  root.add(stove.group);

  const prep = buildPrepCounter();
  faceCenter(prep.group, -REACH - 0.05, 0);
  root.add(prep.group);

  const sink = buildSink();
  faceCenter(sink.group, REACH + 0.05, 0);
  root.add(sink.group);

  const serving = buildServingCounter(game, { ceilingY });
  faceCenter(serving.group, 0, REACH + 0.05);
  root.add(serving.group);

  // one draw call per material for everything static; entities stay separate
  const merged = mergeStatic(root);
  scene.add(merged);

  // pan + steak on the front-left burner
  const burner = game.get('burner.0');
  const pan = game.add(new Pan('pan.0', { on: burner.id }));
  pan.object3d.position.copy(burner.object3d.position).add(new THREE.Vector3(0, GRATE_TOP, 0));
  pan.object3d.rotation.y = -0.5; // handle towards the player's right
  scene.add(pan.object3d);

  const steak = game.add(new Steak('steak.0'));
  steak.object3d.position.copy(pan.object3d.position).add(new THREE.Vector3(0, PAN_FLOOR, 0));
  steak.object3d.rotation.y = 0.3;
  scene.add(steak.object3d);

  buildLighting(scene, room.lamps);

  return { stove, prep, sink, serving };
}
