// Whether this player is Mario, and the presses only Mario uses, shared between the small eager feature
// (src/features/mario.js) and the lazily loaded Mario module (src/mario/mario.js).
//   active    this player's body follows the decomp's Mario
//   pose      his last pose (src/mario/sim.js pose()), published to the room as presence
//   b, bHeld  B (punch, kick, dive): pressed since the last tick, and still held
//   zHeld     Z (crouch, ground pound, long jump) from the pad's left trigger; Shift is read with the move keys
export const mario = { active: false, busy: false, pose: null, b: false, bHeld: false, zHeld: false };
