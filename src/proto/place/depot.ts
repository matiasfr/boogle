// Materials brought closer, the ladder's third rung: when line 2's first stretch is laid, two little guys start shoving a cart
// of logs down your track from the camp, over the turntable, to a rack by the next frame. You do the last carry; rails stay
// yours to fetch from the forge. It's a real but small job for them: the owner's "hungry" ladder changes "life, not labour"
// for this rung only. Its rack is what the first train fills at the end, too. docs/research/next-load-motivation.md, rec 1.
// Local; the room's cart runs on every tab, nudged by ./coop.ts's snapshot.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { FIXED } from '../../constants.ts';
import { scene } from '../../render/scene.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { removeBody, setShapes, stepAlpha, type Body } from '../../physics/engine.ts';
import { flat } from '../flat.ts';
import { pop } from '../minis/common.ts';
import { H, addStatic } from './land.ts';
import { LOOK, STEEL } from './look.ts';
import { kitBatch } from './look-kit.ts';
import { CART, STUB, lineAt, railY, type LinePoint } from './layout.ts';
import { COOP, count, job, num, sharedSlice } from './job.ts';
import { L1, L2 } from './lines.ts';
import { RAIL_SIZE, dustRing, logStackMesh, send, setStackLog } from './pieces.ts';
import { besideLine, drawCar, makeCar, poseCarOnLine, type Car } from './rail.ts';
import { addFoot } from './sites.ts';
import type { StationRun } from './stations.ts';

// ---------------------------------------------------------------- the rack
const RACK_LOGS = 48,
  RACK_RAILS = 40;
const rackLook = new THREE.Group();
for (const dz of [-1.1, 1.1]) {
  const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.2), flat('#8a6236'));
  b.position.set(0, 0.08, dz);
  b.castShadow = true;
  rackLook.add(b);
  for (const dx of [-0.8, 0.8]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.3, 0.14), flat('#7f5630'));
    post.position.set(dx, 0.65, dz);
    post.castShadow = true;
    rackLook.add(post);
  }
}
rackLook.visible = false;
scene.add(rackLook);
const rackedLogs = logStackMesh(RACK_LOGS);
const rackedRails = LOOK.kit
  ? kitBatch('rail', STEEL, RACK_RAILS)
  : new THREE.InstancedMesh(
      new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z),
      flat('#4c5058', 0.6),
      RACK_RAILS,
    );
rackedRails.castShadow = true;
rackedRails.frustumCulled = false;
rackedRails.count = 0;
scene.add(rackedRails);

export const rack = {
  logs: 0,
  rails: 0,
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  on: false,
  at: new THREE.Vector3(),
  promptAt: new THREE.Vector3(),
};
let rackBody: Body | null = null;
const slot = new THREE.Vector3(),
  q0 = new THREE.Quaternion(),
  m4 = new THREE.Matrix4(),
  one = new THREE.Vector3(1, 1, 1);
