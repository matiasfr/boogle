// A turnout's parts from the two track centrelines that part at it (docs/plans/turnouts.md, "(b) Geometry from the two
// centrelines"): where the frog is, the rails a pair of plain tracks does not draw (the diverging road's stock rail
// from the toe, its closure rail cut for the through rail's flangeway, the vee's leg, two wing rails and two check
// rails), how long each shared timber is, and the moving parts (step 6): the two switch blades, each posed for the road
// the points are set for, and where a line's points lever stands. The blades are the first metres of the two inner
// rails, so whoever draws those rails cuts them out (track.ts) and src/entities/railway/turnout-blades.ts draws them.
// Pure, no three.js; Local and cosmetic. Proportions are general railway practice scaled to the 1 m gauge, the blade's
// throw exaggerated so it reads from a platform.

export type XZY = { x: number; z: number; y: number };
/** A track's centreline by metres from the toe (world metres; `y` its rail height, layout.railY). Behind the toe
 * (d < 0) both roads are the one track. */
export type Centre = (d: number) => XZY;
export type RailPiece = {
  role: 'stock' | 'closure' | 'vee' | 'wing' | 'check';
  /** Whose rail it lies beside or belongs to: a through-road part goes down with the through road's track. */
  road: 'through' | 'diverging';
  a: XZY;
  b: XZY;
  /** Metres from the toe at its middle, along its own road. */
  d: number;
  /** Its width, as a share of a plain rail's (a blade is planed thin toward its tip). */
  w: number;
};
/** A switch blade: an inner rail's first metres from its tip, which lies against the other road's stock rail when the
 * points are set for its own road and stands off it by the throw when they are not. */
export type Blade = {
  /** Its heel, metres from the toe (its tip) along its road; the plain rail goes on from there. */
  to: number;
  /** Its centre at d (0..to), the points set `k` of the way over to the diverging road (0 the through road, 1 the
   * diverging road; between while they move). A straight blend in `k`: the point moves on a line. */
  at: (d: number, k: number) => XZY;
  /** Its centre where nothing moves it: the plain inner rail it was cut from (no turnout there yet, or none now). */
  plain: (d: number) => XZY;
};
export type Turnout = {
  /** The toe: where the two roads part. */
  toe: XZY;
  /** +1: the diverging road leaves to the right of the through road, looking from the toe; -1: to the left. */
  hand: 1 | -1;
  /** Where the two inner rails cross, metres from the toe: the first d with the centres a gauge apart. */
  frogD: number;
  /** The angle between the roads there, degrees. */
  frogAngle: number;
  /** Where each road has room for its own sleepers: the first d with the centres a sleeper's length apart. */
  clearD: number;
  bladeLen: number;
  /** The frog's nose (where the inner rails' centres cross), and its distance along each road. */
  nose: XZY & { through: number; diverging: number };
  /** The diverging road's plain rails begin here (metres along it): everything before is in `rails`. */
  plainD: number;
  /** The diverging centre at d (along it), across the through road: signed, + to the through road's right. */
  offset: (d: number) => number;
  /** How far the open blade stands off its closed line at d (along the diverging road), toward the through road's
   * far rail: the throw at the tip, nothing from `bladeLen` on. */
  throwAt: (d: number) => number;
  /** The timber across the through road at d (along the through road): its two ends, metres to the through road's
   * right. Long enough for all four rails, in whole steps; the headblocks at the toe run out toward the lever. Null
   * outside the turnout. */
  span: (d: number) => readonly [number, number] | null;
  rails: RailPiece[];
  /** [the through road's blade, the diverging road's]; a tie bar joins their tips. */
  blades: readonly [Blade, Blade];
  /** Where a line's points lever stands (on the headblocks, on the lever's side), and the through road's heading. */
  lever: XZY & { yaw: number };
};

export const KIT = {
  /** Between a track's rail centres, and a plain rail's width. */
  gauge: 1.0,
  rail: 0.1,
  sleeper: 2.3,
  /** A blade is this share of the lead, between `bladeMin` and `bladeMax` metres. */
  blade: 0.4,
  bladeMin: 1.6,
  bladeMax: 2.4,
  /** How far the open blade's tip stands off its stock rail, centre to centre. */
  throw: 0.14,
  /** A blade's width at its tip and heel, as a share of a rail's: it is planed thin to lie against the stock rail. */
  bladeTip: 0.45,
  bladeHeel: 0.75,
  /** Clear between a running rail and the wing or check rail beside it. */
  flangeway: 0.08,
  wingPast: 0.9,
  wingFlare: 0.12,
  check: 2.4,
  /** Timbers are cut stock: 2.3 m plus whole steps of this. */
  step: 0.3,
  /** The headblocks: timbers this far back from the toe, longer by `headblock` on the lever's side. */
  head: 1.5,
  headblock: 1.2,
  /** A line's points lever: this far out from the through road's centre, abeam the toe (designer call 3), on the
   * headblock behind it. */
  leverOut: 2.0,
  leverBack: 0.2,
} as const;

