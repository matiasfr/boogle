// level-check's "Ring Island (planned)" report (docs/plans/ring-island-build1.md, step 1): the gap, the glides, the hook
// ring, the ramps, the railhead's kit and recovery, from src/sim/railway-ring-layout.ts, before any of it is built.
// Place's own envelopes (dev/economy/place-level.ts: GLIDE, MOVE, WALKABLE_NY) plus one new one, the late double jump:
// the controller's jump stepped at 1/240 s with the air jump pressed at every moment of the flight, since
// `secondJump` sets vy to at least 6.8 m/s even while falling and COURSE_DOUBLE (pressed at the apex) is about 3 m
// short of it over a drop. Approximate reachability, no physics: dev/look/evals/ring-greybox.ts and R5's ring-glide
// eval are the witnesses.
import { FIXED, GRAVITY, JUMP_SPEED, PLAYER_R, WALKABLE_NY } from '../../src/constants.ts';
import { JUMP } from '../../src/entities/player/state.ts';
import { APEX_GRAVITY } from '../../src/entities/player/apex-float.ts';
import { MOVE } from '../../src/place/tech-layout.ts';
import { ENGINE, ENGINE_BOILER, ENGINE_CAB } from '../../src/entities/railway/engine.ts';
import { TRAIN_CARS, TRAIN_OFFSETS } from '../../src/entities/railway/cars.ts';
import { CARRY } from '../../src/physics/platforms.ts';
import { TUNABLES } from '../../src/sim/tune.ts';
import { RAIL_LINES, TRAIN_EXTENT, TURNOUT_CM } from '../../src/sim/railway-lines.ts';
import { TRAIN } from '../../src/sim/railway-train.ts';
import { ringHeight } from '../../src/proto/greybox/ring-cones.ts';
import { CONCOURSE, HEAD as GREYBOX_HEAD, HX as GREYBOX_HX } from '../../src/proto/greybox/ring-house.ts';
import { ORIGIN } from '../../src/place/layout.ts';
import { LIVE, beside, type Track } from './rail-network.ts';
import { LIMITS, measure } from './track-continuity.ts';
import {
  RING_BRACE_PLATFORM,
  RING_END,
  RING_END_APPROACH,
  RING_END_BRAKE_CMS2,
  RING_FORMATION,
  RING_GAP,
  RING_HALT,
  RING_HEAD,
  RING_HOOK,
  RING_ORIGIN,
  RING_PLATFORM_LAT,
  RING_RAILHEAD_KIT,
  RING_RAMPS,
  RING_RECOVERY,
  RING_S_HEAD,
  RING_STEEL_WORKS,
  RING_STEEL_YARD,
  RING_STEPS,
  ringAt,
  ringDeckY,
  type RingFlight,
} from '../../src/sim/railway-ring-layout.ts';

/** Literals inside src/entities/player/state.ts, not exported there: sprint speed, the coyote grace, the fall-speed
 * cap. And the eye height the hook aims from. */
const SPRINT = 9.5,
  COYOTE = 0.1,
  MAX_FALL = 20,
  EYE = 1.7;
/** The railway's air jump and glider, from their tunables' defaults (src/sim/tune.ts, cm/s). */
const tuned = (key: string) => TUNABLES.find((t) => t.key === key)!.def / 100;
const AIR_JUMP = tuned('railJumpImpulse'),
  AIR_APEX = tuned('railJumpApexSpeed'),
  GLIDE_SPEED = tuned('railGlideSpeed'),
  GLIDE_SINK = tuned('railGlideSink');
/** The raised leaf (the greybox's 78 degrees; R2's ringIslandPose), and the rail top over the deck. */
const LEAF_UP_DEG = 78,
  RAIL_TOP = 0.22;
const DT = 1 / 240;
/** dev/economy/place-level.ts's conservative glide budget for a drop: less 2 m of drop, 0.8 of the ratio, 2.8 m entry. */
const GLIDE = (drop: number) => Math.max(0, (drop - 2) * (GLIDE_SPEED / GLIDE_SINK) * 0.8 - 2.8);
const GLIDE_RAW = (drop: number) => Math.max(0, drop * (GLIDE_SPEED / GLIDE_SINK));

/** One sprint jump, held, the air jump pressed at `press` s after take-off (null: never): the time until the feet come
 * down `drop` m below the take-off, and the first apex's time. */
