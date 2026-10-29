// Day and night: a smiling sun and a sleepy, phased moon cross the sky on a 20-minute cycle, and the island's lighting
// follows them (key light, ambient, fog, sky, clouds, water). Time comes from the shared world clock through
// src/sim/sky-clock.js, so everyone sees the same sky. Everything here is cosmetic.
//
// SUN_DIR (constants.js) is the key light's direction, read by the shadow-casting light in player.js and the water's
// glints. This module points it at the sun by day and at the moon by night.
import * as THREE from 'three';
import { SUN_DIR, FOG_NEAR, FOG_FAR } from './constants.js';
import { lerp, smoothstep, srgbVec } from './math.js';
import { scene, camera, renderer, sun, sky } from './scene.js';
import { waterMat } from './water-render.js';
import { clouds } from './props.js';
import { world, TICK_MS } from './world/sync.js';
import { skyAt, skyState } from './sim/sky-clock.js';

const DIST = 600; // sun/moon billboards sit this far from the camera (inside the 700 sky sphere)
const SUN_R = 34;
const MOON_R = 32;
const FACE_HEX = '#1d1640'; // same ink as The Boogler's face

// The daily arc: rises along EAST, peaks at NOON (the old fixed sun direction), sets opposite EAST.
const NOON = SUN_DIR.clone().normalize();
const EAST = new THREE.Vector3().crossVectors(NOON, new THREE.Vector3(0, 1, 0)).normalize();
const AXIS = new THREE.Vector3().crossVectors(EAST, NOON).normalize();
const arcDir = (angle, out) => out.copy(EAST).multiplyScalar(Math.cos(angle)).addScaledVector(NOON, Math.sin(angle));

// ---------------------------------------------------------------- palette (sRGB values, as the existing shaders use)
const C = {
  dayTop: srgbVec('#3d9de3'),
  dayHorizon: srgbVec('#bfe6f5'),
  setTop: srgbVec('#5a77c2'),
  setHorizon: srgbVec('#ffb48a'),
  nightTop: srgbVec('#0a1538'),
  nightHorizon: srgbVec('#22346a'),
  glow: srgbVec('#ffd27a'),
  setGlow: srgbVec('#ff8a4c'),
  waterDay: new THREE.Vector3(1, 1, 1),
  waterSet: new THREE.Vector3(1, 0.84, 0.74),
  waterNight: new THREE.Vector3(0.3, 0.38, 0.62),
};
const L = {
  sunDay: new THREE.Color('#fff3da'),
  sunSet: new THREE.Color('#ff9a52'),
  moon: new THREE.Color('#a9bfff'),
  hemiSkyDay: new THREE.Color('#d4f0ff'),
  hemiSkyNight: new THREE.Color('#5b70b8'),
  hemiGroundDay: new THREE.Color('#e6d3a0'),
  hemiGroundNight: new THREE.Color('#383f63'),
  cloudGlowDay: new THREE.Color('#d8ecff'),
  cloudGlowSet: new THREE.Color('#ffc09a'),
};

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

// The moon's texture stays in raw sRGB (no colorSpace) because its shader writes colours straight out, like the sky's.
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
  return new THREE.CanvasTexture(c);
}

