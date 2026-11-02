// The placeholder wagon (docs/plans/find-the-fun.md steps 2-3; loaded by src/features/proto-wagon.ts behind
// ?proto=wagon). A greybox steam loco and two flatbeds run the timetable of src/sim/wagon.ts (`wagonAt`) along the
// laid sections only, on kinematic bodies registered as platforms (src/physics/platforms.ts), so you can ride them.
// Serves DESIGN.md 1 (Toys before chores): a ride with nothing to achieve, that grows with every section you lay.
// Local: each tab drives its own bodies from the shared tick, so every tab sees the same wagon with no messages.
//
// The train is push-pull: the loco stays at the outbound end, so the body never turns round at the end of the line.
// Each car sits on two bogies a little apart on the polyline, so its heading eases through the corners by itself.
//
// When the laid count changes, the new timetable takes over at the next stop (no teleport): `timeline()` below keeps
// the old timetable until the wagon reaches a stop, then starts the new one at that same stop, standing, heading the
// same way. The switch tick comes from when each section was laid (its machine run, or the tick this tab saw it laid),
// so tabs that watched it happen agree; a tab that joins later after a `open.lay` shortcut may run a different phase
// (prototype; the real timetable will want its own lockstep start tick).
//
// `&v=stoke` (docs/research/roblox-patterns.md, pattern 2): the loco has a firebox you feed logs (./stoke.ts), and
// steam is speed: fed, it runs at 6.5 m/s; cold, at walking pace. Its place is then wagonAt read at the wagon's own
// clock (lockstep, src/world/rules/wagon.ts: steam moves that clock on faster), on the laid sections with t0 0, so a
// change in the laid count jumps it (prototype: the panel's Lay is the only change in a stoke playtest).
//
// Remote riders: each car is a shared platform (`wagon:car<k>`), so another player standing on a deck is sent and drawn
// in its frame (presence `riding`, src/netplay/net.ts) and stays put on it here.
import './wagon.css';
const params = new URLSearchParams(location.search);
import { rules } from '../../world/game-world.ts';
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene, camera } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { world, submitEdit, onApplied, worldStatus, TICK_MS } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { groundHeight } from '../../island/terrain.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, stepAlpha, type Body } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { registerPlatform, yawOf, carry, CARRY, type Platform } from '../../physics/platforms.ts';
import { reducedMotion, PLAYER_R } from '../../constants.ts';
import { me, cam } from '../../player/player.ts';
import { teleport } from '../../physics/physics.ts';
import { ROUTE } from '../../sim/route.ts';
import { wagonAt, wagonCycle, WAGON_PACE, type WagonState, type WagonPace } from '../../sim/wagon.ts';
import { paceIn } from '../../sim/tune.ts';
import { lengthOf, MACHINE_RUN } from '../../sim/scripted-run.ts';
import { wagonLook, LOCO, TRAILER, CRATES, type CarSpec } from './look.ts';
import { wagonFreight } from './freight.ts';
import { wagonStoke, fireHeat } from './stoke.ts';
import { RATE_ONE, FAST, STEAM_FULL } from '../../sim/wagon-steam.ts';
import { ON_ISLAND, onStep, onVariant, playPanel, protoV } from '../flags.ts';

