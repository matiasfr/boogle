// Day and night: a smiling sun and a sleepy, phased moon cross the sky on a 20-minute cycle, and the island's lighting
// follows them (key light, ambient, fog, sky, clouds, water). Time comes from the shared world clock through
// src/sim/sky-clock.ts, so everyone sees the same sky. Everything here is cosmetic.
//
// SUN_DIR (constants.js) is the key light's direction, read by the shadow-casting light in player.js and the water's
// glints. This module points it at the sun by day and at the moon by night.
import * as THREE from 'three';
import { MeshBasicNodeMaterial } from 'three/webgpu';
import {
  Fn,
  uniform,
  texture,
  uv,
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
import { renderer, scene, camera, sun, sky } from './scene.js';
import { seaU } from './water-render.js';
import { clouds } from './props.js';
import { world, TICK_MS } from '../world/sync.ts';
import { skyAt, skyState } from '../sim/sky-clock.ts';

const DIST = 600; // sun/moon billboards sit this far from the camera (inside the 700 sky sphere)
const SUN_R = 34;
const MOON_R = 32;
const FACE_HEX = '#1d1640'; // same ink as The Boogler's face

// The daily arc: rises along EAST, peaks at NOON (the old fixed sun direction), sets opposite EAST.
const NOON = SUN_DIR.clone().normalize();
const EAST = new THREE.Vector3().crossVectors(NOON, new THREE.Vector3(0, 1, 0)).normalize();
const AXIS = new THREE.Vector3().crossVectors(EAST, NOON).normalize();
const arcDir = (angle, out) => out.copy(EAST).multiplyScalar(Math.cos(angle)).addScaledVector(NOON, Math.sin(angle));

// ---------------------------------------------------------------- palette (THREE.Color: hex in sRGB, held in linear)
const C = {
  dayTop: new THREE.Color('#3d9de3'),
  dayHorizon: new THREE.Color('#bfe6f5'),
  setTop: new THREE.Color('#5a77c2'),
  setHorizon: new THREE.Color('#ffb48a'),
  nightTop: new THREE.Color('#0a1538'),
  nightHorizon: new THREE.Color('#22346a'),
  glow: new THREE.Color('#ffd27a'),
  setGlow: new THREE.Color('#ff8a4c'),
  waterDay: new THREE.Color(1, 1, 1),
  waterSet: new THREE.Color(1, 0.7, 0.55),
  waterNight: new THREE.Color(0.1, 0.17, 0.4),
};
const L = {
  sunFaceSet: new THREE.Color('#ffbe8c'),
  sunDay: new THREE.Color('#fff3da'),
  sunSet: new THREE.Color('#ff8030'),
  moon: new THREE.Color('#86a6ff'),
  hemiSkyDay: new THREE.Color('#d4f0ff'),
  hemiSkySet: new THREE.Color('#ffc09c'),
  hemiSkyNight: new THREE.Color('#5075f0'),
  hemiGroundDay: new THREE.Color('#f0d9a0'),
  hemiGroundSet: new THREE.Color('#f0a060'),
  hemiGroundNight: new THREE.Color('#5c4f96'),
  cloudGlowDay: new THREE.Color('#d8ecff'),
  cloudGlowSet: new THREE.Color('#ffa070'),
};
// Lights are physical values; the one global exposure is scene.js's. At night it eases up like an eye adapting, so the
// night lights below need no compensation of their own.
const BASE_EXPOSURE = renderer.toneMappingExposure;
const NIGHT_EXPOSURE = 1.12;
const SUN_I = 2.5,
  SUN_SET_BOOST = 0.4, // the low sun is golden and a little stronger
  MOON_I = 1.5,
  HEMI_DAY = 1.2,
  HEMI_SET = 1.1,
  HEMI_NIGHT = 0.5;

// ---------------------------------------------------------------- textures
function faceCanvas(size, draw) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size / 2);
  return c;
}

function drawSmile(g, cx, cy, r, w) {
  g.strokeStyle = FACE_HEX;
  g.lineWidth = w;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(cx, cy, r, Math.PI * 0.18, Math.PI * 0.82);
  g.stroke();
}