const EPS = 0.05;
/** A cut timber's extra length: `len` rounded up to whole `KIT.step`s. */
export const wholeSteps = (len: number) => Math.ceil(len / KIT.step - 1e-9) * KIT.step;
const frame = (c: Centre, d: number) => {
  const a = c(d - EPS),
    b = c(d + EPS),
    len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
  const t = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
  // The right-hand normal of a track running t.
  return { p: c(d), t, n: { x: -t.z, z: t.x } };
};
/** The point `lat` metres to the right of road `c` at d. */
const beside = (c: Centre, d: number, lat: number): XZY => {
  const f = frame(c, d);
  return { x: f.p.x + f.n.x * lat, z: f.p.z + f.n.z * lat, y: f.p.y };
};
/** Where a point lies by road `c`: metres along it and to its right. */
function locate(c: Centre, p: { x: number; z: number }, guess: number) {
  let d = guess;
  for (let i = 0; i < 8; i++) {
    const f = frame(c, d);
    d += (p.x - f.p.x) * f.t.x + (p.z - f.p.z) * f.t.z;
  }
  const f = frame(c, d);
  return { d, lat: (p.x - f.p.x) * f.n.x + (p.z - f.p.z) * f.n.z };
}
/** The first d from `from` (stepping to `to`) where a rising `f` reaches `target`, by bisection. */
function reach(f: (d: number) => number, target: number, from: number, to: number) {
  let a = from;
  if (f(a) >= target) return a;
  for (let b = from + EPS; b <= to; b += EPS) {
    if (f(b) < target) {
      a = b;
      continue;
    }
    for (let i = 0; i < 24; i++) {
      const mid = (a + b) / 2;
      if (f(mid) >= target) b = mid;
      else a = mid;
    }
    return b;
  }
  throw new Error(`turnout: the roads never part by ${target} m within ${to} m of the toe`);
}

/** The turnout where `diverging` leaves `through`. `lever` is the side the points lever stands on (+1 the through
 * road's right), which the headblocks run out to. `plain`: where the diverging road's own plain rails already begin
 * (metres along it), when they are a line's and run on unbroken through the frog (track.ts: the gantry carries them).
 * Then the frog is an uncut crossing: `rails` holds only the wing and the check rails, and no stock rail where it
 * would lie on the through road's own. `blade`: the blades' length where the rails they are cut from want one (a heel
 * on a rail joint leaves no sliver of rail: track.ts); `KIT.blade` of the lead otherwise. */
