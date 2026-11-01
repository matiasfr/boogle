// Whether this player is the guest, and the presses only the guest uses, shared between the small eager feature
// (src/features/dino.ts) and the lazily loaded guest module (src/guest/play.js).
//   active    this player's body follows the engine's guest
//   pose      his last pose (src/guest/engine.js pose()), published to the room as presence
//   b, bHeld  B (punch, kick, dive): pressed since the last tick, and still held
//   zHeld     Z (crouch, ground pound, long jump) from the pad's left trigger; Shift is read with the move keys
export const guest = { active: false, pose: null, b: false, bHeld: false, zHeld: false };