// ---------------------------------------------------------------- sky dome
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  fog: false,
  uniforms: {
    uTop: { value: C.dayTop.clone() },
    uHorizon: { value: C.dayHorizon.clone() },
    uSun: { value: new THREE.Vector3() },
    uMoon: { value: new THREE.Vector3() },
    uGlow: { value: C.glow.clone() },
    uMoonGlow: { value: 0 },
    uStars: { value: 0 },
    uStarRot: { value: new THREE.Matrix3() },
    uTime: { value: 0 },
  },
  vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; uniform vec3 uMoon; uniform vec3 uGlow;
    uniform float uMoonGlow; uniform float uStars; uniform mat3 uStarRot; uniform float uTime; varying vec3 vDir;
    float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    void main() {
      vec3 d = normalize(vDir);
      vec3 col = mix(uHorizon, uTop, pow(max(d.y, 0.0), 0.6));
      float s = max(dot(d, uSun), 0.0);
      col += uGlow * (pow(s, 6.0) * 0.28 + pow(s, 40.0) * 0.3);
      float m = max(dot(d, uMoon), 0.0);
      col += vec3(0.55, 0.62, 0.88) * pow(m, 40.0) * uMoonGlow;
      if (uStars > 0.001) {
        vec3 q = uStarRot * d * 150.0;
        vec3 c = floor(q);
        float h = hash(c);
        if (h > 0.991) {
          vec3 o = vec3(hash(c + 1.7), hash(c + 3.1), hash(c + 5.3)) - 0.5;
          float dd = length(fract(q) - 0.5 - o * 0.5);
          float tw = 0.7 + 0.3 * sin(uTime * (1.3 + h * 4.0) + h * 91.0);
          float bright = 0.45 + 0.55 * (h - 0.991) / 0.009;
          col += vec3(1.0, 0.97, 0.9) * smoothstep(0.24, 0.04, dd) * bright * tw * uStars * smoothstep(0.0, 0.18, d.y);
        }
      }
      gl_FragColor = vec4(min(col, 1.0), 1.0);
    }`,
});

// ---------------------------------------------------------------- sun and moon billboards
const moonMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  fog: false,
  uniforms: {
    uMap: { value: null },
    uL: { value: new THREE.Vector3(0, 0, 1) }, // sun direction in the billboard's frame
    uNight: { value: 1 },
    uFade: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uMap; uniform vec3 uL; uniform float uNight; uniform float uFade; varying vec2 vUv;
    void main() {
      vec2 p = vUv * 2.0 - 1.0;
      float r2 = dot(p, p);
      float edge = 1.0 - smoothstep(0.95, 1.0, r2);
      if (edge <= 0.0) discard;
      vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r2)));       // the disc shaded as a sphere: phases come from the real sun
      float lit = smoothstep(-0.07, 0.09, dot(n, normalize(uL)));
      vec3 tex = texture2D(uMap, vUv).rgb;
      vec3 col = tex * mix(0.17, 1.0, lit) + vec3(0.03, 0.04, 0.09) * (1.0 - lit);
      float a = edge * uFade * mix(lit * 0.8, 1.0, uNight); // by day only the lit part shows, like a real daytime moon
      gl_FragColor = vec4(col, a);
    }`,
});

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

  moonMat.uniforms.uMap.value = moonFaceTexture();
  moonGroup = new THREE.Group();
  moonGroup.add(new THREE.Mesh(new THREE.PlaneGeometry(MOON_R * 2, MOON_R * 2), moonMat));

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
  top = new THREE.Vector3(),
  horizon = new THREE.Vector3(),
  starQ = new THREE.Quaternion(),
  starM = new THREE.Matrix4();
let clockMs = null;
const debug = { frac: null, phase: null };

// Smooth the 10 Hz world tick into a continuous clock (and jump if it moves a lot, e.g. after loading a snapshot).
function worldMs(dt) {
  const target = world.tick * TICK_MS;
  if (clockMs === null || Math.abs(target - clockMs) > 3000) clockMs = target;
  else clockMs += dt * 1000 + (target - clockMs) * Math.min(1, dt * 2);
  return clockMs;
}

function lerpV(out, a, b, t) {
  return out.copy(a).lerp(b, t);
}

function placeBillboard(group, dir) {
  group.position.copy(camera.position).addScaledVector(dir, DIST);
  group.lookAt(camera.position);
}

// Set every frame by features that take the camera somewhere the sky can't reach: underground = 0..1 (the caves).
// The sky's light fades to a dim, warm ambient and the fog closes in, dark.
export const atmosphere = { underground: 0 };
const CAVE = { fog: new THREE.Color('#15120f'), sky: new THREE.Color('#6d6155'), ground: new THREE.Color('#2a241e') };

