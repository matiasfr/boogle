// Ultra Water src/water/Spray.js (30ea65e), adapted to the game's emit(), not a second particle pool.
// Local and cosmetic. DESIGN.md 11 (Show, don't tell): the water visibly stops against the surf rock.
// Research: docs/research/ultra-water.md, particle budget / reuse recommendation. Source notices:
// public/THIRD_PARTY_NOTICES.md. The CPU mirrors shore-nodes.ts and surface.ts's first shore-wave train.
import { Color } from 'three/webgpu';
import { onFrame } from '../../loop.ts';
import { clamp, smoothstep } from '../../math.ts';
import { emit, type Particle } from '../../render/particles.ts';
import { camera } from '../../render/scene.ts';
import { seaRipples } from '../../render/water-render.ts';
import { ROCK } from './height.ts';
import { SHORE_WAVE, uTime, type ShoreBake } from './shore-nodes.ts';
import { ISLAND_AT, ULTRA } from './tuning.ts';

const TAU = Math.PI * 2;
const OMEGA = Math.sqrt((9.81 * TAU) / SHORE_WAVE.lambda) * SHORE_WAVE.speed;
const SWASH_TAU = 6.2831853; // SWASH_GLSL uses this literal, including in its frequency.
const SWASH_OMEGA = Math.sqrt((9.81 * SWASH_TAU) / SHORE_WAVE.lambda) * SHORE_WAVE.speed;
const DISTANCE = 350; // Spray.params.distance, metres; fade over the last 30%.
const MAX_PER_SECOND = 420,
  MAX_PER_FRAME = 96,
  ROCK_CLUSTER = 4; // droplets per rock site per crest
const BREAKER_SITES = 768,
  ROCK_SITES = 128,
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

// Linear clamp-to-edge, texel centres at (i+.5)/size, exactly as shoreFields(). Called only during setup.
function sample(bake: ShoreBake, data: Float32Array, channels: number, channel: number, x: number, z: number) {
  const u = clamp(((x - ISLAND_AT.x) / bake.extent + 0.5) * bake.size - 0.5, 0, bake.size - 1);
  const v = clamp(((z - ISLAND_AT.z) / bake.extent + 0.5) * bake.size - 0.5, 0, bake.size - 1);
  const ix = Math.floor(u),
    iz = Math.floor(v),
    jx = Math.min(ix + 1, bake.size - 1),
    jz = Math.min(iz + 1, bake.size - 1);
  const at = (i: number, j: number) => data[(j * bake.size + i) * channels + channel]!;
  return mix(mix(at(ix, iz), at(jx, iz), u - ix), mix(at(ix, jz), at(jx, jz), u - ix), v - iz);
}
function site(bake: ShoreBake, x: number, z: number, r1: number, r2: number) {
  x = f(x);
  z = f(z);
  const sh = (k: number) => sample(bake, bake.data, 4, k, x, z);
  const tr = (k: number) => sample(bake, bake.travelData, 4, k, x, z);
  const depth = -sh(0),
    sdf = sh(1),
    gx = sh(2),
    gz = sh(3),
    gl = Math.hypot(gx, gz);
  const tx = tr(1),
    tz = tr(2),
    tl = Math.hypot(tx, tz);
  const dx = tl > 0.5 ? tx / tl : -gx / Math.max(gl, 1e-3);
  const dz = tl > 0.5 ? tz / tl : -gz / Math.max(gl, 1e-3);
  const bearing = (ULTRA.swellBearing * Math.PI) / 180;
  const exposure = 0.25 + 0.75 * smoothstep(-0.3, 0.7, -dx * Math.cos(bearing) - dz * Math.sin(bearing));
  const surf = sample(bake, bake.surfData, 1, 0, x, z);
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
function sites(bake: ShoreBake) {
  let seed = 11;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const breakers: Site[] = [],
    rocks: Site[] = [];
  for (let tries = 0; breakers.length < BREAKER_SITES && tries < BREAKER_SITES * 400; tries++) {
    const i = Math.floor(rand() * bake.size),
      j = Math.floor(rand() * bake.size),
      k = (j * bake.size + i) * 4;
    const depth = -bake.data[k]!;
    if (depth < 0.3 || depth > 3.2 || bake.data[k + 1]! > 150) continue;
    const x = ISLAND_AT.x + ((i + rand()) / bake.size - 0.5) * bake.extent;
    const z = ISLAND_AT.z + ((j + rand()) / bake.size - 0.5) * bake.extent;
    breakers.push(site(bake, x, z, rand(), rand()));
  }
  seed = 5;
  const cx = ISLAND_AT.x + ROCK.x,
    cz = ISLAND_AT.z + ROCK.z;
  const centre = site(bake, cx, cz, 0, 0);
  if (centre.dx * centre.dx + centre.dz * centre.dz >= 0.5) {
    for (let i = 0; i < ROCK_SITES; i++) {
      const r1 = rand(),
        r2 = fract(r1 * 57.31 + 0.13),
        ang = (r1 - 0.5) * 2.6;
      const nx = -(centre.dx * Math.cos(ang) - centre.dz * Math.sin(ang));
      const nz = -(centre.dx * Math.sin(ang) + centre.dz * Math.cos(ang));
      const e = site(bake, cx + nx * ROCK.r * 1.25, cz + nz * ROCK.r * 1.25, r1, r2);
      // The bake's shock around the dome fades the waves on the rock's own face (shoal 0.2-0.5), so the crest that hits it is
      // read from open water up-swell of the rock.
      const approach = site(bake, cx - centre.dx * ROCK.r * 3.5, cz - centre.dz * ROCK.r * 3.5, 0, 0);
      e.base = approach.base;
      e.amax = approach.amax;
      e.nx = nx;
      e.nz = nz;
      rocks.push(e);
    }
  }
  return { breakers, rocks };
}

export function startSpray(bake: ShoreBake) {
  if (new URLSearchParams(location.search).get('ocean') === 'off') return;
  const { breakers, rocks } = sites(bake);
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
    breakerCursor = 0;
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
  onFrame(
    ({ dt, elapsed }) => {
      frameEmits = 0;
      const t = f(uTime.value as number); // the exact time already assigned to the surface in world/41
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
    { phase: 'update', order: 42 },
  ); // after camera and splash slots, before late/-20 uploads the particle queue
}
