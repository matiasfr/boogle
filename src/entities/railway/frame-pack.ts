// When a finished station frame packs up (stations.ts `settle`; level-pacing-1114, D1), as one pure step so its
// promises can be tested. Support never depends on what this tab watched: a frame somebody stands on or in (your
// body, or any friend's avatar, whose pose is theirs to say) stays solid and drawn, and folds when it clears. It
// stands back up if someone steps on mid-fold, and gives up its colliders and its footprint only once gone. Whether
// this tab saw the stretch being laid decides the animation alone: a load, a join or a backgrounded tab that finds
// the frame clear skips the fold and opens the ground at once; for a short wait (`settled`) a friend's avatar
// arriving on it still stands it back up.

/** `up` in use; `held` laid, drawn and solid (occupied, or about to fold); `folding` 0..1; `checking` laid before this
 * tab looked: not drawn, not solid and out of the footprints, but watched for a friend's avatar until the room's
 * avatars are known; `gone` the same, for good. */
export type PackState = 'up' | 'held' | 'folding' | 'checking' | 'gone';
export type PackInput = {
  /** The stretch is laid (the accepted completion). */
  laid: boolean;
  /** This tab watched the stretch being laid, so the edge is live and the fold plays. */
  sawWork: boolean;
  /** Someone (the local body or any remote avatar) stands on or in the frame's volume. */
  occupied: () => boolean;
  /** A remote avatar does. Asked while checking: the local body cannot be standing on a frame that is not solid. */
  remote: () => boolean;
  /** The fold's progress, 0..1, since it last started. */
  fold: number;
  /** Long enough has passed since this tab first saw the stretch laid for remote avatars to be drawn. */
  settled: boolean;
  reducedMotion: boolean;
};

export function packStep(state: PackState, input: PackInput): PackState {
  if (!input.laid) return 'up';
  if (state === 'gone') return 'gone';
  // A load that found the frame clear: the ground is open at once (arrival.ts tries the saved return pose in these
  // same frames and does not retry), so your own restored body never brings the frame back. A friend's avatar drawn
  // on it does: their pose is theirs to say, and they must not be seen standing on nothing.
  if (state === 'checking') return input.remote() ? 'held' : input.settled ? 'gone' : 'checking';
  // A frame that is standing asks first on every other path: nobody is left on one that stops being solid.
  if (input.occupied()) return 'held';
  if (state === 'up') return input.sawWork ? 'held' : 'checking';
  if (state === 'held') return input.reducedMotion ? 'gone' : 'folding';
  return input.fold >= 1 ? 'gone' : 'folding';
}
/** Drawn while in use, held or folding. */
export const packDrawn = (state: PackState) => state === 'up' || state === 'held' || state === 'folding';
/** Whether this tab found the frame already laid on a load (it went through `checking`): latched until the stretch is
 * un-laid. Such a frame may be drawn again for a friend's avatar, but it is open ground here for good. */
export const packLoaded = (loaded: boolean, state: PackState) =>
  state === 'checking' ? true : state === 'up' ? false : loaded;
/** The frame's colliders and its footprint (the little guys' walk-round and the saved return pose's exclusion) stand
 * while it is drawn, except a frame found laid on a load: its ground was opened and you may be standing on it, so a
 * friend standing it back up never puts a collider under or round you. */
export const packSolid = (state: PackState, loaded = false) => packDrawn(state) && !loaded;
