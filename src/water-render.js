import * as THREE from 'three';
import { GRID_RES, HALF, CELL, SUN_DIR, FOG_HEX, FOG_NEAR, FOG_FAR } from './constants.js';
import { clamp, srgbVec } from './math.js';
import { heights } from './terrain.js';
import { scene } from './scene.js';

const heightTex = (() => {
  const data = new Uint8Array(GRID_RES * GRID_RES * 4);
  for (let j = 0; j < GRID_RES; j++)
    for (let i = 0; i < GRID_RES; i++) {
      const k = (j * GRID_RES + i) * 4;
      data[k] = Math.round(clamp((heights[i][j] + 10) / 20, 0, 1) * 255);
      data[k + 3] = 255;
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
    uHeight: { value: heightTex },
    uSun: { value: SUN_DIR },
    uSky: { value: srgbVec('#a9dcf3') },
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
    uniform float uTime; uniform sampler2D uHeight; uniform vec3 uSun; uniform vec3 uSky; uniform vec3 uFog;
    uniform float uFogNear; uniform float uFogFar; varying vec3 vWorld;
    const float HALF = ${HALF.toFixed(4)}; const float CELL = ${CELL.toFixed(6)}; const float RES = ${GRID_RES.toFixed(1)};
    void main() {
      vec2 uv = vec2((vWorld.x + HALF) / CELL + 0.5, (HALF - vWorld.z) / CELL + 0.5) / RES;
      float ground = texture2D(uHeight, uv).r * 20.0 - 10.0;
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
      col = mix(col, vec3(1.0), foam * 0.9);
      col += vec3(1.0, 0.97, 0.88) * spec * 0.9;
      float alpha = max(mix(0.5, 0.97, smoothstep(0.2, 5.0, depth)), foam * 0.95);
      float f = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
      gl_FragColor = vec4(mix(col, uFog, f), mix(alpha, 1.0, f));
    }`,
});

export function createWaterMesh() {
  const geo = new THREE.PlaneGeometry(1300, 1300, 260, 260);
  geo.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geo, waterMat);
  scene.add(mesh);
  return mesh;
}
