// What input.ts and the gamepad write and the player, HUD and vehicles read.
// triggerL / triggerR: a pad's analog triggers, 0..1 (src/features/gamepad.ts); a vehicle reads them as brake and throttle.
export const input = { keys: new Set<string>(), stickX: 0, stickY: 0, sprint: false, triggerL: 0, triggerR: 0 };
// canLock: the browser has Pointer Lock at all (Safari on iPadOS has none, research/cross-device-input.md rec 3), so
// mouse look there is a click-drag or a two-finger trackpad scroll. looked: one of those has turned the camera (the
// hint in hud.ts then goes). seated: in a vehicle's seat (setSeated), where its chase camera owns the view. held: the
// player stands still (no move or jump) while a talk is open (src/player/conversation.ts).
export const inputState = {
  locked: false,
  lockFailed: false,
  canLock: 'requestPointerLock' in (globalThis.Element?.prototype ?? {}), // no Element in a headless run (dev/sim/)
  looked: false,
  touchLooked: false, // Local to this visit; only a touch look retires touch guidance.
  seated: false,
  held: false,
};
