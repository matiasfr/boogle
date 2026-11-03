// A frozen Ultra Water sky on any page. DESIGN.md: Show, don't tell; Small and readable.
// Reuses the demo's Hillaire LUTs/cloud cube; see docs/research/ultra-water.md and sky-comparison.md.
import * as THREE from 'three/webgpu';
import { cameraPosition, fog, normalize, positionWorld, rangeFogFactor, uniform, uv, vec3, vec4 } from 'three/tsl';
import { onFrame } from '../loop.ts';
import { renderer, rendererReady, scene, sun } from '../render/scene.ts';
import { clouds } from '../render/props.ts';
import { skyDebug } from '../render/sky.ts';
import { SUN_DIR } from '../render/sun-dir.ts';
import { skyState } from '../sim/sky-clock.ts';
import { demoSky } from './water/sky.ts';

const q = new URLSearchParams(location.search);
const raw = q.has('tod') ? Number(q.get('tod')) : 0.24;
export const tod = Number.isFinite(raw) ? ((raw % 1) + 1) % 1 : 0.24;
const noon = new THREE.Vector3(0.45, 0.78, 0.32).normalize();
const east = new THREE.Vector3().crossVectors(noon, new THREE.Vector3(0, 1, 0)).normalize();
const angle = skyState(tod, 0.5).sunAngle;
const direction = east.multiplyScalar(Math.cos(angle)).addScaledVector(noon, Math.sin(angle));
const params = {
  elevation: THREE.MathUtils.radToDeg(Math.asin(direction.y)),
  azimuth: THREE.MathUtils.radToDeg(Math.atan2(direction.x, direction.z)),
};
await rendererReady;
if (q.get('skyBake') === '1') {
  const { measureSkyBake } = await import('../debug/sky-bake.ts');
  await measureSkyBake(() => demoSky.update(params));
} else demoSky.update(params);

// Lambert toy materials do not receive scene.environment. Sample the same cube at its coarsest mip for their fill.
const fillTarget = new THREE.RenderTarget(2, 1, { type: THREE.FloatType, depthBuffer: false });
const fillMaterial = new THREE.MeshBasicNodeMaterial({ depthTest: false, depthWrite: false });
fillMaterial.fragmentNode = vec4(demoSky.ambient(vec3(0, uv().x.lessThan(0.5).select(1, -1), 0)), 1);
const previous = renderer.getRenderTarget();
renderer.setRenderTarget(fillTarget);
new THREE.QuadMesh(fillMaterial).render(renderer);
renderer.setRenderTarget(previous);
const pixels = (await renderer.readRenderTargetPixelsAsync(fillTarget, 0, 0, 2, 1)) as Float32Array;
const upper = new THREE.Color().fromArray(pixels, 0),
  lower = new THREE.Color().fromArray(pixels, 4);
fillTarget.dispose();
fillMaterial.dispose();
const near = uniform(110),
  far = uniform(520);
scene.fogNode = fog(demoSky.skyLod(normalize(positionWorld.sub(cameraPosition)), 3), rangeFogFactor(near, far));
const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
  THREE.HemisphereLight | undefined;
const shadowAt = new THREE.Vector3();
// Prototype looks write lighting in update. Apply last, after the debug camera too, without touching their internals.
onFrame(
  () => {
    skyDebug.preview(tod, 0.5);
    shadowAt.copy(sun.target.position);
    demoSky.update(params); // cached: no LUT/cube work after the first bake
    for (const cloud of clouds) cloud.visible = false;
    SUN_DIR.copy(direction);
    // Keep the game's tight shadow frustum centred on its existing target, at its usual light distance.
    sun.target.position.copy(shadowAt);
    sun.position.copy(direction).multiplyScalar(80).add(sun.target.position);
    if (q.get('proto') === 'water') sun.position.copy(direction).multiplyScalar(2000).add(sun.target.position);
    sun.shadow.intensity = 1;
    sun.shadow.autoUpdate = sun.intensity > 0.01;
    if (hemi) {
      hemi.color.copy(upper);
      hemi.groundColor.copy(lower);
      hemi.intensity = Math.PI;
    }
    const f = scene.fog as THREE.Fog;
    near.value = f.near;
    far.value = f.far;
  },
  { phase: 'late', order: 1090 },
);
console.info('DEMO SKY ' + JSON.stringify({ tod, ...params, upper: upper.toArray(), lower: lower.toArray() }));