const TPS = 1000 / TICK_MS;
// Variants, to compare in one sitting: `&v=calm` (default) and `&v=lively` change only the render and feel; `&v=fast`
// is lively's feel at about double the speed, through the room's tuning (`wagonCruise`, `wagonAccel`: a proto- room
// only, set for the whole room when the page loads; calm and lively put the default pace back).
const VARIANTS = {
  calm: { rock: 0.02, bounce: 0, puffs: 1, puffSize: 1, shake: 0 },
  lively: { rock: 0.07, bounce: 0.06, puffs: 1.6, puffSize: 1.2, shake: 1 },
};
type WagonVariant = 'calm' | 'lively' | 'fast' | 'stoke';
const variantOf = (v: string): WagonVariant => (v === 'fast' || v === 'lively' || v === 'stoke' ? v : 'calm');
const V = protoV('wagon');
export let VARIANT = variantOf(V);
const STOKE = VARIANT === 'stoke';
const PACES: Record<WagonVariant, WagonPace> = {
  calm: WAGON_PACE,
  lively: WAGON_PACE,
  fast: { cruise: 65, accel: 20 },
  stoke: { cruise: FAST, accel: 20 }, // full steam is the timetable's own pace; less steam runs it slower
};
const FEEL = {
  bogie: 1.1, // m from a car's centre to each bogie (the heading is the chord between them)
  joint: 4.5, // m between rail joints: the car rocks as each bogie crosses one
  whistleS: 1.2, // s before leaving a stop the steam bursts (the whistle, silent for now)
  // rock: rad of roll kicked per joint at 3 m/s; bounce: m the car drops at a joint; puffs: chuffs per metre (plus a
  // slow idle chuff standing), puffSize their size; shake: the camera's jolt per joint, riding
  ...VARIANTS[VARIANT === 'fast' ? 'lively' : VARIANT === 'stoke' ? 'calm' : VARIANT],
};
// Calm, lively and fast switch live (the bar, src/proto/flags.ts): the feel here, the skid and the room's pace below.
// Stoke (another loco and clock) and grind (its own module) reload.
const SKID = CARRY.skid;
let paced = false; // the room's pace matches the variant (the panel asks for it)
onVariant('wagon', ['', 'calm', 'lively', 'fast'], (v) => {
  VARIANT = variantOf(v);
  Object.assign(FEEL, VARIANTS[VARIANT === 'fast' ? 'lively' : 'calm']);
  CARRY.skid = VARIANT === 'fast' ? 5 : SKID;
  paced = false;
});
// Train order from the outbound end; offsets of car centres along the line from the timetable's point, metres.
const CARS: { spec: CarSpec; off: number }[] = [
  { spec: LOCO, off: 3.7 },
  { spec: TRAILER, off: 0 },
  { spec: TRAILER, off: -3.7 },
];
const BOTTOM = 0.4; // m over the ground where a car's collider starts (the wheels are drawn under it)

// ---------------------------------------------------------------- the line as a polyline, metres
const SEG = ROUTE.map((r) => {
  const len = Math.round(Math.hypot(r.to[0] - r.x, r.to[1] - r.z) * 100) / 100; // as wagon.ts rounds it
  return { x: r.x, z: r.z, ux: (r.to[0] - r.x) / len, uz: (r.to[1] - r.z) / len, len };
});
const AT: number[] = [];
SEG.reduce((at, s) => (AT.push(at), at + s.len), 0);
// The point `d` metres along the line from the first site (extended straight past either end).
function lineAt(d: number, out: { x: number; z: number }) {
  let k = 0;
  while (k < SEG.length - 1 && d > AT[k + 1]) k++;
  const s = SEG[k],
    u = d - AT[k];
  out.x = s.x + s.ux * u;
  out.z = s.z + s.uz * u;
  return out;
}

// ---------------------------------------------------------------- how many sections the wagon runs on, and when
// `?laid=N` (or the panel's +/-) fakes the count for this tab only: render and riding, never the world. PROTOTYPE.
// On the `?play` island the whole line is faked in from the start (ghost rails where it isn't laid yet), so the wagon
// is there to ride at once without laying anything for real: the laying run (?proto=lay) still has its sections to lay.
let fake = params.has('laid')
  ? Math.max(0, Math.min(ROUTE.length, Number(params.get('laid')) | 0))
  : ON_ISLAND
    ? ROUTE.length
    : -1;
