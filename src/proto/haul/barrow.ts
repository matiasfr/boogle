// Haul variant `barrow` (?proto=haul&v=barrow): a wheelbarrow carries the logs instead of your back. Take logs at a
// bundle with the barrow beside it and they drop into its tray; push it (E to grab the handles, or just walk into it),
// scoop spilled piles by rolling over them, and tip it into a ring of the open work site (E there) to pour. Too fast
// downhill, a hard turn at speed or a hit and it wobbles, then goes over: the logs spill as physics logs and settle
// into piles. Serves DESIGN.md 2 (physics toys first) and 1 (toys before chores).
//
// Lockstep is unchanged: the logs in the tray are your own stack (the room's hard cap is the barrow's cap), a spill
// is `pile.drop` and a pour is `site.stock`, counted when each loose log comes to rest (./loose-logs.ts). The barrow
// itself is Owner kind, like the ball: one physics body this tab simulates, its pose published as presence `barrow`.
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { FIXED, INTERP_MS, PLAYER_R, reducedMotion } from '../../constants.ts';
import { clamp, angleLerp, finiteArr, r2 } from '../../math.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { createBody, addBody, material, onPreStep, onPostStep, teleport } from '../../physics/engine.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { pieceMesh, pieceColor, commitPieces, onFly } from '../../render/haul-pieces.ts';
import { me } from '../../player/player.ts';
import { identity } from '../../player/identity.ts';
import { registerInteractable, type Interactable } from '../../player/hands.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { remotes, addPresenceField, onRemotePresence } from '../../netplay/net.ts';
import { createSnaps } from '../../netplay/snaps.ts';
import { submitEdit } from '../../world/sync.ts';
import { getRoomId } from '../../netplay/net.ts';
import { isProtoRoom } from '../../sim/tune.ts';
import { onFrame } from '../../loop.ts';
import { cellX, cellZ } from '../../adapters/terrain.ts';
import { launchLog, myLogs, openRingNear } from './loose-logs.ts';
import { makeBarrow, type BarrowMesh } from './barrow-mesh.ts';
import { setBackBundleHidden } from '../../features/haul-stack.ts';
import { protoMark } from '../mark.ts';

// ---------------------------------------------------------------- tuning (window.__barrow.T in the console)
const T = {
  r: 0.4, // m: the sphere under the tray
  mass: 40, // kg
  reach: 1.35, // m from your body to the barrow's centre while you push
  steer: 2.6, // 1/s: how fast the barrow swings to where you walk
  pace: 0.85, // share of your walking (or sprinting) speed while you push (rec 6: about 85%)
  pull: 1.5, // downhill you may go this much faster per unit of grade
  tipSpeed: 9.2, // m/s an empty barrow takes on the flat before it starts to wobble (a sprint is 9.5)
  tipGrade: 9, // m/s less per unit of downhill grade
  tipLoad: 1.2, // m/s less with a full load
  tipTurn: 0.22, // wobble per (m/s² of sideways acceleration over turnFree)
  turnFree: 9, // m/s² of sideways acceleration that is safe
  wobbleUp: 0.42, // wobble per second per m/s over the limit
  wobbleDown: 0.9, // per second back toward steady
  hitDv: 3.4, // m/s knocked off by a hit (summed over a few steps) that tips it
  hitMin: 2.6, // m/s: slower than this nothing tips it
  pourEvery: 0.05, // s between logs leaving the tray on a pour
  maxShown: 28, // logs drawn in the tray (a full one heaps up over the sides)
};

// ---------------------------------------------------------------- body
const START = { x: 14.2, z: 10.5 }; // beside the first work site, toward the court's palms
const mat = material('barrow', { friction: 0, restitution: 0.1 });
const body = createBody({
  mass: T.mass,
  material: mat,
  fixedRotation: true,
  position: { x: START.x, y: groundHeight(START.x, START.z) + T.r + 0.05, z: START.z },
  shapes: [{ kind: 'sphere', r: T.r }],
});
addBody(body);

type Mode = 'free' | 'held' | 'tipped' | 'pouring';
const S = {
  mode: 'free' as Mode,
  heading: Math.PI * 0.75,
  wobble: 0, // 0..1+: past 1 it goes over
  tipAt: 0, // physics seconds when it went over (for the fall animation)
  tipSide: 1,
  tip: 0, // drawn roll of the fall, 0..1
  pour: 0, // drawn pitch of a pour, 0..1
  pourT: 0, // s into a pour
  pourLeft: 0, // units still in the tray to pour
  pourNext: 0,
  speed: 0,
  grade: 0,
  lat: 0,
  hit: 0,
  top: 0,
  why: '', // what tipped it last (wobble, hit), for the console and the evals
};
const pre = new THREE.Vector3();
let prevYaw = S.heading;
const fwdX = () => -Math.sin(S.heading),
  fwdZ = () => -Math.cos(S.heading);
