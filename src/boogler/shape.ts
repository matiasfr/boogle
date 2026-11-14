// The Boogler's proportions, in metres at his own size: one source for the live character (src/boogler/boogler.ts)
// and for his stone statue on the town green (src/prefab/builders/boogler-statue.ts). Pure numbers, no three.js.
// He faces -z. Local view data: changing a number here changes both.
import { W_R } from '../world/boogler-brain.ts';

const H_R = 0.27; // half height: about three times as wide as he is tall
const BODY_Y = 0.32; // body centre above the ground
// His top hat, comically tall: the brim is a third of his radius (it sits on top of his head, covering none of it), the
// crown half the brim's radius, and the whole hat about one and a half times his height.
const BRIM_R = W_R / 3;
const HAT_H = 1.5 * (BODY_Y + H_R); // brim included

export const BOOGLER_SHAPE = {
  body: { r: W_R, halfHeight: H_R, y: BODY_Y },
  hand: { r: 0.15, x: W_R + 0.05, y: BODY_Y - 0.03, z: -0.05 },
  foot: { r: 0.19, scale: [1, 0.62, 1.25], x: 0.38, y: 0.1, z: -0.42 },
  hat: {
    brimR: BRIM_R,
    brimH: 0.03,
    crownR: BRIM_R / 2,
    /** The crown widens a little to its top. */
    flare: 1.06,
    high: HAT_H,
    /** Into the curve of his head, so no gap shows under the brim. */
    sink: 0.015,
  },
  /** His smiling face, in metres on the body's surface from the face's centre (x right, y down, as drawn). */
  face: {
    eye: { x: 0.145, y: -0.075, rx: 0.046, ry: 0.064 },
    smile: { y: -0.03, r: 0.095, from: Math.PI * 0.18, to: Math.PI * 0.82 },
  },
} as const;