const seen = new Map<number, number>(); // section -> the tick it was faked in (this tab only)
const { sites } = rules.sites;
onApplied((e: { op: string }) => e.op === 'tune.reset' && seen.clear());
const { opening } = rules.opening;
const { tune } = rules.tune;
// The room's pace (tuned in proto- rooms), and the timetable calls at it.
let pace = WAGON_PACE;
const at = (laid: number, tick: number, t0 = 0) => wagonAt(laid, tick, t0, pace);
const cyc = (laid: number) => wagonCycle(laid, pace);
// Fakes `n` laid sections from now on, in this tab only (a section faked in counts as laid at this tick).
function fakeLaid(n: number) {
  const from = laidCount();
  fake = Math.max(0, Math.min(ROUTE.length, n));
  for (let k = from; k < fake; k++) seen.set(k, Math.floor(clock === clock ? clock : world.tick));
}
const laidCount = () => (fake >= 0 ? fake : sites.open);
const layTick = (k: number) => {
  const t0 = k < sites.open ? sites.list[k].t0 : -1;
  if (t0 >= 0) return t0 + lengthOf(MACHINE_RUN); // laid by a machine run
  if (opening.laid && k >= opening.laid[0] && k < sites.open) return opening.laid[1]; // by the open.lay shortcut
  return seen.get(k) ?? 0; // faked in this tab, or laid before the shortcut kept its tick
};

type Seg = { from: number; laid: number; t0: number };
let segs: Seg[] = [],
  segsKey = '';
// The start of the stop the wagon is standing at at tick t, or of the next one it reaches.
function stopStart(laid: number, t0: number, t: number): number {
  const cycle = cyc(laid);
  let a = Math.ceil(t);
  if (at(laid, a, t0)!.stop >= 0) {
    for (let n = 0; n < cycle && at(laid, a - 1, t0)!.stop >= 0; n++) a--;
  } else for (let n = 0; n < cycle && at(laid, a, t0)!.stop < 0; n++) a++;
  return a;
}
// The timetable phase in `laid` where the wagon stands at `stop`, having arrived going `arrived` (1 out, -1 back).
function phaseOfStop(laid: number, stop: number, arrived: number): number {
  const leaves = arrived > 0 ? 1 : stop > 0 ? -1 : 1;
  const cycle = cyc(laid);
  for (let p = 0; p < cycle; p++) {
    const w = at(laid, p)!;
    if (w.stop === stop && w.dir === leaves) return p;
  }
  return 0;
}
// Rebuilt when the laid count or a section's lay tick changes: a list of timetables, each from a tick on.
function timeline(): Seg[] {
  const n = laidCount();
  const ticks = Array.from({ length: n }, (_, k) => layTick(k));
  pace = paceIn(tune);
  const key = n + ':' + ticks.join(',') + ':' + pace.cruise + ':' + pace.accel;
  if (key === segsKey) return segs;
  segsKey = key;
  segs = [];
  for (let k = 0, from = -Infinity; k < n; k++) {
    from = Math.max(from, ticks[k]);
    if (k + 1 < n && Math.max(from, ticks[k + 1]) === from) continue; // laid together: one change
    const prev = segs[segs.length - 1];
    if (!prev) {
      segs.push({ from, laid: k + 1, t0: from }); // the first section: it starts standing at the first site
      continue;
    }
    const t = stopStart(prev.laid, prev.t0, from);
    const here = at(prev.laid, t, prev.t0)!;
    const came = at(prev.laid, t - 1, prev.t0)!;
    segs.push({ from: t, laid: k + 1, t0: t - phaseOfStop(k + 1, here.stop, came.dir) });
  }
  return segs;
}
// The stoke variant: the wagon at shared tick `tick`, read at its own clock: the rules' clock at the last tick, run on
// at its rate (real time while standing at a stop, as the rules do). Its velocities are the timetable's, scaled by the
// running rate.
const { steam } = rules.wagon;
let tauSeek = 0; // ticks added to the clock (the look evals' shortcut)
function stokedAt(tick: number): WagonState | null {
  if (!(laidCount() > 0)) return null;
  const run = steam.rate / RATE_ONE;
  const s = at(laidCount(), steam.tau / RATE_ONE + (tick - world.tick) * (!w || w.stop >= 0 ? 1 : run) + tauSeek)!;
  if (s.stop < 0) Object.assign(s, { speed: s.speed * run, vx: s.vx * run, vz: s.vz * run });
  return s;
}
function wagonNow(tick: number): WagonState | null {
  const list = timeline();
  if (STOKE) return stokedAt(tick);
  for (let k = list.length - 1; k >= 0; k--) if (tick >= list[k].from) return at(list[k].laid, tick, list[k].t0);
  return null;
}

