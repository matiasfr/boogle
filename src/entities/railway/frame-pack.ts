// When a finished station frame packs up (stations.ts `settle`; level-pacing-1114, D1), as one pure step so its
// promises can be tested. Support never depends on what this tab watched: a frame somebody stands on or in (your
// body, or any friend's avatar, whose pose is theirs to say) stays solid and drawn, and folds when it clears. It
// stands back up if someone steps on mid-fold, and gives up its colliders and its footprint only once gone. Whether
// this tab saw the stretch being laid decides the animation alone: a load, a join or a backgrounded tab that finds
// the frame clear skips the fold, after a short unseen wait (`settled`) for friends' avatars to arrive.

/** `up` in use; `held` laid, drawn and solid (occupied, or about to fold); `folding` 0..1; `checking` laid before this
 * tab looked: solid but not drawn until the room's avatars are known; `gone` neither. */
export type PackState = 'up' | 'held' | 'folding' | 'checking' | 'gone';
export type PackInput = {
  /** The stretch is laid (the accepted completion). */
  laid: boolean;
  /** This tab watched the stretch being laid, so the edge is live and the fold plays. */
  sawWork: boolean;
  /** Someone (the local body or any remote avatar) stands on or in the frame's volume. */
  occupied: () => boolean;
  /** The fold's progress, 0..1, since it last started. */
  fold: number;
  /** Long enough has passed since this tab first saw the stretch laid for remote avatars to be drawn. */
  settled: boolean;
  reducedMotion: boolean;
};

export function packStep(state: PackState, input: PackInput): PackState {
  if (!input.laid) return 'up';
  if (state === 'gone') return 'gone';
  // Every path asks first: nobody is ever left on a frame that stops being solid.
  if (input.occupied()) return 'held';
  if (state === 'up') return input.sawWork ? 'held' : 'checking';
  if (state === 'checking') return input.settled ? 'gone' : 'checking';
  if (state === 'held') return input.reducedMotion ? 'gone' : 'folding';
  return input.fold >= 1 ? 'gone' : 'folding';
}
/** The frame's colliders and its footprint (the little guys' walk-round and the saved return pose) stand until gone. */
export const packSolid = (state: PackState) => state !== 'gone';
/** Drawn while in use, held or folding; a frame still being checked after a load is solid but not shown. */
export const packDrawn = (state: PackState) => state === 'up' || state === 'held' || state === 'folding';
