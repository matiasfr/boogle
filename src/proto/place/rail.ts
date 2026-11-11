// Place's own train (?proto=place): one train per line on kinematic platforms, the wagon's look, the crossing's way. The
// track, the cars and the machine it shares with the live railway are src/entities/railway/{line-geometry,track,car,
// track-machine}.ts (moved out in ECS migration M6); this tail goes with Place (M13). Local: every tab runs its own.
import * as THREE from 'three/webgpu';
import { drawCar, makeCar, poseCarOnLine, snapCar, type Car } from '../../entities/railway/car.ts';
import { onFrame } from '../../loop.ts';
import { job } from './job.ts';
import { emit } from '../../render/particles.ts';
import { FIXED, PLAYER_R } from '../../constants.ts';
import { stepAlpha } from '../../physics/engine.ts';
import { type Platform } from '../../physics/platforms.ts';
import { wagonLook, LOCO, TRAILER, type CarSpec } from '../../render/wagon-look.ts';
import { deck, type Deck } from '../../render/crates.ts';
import { ORIGIN, TUNE, type Line } from '../../place/layout.ts';
import { LOOK, rustTrainU } from '../../place/look.ts';
import { trainLook } from '../../place/look-kit.ts';
import { solidTrainLoad } from '../../entities/railway/train-load.ts';
import { registerSeat } from '../../entities/railway/seat.ts';

// ---------------------------------------------------------------- trains
// Not a timetable: the owner felt "at the whims of if a train happened to show up". A train shuttles along its stops with its
// cargo, and stepping onto a platform calls it straight there (./cargo.ts). It knows how long that'll be.
const CARS: { spec: CarSpec; off: number }[] = [
  { spec: LOCO, off: 3.7 },
  { spec: TRAILER, off: 0 },
  { spec: TRAILER, off: -3.7 },
];
export type Train = {
  line: Line;
  stops: number[];
  s: number;
  v: number; // m/s along the line, signed
  stop: number; // the stop it's standing at, -1 moving
  target: number;
  sweep: 1 | -1; // which way it's working along the stops
  dwell: number; // s left at this stop
  express: boolean; // someone's aboard: straight to the end of the line, past the stops between
  cars: Car[];
  load: Deck;
  lastStop: number;
};
function stepTrain(tr: Train, dt: number) {
  if (tr.dwell > 0) {
    tr.dwell -= dt;
    if (tr.dwell > 0) return;
    // On to the next stop along, turning at the ends.
    if (tr.target + tr.sweep < 0 || tr.target + tr.sweep >= tr.stops.length) tr.sweep = -tr.sweep as 1 | -1;
    tr.target = tr.express ? (tr.sweep > 0 ? tr.stops.length - 1 : 0) : tr.target + tr.sweep;
    tr.express = false;
    tr.stop = -1;
  }
  const to = tr.stops[tr.target]!,
    d = to - tr.s,
    want = Math.sign(d) * Math.min(TUNE.cruise, Math.sqrt(2 * TUNE.accel * Math.abs(d))),
    most = TUNE.accel * dt;
  tr.v += Math.max(-most, Math.min(most, want - tr.v));
  tr.s += tr.v * dt;
  if (Math.abs(to - tr.s) < 0.04 && Math.abs(tr.v) < 0.4) {
    tr.s = to;
    tr.v = 0;
    tr.stop = tr.target;
    tr.dwell = TUNE.dwell;
    tr.express = false;
  }
}
/** Seconds until it can be standing at `stop`, if it goes there now. */
export function trainEta(tr: Train, stop: number) {
  if (tr.stop === stop) return 0;
  const a = TUNE.accel,
    c = TUNE.cruise;
  let d = tr.stops[stop]! - tr.s,
    v = tr.v * Math.sign(d) || 0,
    t = 0;
  d = Math.abs(d);
  if (v < 0) {
    // Going the other way: it stops first, and that's further to come back.
    t += -v / a;
    d += (v * v) / (2 * a);
    v = 0;
  }
  const up = (c * c - v * v) / (2 * a),
    down = (c * c) / (2 * a);
  if (up + down <= d) t += (c - v) / a + (d - up - down) / c + c / a;
  else t += (2 * Math.sqrt(a * d + (v * v) / 2) - v) / a;
  return Math.ceil(t);
}
/** Straight there. If it's already heading the other way it brakes and comes back. */
export function callTrain(tr: Train, stop: number) {
  if (tr.stop === stop) {
    tr.dwell = Math.max(tr.dwell, TUNE.dwell);
    return;
  }
  tr.target = stop;
  tr.dwell = 0;
  tr.stop = -1;
  tr.sweep = stop === 0 ? 1 : stop === tr.stops.length - 1 ? -1 : tr.sweep;
}

