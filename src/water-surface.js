// Cosmetic layer for the sim water: one mesh over the simulated region (same grid and triangulation as the
// terrain mesh) whose vertex heights are terrain + depth, drawn with a shader that matches the sea.
// Hidden where the water is thinner than a few cm and where it is just the sea (the sea plane draws that,
// so there is no z-fighting). Only cells that changed are touched, and they ease towards their new values
// between the 10 Hz sim ticks. Local only; never synced.
import * as THREE from 'three';
import { HALF, CELL } from './constants.js';
import { scene } from './scene.js';
import { waterMat } from './water-render.js';

// Look tunables. The sim's thin film flip-flops between two depths every tick (e.g. 3 <-> 6 cm), so the drawn
// depth and flow ease slowly (about half a second) and only the average shows; streaks are slow and soft.
const SURFACE_LOOK = {
  easePerSec: 2.2, // 1/time-constant of the displayed depth and flow
  streakSpeed: 0.35, // streak scroll speed per m/s of current
  streakAmount: 0.4, // streak brightness 0..1
};

export function createWaterSurface({ water, i0, j0, flowMax, flowGain }) {
  const W = water.width,
    H = water.height,
    N = W * H;
  const depth = water.depth,
    terr = water.terrain;
  const seaCm = () => water.seaLevel;

  // Per cell: what the sim says now (target), what is drawn (disp), and whether it is still easing.
  const lastD = new Int32Array(N).fill(-1),
    lastT = new Int32Array(N).fill(-1e9);
  const tgt = new Float32Array(N * 4),
    disp = new Float32Array(N * 4); // depth m, visible 0/1, flow x, flow z (m/s)
  const chg = new Uint8Array(N),
    inMoving = new Uint8Array(N);
  let moving = [];

  const pos = new Float32Array(N * 3);
  const info = new Float32Array(N * 4);
  for (let i = 0; i < W; i++)
    for (let j = 0; j < H; j++) {
      const k = (i * H + j) * 3;
      pos[k] = (i0 + i) * CELL - HALF;
      pos[k + 2] = HALF - (j0 + j) * CELL;
    }
  const idx = [];
  for (let i = 0; i < W - 1; i++)
    for (let j = 0; j < H - 1; j++) {
      const a = i * H + j,
        b = a + H,
        c = a + 1,
        d = b + 1;
      idx.push(a, b, c, b, d, c);
    }
  const geo = new THREE.BufferGeometry();
  geo.setIndex(idx);
  const posAttr = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage);
  const infoAttr = new THREE.BufferAttribute(info, 4).setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('position', posAttr);
  geo.setAttribute('aInfo', infoAttr);

  const u = waterMat.uniforms; // share time, ripples, sun and fog with the sea
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    forceSinglePass: true, // both sides in one draw instead of back-then-front
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    uniforms: {
      uTime: u.uTime,
      uRip: u.uRip,
      uSun: u.uSun,
      uSky: u.uSky,
      uStreak: { value: new THREE.Vector2(SURFACE_LOOK.streakSpeed, SURFACE_LOOK.streakAmount) },
      uFog: u.uFog,
      uFogNear: u.uFogNear,
      uFogFar: u.uFogFar,
    },
    vertexShader: `
      attribute vec4 aInfo; varying vec3 vWorld; varying vec4 vInfo;
      void main() {
        vInfo = aInfo;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: `
      uniform float uTime; uniform vec4 uRip[8]; uniform vec3 uSun; uniform vec3 uSky; uniform vec2 uStreak; uniform vec3 uFog;
      uniform float uFogNear; uniform float uFogFar; varying vec3 vWorld; varying vec4 vInfo;
      void main() {
        float depth = vInfo.x;
        float cover = smoothstep(0.004, 0.03, depth);
        if (cover < 0.03) discard;
        vec2 p = vWorld.xz; float t = uTime;
        vec2 fl = vInfo.zw; float sp = length(fl); vec2 dir = fl / max(sp, 0.001);
        vec3 col = mix(vec3(0.42, 0.86, 0.90), vec3(0.14, 0.72, 0.84), smoothstep(0.0, 0.5, depth));
        col = mix(col, vec3(0.06, 0.42, 0.68), smoothstep(0.6, 2.4, depth));
        float n1 = sin(p.x * 0.9 + t * 1.3) * cos(p.y * 0.8 - t * 1.0);
        float n2 = sin((p.x + p.y) * 2.1 - t * 2.2);
        vec3 nrm = normalize(vec3(n1 * 0.10 + n2 * 0.05, 1.0, n2 * 0.05 - n1 * 0.07));
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float spec = pow(max(dot(nrm, normalize(uSun + viewDir)), 0.0), 120.0);
        col = mix(col, uSky, pow(1.0 - max(viewDir.y, 0.0), 4.0) * 0.4);
        // flow streaks: bright dashes sliding downstream, stronger where it moves fast
        float along = dot(p, dir), across = dot(p, vec2(-dir.y, dir.x));
        float lane = smoothstep(0.55, 0.95, sin(across * 6.5 + sin(along * 0.8) * 1.4));
        float dash = smoothstep(-0.3, 0.9, sin(along * 1.3 - t * (0.25 + sp * uStreak.x)));
        float streak = lane * dash * smoothstep(0.08, 0.5, sp) * (1.0 - smoothstep(0.3, 0.9, depth) * 0.7) * uStreak.y;
        float edge = 1.0 - smoothstep(0.0, 0.04, depth);
        float foam = edge * (0.4 + 0.3 * sin(p.x * 1.7 + p.y * 1.3 - t * 1.5)) + streak * 0.7;
        float ring = 0.0;
        for (int i = 0; i < 8; i++) {
          vec4 rp = uRip[i];
          if (rp.w <= 0.0) continue;
          float age = t - rp.z;
          float rad = age * (1.6 + rp.w * 1.2);
          float w = 0.12 + age * 0.12;
          float x = (length(p - rp.xy) - rad) / w;
          ring += exp(-x * x) * rp.w * exp(-age * 1.1) * step(0.0, age);
        }
        col += vec3(0.25, 0.3, 0.3) * ring;
        foam = max(foam, clamp(ring, 0.0, 1.0));
        col = mix(col, vec3(1.0), clamp(foam, 0.0, 1.0) * 0.85);
        col += vec3(1.0, 0.97, 0.88) * spec * 0.8;
        float alpha = max(mix(0.62, 0.95, smoothstep(0.03, 0.6, depth)), foam * 0.9) * cover;
        float f = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
        gl_FragColor = vec4(mix(col, uFog, f), mix(alpha, cover, f));
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;
  scene.add(mesh);

  // ---------------------------------------------------------------- targets from the sim
  const surf = (c) => terr[c] + depth[c];
  function retarget(c) {
    const i = (c / H) | 0,
      j = c - i * H;
    const d = depth[c];
    const t = c * 4;
    // Sea-level water is the sea plane's job: draw nothing there (depth 0 also fades the mesh out smoothly).
    tgt[t] = d > 0 && terr[c] + d <= seaCm() + 2 ? 0 : d / 100;
    let fx = 0,
      fz = 0;
    if (d >= 2) {
      const l = i > 0 ? surf(c - H) : surf(c),
        r = i < W - 1 ? surf(c + H) : surf(c),
        up = j > 0 ? surf(c - 1) : surf(c),
        dn = j < H - 1 ? surf(c + 1) : surf(c);
      // downhill vector: +x when the surface is lower at larger i; +j is -z in the world
      fx = (l - r) / (2 * CELL * 100);
      fz = -(up - dn) / (2 * CELL * 100);
      const m = Math.hypot(fx, fz);
      if (m > 0) {
        const s = Math.min(flowMax, m * flowGain) / m;
        fx *= s;
        fz *= s;
      }
    }
    tgt[t + 2] = fx;
    tgt[t + 3] = fz;
    if (!inMoving[c]) {
      inMoving[c] = 1;
      moving.push(c);
    }
  }

  // Once per sim tick, after water.step(): find cells whose depth or ground changed and retarget them
  // and their neighbours (flow looks at the surface around a cell).
  function scan() {
    let any = false;
    for (let c = 0; c < N; c++)
      if (depth[c] !== lastD[c] || terr[c] !== lastT[c]) {
        lastD[c] = depth[c];
        lastT[c] = terr[c];
        chg[c] = 1;
        any = true;
      }
    if (!any) return;
    for (let c = 0; c < N; c++) {
      if (!chg[c]) continue;
      chg[c] = 0;
      const i = (c / H) | 0,
        j = c - i * H;
      retarget(c);
      if (i > 0) retarget(c - H);
      if (i < W - 1) retarget(c + H);
      if (j > 0) retarget(c - 1);
      if (j < H - 1) retarget(c + 1);
    }
  }

  function write(c) {
    const t = c * 4;
    pos[c * 3 + 1] = terr[c] / 100 + disp[t] + 0.012;
    info[t] = disp[t];
    info[t + 1] = disp[t + 1];
    info[t + 2] = disp[t + 2];
    info[t + 3] = disp[t + 3];
  }

  // Everything jumps to the sim state (first build, snapshot load).
  function syncAll() {
    lastD.fill(-1);
    lastT.fill(-1e9);
    scan();
    for (let c = 0; c < N; c++) {
      inMoving[c] = 0;
      disp.set(tgt.subarray(c * 4, c * 4 + 4), c * 4);
      write(c);
    }
    moving = [];
    posAttr.needsUpdate = infoAttr.needsUpdate = true;
  }

  // Every frame: ease the cells that changed towards the latest tick.
  function frame(dt) {
    if (moving.length === 0) return;
    const k = 1 - Math.exp(-dt * SURFACE_LOOK.easePerSec);
    const keep = [];
    for (const c of moving) {
      const t = c * 4;
      let far = false;
      for (let q = 0; q < 4; q++) {
        const diff = tgt[t + q] - disp[t + q];
        if (Math.abs(diff) > (q === 0 ? 0.0004 : 0.004)) {
          disp[t + q] += diff * k;
          far = true;
        } else disp[t + q] = tgt[t + q];
      }
      write(c);
      if (far) keep.push(c);
      else inMoving[c] = 0;
    }
    moving = keep;
    posAttr.needsUpdate = infoAttr.needsUpdate = true;
  }

  return { mesh, scan, frame, syncAll, flowTarget: tgt };
}
