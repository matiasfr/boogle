// Which meadow experiments this page asked for (docs/research/small-magic-look.md, "What was built"): `?meadow=tint`,
// `?meadow=flowers`, or both as `?meadow=tint,flowers` (or `all`). Only this file is loaded on every visit: it imports
// nothing at run time and allocates nothing but the flags, and the experiments themselves (meadow.ts, meadow-field.ts,
// meadow-flowers.ts) load only when their flag is on: the tint here, before the land is built, the flowers in land.ts.
import type { LawnLayer } from './ground-material.ts';

const asked = new Set(
  (typeof location === 'undefined' ? '' : (new URLSearchParams(location.search).get('meadow') ?? '')).split(','),
);
export const MEADOW = {
  tint: asked.has('tint') || asked.has('all'),
  flowers: asked.has('flowers') || asked.has('all'),
};

let lawnLayer: LawnLayer | undefined;
/** What must be loaded before the land is built: `?meadow=tint`'s lawn layer (meadow.ts), since the ground's material
 * is built in one go. Null when the flag is off, so the usual start awaits nothing and loads nothing more. */
export function meadowBeforeLand(): Promise<void> | null {
  if (!MEADOW.tint) return null;
  return import('./meadow.ts').then((m) => {
    lawnLayer = m.meadowLawn;
  });
}
/** The tint's lawn layer once `meadowBeforeLand` has loaded it; undefined with the flag off. */
export const meadowLawnLayer = () => lawnLayer;
