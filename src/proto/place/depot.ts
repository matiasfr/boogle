// Materials brought closer, the ladder's third rung: when line 2's first stretch is laid, two little guys start shoving a cart
// of logs down your track from the camp, over the turntable, to a rack by the next frame. From Q4 it also stops for forge
// rails; you still do the last carry. It's a real but small job for them: the owner's "hungry" ladder changes "life, not labour"
// for this rung only. Its rack is what the first train fills at the end, too. docs/research/next-load-motivation.md, rec 1.
// Local; the room's cart runs on every tab, nudged by ./coop.ts's snapshot.
import * as THREE from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { FIXED } from '../../constants.ts';
import { scene } from '../../render/scene.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { removeBody, setShapes, stepAlpha, teleport, type Body } from '../../physics/engine.ts';
import { carry, CARRY } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { flat } from '../../render/flat.ts';
import { pop } from '../../render/fanfare.ts';
import { label } from './label.ts';
import { H, addStatic } from './land.ts';
import { LOOK, STEEL } from './look.ts';
import { kitBatch } from './look-kit.ts';
import { CART, STUB, lineAt, railY, type LinePoint } from './layout.ts';
import { COOP, count, job, num, sharedSlice } from './job.ts';
import { L1, L2 } from './lines.ts';
import { RAIL_SIZE, dustRing, logStackMesh, send, setStackLog } from './pieces.ts';
import { besideLine, drawCar, makeCar, poseCarOnLine, snapCar, type Car } from './rail.ts';
import { addFoot } from './sites.ts';
import type { StationRun } from './stations.ts';
import { makeProp } from '../../render/prop-kit.ts';

