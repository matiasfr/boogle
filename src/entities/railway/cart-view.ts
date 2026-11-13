// The depot cart's Local view (docs/plans/line2-part2-greybox.md, B3): the cart on its road, drawn from accepted state
// and this tab's estimate of the server's tick (./../../sim/railway-cart.ts cartAlong), so it is where the server has
// it on every tab and you can ride it (an Owner-kind moving platform; riders on other tabs are drawn on their own
// copy, `shared`). Its load, the logs and rails heaved onto the rack and shelf when it unloads, the rack's tag
// (Loading, On the way, Unloading, Waiting for forge). Nothing here moves material: the transfers are the server's
// ticks. The "Call cart to forge" handle is cut (owner, 9 November; docs/decisions.md).
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { FIXED } from '../../constants.ts';
import { setShapes, stepAlpha, teleport } from '../../physics/engine.ts';
import { carry, CARRY } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { paintTwoLines, signBoard } from '../../render/sign-board.ts';
import { CART, CART_PHASE, CART_ROAD, cartAlong } from '../../sim/railway-cart.ts';
import type { Car } from './car.ts';
import { playMark } from '../../proto/mark.ts';
import {
  line2Active,
  line2CartStatus,
  line2Completed,
  line2Served,
  line2Trains,
} from '../../sim/railway-queries-line2.ts';
import { cart as cartRow, rail as railRow, type ReadWorld } from '../../sim/railway-rows.ts';

/** The cart is out on its road: line 2's first stretch is laid, and it is not parked while trains run. */
const cartOn = (w: ReadWorld, ready: boolean) =>
  ready && line2Completed(w) >= 1 && !(line2Trains(w) && cartRow(w).phase === CART_PHASE.REST);

/** Place's depot service tag (depot.ts SERVICE). */
const SERVICE = {
  off: ['', ''],
  loading: ['Loading', '#ffd26e'],
  travelling: ['On the way', '#8edbff'],
  unloading: ['Unloading', '#ffd26e'],
  waiting: ['Waiting for forge', '#ffb575'],
} as const;
const TICKS_PER_S = 10;

