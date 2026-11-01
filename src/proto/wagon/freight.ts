// The rail takes over (docs/research/carrying-and-logistics-play.md, rec 7): helper-hut freight arrives by wagon. When
// a helper hut has been built and the wagon runs, the freight that lands in the open site's Track ring shows up as
// crates hopping off the rear flatbed into the ring, with a puff of dust, at the stop nearest that ring. Serves DESIGN.md 1
// (Toys before chores): you watch the railway do the hauling instead of reading a counter.
//
// Local and cosmetic: the freight itself is lockstep (src/sim/sites.ts `helperFreight`, every HELPER_EVERY ticks) and
// nothing here changes when or how much lands. The hop is timed to that tick when the wagon is standing at the stop
// then (the crate is launched a flight early so it lands on the tick). Freight that lands while the wagon is elsewhere
// rides with it and hops off at its next stand at that stop (the count has already gone up: only the show waits).
// Without a running wagon, or with no stop near the ring, nothing changes: the pile just grows as before.
import * as THREE from 'three/webgpu';
import { rules } from '../../world/game-world.ts';
import { onFrame } from '../../loop.ts';
import { scene } from '../../render/scene.ts';
import { emit } from '../../render/particles.ts';
import { world, TICK_MS } from '../../world/sync.ts';
import { sharedSeconds } from '../../netplay/shared-time.ts';
import { groundHeight } from '../../adapters/terrain.ts';
import { reducedMotion } from '../../constants.ts';
import { ROUTE, TRACK, RING_R, ringAt } from '../../sim/route.ts';
import { HELPER_EVERY } from '../../sim/sites.ts';
import { CRATES, TRAILER } from './look.ts';

const TPS = 1000 / TICK_MS;
const HOP = {
  flight: 0.6, // s in the air, flatbed to ring
  apex: 1.4, // m the arc rises over the higher end
  stagger: 0.18, // s between crates of one drop
  max: 4, // crates per drop, however much freight it stands for
  settle: 0.45, // s a landed crate squashes and sinks into the pile
  near: 9, // m: a stop this close to the ring serves it
  waitS: 0.8, // s after the wagon stands before carried freight hops off
};

/** What ./index.ts lends this module: the rear flatbed and the timetable as drawn. */
export type FreightWagon = {
  rear: { rock: THREE.Object3D; dipV: number };
  laid: () => number;
  /** The stop the drawn wagon stands at `ahead` ticks from now, or -1 (moving, or no wagon). */
  standing: (ahead: number) => number;
};

const crateMat = new THREE.MeshStandardNodeMaterial({ color: '#c08a4a', roughness: 0.85 });
const crateGeo = new THREE.BoxGeometry(1, 1, 1);
const dust = new THREE.Color('#d8c49a');
type Hop = {
  mesh: THREE.Mesh;
  t: number; // s since launch (negative: waiting its turn)
  from: THREE.Vector3;
  to: THREE.Vector3;
  spin: THREE.Vector3;
  landed: boolean;
};
const hops: Hop[] = [];
const pool: THREE.Mesh[] = [];
const log: { tick: number; n: number; late: boolean }[] = []; // drops so far, for the look evals

// The stop of a run on `laid` sections nearest the open site's Track ring, if one is near enough to serve it.
function stopFor(laid: number, open: number): number {
  if (!laid || open >= ROUTE.length) return -1;
  const r = ringAt(open, TRACK);
  let best = -1,
    bestD = HOP.near;
  for (let k = 0; k <= laid; k++) {
    const p = k < laid ? { x: ROUTE[k].x, z: ROUTE[k].z } : { x: ROUTE[laid - 1].to[0], z: ROUTE[laid - 1].to[1] };
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    if (d < bestD) {
      best = k;
      bestD = d;
    }
  }
  return best;
}

// The crates land silently for now (their thump was cut in the sound audit, 2026-11-02); a better one comes later.