const load = () => myLogs(); // the tray is your stack, less what is already flying out of it
const cap = () => rules.stacks.hard();

// ---------------------------------------------------------------- every fixed step
onPreStep(() => {
  const p = body.position,
    v = body.velocity;
  // the slope under the barrow, along its heading (positive: going downhill)
  const hf = groundHeight(p.x + fwdX() * 0.6, p.z + fwdZ() * 0.6),
    hb = groundHeight(p.x - fwdX() * 0.6, p.z - fwdZ() * 0.6);
  S.grade = (hb - hf) / 1.2;
  if (S.mode === 'held' && me.body) {
    const b = me.body;
    const mv = b.velocity;
    // pushing, you go at 85% of your pace on the flat (docs/research/carrying-and-logistics-play.md rec 6), and
    // downhill the barrow lets you run a little faster than that (the toy, and the danger)
    const full = load() / Math.max(1, cap());
    const max = T.pace * (me.sprint ? 9.5 : 5.6) * (1 + T.pull * Math.max(0, S.grade));
    const h0 = Math.hypot(mv.x, mv.z);
    if (h0 > max) {
      mv.x *= max / h0;
      mv.z *= max / h0;
    }
    // steer: the barrow swings toward where you walk while you push forward
    const speed = Math.hypot(mv.x, mv.z);
    const along = mv.x * fwdX() + mv.z * fwdZ();
    if (speed > 0.6 && along > 0)
      S.heading = angleLerp(S.heading, Math.atan2(-mv.x, -mv.z), 1 - Math.exp(-FIXED * T.steer));
    const yawRate = (S.heading - prevYaw) / FIXED;
    prevYaw = S.heading;
    // it sits ahead of you at arm's length; its velocity takes it there
    const tx = b.position.x + fwdX() * T.reach,
      tz = b.position.z + fwdZ() * T.reach;
    v.x = clamp((tx - p.x) / 0.08, -16, 16);
    v.z = clamp((tz - p.z) / 0.08, -16, 16);
    // wobble: too fast for the slope and the load, or turning too hard
    S.speed = speed;
    S.lat = Math.abs(speed * yawRate);
    const limit = T.tipSpeed - T.tipGrade * Math.max(0, S.grade) - T.tipLoad * full;
    const over = speed - limit + Math.max(0, S.lat - T.turnFree) * T.tipTurn;
    S.wobble = over > 0 ? S.wobble + over * T.wobbleUp * FIXED : Math.max(0, S.wobble - T.wobbleDown * FIXED);
    if (S.wobble >= 1) tipOver(Math.sign(Math.sin(S.heading * 7 + p.x)) || 1, 'wobble');
  } else {
    // nobody pushing: it rolls to a stop (walk into it to shove it)
    const k = Math.exp(-FIXED * (S.mode === 'free' ? 2.5 : 12));
    v.x *= k;
    v.z *= k;
    S.wobble = Math.max(0, S.wobble - T.wobbleDown * FIXED);
  }
  pre.set(v.x, v.y, v.z);
});

onPostStep(() => {
  const p = body.position,
    v = body.velocity;
  const g = groundHeight(p.x, p.z);
  if (p.y < g + T.r - 0.15) {
    teleport(body, p.x, g + T.r, p.z);
    if (v.y < 0) v.y = 0;
  }
  if (S.mode !== 'held') return;
  // what the solver took off the way it was going this step is a hit: a trunk, a rock, a wall (summed with a leak,
  // as the soapbox does). Only speed lost along its travel counts: the slope's push on a landing is not a hit.
  const was = Math.hypot(pre.x, pre.z);
  S.top = Math.max(was, S.top * 0.9);
  const lost = was > 0.1 ? ((pre.x - v.x) * pre.x + (pre.z - v.z) * pre.z) / was : 0;
  S.hit = S.hit * 0.6 + Math.max(0, lost);
  if (S.top > T.hitMin && S.hit > T.hitDv) tipOver(Math.random() < 0.5 ? -1 : 1, 'hit');
  // pushed too far from you (stuck on something at walking pace): you let go
  if (me.body && Math.hypot(me.body.position.x - p.x, me.body.position.z - p.z) > T.reach + 1.4) S.mode = 'free';
});

