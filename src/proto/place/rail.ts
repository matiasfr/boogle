// The rail of ?proto=place: per line, the trestle and track that go up piece by piece as the machine passes, the
// platforms, and two trains half a cycle apart on two tracks, so one leaves every 17 s or so each way
// (docs/research/big-walk-level-design.md, section 5.3: counting the wait, a single shuttle wouldn't beat sprinting).
// Trains are the wagon's look on kinematic platforms, the crossing's way. Local: every tab runs its own.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { chuff, clank, thump } from '../../render/machine-sfx.ts';
import { angleLerp } from '../../math.ts';
import { BODY, addBody, createBody, stepAlpha, type Body } from '../../physics/engine.ts';
import { NOT_SCENERY, groundMat } from '../../physics/physics.ts';
import { registerPlatform, yawOf, type Platform } from '../../physics/platforms.ts';
import { wagonLook, LOCO, TRAILER, type CarSpec } from '../wagon/look.ts';
import { box, draw, makeSet, place, type BoxSet } from '../net/boxes.ts';
import { deck, type Deck } from '../net/crates.ts';
import { H, plank } from './land.ts';
import { ORIGIN, TUNE, lineAt, railY, type Line, type LinePoint } from './layout.ts';

const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
const TRACK_L = 2.4; // m each track sits off the line's centre

// ---------------------------------------------------------------- the trestle and the track, as one box set per line
type Piece = 'leg' | 'deck' | 'rail';
export type Trestle = BoxSet & { s: Float32Array; piece: Piece[]; drawnAt: number };
const lateral = (l: number, out: { x: number; z: number }) => {
  out.x = P.x - P.uz * l + ORIGIN.x;
  out.z = P.z + P.ux * l + ORIGIN.z;
  return out;
};
export function buildTrestle(line: Line): Trestle {
  const boxes: ReturnType<typeof box>[] = [],
    sAt: number[] = [],
    piece: Piece[] = [];
  const add = (s: number, kind: Piece, x: number, z: number, y: number, local: THREE.Matrix4, color: string) => {
    const b = box(x, z, local, color);
    b.y = y;
    boxes.push(b);
    sAt.push(s);
    piece.push(kind);
  };
  const q = { x: 0, z: 0 };
  // Sleepers and rails on both tracks, the whole way.
  for (let s = 0.6; s < line.len; s += 1.25) {
    lineAt(line, s, P);
    const yaw = Math.atan2(P.ux, P.uz),
      y = railY(line, s);
    for (const t of [-1, 1]) {
      lateral(t * TRACK_L, q);
      add(s, 'deck', q.x, q.z, y, place(0, 0, 0, 2.3, 0.12, 0.34, yaw), '#8a6236');
    }
  }
  for (let s = 1.5; s < line.len; s += 3) {
    lineAt(line, s, P);
    const yaw = Math.atan2(P.ux, P.uz),
      y = railY(line, s),
      pitch = Math.atan2(railY(line, s + 1) - railY(line, s - 1), 2);
    for (const t of [-1, 1])
      for (const r of [-0.5, 0.5]) {
        lateral(t * TRACK_L + r, q);
        add(
          s,
          'rail',
          q.x,
          q.z,
          y + 0.1,
          place(0, 0, 0, 0.1, 0.12, 3.1, yaw, new THREE.Euler(-pitch, 0, 0)),
          '#3a302c',
        );
      }
  }
  // Bents where the ground has dropped away: legs from the ground to the cap, a stringer under each track, a brace.
  for (let s = 3; s < line.len; s += 6.5) {
    lineAt(line, s, P);
    const y = railY(line, s),
      yaw = Math.atan2(P.ux, P.uz);
    lateral(0, q);
    const drop = y - H(q.x, q.z);
    if (drop < 1.2) continue;
    add(s, 'deck', q.x, q.z, y - 0.9, place(0, 0, 0, 8.8, 0.55, 1, yaw), '#7f5630');
    for (const t of [-1, 1]) {
      lateral(t * TRACK_L, q);
      add(s, 'deck', q.x, q.z, y - 0.4, place(0, 0, 0, 1.5, 0.4, 6.6, yaw), '#6e4c2a');
    }
    for (const l of [-3.9, -1.3, 1.3, 3.9]) {
      lateral(l, q);
      const g = H(q.x, q.z) - 0.4;
      add(s, 'leg', q.x, q.z, g, place(0, 0, 0, 0.5, y - 0.8 - g, 0.5, yaw), '#a2743f');
    }
    if (drop > 5)
      for (const t of [-1, 1]) {
        lateral(t * 3.9, q);
        const g = H(q.x, q.z);
        const span = y - 1 - g,
          across = t * -2.6;
        const len = Math.hypot(span, across);
        add(
          s,
          'leg',
          q.x,
          q.z,
          g,
          place(0, 0, 0, 0.26, len, 0.26, yaw, new THREE.Euler(0, 0, -Math.atan2(across, span))),
          '#8a6236',
        );
      }
  }
  const set = makeSet(boxes);
  return { ...set, s: Float32Array.from(sAt), piece, drawnAt: Infinity };
}
const clamp01 = (u: number) => Math.max(0, Math.min(1, u));
/** Draws the trestle with the machine having reached `built` metres along the line (it runs from the far end home). */
export function drawTrestle(t: Trestle, built: number) {
  if (built === t.drawnAt) return;
  t.drawnAt = built;
  draw(t, (k) => {
    const d = t.s[k]! - built;
    const kind = t.piece[k];
    if (kind === 'leg') return clamp01((d + 16) / 5); // the bents rise ahead of the machine
    if (kind === 'deck') return clamp01((d + 7) / 2);
    return clamp01(d / 1.5);
  });
}

