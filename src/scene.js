import * as THREE from 'three';
import { SUN_DIR, FOG_HEX, FOG_NEAR, FOG_FAR, isTouch } from './constants.js';
import { srgbVec } from './math.js';

export const canvas = document.getElementById('view');

export let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  document.getElementById('lobby-sub').textContent =
    'This browser cannot start WebGL, which Boogle needs to draw the island.';
  throw new Error('WebGL unavailable');
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.NoToneMapping;

export const scene = new THREE.Scene();
scene.fog = new THREE.Fog(FOG_HEX, FOG_NEAR, FOG_FAR);
export const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1500);

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / Math.max(1, innerHeight);
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Where world point v lands on a w x h screen, in pixels (y down): out.x, out.y, and out.behind when it is behind the
// camera (x and y then come out mirrored through the centre). Uses the camera's matrices as they are. Returns out.
const ndc = new THREE.Vector3();
export function toScreen(v, out, w = innerWidth, h = innerHeight) {
  ndc.copy(v).project(camera);
  out.x = (ndc.x * 0.5 + 0.5) * w;
  out.y = (-ndc.y * 0.5 + 0.5) * h;
  out.behind = ndc.z > 1;
  return out;
}

scene.add(new THREE.HemisphereLight('#d4f0ff', '#e6d3a0', 1.25));
export const sun = new THREE.DirectionalLight('#fff3da', 2.4);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(isTouch ? 1024 : 2048); // phones: a quarter of the shadow fill cost
Object.assign(sun.shadow.camera, { left: -36, right: 36, top: 36, bottom: -36, near: 1, far: 180 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

export const sky = new THREE.Mesh(
  new THREE.SphereGeometry(700, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uTop: { value: srgbVec('#3d9de3') }, uHorizon: { value: srgbVec(FOG_HEX) }, uSun: { value: SUN_DIR } },
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSun; varying vec3 vDir;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(uHorizon, uTop, pow(max(d.y, 0.0), 0.6));
        float s = max(dot(d, uSun), 0.0);
        col += vec3(1.0, 0.95, 0.8) * (pow(s, 900.0) * 1.2 + pow(s, 30.0) * 0.18);
        gl_FragColor = vec4(min(col, 1.0), 1.0);
      }`,
  }),
);
sky.renderOrder = -1;
scene.add(sky);