// ---------------------------------------------------------------- tipping over, pouring, standing it up
const DUST = new THREE.Color(0xd9c49a);
function puff(x: number, y: number, z: number, count: number, spread: number) {
  if (reducedMotion) return;
  for (let k = 0; k < count; k++)
    emit({
      x,
      y,
      z,
      vx: (Math.random() - 0.5) * spread,
      vy: 0.5 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * spread,
      life: 0.4 + Math.random() * 0.4,
      size: 0.22,
      alpha: 0.8,
      color: DUST,
      gravity: 3,
      drag: 1.5,
      grow: [1, 2.4],
      fade: 0.5,
    });
}

const trayAt = new THREE.Vector3();
function tipOver(side: number, why = 'console') {
  if (S.mode === 'tipped') return;
  protoMark('spill');
  S.why = why;
  const v = body.velocity;
  const vx = pre.x,
    vz = pre.z;
  S.mode = 'tipped';
  S.tipSide = side;
  S.tip = 0;
  S.wobble = 0;
  S.hit = S.top = 0;
  const p = body.position;
  puff(p.x, p.y, p.z, 22, 5);
  // the load goes everywhere: up to 16 physics logs, the units shared between them
  const n = load();
  const logs = Math.min(n, 16);
  const rx = Math.cos(S.heading) * side,
    rz = -Math.sin(S.heading) * side; // the side it falls to
  for (let k = 0; k < logs; k++) {
    const units = Math.floor(n / logs) + (k < n % logs ? 1 : 0);
    trayAt.set(p.x + (Math.random() - 0.5) * 0.5, p.y + 0.45 + k * 0.03, p.z + (Math.random() - 0.5) * 0.5);
    launchLog(
      trayAt,
      {
        x: vx * 0.8 + rx * (2 + Math.random() * 2.5) + (Math.random() - 0.5) * 2,
        y: 1.5 + Math.random() * 2.5,
        z: vz * 0.8 + rz * (2 + Math.random() * 2.5) + (Math.random() - 0.5) * 2,
      },
      units,
      4 + Math.random() * 8,
    );
  }
  v.x *= 0.3;
  v.z *= 0.3;
}

function startPour() {
  if (S.mode !== 'held') return;
  S.mode = 'pouring';
  S.pourT = 0;
  S.pourLeft = load();
  S.pourNext = 0.3;
}
const lip = new THREE.Vector3();
function pourStep(dt: number) {
  S.pourT += dt;
  S.pour = clamp(S.pourT / 0.35, 0, 1);
  if (S.pourLeft > 0 && S.pourT >= S.pourNext) {
    S.pourNext += T.pourEvery;
    const units = Math.max(1, Math.ceil(S.pourLeft / 10)); // about ten logs a pour, whatever the load
    S.pourLeft -= units;
    view.lipWorld(lip);
    launchLog(
      lip,
      {
        x: fwdX() * (0.8 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.6,
        y: 0.3 + Math.random() * 0.6,
        z: fwdZ() * (0.8 + Math.random() * 0.6) + (Math.random() - 0.5) * 0.6,
      },
      units,
      3 + Math.random() * 4,
      S.heading + Math.PI / 2 + (Math.random() - 0.5) * 0.6,
    );
  }
  if (S.pourLeft <= 0 && S.pourT > S.pourNext + 0.35) {
    S.mode = 'held';
    S.pour = 0;
  }
}

function standUp() {
  S.mode = 'free';
  S.tip = 0;
  const p = body.position;
  puff(p.x, p.y - 0.2, p.z, 8, 2);
}

// ---------------------------------------------------------------- the interact button
const promptAt = new THREE.Vector3();
const near = (d: number) => {
  if (!me.body) return false;
  const a = me.body.interpolatedPosition,
    b = body.interpolatedPosition;
  return Math.hypot(a.x - b.x, a.z - b.z) < d;
};
registerInteractable((): Interactable[] => {
  if (!me.entered || !me.body) return [];
  const b = body.interpolatedPosition;
  promptAt.set(b.x, b.y + 1.1, b.z);
  if (S.mode === 'tipped')
    return near(2.4) ? [{ id: 'barrow-up', verb: 'Stand it up', at: promptAt, r: 0.6, run: standUp }] : [];
  if (S.mode === 'free')
    return near(2.2)
      ? [
          {
            id: 'barrow-grab',
            verb: 'Push the barrow',
            at: promptAt,
            r: 0.6,
            run: () => {
              S.mode = 'held';
              // you take the handles from where you stand: it points away from you
              const m = me.body!.position;
              S.heading = Math.atan2(-(b.x - m.x), -(b.z - m.z));
              prevYaw = S.heading;
            },
          },
        ]
      : [];
  if (S.mode !== 'held') return [];
  view.lipWorld(lip);
  const ring = load() > 0 ? openRingNear(lip.x, lip.z, 0.4) : null;
  if (ring) return [{ id: 'barrow-pour', verb: 'Tip it in', at: promptAt, run: startPour }];
  // "Let go" floats well ahead, so anything really in reach (Take logs) wins the pick
  const ahead = new THREE.Vector3(b.x + fwdX() * 2.5, b.y + 1, b.z + fwdZ() * 2.5);
  return [{ id: 'barrow-go', verb: 'Let go', at: ahead, run: () => (S.mode = 'free') }];
});
// Logs only go into a barrow that is beside the bundle.
haulHooks.takeBlocked = (x, z) => {
  const b = body.position;
  return Math.hypot(b.x - x, b.z - z) < 4.5 ? null : 'Bring the barrow';
};

// ---------------------------------------------------------------- scooping piles
const scooping = new Map<number, number>(); // pile id -> ms asked
function scoop(now: number) {
  if (S.mode !== 'held' || !identity.pid) return;
  const b = body.position;
  for (const p of rules.piles.piles.list) {
    if (now - (scooping.get(p.id) ?? -1e9) < 1500) continue;
    const x = cellX(p.i),
      z = cellZ(p.j);
    if (Math.hypot(x - b.x, z - b.z) > 1.1) continue;
    const n = Math.min(p.n, rules.stacks.room(identity.pid, p.k));
    if (n > 0 && submitEdit({ op: 'pile.take', i: p.i, j: p.j, id: p.id, n })) {
      scooping.set(p.id, now);
      addFlight(new THREE.Vector3(x, groundHeight(x, z), z), n);
    }
  }
}

// ---------------------------------------------------------------- capacity
// A barrow is worth fetching only if it holds clearly more than your back (rec 6 (a): 120-180 logs, 2-3 sections).
// The tray is your stack, so in a `proto-` room the barrow raises the room's hard cap to CAPACITY (a tune.set, as the
// haul kit's slider would); elsewhere it keeps the room's cap.
const CAPACITY = 150;
let capAsked = 0;
function askCapacity(now: number) {
  if (!isProtoRoom(getRoomId()) || !identity.pid || rules.tune.tune.v.hard >= CAPACITY || now - capAsked < 4000) return;
  capAsked = now;
  submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'hard', v: CAPACITY });
}

