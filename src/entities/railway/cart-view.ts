// The depot cart's Local view (docs/plans/line2-part2-greybox.md, B3): the cart on its road, drawn from accepted state
// and this tab's estimate of the server's tick (./../../sim/railway-cart.ts cartAlong), so it is where the server has
// it on every tab and you can ride it (an Owner-kind moving platform; riders on other tabs are drawn on their own
// copy, `shared`). Its load, the logs and rails heaved onto the rack and shelf when it unloads, the rack's tag
// (Loading, On the way, Unloading, Waiting for forge) and the "Call cart to forge" handle by the turntable. Nothing
// here moves material: the transfers are the server's ticks, the call is the adapter's (predicted on the press).
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import { FIXED } from '../../constants.ts';
import { setShapes, stepAlpha, teleport } from '../../physics/engine.ts';
import { carry, CARRY } from '../../physics/platforms.ts';
import { me } from '../../player/player.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { CART, CART_CALL, CART_PHASE, CART_ROAD, cartAlong } from '../../sim/railway-cart.ts';

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
  /** Where line2-view stands the depot rack for stretch k (world metres, on the ground). */
  depotPlace: (k: number, out: THREE.Vector3) => THREE.Vector3,
) {
  const [layout, rail, pieces, land, flatMod, look, kit, props, common] = await Promise.all([
    import('../../proto/place/layout.ts'),
    import('../../proto/place/rail.ts'),
    import('../../proto/place/pieces.ts'),
    import('../../proto/place/land.ts'),
    import('../../proto/flat.ts'),
    import('../../proto/place/look.ts'),
    import('../../proto/place/look-kit.ts'),
    import('../../proto/place/prop-kit.ts'),
    import('../../proto/minis/common.ts'),
  ]);
  const { flat } = flatMod;
  const [north, east] = [layout.LINKS[0]!.line, layout.LINKS[1]!.line];
  const SIZE = layout.CART; // hx, hz, top: Place's cart
  const F = CART_ROAD.forgeCm / 100;
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
  let shown = false;
  function step() {
    const s = adapter.inspect();
    const l2 = s.line2;
    const on = s.ready && !!l2 && l2.completed >= 1;
    if (!on || !l2) {
      if (shown) {
        car.y = -60; // waits under the land: nothing to draw, nor to stand on
        shown = false;
      }
      return;
    }
    const target = adapter.tickNow();
    if (clock < 0 || Math.abs(target - clock) > 3) clock = target;
    else clock += FIXED * TICKS_PER_S + Math.max(-0.02, Math.min(0.02, (target - clock) * 0.05));
    const d = cartAlong(l2.cart, clock) / 100;
    if (d <= F) rail.poseCarOnLine(car, north, F - d, -1);
    else rail.poseCarOnLine(car, east, d - F, 1);
    if (!shown) {
      shown = true;
      rail.snapCar(car);
    }
  }

  // ---------------------------------------------------------------- the rack's tag
  const tag = common.label(6, 2);
  owner.add(tag.sprite);
  tag.sprite.visible = false;
  const rackAt = new THREE.Vector3();

  // ---------------------------------------------------------------- the call handle by the turntable (Place pair.ts)
  const handle = new THREE.Group();
  const postGeo = new THREE.BoxGeometry(0.45, 1.35, 0.45),
    gripGeo = new THREE.BoxGeometry(1.25, 0.3, 0.4);
  geometries.push(postGeo, gripGeo);
  const post = new THREE.Mesh(postGeo, flat('#5b5145'));
  post.position.y = 0.675;
  const grip = new THREE.Mesh(gripGeo, flat('#e6a33e'));
  grip.position.y = 1.5;
  post.castShadow = grip.castShadow = true;
  handle.add(post, grip);
  const callTag = common.label(5.4, 1.6);
  callTag.sprite.position.y = 3.8;
  handle.add(callTag.sprite);
  const callX = CART_CALL.x / 100,
    callZ = CART_CALL.z / 100;
  handle.position.set(callX, land.H(callX, callZ), callZ);
  handle.visible = false;
  owner.add(handle);
  const callAt = new THREE.Vector3(callX, handle.position.y + 1.5, callZ);

  // ---------------------------------------------------------------- unloads and the cart's sounds, from state
  let last: { phase: number; logs: number; rails: number } | null = null;
  let heard: { x: number; z: number } | null = null,
    roll = 0,
    push = 0,
    moving = false;
  /** Pieces in flight from the cart: the rack and shelf show them only once they land. */
  let flyingLogs = 0,
    flyingRails = 0;
  owner.cleanup(() => {
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
    tag.sprite.removeFromParent();
  });

  return {
    /** Logs and rails on their way from the cart to the rack and shelf (line2-view and shelf-view hold them back). */
    flying: () => ({ logs: flyingLogs, rails: flyingRails }),
    update() {
      const s = adapter.inspect();
      const l2 = s.line2;
      const on = s.ready && !!l2 && l2.completed >= 1;
      handle.visible = on && l2.served >= 0;
      if (!on || !l2) {
        tag.sprite.visible = false;
        return;
      }
      const c = l2.cart;
      drawLoad(c.logs, c.rails);
      // The unload: what was aboard is heaved onto the rack and shelf, in a stream.
      if (last && c.phase === CART_PHASE.DROP && last.phase !== CART_PHASE.DROP && last.logs + last.rails > 0) {
        const k = l2.active >= 0 ? l2.active : -1;
        if (k >= 0) {
          depotPlace(k, rackAt);
          const from = new THREE.Vector3(car.x, car.y + 1, car.z);
          const firstLog = Math.max(0, l2.depot - last.logs);
          flyingLogs += last.logs;
          for (let i = 0; i < last.logs; i++) {
            const to = pieces.stackSlot(firstLog + i, 4, rackAt, 0, new THREE.Vector3());
            pieces.send(
              'log',
              from,
              to,
              {
                dur: 0.55,
                delay: i * 0.06,
                apex: 1.6,
                size: [1.6, 2.2],
                land: () => {
                  flyingLogs = Math.max(0, flyingLogs - 1);
                  if (i % 3 === 0) common.pop(Math.min(7, i / 3), 0.35);
                  if (i === last!.logs - 1) thump(rackAt.x, rackAt.z);
                },
              },
              owner,
            );
          }
          flyingRails += last.rails;
          for (let i = 0; i < last.rails; i++)
            pieces.send(
              'rail',
              from,
              rackAt.clone().setY(rackAt.y + 0.8),
              {
                dur: 0.55,
                delay: (last.logs + i) * 0.06,
                apex: 1.4,
                land: () => {
                  flyingRails = Math.max(0, flyingRails - 1);
                },
              },
              owner,
            );
        }
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
      const [title, color] = SERVICE[l2.cartStatus];
      tag.sprite.visible = l2.cartStatus !== 'off' && l2.served >= 0;
      if (tag.sprite.visible) {
        depotPlace(l2.served, rackAt);
        tag.sprite.position.set(rackAt.x, rackAt.y + 3.4, rackAt.z);
        tag.set(title, 'More coming', color);
      }
      // Place's handle (pair.ts): it drops on the press; a call made while the cart is out with a load is served once it
      // has unloaded, on its way back.
      const called = c.recall;
      const after = called && (c.phase === CART_PHASE.RUN || c.phase === CART_PHASE.DROP);
      grip.position.y = called ? 1.25 : 1.5;
      callTag.set(
        after ? 'After unloading' : called ? 'Cart called' : 'Call cart to forge',
        after ? 'Then back to forge' : '',
        called ? '#8edbff' : '#ffd26e',
      );
    },
    targets(): Interactable[] {
      const s = adapter.inspect(),
        p = me.body?.position;
      if (!s.ready || !p || !handle.visible || s.line2.cart.recall) return [];
      if (Math.hypot(p.x - callX, p.z - callZ) > CART_CALL.reach / 100 - 0.3) return [];
      return [
        {
          id: 'railway-cart-call',
          verb: 'Call cart to forge',
          at: callAt,
          run: () => {
            if (adapter.callCart()) whistle(callX, callZ);
          },
        },
      ];
    },
    inspect: () => {
      const s = adapter.inspect();
      return {
        cart: {
          x: car.x,
          y: car.y,
          z: car.z,
          phase: s.line2.cart.phase,
          logs: s.line2.cart.logs,
          rails: s.line2.cart.rails,
          recall: s.line2.cart.recall,
          along: cartAlong(s.line2.cart, adapter.tickNow()),
          riding: carry.on === car.platform,
          status: s.line2.cartStatus,
        },
        cartCall: { x: callX, y: handle.position.y, z: callZ, shown: handle.visible },
      };
    },
  };
}
export type RailwayCart = Awaited<ReturnType<typeof createRailwayCart>>;
