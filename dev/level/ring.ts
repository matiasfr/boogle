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
import { MOVE } from '../../src/proto/place/tech-layout.ts';
import { ENGINE_CAB } from '../../src/proto/wagon/engine.ts';
import { TRAIN_OFFSETS } from '../../src/proto/wagon/cars.ts';
import { ringHeight } from '../../src/proto/greybox/ground.ts';
import {
  RING_BRACE_PLATFORM,
  RING_FORMATION,
  RING_GAP,
  RING_HEAD,
  RING_HOOK,
  RING_LOOP,
  RING_PLATFORM_LAT,
  RING_RAILHEAD_KIT,
  RING_RAMPS,
  RING_RECOVERY,
  RING_S_HEAD,
  RING_STEPS,
  ringDeckY,
  type RingFlight,
} from '../../src/sim/railway-ring-layout.ts';

/** The controller's numbers not exported where they live (src/entities/player/state.ts): sprint speed, the coyote
 * grace, the fall-speed cap; the eye height the hook aims from. */
const SPRINT = 9.5,
  COYOTE = 0.1,
  MAX_FALL = 20,
  EYE = 1.7;
/** The raised leaf (the greybox's 78 degrees; R2's ringIslandPose), and the rail top over the deck. */
const LEAF_UP_DEG = 78,
  RAIL_TOP = 0.22;
const DT = 1 / 240;
/** dev/economy/place-level.ts's conservative glide budget for a drop: less 2 m of drop, 0.8 of the ratio, 2.8 m entry. */
const GLIDE = (drop: number) => Math.max(0, (drop - 2) * (MOVE.glideSpeed / MOVE.glideSink) * 0.8 - 2.8);
const GLIDE_RAW = (drop: number) => Math.max(0, drop * (MOVE.glideSpeed / MOVE.glideSink));

/** One sprint jump, held, the air jump pressed at `press` s after take-off (null: never): the time until the feet come
 * down `drop` m below the take-off, and the first apex's time. */
function jumpFlight(drop: number, press: number | null) {
  let y = 0,
    vy = JUMP_SPEED,
    t = 0,
    pressed = press === null;
  for (; t < 10; t += DT) {
    if (!pressed && t >= press!) {
      vy = Math.max(vy, MOVE.second);
      pressed = true;
    }
    const g = vy < 0 ? JUMP.fallGravity : vy < JUMP.apexSpeed ? APEX_GRAVITY : 1;
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
  for (const v0 of [JUMP_SPEED, MOVE.second]) {
    vy = Math.max(vy, v0);
    while (vy > 0) {
      const g = vy < JUMP.apexSpeed ? APEX_GRAVITY : 1;
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

type Entry = { kind: 'section' | 'fact'; message: string } | { kind: 'assertion'; passed: boolean; message: string };
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
  // A stopped train's cab roof at the end stop: the train's reference stands at s, its cab roof's front edge
  // TRAIN_OFFSETS[0] + roofZ[1] ahead, on the terminal track (lat 0) with the raised leaf straight ahead.
  const roofU = m(head.s - RING_S_HEAD) + TRAIN_OFFSETS[0]! + ENGINE_CAB.roofZ[1],
    roofY = m(ringDeckY(Math.round(roofU * 100))) + RAIL_TOP + ENGINE_CAB.roofTop;
  const toe = m(RING_GAP.hinge) - m(RING_GAP.leaf) * Math.cos((LEAF_UP_DEG * Math.PI) / 180) - 0.4;
  const corner = { u: toe - PLAYER_R, lat: m(RING_FORMATION.right) + PLAYER_R };
  const straightLat = (m(B.lat0) * (corner.u - roofU)) / (m(B.u0) - roofU);
  const diag =
    straightLat >= corner.lat
      ? Math.hypot(m(B.u0) - roofU, m(B.lat0))
      : Math.hypot(corner.u - roofU, corner.lat) + Math.hypot(m(B.u0) - corner.u, Math.max(0, m(B.lat0) - corner.lat));
  const roof = lateDouble(roofY - m(B.y));
  fact(
    `  cab roof at the end stop: u ${f1(roofU)} m, ${f1(roofY)} m (${f1(roofY - m(ringDeckY(Math.round(roofU * 100))))} m over the deck); the raised leaf's toe at u ${f1(toe)} m, so the way round its east side is ${f1(diag)} m`,
  );
  assertion(
    roof.reach <= diag - 1.5,
    `late double jump off a stopped train's cab roof falls short: ${f1(roof.reach)} m against ${f1(diag)} m on the diagonal (${f1(diag - roof.reach)} m short)`,
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
    const d = Math.hypot(m(u - RING_HOOK.u), m(lat - RING_HOOK.lat), m(RING_HOOK.y - B.y) - EYE);
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

  section('Recovery points');
  for (const p of RING_RECOVERY) {
    const ground = ringHeight(p.x / 100 - 1000, p.z / 100);
    assertion(
      m(p.y) > 0.5 && m(p.y) >= ground - 0.1,
      `(${f1(m(p.x))}, ${f1(m(p.y))}, ${f1(m(p.z))}): ${f1(m(p.y))} m, ground ${ground > -1e9 ? f1(ground) : 'sea'}: dry`,
    );
  }
  fact(
    `  the loop: ${m(RING_LOOP.loopCm)} m round, its neck ${m(RING_LOOP.neckCm)} m: the greybox's links run 12 m on from the halt's north end, then 30 m back south to the loop's west point beside the halt (a shape for R3a to settle)`,
  );
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
