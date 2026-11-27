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
/** Rapier's overlap test reads about 2 mm generous: a top exactly STEP over the feet still counts as within it. */
const SLACK = 0.005;
/** The probe under the feet that finds the top they would stand on. */
const FOOT = 0.02;

/** physics/engine.ts's capsuleOverlaps. */
export type Overlaps = (at: V3, r: number, up: number, against: Shape | { of: object }) => boolean;
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

/** The shared capsule query for activating solids and checking whether a support still holds a player. */
function playerOverlaps(overlaps: Overlaps, shapes: readonly Shape[], at: V3, margin: number) {
  return shapes.some((shape) => overlaps(at, PLAYER_R + margin, HEAD_OFFSET, shape));
}

/** Lift or wait for solids switching on, with `overlaps` as the physics query. `lift: false` only waits (an area's
 * mount-time clearance, where the view moves no one). */
export function createLiftOrWait(overlaps: Overlaps) {
  const at = { x: 0, y: 0, z: 0 };
  const holds = (s: Solid, p: V3, y = p.y) => {
    at.x = p.x;
    at.y = y;
    at.z = p.z;
    return playerOverlaps(overlaps, s.shapes, at, -CONTACT);
  };
  /** Lifts `body` onto `held` if its feet are within STEP of their top, that top is under its feet, and the whole body
   * fits standing there; true if it did. */
  function lift(set: readonly Solid[], held: readonly Solid[], body: Lifted) {
    const p = body.position;
    // Clear of the shrunk body at hi: the top is at most STEP over the feet (STEP itself included).
    let lo = p.y,
      hi = p.y + STEP - CONTACT + SLACK;
    if (held.some((s) => holds(s, p, hi))) return false;
    for (let i = 0; i < SEARCH; i++) {
      const mid = (lo + hi) / 2;
      if (held.some((s) => holds(s, p, mid))) lo = mid;
      else hi = mid;
    }
    const y = hi + CONTACT;
    at.x = p.x;
    at.z = p.z;
    // A top under the feet: just under where the feet would stand is in the set (not a corner grazed from beside it).
    at.y = y - PLAYER_R - 2 * FOOT;
    if (!set.some((s) => s.shapes.some((shape) => overlaps(at, FOOT, 0, shape)))) return false;
    // The whole body fits there (a little over the top it stands on): nothing of the set, nothing built. This covers
    // the way up too: the body only rises by less than its height.
    at.y = y + CONTACT;
    if (set.some((s) => s.shapes.some((shape) => overlaps(at, PLAYER_R, HEAD_OFFSET, shape)))) return false;
    if (overlaps(at, PLAYER_R, HEAD_OFFSET, { of: body })) return false;
    p.set(p.x, y, p.z);
    body.interpolatedPosition?.set(p.x, y, p.z);
    body.velocity.set(0, 0, 0);
    return true;
  }
  return function liftOrWait<S extends Solid>(
    solids: readonly S[],
    body: Lifted | null | undefined,
    o:
      | { lift: true; occupied?: never; visitor?: (solid: { holds(at: V3): boolean }) => boolean }
      | { lift: false; occupied?: (support: { holds(at: V3): boolean }) => boolean },
  ): Clearing<S> {
    /** Settles `set` for body `b`: what still waits. At the switch the solids that hold the body are the set; retried
     * (`whole`), the set stays whole while any of it holds. */
    const settle = (set: readonly S[], b: Lifted | null | undefined, whole: boolean) => {
      // A visitor can hold a new set off. Only the local body can be lifted onto it.
      if (o.lift && o.visitor?.({ holds: (at) => set.some((s) => holds(s, at)) })) return { held: true, left: set };
      // A retiring support waits for every player within a step. Its callback releases the
      // existing bodies once clear. This path only probes positions and never moves a player.
      const occupied = o.occupied;
      const held = occupied
        ? set.filter((s) => occupied({ holds: (at) => playerOverlaps(overlaps, s.shapes, at, STEP) }))
        : b
          ? set.filter((s) => holds(s, b.position))
          : [];
      const left = held.length && !(o.lift && b && lift(set, held, b)) ? (whole ? set : held) : [];
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