function jumpFlight(drop: number, press: number | null) {
  let y = 0,
    vy = JUMP_SPEED,
    t = 0,
    pressed = press === null;
  for (; t < 10; t += DT) {
    if (!pressed && t >= press!) {
      vy = Math.max(vy, AIR_JUMP);
      pressed = true;
    }
    const apex = press !== null && pressed ? AIR_APEX : JUMP.apexSpeed;
    const g = vy < 0 ? JUMP.fallGravity : vy < apex ? APEX_GRAVITY : 1;
    const vy1 = Math.max(-MAX_FALL, vy - GRAVITY * g * DT),
      y1 = y + vy1 * DT;
    if (y1 <= -drop && vy1 < 0) return t + (DT * (y + drop)) / (y - y1);
    y = y1;
    vy = vy1;
  }
  return t;
}
/** Rise and time from take-off to the top of one held jump, and to the top of the air jump pressed at that top. */
function apexes() {
  let y = 0,
    vy = JUMP_SPEED,
    t = 0;
  const out: { t: number; h: number }[] = [];
  for (const [v0, apex] of [
    [JUMP_SPEED, JUMP.apexSpeed],
    [AIR_JUMP, AIR_APEX],
  ] as const) {
    vy = Math.max(vy, v0);
    while (vy > 0) {
      const g = vy < apex ? APEX_GRAVITY : 1;
      vy -= GRAVITY * g * DT;
      y += vy * DT;
      t += DT;
    }
    out.push({ t, h: y });
  }
  return out as [{ t: number; h: number }, { t: number; h: number }];
}
/** The late double jump: the farthest a sprint double jump lands `drop` m down over every press time, plus the coyote
 * grace and the body's radius; and the press at the apex, as COURSE_DOUBLE presses it. */
export function lateDouble(drop: number) {
  const top = apexes()[0].t,
    land = jumpFlight(drop, null);
  let best = { t: 0, press: 0 };
  for (let p = DT; p < land; p += DT) {
    const t = jumpFlight(drop, p);
    if (t > best.t) best = { t, press: p };
  }
  const extra = SPRINT * COYOTE + PLAYER_R;
  return {
    apex: SPRINT * jumpFlight(drop, top),
    late: SPRINT * best.t,
    press: best.press,
    reach: SPRINT * best.t + extra,
    apexReach: SPRINT * jumpFlight(drop, top) + extra,
  };
}

const flights = new Map<number, number>();
/** The longest late-double-jump flight (s) over a drop, to the nearest 2.5 cm of drop (about 1 ms of flight). */
function longestFlight(drop: number) {
  const key = Math.round(drop * 40);
  let t = flights.get(key);
  if (t === undefined) flights.set(key, (t = lateDouble(key / 40).late / SPRINT));
  return t;
}
/** Every standable top of line 2's train, by its front edge (car-local +z is along +s): car offset, z, height over
 * the rail, half width. */
const STANDABLE = [
  { name: 'cab roof', off: TRAIN_OFFSETS[0]!, z: ENGINE_CAB.roofZ[1], y: ENGINE_CAB.roofTop, hx: ENGINE_CAB.roofHx },
  { name: 'chimney', off: TRAIN_OFFSETS[0]!, z: ENGINE_BOILER.chimney.z, y: ENGINE_BOILER.chimney.y, hx: 0 },
  { name: 'boiler top to its front', off: TRAIN_OFFSETS[0]!, z: ENGINE_BOILER.zFront, y: ENGINE_BOILER.top, hx: 0 },
  { name: 'running board', off: TRAIN_OFFSETS[0]!, z: ENGINE.hz, y: ENGINE.top, hx: ENGINE.hx },
  ...TRAIN_CARS.slice(1).map((c, n) => ({
    name: n === TRAIN_CARS.length - 2 ? "wagon's deck" : `flatbed ${n + 1}`,
    off: TRAIN_OFFSETS[n + 1]!,
    z: c.hz,
    y: c.top,
    hx: c.hx,
  })),
];
type P2 = { u: number; lat: number };
/** Distance from q to the convex polygon `poly` (counter-clockwise in (u, lat)), 0 inside. */
function polyDist(q: P2, poly: readonly P2[]) {
  let inside = true,
    best = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!,
      b = poly[(i + 1) % poly.length]!;
    const eu = b.u - a.u,
      el = b.lat - a.lat;
    if (eu * (q.lat - a.lat) - el * (q.u - a.u) < 0) inside = false;
    const t = Math.max(0, Math.min(1, ((q.u - a.u) * eu + (q.lat - a.lat) * el) / (eu * eu + el * el || 1)));
    best = Math.min(best, Math.hypot(q.u - a.u - eu * t, q.lat - a.lat - el * t));
  }
  return inside ? 0 : best;
}
/** The polygon cut to the side of the line from l through c that holds the higher lat (east of the leaf's toe). */
function clip(poly: readonly P2[], l: P2, c: P2) {
  const side = (p: P2) => (c.u - l.u) * (p.lat - l.lat) - (c.lat - l.lat) * (p.u - l.u);
  const out: P2[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!,
      b = poly[(i + 1) % poly.length]!,
      sa = side(a),
      sb = side(b);
    if (sa >= 0) out.push(a);
    if (sa * sb < 0)
      out.push({ u: a.u + ((b.u - a.u) * sa) / (sa - sb), lat: a.lat + ((b.lat - a.lat) * sa) / (sa - sb) });
  }
  return out;
}
/** A train easing into bent 13's end stop at `brake` m/s², no faster than `approach` m/s: the late double jump with the
 * kept carry (src/physics/platforms.ts: the deck's speed less CARRY.skid for CARRY.departureSkidS, kept to the
 * landing) from every standable top at every 10 cm before the stop, each landing on the brace platform by the least
 * own motion whose straight world path passes east of the raised leaf's toe. One row per top, worst first. */
