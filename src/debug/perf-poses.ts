// The fixed viewpoints the performance benchmark measures (dev/look/bench.ts) and the device test suites reuse
// (src/debug/device/). Pure data plus one helper that moves the player; nothing here imports the game statically, so
// Node can read POSES. Local, debug only.

/** World metres, y up. The classic island sits at the origin; Place's world is offset by +1000 in x. */
export const POSES = {
  spawn: null, // the player camera where the game puts a new player
  town: { cam: [940, 34, 72], look: [895, 18, 14] },
  forge: { cam: [945, 30, -32], look: [913, 19, 2] }, // line 2 leaves the turntable by the forge and rack
  far: { cam: [1040, 170, 260], look: [0, 0, 0] }, // over Place towards the classic island, ~1 km away
  island: { cam: [-40, 40, 40], look: [-5, 0, 0] }, // the classic island close (dev/look/lib.ts VIEWS.overview)
  bay: { cam: [780, 9, 0], look: [-700, 40, -500] }, // from the West landing over the bay: the long view (?greybox=sickle extends the fog here)
  play: null, // mid-play: a second player beside you, walking, dust particles, the player camera
  // The player stood there (x, y, z, yaw; forward is (-sin yaw, -cos yaw)) with the player camera: the owner's 9 November
  // slow spots past the pier. Opt-in (--poses), and built only from `--rail-seed q6-done` on: before Q6 there is no pier.
  pier: { put: [1406.75, 24.3, -356.96, 0] }, // the pier deck ("Pier reached" jump-in), facing north over open sea
  head: { put: [1392, 24, -170, 2.356] }, // Far Head's top, facing back south-west along the trestle to the mainland
} as const;
export type PoseName = keyof typeof POSES;
export const OPT_IN: PoseName[] = ['pier', 'head'];

/** Teleports the player to (x, y, z); with a yaw, turns the player and the camera to it too. False before the player
 * has entered. In the page only. */
export async function putPlayer(x: number, y: number, z: number, yaw?: number) {
  const { me } = await import('../player/player.ts');
  const { teleport } = await import('../physics/engine.ts');
  if (!me.body) return false;
  teleport(me.body, x, y, z);
  if (yaw !== undefined) {
    const { cam } = await import('../player/state.ts');
    me.yaw = cam.yaw = yaw;
  }
  return true;
}