// ---------------------------------------------------------------- the clock: shared ticks, advanced per fixed step
let clock = NaN, // fractional ticks, for the coming fixed step
  seek = 0; // ticks added to the shared tick (the look evals' shortcut to a moment in the timetable)
function advance(dt: number) {
  const target = sharedSeconds() * TPS + seek;
  if (!(Math.abs(target - clock) < 30)) clock = target;
  else clock += dt * TPS + (target - clock) * 0.02;
}

// ---------------------------------------------------------------- the bodies
const look = wagonLook(CARS.length - 1, STOKE);
type Car = {
  spec: CarSpec;
  off: number;
  hy: number;
  body: Body;
  mesh: THREE.Object3D; // follows the body
  rock: THREE.Object3D; // the look, rocked over the joints
  prevYaw: number;
  x: number;
  y: number;
  z: number;
  yaw: number; // this step's target pose
  pitch: number; // the ground's slope under the bogies (drawn only: the body stays level)
  pitchDrawn: number;
  joints: [number, number]; // the joint index under each bogie
  roll: number;
  rollV: number;
  dip: number; // m the car has dropped at a joint (drawn only), and its spring's speed
  dipV: number;
  ground: number; // the look's height in the body's frame
  platform: Platform;
};
const pa = { x: 0, z: 0 },
  pb = { x: 0, z: 0 };
let w: WagonState | null = null,
  parked = true;

const cars: Car[] = CARS.map(({ spec, off }, k) => {
  const hy = (spec.top - BOTTOM) / 2;
  const body = createBody({
    type: BODY.KINEMATIC,
    material: groundMat,
    mask: NOT_SCENERY,
    position: { x: 0, y: -50, z: 0 },
    shapes: [
      { kind: 'box', hx: spec.hx, hy, hz: spec.hz },
      // The crates on the last flatbed (axis-aligned: close enough for a greybox); their tops are not a deck.
      ...(k === CARS.length - 1 ? CRATES : []).map(({ x, z, sz, base }) => ({
        kind: 'box' as const,
        hx: sz / 2,
        hy: sz / 2,
        hz: sz / 2,
        offset: { x, y: spec.top + base + sz / 2 - (BOTTOM + hy), z },
      })),
    ],
  });
  addBody(body);
  const mesh = new THREE.Group(),
    rock = look.cars[k];
  rock.position.y = -(BOTTOM + hy); // body centre -> ground
  const ground = rock.position.y;
  mesh.add(rock);
  mesh.visible = false;
  scene.add(mesh);
  const car: Car = {
    spec,
    off,
    hy,
    body,
    mesh,
    rock,
    prevYaw: 0,
    x: 0,
    y: -50,
    z: 0,
    yaw: 0,
    pitch: 0,
    pitchDrawn: 0,
    joints: [0, 0],
    roll: 0,
    rollV: 0,
    dip: 0,
    dipV: 0,
    ground,
    // Shared: every tab drives this car from shared time, so riders on it are drawn in its frame (platforms.ts).
    platform: {
      body,
      hx: spec.hx,
      hz: spec.hz,
      top: hy,
      move: (dt) => move(car, k, dt),
      id: `wagon:car${k}`,
      shared: true,
    },
  };
  registerPlatform(car.platform);
  return car;
});

