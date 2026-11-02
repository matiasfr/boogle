// Day and night: a sun and a phased moon cross the sky on a 20-minute cycle, and the island's lighting follows them
// (key light, ambient, fog, sky, clouds, water). Time comes from the shared world clock through src/sim/sky-clock.ts,
// so everyone sees the same sky. Everything here is cosmetic.
//
// Nights are moonlit, not dark: a silver-blue key light (from the moon, or from high in the sky while the moon is
// down), a deep-blue sky and a raised ambient, so terrain, paths and players read at a glance and the things that
// glow still stand out.
//
// SUN_DIR (constants.ts) is the key light's direction, read by the shadow-casting light in player.ts and the water's
// glints. This module points it at the sun by day and at the moon by night.
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  Fn,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
  float,
  mix,
  pow,
  max,
  min,
  dot,
  sin,
  floor,
  fract,
  length,
  normalize,
  smoothstep as tslSmoothstep,
  step,
  sqrt,
  Discard,
  If,
  time,
  positionGeometry,
} from 'three/tsl';
import { SUN_DIR, FOG_NEAR, FOG_FAR } from '../constants.ts';
import { lerp, smoothstep } from '../math.ts';
import { renderer, scene, camera, sun, sky } from './scene.ts';
import { seaU } from './water-render.ts';
import { clouds } from './props.ts';
import { world, TICK_MS } from '../world/sync.ts';
import { skyAt, skyState } from '../sim/sky-clock.ts';

const DIST = 600; // sun/moon billboards sit this far from the camera (inside the 700 sky sphere)
const SUN_R = 24; // the disc; its billboard is twice as wide, for the glow around it
const MOON_R = 28;

// The daily arc: rises along EAST, peaks at NOON (the old fixed sun direction), sets opposite EAST.
const NOON = SUN_DIR.clone().normalize();
const EAST = new THREE.Vector3().crossVectors(NOON, new THREE.Vector3(0, 1, 0)).normalize();
const AXIS = new THREE.Vector3().crossVectors(EAST, NOON).normalize();
const arcDir = (angle: number, out: THREE.Vector3) =>
  out.copy(EAST).multiplyScalar(Math.cos(angle)).addScaledVector(NOON, Math.sin(angle));

// ---------------------------------------------------------------- palette (THREE.Color: hex in sRGB, held in linear)
const C = {
  dayTop: new THREE.Color('#3d9de3'),
  dayHorizon: new THREE.Color('#bfe6f5'),
  setTop: new THREE.Color('#5a77c2'),
  setHorizon: new THREE.Color('#ffb48a'),
  nightTop: new THREE.Color('#142a6c'),
  nightHorizon: new THREE.Color('#31508f'),
  glow: new THREE.Color('#ffd27a'),
  setGlow: new THREE.Color('#ff8a4c'),
  waterDay: new THREE.Color(1, 1, 1),
  waterSet: new THREE.Color(1, 0.7, 0.55),
  waterNight: new THREE.Color(0.22, 0.3, 0.6),
};
const L = {
  sunDay: new THREE.Color('#fff3da'),
  sunSet: new THREE.Color('#ff8030'),
  moon: new THREE.Color('#a8c0ff'), // silver-blue moonlight
  hemiSkyDay: new THREE.Color('#d4f0ff'),
  hemiSkySet: new THREE.Color('#ffc09c'),
  hemiSkyNight: new THREE.Color('#6a8cff'),
  hemiGroundDay: new THREE.Color('#f0d9a0'),
  hemiGroundSet: new THREE.Color('#f0a060'),
  hemiGroundNight: new THREE.Color('#3c4884'),
  cloudGlowDay: new THREE.Color('#d8ecff'),
  cloudGlowSet: new THREE.Color('#ffa070'),
  cloudGlowNight: new THREE.Color('#9db4ff'),
  // The sun's disc, in HDR: tone mapping turns its middle white-hot, with the colour at the rim and in the glow.
  discDay: new THREE.Color(1, 0.9, 0.7).multiplyScalar(3),
  discSet: new THREE.Color(1, 0.48, 0.16).multiplyScalar(1.5),
};
// Lights are physical values; the one global exposure is scene.ts's. At night it eases up like an eye adapting, so the
// night lights below need no compensation of their own.
const BASE_EXPOSURE = renderer.toneMappingExposure;
const NIGHT_EXPOSURE = 1.15;
const SUN_I = 2.5,
  SUN_SET_BOOST = 0.4, // the low sun is golden and a little stronger
  MOON_I = 1.1, // a full moon; never below MOON_FLOOR of it, so a new-moon night is still easy to play in
  MOON_FLOOR = 0.55,
  MOON_SHADOW = 0.6, // moon shadows are softer than the sun's
  KEY_MIN_Y = 0.45, // the night key light never comes in lower than this (long grazing shadows would hide the ground)
  HEMI_DAY = 1.2,
  HEMI_SET = 1.1,
  HEMI_NIGHT = 0.7;

