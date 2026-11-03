// Ultra Water src/water/Spray.js (30ea65e), adapted to the game's emit(), not a second particle pool.
// Local and cosmetic. DESIGN.md 11 (Show, don't tell): the water visibly stops against the surf rock.
// Research: docs/research/ultra-water.md, particle budget / reuse recommendation. Source notices:
// public/THIRD_PARTY_NOTICES.md. The CPU mirrors shore-nodes.ts and surface.ts's first shore-wave train.
import { Color } from 'three/webgpu';
import { defineKind, spawn, despawn } from '../../entity/entity.ts';
import { clamp, smoothstep } from '../../math.ts';
import { emit, type Particle } from '../particles.ts';
import { camera } from '../scene.ts';
import { seaRipples } from './state.ts';
import { SHORE_WAVE, uTime } from './shore-nodes.ts';
import { type ShoreAtlas, shoreProviders, shoreRevision } from './shore-providers.ts';
import { ULTRA } from './tuning.ts';
import { waterContacts, waterContactRevision } from './contacts.ts';
import { warmUp } from '../precompile.ts';

const TAU = Math.PI * 2;
const OMEGA = Math.sqrt((9.81 * TAU) / SHORE_WAVE.lambda) * SHORE_WAVE.speed;
const SWASH_TAU = 6.2831853; // SWASH_GLSL uses this literal, including in its frequency.
const SWASH_OMEGA = Math.sqrt((9.81 * SWASH_TAU) / SHORE_WAVE.lambda) * SHORE_WAVE.speed;
const DISTANCE = 350; // Spray.params.distance, metres; fade over the last 30%.
const MAX_PER_SECOND = 420,
  MAX_PER_FRAME = 96,
  ROCK_CLUSTER = 4; // droplets per rock site per crest
const BREAKER_SITES = 768,
  CROWN_DROPS = 32;
const f = Math.fround;
const fract = (x: number) => x - Math.floor(x);
const mix = (a: number, b: number, t: number) => f(f(a * f(1 - t)) + f(b * t));

// David Hoskins, Hash without Sine: p3 = fract(vec3(p.x,p.y,p.x)*.1031),
// p3 += dot(p3,p3.yzx+33.33), fract((p3.x+p3.y)*p3.z). Round intermediates as shader floats:
// doing this hash in JS doubles instead changes the shoreline's noise (and therefore the crest times).
function hash12(x: number, z: number) {
  let px = f(fract(f(f(x) * f(0.1031)))),
    pz = f(fract(f(f(z) * f(0.1031))));
  const d = f(f(f(px * f(pz + f(33.33))) + f(pz * f(px + f(33.33)))) + f(px * f(px + f(33.33))));
  const py = f(pz + d);
  px = f(px + d);
  pz = px;
  return fract(f(f(px + py) * pz));
}
function vnoise(x: number, z: number) {
  x = f(x);
  z = f(z);
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = f(x - ix),
    fz = f(z - iz);
  const ux = f(f(fx * fx) * f(f(fx * -2) + 3));
  const uz = f(f(fz * fz) * f(f(fz * -2) + 3));
  return mix(mix(hash12(ix, iz), hash12(ix + 1, iz), ux), mix(hash12(ix, iz + 1), hash12(ix + 1, iz + 1), ux), uz);
}
function shoreNoisePhase(x: number, z: number) {
  return f(
    f(vnoise(f(x * f(0.0042)), f(z * f(0.0042))) * 9) + f(vnoise(f(f(x * f(0.011)) + 7), f(f(z * f(0.011)) + 7)) * 2.5),
  );
}
function shoreGroup(x: number, z: number, t: number) {
  return f(f(vnoise(f(f(x * f(0.004)) + f(t * f(0.021))), f(f(z * f(0.004)) + f(t * f(-0.017)))) * f(0.55)) + f(0.45));
}

