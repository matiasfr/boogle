// Which parts of the meadow this page draws (docs/game-design/place.md, "The meadow"). The meadow is Home's default
// ground dressing (owner, 14 November 2026): with no flag both parts are on. `?meadow=0` (or `off`) turns it off for
// comparison; `?meadow=tint` or `?meadow=flowers` draws one part alone, for debugging. `?meadowTier=desktop`, `touch`
// or `phone` forces the flowers' cost tier (meadow-flowers.ts picks it from the device otherwise).
// Only this file is evaluated when the meadow is off: it imports nothing at run time. The rest (meadow.ts,
// meadow-field.ts, meadow-flowers.ts) loads beside the land's other modules, and the slow map bakes after the first
// frame, so nothing here waits on the meadow to paint.
import type { LawnLayer } from './ground-material.ts';

const query = typeof location === 'undefined' ? new URLSearchParams() : new URLSearchParams(location.search);
const asked = query.get('meadow');
const off = asked === '0' || asked === 'off';
const parts = new Set(asked && !off ? asked.split(',') : ['tint', 'flowers']);
const all = parts.has('all') || parts.has('1') || parts.has('on');
export const MEADOW = {
  tint: !off && (all || parts.has('tint')),
  flowers: !off && (all || parts.has('flowers')),
  /** A forced cost tier, or '' for the device's own. */
  tier: query.get('meadowTier') ?? '',
};

let lawnLayer: LawnLayer | undefined;
/** What must be loaded before the land is built: the meadow's lawn layer (meadow.ts), since the ground's material is
 * built in one go. Null when the meadow is off, so that start loads and awaits nothing more. */
export function meadowBeforeLand(): Promise<void> | null {
  if (!MEADOW.tint && !MEADOW.flowers) return null;
  return import('./meadow.ts').then((m) => {
    lawnLayer = m.meadowLawn;
  });
}
/** The meadow's lawn layer once `meadowBeforeLand` has loaded it; undefined with the meadow off. */
export const meadowLawnLayer = () => lawnLayer;