export async function createRailwayCart(
  adapter: RailwayAdapter,
  owner: OwnedView,
  /** Where line2-view stands the depot's log bed for stretch k (world metres). */
  depotPlace: (k: number, out: THREE.Vector3) => THREE.Vector3,
  depotYaw: (k: number) => number,
  depotSlot: (k: number, n: number, out: THREE.Vector3) => THREE.Vector3,
  shelfSlot: (k: number, n: number, out: THREE.Vector3) => THREE.Vector3,
) {
  const [layout, home, rail, pieces, flatMod, look, kit, props, common] = await Promise.all([
    import('../../place/layout.ts'),
    import('../../place/home-station.ts'),
    import('./rail-kit.ts'),
    import('../../place/pieces.ts'),
    import('../../render/flat.ts'),
    import('../../place/look.ts'),
    import('../../place/look-kit.ts'),
    import('../../render/prop-kit.ts'),
    import('../../render/fanfare.ts'),
  ]);
  const { flat } = flatMod;
  const [north, east] = [layout.LINKS[0]!.line, layout.LINKS[1]!.line];
  const SIZE = layout.CART; // hx, hz, top: Place's cart
  const F = CART_ROAD.forgeCm / 100;
  // `?home=b` (docs/plans/home-flip.md, F2): the cart runs layout B's road (line 1, the leg, road 2 to the buffers and
  // back out along it). The rules still count today's 196 m to the forge, so the way in is scaled until the flip.
  const homeB = home.homeLayout();
  const roads = { north, east };
  const roadY = { north: (s: number) => layout.railY(north, s), east: (s: number) => layout.railY(east, s) };
  /** The car on layout B's road at the rules' distance `d`. It reverses at the forge stop without turning: its nose
   * points the way in on both sides of the stop. */
  function poseOnRoadB(c: Car, d: number) {
    const at = home.cartRoadFrom(d, F),
      stop = home.CART_FORGE,
      inward = at <= stop,
      sign = inward ? 1 : -1;
    const lo = inward ? Math.max(0, at - 1.1) : Math.max(stop, at - 1.1),
      hi = inward ? Math.min(stop, at + 1.1) : at + 1.1;
    const p = home.cartRoadAt(lo, roads),
      q = home.cartRoadAt(hi, roads),
      mid = home.cartRoadAt(at, roads);
    c.x = mid.x + layout.ORIGIN.x;
    c.z = mid.z + layout.ORIGIN.z;
    c.yaw = Math.atan2((q.x - p.x) * sign, (q.z - p.z) * sign);
    const yp = home.cartRoadY(lo, roadY),
      yq = home.cartRoadY(hi, roadY);
    c.y = (yp + yq) / 2 + rail.BOTTOM + c.hy;
    c.pitch = Math.atan2((yq - yp) * sign, hi - lo || 1);
  }
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // ---------------------------------------------------------------- the cart and its load
  const cartLook = new THREE.Group();
  cartLook.add(props.makeProp('cart'));
  const logs = pieces.logStackMesh(CART.load, owner);
  logs.removeFromParent();
  cartLook.add(logs);
  logs.count = 0;
  const railsMesh = look.LOOK.kit
    ? kit.kitBatch('rail', look.STEEL, CART.rails, owner)
    : new THREE.InstancedMesh(
        new THREE.BoxGeometry(pieces.RAIL_SIZE.x, pieces.RAIL_SIZE.y, pieces.RAIL_SIZE.z),
        flat('#4c5058', 0.6),
        CART.rails,
      );
  railsMesh.removeFromParent();
  railsMesh.castShadow = true;
  railsMesh.frustumCulled = false;
  railsMesh.count = 0;
  cartLook.add(railsMesh);
  const car = rail.makeCar({ hx: SIZE.hx, hz: SIZE.hz, top: SIZE.top }, cartLook, () => step(), {}, owner);
  car.speedLimit = (CART.speed / 100) * TICKS_PER_S * 1.5; // m/s: cruise and a little reconciliation
  car.platform.id = 'railway:cart';
  car.platform.shared = true;
  owner.animate(() => rail.drawCar(car, stepAlpha()), 7);

  const tmp = new THREE.Vector3(),
    m4 = new THREE.Matrix4(),
    q0 = new THREE.Quaternion(),
    one = new THREE.Vector3(1, 1, 1);
  let drawnLoad = '';
  /** The cargo aboard (Place depot.ts drawLoad): logs four across, rails on top; a solid top you can stand on. */
  function drawLoad(nLogs: number, nRails: number) {
    const key = `${nLogs}:${nRails}`;
    if (key === drawnLoad) return;
    drawnLoad = key;
    logs.count = Math.min(CART.load, nLogs);
    logs.visible = logs.count > 0;
    for (let k = 0; k < logs.count; k++)
      pieces.setStackLog(
        logs,
        k,
        tmp.set(((k % 4) - 1.5) * 0.3, SIZE.top + 0.15 + Math.floor(k / 4) * 0.27, 0),
        Math.PI / 2,
      );
    logs.instanceMatrix.needsUpdate = true;
    if (logs.instanceColor) logs.instanceColor.needsUpdate = true;
    railsMesh.count = Math.min(CART.rails, nRails);
    for (let k = 0; k < railsMesh.count; k++) {
      tmp.set(((k % 8) - 3.5) * 0.16, SIZE.top + 0.3 + Math.ceil(logs.count / 4) * 0.27 + Math.floor(k / 8) * 0.18, 0);
      railsMesh.setMatrixAt(k, m4.compose(tmp, q0, one));
    }
    railsMesh.instanceMatrix.needsUpdate = true;
    const cargoTop = railsMesh.count
      ? 0.38 + Math.ceil(logs.count / 4) * 0.27 + Math.floor((railsMesh.count - 1) / 8) * 0.18
      : logs.count
        ? 0.3 + Math.floor((logs.count - 1) / 4) * 0.27
        : 0;
    const top = car.hy + cargoTop;
    // A rider standing on the load stays on it as it grows or empties.
    const rider = carry.on === car.platform ? me.body : null;
    if (rider && rider.velocity.y - carry.y <= CARRY.leaveVy)
      teleport(rider, rider.position.x, rider.position.y + top - car.platform.top, rider.position.z);
    car.platform.top = top;
    setShapes(car.body, [
      { kind: 'box', hx: SIZE.hx, hy: car.hy + cargoTop / 2, hz: SIZE.hz, offset: { x: 0, y: cargoTop / 2, z: 0 } },
    ]);
  }

  // ---------------------------------------------------------------- the pose, every fixed step
  // A local clock in rule ticks that runs at the fixed step's rate and leans on the adapter's estimate, so the deck
  // moves the same amount every step (a rider is carried smoothly) and never drifts from the server's clock.
  let clock = -1;
  // The first whole state, latched (read.whole()): a full pending window or a dropped link must not hide the cart.
  let shown = false;
  function step() {
    const w = adapter.read.world();
    if (!cartOn(w, adapter.read.whole())) {
      if (shown) {
        car.y = -60; // waits under the land: nothing to draw, nor to stand on
        shown = false;
      }
      return;
    }
    const target = adapter.read.tickNow();
    if (clock < 0 || Math.abs(target - clock) > 3) clock = target;
    else clock += FIXED * TICKS_PER_S + Math.max(-0.02, Math.min(0.02, (target - clock) * 0.05));
    const d = cartAlong(cartRow(w), clock) / 100;
    if (homeB) poseOnRoadB(car, d);
    else if (d <= F) rail.poseCarOnLine(car, north, F - d, -1);
    else rail.poseCarOnLine(car, east, d - F, 1);
    if (!shown) {
      shown = true;
      rail.snapCar(car);
    }
  }

  // ---------------------------------------------------------------- the rack's tag
  // A painted board on its own post at the rack's other near corner, beside its stock board (stock-sign.ts), facing
  // the same way (owner, 9 November: signs in the world before hovering text).
  const tag = signBoard(owner, { w: 1.6, h: 0.7, px: 512, foot: 1.05, posts: 'one' });
  tag.mesh.visible = false;
  let tagText = '';
  const rackAt = new THREE.Vector3();

  // ---------------------------------------------------------------- unloads and the cart's sounds, from state
  let last: { phase: number; logs: number; rails: number } | null = null;
  let heard: { x: number; z: number } | null = null,
    roll = 0,
    push = 0,
    moving = false;
  /** Pieces in flight from the cart: the rack and shelf show them only once they land. */
  let flyingLogs = 0,
    flyingRails = 0;
  // Keep the waiting pieces on the cart until their individual flights launch. Collider stock still follows
  // accepted state immediately: this is only the load's Local drawing, never a delayed transfer or platform.
  let unloading: { elapsed: number; logs: number; rails: number } | null = null;
  const STAGGER = 0.045;
  owner.cleanup(() => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  });

  let riding = false;
  return {
    /** Logs and rails on their way from the cart to the rack and shelf (line2-view and shelf-view hold them back). */
    flying: () => ({ logs: flyingLogs, rails: flyingRails }),
    update(dt: number) {
      const w = adapter.read.world();
      const on = cartOn(w, adapter.read.whole());
      const aboard = on && carry.on === car.platform;
      if (aboard && !riding) playMark('cart ride', { authority: 'local' });
      riding = aboard;
      if (!on) {
        tag.mesh.visible = false;
        return;
      }
      const c = cartRow(w),
        stock = railRow(w),
        active = line2Active(w);
      if (unloading) unloading.elapsed += dt;
      // The unload: what was aboard is heaved onto the rack and shelf, in a stream.
      if (last && c.phase === CART_PHASE.DROP && last.phase !== CART_PHASE.DROP && last.logs + last.rails > 0) {
        const k = active;
        if (k >= 0) {
          depotPlace(k, rackAt);
          unloading = { elapsed: 0, logs: last.logs, rails: last.rails };
          cartLook.updateWorldMatrix(true, false);
          const firstLog = Math.max(0, stock.depot - last.logs);
          const deliveredLogs = last.logs;
          flyingLogs += last.logs;
          for (let i = 0; i < last.logs; i++) {
            const slot = last.logs - i - 1;
            const from = cartLook.localToWorld(
              new THREE.Vector3(((slot % 4) - 1.5) * 0.3, SIZE.top + 0.15 + Math.floor(slot / 4) * 0.27, 0),
            );
            const to = depotSlot(k, firstLog + i, new THREE.Vector3());
            pieces.send(
              'log',
              from,
              to,
              {
                dur: 0.55,
                delay: (last.rails + i) * STAGGER,
                apex: 1.6,
                size: [2.2, 2.2],
                land: () => {
                  flyingLogs = Math.max(0, flyingLogs - 1);
                  if (i % 3 === 0) common.pop(Math.min(7, i / 3), 0.35);
                  if (i === deliveredLogs - 1) thump(rackAt.x, rackAt.z);
                },
              },
              owner,
            );
          }
          flyingRails += last.rails;
          for (let i = 0; i < last.rails; i++) {
            const slot = last.rails - i - 1;
            const from = cartLook.localToWorld(
              new THREE.Vector3(
                ((slot % 8) - 3.5) * 0.16,
                SIZE.top + 0.3 + Math.ceil(last.logs / 4) * 0.27 + Math.floor(slot / 8) * 0.18,
                0,
              ),
            );
            pieces.send(
              'rail',
              from,
              shelfSlot(k, Math.max(0, stock.depotRails - last.rails) + i, new THREE.Vector3()),
              {
                dur: 0.55,
                delay: i * STAGGER,
                apex: 1.4,
                land: () => {
                  flyingRails = Math.max(0, flyingRails - 1);
                },
              },
              owner,
            );
          }
        }
      }
      drawLoad(c.logs, c.rails);
      if (unloading) {
        const launched = Math.floor(unloading.elapsed / STAGGER) + 1;
        // Lift the upper steel layer first, then the timber underneath: waiting cargo remains supported.
        logs.count = Math.max(c.logs, unloading.logs - Math.max(0, launched - unloading.rails));
        railsMesh.count = Math.max(c.rails, unloading.rails - launched);
        logs.visible = logs.count > 0;
        if (launched >= unloading.logs + unloading.rails) unloading = null;
      }
      if (last && c.phase === CART_PHASE.LOAD && last.phase !== CART_PHASE.LOAD) clank(car.x, car.z);
      last = { phase: c.phase, logs: c.logs, rails: c.rails };
      // Rolling and shoving, by the distance it actually travelled (Place depot.ts).
      const run = c.phase === CART_PHASE.OUT || c.phase === CART_PHASE.RUN || c.phase === CART_PHASE.BACK;
      const travelled = heard ? Math.hypot(car.x - heard.x, car.z - heard.z) : 0;
      heard = { x: car.x, z: car.z };
      const going = (run || c.phase === CART_PHASE.HOME) && travelled > 0.002;
      if (going && travelled < 2) {
        roll += travelled;
        push += travelled;
        if (roll >= 2.4) {
          placeSound('cartRoll', car.x, car.z);
          roll = 0;
        }
        if (!moving || push >= 9) {
          placeSound('cartPush', car.x, car.z);
          push = 0;
        }
      } else if (moving && !going) {
        placeSound('cartStop', car.x, car.z);
        roll = push = 0;
      }
      moving = going;
      // The rack's tag.
      const status = line2CartStatus(w),
        served = line2Served(w);
      const [title, color] = SERVICE[status];
      tag.mesh.visible = status !== 'off' && served >= 0;
      if (tag.mesh.visible) {
        const yaw = depotYaw(served);
        depotPlace(served, rackAt);
        tag.mesh.position.set(-1.2, 0, 1.65).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(rackAt);
        tag.mesh.position.y = rackAt.y - 0.16;
        tag.mesh.rotation.y = yaw + Math.PI / 2;
        if (tagText !== title) {
          tagText = title;
          paintTwoLines(tag, title, 'More coming', { ground: '#493522', ink: '#fff5dc', color, rim: '#edcf8c' });
          tag.painted();
        }
      }
    },
    inspect: () => {
      const w = adapter.read.world(),
        c = cartRow(w);
      return {
        cart: {
          x: car.x,
          y: car.y,
          z: car.z,
          phase: c.phase,
          logs: c.logs,
          rails: c.rails,
          along: cartAlong(c, adapter.read.tickNow()),
          riding: carry.on === car.platform,
          status: line2CartStatus(w),
        },
      };
    },
  };
}
export type RailwayCart = Awaited<ReturnType<typeof createRailwayCart>>;