// Each car's pose for the coming step: its bogies on the line, its height from the ground under them.
function plan(dt: number) {
  advance(dt);
  w = wagonNow(clock);
  parked = !w;
  if (!w) return;
  for (const c of cars) {
    const d = w.dist / 100 + c.off;
    lineAt(d + FEEL.bogie, pa);
    lineAt(d - FEEL.bogie, pb);
    c.x = (pa.x + pb.x) / 2;
    c.z = (pa.z + pb.z) / 2;
    c.yaw = Math.atan2(pa.x - pb.x, pa.z - pb.z);
    const ga = groundHeight(pa.x, pa.z),
      gb = groundHeight(pb.x, pb.z);
    c.y = (ga + gb) / 2 + BOTTOM + c.hy;
    c.pitch = Math.atan2(ga - gb, 2 * FEEL.bogie);
  }
}
function move(c: Car, k: number, dt: number) {
  if (k === 0) plan(dt);
  const b = c.body;
  c.prevYaw = yawOf(b.quaternion);
  const ty = parked ? -50 : c.y;
  const dx = c.x - b.position.x,
    dy = ty - b.position.y,
    dz = c.z - b.position.z;
  if (parked || dx * dx + dy * dy + dz * dz > 4) {
    // Appearing, vanishing, or a timetable that jumped (a reset): place it, don't fling anyone.
    b.position.set(c.x, ty, c.z);
    b.quaternion.set(0, Math.sin(c.yaw / 2), 0, Math.cos(c.yaw / 2));
    b.velocity.set(0, 0, 0);
    b.angularVelocity.set(0, 0, 0);
    c.prevYaw = c.yaw;
    return;
  }
  b.velocity.set(dx / dt, dy / dt, dz / dt);
  b.angularVelocity.set(0, (angleLerp(c.prevYaw, c.yaw, 1) - c.prevYaw) / dt, 0);
}

// ---------------------------------------------------------------- feel: chuffs, rocking, the steam burst
const smoke = new THREE.Color('#e8e4dc'),
  steamWhite = new THREE.Color('#ffffff'),
  sooty = new THREE.Color('#8f8a84'),
  smokeHot = new THREE.Color();
const smokeOf = (hot: number) => smokeHot.copy(smoke).lerp(sooty, hot * 0.8);
const chimney = new THREE.Vector3();
let jolt = 0, // the riding camera's jolt, decaying
  chuff = 0,
  lastDist = NaN,
  whistled = -1;

// The whistle and the rail clacks are silent for now (cut in the sound audit, 2026-11-02); better ones come later.
function puff(big: number, vx: number, vz: number) {
  look.chimneyTop.getWorldPosition(chimney);
  // stoked: a hot fire puffs big and sooty, a cold one breathes thin wisps
  const hot = STOKE ? fireHeat() : 1;
  const size = STOKE ? 0.55 + 0.75 * hot : 1;
  for (let n = 0; n < (2 + big * 4) * FEEL.puffSize * size; n++)
    emit({
      x: chimney.x + (Math.random() - 0.5) * 0.2,
      y: chimney.y,
      z: chimney.z + (Math.random() - 0.5) * 0.2,
      vx: vx * 0.4 + (Math.random() - 0.5) * 0.5,
      vy: 1.6 + big + Math.random() * 0.6,
      vz: vz * 0.4 + (Math.random() - 0.5) * 0.5,
      life: 1.4 + Math.random() * 0.8 + big,
      size: (0.35 + big * 0.2) * FEEL.puffSize * size,
      color: big ? steamWhite : STOKE ? smokeOf(hot) : smoke,
      alpha: 0.75,
      drag: 1.2,
      grow: [1, 3.2],
      fade: 0.6,
    });
}