// ---------------------------------------------------------------- platforms
/** An island platform between the tracks, with a short ramp at the end you walk up from. */
export function buildPlatform(line: Line, s0: number, s1: number, rampAt: number) {
  const a = { x: 0, z: 0 },
    b = { x: 0, z: 0 };
  lineAt(line, s0, P);
  lateral(0, a);
  lineAt(line, s1, P);
  lateral(0, b);
  const top = (s: number) => railY(line, s) + 0.72;
  const low = Math.min(top(s0), top(s1));
  plank(a.x, a.z, b.x, b.z, low, low, 2.5, '#bdb8ac', 1.2);
  const r = { x: 0, z: 0 };
  lineAt(line, rampAt, P);
  lateral(0, r);
  const from = rampAt < s0 ? a : b;
  plank(r.x, r.z, from.x, from.z, H(r.x, r.z) + 0.05, low, 2.5, '#bdb8ac', 0.4);
}

// ---------------------------------------------------------------- the machine
export type Machine = { group: THREE.Group; show: (s: number) => void; hide: () => void };
export function buildMachine(line: Line): Machine {
  const look = wagonLook(1, false);
  const group = new THREE.Group();
  const cars = look.cars;
  cars.forEach((c) => group.add(c));
  group.visible = false;
  scene.add(group);
  let last = Infinity,
    acc = 0;
  const smoke = new THREE.Color('#ece8e0'),
    v = new THREE.Vector3();
  return {
    group,
    show(s) {
      group.visible = true;
      const moved = Math.abs(s - last);
      last = s;
      cars.forEach((c, k) => {
        const off = s + (k ? 3.8 : 0) + 2;
        lineAt(line, off, P);
        const q = lateral(TRACK_L, { x: 0, z: 0 });
        c.position.set(q.x, railY(line, off), q.z);
        c.rotation.y = Math.atan2(-P.ux, -P.uz);
      });
      acc += moved;
      if (acc > 3) {
        acc = 0;
        look.chimneyTop.getWorldPosition(v);
        chuff(v.x, v.z, 1);
        for (let n = 0; n < 2; n++)
          emit({
            x: v.x,
            y: v.y,
            z: v.z,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 2.2,
            vz: (Math.random() - 0.5) * 0.6,
            life: 2.5,
            size: 0.6,
            color: smoke,
            alpha: 0.6,
            grow: [1, 3],
            fade: 0.5,
          });
        if (moved > 0) clank(v.x, v.z);
      }
    },
    hide() {
      group.visible = false;
    },
  };
}
export const bentThump = (x: number, z: number) => thump(x, z);