export function brakingCarry(brake: number, approach: number) {
  const head = RING_HEAD[7]!,
    B = RING_BRACE_PLATFORM,
    lineSpeed = (RAIL_LINES[1]!.speed * 10) / 100;
  const toe = m(RING_GAP.hinge) - m(RING_GAP.leaf) * Math.cos((LEAF_UP_DEG * Math.PI) / 180) - 0.4;
  const corner = { u: toe - PLAYER_R, lat: m(RING_FORMATION.right) + PLAYER_R };
  const rect = [
    { u: m(B.u0), lat: m(B.lat1) },
    { u: m(B.u0), lat: m(B.lat0) },
    { u: m(B.u1), lat: m(B.lat0) },
    { u: m(B.u1), lat: m(B.lat1) },
  ];
  const vMax = Math.min(lineSpeed, approach);
  const rows = STANDABLE.map((p) => {
    const stop = m(head.s - RING_S_HEAD) + p.off + p.z;
    let worst = { spare: -Infinity, d: 0, v: 0, reach: 0, need: 0, u: 0, y: 0 };
    for (let d = 0; d <= (vMax * vMax) / (2 * brake) + 5; d += 0.1) {
      const v = Math.min(vMax, Math.sqrt(2 * brake * d)),
        u = stop - d,
        y = m(ringDeckY(Math.round(u * 100))) + RAIL_TOP + p.y;
      const t = longestFlight(y - m(B.y)) + COYOTE,
        kept = Math.max(0, v - CARRY.skid * CARRY.departureSkidS);
      const poly = clip(rect, { u, lat: p.hx }, corner),
        need = poly.length ? polyDist({ u: u + kept * t, lat: p.hx }, poly) : Infinity,
        reach = SPRINT * t + PLAYER_R;
      if (reach - need > worst.spare) worst = { spare: reach - need, d, v, reach, need, u, y };
    }
    return { part: p.name, ...worst };
  });
  return rows.sort((a, b) => b.spare - a.spare);
}

type Entry = { kind: 'section' | 'fact'; message: string } | { kind: 'assertion'; passed: boolean; message: string };

/** The eased lateral shift of a crossover (src/place/layout.ts crossLat's smoothstep): up track (lat -4 m) at u0 to the
 * down track at u1, metres. */
const ease = (t: number) => {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
};
/** ringAt in metres, unrounded (a 1 cm grid on 0.5 m chords would read as kinks). */
function ringAtM(u: number, lat: number) {
  const k = Math.sqrt(1 + 0.0272 * 0.0272);
  return {
    x: (140200 + (0.0272 * u * 100 + lat * 100) / k) / 100,
    z: (-37200 + (0.0272 * lat * 100 - u * 100) / k) / 100,
  };
}
/** Radius of the circle through three (x, z) points, m. */
function radius3(a: { x: number; z: number }, b: { x: number; z: number }, c: { x: number; z: number }) {
  const ab = Math.hypot(b.x - a.x, b.z - a.z),
    bc = Math.hypot(c.x - b.x, c.z - b.z),
    ca = Math.hypot(a.x - c.x, a.z - c.z);
  const cr = Math.abs((b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x));
  return cr < 1e-12 ? Infinity : (ab * bc * ca) / (2 * cr);
}
/** A crossover's steepest angle off its straight and its tightest radius, the continuity report's way (3-point, 2 m
 * arms, 0.5 m steps, from 2 m before to 2 m after): `p(s, lat)` is a point `lat` m beside the base track at s m. */
function crossoverShape(p: (s: number, lat: number) => { x: number; z: number }, s0: number, s1: number) {
  const lat = (s: number) => -4 * (1 - ease((Math.max(s0, Math.min(s1, s)) - s0) / (s1 - s0)));
  let steep = 0,
    minR = Infinity,
    at = s0;
  for (let s = s0 - 2; s <= s1 + 2; s += 0.5) {
    const t0 = p(s - 0.25, 0),
      t1 = p(s + 0.25, 0),
      c0 = p(s - 0.25, lat(s - 0.25)),
      c1 = p(s + 0.25, lat(s + 0.25));
    const d = Math.atan2(c1.x - c0.x, c1.z - c0.z) - Math.atan2(t1.x - t0.x, t1.z - t0.z);
    steep = Math.max(steep, Math.abs((Math.atan2(Math.sin(d), Math.cos(d)) * 180) / Math.PI));
    const R = radius3(p(s - 2, lat(s - 2)), p(s, lat(s)), p(s + 2, lat(s + 2)));
    if (R < minR) {
      minR = R;
      at = s;
    }
  }
  return { steep, minR, at };
}

/** "The island terminus (buffers and a crossover)" (R1b; owner, 10 November: "Buffers about 15 m past the halt, with a
 * crossover before it"): RING_END against the halt, the trains' extents, the signal, the ground, the station house
 * and the jump reach at the new end. */