export function turnout(through: Centre, diverging: Centre, lever: 1 | -1, plain?: number, blade?: number): Turnout {
  const REACH = 60;
  const offset = (d: number) => locate(through, diverging(d), d).lat;
  const hand: 1 | -1 = offset(reach((d) => Math.abs(offset(d)), 0.2, 0, REACH)) > 0 ? 1 : -1;
  const frogD = reach((d) => Math.abs(offset(d)), KIT.gauge, 0, REACH),
    clearD = reach((d) => Math.abs(offset(d)), KIT.sleeper, frogD, REACH);
  const bladeLen = blade ?? Math.min(KIT.bladeMax, Math.max(KIT.bladeMin, KIT.blade * frogD));
  const half = KIT.gauge / 2,
    // A wing or check rail's centre from the running rail's.
    gap = KIT.rail + KIT.flangeway;

  // The diverging road's inner rail against the through road's inner rail (`half` to the diverging side): how far
  // across the through road a rail `lat` beside the diverging road has come, toward the diverging side.
  const come = (lat: number) => (d: number) => hand * locate(through, beside(diverging, d, lat), d).lat;
  const inner = come(-hand * half);
  const noseD = reach(inner, half, 0, REACH),
    nosePoint = beside(diverging, noseD, -hand * half),
    noseT = locate(through, nosePoint, noseD).d;
  const ft = frame(through, noseT).t,
    fd = frame(diverging, frogD).t;
  const frogAngle = (Math.acos(Math.min(1, ft.x * fd.x + ft.z * fd.z)) * 180) / Math.PI;
  const plainD = plain ?? noseD + KIT.wingPast + 0.3;

  const rails: RailPiece[] = [];
  /** A rail beside road `c` from `from` to `to`, `lat(d)` to its right, as chords of about 1.5 m. */
  const run = (
    role: RailPiece['role'],
    road: RailPiece['road'],
    lat: (d: number) => number,
    from: number,
    to: number,
    w = 1,
  ) => {
    if (to - from < 0.05) return;
    const c = road === 'through' ? through : diverging,
      n = Math.max(1, Math.round((to - from) / 1.5));
    for (let k = 0; k < n; k++) {
      const d0 = from + ((to - from) * k) / n,
        d1 = from + ((to - from) * (k + 1)) / n;
      rails.push({ role, road, a: beside(c, d0, lat(d0)), b: beside(c, d1, lat(d1)), d: (d0 + d1) / 2, w });
    }
  };
  const at = (lat: number) => () => lat;
  /** `lat` until `from`, then easing `by` further by `to`. */
  const flared = (lat: number, by: number, from: number, to: number) => (d: number) =>
    lat + by * Math.max(0, Math.min(1, (d - from) / (to - from)));

  // The diverging road's far rail is a stock rail: whole from the toe, where the through road's inner rail (the
  // closed blade) lies against it.
  // Where the diverging road's own rails already run from `plain`, the stock rail before them lies on the through
  // road's (they part by a rail's width only about there), so it is that rail.
  if (plain === undefined) run('stock', 'diverging', at(hand * half), 0, plainD);
  else {
    const from = reach((d) => Math.abs(offset(d)), KIT.rail, 0, REACH);
    if (plain - from >= 0.5) run('stock', 'diverging', at(hand * half), from, plain);
  }
  // Its inner rail starts as a blade (`blades`, below), then the closure rail.
  const throwAt = (d: number) => (d >= 0 && d < bladeLen ? KIT.throw * (1 - d / bladeLen) : 0);
  // The closure rail stops a flangeway short of the through rail it would cross, and takes up again past it as the
  // vee's leg (the through rail itself is the vee's other leg).
  const closureEnd = reach(inner, half - gap, bladeLen, REACH);
  if (plain === undefined) {
    run('closure', 'diverging', at(-hand * half), bladeLen, closureEnd);
    run('vee', 'diverging', at(-hand * half), reach(inner, half + 0.03, closureEnd, REACH), plainD);
  } else run('closure', 'diverging', at(-hand * half), bladeLen, Math.min(closureEnd, plainD));
  // Wing rails: each closure rail bent to run beside the other road's vee leg, past the nose, easing away from it
  // (one length each: a short kit rail squeezes its joint plates to scraps).
  {
    const from = locate(through, beside(diverging, closureEnd, -hand * half), closureEnd).d,
      to = noseT + KIT.wingPast;
    run('wing', 'through', flared(hand * (half - gap), -hand * KIT.wingFlare, from, to), from, to);
  }
  {
    const lat = -hand * (half - gap),
      from = reach(come(lat), half, 0, REACH),
      to = noseD + KIT.wingPast;
    run('wing', 'diverging', flared(lat, hand * KIT.wingFlare, from, to), from, to);
  }
  // Check rails: inside each stock rail, abeam the nose.
  run('check', 'through', at(-hand * (half - gap)), noseT - KIT.check / 2, noseT + KIT.check / 2);
  run('check', 'diverging', at(hand * (half - gap)), noseD - KIT.check / 2, noseD + KIT.check / 2);

  const span = (d: number): readonly [number, number] | null => {
    if (d < -KIT.head || d > clearD) return null;
    // The diverging centre where it crosses this timber's line.
    let across = 0;
    if (d > 0) {
      let dd = d;
      for (let i = 0; i < 8; i++) dd += d - locate(through, diverging(dd), d).d;
      across = Math.abs(locate(through, diverging(dd), d).lat);
    }
    const end = KIT.sleeper / 2,
      head = d <= EPS ? KIT.headblock : 0;
    let lo = -end,
      hi = end;
    const far = wholeSteps(across);
    if (hand > 0) hi += far;
    else lo -= far;
    if (lever > 0) hi += head;
    else lo -= head;
    return [lo, hi];
  };

  // The blades. Near the toe each inner rail runs within a rail's width of the other road's stock rail (all four rails
  // start as two), so a closed blade keeps that far in from it, never one rail inside another; open, it stands the
  // throw in from it at the tip, easing to its own line at the heel. Both move together (a tie bar joins the tips).
  const clear = (KIT.rail + KIT.rail * KIT.bladeTip) / 2 + 0.005;
  /** How far a blade at d keeps in from its stock rail, closed and open. */
  const gaps = (d: number) => {
    const inset = Math.max(0, clear - Math.abs(offset(d)));
    return { closed: inset, open: Math.max(throwAt(d), inset) };
  };
  const blades: readonly [Blade, Blade] = [
    {
      to: bladeLen,
      at: (d, k) => {
        const g = gaps(d);
        return beside(through, d, hand * (half - g.closed - (g.open - g.closed) * k));
      },
      plain: (d) => beside(through, d, hand * half),
    },
    {
      to: bladeLen,
      at: (d, k) => {
        const g = gaps(d);
        return beside(diverging, d, -hand * (half - g.open + (g.open - g.closed) * k));
      },
      plain: (d) => beside(diverging, d, -hand * half),
    },
  ];
  const heading = (d: number) => {
    const t = frame(through, d).t;
    return Math.atan2(t.x, t.z);
  };

  return {
    toe: through(0),
    hand,
    frogD,
    frogAngle,
    clearD,
    bladeLen,
    nose: { ...nosePoint, through: noseT, diverging: noseD },
    plainD,
    offset,
    throwAt,
    span,
    rails,
    blades,
    lever: { ...beside(through, -KIT.leverBack, lever * KIT.leverOut), yaw: heading(-KIT.leverBack) },
  };
}
