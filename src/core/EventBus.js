// Tiny pub/sub. Systems talk through events instead of calling each other,
// so a network layer can later listen to / inject the same events.
export class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type).delete(fn);
  }

  emit(type, payload) {
    this.listeners.get(type)?.forEach((fn) => fn(payload));
  }
}