// ---------------------------------------------------------------- sky dome
export const skyU = {
  uTop: uniform(C.dayTop.clone()),
  uHorizon: uniform(C.dayHorizon.clone()),
  uSun: uniform(new THREE.Vector3()),
  uMoon: uniform(new THREE.Vector3()),
  uGlow: uniform(C.glow.clone()),
  uMoonGlow: uniform(0),
  uStars: uniform(0),
  uStarRot: uniform(new THREE.Matrix3()),
};
// The dome's colours as updateSky left them this frame. A feature may tint them after it (onFrame order > -5) for a
// Local look; updateSky sets them afresh every frame, so a tint never sticks (the era prototype, src/proto/era/).
export const skyColors = { top: skyU.uTop.value as THREE.Color, horizon: skyU.uHorizon.value as THREE.Color };

// TSL's typings can't follow a vec3 through fract and back to .x/.y/.z: the node is typed loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hash = Fn(([p0]: [any]) => {
  const p = vec3(fract(p0.mul(0.3183099).add(0.1)).mul(17));
  return fract(p.x.mul(p.y).mul(p.z).mul(p.x.add(p.y).add(p.z)));
});

const skyColor = Fn(() => {
  const d = normalize(positionGeometry);
  const col = mix(skyU.uHorizon, skyU.uTop, pow(max(d.y, 0), 0.6)).toVar();
  const s = max(dot(d, skyU.uSun), 0);
  // The sun's glow: a wide warm wash and a tight halo that the disc's own glow fades into.
  col.addAssign(skyU.uGlow.mul(pow(s, 6).mul(0.28).add(pow(s, 40).mul(0.3)).add(pow(s, 400).mul(0.45))));
  const m = max(dot(d, skyU.uMoon), 0);
  col.addAssign(
    vec3(0.5, 0.58, 0.88)
      .mul(pow(m, 40).mul(0.3).add(pow(m, 700).mul(0.45)))
      .mul(skyU.uMoonGlow),
  );
  // Stars: one jittered point per lit cell of a 3D grid. Skipped by day; the branch is on a uniform and holds no
  // texture sample or derivative, so it is safe in WGSL.
  If(skyU.uStars.greaterThan(0.001), () => {
    const q = skyU.uStarRot.mul(d).mul(150);
    const c = floor(q);
    const h = hash(c);
    const o = vec3(hash(c.add(1.7)), hash(c.add(3.1)), hash(c.add(5.3))).sub(0.5);
    const dd = length(fract(q).sub(0.5).sub(o.mul(0.5)));
    const tw = sin(time.mul(h.mul(4).add(1.3)).add(h.mul(91)))
      .mul(0.3)
      .add(0.7);
    const bright = h.sub(0.991).div(0.009).mul(0.55).add(0.45);
    const star = tslSmoothstep(0.04, 0.24, dd).oneMinus().mul(bright).mul(tw).mul(skyU.uStars);
    col.addAssign(
      vec3(1, 0.97, 0.9)
        .mul(star)
        .mul(tslSmoothstep(0, 0.18, d.y))
        .mul(step(0.991, h)),
    );
  });
  return vec4(min(col, 1), 1);
});

const skyMat = new MeshBasicNodeMaterial({ side: THREE.BackSide, depthWrite: false, fog: false });
skyMat.colorNode = skyColor();

// ---------------------------------------------------------------- sun and moon billboards
// Both are drawn in TSL on a camera-facing quad: no textures, no faces.

// Smooth 3D value noise from the hash above (for the moon's maria).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const valueNoise = Fn(([p]: [any]) => {
  const i = floor(p);
  const f = fract(p);
  const u = vec3(f.mul(f).mul(f.mul(-2).add(3)));
  const h = (x: number, y: number, z: number) => hash(i.add(vec3(x, y, z)));
  const x00 = mix(h(0, 0, 0), h(1, 0, 0), u.x);
  const x10 = mix(h(0, 1, 0), h(1, 1, 0), u.x);
  const x01 = mix(h(0, 0, 1), h(1, 0, 1), u.x);
  const x11 = mix(h(0, 1, 1), h(1, 1, 1), u.x);
  return mix(mix(x00, x10, u.y), mix(x01, x11, u.y), u.z);
});

