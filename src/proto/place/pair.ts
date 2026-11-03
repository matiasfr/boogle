// Optional co-op work and play. DESIGN.md 4 (Cooperation is automatic), 1 (Toys before chores), 11 (Show, don't tell).
// docs/plans/two-player.md; docs/research/shared-construction.md, rec 6. Local presentation, Owner grips,
// shared saved beam pose via the prototype's existing snapshots; only its authority sets the beam down at the site.
import * as THREE from 'three/webgpu';
import { INTERP_MS } from '../../constants.ts';
import { onFrame } from '../../loop.ts';
import { addPresenceField, onRemotePresence, remotes } from '../../netplay/net.ts';
import { input } from '../../player/input.ts';
import { registerInteractable } from '../../player/hands.ts';
import { me } from '../../player/player.ts';
import { scene } from '../../render/scene.ts';
import { thump, whistle } from '../../render/machine-sfx.ts';
import { flat } from '../flat.ts';
import { back } from './chop.ts';
import { coop, pairHook } from './coop.ts';
import { callCart, cart, cartHere, loadCart, rack } from './depot.ts';
import { forge, rackTop, takeRail } from './forge.ts';
import { COOP, count, job, num, save } from './job.ts';
import { CART, ORIGIN } from './layout.ts';
import { TX, TY, TZ } from './lines.ts';
import { dustRing, send } from './pieces.ts';
import { activeFrame } from './run.ts';
import { H } from './terrain.ts';

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
export function beamEnd(end: End) {
  const b = job.longBeam,
    d = ((end === 0 ? -1 : 1) * BEAM.len) / 2;
  return new THREE.Vector3(b.x + Math.sin(b.yaw) * d, H(b.x, b.z) + 0.25, b.z + Math.cos(b.yaw) * d);
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
const from = new THREE.Vector3();
if (COOP) {
  pairHook.msg = (m) => {
    if (m.k === 'cartCall') callCart();
    else if (m.k === 'cartLoad' && count(m.n, CART.rails)) loadCart(m.n);
    else if (m.k === 'beamSet' && num(m.x) && num(m.z) && num(m.yaw)) setBeam(m.yaw);
  };
  pairHook.busy = () => grip !== null || [...grips.keys()].some((peer) => fresh(peer, performance.now()));
  addPresenceField('placeLongBeam', () => grip);
  onRemotePresence((r, pr) => {
    const end = pr.placeLongBeam;
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
      beam.rotation.x = !b.set && !carrying && lifted ? (a ? 1 : -1) * Math.asin(BEAM.liftY / BEAM.len) : 0;
    },
    { phase: 'world', order: 15 },
  );
  registerInteractable(() => {
    const p = me.body?.interpolatedPosition;
    const st = activeFrame();
    if (!p || !job.rung.depot || job.rung.trains || st?.spec.rack !== 'cart' || Math.hypot(p.x - TX, p.z - TZ) > 5)
      return [];
    const need = st.wants('rails') - rack.rails - cart.rails;
    if (need <= 0) return [];
    const n = Math.min(need, CART.rails - cart.rails, forge.rails);
    if (cart.leg === 'forge' && n > 0)
      return [
        {
          id: 'place-cart-load',
          verb: 'Load the cart',
          at,
          run: () => {
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
            loadCart(n);
            coop.took('rails', n);
            coop.send({ k: 'cartLoad', n });
          },
        },
      ];
    if (!cart.called)
      return [
        {
          id: 'place-cart-call',
          verb: 'Whistle for the cart',
          at,
          run: () => {
            whistle(TX, TZ);
            callCart();
            coop.send({ k: 'cartCall' });
          },
        },
      ];
    return [];
  });
}