function site(atlas: ShoreAtlas, x: number, z: number, r1: number, r2: number) {
  x = f(x);
  z = f(z);
  const sample = atlas.sampleAt(x, z);
  const tr = (k: number) => sample.travel[k]!;
  const depth = -sample.bed,
    sdf = sample.distance,
    gx = sample.normal[0]!,
    gz = sample.normal[1]!,
    gl = Math.hypot(gx, gz);
  const tx = tr(1),
    tz = tr(2),
    tl = Math.hypot(tx, tz);
  const dx = tl > 0.5 ? tx / tl : -gx / Math.max(gl, 1e-3);
  const dz = tl > 0.5 ? tz / tl : -gz / Math.max(gl, 1e-3);
  const bearing = (ULTRA.swellBearing * Math.PI) / 180;
  const exposure = 0.25 + 0.75 * smoothstep(-0.3, 0.7, -dx * Math.cos(bearing) - dz * Math.sin(bearing));
  const surf = sample.shelter;
  const env = (1 - smoothstep(70, 180, sdf)) * smoothstep(0.35, 0.8, gl) * smoothstep(-0.9, 0.5, depth);
  const shoal = tl > 0.5 ? tr(3) : Math.pow(clamp(Math.max(depth, 0.6) / 14, 0.04, 1), -0.25);
  return {
    x,
    z,
    r1,
    r2,
    dx,
    dz,
    depth,
    sdf,
    gl,
    exposure,
    surf,
    tau: tr(0),
    noise: shoreNoisePhase(x, z),
    base: env * exposure * shoal * SHORE_WAVE.amp,
    amax: Math.min(Math.max(depth, 0), surf) * 0.42 + smoothstep(0.5, 2, surf) * 0.14 + 0.02,
    gate: 1 - smoothstep(1.05, 1.4, depth / Math.max(surf, 0.05)),
    cel: Math.sqrt(9.81 * clamp(depth, 0.3, 14)),
    cycle: NaN,
    nx: 0,
    nz: 0,
  };
}
type Site = ReturnType<typeof site>;

// Source emitter sampling, with a bounded count instead of 150,000 shader instances. These are fixed emission
// locations and last-fired cycles, not particles; only the shared GPU pool owns droplet lifetimes and motion.
function sites(atlas: ShoreAtlas, coast = true) {
  let seed = 11;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const breakers: Site[] = [],
    rocks: Site[] = [];
  const providers = shoreProviders();
  for (const provider of providers) {
    const b = provider.bounds,
      quota = Math.ceil(BREAKER_SITES / Math.max(providers.length, 1));
    const target = breakers.length + quota;
    for (let tries = 0; coast && breakers.length < target && tries < quota * 80; tries++) {
      const x = b.minX + rand() * (b.maxX - b.minX),
        z = b.minZ + rand() * (b.maxZ - b.minZ);
      const sample = atlas.sampleAt(x, z);
      if (!sample.valid || sample.bed < -3.2 || sample.bed > -0.3 || sample.distance > 150) continue;
      breakers.push(site(atlas, x, z, rand(), rand()));
    }
    for (const obstacle of provider.obstacles ?? []) {
      const cx = obstacle.kind === 'circle' ? obstacle.x : (obstacle.minX + obstacle.maxX) / 2;
      const cz = obstacle.kind === 'circle' ? obstacle.z : (obstacle.minZ + obstacle.maxZ) / 2;
      const radius =
        obstacle.kind === 'circle'
          ? obstacle.radius
          : Math.hypot(obstacle.maxX - obstacle.minX, obstacle.maxZ - obstacle.minZ) / 2;
      if (atlas.sampleAt(cx, cz).bed > 0.5) continue;
      for (let i = 0; i < 8 && rocks.length < 256; i++) {
        const angle = (i * TAU) / 8,
          nx = Math.cos(angle),
          nz = Math.sin(angle);
        const e = site(atlas, cx + nx * radius, cz + nz * radius, rand(), rand());
        e.nx = nx;
        e.nz = nz;
        rocks.push(e);
      }
    }
  }
  for (const contact of waterContacts().contacts) {
    const { x, z, radius } = contact;
    for (let i = 0; i < 8 && rocks.length < 256; i++) {
      const angle = (i * TAU) / 8,
        nx = Math.cos(angle),
        nz = Math.sin(angle);
      const e = site(atlas, x + nx * radius, z + nz * radius, rand(), rand());
      e.nx = nx;
      e.nz = nz;
      rocks.push(e);
    }
  }
  return { breakers, rocks };
}