onFrame(
  ({ dt }) => {
    const a = stepAlpha();
    for (const c of cars) {
      c.mesh.visible = !parked;
      const ip = c.body.interpolatedPosition;
      c.mesh.position.set(ip.x, ip.y, ip.z);
      c.mesh.rotation.y = angleLerp(c.prevYaw, yawOf(c.body.quaternion), a);
      // A damped spring for the rock over the joints; a dip, too, so the deck nods.
      c.rollV += (-c.roll * 90 - c.rollV * 7) * dt;
      c.roll += c.rollV * dt;
      c.rock.rotation.z = c.roll;
      c.dipV += (-c.dip * 160 - c.dipV * 12) * dt;
      c.dip += c.dipV * dt;
      c.rock.position.y = c.ground + c.dip;
      c.pitchDrawn += (c.pitch - c.pitchDrawn) * Math.min(1, dt * 8);
      c.rock.rotation.x = -c.pitchDrawn + Math.abs(c.roll) * 0.5;
    }
    if (!w) {
      lastDist = NaN;
      return;
    }
    const speed = Math.abs(w.speed);
    const d = w.dist / 100;
    for (const c of cars)
      for (let b = 0; b < 2; b++) {
        const j = Math.floor((d + c.off + (b ? -FEEL.bogie : FEEL.bogie)) / FEEL.joint);
        if (j !== c.joints[b] && speed > 0.2) {
          const k = (speed / 3) * (0.7 + Math.random() * 0.6);
          c.rollV += (b ? -1 : 1) * Math.sign(w.speed) * FEEL.rock * k * 30;
          c.dipV -= FEEL.bounce * k * 25;
          if (carry.on === c.platform && !reducedMotion) jolt = Math.max(jolt, FEEL.shake * k);
        }
        c.joints[b] = j;
      }
    // Chuffs: one per 1 / puffs metres moved, and a lazy one every 1.5 s standing.
    const moved = lastDist === lastDist ? Math.abs(d - lastDist) : 0;
    lastDist = d;
    chuff += moved * FEEL.puffs + (speed < 0.1 ? dt / (STOKE ? 2.6 - 1.6 * fireHeat() : 1.5) : 0);
    if (chuff >= 1) {
      chuff = Math.min(chuff - 1, 1);
      puff(0, w.vx, w.vz);
    }
    // A burst of steam, a moment before it leaves a stop.
    if (w.stop >= 0) {
      const leaving = wagonNow(clock + FEEL.whistleS * TPS);
      const id = Math.floor(clock - w.phase) * 10 + w.stop; // this dwell
      if (leaving && leaving.stop < 0 && whistled !== id) {
        whistled = id;
        puff(1, 0, 0);
      }
    }
  },
  { phase: 'update', order: 6 },
);

// The lively variant's jolt: the camera drops a hair at each joint while you ride (after the camera is placed).
onFrame(
  ({ dt }) => {
    if (jolt < 0.01) return;
    camera.position.y -= jolt * 0.05;
    camera.position.x += (Math.random() - 0.5) * 0.03 * jolt;
    jolt *= Math.exp(-dt * 14);
  },
  { phase: 'late', order: 122 },
);

// Jumping off at speed: the kept speed bleeds away in a slide with a dust trail, longer at the fast pace (a 6.5 m/s
// landing slides about 4 m instead of 2), so leaving the wagon reads as a stunt rather than a stop.
if (VARIANT === 'fast') CARRY.skid = 5;
const dust = new THREE.Color('#c9b48a');
// &grind=1: grind the laid rails (src/proto/grind/, its own module; the rail carries you, so no dust while on it).
let grinding = () => false;
if (params.get('grind') === '1' || V === 'grind')
  void import('../grind/index.ts').then((m) => {
    grinding = m.grind({
      laid: laidCount,
      cars: () => (w ? cars.map((c) => ({ d: w!.dist / 100 + c.off, hz: c.spec.hz })) : []),
    }).active;
  });
