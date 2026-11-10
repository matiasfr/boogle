// How loud a placed machine sound is where the camera is (./machine-sfx.ts): full at its source, falling off with the
// square of the distance's share of its hearing range, silent at the range and beyond. Pure, for tests.

/** Metres: a machine sound's default hearing range. */
export const MACHINE_HEAR = 45;
/** The share of a sound's gain heard `d` metres away, for a hearing range of `hear` metres. */
export const hearGain = (d: number, hear = MACHINE_HEAR) => Math.max(0, 1 - d / hear) ** 2;
