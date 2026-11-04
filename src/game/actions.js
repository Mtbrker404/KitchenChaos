// Every action the game understands. Keep handlers small and deterministic:
// the same action applied on any client must produce the same state.
export function registerActions(game) {
  // { type: 'burner/setOn', id: 'burner.0', on: true }
  // Uses an explicit on/off value (not "toggle") so a repeated or delayed
  // network message can't flip it the wrong way.
  game.handle('burner/setOn', ({ id, on }, g) => {
    g.get(id)?.setState({ on: !!on });
  });
}