function terminus(
  fact: (message: string) => void,
  section: (message: string) => void,
  assertion: (passed: boolean, message: string) => void,
) {
  const E = RING_END,
    H = RING_HALT,
    LONG = TRAIN_EXTENT; // rail-map's long train is the extent from v33 (fourth-car, R1); V2 makes the rows one
  section('The island terminus (buffers and a crossover)');
  for (const [k, b] of E.buffers.entries())
    assertion(
      E.bufferU - H.u1 === 1500 && b.x === ringAt(E.bufferU, RING_FORMATION.tracks[k]!).x,
      `${k ? 'down' : 'up'} track's buffer face at u ${m(E.bufferU)} m, ${f1(m(E.bufferU - H.u1))} m past the platforms: world (${f1(m(b.x))}, ${f1(m(b.y))}, ${f1(m(b.z))})`,
    );
  fact(`  the end board (blank) 1.5 m behind them at (${f1(m(E.board.x))}, ${f1(m(E.board.y))}, ${f1(m(E.board.z))})`);

  const cLen = E.cross.u1 - E.cross.u0;
  assertion(
    cLen === 2200 && cLen >= TURNOUT_CM && H.u0 - E.cross.u1 === 1100,
    `the crossover u ${m(E.cross.u0)}-${m(E.cross.u1)} m: ${f1(m(cLen))} m (a turnout is ${f1(m(TURNOUT_CM))}), ending ${f1(m(H.u0 - E.cross.u1))} m short of the platforms`,
  );
  const here = crossoverShape((u, lat) => ringAtM(u, lat), m(E.cross.u0), m(E.cross.u1));
  const F = LIVE[1].f.crossover!,
    far = crossoverShape((s, lat) => beside(LIVE[1].line, s, lat), F[0], F[1]);
  fact(
    `  deck ${f1(m(ringDeckY(E.cross.u0)))} m to ${f1(m(ringDeckY(E.cross.u1)))} m on the 4% grade (level from u ${f1(m(H.u0 - 50))}); the eased shift's steepest angle ${f1(here.steep)} degrees, tightest radius ${f1(here.minR)} m at u ${f1(here.at)} (Far Head's live crossover: ${f1(far.steep)} degrees, ${f1(far.minR)} m)`,
  );

  // Every track at the end, as the continuity report measures track: kinks, curvature, grade.
  const track = (id: string, kind: Track['kind'], u0: number, u1: number, lat: (u: number) => number): Track => {
    const pts = [];
    for (let u = u0; u <= u1 + 1e-6; u += 0.5) {
      const p = ringAtM(u, lat(u));
      pts.push({ ...p, y: m(ringDeckY(Math.round(u * 100))), s: m(RING_S_HEAD) + u });
    }
    return { id, line: 'line2', label: id, status: 'v27', kind, nominal: 0.5, pts, pose: 'polyline', enforce: false };
  };
  const c0 = m(E.cross.u0),
    c1 = m(E.cross.u1),
    end = m(E.bufferU);
  const rows = [
    track('island down track', 'down', c0 - 10, end, () => 0),
    track('island up track', 'up', c0 - 10, end, () => -4),
    track('island crossover', 'crossover', c0 - 10, c1 + 10, (u) => -4 * (1 - ease((u - c0) / (c1 - c0)))),
  ].map(measure);
  for (const { row, findings } of rows) {
    const kinks = findings.filter((x) => x.kind === 'kink' || x.kind === 'reversed' || x.kind === 'gap');
    assertion(
      row.maxKink <= LIMITS.kinkSoft && !kinks.length && row.maxGrade <= LIMITS.grade + 0.05,
      `${row.id}: ${f1(row.length)} m, worst kink ${row.maxKink.toFixed(2)} degrees (at most ${LIMITS.kinkSoft}), tightest radius ${row.minRadius === Infinity ? 'straight' : `${f1(row.minRadius)} m`} on the 5 m resample, steepest grade ${row.maxGrade.toFixed(2)}%`,
    );
  }
  fact(
    `  the crossover is tighter than the continuity report's ${LIMITS.radius} m, as every turnout on lines 1 and 2 is (reported there, not failed); it is Far Head's shape on a straight`,
  );

  for (const [name, t] of [
    ["today's train", TRAIN_EXTENT],
    ['the long train', LONG],
  ] as const) {
    const tail = E.u - t.behindCm,
      nose = E.u + t.aheadCm;
    assertion(
      tail - E.cross.u1 >= 500 && E.bufferU - nose >= 1470 && tail >= H.u0 && nose <= H.u1,
      `${name} (${m(t.aheadCm)} m ahead, ${m(t.behindCm)} m behind) standing at u ${m(E.u)}: u ${f1(m(tail))}-${f1(m(nose))}, ${f1(m(tail - E.cross.u1))} m clear of the crossover, ${f1(m(E.bufferU - nose))} m short of the buffers, beside the platforms (u ${m(H.u0)}-${m(H.u1)})`,
    );
  }
  for (const [name, t] of [
    ["today's train", TRAIN_EXTENT],
    ['the long train', LONG],
  ] as const) {
    const signal = E.mergeCm - t.aheadCm,
      tail = signal - t.behindCm;
    const pastHinge = tail - (RING_S_HEAD + RING_GAP.hinge),
      pastHead = tail - RING_HEAD[7]!.s;
    assertion(
      pastHinge >= 2000 && pastHead >= TRAIN.sepCm,
      `${name} held at the signal (u ${f1(m(signal - RING_S_HEAD))}): tail at u ${f1(m(tail - RING_S_HEAD))}, ${f1(m(pastHinge))} m past the hinge, ${f1(m(pastHead))} m past the Railhead's stop (sepCm ${f1(m(TRAIN.sepCm))})`,
    );
  }
  assertion(
    E.mergeCm - TRAIN_EXTENT.aheadCm <= E.s - TRAIN.sepCm,
    `the catalog's signal (s ${f1(m(E.mergeCm - TRAIN_EXTENT.aheadCm))} m) is at least sepCm short of the stop (s ${f1(m(E.s))} m): endBlocks keeps it`,
  );

  // The ground under the run-off: the cone rises through the deck, so the last metres are a cutting to RING_END.cut.
  const lats = [RING_FORMATION.left, RING_FORMATION.tracks[0], RING_FORMATION.tracks[1], RING_FORMATION.right];
  let deepest = { cut: 0, u: 0, lat: 0 },
    first = Infinity;
  fact(`  ground under the run-off (lat ${lats.map(m).join(', ')} m), cut to ${f1(m(E.cut))} m:`);
  for (let u = E.bed.u0; u < E.bed.u1 + 200; u += 200) {
    const uu = Math.min(u, E.bed.u1); // every 2 m, and the bed's end behind the faces
    const g = lats.map((lat) => {
      const p = ringAt(uu, lat);
      return ringHeight(m(p.x) - ORIGIN.x, m(p.z) - ORIGIN.z);
    });
    for (const [i, h] of g.entries()) {
      const cut = h - m(E.cut);
      if (cut > 0 && uu < first) first = uu;
      if (cut > deepest.cut) deepest = { cut, u: uu, lat: lats[i]! };
    }
    fact(`    u ${f1(m(uu))}: ${g.map((h) => (h > -1e9 ? f1(h) : 'sea')).join(', ')} m`);
  }
  assertion(
    deepest.cut <= 2,
    `the cutting is nowhere over 2.0 m: it starts at about u ${first === Infinity ? 'none' : f1(m(first))}, deepest ${f1(deepest.cut)} m at u ${f1(m(deepest.u))}, lat ${f1(m(deepest.lat))}`,
  );

  // The station house's terrace (the greybox's skewed axes: invert its `at`) and its plank crossing.
  const T = CONCOURSE.terrace,
    X = CONCOURSE.crossing;
  const greybox = (p: { x: number; z: number }) => {
    const dx = m(p.x) - GREYBOX_HEAD.x,
      dz = m(p.z) - GREYBOX_HEAD.z,
      n = 1 + GREYBOX_HX * GREYBOX_HX;
    return { u: (GREYBOX_HX * dx - dz) / n, lat: (dx + GREYBOX_HX * dz) / n };
  };
  const geometry = [
    ...E.buffers,
    E.board,
    ...[E.bed.u0, E.bed.u1].flatMap((u) => [ringAt(u, E.bed.lat0), ringAt(u, E.bed.lat1)]),
  ].map(greybox);
  let clear = Infinity;
  for (const g of geometry)
    clear = Math.min(clear, Math.max(gap(g.u, g.u, T.u0 - 1, T.u1 + 1), gap(g.lat, g.lat, T.lat0 - 1, T.lat1 + 1)));
  assertion(
    clear > 0 && Math.min(...geometry.map((g) => g.lat)) >= m(RING_FORMATION.left) - 0.2,
    `nothing of the end inside the station house's terrace grown by 1 m (u ${T.u0 - 1}-${T.u1 + 1}, lat ${T.lat0 - 1} to ${T.lat1 + 1}): nearest ${f1(clear)} m outside it, westmost lat ${f1(Math.min(...geometry.map((g) => g.lat)))}`,
  );
  assertion(
    m(E.bufferU) - X.u1 >= 10,
    `the buffer faces ${f1(m(E.bufferU) - X.u1)} m past the plank crossing's north edge (u ${X.u1}; at least 10)`,
  );

  // The easing stop and the jump reach at the new end.
  fact(
    `  the railhead's end stops are unchanged (RING_HEAD, RING_END_BRAKE_CMS2 ${f1(m(RING_END_BRAKE_CMS2))} m/s²): its braking rows are asserted above`,
  );
  const lineBrake = RAIL_LINES[1]!.accel,
    vLine = (RAIL_LINES[1]!.speed * 10) / 100,
    platform = m(H.y + 90);
  let worst = { land: -Infinity, part: '', v: 0, d: 0 };
  for (const p of STANDABLE) {
    const stop = m(E.u) + p.off + p.z;
    let best = { land: -Infinity, v: 0, d: 0 };
    for (let d = 0; d <= (vLine * vLine) / (2 * lineBrake) + 5; d += 0.1) {
      const v = Math.min(vLine, Math.sqrt(2 * lineBrake * d)),
        u = stop - d,
        y = m(ringDeckY(Math.round(u * 100))) + RAIL_TOP + p.y;
      const t = longestFlight(y - platform) + COYOTE,
        kept = Math.max(0, v - CARRY.skid * CARRY.departureSkidS),
        land = u + (kept + SPRINT) * t + PLAYER_R;
      if (land > best.land) best = { land, v, d };
    }
    fact(`    ${p.name}: lands at most at u ${f1(best.land)} (${f1(best.v)} m/s, ${f1(best.d)} m before the stop)`);
    if (best.land > worst.land) worst = { ...best, part: p.name };
  }
  assertion(
    worst.land < m(E.bufferU),
    `a late double jump off a train braking at the line's ${f1(lineBrake)} m/s² into u ${m(E.u)}, aimed along the track at the platforms' height, lands short of the buffer faces: worst the ${worst.part}, u ${f1(worst.land)}, ${f1(m(E.bufferU) - worst.land)} m short`,
  );
  const level = lateDouble(0).reach;
  fact(
    `  from the platforms' north end a late double jump on the level reaches ${f1(level)} m, to u ${f1(m(H.u1) + level)}: over the buffers onto the open ground behind them (nothing there is gated)`,
  );
}
const m = (cm: number) => cm / 100;
const f1 = (x: number) => x.toFixed(1);
/** Gap between two intervals, 0 if they overlap. */
const gap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, b0 - a1, a0 - b1);