// ---------------------------------------------------------------- the rack
const RACK_LOGS = 48,
  RACK_RAILS = 40,
  RAIL_BAY = 2;
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
// The empty bearers explain where the steel goes, independently of the log pile.
for (const dz of [-1.1, 1.1]) {
  const bearer = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 0.24), flat('#8a6236'));
  bearer.position.set(RAIL_BAY, 0.12, dz);
  bearer.castShadow = true;
  rackLook.add(bearer);
  for (const dx of [-0.8, 0.8]) {
    const stop = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.16), flat('#7f5630'));
    stop.position.set(RAIL_BAY + dx, 0.3, dz);
    stop.castShadow = true;
    rackLook.add(stop);
  }
}
rackLook.visible = false;
scene.add(rackLook);
const serviceTag = label(6, 2);
serviceTag.sprite.position.set(RAIL_BAY, 3.2, 0);
rackLook.add(serviceTag.sprite);
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
let rackBody: Body | null = null,
  railBody: Body | null = null,
  pendingLogs = 0,
  pendingRails = 0,
  takenLogs = 0,
  takenRails = 0,
  dropGeneration = 0;
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
  const along = RAIL_BAY + (c - 3.5) * 0.17;
  return out.set(rack.x + Math.cos(rack.yaw) * along, rack.y + 0.32 + row * 0.18, rack.z - Math.sin(rack.yaw) * along);
};
export function drawRack() {
  for (let k = 0; k < Math.min(RACK_LOGS, rack.logs); k++) setStackLog(rackedLogs, k, logAt(k), rack.yaw + Math.PI / 2);
  rackedLogs.count = Math.min(RACK_LOGS, rack.logs);
  rackedLogs.visible = rack.on && rack.logs > 0;
  rackedLogs.instanceMatrix.needsUpdate = true;
  if (rackedLogs.instanceColor) rackedLogs.instanceColor.needsUpdate = true;
  q0.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rack.yaw);
  for (let k = 0; k < Math.min(RACK_RAILS, rack.rails); k++) rackedRails.setMatrixAt(k, m4.compose(railAt(k), q0, one));
  rackedRails.count = rack.on ? Math.min(RACK_RAILS, rack.rails) : 0;
  rackedRails.instanceMatrix.needsUpdate = true;
  if (railBody) {
    const top = Math.max(0.6, 0.4 + Math.floor(Math.max(0, rackedRails.count - 1) / 8) * 0.18);
    setShapes(railBody, [{ kind: 'box', hx: 0.86, hy: top / 2, hz: 1.3, offset: { x: 0, y: top / 2, z: 0 } }]);
  }
}
const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
/** The rack stands by this frame, along the line behind it, on its side; none for a frame without one. */
export function moveRack(st: StationRun | null) {
  const want = !!st?.spec.rack && st !== null;
  if (rackBody) removeBody(rackBody);
  if (railBody) removeBody(railBody);
  rackBody = null;
  railBody = null;
  rack.on = want;
  rackLook.visible = want;
  if (want) {
    const { line, dir } = L2.spec;
    // Behind the frame along the track, on solid ground: not hanging off a trestle's end.
    let s = st.spec.s - dir * 16,
      q = besideLine(line, s, st.spec.side * 5.2);
    // Q2's receiving pile belongs in the approach toward the arriving cart, not behind the player.
    // The cart keeps its existing stop, route and delivery cadence.
    const backs = st.spec.id === 'Q2' ? [24, 20, 16, 13, 10, 8] : [16, 13, 10, 8, 20, 24];
    for (const back of backs) {
      s = st.spec.s - dir * back;
      q = besideLine(line, s, st.spec.side * 5.2);
      const y = railY(line, s);
      if (
        [0, 3].every((r) =>
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
    const x = q.x + Math.cos(rack.yaw) * RAIL_BAY,
      z = q.z - Math.sin(rack.yaw) * RAIL_BAY;
    railBody = addStatic(
      { kind: 'box', hx: 0.86, hy: 0.3, hz: 1.3, offset: { x: 0, y: 0.3, z: 0 } },
      { x, y: rack.y, z },
      q0,
    );
    addFoot(q.x, q.z, rack.yaw, 1, 1.3);
    addFoot(x, z, rack.yaw, 1, 1.4);
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
  // A corrected follower may already see a flight as settled. Its pickup must consume our reservation too.
  const flyingLogs = Math.min(pendingLogs, Math.max(0, logs - rack.logs)),
    flyingRails = Math.min(pendingRails, Math.max(0, rails - rack.rails));
  pendingLogs -= flyingLogs;
  pendingRails -= flyingRails;
  takenLogs += flyingLogs;
  takenRails += flyingRails;
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
cartLook.add(makeProp('cart'));
const cartLogs = logStackMesh(CART.load);
cartLogs.removeFromParent();
cartLook.add(cartLogs);
const cartRailsMesh = LOOK.kit
  ? kitBatch('rail', STEEL, CART.rails)
  : new THREE.InstancedMesh(
      new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z),
      flat('#4c5058', 0.6),
      CART.rails,
    );
cartRailsMesh.removeFromParent();
cartRailsMesh.castShadow = true;
cartRailsMesh.frustumCulled = false;
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
  recallQueued: false,
  auto: false,
  manual: false,
  boost: false,
  speed: 0,
};
export const CART_RIDE_SPEED = 13;
export function loadCart(n: number, manual = false) {
  if (manual && n > 0 && cart.rails < CART.rails) cart.manual = true;
  cart.rails = Math.min(CART.rails, Math.max(0, cart.rails + n));
  cart.t = 0;
  drawLoad(cart.load);
}
export function callCart() {
  cart.recallQueued = false;
  cart.called = true;
  cart.auto = false; // An explicit whistle takes over the automatic stop without changing its cargo.
  // A whistle recalls even a loaded outbound cart; demand at the frontier is irrelevant.
  cart.leg = cart.d > FORGE_D ? 'back' : cart.d < FORGE_D ? 'out' : 'forge';
  cart.t = 0;
  cart.speed = 0;
}
/** Calls protect cargo already promised to the frontier. */
export function recallCart() {
  if (cart.recallQueued || (cart.called && !cart.auto)) return;
  if (cart.load + cart.rails + pendingLogs + pendingRails > 0) cart.recallQueued = true;
  else callCart();
}
export const cartHasDelivery = () => cart.load + cart.rails + pendingLogs + pendingRails > 0;
let activeStation: () => StationRun | null = () => null;
export const setDepotFrame = (fn: () => StationRun | null) => void (activeStation = fn);
/** Installed by pair.ts, which already owns forge/co-op dependencies; no reverse import cycle. */
export const depotRails = { load: () => {}, stock: () => 0 };
/** The prototype authority decides the shared ride bonus; solo reads its own rider. */
export const depotRide = { update: () => {} };
export const automaticRails = () => {
  const st = activeStation();
  return job.rung.depot && !job.rung.trains && st?.spec.rack === 'cart' && (st.spec.id === 'Q4' || st.spec.id === 'Q5');
};
export const railsOwed = () => {
  const st = activeStation();
  return st?.spec.rack === 'cart' ? Math.max(0, st.wants('rails') - rack.rails - pendingRails - cart.rails) : 0;
};
/** Local view of the entire delivery, including stock in flight after debt reaches zero. */
export function deliveryStatus() {
  const st = activeStation();
  const pending = pendingLogs + pendingRails;
  const cargo = cart.load + cart.rails;
  const missing =
    st?.spec.rack === 'cart'
      ? Math.max(0, st.wants('logs') - rack.logs) + (automaticRails() ? Math.max(0, st.wants('rails') - rack.rails) : 0)
      : 0;
  if (!job.rung.depot || job.rung.trains || !st || st.spec.rack !== 'cart') return 'off';
  if (pending > 0 || (cart.leg === 'drop' && cargo > 0)) return 'unloading';
  if (missing === 0 && cargo === 0) return 'done';
  if (cart.leg === 'forge' && cart.auto && railsOwed() > 0 && depotRails.stock() === 0) return 'waiting';
  if (cart.leg === 'load' || cart.leg === 'forge' || cart.leg === 'rest') return 'loading';
  return 'travelling';
}
const SERVICE = {
  off: ['', ''],
  loading: ['Loading', '#ffd26e'],
  travelling: ['On the way', '#8edbff'],
  unloading: ['Unloading', '#ffd26e'],
  waiting: ['Waiting for forge', '#ffb575'],
  done: ['Delivered', '#b3e5ac'],
} as const;
const car: Car = makeCar({ hx: CART.hx, hz: CART.hz, top: CART.top }, cartLook, () => stepCart(FIXED), {});
car.speedLimit = CART.speed * 1.5;
export const cartPlatform = car.platform;
let nudge = 0;
const here = new THREE.Vector3();
function drawLoad(n: number) {
  n = Math.max(0, Math.min(cartLogs.instanceMatrix.count, n));
  cartLogs.count = n;
  cartLogs.visible = n > 0;
  for (let k = 0; k < n; k++) {
    const row = Math.floor(k / 4),
      c = k % 4;
    setStackLog(cartLogs, k, here.set((c - 1.5) * 0.3, CART.top + 0.15 + row * 0.27, 0), Math.PI / 2);
  }
  cartLogs.instanceMatrix.needsUpdate = true;
  if (cartLogs.instanceColor) cartLogs.instanceColor.needsUpdate = true;
  cartRailsMesh.count = Math.max(0, Math.min(cartRailsMesh.instanceMatrix.count, cart.rails));
  for (let k = 0; k < cartRailsMesh.count; k++) {
    here.set(((k % 8) - 3.5) * 0.16, CART.top + 0.3 + Math.ceil(n / 4) * 0.27 + Math.floor(k / 8) * 0.18, 0);
    cartRailsMesh.setMatrixAt(k, m4.compose(here, new THREE.Quaternion(), one));
  }
  cartRailsMesh.instanceMatrix.needsUpdate = true;
  // Mixed cargo is solid in solo as well as co-op.
  if (COOP || cart.rails > 0 || car.platform.top !== car.hy) {
    const cargoTop = cart.rails
      ? 0.38 + Math.ceil(n / 4) * 0.27 + Math.floor((cart.rails - 1) / 8) * 0.18
      : n
        ? 0.3 + Math.floor((n - 1) / 4) * 0.27
        : 0;
    const top = car.hy + cargoTop;
    const rider = carry.on === car.platform ? me.body : null;
    if (rider && rider.velocity.y - carry.y <= CARRY.leaveVy) {
      const p = rider.position;
      teleport(rider, p.x, p.y + top - car.platform.top, p.z);
    }
    car.platform.top = top;
    setShapes(car.body, [
      { kind: 'box', hx: CART.hx, hy: car.hy + cargoTop / 2, hz: CART.hz, offset: { x: 0, y: cargoTop / 2, z: 0 } },
    ]);
  }
}
function stepCart(dt: number) {
  depotRide.update();
  if (!job.rung.depot) return;
  // Only return once the last physical piece has landed, including a full mixed load.
  if (cart.recallQueued && !cartHasDelivery()) {
    callCart();
  }
  const cruise = cart.boost && cart.manual ? CART_RIDE_SPEED : CART.speed;
  car.speedLimit = Math.max(CART.speed, cart.speed, cruise) * 1.5;
  const correction = Math.max(-1.5 * dt, Math.min(1.5 * dt, nudge));
  cart.d += correction;
  nudge -= correction;
  const st = activeStation();
  const owed = st?.spec.rack === 'cart' ? st.wants('logs') - rack.logs - pendingLogs - cart.load : 0;
  const railJob = automaticRails() && railsOwed() > 0;
  switch (cart.leg) {
    case 'rest':
      if ((owed > 0 || railJob || cart.called) && !job.rung.trains) {
        cart.leg = 'load';
        cart.t = 0;
      }
      break;
    case 'load':
      cart.t += dt;
      if (cart.t >= 1 && !cart.load) {
        const n = Math.min(CART.load, Math.max(0, st ? st.wants('logs') - rack.logs : 0));
        cart.load = n;
        if (!n && !railJob && !cart.called) {
          cart.leg = 'rest';
          break;
        }
        drawLoad(n);
        clank(car.x, car.z);
      }
      if (cart.t >= CART.loadS) {
        if (railJob && !cart.called) cart.called = cart.auto = true;
        cart.leg = 'out';
      }
      break;
    case 'out': {
      // A snapshot nudge may cross the stop by centimetres; a called outbound cart still owes the forge stop.
      const to = cart.called ? FORGE_D : st ? stopFor(st) : cart.d;
      cart.speed = Math.min(cruise, cart.speed + 3 * dt);
      cart.d = Math.min(to, cart.d + cart.speed * dt);
      if (cart.d >= to - 0.02) {
        cart.leg = cart.called && to === FORGE_D ? 'forge' : 'drop';
        cart.t = 0;
        cart.speed = 0;
      }
      break;
    }
    case 'forge':
      if (cart.auto && automaticRails() && railsOwed() > 0 && cart.rails < CART.rails) {
        depotRails.load();
        if (railsOwed() > 0 && cart.rails < CART.rails) {
          cart.t = 0; // Actual forge stock is the limit, including when it is completely dry.
          break;
        }
      }
      cart.t += dt;
      if (cart.t >= (cart.rails > 0 ? CART.leaveS : CART.forgeS)) {
        cart.called = false;
        cart.auto = false;
        cart.leg = 'out';
      }
      break;
    case 'drop':
      cart.t += dt;
      if (cart.t > 0.5 && (cart.load > 0 || cart.rails > 0) && rack.on) {
        const n = cart.load;
        const rails = cart.rails;
        const generation = dropGeneration,
          firstLog = rack.logs + pendingLogs,
          firstRail = rack.rails + pendingRails;
        pendingLogs += n;
        pendingRails += rails;
        cart.load = 0;
        cart.rails = 0;
        cart.manual = cart.boost = false;
        drawLoad(0);
        here.set(car.x, car.y + 1, car.z);
        // They heave them over, in a stream, and they land on the rack.
        for (let k = 0; k < n; k++)
          send('log', here, logAt(firstLog + k, new THREE.Vector3()), {
            dur: 0.45,
            delay: k * 0.06,
            apex: 1.1,
            size: [1.6, 2.2],
            land: () => {
              if (generation !== dropGeneration) return;
              if (takenLogs > 0) {
                takenLogs--;
                return;
              }
              pendingLogs--;
              rackAdd(1, 0);
              if (k % 3 === 0) pop(Math.min(7, k / 3), 0.35);
              if (k === n - 1) {
                thump(rack.x, rack.z);
                dustRing(rack.x, rack.y + 0.3, rack.z, 8, 2, 0.3);
              }
            },
          });
        for (let k = 0; k < rails; k++)
          send('rail', here, railAt(firstRail + k, new THREE.Vector3()), {
            dur: 0.45,
            delay: (n + k) * 0.06,
            apex: 1.1,
            land: () => {
              if (generation !== dropGeneration) return;
              if (takenRails > 0) {
                takenRails--;
                return;
              }
              pendingRails--;
              rackAdd(0, 1);
            },
          });
      }
      if (cart.t > 2.2 && (!cart.recallQueued || pendingLogs + pendingRails === 0)) cart.leg = 'back';
      break;
    case 'back':
      cart.speed = Math.min(cruise, cart.speed + 3 * dt);
      cart.d = Math.max(cart.called ? FORGE_D : 0, cart.d - cart.speed * dt);
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
// Listen to travel in the existing presentation loop, never schedule a backlog from physics ticks or a snapshot jump.
let heardD: number | null = null,
  rollDistance = 0,
  pushDistance = 0,
  wasMoving = false;
onFrame(
  ({ dt }) => {
    drawCar(car, stepAlpha());
    const status = deliveryStatus();
    serviceTag.sprite.visible = rack.on && status !== 'off';
    const [title, color] = SERVICE[status];
    serviceTag.set(
      title,
      status === 'done' ? (rack.logs + rack.rails > 0 ? 'Ready on the rack' : 'Service complete') : 'More coming',
      color,
    );
    const first = heardD === null;
    const distance = first ? 0 : Math.abs(cart.d - heardD!);
    heardD = cart.d;
    const moving =
      job.rung.depot && !job.rung.trains && (cart.leg === 'out' || cart.leg === 'back') && cart.speed > 0.05;
    if (first || distance > CART.speed * Math.max(dt, 1 / 60) * 3) {
      rollDistance = pushDistance = 0;
      wasMoving = moving;
      return;
    }
    if (moving) {
      rollDistance += distance;
      pushDistance += distance;
      if (rollDistance >= 2.4) {
        placeSound('cartRoll', car.x, car.z);
        rollDistance = 0;
      }
      if (!wasMoving || pushDistance >= 9) {
        placeSound('cartPush', car.x, car.z);
        pushDistance = 0;
      }
    } else {
      if (wasMoving) placeSound('cartStop', car.x, car.z);
      rollDistance = pushDistance = 0;
    }
    wasMoving = moving;
  },
  { phase: 'update', order: 6 },
);
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
    cart.recallQueued = false;
    cart.auto = false;
    cart.manual = cart.boost = false;
    dropGeneration++;
    pendingLogs = pendingRails = takenLogs = takenRails = 0;
    drawLoad(0);
    return;
  }
  poseOnRoad(car, cart.d);
  drawLoad(cart.load);
}
// Current save/snapshot fields. Readers still bound untrusted values.
export type DepotSave = {
  logs: number;
  rails: number;
  d: number;
  leg: Leg;
  t: number;
  load: number;
  cartRails: number;
  called: boolean;
  recallQueued: boolean;
  speed: number;
  auto: boolean;
  manual: boolean;
  boost: boolean;
};
function readCart(v: unknown) {
  const j = (v ?? {}) as Partial<DepotSave>;
  return {
    d: num(j.d) ? Math.max(0, Math.min(L1_FROM + L2.spec.line.len, j.d)) : 0,
    leg: Object.values(leg).includes(j.leg as Leg) ? j.leg! : ('rest' as Leg),
    t: num(j.t) ? Math.max(0, j.t) : 0,
    load: count(j.load, CART.load) ? j.load : 0,
    rails: count(j.cartRails, CART.rails) ? j.cartRails : 0,
    called: j.called === true,
    recallQueued: j.recallQueued === true,
    auto: j.auto === true && j.called === true,
    manual: j.manual === true && count(j.cartRails, CART.rails) && j.cartRails > 0,
    boost: j.boost === true && j.manual === true && count(j.cartRails, CART.rails) && j.cartRails > 0,
    speed: num(j.speed) ? Math.max(0, Math.min(CART_RIDE_SPEED, j.speed)) : 0,
  };
}
/** A follower's cart must follow the authority even when no inventory count changes. */
export function reconcileCart(v: unknown) {
  if (!v || typeof v !== 'object' || !num((v as Partial<DepotSave>).d)) return;
  const next = readCart(v),
    d = next.d;
  // Only motion here. Replaying an older cargo/leg snapshot just after local unloading would deliver it twice.
  // Reliable call/load events and the existing settled-inventory reconciliation own those transitions.
  cart.speed = next.speed;
  cart.boost = next.boost;
  if (cart.leg === next.leg) cart.t = next.t;
  nudge = d - cart.d;
  if (Math.abs(nudge) > 8) {
    cart.d = d;
    nudge = 0;
    poseOnRoad(car, cart.d);
    snapCar(car);
  }
}
sharedSlice('depot', {
  get: () => ({
    // A correcting snapshot settles cargo already in flight, just as the frame's have+coming does.
    logs: rack.logs + pendingLogs,
    rails: rack.rails + pendingRails,
    d: +cart.d.toFixed(1),
    leg: cart.leg,
    t: cart.t,
    load: cart.load,
    cartRails: cart.rails,
    called: cart.called,
    recallQueued: cart.recallQueued,
    auto: cart.auto,
    manual: cart.manual,
    boost: cart.boost,
    speed: cart.speed,
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
    dropGeneration++;
    pendingLogs = pendingRails = takenLogs = takenRails = 0;
    Object.assign(cart, readCart(v));
    nudge = 0;
    drawLoad(cart.load);
    drawRack();
  },
});