function drawCheeks(g, cx, cy, dx, rx, ry, color) {
  g.fillStyle = color;
  for (const sx of [-1, 1]) {
    g.beginPath();
    g.ellipse(cx + dx * sx, cy, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
  }
}

function sunFaceTexture() {
  const c = faceCanvas(512, (g, h) => {
    const grad = g.createRadialGradient(h - 50, h - 60, 30, h, h, 250);
    grad.addColorStop(0, '#fff3a0');
    grad.addColorStop(0.7, '#ffd23f');
    grad.addColorStop(1, '#ffb323');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(h, h, 244, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 12;
    g.strokeStyle = '#f59a1b';
    g.stroke();
    drawCheeks(g, h, h + 42, 128, 40, 24, 'rgba(255, 112, 92, 0.42)');
    g.fillStyle = FACE_HEX;
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.ellipse(h + 72 * sx, h - 30, 23, 34, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#ffffff';
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(h + 72 * sx + 8, h - 44, 8, 0, Math.PI * 2);
      g.fill();
    }
    drawSmile(g, h, h + 12, 62, 13);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function sunRaysTexture() {
  const c = faceCanvas(512, (g, h) => {
    g.fillStyle = '#ffc93a';
    g.strokeStyle = '#ffc93a';
    g.lineJoin = 'round';
    g.lineWidth = 18;
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2;
      const tip = k % 2 ? 222 : 246;
      g.beginPath();
      g.moveTo(h + Math.cos(a) * tip, h + Math.sin(a) * tip);
      g.lineTo(h + Math.cos(a - 0.13) * 140, h + Math.sin(a - 0.13) * 140);
      g.lineTo(h + Math.cos(a + 0.13) * 140, h + Math.sin(a + 0.13) * 140);
      g.closePath();
      g.fill();
      g.stroke();
    }
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function moonFaceTexture() {
  const c = faceCanvas(512, (g, h) => {
    g.fillStyle = '#f3efd6';
    g.fillRect(0, 0, 512, 512);
    g.fillStyle = '#ddd6b6';
    for (const [x, y, r] of [
      [150, 140, 34],
      [380, 150, 22],
      [120, 330, 20],
      [400, 360, 38],
      [300, 420, 16],
      [230, 90, 14],
    ]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    drawCheeks(g, h, h + 46, 120, 36, 22, 'rgba(255, 140, 150, 0.45)');
    // Sleepy closed eyes.
    g.strokeStyle = FACE_HEX;
    g.lineWidth = 13;
    g.lineCap = 'round';
    for (const sx of [-1, 1]) {
      g.beginPath();
      g.arc(h + 72 * sx, h - 38, 30, Math.PI * 0.15, Math.PI * 0.85);
      g.stroke();
    }
    drawSmile(g, h, h + 18, 52, 12);
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------- sky dome
const skyU = {
  uTop: uniform(C.dayTop.clone()),
  uHorizon: uniform(C.dayHorizon.clone()),
  uSun: uniform(new THREE.Vector3()),
  uMoon: uniform(new THREE.Vector3()),
  uGlow: uniform(C.glow.clone()),
  uMoonGlow: uniform(0),
  uStars: uniform(0),
  uStarRot: uniform(new THREE.Matrix3()),
};

const hash = Fn(([p0]) => {
  const p = fract(p0.mul(0.3183099).add(0.1)).mul(17);
  return fract(p.x.mul(p.y).mul(p.z).mul(p.x.add(p.y).add(p.z)));
});

const skyColor = Fn(() => {
  const d = normalize(positionGeometry);
  const col = mix(skyU.uHorizon, skyU.uTop, pow(max(d.y, 0), 0.6)).toVar();
  const s = max(dot(d, skyU.uSun), 0);
  col.addAssign(skyU.uGlow.mul(pow(s, 6).mul(0.28).add(pow(s, 40).mul(0.3))));
  const m = max(dot(d, skyU.uMoon), 0);
  col.addAssign(vec3(0.5, 0.58, 0.88).mul(pow(m, 40)).mul(skyU.uMoonGlow));
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
const moonU = {
  uL: uniform(new THREE.Vector3(0, 0, 1)), // sun direction in the billboard's frame
  uNight: uniform(1),
  uFade: uniform(1),
};

function makeMoonMat(map) {
  const mat = new MeshBasicNodeMaterial({ transparent: true, depthWrite: false, fog: false });
  mat.colorNode = Fn(() => {
    const tex = texture(map, uv()).rgb; // sampled before the discard
    const p = uv().mul(2).sub(1);
    const r2 = dot(p, p);
    const edge = tslSmoothstep(0.95, 1.0, r2).oneMinus();
    Discard(edge.lessThanEqual(0));
    const n = vec3(p, sqrt(max(float(1).sub(r2), 0))); // the disc shaded as a sphere: phases come from the real sun
    const lit = tslSmoothstep(-0.07, 0.09, dot(n, normalize(moonU.uL)));
    const col = tex.mul(mix(0.17, 1, lit)).add(vec3(0.003, 0.005, 0.02).mul(float(1).sub(lit)));
    const a = edge.mul(moonU.uFade).mul(mix(lit.mul(0.8), 1, moonU.uNight));
    return vec4(col, a);
  })();
  return mat;
}

let sunGroup = null,
  sunFace = null,
  sunRays = null,
  moonGroup = null,
  hemi = null;

const plainMat = (map) =>
  new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, fog: false, toneMapped: false });

export function createSky() {
  sky.material.dispose();
  sky.material = skyMat;

  sunGroup = new THREE.Group();
  sunRays = new THREE.Mesh(new THREE.PlaneGeometry(SUN_R * 3.3, SUN_R * 3.3), plainMat(sunRaysTexture()));
  sunFace = new THREE.Mesh(new THREE.PlaneGeometry(SUN_R * 2, SUN_R * 2), plainMat(sunFaceTexture()));
  sunFace.position.z = 1;
  sunGroup.add(sunRays, sunFace);

  moonGroup = new THREE.Group();
  moonGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(MOON_R * 2, MOON_R * 2), makeMoonMat(moonFaceTexture())));

  for (const g of [sunGroup, moonGroup])
    g.traverse((o) => {
      o.frustumCulled = false;
      o.renderOrder = -0.5; // before the sea, so the water draws over a setting sun
    });
  scene.add(sunGroup, moonGroup);
  hemi = scene.children.find((o) => o.isHemisphereLight) || null;
}

// ---------------------------------------------------------------- per frame
const sunDir = new THREE.Vector3(),
  moonDir = new THREE.Vector3(),
  tmpV = new THREE.Vector3(),
  tmpQ = new THREE.Quaternion(),
  horizon = new THREE.Color(),
  starQ = new THREE.Quaternion(),
  starM = new THREE.Matrix4();
let clockMs = null;
const debug = { frac: null, phase: null, noShadowPass: false };

// Smooth the 10 Hz world tick into a continuous clock (and jump if it moves a lot, e.g. after loading a snapshot).
function worldMs(dt) {
  const target = world.tick * TICK_MS;
  if (clockMs === null || Math.abs(target - clockMs) > 3000) clockMs = target;
  else clockMs += dt * 1000 + (target - clockMs) * Math.min(1, dt * 2);
  return clockMs;
}

function placeBillboard(group, dir) {
  group.position.copy(camera.position).addScaledVector(dir, DIST);
  group.lookAt(camera.position);
}

// Set every frame by features that take the camera somewhere the sky can't reach: underground = 0..1 (the caves).
// The fog closes in, dark, and the sky's light turns warm and dims a little; the cave meshes bake their own darkening
// with depth (aAmb in src/pois/caves/), so the global dip stays mild.
export const atmosphere = { underground: 0 };
const CAVE = { fog: new THREE.Color('#15120f'), sky: new THREE.Color('#8f806e'), ground: new THREE.Color('#3d342a') };

export function updateSky(dt, elapsed) {
  if (!sunGroup) return;
  let s = skyAt(worldMs(dt));
  if (debug.frac !== null || debug.phase !== null) s = skyState(debug.frac ?? s.frac, debug.phase ?? s.phase);
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
  skyU.uMoonGlow.value = 0.35 * s.illum * moonUp * night;
  skyU.uStars.value = smoothstep(0.35, 0.95, night);
  starQ.setFromAxisAngle(AXIS, -s.sunAngle); // stars turn with the sky
  skyU.uStarRot.value.setFromMatrix4(starM.makeRotationFromQuaternion(starQ));
  scene.fog.color.copy(horizon);

  // Key light: the sun by day, the moon by night (brighter the fuller it is). It also casts the shadows.
  const sunI = SUN_I * (1 + SUN_SET_BOOST * warm) * smoothstep(-0.02, 0.16, sunY);
  const moonI = MOON_I * (0.25 + 0.75 * s.illum) * moonUp * night;
  const byMoon = sunY < -0.03;
  SUN_DIR.copy(byMoon ? moonDir : sunDir);
  if (byMoon) sun.color.copy(L.moon);
  else sun.color.copy(L.sunDay).lerp(L.sunSet, warm);
  sun.intensity = byMoon ? moonI : sunI;
  state.keyLight = sun.intensity > 0.01;
  sun.shadow.autoUpdate = state.keyLight && !debug.noShadowPass; // no key light, no shadow pass

  if (hemi) {
    hemi.color.copy(L.hemiSkyNight).lerp(L.hemiSkyDay, day).lerp(L.hemiSkySet, warm);
    hemi.groundColor.copy(L.hemiGroundNight).lerp(L.hemiGroundDay, day).lerp(L.hemiGroundSet, warm);
    hemi.intensity = lerp(HEMI_NIGHT, HEMI_DAY, day) + (HEMI_SET - HEMI_DAY) * warm;
  }
  renderer.toneMappingExposure = BASE_EXPOSURE * lerp(NIGHT_EXPOSURE, 1, day);
  const ug = atmosphere.underground;
  scene.fog.near = lerp(FOG_NEAR, 6, ug);
  scene.fog.far = lerp(FOG_FAR, 80, ug);
  if (ug > 0) {
    scene.fog.color.lerp(CAVE.fog, ug);
    if (hemi) {
      hemi.color.lerp(CAVE.sky, ug);
      hemi.groundColor.lerp(CAVE.ground, ug);
      hemi.intensity *= lerp(1, 0.8, ug); // the cave rock darkens itself with depth (src/pois/caves/)
    }
  }

  const cm = clouds[0]?.material;
  if (cm) {
    cm.emissive.copy(L.cloudGlowDay).lerp(L.cloudGlowSet, warm);
    cm.emissiveIntensity = lerp(0.05, 0.45, day);
  }

  seaU.uLight.value.lerpColors(C.waterNight, C.waterDay, day).lerp(C.waterSet, warm * 0.6);
  seaU.uSpecCol.value.copy(sun.color).multiplyScalar(byMoon ? 0.5 + 0.5 * s.illum : 1);

  // Billboards.
  placeBillboard(sunGroup, sunDir);
  sunRays.rotation.z = elapsed * 0.08;
  sunFace.material.color.setRGB(1, 1, 1).lerp(L.sunFaceSet, warm);
  const sunVis = smoothstep(-0.12, 0.02, sunY);
  sunFace.material.opacity = sunRays.material.opacity = sunVis;
  sunGroup.visible = sunVis > 0.001;

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
// night, sky.preview(null) to follow the world clock again. Local only.
const state = { frac: 0, phase: 0, illum: 0, day: 1, keyLight: true, sunDir, moonDir };
// Read-only view of the current sky for other modules: day (0 night .. 1 day), frac, phase, illum, keyLight (a sun or
// moon bright enough to cast shadows).
export const skyNow = state;
export const skyDebug = {
  state,
  preview(frac, phase = null) {
    debug.frac = frac;
    debug.phase = frac === null ? null : phase;
  },
  // Turn the sun's shadow pass off without changing the light (npm run perf counts its draw calls this way).
  shadowPass(on) {
    debug.noShadowPass = !on;
  },
};
