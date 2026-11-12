// Which level of detail a thing `distance` m from the camera draws at: the one pick far-ground.ts (ground tiles) and
// the track's chunks (src/place/look-kit.ts) share. Pure; a level is an index into `from`.

/**
 * The level for `distance`, given the distance each level starts from (ascending, the first 0). A thing already at a
 * coarser level than the distance asks for steps back to the finer one only `hysteresis` m inside its switch distance,
 * so a camera standing on the line does not flip it every frame. `was` is the level it drew at last time.
 */
export function lodLevel(from: readonly number[], distance: number, was = 0, hysteresis = 0) {
  let level = 0;
  while (level + 1 < from.length && distance >= from[level + 1]! - (was > level ? hysteresis : 0)) level++;
  return level;
}
