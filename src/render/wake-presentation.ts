// The unchanged Place wake presentation, shared by legacy Place and the owned production machine.
import * as THREE from 'three/webgpu';
import { reducedMotion } from '../constants.ts';
import { clamp } from '../math-pure.ts';
import { camConstraints, me } from '../player/player.ts';
import { chuff, thump, whistle } from './machine-sfx.ts';
import { emit } from './particles.ts';
import type { OwnedView } from './owned-view.ts';
type WakeCar = { x: number; y: number; z: number; yaw: number; spec: { hx: number; hz: number } };
type WakeEffects = {
  after: (seconds: number, run: () => void) => void;
  shakeView: (amount: number) => void;
  fanfare: (big: boolean) => void;
  dustRing: (x: number, y: number, z: number, n: number, radius: number, size: number) => void;
};
function whistleHere() {
  const b = me.body;
  if (b) whistle(b.position.x, b.position.z);
}
/** What a waking needs of something: the machine, or the old train. */
export type Waker = {
  flatbed: WakeCar;
  loco: WakeCar;
  look: { chimneyTop: THREE.Object3D };
  shudder: (a: number) => void;
  setRust: (v: number) => void;
  setFire: (v: number) => void;
  setLamps: (on: boolean) => void;
  setSlip: (rate: number) => void;
  distance: (x: number, z: number) => number;
};
// The machine's state through a waking, played by scheduleWake and restored by settle: rust flakes off in 16 steps,
// the fire catches, the wheels slip, the lamps come on.
const RUST = { start: 0.2, step: 0.11, steps: 16 };
const WAKE_STATE: readonly { t: number; fire?: number; slip?: number; lamps?: true }[] = [
  { t: 1, fire: 0.4, slip: 5 }, // the wheels try
  { t: 1.5, fire: 0.7, slip: 11 },
  { t: 1.95, fire: 1 },
  { t: 2.35, lamps: true, slip: 4 },
  { t: 2.9, slip: 0 },
];
const WAKE_END = 3.1;
const rust = new THREE.Color('#8a5a34'),
  flake = new THREE.Color('#6d4426'),
  dustC = new THREE.Color('#cdb48c'),
  steam = new THREE.Color('#f6f4ee'),
  soot = new THREE.Color('#7c7770');
const v = new THREE.Vector3();
function shedRust(m: Waker, n: number) {
  for (const c of [m.flatbed, m.loco])
    for (let k = 0; k < n; k++) {
      const sx = (Math.random() - 0.5) * 2 * c.spec.hx,
        sz = (Math.random() - 0.5) * 2 * c.spec.hz,
        cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw);
      emit({
        x: c.x + sx * cos + sz * sin,
        y: c.y + Math.random() * 1.3,
        z: c.z - sx * sin + sz * cos,
        vx: (Math.random() - 0.5) * 2.6,
        vy: 0.6 + Math.random() * 1.8,
        vz: (Math.random() - 0.5) * 2.6,
        life: 0.8 + Math.random() * 0.6,
        size: 0.08 + Math.random() * 0.1,
        color: Math.random() < 0.5 ? rust : flake,
        gravity: 9,
        shrink: 0.3,
      });
      if (k % 3 === 0)
        emit({
          x: c.x + sx * cos + sz * sin,
          y: c.y - 0.4 + Math.random(),
          z: c.z - sx * sin + sz * cos,
          vx: (Math.random() - 0.5) * 1.5,
          vy: 0.4,
          vz: (Math.random() - 0.5) * 1.5,
          life: 1 + Math.random() * 0.6,
          size: 0.5,
          grow: [1, 3],
          alpha: 0.55,
          fade: 0.6,
          color: dustC,
          drag: 1.4,
        });
    }
}
function cough(m: Waker, heavy: number) {
  m.look.chimneyTop.getWorldPosition(v);
  chuff(v.x, v.z, heavy);
  for (let k = 0; k < 3 + heavy * 5; k++)
    emit({
      x: v.x,
      y: v.y,
      z: v.z,
      vx: (Math.random() - 0.5) * 0.8,
      vy: 2 + heavy * 2,
      vz: (Math.random() - 0.5) * 0.8,
      life: 1.4,
      size: 0.4 + heavy * 0.2,
      grow: [1, 3],
      alpha: 0.7,
      fade: 0.5,
      color: heavy < 0.6 ? soot : steam,
    });
}
function steamBurst(m: Waker) {
  m.look.chimneyTop.getWorldPosition(v);
  for (let k = 0; k < 60; k++) {
    const a = Math.random() * Math.PI * 2,
      s = Math.random() * 2.6;
    emit({
      x: v.x,
      y: v.y,
      z: v.z,
      vx: Math.cos(a) * s,
      vy: 5 + Math.random() * 7,
      vz: Math.sin(a) * s,
      life: 1.8 + Math.random() * 1.4,
      size: 0.7 + Math.random() * 0.5,
      grow: [1, 4],
      alpha: 0.9,
      fade: 0.5,
      color: steam,
      drag: 0.9,
    });
  }
  // Out of the sides, low down, at the height of the wheels.
  const c = m.loco;
  for (const side of [-1, 1])
    for (let k = 0; k < 18; k++) {
      const cos = Math.cos(c.yaw),
        sin = Math.sin(c.yaw),
        s = 4 + Math.random() * 5;
      emit({
        x: c.x + side * 0.9 * cos,
        y: c.y - 0.5,
        z: c.z - side * 0.9 * sin,
        vx: side * cos * s + (Math.random() - 0.5),
        vy: Math.random() * 1.2,
        vz: -side * sin * s + (Math.random() - 0.5),
        life: 0.9 + Math.random() * 0.5,
        size: 0.5,
        grow: [1, 3.4],
        alpha: 0.8,
        fade: 0.5,
        color: steam,
        drag: 2.2,
      });
    }
}
/** About 3 s, and the player keeps control: a shudder, rust and dust shaking off, the boiler catching, a big burst of
 * steam, the headlamps, a whistle. `done` is when it's ready for work. */