export function updateSky(dt, elapsed) {
  if (!sunGroup) return;
  let s = skyAt(worldMs(dt));
  if (debug.frac !== null || debug.phase !== null) s = skyState(debug.frac ?? s.frac, debug.phase ?? s.phase);
  arcDir(s.sunAngle, sunDir);
  arcDir(s.moonAngle, moonDir);

  const sunY = sunDir.y,
    moonY = moonDir.y;
  const day = smoothstep(-0.3, 0.12, sunY); // 0 at night, 1 in daylight, twilight between
  const warm = smoothstep(-0.3, -0.02, sunY) * (1 - smoothstep(0.08, 0.38, sunY)); // sunrise / sunset glow
  const night = 1 - day;
  const moonUp = smoothstep(-0.04, 0.12, moonY);

  // Sky colours.
  lerpV(top, C.nightTop, C.dayTop, day).lerp(C.setTop, warm * 0.55);
  lerpV(horizon, C.nightHorizon, C.dayHorizon, day).lerp(C.setHorizon, warm * 0.75);
  const u = skyMat.uniforms;
  u.uTop.value.copy(top);
  u.uHorizon.value.copy(horizon);
  u.uSun.value.copy(sunDir);
  u.uMoon.value.copy(moonDir);
  lerpV(u.uGlow.value, C.glow, C.setGlow, warm).multiplyScalar(smoothstep(-0.2, 0.0, sunY));
  u.uMoonGlow.value = 0.35 * s.illum * moonUp * night;
  u.uStars.value = smoothstep(0.35, 0.95, night);
  starQ.setFromAxisAngle(AXIS, -s.sunAngle); // stars turn with the sky
  u.uStarRot.value.setFromMatrix4(starM.makeRotationFromQuaternion(starQ));
  u.uTime.value = elapsed;
  scene.fog.color.setRGB(horizon.x, horizon.y, horizon.z, THREE.SRGBColorSpace);

  // Key light: the sun by day, the moon by night (brighter the fuller it is). It also casts the shadows.
  const sunI = 2.4 * smoothstep(-0.02, 0.16, sunY);
  const moonI = 0.75 * (0.25 + 0.75 * s.illum) * moonUp * night;
  const byMoon = sunY < -0.03;
  SUN_DIR.copy(byMoon ? moonDir : sunDir);
  if (byMoon) sun.color.copy(L.moon);
  else sun.color.copy(L.sunDay).lerp(L.sunSet, warm);
  sun.intensity = byMoon ? moonI : sunI;
  renderer.shadowMap.autoUpdate = sun.intensity > 0.01; // no key light, no shadow pass

  if (hemi) {
    hemi.color.copy(L.hemiSkyNight).lerp(L.hemiSkyDay, day);
    hemi.groundColor.copy(L.hemiGroundNight).lerp(L.hemiGroundDay, day);
    hemi.intensity = lerp(0.7, 1.25, day);
  }
  const ug = atmosphere.underground;
  scene.fog.near = lerp(FOG_NEAR, 2.5, ug);
  scene.fog.far = lerp(FOG_FAR, 46, ug);
  if (ug > 0) {
    scene.fog.color.lerp(CAVE.fog, ug);
    if (hemi) {
      hemi.color.lerp(CAVE.sky, ug);
      hemi.groundColor.lerp(CAVE.ground, ug);
      hemi.intensity *= lerp(1, 0.32, ug);
    }
  }

  const cm = clouds[0]?.material;
  if (cm) {
    cm.emissive.copy(L.cloudGlowDay).lerp(L.cloudGlowSet, warm);
    cm.emissiveIntensity = lerp(0.05, 0.45, day);
  }

  const w = waterMat.uniforms;
  lerpV(w.uLight.value, C.waterNight, C.waterDay, day).lerp(C.waterSet, warm * 0.6);
  w.uFog.value.copy(horizon);
  w.uSpecCol.value.set(sun.color.r, sun.color.g, sun.color.b).multiplyScalar(byMoon ? 0.5 + 0.5 * s.illum : 1);

  // Billboards.
  placeBillboard(sunGroup, sunDir);
  sunRays.rotation.z = elapsed * 0.08;
  sunFace.material.color.set('#ffffff').lerp(tmpColor.set('#ffbe8c'), warm);
  const sunVis = smoothstep(-0.12, 0.02, sunY);
  sunFace.material.opacity = sunRays.material.opacity = sunVis;
  sunGroup.visible = sunVis > 0.001;

  placeBillboard(moonGroup, moonDir);
  tmpQ.copy(moonGroup.quaternion).invert();
  moonMat.uniforms.uL.value.copy(tmpV.copy(sunDir).applyQuaternion(tmpQ));
  moonMat.uniforms.uNight.value = night;
  moonMat.uniforms.uFade.value = smoothstep(-0.12, 0.02, moonY);
  moonGroup.visible = moonMat.uniforms.uFade.value > 0.001;

  state.frac = s.frac;
  state.phase = s.phase;
  state.illum = s.illum;
  state.day = day;
}
const tmpColor = new THREE.Color();

// Console handle (window.boogle.sky): sky.state, sky.preview(0.55) for sunset, sky.preview(0.8, 0.5) for a full moon at
// night, sky.preview(null) to follow the world clock again. Local only.
const state = { frac: 0, phase: 0, illum: 0, day: 1, sunDir, moonDir };
// Read-only view of the current sky for other modules: day (0 night .. 1 day), frac, phase, illum.
export const skyNow = state;
export const skyDebug = {
  state,
  preview(frac, phase = null) {
    debug.frac = frac;
    debug.phase = frac === null ? null : phase;
  },
};