onFrame(
  ({ dt }) => {
    const h = Math.hypot(carry.x, carry.z);
    if (carry.on || !me.body || me.coyote <= 0 || h < 1.2 || grinding()) return;
    const p = me.body.position;
    for (let n = Math.random() < h * dt * 6 ? 1 + (h > 4 ? 1 : 0) : 0; n > 0; n--)
      emit({
        x: p.x + (Math.random() - 0.5) * 0.4,
        y: p.y - PLAYER_R + 0.05,
        z: p.z + (Math.random() - 0.5) * 0.4,
        vx: -carry.x * 0.15 + (Math.random() - 0.5) * 0.6,
        vy: 0.6 + Math.random() * 0.6,
        vz: -carry.z * 0.15 + (Math.random() - 0.5) * 0.6,
        life: 0.7 + Math.random() * 0.4,
        size: 0.3,
        color: dust,
        alpha: 0.8,
        drag: 2,
        grow: [1, 2.4],
        fade: 0.5,
      });
  },
  { phase: 'update', order: 7 },
);

// Helper-hut freight arrives on the rear flatbed and hops off into the open Track ring (./freight.ts).
wagonFreight({
  rear: cars[cars.length - 1],
  laid: laidCount,
  standing: (ahead) => (clock === clock ? (wagonNow(clock + ahead)?.stop ?? -1) : -1),
});

if (STOKE && look.firebox) wagonStoke(look.firebox, () => !parked);

// ---------------------------------------------------------------- rails for a faked count (?laid=N): PROTOTYPE
const ghostMat = new THREE.MeshStandardNodeMaterial({ color: '#7a6f66', roughness: 0.6, metalness: 0.4 });
const RAIL_PIECE = 2; // m: ghost rails are short pieces, so they follow the ground
const ghosts = SEG.map((s) => {
  const list: THREE.Mesh[] = [];
  const n = Math.ceil(s.len / RAIL_PIECE),
    piece = s.len / n,
    geo = new THREE.BoxGeometry(0.08, 0.08, piece + 0.04);
  for (let k = 0; k < n; k++)
    for (const o of [-0.45, 0.45]) {
      const ax = s.x + s.ux * k * piece + s.uz * o,
        az = s.z + s.uz * k * piece - s.ux * o;
      const bx = ax + s.ux * piece,
        bz = az + s.uz * piece;
      const ya = groundHeight(ax, az) + 0.16,
        yb = groundHeight(bx, bz) + 0.16;
      const m = new THREE.Mesh(geo, ghostMat);
      m.position.set((ax + bx) / 2, (ya + yb) / 2, (az + bz) / 2);
      m.rotation.set(-Math.atan2(yb - ya, piece), Math.atan2(s.ux, s.uz), 0, 'YXZ');
      m.visible = false;
      scene.add(m);
      list.push(m);
    }
  return list;
});