function scheduleWake(
  m: Waker,
  { after, shakeView, fanfare, dustRing }: WakeEffects,
  onLamps: () => void,
  done: () => void,
) {
  const x = m.flatbed.x,
    z = m.flatbed.z;
  const near = () => (me.body ? Math.max(0, 1 - m.distance(me.body.position.x, me.body.position.z) / 18) : 0);
  thump(x, z);
  m.shudder(0.35);
  m.setRust(1);
  dustRing(m.loco.x, m.loco.y - 1, m.loco.z, 10, 2.4, 0.5);
  shedRust(m, 8);
  shakeView(0.05 * near());
  // The boiler tries, and tries faster.
  for (const [t, heavy] of [
    [0.45, 0.2],
    [0.95, 0.3],
    [1.3, 0.4],
    [1.55, 0.5],
    [1.72, 0.6],
    [1.85, 0.7],
  ] as const)
    after(t, () => {
      cough(m, heavy);
      thump(x, z);
      shedRust(m, 5);
      m.shudder(0.35 + heavy);
      shakeView(0.08 * near());
    });
  for (let k = 0; k <= RUST.steps; k++) after(RUST.start + k * RUST.step, () => m.setRust(1 - k / RUST.steps));
  // What happens with a state change, after it: the boiler catches, then the lamps.
  const alongside: Partial<Record<number, () => void>> = {
    1.95: () => {
      steamBurst(m);
      chuff(x, z, 1);
      thump(x, z);
      shedRust(m, 10);
      dustRing(m.flatbed.x, m.flatbed.y - 0.9, m.flatbed.z, 16, 4, 0.6);
      m.shudder(1);
      shakeView(0.16 * near());
    },
    2.35: () => {
      onLamps();
      m.shudder(0.25);
    },
  };
  for (const s of WAKE_STATE)
    after(s.t, () => {
      if (s.fire !== undefined) m.setFire(s.fire);
      if (s.slip !== undefined) m.setSlip(s.slip);
      if (s.lamps) m.setLamps(true);
      alongside[s.t]?.();
    });
  after(2.6, () => {
    whistleHere();
    whistle(x, z);
    fanfare(false);
  });
  after(WAKE_END, () => {
    m.shudder(0);
    done();
  });
}

/** Own callbacks and camera shake; restoring phase never replays historical sounds or emissions. */
export function createWakePresentation(
  machine: Waker,
  owner: OwnedView,
  effects: Pick<WakeEffects, 'fanfare' | 'dustRing'>,
) {
  const queue: { t: number; fn: () => void }[] = [];
  let shake = 0,
    restored = -1,
    disposed = false;
  const constraint: (typeof camConstraints)[number] = (_look, pos) => {
    if (shake > 0.001) {
      pos.x += (Math.random() - 0.5) * shake;
      pos.y += (Math.random() - 0.5) * shake;
      pos.z += (Math.random() - 0.5) * shake;
    }
    return false;
  };
  camConstraints.push(constraint);
  function settle(seconds: number) {
    if (seconds < 0) {
      machine.setRust(1);
      machine.setFire(0);
      machine.setLamps(false);
      machine.setSlip(0);
      machine.shudder(0);
      return;
    }
    const rustStep = clamp(Math.floor((seconds - RUST.start) / RUST.step), 0, RUST.steps);
    machine.setRust(1 - rustStep / RUST.steps);
    let fire = 0,
      slip = 0,
      lamps = false;
    for (const s of WAKE_STATE) {
      if (s.t > seconds) break;
      fire = s.fire ?? fire;
      slip = s.slip ?? slip;
      lamps ||= !!s.lamps;
    }
    machine.setFire(fire);
    machine.setLamps(lamps);
    machine.setSlip(slip);
    machine.shudder(0);
  }
  const api = {
    start(onLamps: () => void = () => {}, done: () => void = () => {}) {
      if (disposed) return;
      queue.length = 0;
      restored = -1;
      scheduleWake(
        machine,
        {
          ...effects,
          after: (t, fn) => {
            queue.push({ t, fn });
          },
          shakeView: (amount) => {
            shake = Math.max(shake, reducedMotion ? 0 : amount);
          },
        },
        onLamps,
        done,
      );
    },
    update(dt: number) {
      if (disposed) return;
      for (let i = queue.length - 1; i >= 0; i--) {
        const event = queue[i]!;
        event.t -= dt;
        if (event.t > 0) continue;
        queue.splice(i, 1);
        event.fn();
      }
      shake = Math.max(0, shake - dt * 0.5);
      if (restored >= 0 && restored < WAKE_END) {
        restored = Math.min(WAKE_END, restored + dt);
        settle(restored);
      }
    },
    reset(elapsedSeconds: number) {
      queue.length = 0;
      shake = 0;
      restored = Math.min(WAKE_END, elapsedSeconds);
      settle(restored);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      queue.length = 0;
      shake = 0;
      const i = camConstraints.indexOf(constraint);
      if (i >= 0) camConstraints.splice(i, 1);
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
