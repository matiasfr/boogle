// When a finished station frame packs up (stations.ts `settle`; level-pacing-1114, D1), as one pure step so its
// promises can be tested: a frame somebody stands on or in keeps its colliders and does not fold; it folds only while
// clear, stands back up if someone steps on mid-fold, and gives up its colliders and its footprint only once gone. A
// tab that never saw the stretch being laid (a join, a reload) finds it gone at once.

/** `up` in use; `held` laid but occupied, or waiting its first clear frame; `folding` 0..1; `gone` not drawn. */
export type PackState = 'up' | 'held' | 'folding' | 'gone';
export type PackInput = {
  /** The stretch is laid (the accepted completion). */
  laid: boolean;
  /** This tab watched the stretch being laid, so the edge is live. */
  sawWork: boolean;
  /** Someone stands on or in the frame's volume. Asked only while held or folding. */
  occupied: () => boolean;
  /** The fold's progress, 0..1, since it last started. */
  fold: number;
  reducedMotion: boolean;
};

export function packStep(state: PackState, input: PackInput): PackState {
  if (!input.laid) return 'up';
  if (state === 'gone') return 'gone';
  if (state === 'up') return input.sawWork ? 'held' : 'gone';
  if (input.occupied()) return 'held';
  if (state === 'held') return input.reducedMotion ? 'gone' : 'folding';
  return input.fold >= 1 ? 'gone' : 'folding';
}
/** The frame's colliders and its footprint (the little guys' walk-round and the saved return pose) stand until gone. */
export const packSolid = (state: PackState) => state !== 'gone';