const sunU = { uCol: uniform(L.discDay.clone()), uFade: uniform(1) };

// A bright disc, a touch darker at the limb, inside a soft glow of its colour that fades into the sky's own halo
// (skyColor). Clouds and the sea draw over it.
function makeSunMat() {
  const mat = new MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    fog: false,
  });
  mat.colorNode = Fn(() => {
    const p = uv().mul(2).sub(1);
    const r = length(p); // the disc's edge is at 0.5
    Discard(r.greaterThan(1));
    const disc = tslSmoothstep(0.47, 0.5, r).oneMinus();
    const limb = float(1).sub(r.mul(r).mul(0.9));
    const glow = pow(max(float(1).sub(r), 0), 2.5).mul(0.6);
    return vec4(sunU.uCol.mul(mix(0.5, limb, disc)), max(disc, glow).mul(sunU.uFade));
  })();
  return mat;
}

const moonU = {
  uL: uniform(new THREE.Vector3(0, 0, 1)), // sun direction in the billboard's frame
  uNight: uniform(1),
  uFade: uniform(1),
};
// A few soft craters on the disc: x, y (disc radius 1), radius.
const CRATERS: [number, number, number][] = [
  [-0.42, 0.38, 0.16],
  [0.36, 0.52, 0.11],
  [0.55, -0.12, 0.13],
  [-0.18, -0.48, 0.09],
  [0.08, 0.12, 0.07],
  [-0.62, -0.1, 0.08],
];

// Pale highlands, blue-grey maria from low-frequency noise, a few soft craters and one bright rayed one. The disc is
// shaded as a sphere lit by the real sun, so the phase is right; the dark side keeps a faint earthshine.
function makeMoonMat() {
  const mat = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  mat.colorNode = Fn(() => {
    const p = uv().mul(2).sub(1);
    const r2 = dot(p, p);
    const edge = tslSmoothstep(0.95, 1.0, r2).oneMinus();
    Discard(edge.lessThanEqual(0));
    const n = vec3(p, sqrt(max(float(1).sub(r2), 0)));
    const q = n.add(vec3(3.1, 1.7, 0.4));
    const big = valueNoise(q.mul(2.1))
      .mul(0.7)
      .add(valueNoise(q.mul(4.3)).mul(0.3));
    const mare = tslSmoothstep(0.44, 0.6, big);
    const shade = float(1)
      .add(valueNoise(q.mul(13)).sub(0.5).mul(0.1))
      .toVar();
    for (const [cx, cy, cr] of CRATERS) {
      const d = length(p.sub(vec2(cx, cy))).div(cr);
      shade.subAssign(tslSmoothstep(0.65, 1.0, d).oneMinus().mul(0.14)); // the floor
      shade.addAssign(
        tslSmoothstep(0.75, 1.0, d)
          .mul(tslSmoothstep(1.0, 1.3, d).oneMinus())
          .mul(0.08),
      ); // the rim
    }
    const ray = length(p.sub(vec2(0.18, -0.6)));
    shade.addAssign(tslSmoothstep(0, 0.07, ray).oneMinus().mul(0.25));
    shade.addAssign(tslSmoothstep(0, 0.3, ray).oneMinus().mul(0.06));
    const albedo = mix(vec3(0.8, 0.79, 0.75), vec3(0.4, 0.44, 0.53), mare).mul(shade);
    const lit = tslSmoothstep(-0.06, 0.1, dot(n, normalize(moonU.uL)));
    const col = albedo.mul(mix(0.06, 1, lit)).add(vec3(0.004, 0.008, 0.025).mul(float(1).sub(lit)));
    const a = edge.mul(moonU.uFade).mul(mix(lit.mul(0.8), 1, moonU.uNight));
    return vec4(col, a);
  })();
  return mat;
}

let sunGroup: THREE.Group | null = null,
  moonGroup: THREE.Group | null = null,
  hemi: THREE.HemisphereLight | null = null;

export function createSky() {
  sky.material.dispose();
  (sky as THREE.Mesh).material = skyMat;

  sunGroup = new THREE.Group();
  sunGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(SUN_R * 4, SUN_R * 4), makeSunMat()));
  moonGroup = new THREE.Group();
  moonGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(MOON_R * 2, MOON_R * 2), makeMoonMat()));

  for (const g of [sunGroup, moonGroup])
    g.traverse((o) => {
      o.frustumCulled = false;
      o.renderOrder = -0.5; // before the sea, so the water draws over a setting sun
    });
  scene.add(sunGroup, moonGroup);
  hemi = (scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as THREE.HemisphereLight) || null;
}

