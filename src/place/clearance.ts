// Solids switching on where a player can be (a lay, a mount, a kit, a door): lift or wait, never push (rule 67,
// build skill step 9). Your body is lifted straight up onto the set when its feet are within STEP of the top that holds
// it and the whole body fits there: nothing of the set, and nothing already built, between where it stands and where
// it would stand. Otherwise every solid of the set that holds it waits, neither solid nor drawn, as one set, until the
// body is clear of all of them; then they all switch on for good. Nothing here moves a body sideways or switches a
// solid off. Physics-free: the overlap query is passed in (src/prefab/instantiate.ts binds the engine's
// capsuleOverlaps; decision d-2026-11-24-door-export-clearance-helper). Local presentation: no state, no sync.
import { HEAD_OFFSET, PLAYER_R } from '../constants.ts';
import type { Body, Shape, V3 } from '../physics/engine.ts';

/** The most a body's feet may be under a solid's top and still be lifted onto it. */
export const STEP = 0.3;
/** A body this far into a solid is resting on it, not in it (the solver's contacts sink about 2 mm). */
const CONTACT = 0.02;
/** Halvings that find the top under STEP: to a tenth of a millimetre. */
const SEARCH = 12;

/** physics/engine.ts's capsuleOverlaps. */
export type Overlaps = (at: V3, r: number, up: number, against: Shape | { mask: number }) => boolean;
/** A solid about to switch on: its shapes, placed in the world, and how it turns solid and drawn together. */
export type Solid = { readonly shapes: readonly Shape[]; on(): void };
export type Clearing<S extends Solid> = {
  /** clear: none held your body; lifted: it now stands on the set; wait: `waiting` holds it. */
  kind: 'clear' | 'lifted' | 'wait';
  /** The solids held off, neither solid nor drawn, until your body is clear of every one (empty once they are on). */
  readonly waiting: readonly S[];
  /** Each frame while any waits: switches the whole set on once your body is clear of it, or (with lift) lifted onto
   * it. True while it still waits. */
  retry(body: Lifted | null | undefined): boolean;
};
type Lifted = Pick<Body, 'position' | 'velocity'> & { interpolatedPosition?: Body['position'] };

/** Lift or wait for solids switching on, with `overlaps` as the physics query. `lift: false` only waits (an area's
 * mount-time clearance, where the view moves no one). */
export function createLiftOrWait(overlaps: Overlaps) {
  const r = PLAYER_R - CONTACT,
    at = { x: 0, y: 0, z: 0 },
    world = { mask: -1 };
  const holds = (s: Solid, p: V3, y = p.y) => {
    at.x = p.x;
    at.y = y;
    at.z = p.z;
    return s.shapes.some((shape) => overlaps(at, r, HEAD_OFFSET, shape));
  };
  /** Lifts `body` onto `held` if its feet are within STEP of their top and it fits there (no solid of `set` at the
   * top, nothing built in the way up); true if it did. */
  function lift(set: readonly Solid[], held: readonly Solid[], body: Lifted) {
    const p = body.position;
    // Clear of the shrunk body at hi: the top is at most STEP over the feet.
    let lo = p.y,
      hi = p.y + STEP - CONTACT;
    if (held.some((s) => holds(s, p, hi))) return false;
    for (let i = 0; i < SEARCH; i++) {
      const mid = (lo + hi) / 2;
      if (held.some((s) => holds(s, p, mid))) lo = mid;
      else hi = mid;
    }
    const y = hi + CONTACT;
    if (set.some((s) => holds(s, p, y))) return false;
    at.x = p.x;
    at.y = p.y;
    at.z = p.z;
    // The body swept from where it stands to where it would stand: a roof over the top holds it off.
    if (overlaps(at, r, HEAD_OFFSET + y - p.y, world)) return false;
    p.set(p.x, y, p.z);
    body.interpolatedPosition?.set(p.x, y, p.z);
    body.velocity.set(0, 0, 0);
    return true;
  }
  return function liftOrWait<S extends Solid>(
    solids: readonly S[],
    body: Lifted | null | undefined,
    o: { lift: boolean },
  ): Clearing<S> {
    /** Settles `set` for body `b`: what still waits. At the switch the solids that hold the body are the set; retried
     * (`whole`), the set stays whole while any of it holds. */
    const settle = (set: readonly S[], b: Lifted | null | undefined, whole: boolean) => {
      const held = b ? set.filter((s) => holds(s, b.position)) : [];
      const left = b && held.length && !(o.lift && lift(set, held, b)) ? (whole ? set : held) : [];
      for (const s of set) if (!left.includes(s)) s.on();
      return { held: held.length > 0, left };
    };
    const first = settle(solids, body, false);
    let waiting = first.left;
    return {
      kind: !first.held ? 'clear' : waiting.length ? 'wait' : 'lifted',
      get waiting() {
        return waiting;
      },
      retry(b) {
        if (waiting.length) waiting = settle(waiting, b, true).left;
        return waiting.length > 0;
      },
    };
  };
}
