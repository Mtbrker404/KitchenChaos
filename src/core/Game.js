// Holds all entities and is the single place where game state changes.
//
// Every change goes through dispatch({ type, ...data }). Actions are plain
// JSON, so in Ring 5 the phone can send the exact same action over the network
// and the headset (the "host") applies it. Nothing else should mutate state.
export class Game {
  constructor(bus, scene) {
    this.bus = bus;
    this.scene = scene;
    this.entities = new Map();
    this.handlers = new Map();
  }

  add(entity) {
    if (this.entities.has(entity.id)) throw new Error(`Duplicate entity id: ${entity.id}`);
    this.entities.set(entity.id, entity);
    entity.game = this;
    return entity;
  }

  get(id) {
    return this.entities.get(id);
  }

  /** Register what an action type does. */
  handle(type, fn) {
    this.handlers.set(type, fn);
  }

  /** source: 'local' | 'auto' (random sabotage) | 'remote' (network, later) */
  dispatch(action, source = 'local') {
    const handler = this.handlers.get(action.type);
    if (!handler) {
      console.warn('Unhandled action', action);
      return;
    }
    handler(action, this);
    this.bus.emit('action', { action, source });
  }

  update(dt, time) {
    for (const e of this.entities.values()) e.update(dt, time);
  }

  /** Full game state as JSON, e.g. to sync a phone that just joined. */
  snapshot() {
    const out = {};
    for (const [id, e] of this.entities) out[id] = { type: e.type, ...e.getState() };
    return out;
  }

  loadSnapshot(snap) {
    for (const [id, { type: _type, ...state }] of Object.entries(snap)) this.get(id)?.setState(state);
  }
}