/** One train on a line. It stands where it's told until `start`. */
export function buildTrain(line: Line, stops: number[], id: string) {
  const clock = { running: false };
  const look = LOOK.kit
    ? trainLook(CARS.length - 1, () => job.boiler >= 3 || job.rung.trains)
    : wagonLook(CARS.length - 1, false);
  const tr: Train = {
    line,
    stops,
    s: stops[stops.length - 1]!,
    v: 0,
    stop: stops.length - 1,
    target: stops.length - 1,
    sweep: -1,
    dwell: 0,
    express: false,
    cars: [],
    load: null as unknown as Deck,
    lastStop: -1,
  };
  const plan = () => tr.cars.forEach((c, k) => poseCarOnLine(c, line, tr.s + CARS[k]!.off, 1));
  let updateLoad = () => {};
  CARS.forEach(({ spec }, k) => {
    tr.cars.push(
      makeCar(
        spec,
        look.cars[k]!,
        () => {
          if (k === CARS.length - 1) updateLoad();
          if (k === 0 && clock.running) {
            stepTrain(tr, FIXED);
            plan();
          }
        },
        {},
      ),
    );
  });
  tr.load = deck(tr.cars[tr.cars.length - 1]!.rock.children[0]!, () => {});
  // The empty car's two resting places sit directly on its deck; keep the aisle and exits clear.
  const passenger = tr.cars[1]!;
  const group = `train-${id}`;
  [-0.8, 0.8].forEach((z, i) => {
    registerSeat({
      id: `${group}-${i}`,
      group,
      platform: passenger.platform,
      at: { x: passenger.spec.hx - 0.2, y: passenger.hy + PLAYER_R, z, yaw: Math.PI / 2 },
      exit: { x: 0.65, y: passenger.hy + 0.46, z, yaw: Math.PI / 2 },
      available: () => passenger.y > -30,
    });
  });
  updateLoad = solidTrainLoad(tr.cars[tr.cars.length - 1]!, tr.load);
  const smoke = new THREE.Color('#ece8e0'),
    chimney = new THREE.Vector3();
  let puffs = 0,
    shudder = 0;
  const rocks = tr.cars.map((c) => c.rock);
  onFrame(
    ({ dt, now }) => {
      const alpha = stepAlpha();
      for (const c of tr.cars) drawCar(c, alpha);
      if (shudder > 0)
        rocks.forEach((r, n) => {
          r.rotation.z = Math.sin(now * 0.073 + n * 1.3) * 0.018 * shudder;
          r.position.x = Math.sin(now * 0.097 + n * 1.3) * 0.035 * shudder;
        });
      if (!clock.running) return;
      const speed = Math.abs(tr.v);
      puffs += speed * dt * 0.25 + (speed < 0.1 ? dt / 2 : 0);
      if (puffs < 1) return;
      look.chimneyTop.getWorldPosition(chimney);
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
    },
    { phase: 'update', order: 6 },
  );
  const run = {
    tr,
    clock,
    /** Runs, from wherever it's standing. */
    start() {
      clock.running = true;
      tr.dwell = Math.max(tr.dwell, 1.5);
      tr.stop = tr.target;
      plan();
      for (const c of tr.cars) c.mesh.visible = true;
    },
    /** Under the land until it's needed. */
    hide() {
      clock.running = false;
      for (const c of tr.cars) {
        c.x = ORIGIN.x;
        c.y = -60;
        c.z = ORIGIN.z;
        snapCar(c);
      }
    },
    /** Stands at a stop, waiting. */
    park(stop = stops.length - 1) {
      clock.running = false;
      tr.s = stops[stop]!;
      tr.v = 0;
      tr.stop = tr.target = stop;
      tr.sweep = stop === 0 ? 1 : -1;
      tr.dwell = 0;
      plan();
      for (const c of tr.cars) snapCar(c);
    },
    /** Running, from a saved or shared place. */
    put(s: number, v: number, target: number, sweep: 1 | -1, dwell: number, express = false) {
      clock.running = true;
      tr.s = s;
      tr.v = v;
      tr.target = target;
      tr.sweep = sweep;
      tr.dwell = dwell;
      tr.express = express;
      tr.stop = dwell > 0 ? target : -1;
      plan();
      for (const c of tr.cars) snapCar(c);
    },
    onTrain: (p: Platform | null) => tr.cars.some((c) => c.platform === p),
    look,
    clockRunning: () => clock.running,
    /** For the wake: what ./celebrate.ts's wakeShow asks of a machine. */
    waker: {
      flatbed: tr.cars[1]!,
      loco: tr.cars[0]!,
      look,
      shudder: (a: number) => {
        shudder = a;
        if (!a) for (const r of rocks) r.rotation.z = r.position.x = 0;
      },
      setRust: (v: number) => void (rustTrainU.value = v),
      setFire: () => {},
      setLamps: () => {},
      setSlip: (rate: number) => {
        const l = look as { slip?: { rate: number } };
        if (l.slip) l.slip.rate = rate;
      },
      distance: (x: number, z: number) => Math.hypot(tr.cars[1]!.x - x, tr.cars[1]!.z - z),
    },
  };
  return run;
}
export type TrainRun = ReturnType<typeof buildTrain>;

