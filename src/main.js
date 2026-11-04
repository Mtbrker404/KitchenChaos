import './style.css';
import Stats from 'three/addons/libs/stats.module.js';
import { Engine } from './core/Engine.js';
import { EventBus } from './core/EventBus.js';
import { Game } from './core/Game.js';
import { registerActions } from './game/actions.js';
import { buildKitchen } from './world/Kitchen.js';
import { PlayerRig } from './player/PlayerRig.js';
import { Interaction } from './player/Interaction.js';

const bus = new EventBus();
const engine = new Engine(document.getElementById('app'));
const game = new Game(bus);
registerActions(game);

buildKitchen(engine.scene, game);
const player = new PlayerRig(engine);
new Interaction({ engine, game, player });

// FPS meter (target: stable 72 fps on Pico)
const stats = new Stats();
stats.dom.style.cssText = 'position:fixed;bottom:12px;left:12px;';
document.body.appendChild(stats.dom);

engine.onUpdate((dt, t) => {
  game.update(dt, t);
  stats.update();
});

// Log every action: this stream is exactly what multiplayer will send later.
bus.on('action', ({ action, source }) => console.log(`[${source}]`, action));

// Handy for debugging in the browser console: kc.game.snapshot()
window.kc = { engine, game, bus, player };

engine.start();
