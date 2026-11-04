import './style.css';
import Stats from 'three/addons/libs/stats.module.js';
import { Engine } from './core/Engine.js';
import { EventBus } from './core/EventBus.js';
import { Game } from './core/Game.js';
import { registerActions } from './game/actions.js';
import { buildKitchen } from './world/Kitchen.js';
import { PlayerRig } from './player/PlayerRig.js';
import { GrabSystem } from './player/GrabSystem.js';

// Dev only: open the page with ?emulate to fake a headset + controllers in a
// desktop browser (Meta's IWER). Never bundled into the production build.
if (import.meta.env.DEV && new URLSearchParams(location.search).has('emulate')) {
  const { XRDevice, metaQuest3 } = await import('iwer');
  const device = new XRDevice(metaQuest3);
  device.installRuntime({ forceInstall: true });
  window.xrDevice = device;
}

const bus = new EventBus();
const engine = new Engine(document.getElementById('app'));
engine.bus = bus;
const game = new Game(bus, engine.scene);
registerActions(game);

const kitchen = buildKitchen(engine.scene, game);
const grab = new GrabSystem({ engine, game, colliders: kitchen.colliders });
const player = new PlayerRig(engine, grab);

// FPS meter (target: stable 72 fps on Pico)
const stats = new Stats();
stats.dom.style.cssText = 'position:fixed;bottom:12px;left:12px;';
document.body.appendChild(stats.dom);

engine.onUpdate((dt, t) => {
  grab.update(dt);
  game.update(dt, t);
  stats.update();
});

// Log every action: this stream is exactly what multiplayer will send later.
bus.on('action', ({ action, source }) => console.log(`[${source}]`, JSON.stringify(action)));

// Handy for debugging in the browser console: kc.game.snapshot()
window.kc = { engine, game, bus, player, grab };

engine.start();
