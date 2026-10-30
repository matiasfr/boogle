import * as THREE from 'three';
import { GRID_RES, HALF, CELL, SUN_DIR, FOG_HEX, FOG_NEAR, FOG_FAR } from '../constants.js';
import { clamp, srgbVec } from '../math.js';
import { heights } from '../adapters/terrain.js';
import { scene } from './scene.js';
import { onFrame } from '../loop.js';

// Ground height packed into 16 bits (R = high byte, G = low byte) so centimetre edits show up.
function encodeHeight(data, k, h) {
  const v = Math.round(clamp((h + 10) / 20, 0, 1) * 65535);
  data[k] = v >> 8;
  data[k + 1] = v & 255;
  data[k + 3] = 255;
}

const heightTex = (() => {
  const data = new Uint8Array(GRID_RES * GRID_RES * 4);
  for (let j = 0; j < GRID_RES; j++)
    for (let i = 0; i < GRID_RES; i++) {
      const k = (j * GRID_RES + i) * 4;
      encodeHeight(data, k, heights[i][j]);
    }
  const t = new THREE.DataTexture(data, GRID_RES, GRID_RES, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
})();

export const waterMat = new THREE.ShaderMaterial({
  transparent: true,
  uniforms: {
    uTime: { value: 0 },
    uRip: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, 0)) },
    uHeight: { value: heightTex },
    uSun: { value: SUN_DIR },
    uSky: { value: srgbVec('#a9dcf3') },
    uLight: { value: new THREE.Vector3(1, 1, 1) }, // overall light tint (day/night, src/render/sky.js)
    uSpecCol: { value: new THREE.Vector3(1.0, 0.97, 0.88) }, // glint colour of the key light (sun or moon)
    uFog: { value: srgbVec(FOG_HEX) },
    uFogNear: { value: FOG_NEAR },
    uFogFar: { value: FOG_FAR },
  },
  vertexShader: `
    uniform float uTime; varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      w.y += sin(w.x * 0.21 + uTime * 1.3) * 0.06 + cos(w.z * 0.17 - uTime * 1.1) * 0.06;
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }`,
  fragmentShader: `
    uniform float uTime; uniform vec4 uRip[8]; uniform sampler2D uHeight; uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uFog; uniform vec3 uLight; uniform vec3 uSpecCol;
    uniform float uFogNear; uniform float uFogFar; varying vec3 vWorld;
    const float HALF = ${HALF.toFixed(4)}; const float CELL = ${CELL.toFixed(6)}; const float RES = ${GRID_RES.toFixed(1)};
    void main() {
      vec2 uv = vec2((vWorld.x + HALF) / CELL + 0.5, (HALF - vWorld.z) / CELL + 0.5) / RES;
      vec4 ht = texture2D(uHeight, uv);
      float ground = (ht.r * 255.0 * 256.0 + ht.g * 255.0) / 65535.0 * 20.0 - 10.0;
      float depth = max(vWorld.y - ground, 0.0);
      vec3 col = mix(vec3(0.42, 0.90, 0.86), vec3(0.10, 0.70, 0.80), smoothstep(0.0, 2.5, depth));
      col = mix(col, vec3(0.05, 0.38, 0.64), smoothstep(2.5, 9.0, depth));
      vec2 p = vWorld.xz; float t = uTime;
      float n1 = sin(p.x * 0.43 + t * 1.2) * cos(p.y * 0.37 - t * 0.9);
      float n2 = sin((p.x + p.y) * 1.1 - t * 1.9);
      float n3 = cos((p.x - p.y) * 0.8 + t * 1.4);
      vec3 nrm = normalize(vec3(n1 * 0.12 + n2 * 0.06, 1.0, n3 * 0.06 - n1 * 0.08));
      vec3 viewDir = normalize(cameraPosition - vWorld);
      float spec = pow(max(dot(nrm, normalize(uSun + viewDir)), 0.0), 140.0);
      float fres = pow(1.0 - max(viewDir.y, 0.0), 4.0);
      col = mix(col, uSky, fres * 0.45);
      float band = 1.0 - smoothstep(0.0, 0.6, depth);
      float ripple = 0.5 + 0.5 * sin(depth * 10.0 - t * 2.4 + sin(p.x * 0.15 + p.y * 0.11) * 3.0);
      float foam = band * smoothstep(0.45, 0.85, ripple * 0.7 + band * 0.5);
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
      col = mix(col, vec3(1.0), foam * 0.9);
      col *= uLight;
      col += uSpecCol * spec * 0.9;
      float alpha = max(mix(0.5, 0.97, smoothstep(0.2, 5.0, depth)), foam * 0.95);
      float f = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
      gl_FragColor = vec4(mix(col, uFog, f), mix(alpha, 1.0, f));
    }`,
});

// late 3010, last hook before render, after the presence send (net.js, 3000): the sea's clock. Everything earlier in
// the frame (the fish share this uniform) still sees last frame's value, as before.
onFrame(
  ({ elapsed }) => {
    waterMat.uniforms.uTime.value = elapsed;
  },
  { phase: 'late', order: 3010 },
);

export function createWaterMesh() {
  const geo = new THREE.PlaneGeometry(1300, 1300, 100, 100); // ~13 m quads; the vertex wave is ~30 m long
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMat);
  scene.add(mesh);
  return mesh;
}
