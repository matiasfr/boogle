// The bridge leaf's pose over time (docs/plans/ring-island-build1.md, R4c; calls 8, 9, 35), pure numbers: where the leaf
// should rest for the pawl and the counterweight, and how it gets there. Raised on the pawl; once braced each hung
// footing dips it a quarter; the last one (or the pawl knocked out with all four hung) swings it down, 2.5 s, ease-in.

import { WORKS } from '../../sim/railway-works-layout.ts';

/** The Aperture row's `brace` encoding (src/sim/railway-components.ts; test/railway-r4c-leaf.test.ts pins it to the sim's). */
export const BRACE = { DOWN: 0, RAISED: 1, BRACED: 2 } as const;

/** The brace prompt's window: the gap footed and the leaf still on its pawl (the sim's `brace` accepts exactly this). */
export function braceOffered(set: number, brace: number): boolean {
  return set === WORKS.ring && brace === BRACE.RAISED;
}
/** The jib's prompt window, given a footing on your back: a bent's footing while the gap is open, then a counterweight
 * footing until four hang (one site, its meaning by state: call 7). Never once the leaf is weighted. */
export function jibOffered(set: number, cw: number): boolean {
  return set < WORKS.ring || cw < WORKS.counterweight;
}

/** The prompts' words (owner, 11 November: "Use the plan's two labels"): the brace at the gold strut, and the jib's,
 * which sets a bent's footing until the gap is footed and then hangs the counterweight. */
export const BRACE_VERB = 'Knock out the pawl';
export function jibVerb(set: number): string {
  return set < WORKS.ring ? 'Set the footing' : 'Hang the weight';
}

/** Degrees up when raised (ringIslandPose.leaf's 78). */
export const LEAF_UP = 78;
/** The counterweight footings that bring it down. */
export const LEAF_FOOTINGS = 4;
/** The swing down onto the bents, and one footing's dip. */
export const SWING_S = 2.5;
export const DIP_S = 0.7;

/** Where the leaf rests, in degrees up: `brace` and `cw` are the Aperture row's, `joined` the rivet's tick (-1 not yet;
 * a struck rivet means the leaf is down whatever else a row says). */
export function leafRest(brace: number, cw: number, joined: number): number {
  if (joined >= 0 || brace === BRACE.DOWN) return 0;
  if (brace === BRACE.BRACED) return (LEAF_UP * (LEAF_FOOTINGS - Math.min(cw, LEAF_FOOTINGS))) / LEAF_FOOTINGS;
  return LEAF_UP;
}

/** The plate lies on the bents: at 0 degrees and not moving. The sim's `brace === 0` is earlier (it flips as the swing
 * starts), so views that must wait for the visible landing (the rivet's prompt and glint) read this. */
export function leafLanded(deg: number, moving: boolean): boolean {
  return deg === 0 && !moving;
}

/** The leaf's motion toward its rest. `snap` puts it there at once (a restore, a late joiner); `aim` starts a move when
 * the rest changes; `step` advances it and says (once) when the leaf has just come down onto the bents. */
export function createLeafMotion(start = LEAF_UP) {
  let deg = start,
    from = start,
    to = start,
    t = 1,
    dur = 1,
    landing = false;
  return {
    get deg() {
      return deg;
    },
    get moving() {
      return t < dur;
    },
    /** Coming down onto the bents (the last swing), not a counterweight's dip. */
    get falling() {
      return t < dur && to === 0;
    },
    snap(rest: number) {
      deg = from = to = rest;
      t = dur = 1;
      landing = false;
    },
    aim(rest: number) {
      if (rest === to) return;
      from = deg;
      to = rest;
      t = 0;
      dur = rest === 0 ? SWING_S : DIP_S;
      landing = rest === 0 && from > 0;
    },
    step(dt: number): boolean {
      if (t >= dur) return false;
      t = Math.min(dur, t + dt);
      const k = t / dur,
        e = to === 0 ? k * k : k * k * (3 - 2 * k);
      deg = from + (to - from) * e;
      if (t >= dur) {
        deg = to;
        if (landing) {
          landing = false;
          return true;
        }
      }
      return false;
    },
  };
}

/** The toe's landing (bent 13's deck end, u 255-260 m): while the leaf is coming down onto the bents (`falling`: the
 * last swing, never a counterweight's dip, which leaves the toe metres up) and is `TOE_CLEAR_DEG` degrees up or less
 * (the last half of a 78 degree swing, all of the last quarter's), anyone within `TOE_MARGIN` of the toe's edge or
 * under it is walked back along the deck, away from the hinge, so the plate never meets a body. Only the local player
 * is moved; the others draw them from presence, about 0.4 s late at 200 ms one way, so the shove starts early enough
 * that the drawn avatar is clear too (60, not 35: 35 left it inside the plate for 160 ms on the other pages;
 * test/railway-r4c-leaf-coop.test.ts). Returns the speed (m/s) toward lower u, 0 when the spot is clear. `u` is the
 * player's metres along the line, `above` their feet over the toe's deck. */
export const TOE_U = 260;
export const TOE_MARGIN = 1.4;
export const TOE_CLEAR_DEG = 60;
export const TOE_SPEED = 6;
export function toeShove(u: number, above: number, deg: number, falling: boolean): number {
  if (!falling || deg > TOE_CLEAR_DEG) return 0;
  if (u <= TOE_U - TOE_MARGIN || u >= TOE_U + 1 || above < -0.5 || above > 3) return 0;
  return TOE_SPEED;
}
