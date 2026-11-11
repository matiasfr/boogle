// The bridge leaf's pose over time (docs/plans/ring-island-build1.md, R4c; calls 8, 9, 35), pure numbers: where the leaf
// should rest for the pawl and the counterweight, and how it gets there. Raised on the pawl; once braced each hung
// footing dips it a quarter; the last one (or the pawl knocked out with all four hung) swings it down, 2.5 s, ease-in.

/** The Aperture row's `brace` encoding (src/sim/railway-components.ts; test/railway-r4c-leaf.test.ts pins it to the sim's). */
export const BRACE = { DOWN: 0, RAISED: 1, BRACED: 2 } as const;

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