// ---------------------------------------------------------------- trains
const CARS: { spec: CarSpec; off: number }[] = [
  { spec: LOCO, off: 3.7 },
  { spec: TRAILER, off: 0 },
  { spec: TRAILER, off: -3.7 },
];
const BOTTOM = 0.4,
  BOGIE = 1.1;
type Car = {
  spec: CarSpec;
  off: number;
  hy: number;
  body: Body;
  mesh: THREE.Group;
  rock: THREE.Object3D;
  prevYaw: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  platform: Platform;
};
/** A train's place on its line: `stop` 0 at the village, 1 at the camp, -1 moving. */
export type Train = {
  line: Line;
  lat: number;
  phase: number;
  s: number;
  v: number;
  stop: -1 | 0 | 1;
  cars: Car[];
  load: Deck;
  lastStop: number;
  from: number;
};

const runSeconds = (line: Line) => (line.len - TUNE.stopIn * 2) / TUNE.cruise + TUNE.cruise / TUNE.accel;
export const cycleOf = (line: Line) => 2 * (TUNE.dwell + runSeconds(line));
/** Rides between stops, for the report and the card. */
export const rideSeconds = runSeconds;

const a = { ...P },
  b = { ...P };
function trainAt(tr: Train, t: number) {
  const { line } = tr;
  const RUN = runSeconds(line),
    C = cycleOf(line),
    LEN = line.len - TUNE.stopIn * 2,
    ta = TUNE.cruise / TUNE.accel;
  const along = (u: number) =>
    u < ta
      ? 0.5 * TUNE.accel * u * u
      : u < RUN - ta
        ? TUNE.cruise * (u - ta / 2)
        : LEN - 0.5 * TUNE.accel * (RUN - u) ** 2;
  const speed = (u: number) => Math.min(TUNE.cruise, TUNE.accel * u, TUNE.accel * (RUN - u));
  const c = (((t + tr.phase) % C) + C) % C;
  if (c < TUNE.dwell) {
    tr.s = TUNE.stopIn;
    tr.v = 0;
    tr.stop = 0;
  } else if (c < TUNE.dwell + RUN) {
    tr.s = TUNE.stopIn + along(c - TUNE.dwell);
    tr.v = speed(c - TUNE.dwell);
    tr.stop = -1;
  } else if (c < 2 * TUNE.dwell + RUN) {
    tr.s = line.len - TUNE.stopIn;
    tr.v = 0;
    tr.stop = 1;
  } else {
    const r = c - 2 * TUNE.dwell - RUN;
    tr.s = line.len - TUNE.stopIn - along(r);
    tr.v = -speed(r);
    tr.stop = -1;
  }
}