// ---------------------------------------------------------------- per frame
const UP = new THREE.Vector3(0, 1, 0);
const sunDir = new THREE.Vector3(),
  moonDir = new THREE.Vector3(),
  keyDir = new THREE.Vector3(),
  antiSun = new THREE.Vector3(),
  tmpV = new THREE.Vector3(),
  tmpQ = new THREE.Quaternion(),
  horizon = new THREE.Color(),
  starQ = new THREE.Quaternion(),
  starM = new THREE.Matrix4();
let clockMs: number | null = null;
const debug = { frac: null as number | null, phase: null as number | null, noShadowPass: false };

// Smooth the 10 Hz world tick into a continuous clock (and jump if it moves a lot, e.g. after loading a snapshot).
function worldMs(dt: number) {
  const target = world.tick * TICK_MS;
  if (clockMs === null || Math.abs(target - clockMs) > 3000) clockMs = target;
  else clockMs += dt * 1000 + (target - clockMs) * Math.min(1, dt * 2);
  return clockMs;
}

function placeBillboard(group: THREE.Group, dir: THREE.Vector3) {
  group.position.copy(camera.position).addScaledVector(dir, DIST);
  group.lookAt(camera.position);
}

// dir lifted to at least KEY_MIN_Y above the horizon, keeping its compass heading, scaled by w and added to out.
function addLifted(out: THREE.Vector3, dir: THREE.Vector3, w: number) {
  tmpV.copy(dir).setY(0);
  const flat = tmpV.length() || 1;
  const y = Math.max(dir.y, KEY_MIN_Y);
  tmpV.multiplyScalar(Math.sqrt(1 - y * y) / flat).setY(y);
  return out.addScaledVector(tmpV, w);
}

// Set every frame by features that take the camera somewhere the sky can't reach: underground = 0..1 (the caves).
// The fog closes in, dark, and the sky's light turns warm and dims a little; the cave meshes bake their own darkening
// with depth (aAmb in src/pois/caves/), so the global dip stays mild.
export const atmosphere = { underground: 0 };
const CAVE = { fog: new THREE.Color('#15120f'), sky: new THREE.Color('#8f806e'), ground: new THREE.Color('#3d342a') };