defineKind('water-spray', { lateUpdate: -21 });
const preparations = new Set<() => void>();
warmUp(() => {
  for (const prepare of preparations) prepare();
});
export function createSpray(atlas: ShoreAtlas) {
  let breakers: Site[] = [],
    rocks: Site[] = [],
    generation = -1,
    contactsGeneration = -1;
  const prepare = () => {
    const next = shoreRevision(),
      contactNext = waterContactRevision();
    if (next === generation && contactNext === contactsGeneration) return;
    const coast = next !== generation;
    generation = next;
    contactsGeneration = contactNext;
    const built = sites(atlas, coast);
    if (coast) breakers = built.breakers;
    rocks = built.rocks;
  };
  preparations.add(prepare);
  // One reusable descriptor; emit copies it synchronously. Tiny separate dots make a cloud of droplets,
  // not the source's expanding noise-masked quads (a smooth growing sprite would read as a cotton ball).
  const drop: Particle = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 1,
    size: 0.06,
    color: new Color().setRGB(0.88, 0.96, 1),
    gravity: 9.81,
    drag: 1.7,
    fade: 0.65,
    shrink: 0.35,
  };
  // Rolling one-second window (not a refill bucket, which permits double bursts at a boundary).
  const emittedAt = new Float64Array(MAX_PER_SECOND).fill(-Infinity);
  const seenImpact = new Float64Array(seaRipples.length).fill(-Infinity);
  let cursor = 0,
    frameEmits = 0,
    breakerCursor = 0,
    previousTime = NaN;
  const send = (now: number) => {
    if (frameEmits >= MAX_PER_FRAME || now - emittedAt[cursor]! < 1) return;
    emittedAt[cursor] = now;
    cursor = (cursor + 1) % MAX_PER_SECOND;
    frameEmits++;
    emit(drop);
  };
  const visibility = (x: number, y: number, z: number, near: number, full: number) => {
    const dx = x - camera.position.x,
      dz = z - camera.position.z;
    const d = Math.hypot(dx, dz);
    if (d >= DISTANCE) return 0;
    const m = camera.matrixWorldInverse.elements;
    const viewZ = -(m[2]! * x + m[6]! * y + m[10]! * z + m[14]!);
    return (1 - smoothstep(DISTANCE * 0.7, DISTANCE, d)) * smoothstep(near, full, viewZ);
  };
  const spray = (e: Site, t: number, dt: number, now: number, rock: boolean) => {
    const visible = visibility(e.x, 0, e.z, rock ? 1 : 2.5, rock ? 4 : 10);
    if (!visible) return;
    const group = shoreGroup(e.x, e.z, t);
    const a = Math.min(e.base * group, e.amax);
    // The same omega * (tau + t) + noisePhase as surface.ts. World coordinates, not island-local noise.
    const ph = f(f(f(e.tau + t) * f(OMEGA)) + e.noise);
    const cycle = Math.floor((ph + Math.PI) / TAU);
    const early = vnoise(f(f(e.x * f(0.03)) + f(cycle * f(7.3))), f(f(e.z * f(0.03)) + f(cycle * f(3.1))));
    const breaking =
      smoothstep(early * 0.14 + 0.12, early * 0.2 + 0.3, a / Math.max(e.depth, 0.05)) *
      e.gate *
      smoothstep(0.03, 0.2, a);
    let phase = ph / OMEGA,
      period = TAU / OMEGA,
      delay = e.r1 * 0.3;
    let strength = breaking * smoothstep(0.25, 0.55, a),
      y0 = 1.1 * a,
      reach = 0;
    if (rock) {
      delay = e.r2 * 0.25;
      if (-e.depth > -0.3) {
        // Beach: swash front at the foot, harder the further below run-up it sits. S.R and S.s mirror
        // swashNodes; Spray.js uses Rf=2.1*R for the splash reach beyond the thin visible film.
        if (e.sdf >= 60 || -e.depth >= 1.74 * SHORE_WAVE.amp) return;
        const R =
          Math.min(SHORE_WAVE.amp * e.exposure * group, e.surf * 0.42 + 0.02) * 0.55 * smoothstep(0.35, 0.8, e.gl);
        const Rf = R * 2.1,
          h = Math.max(-e.depth, 0);
        if (Rf < 0.05 || h > Rf * 0.9) return;
        const sArr = (0.3 * Math.asin(h / Rf)) / 1.5708;
        period = SWASH_TAU / SWASH_OMEGA;
        phase = f(f(t * f(SWASH_OMEGA)) + e.noise) / SWASH_OMEGA;
        delay += sArr * period;
        strength = smoothstep(0.05, 0.3, R) * Math.sqrt(1 - h / Rf);
        y0 = h + 0.05;
        reach = 0.6;
      } else {
        // Surf: the crest slams into the face, harder where it breaks. Unlike free breaker spray,
        // a rock also splashes an unbroken crest: it is the obstacle that throws the water upwards.
        strength = smoothstep(0.04, 0.3, a) * (0.6 + 0.4 * breaking);
        y0 = 1.2 * a;
        reach = 1.5 + 4 * Math.sqrt(a);
      }
    }
    const event = Math.floor((phase - delay) / period);
    const age = phase - delay - event * period;
    if (event === e.cycle) return;
    e.cycle = event;
    // No catch-up storm after a pause or camera jump. Only crossings of a fresh crest emit.
    if (strength <= 0.01 || age > Math.min(dt, 0.1)) return;
    drop.x = e.x;
    drop.z = e.z;
    drop.y = y0;
    drop.floor = rock ? y0 - 0.3 : -0.3;
    drop.alpha = Math.min(1, (rock ? 2 : 1) * strength) * visible;
    if (rock) {
      const r3 = fract(e.r1 * 23.17 + 0.71);
      drop.vx = e.nx * (0.15 + 0.5 * e.r2) * reach + e.dx * 0.3;
      drop.vz = e.nz * (0.15 + 0.5 * e.r2) * reach + e.dz * 0.3;
      drop.vy = (2 + 4 * r3 * r3) * reach * strength;
      drop.life = 0.5 + 0.9 * r3;
      drop.drag = 1.6;
      drop.size = 0.12 * (0.5 + e.r2) * (0.6 + (0.4 * reach) / 3);
    } else {
      const side = (fract(e.r1 * 31.7) - 0.5) * 1.6;
      drop.x -= e.dz * side;
      drop.z += e.dx * side;
      const speed = e.cel * (0.25 + 0.45 * fract(e.r2 * 17.3)); // omega/k = shallow-water c
      drop.vx = e.dx * speed;
      drop.vz = e.dz * speed;
      drop.vy = (1.2 + 3.2 * fract(e.r1 * 7.9)) * Math.sqrt(a);
      drop.life = 0.9 + 1.5 * e.r2;
      drop.drag = 1.7;
      drop.size = 0.1 * (0.6 + 0.8 * fract(e.r2 * 5.3)) * Math.sqrt(a / 0.5);
    }
    send(now);
    if (rock)
      for (let k = 1; k < ROCK_CLUSTER; k++) {
        const j = fract(e.r1 * (11.3 + k * 7.1));
        drop.vx *= 0.75 + 0.5 * j;
        drop.vz *= 1.25 - 0.5 * j;
        drop.vy *= 0.7 + 0.6 * j;
        drop.life *= 0.8 + 0.4 * j;
        send(now);
      }
  };
  const entity = spawn({
    kind: 'water-spray',
    lateUpdate({ elapsed }) {
      prepare();
      frameEmits = 0;
      const t = f(uTime.value as number); // the exact time already assigned to the surface in world/41
      // The surface clock was copied from the sea's previous late update. Its step need not equal this frame's dt.
      const dt = Number.isFinite(previousTime) ? clamp(t - previousTime, 0, 0.1) + 1e-5 : 0;
      previousTime = t;
      // Fresh impact slots get first call on the budget. Observe, never overwrite: the sea still draws their rings.
      for (let i = 0; i < seaRipples.length; i++) {
        const impact = seaRipples[i]!;
        if (impact.z === seenImpact[i]) continue;
        seenImpact[i] = impact.z;
        if (impact.w <= 0 || elapsed - impact.z < 0 || elapsed - impact.z > 0.1) continue;
        const visible = visibility(impact.x, 0, impact.y, 1, 4);
        if (!visible) continue;
        const strength = Math.sqrt(impact.w / 0.2);
        // Boogle's slots have strength but no source uImpactSize; use the surface's characteristic radius.
        const L = 0.5;
        for (let j = 0; j < CROWN_DROPS; j++) {
          const id = j * seaRipples.length + i;
          const r1 = hash12(id, 1.7),
            r2 = hash12(id, 8.3),
            r3 = hash12(id, 4.1);
          const nx = Math.cos(r1 * TAU),
            nz = Math.sin(r1 * TAU),
            speed = (0.5 + 2 * r3) * strength;
          const r = L * (0.6 + 0.5 * r2);
          drop.x = impact.x + nx * r;
          drop.z = impact.y + nz * r;
          drop.y = 0.05;
          drop.vx = nx * speed;
          drop.vz = nz * speed;
          drop.vy = (1.5 + 4 * r3 * r3) * strength;
          drop.life = 0.5 + 1.1 * r2;
          drop.drag = 1.2;
          drop.floor = -0.2;
          drop.size = 0.05 * (0.5 + r2);
          drop.alpha = 0.6 * visible;
          send(elapsed);
        }
      }
      for (let i = 0; i < rocks.length; i++) spray(rocks[i]!, t, dt, elapsed, true);
      // Rotate priority so a busy near coast cannot always starve the same emission points.
      for (let i = 0; i < breakers.length; i++)
        spray(breakers[(breakerCursor + i) % breakers.length]!, t, dt, elapsed, false);
      breakerCursor = (breakerCursor + 1) % Math.max(1, breakers.length);
    },
    describe: () => ({
      breakers: breakers.length,
      contacts: rocks.length,
      maxPerFrame: MAX_PER_FRAME,
      maxPerSecond: MAX_PER_SECOND,
    }),
    dispose: () => {
      preparations.delete(prepare);
    },
  });
  return { dispose: () => despawn(entity) };
}