export function checkRing() {
  const entries: Entry[] = [];
  const fact = (message: string) => entries.push({ kind: 'fact', message });
  const section = (message: string) => entries.push({ kind: 'section', message });
  const assertion = (passed: boolean, message: string) => entries.push({ kind: 'assertion', passed, message });
  const platTop = (ucm: number) => m(ringDeckY(ucm) + 90);
  const B = RING_BRACE_PLATFORM,
    head = RING_HEAD[7]!,
    [a1, a2] = apexes();

  section('The gap (bent 13 railhead, u 260 m, to the brace platform at u 284 m)');
  const takeoff = platTop(head.u),
    drop = takeoff - m(B.y),
    near = m(B.u0 - head.u);
  const dj = lateDouble(drop);
  fact(
    `  take-off ${f1(takeoff)} m, platform ${f1(m(B.y))} m: drop ${f1(drop)} m, near edge ${f1(near)} m out. Double jump at the apex ${f1(dj.apex)} m, pressed late (${dj.press.toFixed(2)} s) ${f1(dj.late)} m, + grace ${f1(SPRINT * COYOTE)} + body ${f1(PLAYER_R)} = ${f1(dj.reach)} m`,
  );
  assertion(
    dj.reach <= near - 1.5,
    `late double jump off the platform's end falls short: ${f1(dj.reach)} m against ${f1(near)} m (${f1(near - dj.reach)} m short, needs 1.5)`,
  );
  // A train easing into the end stop (review of R1, P1): leaving a moving deck keeps its speed through the air
  // (src/physics/platforms.ts carryStep), so every standable top of the train is a launch at every speed it brakes
  // through. R3a's end-stop leg brakes at RING_END_BRAKE_CMS2, no faster than RING_END_APPROACH.
  const brake = m(RING_END_BRAKE_CMS2),
    approach = m(RING_END_APPROACH);
  fact(
    `  a train eases into the end stop at ${f1(brake)} m/s² from at most ${f1(approach)} m/s; from each standable top:`,
  );
  for (const r of brakingCarry(brake, approach))
    assertion(
      r.spare <= -1.5,
      `${r.part}: worst at ${f1(r.v)} m/s, ${f1(r.d)} m before the stop (u ${f1(r.u)}, ${f1(r.y)} m): own reach ${f1(r.reach)} m against ${f1(r.need)} m after the carry, ${f1(-r.spare)} m short`,
    );
  const lineBrake = RAIL_LINES[1]!.accel,
    free = brakingCarry(lineBrake, 20)[0]!;
  let largest = 0;
  for (let a = 3.5; a >= 1 - 1e-9 && !largest; a -= 0.05) if (brakingCarry(a, approach)[0]!.spare <= -1.5) largest = a;
  fact(
    `  at the line's own ${f1(lineBrake)} m/s² and 20 m/s the ${free.part} would land with ${f1(free.spare)} m to spare; the largest braking that keeps 1.5 m from a ${f1(approach)} m/s approach is ${largest ? largest.toFixed(2) : 'none at or above 1'} m/s²`,
  );
  const both = SPRINT * a2.t,
    one = SPRINT * a1.t;
  const conservative = both + GLIDE(drop + a2.h),
    rawBoth = both + GLIDE_RAW(drop + a2.h),
    rawOne = one + GLIDE_RAW(drop + a1.h),
    straight = GLIDE_RAW(drop);
  fact(
    `  jumps: one ${f1(a1.h)} m up in ${a1.t.toFixed(3)} s, with the air jump at its top ${f1(a2.h)} m in ${a2.t.toFixed(3)} s. Glides: after both ${f1(rawBoth)} m raw, ${f1(conservative)} m conservative; after one ${f1(rawOne)} m raw; straight off the edge ${f1(straight)} m raw (${straight >= near ? 'reaches' : 'a splash'})`,
  );
  assertion(
    conservative >= near,
    `a glide after a sprint jump and air jump reaches the near edge on the conservative budget: ${f1(conservative)} m against ${f1(near)} m`,
  );
  assertion(rawOne >= near, `a glide after one sprint jump reaches it raw: ${f1(rawOne)} m against ${f1(near)} m`);

  section('Early glides: from each railhead, the farthest glide (sprint jump, air jump, raw, + grace + body)');
  const folk = [
    { name: 'the brace platform', u0: m(B.u0), u1: m(B.u1), lat0: m(B.lat0), lat1: m(B.lat1), y: m(B.y) },
    {
      name: 'their deck past the leaf',
      u0: m(RING_GAP.hinge) + 1,
      u1: m(RING_GAP.hinge) + 1,
      lat0: m(RING_FORMATION.left),
      lat1: m(RING_FORMATION.right),
      y: m(ringDeckY(RING_GAP.hinge + 100)),
    },
  ];
  for (let k = 0; k < RING_HEAD.length; k++) {
    const h = RING_HEAD[k]!,
      cab = m(h.s - RING_S_HEAD) + TRAIN_OFFSETS[0]! + ENGINE_CAB.roofZ[1];
    const launches = [
      {
        name: 'platform end',
        u0: m(h.u),
        u1: m(h.u),
        lat0: m(RING_PLATFORM_LAT.lat0),
        lat1: m(RING_PLATFORM_LAT.lat1),
        y: platTop(h.u),
      },
      {
        name: 'cab roof',
        u0: cab,
        u1: cab,
        lat0: 0,
        lat1: 0,
        y: m(ringDeckY(Math.round(cab * 100))) + RAIL_TOP + ENGINE_CAB.roofTop,
      },
    ];
    let worst = { spare: -Infinity, text: '' };
    for (const l of launches)
      for (const t of folk) {
        const d = Math.hypot(gap(l.u0, l.u1, t.u0, t.u1), gap(l.lat0, l.lat1, t.lat0, t.lat1)),
          reach = both + GLIDE_RAW(l.y - t.y + a2.h) + SPRINT * COYOTE + PLAYER_R;
        if (reach - d > worst.spare)
          worst = { spare: reach - d, text: `${l.name} to ${t.name}: ${f1(reach)} m against ${f1(d)} m` };
      }
    if (k <= 5)
      assertion(worst.spare < 0, `head ${k} (u ${m(h.u)} m): no glide reaches the folk's side; nearest ${worst.text}`);
    else
      fact(
        `  head ${k} (u ${m(h.u)} m): ${worst.spare >= 0 ? 'reaches' : 'short'}, ${worst.text} (reported: nothing there works before the gap is footed)`,
      );
  }
  fact(
    "  not counted: the hinge pier's ramp (its foot is in the sea: what reaches it, a swimmer reaches, Level finding 7) and the hook pile (it stands only from bent 13)",
  );

  section('The hook ring (u 276 m, lat 12 m, 17.5 m) from the brace platform, at eye height');
  for (const [u, lat] of [
    [B.u0, B.lat0],
    [B.u0, B.lat1],
    [B.u1, B.lat0],
    [B.u1, B.lat1],
  ] as const) {
    // In world cm, as test/railway-ring-layout.test.ts measures it.
    const c = ringAt(u, lat),
      d = Math.hypot(m(c.x - RING_HOOK.x), m(c.z - RING_HOOK.z), m(RING_HOOK.y - B.y) - EYE);
    assertion(d <= MOVE.hookRange, `corner u ${m(u)}, lat ${m(lat)}: ${f1(d)} m (hook ${MOVE.hookRange} m)`);
  }
  const rings = [RING_HOOK];
  assertion(
    rings.every((r) => r.pad.u <= RING_GAP.toe && r.u < RING_GAP.hinge),
    `no hook target on the folk's side: the one ring pulls onto our pad at u ${m(RING_HOOK.pad.u)} m (no ring past the hinge)`,
  );

  section('Ramps (flights at most 30 degrees, slipways 15, walkable at WALKABLE_NY)');
  const grade = (fl: RingFlight) => (Math.atan2(Math.abs(fl.y1 - fl.y0), Math.abs(fl.u1 - fl.u0)) * 180) / Math.PI;
  const ramps = [
    ...RING_HEAD.map((h, k) => ({ name: `railhead ${k}`, flights: h.ramp.flights })),
    ...RING_RAMPS.map((r) => ({ name: 'hinge pier', flights: r.flights })),
    { name: "brace platform's steps", flights: [RING_STEPS] },
  ];
  for (const r of ramps) {
    const slips = r.flights.filter((fl) => fl.slip).map(grade),
      steps = r.flights.filter((fl) => !fl.slip).map(grade);
    const ok =
      slips.every((g) => g <= 15.05) &&
      steps.every((g) => g <= 30) &&
      [...slips, ...steps].every((g) => Math.cos((g * Math.PI) / 180) > WALKABLE_NY);
    assertion(
      ok,
      `${r.name}: ${steps.length} flights ${steps.map(f1).join(', ')} degrees${slips.length ? `, slipway ${slips.map(f1).join(', ')}` : ''}`,
    );
  }

  section("The railhead's kit, over the platform's last 30 m");
  const kit = RING_RAILHEAD_KIT,
    low = [kit.rack, kit.lever, kit.buffer].map(m),
    high = [kit.mast, ...kit.arm].map(m),
    reachable = Math.max(...low) + a2.h;
  assertion(
    low.every((y) => y <= 1.6) && high.every((y) => y > reachable),
    `rack ${f1(m(kit.rack))}, lever ${f1(m(kit.lever))}, buffer ${f1(m(kit.buffer))} m over it (at most 1.6); the jib's mast ${f1(m(kit.mast))} and arm ${high.slice(1).map(f1).join('-')} m, out of a double jump from the rack's top (${f1(reachable)} m)`,
  );

  section("The steel works' points (ring-island-build2, R1; level flags 1 and 2), on the works yard's deck");
  // Build 1's works yard (src/entities/ring-island/view.ts): its deck u 430..468, lat 5.3..16 at 8.9 m; the tarp stack
  // u 430.6..443.4, lat 7.1..13.9; the anvil u 450.8..453.2, lat 9.8..12.2; the hammer's posts 0.5 m square at u 452,
  // lat 9.1 and 12.9. The planned shed (V1) stands inside u 448..455, lat 6.5..14, its door wall facing the platform.
  const solids = [
    { name: 'the tarp stack', u0: 430.6, u1: 443.4, lat0: 7.1, lat1: 13.9 },
    { name: 'the anvil', u0: 450.8, u1: 453.2, lat0: 9.8, lat1: 12.2 },
    { name: "the hammer's west post", u0: 451.75, u1: 452.25, lat0: 8.85, lat1: 9.35 },
    { name: "the hammer's east post", u0: 451.75, u1: 452.25, lat0: 12.65, lat1: 13.15 },
  ];
  const where = (p: { x: number; z: number }) => {
    // Invert ringAt: u along the heading, lat across it (both true metres).
    const dx = m(p.x - RING_ORIGIN.x),
      dz = m(p.z - RING_ORIGIN.z),
      unit = Math.sqrt(1 + 0.0272 * 0.0272);
    return { u: (0.0272 * dx - dz) / unit, lat: (dx + 0.0272 * dz) / unit };
  };
  const yard = where(RING_STEEL_YARD),
    works = where(RING_STEEL_WORKS);
  for (const [name, p, site] of [
    ['yard (rail.steelTake)', yard, RING_STEEL_YARD],
    ['works (rail.steel)', works, RING_STEEL_WORKS],
  ] as const) {
    const onDeck = p.u > 430 && p.u < 468 && p.lat > 5.3 && p.lat < 16 && site.y === 890;
    const clear = solids.map((b) => ({
      name: b.name,
      gap: Math.hypot(gap(p.u, p.u, b.u0, b.u1), gap(p.lat, p.lat, b.lat0, b.lat1)),
    }));
    const nearest = clear.reduce((a, b) => (b.gap < a.gap ? b : a));
    assertion(
      onDeck && nearest.gap >= PLAYER_R,
      `${name} at u ${f1(p.u)}, lat ${f1(p.lat)}, ${f1(m(site.y))} m: on the deck, ${f1(nearest.gap)} m clear of ${nearest.name}`,
    );
  }
  const carry = Math.hypot(works.u - yard.u, works.lat - yard.lat);
  assertion(
    carry <= 15 && yard.u < 448,
    `yard to works ${f1(carry)} m, level, no track crossed (the plan's budget: under 15 m); the yard west of the shed (u 448)`,
  );
  assertion(
    Math.abs(works.lat - 6.5) < 0.05 && works.u > 448 && works.u < 455,
    `the works point is at the shed's doorway (lat 6.5, u 448..455), ${f1(6.5 - 5.3)} m from the platform's edge`,
  );

  section('Recovery points');
  for (const p of RING_RECOVERY) {
    const ground = ringHeight(p.x / 100 - ORIGIN.x, p.z / 100 - ORIGIN.z);
    assertion(
      m(p.y) > 0.5 && m(p.y) >= ground - 0.1,
      `(${f1(m(p.x))}, ${f1(m(p.y))}, ${f1(m(p.z))}): ${f1(m(p.y))} m, ground ${ground > -1e9 ? f1(ground) : 'sea'}: dry`,
    );
  }
  terminus(fact, section, assertion);
  fact(`  (stepped at 1/${Math.round(1 / DT)} s; the controller steps at 1/${Math.round(1 / FIXED)} s)`);
  const failures = entries.filter((e) => e.kind === 'assertion' && !e.passed).length;
  return { level: 'ring (planned)', entries, failures };
}

export function printRing(report: ReturnType<typeof checkRing>) {
  console.log('\nRing Island (planned)');
  for (const e of report.entries)
    console.log(e.kind === 'assertion' ? `${e.passed ? '  ok  ' : ' FAIL '} ${e.message}` : e.message);
  console.log(`ring (planned): ${report.failures ? `${report.failures} PROBLEMS` : 'ok'}`);
}

if (import.meta.main) {
  const report = checkRing();
  printRing(report);
  process.exitCode = report.failures ? 1 : 0;
}