const skyScratch = skyState(0, 0); // this frame's sky, refilled every frame
export function updateSky(dt: number) {
  if (!sunGroup || !moonGroup) return;
  const fog = scene.fog as THREE.Fog; // scene.ts sets a linear Fog
  const s = skyAt(worldMs(dt), skyScratch);
  if (debug.frac !== null || debug.phase !== null) skyState(debug.frac ?? s.frac, debug.phase ?? s.phase, s);
  arcDir(s.sunAngle, sunDir);
  arcDir(s.moonAngle, moonDir);

  const sunY = sunDir.y,
    moonY = moonDir.y;
  const day = smoothstep(-0.3, 0.12, sunY); // 0 at night, 1 in daylight, twilight between
  const warm = smoothstep(-0.3, -0.02, sunY) * (1 - smoothstep(0.16, 0.5, sunY)); // sunrise / sunset glow
  const night = 1 - day;
  const moonUp = smoothstep(-0.04, 0.12, moonY);

  // Sky colours.
  skyU.uTop.value.lerpColors(C.nightTop, C.dayTop, day).lerp(C.setTop, warm * 0.65);
  horizon.lerpColors(C.nightHorizon, C.dayHorizon, day).lerp(C.setHorizon, warm * 0.9);
  skyU.uHorizon.value.copy(horizon);
  skyU.uSun.value.copy(sunDir);
  skyU.uMoon.value.copy(moonDir);
  skyU.uGlow.value.lerpColors(C.glow, C.setGlow, warm).multiplyScalar(smoothstep(-0.2, 0.0, sunY));
  skyU.uMoonGlow.value = (0.2 + 0.8 * s.illum) * moonUp * night;
  skyU.uStars.value = smoothstep(0.35, 0.95, night);
  starQ.setFromAxisAngle(AXIS, -s.sunAngle); // stars turn with the sky
  skyU.uStarRot.value.setFromMatrix4(starM.makeRotationFromQuaternion(starQ));
  fog.color.copy(horizon);

  // Key light: the sun by day; by night the moon (brighter the fuller it is), or, while the moon is down, a moonless
  // sky light from high up opposite the sun. It fades in after sunset so the switch never pops. It casts the shadows.
  const sunI = SUN_I * (1 + SUN_SET_BOOST * warm) * smoothstep(-0.02, 0.16, sunY);
  const byMoon = sunY < -0.03;
  if (byMoon) {
    keyDir.set(0, 0, 0);
    addLifted(keyDir, moonDir, moonUp);
    addLifted(keyDir, antiSun.copy(sunDir).negate(), 1 - moonUp);
    if (keyDir.lengthSq() < 1e-6) keyDir.copy(UP);
    SUN_DIR.copy(keyDir.normalize());
    sun.color.copy(L.moon);
    const phase = MOON_FLOOR + (1 - MOON_FLOOR) * s.illum * moonUp;
    sun.intensity = MOON_I * phase * (1 - smoothstep(-0.16, -0.03, sunY));
  } else {
    SUN_DIR.copy(sunDir);
    sun.color.copy(L.sunDay).lerp(L.sunSet, warm);
    sun.intensity = sunI;
  }
  sun.shadow.intensity = byMoon ? MOON_SHADOW : 1;
  state.keyLight = sun.intensity > 0.01;
  sun.shadow.autoUpdate = state.keyLight && !debug.noShadowPass; // no key light, no shadow pass

  if (hemi) {
    hemi.color.copy(L.hemiSkyNight).lerp(L.hemiSkyDay, day).lerp(L.hemiSkySet, warm);
    hemi.groundColor.copy(L.hemiGroundNight).lerp(L.hemiGroundDay, day).lerp(L.hemiGroundSet, warm);
    hemi.intensity = lerp(HEMI_NIGHT, HEMI_DAY, day) + (HEMI_SET - HEMI_DAY) * warm;
  }
  renderer.toneMappingExposure = BASE_EXPOSURE * lerp(NIGHT_EXPOSURE, 1, day);
  const ug = atmosphere.underground;
  fog.near = lerp(FOG_NEAR, 6, ug);
  fog.far = lerp(FOG_FAR, 80, ug);
  if (ug > 0) {
    fog.color.lerp(CAVE.fog, ug);
    if (hemi) {
      hemi.color.lerp(CAVE.sky, ug);
      hemi.groundColor.lerp(CAVE.ground, ug);
      hemi.intensity *= lerp(1, 0.8, ug); // the cave rock darkens itself with depth (src/pois/caves/)
    }
  }

  const cm = clouds[0]?.material;
  if (cm) {
    cm.emissive.lerpColors(L.cloudGlowNight, L.cloudGlowDay, day).lerp(L.cloudGlowSet, warm);
    cm.emissiveIntensity = lerp(0.18, 0.45, day);
  }

  seaU.uLight.value.lerpColors(C.waterNight, C.waterDay, day).lerp(C.waterSet, warm * 0.6);
  seaU.uSpecCol.value.copy(sun.color).multiplyScalar(byMoon ? 0.5 + 0.5 * s.illum : 1);

  // Billboards.
  placeBillboard(sunGroup, sunDir);
  sunU.uCol.value.copy(L.discDay).lerp(L.discSet, warm);
  sunU.uFade.value = smoothstep(-0.12, 0.02, sunY);
  sunGroup.visible = sunU.uFade.value > 0.001;

  placeBillboard(moonGroup, moonDir);
  tmpQ.copy(moonGroup.quaternion).invert();
  moonU.uL.value.copy(tmpV.copy(sunDir).applyQuaternion(tmpQ));
  moonU.uNight.value = night;
  moonU.uFade.value = smoothstep(-0.12, 0.02, moonY);
  moonGroup.visible = moonU.uFade.value > 0.001;

  state.frac = s.frac;
  state.phase = s.phase;
  state.illum = s.illum;
  state.day = day;
}

// Console handle (window.boogle.sky): sky.state, sky.preview(0.55) for sunset, sky.preview(0.8, 0.5) for a full moon at
// night, sky.preview(null) to follow the world clock again. Local only; `?tod=0.8&moon=0.5` does the same at load
// (src/features/day-night.ts).
const state = { frac: 0, phase: 0, illum: 0, day: 1, keyLight: true, sunDir, moonDir };
// Read-only view of the current sky for other modules: day (0 night .. 1 day), frac, phase, illum, keyLight (a sun or
// moon bright enough to cast shadows).
export const skyNow = state;
export const skyDebug = {
  state,
  preview(frac: number | null, phase: number | null = null) {
    debug.frac = frac;
    debug.phase = frac === null ? null : phase;
  },
  // Turn the sun's shadow pass off without changing the light (npm run perf counts its draw calls this way).
  shadowPass(on: boolean) {
    debug.noShadowPass = !on;
  },
};