// ---------------------------------------------------------------- the solo tester's panel
export function wagonPanel(protoRoom: boolean): void {
  const box = document.createElement('div');
  box.className = 'wagon-proto';
  const btn = (text: string, fn: () => void) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', fn);
    return b;
  };
  const lay = btn('Lay the whole route', () => submitEdit({ op: 'open.lay', i: 0, j: 0 }));
  const reset = btn('Reset the route', () => submitEdit({ op: 'tune.reset', i: 0, j: 0 }));
  const step = (by: number) => () => fakeLaid(laidCount() + by);
  const fakeRow = document.createElement('div');
  const fakeNote = document.createElement('span');
  fakeRow.append(btn('−', step(-1)), fakeNote, btn('+', step(1)));
  const note = document.createElement('span');
  box.append(lay, reset, fakeRow, note);
  (document.querySelector('.hud') ?? document.body).append(box);
  playPanel('wagon', box);
  // The variant's pace, once the room's state is here: set for the whole room (proto- rooms only).
  onFrame(
    () => {
      if (protoRoom && !paced && worldStatus().ready && world.tick > 0) {
        paced = true;
        const want = PACES[VARIANT];
        if (tune.v.wagonCruise !== want.cruise)
          submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'wagonCruise', v: want.cruise });
        if (tune.v.wagonAccel !== want.accel)
          submitEdit({ op: 'tune.set', i: 0, j: 0, key: 'wagonAccel', v: want.accel });
      }
      lay.disabled = !protoRoom || sites.open >= ROUTE.length;
      reset.disabled = !protoRoom;
      const pct = Math.round((100 * steam.steam) / STEAM_FULL);
      const ms = Math.abs(w?.speed ?? 0).toFixed(1);
      const speed = STOKE
        ? `stoke · steam ${pct}% · ${ms} m/s · ${steam.fed} logs fed`
        : `${VARIANT} · ${(tune.v.wagonCruise / 10).toFixed(1)} m/s`;
      note.textContent = protoRoom ? speed : `${speed} · Lay, Reset and v=fast need ?room=proto-wagon`;
      fakeNote.textContent = fake >= 0 ? `fake laid: ${fake} (this tab only)` : `laid: ${sites.open}`;
      ghosts.forEach((g, k) => g.forEach((m) => (m.visible = fake > sites.open && k >= sites.open && k < fake)));
    },
    { phase: 'late', order: 121 },
  );
}

// While the playlist is at the laying run, the wagon runs only what is really laid, so it never drives through the
// machine at work; it takes the whole line back at the next step (a change takes over at the wagon's next stop).
if (ON_ISLAND && !params.has('laid')) onStep((step) => (step === 'lay' ? (fake = -1) : fakeLaid(ROUTE.length)));

// On the island the playlist's wagon step (arriving at it, a reload into it, or a live variant switch) puts you on the
// middle flatbed's deck facing the loco, so the variant's difference (rock, speed, steam) is felt in seconds instead of
// waiting for the wagon to come round. After the bar's own drop (it places you on the first frame you're in), and
// only while the wagon runs; grind keeps you on the ground by the rails.
let boardAt = -1; // performance.now() to board at (-1: no)
const boardSoon = () => void (boardAt = V === 'grind' ? -1 : performance.now() + 400);
if (ON_ISLAND) {
  onStep((step) => (step === 'wagon' ? boardSoon() : (boardAt = -1)));
  onVariant('wagon', ['', 'calm', 'lively', 'fast'], boardSoon);
  onFrame(
    () => {
      if (boardAt < 0 || performance.now() < boardAt || !me.entered || !me.body || parked) return;
      if (performance.now() > boardAt + 8000) return void (boardAt = -1); // the wagon never came: stay put
      boardAt = -1;
      const c = cars[1],
        p = c.body.position;
      teleport(me.body, p.x, p.y + c.hy + PLAYER_R + 0.3, p.z);
      me.body.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = c.yaw + Math.PI; // looking along the line at the loco and its smoke
    },
    { phase: 'world', order: 42 },
  );
}

// For the look evals (dev/look/evals/wagon.js).
window.__wagon = {
  FEEL,
  get VARIANT() {
    return VARIANT;
  },
  cars,
  get state() {
    return w;
  },
  get clock() {
    return clock;
  },
  get pace() {
    timeline();
    return pace;
  },
  timeline,
  get steam() {
    return { steam: steam.steam, rate: steam.rate, tau: steam.tau, fed: steam.fed, heat: fireHeat() };
  },
  // Jump the shared clock (stoke: the wagon's own) so the timetable reads `phase` ticks into the current timetable now.
  seekPhase(phase: number) {
    const now = wagonNow(clock);
    if (STOKE) {
      if (now) tauSeek += phase - now.phase;
      return;
    }
    if (now) seek += phase - now.phase;
    else seek = 0;
    clock = NaN;
  },
  fakeLaid,
};