// Throws `n` crates off the rear flatbed into the open site's Track ring; the first lands `lead` s from now.
function drop(w: FreightWagon, open: number, n: number, lead: number, late: boolean) {
  const r = ringAt(open, TRACK);
  log.push({ tick: world.tick, n, late });
  for (let k = 0; k < Math.min(n, HOP.max); k++) {
    const c = CRATES[k % CRATES.length];
    const mesh = pool.pop() ?? new THREE.Mesh(crateGeo, crateMat);
    mesh.castShadow = true;
    mesh.scale.setScalar(c.sz);
    mesh.visible = false;
    scene.add(mesh);
    // From the top of the load (the stack's crate first), into the ring a little off its middle.
    const from = new THREE.Vector3(c.x, TRAILER.top + c.base + c.sz * 1.5, c.z);
    w.rear.rock.localToWorld(from);
    const a = Math.random() * Math.PI * 2,
      rr = Math.random() * RING_R * 0.45;
    const tx = r.x + Math.cos(a) * rr,
      tz = r.z + Math.sin(a) * rr;
    const to = new THREE.Vector3(tx, groundHeight(tx, tz) + c.sz / 2, tz);
    const spin = new THREE.Vector3((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 6);
    hops.push({ mesh, t: HOP.flight - lead - k * HOP.stagger, from, to, spin, landed: false });
  }
}

export function wagonFreight(w: FreightWagon): void {
  const { sites } = rules.sites;
  let launchedFor = -1, // the freight tick whose crates are already in the air
    owed = 0, // pieces landed while the wagon was away, still to hop off
    owedFor = -1, // the open site they were for
    lastFreight = -1,
    lastTick = -1,
    standSince = -1; // the frame time the wagon began standing at the serving stop
  onFrame(
    ({ dt, now }) => {
      const open = sites.open;
      const site = sites.list[open];
      const laid = w.laid();
      const stop = site ? stopFor(laid, open) : -1;
      if (owedFor !== open) {
        owed = 0;
        owedFor = open;
      }
      // Freight landed since the last frame (only a helper tick's: tune.fill is the tester's shortcut, not a delivery).
      const freight = site ? site.freight : -1;
      if (lastFreight >= 0 && freight > lastFreight && world.tick >= lastTick) {
        const T = Math.floor(world.tick / HELPER_EVERY) * HELPER_EVERY;
        const helperTick = T > lastTick && freight - lastFreight <= rules.sites.helpers();
        if (helperTick && T !== launchedFor && stop >= 0) owed = Math.min(owed + freight - lastFreight, HOP.max);
      }
      lastFreight = freight;
      lastTick = world.tick;
      if (stop >= 0) {
        // On time: the wagon stands at the stop on the next freight tick, so launch now and land on it.
        const tick = sharedSeconds() * TPS;
        const T = Math.ceil(tick / HELPER_EVERY) * HELPER_EVERY;
        const ahead = T - tick;
        const coming =
          rules.sites.helpers() > 0 && site.t0 < 0 && !rules.sites.isDone(open) && rules.sites.room(open, TRACK) > 0;
        if (
          coming &&
          T !== launchedFor &&
          ahead > 1 && // a tenth of a second at least, or it would appear in the ring
          ahead <= HOP.flight * TPS &&
          w.standing(0) === stop &&
          w.standing(ahead) === stop
        ) {
          launchedFor = T;
          drop(w, open, Math.min(rules.sites.helpers(), rules.sites.room(open, TRACK)), ahead / TPS, false);
        }
        // Late: what landed while it was away hops off once it has stood there a moment.
        if (w.standing(0) === stop) {
          if (standSince < 0) standSince = now;
          if (owed > 0 && now - standSince > HOP.waitS * 1000 && w.standing(HOP.flight * TPS * 2) === stop) {
            drop(w, open, owed, HOP.flight, true);
            owed = 0;
          }
        } else standSince = -1;
      } else standSince = -1;

      for (let k = hops.length - 1; k >= 0; k--) {
        const h = hops[k];
        h.t += dt;
        const m = h.mesh;
        if (h.t < 0) continue;
        if (!m.visible) w.rear.dipV += 1.2; // the flatbed lifts as it lets go
        m.visible = true;
        const u = Math.min(1, h.t / HOP.flight);
        if (u < 1) {
          const top = Math.max(h.from.y, h.to.y) + HOP.apex;
          // a parabola through from, top (at its apex) and to
          const y0 = h.from.y,
            y1 = h.to.y;
          const b = 2 * (top - y0) + 2 * Math.sqrt(Math.max(0, (top - y0) * (top - y1)));
          m.position.lerpVectors(h.from, h.to, u);
          m.position.y = y0 + b * u - (b - (y1 - y0)) * u * u;
          m.rotation.set(h.spin.x * h.t, h.spin.y * h.t, h.spin.z * h.t);
          continue;
        }
        if (!h.landed) {
          h.landed = true;
          m.position.copy(h.to);
          m.rotation.set(0, h.spin.y * HOP.flight, 0);
          const base = h.to.y - m.scale.y / 2;
          for (let n = 0; n < (reducedMotion ? 4 : 12); n++) {
            const a = (n / 12) * Math.PI * 2 + Math.random() * 0.4,
              sp = 1.2 + Math.random() * 1.4;
            emit({
              x: h.to.x + Math.cos(a) * 0.35,
              y: base + 0.08,
              z: h.to.z + Math.sin(a) * 0.35,
              vx: Math.cos(a) * sp,
              vy: 0.4 + Math.random() * 0.8,
              vz: Math.sin(a) * sp,
              life: 0.5 + Math.random() * 0.3,
              size: 0.22,
              color: dust,
              alpha: 0.8,
              drag: 3,
              grow: [1, 2.2],
              fade: 0.5,
            });
          }
        }
        // Land: squash, then sink into the pile (which already counts it).
        const s = (h.t - HOP.flight) / HOP.settle;
        const c = m.scale.x;
        const squash = reducedMotion ? 0 : 0.35 * Math.exp(-s * 6) * Math.cos(s * 14);
        const sink = Math.max(0, (s - 0.4) / 0.6);
        m.scale.y = c * (1 - squash) * (1 - sink);
        m.position.y = h.to.y - (c - m.scale.y) / 2;
        if (s >= 1) {
          m.visible = false;
          scene.remove(m);
          pool.push(m);
          hops.splice(k, 1);
        }
      }
    },
    { phase: 'update', order: 9 }, // after ./index.ts places the cars (6) and ./look.ts animates them (8)
  );
}

window.__freight = { HOP, log, hops };