const logAt = (n: number, out = slot) => {
  const row = Math.floor(n / 6),
    c = n % 6;
  const along = (c - 2.5) * 0.3,
    up = 0.32 + row * 0.27;
  return out.set(rack.x + Math.cos(rack.yaw) * along, rack.y + up, rack.z - Math.sin(rack.yaw) * along);
};
const railAt = (n: number, out = slot) => {
  const row = Math.floor(n / 8),
    c = n % 8;
  const off = 1.15,
    along = (c - 3.5) * 0.17;
  return out.set(
    rack.x + Math.cos(rack.yaw) * along + Math.sin(rack.yaw) * off * 0,
    rack.y + 0.3 + Math.floor(Math.max(rack.logs, 1) / 6) * 0.27 + 0.28 + row * 0.18,
    rack.z - Math.sin(rack.yaw) * along,
  );
};
export function drawRack() {
  for (let k = 0; k < rack.logs; k++) setStackLog(rackedLogs, k, logAt(k), rack.yaw + Math.PI / 2);
  rackedLogs.count = Math.min(RACK_LOGS, rack.logs);
  rackedLogs.visible = rack.on && rack.logs > 0;
  rackedLogs.instanceMatrix.needsUpdate = true;
  if (rackedLogs.instanceColor) rackedLogs.instanceColor.needsUpdate = true;
  q0.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rack.yaw);
  for (let k = 0; k < Math.min(RACK_RAILS, rack.rails); k++) rackedRails.setMatrixAt(k, m4.compose(railAt(k), q0, one));
  rackedRails.count = rack.on ? Math.min(RACK_RAILS, rack.rails) : 0;
  rackedRails.instanceMatrix.needsUpdate = true;
}
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** The rack stands by this frame, along the line behind it, on its side; none for a frame without one. */
export function moveRack(st: StationRun | null) {
  const want = !!st?.spec.rack && st !== null;
  if (rackBody) removeBody(rackBody);
  rackBody = null;
  rack.on = want;
  rackLook.visible = want;
  if (want) {
    const { line, dir } = L2.spec;
    // Behind the frame along the track, on solid ground: not hanging off a trestle's end.
    let s = st.spec.s - dir * 16,
      q = besideLine(line, s, st.spec.side * 5.2);
    for (const back of [16, 13, 10, 8, 20, 24]) {
      s = st.spec.s - dir * back;
      q = besideLine(line, s, st.spec.side * 5.2);
      const y = railY(line, s);
      if (
        [0, 2.4].every((r) =>
          [
            [r, 0],
            [-r, 0],
            [0, r],
            [0, -r],
          ].every(([a, b]) => Math.abs(H(q.x + a!, q.z + b!) - y) < 1),
        )
      )
        break;
    }
    lineAt(line, s, P);
    rack.x = q.x;
    rack.z = q.z;
    rack.y = H(q.x, q.z);
    rack.yaw = Math.atan2(P.ux, P.uz) + Math.PI / 2;
    rack.at.set(q.x, rack.y + 0.8, q.z);
    rack.promptAt.set(q.x, rack.y + 1.8, q.z);
    rackLook.position.set(q.x, rack.y, q.z);
    rackLook.rotation.y = rack.yaw;
    rackBody = addStatic(
      { kind: 'box', hx: 0.9, hy: 0.8, hz: 1.2 },
      { x: q.x, y: rack.y + 0.8, z: q.z },
      q0.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rack.yaw),
    );
    addFoot(q.x, q.z, rack.yaw, 1, 1.3);
  }
  drawRack();
}
/** Crates or a cart's load land on it. */
export function rackAdd(logs: number, rails: number) {
  rack.logs += logs;
  rack.rails += rails;
  drawRack();
}
/** Pieces off it for your back: the caller decides how many. */
export function rackTake(logs: number, rails: number) {
  rack.logs = Math.max(0, rack.logs - logs);
  rack.rails = Math.max(0, rack.rails - rails);
  drawRack();
}