// ---------------------------------------------------------------- drawing: the barrow, its load, fly-ins
const view: BarrowMesh = makeBarrow();
scene.add(view.root);
const tray = pieceMesh(T.maxShown + 12);
const flights: { from: THREE.Vector3; n: number; t0: number }[] = [];
const addFlight = (from: THREE.Vector3, n: number) =>
  flights.push({ from: from.clone(), n: Math.min(n, 6), t0: performance.now() });
onFly(addFlight); // Take logs: the logs fly into the tray (your back bundle is hidden, below)

const m4 = new THREE.Matrix4(),
  q = new THREE.Quaternion(),
  e = new THREE.Euler(),
  at = new THREE.Vector3(),
  one = new THREE.Vector3(1, 1, 1);
const shownOf = (n: number) => (n <= 12 ? n : Math.min(T.maxShown, Math.round(12 + (n - 12) * 0.15)));
// Log m in the tray, in the barrow's inner space: rows of four across, layers heaping up and in.
function trayLog(m: number, t: number, jig: number, out: THREE.Matrix4) {
  const layer = Math.floor(m / 4),
    slot = m % 4;
  const inset = Math.min(layer, 3) * 0.04;
  const z = -0.3 + inset + (slot * (0.56 - inset * 2)) / 3;
  const y = 0.52 + layer * 0.17 + Math.sin(t * 19 + m * 1.7) * jig;
  const x = (((m * 37) % 7) - 3) * 0.02 + Math.sin(t * 13 + m) * jig * 0.6;
  e.set(0, (((m * 13) % 5) - 2) * 0.06, (((m * 7) % 5) - 2) * 0.03);
  return out.compose(at.set(x, y, z), q.setFromEuler(e), one);
}

const tq = new THREE.Quaternion(),
  probe = new THREE.Vector3();
