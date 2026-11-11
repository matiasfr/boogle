// Optional co-op work and play. DESIGN.md 4 (Cooperation is automatic), 1 (Toys before chores), 11 (Show, don't tell).
// docs/plans/two-player.md; docs/research/shared-construction.md, rec 6. Local presentation, Owner grips,
// shared saved beam pose via the prototype's existing snapshots; only its authority sets the beam down at the site.
import * as THREE from 'three/webgpu';
import { INTERP_MS } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { input } from '../../player/input.ts';
import { removeBody, type Body } from '../../physics/engine.ts';
import { carry } from '../../physics/platforms.ts';
import { registerInteractable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { scene } from '../../render/scene.ts';
import { thump, whistle } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { flat } from '../../render/flat.ts';
import { pop } from '../../render/fanfare.ts';
import { label } from './label.ts';
import { shakeView } from './celebrate.ts';
import { back } from './chop.ts';
import { coop, pairHook } from './coop.ts';
import { currentCoopPeer } from './coop-identity.ts';
import { cart, cartHere, depotRails, depotRide, loadCart, onCart, railsOwed } from './depot.ts';
import { forge, rackTop, takeRail } from './forge.ts';
import { COOP, count, job, num, save } from './job.ts';
import { CART, ORIGIN } from './layout.ts';
import { TX, TY, TZ } from './lines.ts';
import { dustRing, send } from './pieces.ts';
import { H } from './terrain.ts';
import { addStatic } from './land.ts';

export const BEAM = {
  len: 9,
  from: { x: -132, z: -30 }, // clear of the museum added by the town track
  site: { x: -56, z: 6 },
  reach: 3,
  liftY: 0.9,
  holdY: 1,
  dropAt: 11,
  dropS: 1,
  setR: 5,
};
export const SEESAW = { padAt: 3.6, padR: 1.6, landV: 5, launchV: 15, tilt: 0.35, coolS: 0.5 };
type End = 0 | 1;
let grip: End | null = null;
const grips = new Map<string, { end: End; seen: number }>();
const fresh = (peer: string, now: number) => {
  const r = remotes.get(peer);
  return r?.visible && now - (grips.get(peer)?.seen ?? -Infinity) < 1500 ? r : null;
};
function holders(now: number) {
  const ends: ({ x: number; z: number } | null)[] = [null, null];
  for (const [peer, { end }] of [...grips].sort(([a], [b]) => a.localeCompare(b))) {
    const r = fresh(peer, now);
    const s = r?.snaps.sample(now - INTERP_MS);
    if (!s || ends[end]) continue;
    ends[end] = { x: s.a.p[0]! + (s.b.p[0]! - s.a.p[0]!) * s.u, z: s.a.p[2]! + (s.b.p[2]! - s.a.p[2]!) * s.u };
  }
  if (grip !== null && me.body) ends[grip] = me.body.position;
  return ends;
}
function beamPoint(end: End, distance: number) {
  const b = job.longBeam,
    d = (end === 0 ? -1 : 1) * distance;
  return new THREE.Vector3(b.x + Math.sin(b.yaw) * d, H(b.x, b.z) + 0.25, b.z + Math.cos(b.yaw) * d);
}
export const beamEnd = (end: End) => beamPoint(end, BEAM.len / 2);
export const beamPad = (end: End) => beamPoint(end, SEESAW.padAt);
function overPad(): End | null {
  const p = me.body?.position;
  if (!p) return null;
  for (const end of [0, 1] as const) {
    const at = beamPad(end);
    if (Math.hypot(p.x - at.x, p.z - at.z) <= SEESAW.padR) return end;
  }
  return null;
}
let tilt = 0,
  previousVy = 0,
  lastBounce = -Infinity;
function bounce(end: End, received: boolean) {
  if (!job.longBeam.set) return;
  tilt = end === 0 ? -SEESAW.tilt : SEESAW.tilt;
  placeSound('seesaw', job.longBeam.x, job.longBeam.z);
  const b = me.body;
  if (
    received &&
    b &&
    overPad() === 1 - end &&
    b.position.y - H(b.position.x, b.position.z) < 1.4 &&
    performance.now() - lastBounce >= SEESAW.coolS * 1000
  ) {
    b.velocity.y = SEESAW.launchV;
    lastBounce = performance.now();
    shakeView(0.1);
    pop(5);
  }
}
export const pair = { grip: () => grip, carrying: () => carried };
let carried = false,
  apart = 0;
const impact = () => {
  const b = job.longBeam;
  thump(b.x, b.z);
  dustRing(b.x, H(b.x, b.z) + 0.3, b.z, 12, 2, 0.3);
  save();
};
function setBeam(yaw: number) {
  const was = job.longBeam.set;
  Object.assign(job.longBeam, { x: ORIGIN.x + BEAM.site.x, z: BEAM.site.z, yaw, set: true });
  grip = null;
  carried = false;
  if (!was) impact();
}

const at = new THREE.Vector3(TX, TY + 2, TZ);
// Beside the turntable stop, leaving the cart's running line clear.
const callAt = new THREE.Vector3(TX - 2.8, H(TX - 2.8, TZ + 2.8) + 1.5, TZ + 2.8);
const callHandle = new THREE.Group();
callHandle.visible = false;
callHandle.position.set(callAt.x, callAt.y - 1.5, callAt.z);
const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.35, 0.45), flat('#5b5145'));
post.position.y = 0.675;
const gripBar = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 0.4), flat('#e6a33e'));
gripBar.position.y = 1.5;
callHandle.add(post, gripBar);
const callTag = label(5.4, 1.6);
callTag.sprite.position.y = 3.8;
callHandle.add(callTag.sprite);
scene.add(callHandle);
const from = new THREE.Vector3();
const cartLoadAmount = () => Math.max(0, Math.min(railsOwed(), CART.rails - cart.rails, forge.rails));
/** Both the porter and the little guys draw from the very same forge stock and load. */
function loadFromForge(manual = true) {
  const n = cartLoadAmount();
  if (!n) return;
  const here = cartHere();
  for (let k = 0; k < n; k++) {
    rackTop(forge.rails, from);
    takeRail();
    send('rail', from, new THREE.Vector3(here.x, TY + CART.top + 0.5, here.z), {
      dur: 0.45,
      delay: k * 0.06,
      apex: 1.1,
    });
  }
  loadCart(n, manual);
  coop.took('rails', n);
  coop.send({ k: 'cartLoad', n, manual });
}
depotRails.stock = () => forge.rails;
depotRails.load = () => {
  if (!coop.follower()) loadFromForge(false);
};
depotRide.update = () => {
  callHandle.visible = job.rung.depot && !job.rung.trains;
  const pending = coop.recallPending();
  const recalled = cart.called && !cart.auto;
  const acknowledged = pending || cart.recallQueued || recalled;
  gripBar.position.y = acknowledged ? 1.25 : 1.5;
  callTag.set(
    pending ? 'Call sent' : cart.recallQueued ? 'After unloading' : recalled ? 'Cart called' : 'Call cart to forge',
    cart.recallQueued ? 'Then back to forge' : '',
    acknowledged ? '#8edbff' : '#ffd26e',
  );
  if (coop.follower()) return;
  const boost = cart.manual && (onCart(carry.on) || coop.cartRider());
  if (boost === cart.boost) return;
  cart.boost = boost;
  coop.send({ k: 'cartRide', boost });
};
if (COOP) {
  pairHook.msg = (m) => {
    if (m.k === 'cartLoad' && count(m.n, CART.rails)) loadCart(m.n, m.manual === true);
    else if (m.k === 'cartRide' && typeof m.boost === 'boolean') cart.boost = m.boost;
    else if (m.k === 'beamSet' && num(m.x) && num(m.z) && num(m.yaw)) setBeam(m.yaw);
    else if (m.k === 'beamBounce' && (m.end === 0 || m.end === 1)) bounce(m.end, true);
  };
  pairHook.busy = () => grip !== null || [...grips.keys()].some((peer) => fresh(peer, performance.now()));
  addPresenceField('placeLongBeam', () => grip);
  onRemotePresence((r, pr) => {
    // Only participating Place peers hold this railway's optional beam.
    const end = currentCoopPeer(pr) ? pr.placeLongBeam : null;
    if (end === 0 || end === 1) grips.set(r.peer, { end, seen: performance.now() });
    else grips.delete(r.peer);
  });
  const root = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, BEAM.len), flat('#7a5430'));
  beam.castShadow = true;
  root.add(beam);
  const fulcrum = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.5, 0.85), flat('#5b5145'));
  root.add(fulcrum);
  scene.add(root);
  let solid: Body | null = null;
  registerInteractable(() => {
    if (grip !== null)
      return [
        {
          id: 'place-beam-release',
          verb: 'Let go',
          at: beamEnd(grip),
          run: () => {
            grip = null;
            impact();
          },
        },
      ];
    const p = me.body?.position;
    if (!p || !job.awake || job.longBeam.set || back.big) return [];
    const held = holders(performance.now());
    return ([0, 1] as const).flatMap((end) => {
      const at = beamEnd(end);
      return !held[end] && Math.hypot(p.x - at.x, p.z - at.z) <= BEAM.reach
        ? [
            {
              id: `place-beam-${end}`,
              verb: 'Lift',
              at,
              run: () => {
                grip = end;
              },
            },
          ]
        : [];
    });
  });
  onFrame(
    () => {
      if (grip === null) return;
      input.sprint = false;
      me.sprint = false; // intent has already read keyboard Shift as well as the pad/touch latch
    },
    { phase: 'prePhysics', order: -10 },
  );
  onFrame(
    ({ now, dt }) => {
      for (const peer of grips.keys()) if (!remotes.has(peer)) grips.delete(peer);
      const b = job.longBeam;
      if (b.set || !job.awake) grip = null;
      if (b.set && !solid) {
        // The neutral beam supports feet; its short tilt is cosmetic, never shared physics.
        solid = addStatic(
          { kind: 'box', hx: 0.25, hy: 0.25, hz: BEAM.len / 2 },
          { x: b.x, y: H(b.x, b.z) + 0.65, z: b.z },
          new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, b.yaw),
        );
      } else if (!b.set && solid) {
        removeBody(solid);
        solid = null;
      }
      const body = me.body,
        pad = overPad();
      if (
        b.set &&
        body &&
        pad !== null &&
        previousVy <= -SEESAW.landV &&
        Math.abs(body.velocity.y) < 1 &&
        now - lastBounce >= SEESAW.coolS * 1000
      ) {
        lastBounce = now;
        bounce(pad, false);
        coop.send({ k: 'beamBounce', end: pad });
      }
      previousVy = body?.velocity.y ?? 0;
      tilt *= Math.max(0, 1 - dt / 0.5);
      let [a, c] = holders(now);
      const both = !b.set && !!a && !!c;
      if (both) {
        const distance = Math.hypot(c!.x - a!.x, c!.z - a!.z);
        apart = distance > BEAM.dropAt ? apart + dt : 0;
        if (apart >= BEAM.dropS) {
          grip = null;
          a = c = null;
        } else {
          b.x = (a!.x + c!.x) / 2;
          b.z = (a!.z + c!.z) / 2;
          b.yaw = Math.atan2(c!.x - a!.x, c!.z - a!.z);
          if (!coop.follower() && Math.hypot(b.x - ORIGIN.x - BEAM.site.x, b.z - BEAM.site.z) <= BEAM.setR) {
            setBeam(b.yaw);
            coop.send({ k: 'beamSet', x: b.x, z: b.z, yaw: b.yaw });
          }
        }
      } else {
        apart = 0;
        if (grip !== null && me.body) {
          const far = beamEnd(grip === 0 ? 1 : 0),
            p = me.body.position;
          if (Math.hypot(p.x - far.x, p.z - far.z) > BEAM.len + 1.5) grip = null;
        }
      }
      const carrying = both && !!a && !!c && !b.set;
      if (carried && !carrying) impact(); // last midpoint survives either player's release or departure
      carried = carrying;
      root.visible = job.awake;
      root.position.set(b.x, H(b.x, b.z), b.z);
      root.rotation.y = b.yaw;
      fulcrum.visible = b.set;
      fulcrum.position.y = 0.25;
      const lifted = !b.set && (a || c);
      beam.position.y = b.set ? 0.65 : carrying ? BEAM.holdY : lifted ? 0.25 + BEAM.liftY / 2 : 0.25;
      beam.rotation.x = b.set ? tilt : !carrying && lifted ? (a ? 1 : -1) * Math.asin(BEAM.liftY / BEAM.len) : 0;
    },
    { phase: 'world', order: 15 },
  );
}
registerInteractable(() => {
  const p = me.body?.interpolatedPosition;
  if (!p || !job.rung.depot || job.rung.trains) return [];
  if (Math.hypot(p.x - TX, p.z - TZ) <= 5 && cart.leg === 'forge' && !cart.auto && cartLoadAmount() > 0)
    return [
      {
        id: 'place-cart-load',
        verb: 'Load the cart',
        at,
        run: () => loadFromForge(),
      },
    ];
  if (
    Math.hypot(p.x - callAt.x, p.z - callAt.z) <= 3 &&
    !cart.recallQueued &&
    !coop.recallPending() &&
    (!cart.called || cart.auto)
  )
    return [
      {
        id: 'place-cart-call',
        verb: 'Call cart to forge',
        at: callAt,
        run: () => {
          whistle(TX, TZ);
          coop.recallCart();
        },
      },
    ];
  return [];
});
