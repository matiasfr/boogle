// A turnout's parts from the two track centrelines that part at it (docs/plans/turnouts.md, "(b) Geometry from the two
// centrelines"): where the frog is, the rails a pair of plain tracks does not draw (the diverging road's stock rail
// from the toe, its open blade, its closure rail cut for the through rail's flangeway, the vee's leg, two wing rails
// and two check rails) and how long each shared timber is. Drawn for the through road: the through road's own rails
// are whole, so nothing here cuts them. Pure, no three.js; Local and cosmetic. Proportions are general railway
// practice scaled to the 1 m gauge, the blade's throw exaggerated so it reads from a platform.

export type XZY = { x: number; z: number; y: number };
/** A track's centreline by metres from the toe (world metres; `y` its rail height, layout.railY). Behind the toe
 * (d < 0) both roads are the one track. */
export type Centre = (d: number) => XZY;
export type RailPiece = {
  role: 'stock' | 'blade' | 'closure' | 'vee' | 'wing' | 'check';
  /** Whose rail it lies beside or belongs to: a through-road part goes down with the through road's track. */
  road: 'through' | 'diverging';
  a: XZY;
  b: XZY;
  /** Metres from the toe at its middle, along its own road. */
  d: number;
  /** Its width, as a share of a plain rail's (a blade is planed thin toward its tip). */
  w: number;
};
export type Turnout = {
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
  /** The timber across the through road at d (along the through road): its two ends, metres to the through road's
   * right. Long enough for all four rails, in whole steps; the headblocks at the toe run out toward the lever. Null
   * outside the turnout. */
  span: (d: number) => readonly [number, number] | null;
  rails: RailPiece[];
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
} as const;

const EPS = 0.05;
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
 * road's right), which the headblocks run out to. */
export function turnout(through: Centre, diverging: Centre, lever: 1 | -1): Turnout {
  const REACH = 60;
  const offset = (d: number) => locate(through, diverging(d), d).lat;
  const hand: 1 | -1 = offset(reach((d) => Math.abs(offset(d)), 0.2, 0, REACH)) > 0 ? 1 : -1;
  const frogD = reach((d) => Math.abs(offset(d)), KIT.gauge, 0, REACH),
    clearD = reach((d) => Math.abs(offset(d)), KIT.sleeper, frogD, REACH);
  const bladeLen = Math.min(KIT.bladeMax, Math.max(KIT.bladeMin, KIT.blade * frogD));
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
  const plainD = noseD + KIT.wingPast + 0.3;

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
  run('stock', 'diverging', at(hand * half), 0, plainD);
  // Its inner rail starts as the open blade, its tip a throw off the through road's far rail, thin at the tip.
  const open = (d: number) => -hand * half + hand * KIT.throw * (1 - d / bladeLen);
  run('blade', 'diverging', open, 0, bladeLen / 2, 0.45);
  run('blade', 'diverging', open, bladeLen / 2, bladeLen, 0.75);
  // The closure rail stops a flangeway short of the through rail it would cross, and takes up again past it as the
  // vee's leg (the through rail itself is the vee's other leg).
  const closureEnd = reach(inner, half - gap, bladeLen, REACH);
  run('closure', 'diverging', at(-hand * half), bladeLen, closureEnd);
  run('vee', 'diverging', at(-hand * half), reach(inner, half + 0.03, closureEnd, REACH), plainD);
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
    const far = Math.ceil(across / KIT.step - 1e-9) * KIT.step;
    if (hand > 0) hi += far;
    else lo -= far;
    if (lever > 0) hi += head;
    else lo -= head;
    return [lo, hi];
  };

  return {
    hand,
    frogD,
    frogAngle,
    clearD,
    bladeLen,
    nose: { ...nosePoint, through: noseT, diverging: noseD },
    plainD,
    offset,
    span,
    rails,
  };
}
