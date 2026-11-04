// Every action the game understands. Keep handlers small and deterministic:
// the same action applied on any client must produce the same state.
// Actions use absolute values (heat = 0.4, not "turn up a bit") so a repeated
// or late network message can't push the state the wrong way.
export function registerActions(game) {
  // { type: 'burner/setHeat', id: 'burner.0', heat: 0..1 }
  // Sent by the knob while it's being turned, and later by sabotage (heat: 0).
  game.handle('burner/setHeat', ({ id, heat }, g) => {
    g.get(id)?.setState({ heat: Math.min(1, Math.max(0, heat)) });
  });

  // { type: 'item/grab', id: 'steak.0', hand: 'left' | 'right' }
  game.handle('item/grab', ({ id, hand }, g) => {
    g.get(id)?.setState({ held: hand });
  });

  // { type: 'item/place', id, on: entityId | null, pos: [x,y,z], quat: [x,y,z,w], toss?: m/s }
  // pos/quat are local to `on` (or world when on = null). toss > 0 = flicked up (spatula flip).
  game.handle('item/place', ({ id, on, pos, quat, toss = 0 }, g) => {
    g.get(id)?.setState({ held: null, on, pos, quat, toss });
  });
}