// ---------------------------------------------------------------- the cart
// Its road: down line 1 from the camp to the turntable, then out along line 2. `d` is metres along that from the camp.
const L1_FROM = STUB.camp + 5; // on line 1, where it loads
const FORGE_D = L1_FROM;
const stopFor = (st: StationRun) => L1_FROM + st.spec.s - 13; // a little behind the machine, by the rack
function poseOnRoad(c: Car, d: number) {
  if (d <= L1_FROM) poseCarOnLine(c, L1.spec.line, L1_FROM - d, -1);
  else poseCarOnLine(c, L2.spec.line, d - L1_FROM, 1);
}
const cartLook = new THREE.Group();
{
  const deck = new THREE.Mesh(new THREE.BoxGeometry(CART.hx * 2, 0.12, CART.hz * 2), flat('#a9794c'));
  deck.position.y = CART.top - 0.06;
  deck.castShadow = true;
  cartLook.add(deck);
  for (const sx of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, CART.hz * 2), flat('#7f5630'));
    side.position.set(sx * CART.hx, CART.top + 0.14, 0);
    cartLook.add(side);
    for (const sz of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10).rotateZ(Math.PI / 2), flat('#2c2e34'));
      w.position.set(sx * 0.5, 0.2, sz * (CART.hz - 0.35));
      cartLook.add(w);
    }
  }
  const bar = new THREE.Mesh(new THREE.BoxGeometry(CART.hx * 2, 0.08, 0.08), flat('#c9a86a'));
  bar.position.set(0, CART.top + 0.5, -CART.hz - 0.1);
  cartLook.add(bar);
}
const cartLogs = logStackMesh(CART.load);
cartLogs.removeFromParent();
cartLook.add(cartLogs);
const cartRailsMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.1, 2.4), flat('#8d9299'), CART.rails);
cartRailsMesh.count = 0;
cartLook.add(cartRailsMesh);
const leg = { LOAD: 'load', OUT: 'out', DROP: 'drop', BACK: 'back', REST: 'rest', FORGE: 'forge' } as const;
type Leg = (typeof leg)[keyof typeof leg];
export const cart = {
  d: 0,
  leg: 'rest' as Leg,
  t: 0,
  load: 0,
  rails: 0,
  called: false,
  speed: 0,
};
export function loadCart(n: number) {
  cart.rails = Math.min(CART.rails, Math.max(0, cart.rails + n));
  cart.t = 0;
  drawLoad(cart.load);
}
export function callCart() {
  cart.called = true;
}
let activeStation: () => StationRun | null = () => null;
export const setDepotFrame = (fn: () => StationRun | null) => void (activeStation = fn);
const car: Car = makeCar({ hx: CART.hx, hz: CART.hz, top: CART.top }, cartLook, () => stepCart(FIXED), {});
export const cartPlatform = car.platform;
const here = new THREE.Vector3();
function drawLoad(n: number) {
  cartLogs.count = n;
  cartLogs.visible = n > 0;
  for (let k = 0; k < n; k++) {
    const row = Math.floor(k / 4),
      c = k % 4;
    setStackLog(cartLogs, k, here.set((c - 1.5) * 0.3, CART.top + 0.15 + row * 0.27, 0), Math.PI / 2);
  }
  cartLogs.instanceMatrix.needsUpdate = true;
  if (cartLogs.instanceColor) cartLogs.instanceColor.needsUpdate = true;
  for (let k = 0; k < cart.rails; k++) {
    here.set(((k % 8) - 3.5) * 0.16, CART.top + 0.3 + Math.ceil(n / 4) * 0.27 + Math.floor(k / 8) * 0.12, 0);
    cartRailsMesh.setMatrixAt(k, m4.compose(here, new THREE.Quaternion(), one));
  }
  cartRailsMesh.count = cart.rails;
  cartRailsMesh.instanceMatrix.needsUpdate = true;
  // In co-op you ride the cargo, not inside it. Keep the original solo deck unchanged.
  if (COOP) {
    const cargoTop = cart.rails
      ? 0.35 + Math.ceil(n / 4) * 0.27 + Math.floor((cart.rails - 1) / 8) * 0.12
      : n
        ? 0.3 + Math.floor((n - 1) / 4) * 0.27
        : 0;
    car.platform.top = car.hy + cargoTop;
    setShapes(car.body, [
      { kind: 'box', hx: CART.hx, hy: car.hy + cargoTop / 2, hz: CART.hz, offset: { x: 0, y: cargoTop / 2, z: 0 } },
    ]);
  }
}
function stepCart(dt: number) {
  if (!job.rung.depot) return;
  const st = activeStation();
  const owed = st?.spec.rack === 'cart' ? st.wants('logs') - rack.logs - cart.load : 0;
  switch (cart.leg) {
    case 'rest':
      if ((owed > 0 || cart.called) && !job.rung.trains) {
        cart.leg = 'load';
        cart.t = 0;
      }
      break;
    case 'load':
      cart.t += dt;
      if (cart.t >= 1 && !cart.load) {
        const n = Math.min(CART.load, Math.max(0, st ? st.wants('logs') - rack.logs : 0));
        cart.load = n;
        if (!n && !cart.called) {
          cart.leg = 'rest';
          break;
        }
        drawLoad(n);
        clank(car.x, car.z);
      }
      if (cart.t >= CART.loadS) {
        cart.leg = 'out';
        whistle(car.x, car.z);
      }
      break;
    case 'out': {
      const to = cart.called && cart.d < FORGE_D ? FORGE_D : st ? stopFor(st) : cart.d;
      cart.speed = Math.min(CART.speed, cart.speed + 3 * dt);
      cart.d = Math.min(to, cart.d + cart.speed * dt);
      if (cart.d >= to - 0.02) {
        cart.leg = cart.called && to === FORGE_D ? 'forge' : 'drop';
        cart.t = 0;
        cart.speed = 0;
      }
      break;
    }
    case 'forge':
      cart.t += dt;
      if (cart.t >= (cart.rails > 0 ? CART.leaveS : CART.forgeS)) {
        cart.called = false;
        whistle(car.x, car.z);
        cart.leg = 'out';
      }
      break;
    case 'drop':
      cart.t += dt;
      if (cart.t > 0.5 && (cart.load > 0 || cart.rails > 0) && rack.on) {
        const n = cart.load;
        const rails = cart.rails;
        cart.load = 0;
        cart.rails = 0;
        drawLoad(0);
        here.set(car.x, car.y + 1, car.z);
        // They heave them over, in a stream, and they land on the rack.
        for (let k = 0; k < n; k++)
          send('log', here, logAt(rack.logs + k, new THREE.Vector3()), {
            dur: 0.45,
            delay: k * 0.06,
            apex: 1.1,
            size: [1.6, 2.2],
            land: () => {
              rackAdd(1, 0);
              if (k % 3 === 0) pop(Math.min(7, k / 3), 0.35);
              if (k === n - 1) {
                thump(rack.x, rack.z);
                dustRing(rack.x, rack.y + 0.3, rack.z, 8, 2, 0.3);
              }
            },
          });
        for (let k = 0; k < rails; k++)
          send('rail', here, rack.at, { dur: 0.45, delay: (n + k) * 0.06, apex: 1.1, land: () => rackAdd(0, 1) });
      }
      if (cart.t > 2.2) cart.leg = 'back';
      break;
    case 'back':
      cart.speed = Math.min(CART.speed, cart.speed + 3 * dt);
      cart.d = Math.max(cart.called && cart.d > FORGE_D ? FORGE_D : 0, cart.d - cart.speed * dt);
      if (cart.called && cart.d === FORGE_D) {
        cart.leg = 'forge';
        cart.t = 0;
        cart.speed = 0;
      } else if (cart.d <= 0.02) {
        cart.leg = 'rest';
        cart.speed = 0;
      }
      break;
  }
  poseOnRoad(car, cart.d);
}
onFrame(() => drawCar(car, stepAlpha()), { phase: 'update', order: 6 });
export const cartHere = () => ({ x: car.x, z: car.z });
export const onCart = (p: unknown) => p === car.platform;
/** For the two who shove it: their feet on the rail. */
export function cartFolk() {
  return job.rung.depot && !job.rung.trains ? { mesh: car.mesh, top: -(0.4 + car.hy) + 0.1 - 0.14, hz: CART.hz } : null;
}
/** Where it should stand, with no show. Trains retire it to its shed by the camp. */
export function snapCart() {
  if (!job.rung.depot) {
    car.x = L1.spec.line.xs[0]!;
    car.y = -60;
    car.z = 0;
    car.mesh.visible = false;
    cart.leg = 'rest';
    cart.d = 0;
    cart.load = 0;
    cart.rails = 0;
    cart.called = false;
    drawLoad(0);
    return;
  }
  poseOnRoad(car, cart.d);
  drawLoad(cart.load);
}
sharedSlice('depot', {
  get: () => ({
    logs: rack.logs,
    rails: rack.rails,
    d: +cart.d.toFixed(1),
    leg: cart.leg,
    t: cart.t,
    load: cart.load,
    cartRails: cart.rails,
    called: cart.called,
  }),
  set: (v) => {
    const j = (v ?? {}) as {
      logs?: unknown;
      rails?: unknown;
      d?: unknown;
      leg?: unknown;
      t?: unknown;
      load?: unknown;
      cartRails?: unknown;
      called?: unknown;
    };
    rack.logs = count(j.logs, 400) ? j.logs : 0;
    rack.rails = count(j.rails, 400) ? j.rails : 0;
    cart.d = num(j.d) ? j.d : 0;
    cart.leg = Object.values(leg).includes(j.leg as Leg) ? (j.leg as Leg) : 'rest';
    cart.t = num(j.t) ? j.t : 0;
    cart.load = count(j.load, CART.load) ? j.load : 0;
    cart.rails = count(j.cartRails, CART.rails) ? j.cartRails : 0;
    cart.called = typeof j.called === 'boolean' ? j.called : false;
    cart.speed = 0;
  },
});
