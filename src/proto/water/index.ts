// ?proto=water (loaded by src/features/proto-water.ts): Ultra Water's ocean rewritten in TSL inside Boogle's renderer, on a
// full-scale demo island 2.4 km out from home. The demo scene is the default; &v=pop applies our water grade.
// Replaces the sea, sky and output transform on this page only; nothing else reads it.
// Local and cosmetic. docs/game-design/water-proto.md describes it; research: docs/research/ultra-water.md. Third-party
// notices: public/THIRD_PARTY_NOTICES.md. Serves DESIGN.md 1 (Toys before chores): the water is a reason to go in.
import * as THREE from 'three/webgpu';
import { softWall } from '../../entities/player/state.ts';
import { onFrame } from '../../loop.ts';
import { onPreStep, setCcd, teleport } from '../../physics/engine.ts';
import { waterField } from '../../physics/water-field.ts';
import { GRAVITY, PLAYER_MASS, PLAYER_R, SWIM_DEPTH } from '../../constants.ts';
import { cam, me } from '../../player/player.ts';
import { registerAction } from '../../player/controls.ts';
import { precompile } from '../../render/precompile.ts';
import { camera, scene, sun } from '../../render/scene.ts';
import { waterMat } from '../../render/water-render.ts';
import { demoSky } from './sky.ts';
import { installDemoPost } from './post.ts';
import { createCaustics } from './caustics.ts';
import { demoView } from './views.ts';
import { bakeFoam } from './foam.ts';
import { islandHeight, rockObstacle } from './height.ts';
import { buildIsland } from './island.ts';
import { bakeShoreMap } from './shore.ts';
import { createOcean } from './surface.ts';
import { createUnderwater } from './underwater.ts';
import { createSnow } from './snow.ts';
import { GRID, ISLAND_AT, SHORE } from './tuning.ts';

const t0 = performance.now();
const bake = bakeShoreMap(islandHeight, SHORE.extent, SHORE.size, rockObstacle);
void import('./spray.ts').then(({ startSpray }) => startSpray(bake));
const t1 = performance.now();
const foamTex = bakeFoam();
const t2 = performance.now();
const fftSource =
  new URLSearchParams(location.search).get('waves') !== 'analytic' ? (await import('./fft.ts')).fftWaves() : null;
const source = fftSource ?? (await import('./waves.ts')).analyticWaves();
const t3 = performance.now();
const causticLayer = fftSource?.fft.bands.indexOf(2) ?? -1;
const caustics =
  fftSource && causticLayer >= 0 ? createCaustics(fftSource.fft.moments, causticLayer, fftSource.fft.size) : null;
buildIsland(bake, caustics?.sample);
const ocean = createOcean(source, bake, foamTex);
const underwater = createUnderwater(ocean);
const post = installDemoPost();
const snow = createSnow();
scene.add(ocean.mesh);
scene.add(snow.mesh);
ocean.mesh.visible = new URLSearchParams(location.search).get('ocean') !== 'off'; // for cost: `perf --query`, with and without
void precompile(ocean.mesh);
console.info(
  `[water] shore bake ${(t1 - t0).toFixed(0)} ms, foam ${(t2 - t1).toFixed(0)} ms, slope tiles ${(t3 - t2).toFixed(0)} ms, ` +
    `${ocean.mesh.geometry.attributes.position!.count} vertices`,
);

// The far plane and the near one with it, which is what buys depth precision out to the horizon.
camera.far = GRID.far;
camera.near = 0.5;
camera.fov = demoView.fov;
camera.updateProjectionMatrix();
Object.assign(sun.shadow.camera, { left: -900, right: 900, top: 900, bottom: -900, near: 10, far: 5000 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.6;
softWall.at = Infinity; // this world runs well past the 510 m square the player's soft wall guards

// Prototype-only Owner movement, through the existing Rapier body. Space/A remains swim up.
let diving = false;
registerAction('water-dive', {
  pad: 'right',
  key: 'KeyC',
  label: 'Swim down',
  group: 'move',
  context: 'swimming',
  down: () => {
    diving = true;
  },
  up: () => {
    diving = false;
  },
});
addEventListener('blur', () => {
  diving = false;
});
onPreStep(
  () => {
    const b = me.body;
    if (!b || !diving) return;
    const depth = waterField.surfaceAt(b.position.x, b.position.z) - (b.position.y + SWIM_DEPTH);
    if (depth < -0.15) return;
    // Cancel the existing buoyancy while held, then steer to 2.5 m/s down. Collisions still own the position.
    if (depth > 0)
      b.force.y -= PLAYER_MASS * GRAVITY * (1 + Math.min(depth * 2.2, 1.4)) - PLAYER_MASS * 3 * b.velocity.y;
    b.force.y += PLAYER_MASS * (GRAVITY + (-2.5 - b.velocity.y) * 8);
  },
  { order: 1001 },
);
onFrame(
  ({ elapsed, dt }) => {
    ocean.update(camera, elapsed, sun, hemi);
    caustics?.update(demoSky.sunDirection.value);
    underwater.update(elapsed, dt);
    snow.update(underwater.near.value as boolean);
    post.update(dt);
  },
  { phase: 'late', order: 1100 }, // after the look harness's debug camera (1000), before render
);

const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
  THREE.HemisphereLight | undefined;
let hidGameSea = false,
  placed = false;
// day-night.ts runs updateSky at update -5; this page then holds the source view's sun and atmosphere over it.
onFrame(
  () => {
    demoSky.update({ elevation: demoView.elevation, azimuth: demoView.azimuth });
    const fog = scene.fog as THREE.Fog;
    fog.near = 18000;
    fog.far = 80000;
  },
  { phase: 'update', order: -4 },
);
onFrame(
  () => {
    if (!hidGameSea) {
      hidGameSea = true;
      scene.traverse((o) => {
        if ((o as THREE.Mesh).material === waterMat) o.visible = false;
      });
    }
    const b = me.body;
    if (b && !placed) {
      placed = true;
      setCcd(b, false);
      teleport(
        b,
        demoView.cam[0],
        Math.max(islandHeight(demoView.cam[0] - ISLAND_AT.x, demoView.cam[2] - ISLAND_AT.z), 0) + PLAYER_R + 0.5,
        demoView.cam[2],
      );
      b.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = Math.atan2(demoView.cam[0] - demoView.look[0], demoView.cam[2] - demoView.look[2]);
    }
  },
  { phase: 'world', order: 41 }, // after the prototype bar places you (order 40)
);

// Open on the actual Lagoon shot; movement returns the camera to the usual player follow.
let establishing = true;
addEventListener('keydown', (e) => {
  if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code))
    establishing = false;
});
onFrame(
  () => {
    if (me.wish.lengthSq() > 0) establishing = false;
    if (!establishing) return;
    camera.position.set(...demoView.cam);
    camera.lookAt(...demoView.look);
    camera.updateMatrixWorld();
  },
  { phase: 'late', order: 999 },
);