/** Two trains on a line's two tracks, half a cycle apart. `running` from when the link opens. */
export function buildTrains(line: Line) {
  const clock = { t: 0, running: false };
  const looks: ReturnType<typeof wagonLook>[] = [];
  const trains: Train[] = [-1, 1].map((side, n) => {
    const look = wagonLook(CARS.length - 1, false);
    looks.push(look);
    const cars: Car[] = [];
    const tr: Train = {
      line,
      lat: side * TRACK_L,
      phase: n * (cycleOf(line) / 2),
      s: TUNE.stopIn,
      v: 0,
      stop: 0,
      cars,
      load: null as unknown as Deck,
      lastStop: -1,
      from: n * (cycleOf(line) / 2),
    };
    CARS.forEach(({ spec, off }, k) => {
      const hy = (spec.top - BOTTOM) / 2;
      const body = createBody({
        type: BODY.KINEMATIC,
        material: groundMat,
        mask: NOT_SCENERY,
        position: { x: ORIGIN.x, y: -60, z: ORIGIN.z },
        shapes: [{ kind: 'box', hx: spec.hx, hy, hz: spec.hz }],
      });
      addBody(body);
      const mesh = new THREE.Group(),
        rock = look.cars[k]!;
      rock.position.y = -(BOTTOM + hy);
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
        x: ORIGIN.x,
        y: -60,
        z: ORIGIN.z,
        yaw: 0,
        pitch: 0,
        platform: { body, hx: spec.hx, hz: spec.hz, top: hy, move: (dt) => move(car, k, dt, tr) },
      };
      registerPlatform(car.platform);
      cars.push(car);
    });
    tr.load = deck(cars[cars.length - 1]!.rock.children[0]!, () => {});
    return tr;
  });
  function plan(tr: Train) {
    trainAt(tr, clock.t);
    for (const c of tr.cars) {
      const s = tr.s + c.off;
      lineAt(line, s + BOGIE, a);
      lineAt(line, s - BOGIE, b);
      c.x = (a.x + b.x) / 2 - ((a.uz + b.uz) / 2) * tr.lat + ORIGIN.x;
      c.z = (a.z + b.z) / 2 + ((a.ux + b.ux) / 2) * tr.lat + ORIGIN.z;
      c.yaw = Math.atan2(a.x - b.x, a.z - b.z);
      const ya = railY(line, s + BOGIE),
        yb = railY(line, s - BOGIE);
      c.y = (ya + yb) / 2 + BOTTOM + c.hy;
      c.pitch = Math.atan2(ya - yb, 2 * BOGIE);
    }
  }
  function move(c: Car, k: number, dt: number, tr: Train) {
    if (!clock.running) return;
    if (k === 0) {
      if (tr === trains[0]) clock.t += dt;
      plan(tr);
    }
    if (clock.t < tr.from) return; // the second train first shows at the village, not popping in beside you
    const p = c.body;
    c.prevYaw = yawOf(p.quaternion);
    const dx = c.x - p.position.x,
      dy = c.y - p.position.y,
      dz = c.z - p.position.z;
    if (dx * dx + dy * dy + dz * dz > 25) {
      p.position.set(c.x, c.y, c.z);
      p.quaternion.set(0, Math.sin(c.yaw / 2), 0, Math.cos(c.yaw / 2));
      p.velocity.set(0, 0, 0);
      p.angularVelocity.set(0, 0, 0);
      c.prevYaw = c.yaw;
      return;
    }
    p.velocity.set(dx / dt, dy / dt, dz / dt);
    p.angularVelocity.set(0, (angleLerp(c.prevYaw, c.yaw, 1) - c.prevYaw) / dt, 0);
  }
  const smoke = new THREE.Color('#ece8e0');
  const chimney = new THREE.Vector3();
  let puffs = 0;
  onFrame(
    ({ dt }) => {
      if (!clock.running) return;
      const alpha = stepAlpha();
      trains.forEach((tr, n) => {
        if (clock.t < tr.from) return;
        for (const c of tr.cars) {
          const ip = c.body.interpolatedPosition;
          c.mesh.position.set(ip.x, ip.y, ip.z);
          c.mesh.rotation.y = angleLerp(c.prevYaw, yawOf(c.body.quaternion), alpha);
          c.rock.rotation.x = -c.pitch;
          c.mesh.visible = true;
        }
        const speed = Math.abs(tr.v);
        puffs += speed * dt * 0.25 + (speed < 0.1 ? dt / 2 : 0);
        if (puffs < 1) return;
        looks[n]!.chimneyTop.getWorldPosition(chimney);
        for (; puffs >= 1; puffs--)
          emit({
            x: chimney.x,
            y: chimney.y,
            z: chimney.z,
            vx: 1.2 + (Math.random() - 0.5) * 0.6,
            vy: 1.5 + Math.random() * 0.8,
            vz: (Math.random() - 0.5) * 0.6,
            life: 2.4,
            size: 0.3,
            color: smoke,
            alpha: 0.35,
            drag: 0.6,
            grow: [1, 3.2],
            fade: 0.6,
          });
      });
    },
    { phase: 'update', order: 6 },
  );
  return {
    trains,
    clock,
    start(at = 0) {
      clock.running = true;
      clock.t = at;
    },
    stop() {
      clock.running = false;
      for (const tr of trains)
        for (const c of tr.cars) {
          c.body.position.set(ORIGIN.x, -60, ORIGIN.z);
          c.mesh.visible = false;
        }
    },
    onTrain: (p: Platform | null) => trains.some((tr) => tr.cars.some((c) => c.platform === p)),
  };
}
export type Trains = ReturnType<typeof buildTrains>;