onFrame(
  ({ dt, now }: { dt: number; now: number }) => {
    askCapacity(now);
    if (S.mode === 'pouring') pourStep(dt);
    if (S.mode === 'tipped') S.tip = Math.min(1, S.tip + dt / 0.32);
    scoop(now);
    const ip = body.interpolatedPosition;
    const wob = S.mode === 'held' ? S.wobble : 0;
    view.pose({
      x: ip.x,
      y: ip.y - T.r,
      z: ip.z,
      heading: S.heading,
      wobble: wob,
      t: now / 1000,
      tip: S.tip * S.tipSide,
      pour: S.pour,
    });
    // the load in the tray, jiggling with speed and wobble
    const n = S.mode === 'tipped' ? 0 : S.mode === 'pouring' ? S.pourLeft : load();
    const shown = shownOf(n);
    const jig = Math.min(0.03, S.speed * 0.002) + wob * 0.03;
    const k = identity.pid ? Math.max(0, rules.stacks.kind(identity.pid)) : 0;
    let c = 0;
    view.inner.updateMatrixWorld();
    for (let m = 0; m < shown; m++) {
      tray.setMatrixAt(c, trayLog(m, now / 1000, jig, m4).premultiply(view.inner.matrixWorld));
      tray.setColorAt(c++, pieceColor(k));
    }
    // fly-ins: a hop from the bundle (or the pile) into the tray
    const top = view.inner.localToWorld(at.set(0, 0.6 + Math.floor(shown / 4) * 0.17, -0.05)).clone();
    for (let f = flights.length - 1; f >= 0; f--) {
      const fl = flights[f];
      const u = (now - fl.t0) / 420;
      if (u >= 1) {
        flights.splice(f, 1);
        continue;
      }
      for (let m = 0; m < fl.n && c < tray.instanceMatrix.count; m++) {
        const w = Math.min(1, Math.max(0, u * 1.4 - m * 0.08));
        probe.lerpVectors(fl.from, top, w);
        probe.y += Math.sin(w * Math.PI) * 1.3 + m * 0.05;
        e.set(w * 6, w * 3 + m, 0);
        tray.setMatrixAt(c, m4.compose(probe, q.setFromEuler(e), one));
        tray.setColorAt(c++, pieceColor(k));
      }
    }
    commitPieces(tray, c);
    // the tray is your stack: your back bundle stays empty while the barrow variant is on, pushed or parked
    if (identity.pid) setBackBundleHidden(identity.pid, true);
  },
  { phase: 'update', order: 33 },
);

// ---------------------------------------------------------------- Owner sync: everyone sees your barrow
// [x, y, z, heading, tip (signed 0..1), pour 0..1, wobble, logs shown]
addPresenceField('barrow', () => {
  const p = body.interpolatedPosition;
  return [r2(p.x), r2(p.y - T.r), r2(p.z), r2(S.heading), r2(S.tip * S.tipSide), r2(S.pour), r2(S.wobble), load()];
});
type Snap = { w: number[] };
const theirs = new Map<string, { snaps: ReturnType<typeof createSnaps<Snap>>; view: BarrowMesh | null }>();
onRemotePresence((r, pr, time) => {
  const w = pr.barrow;
  let t = theirs.get(r.peer);
  if (!finiteArr(w, 8)) {
    t?.snaps.clear();
    return;
  }
  if (!t) theirs.set(r.peer, (t = { snaps: createSnaps<Snap>(), view: null }));
  t.snaps.push(time, { w: w as number[] });
});
onFrame(
  ({ now }: { now: number }) => {
    for (const [peer, t] of theirs) {
      if (!remotes.has(peer)) {
        if (t.view) scene.remove(t.view.root);
        theirs.delete(peer);
        continue;
      }
      const s = t.snaps.length ? t.snaps.sample(now - INTERP_MS) : null;
      if (!s) continue;
      if (!t.view) scene.add((t.view = makeBarrow()).root);
      const { a, b, u } = s;
      const A = a.w,
        B = b.w;
      const L = (i: number) => A[i] + (B[i] - A[i]) * u;
      tq.identity();
      t.view.pose({
        x: L(0),
        y: L(1),
        z: L(2),
        heading: angleLerp(A[3], B[3], u),
        tip: L(4),
        pour: L(5),
        wobble: L(6),
        t: now / 1000,
      });
    }
  },
  { phase: 'update', order: 31 },
);

// Console and scripted runs (dev/look/evals/haul-*.js): the tuning, the state, the body.
(window as unknown as { __barrow: unknown }).__barrow = {
  T,
  S,
  body,
  tipOver,
  startPour,
  grab: () => {
    S.mode = 'held';
    prevYaw = S.heading;
  },
  place(x: number, z: number, heading = S.heading) {
    teleport(body, x, groundHeight(x, z) + T.r + 0.02, z);
    body.velocity.set(0, 0, 0);
    S.heading = prevYaw = heading;
    S.mode = 'free';
    S.tip = S.pour = S.wobble = 0;
  },
  PLAYER_R,
};
