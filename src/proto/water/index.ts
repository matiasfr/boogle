// ?proto=water (loaded by src/features/proto-water.ts): Ultra Water's ocean rewritten in TSL inside Boogle's renderer, on a
// test island 2.4 km out from home. It starts from that water's own numbers and moves toward our toon world by changing
// parameters (./tuning.ts); `&v=raw` plays them unchanged. Replaces the sea on this page only; nothing else reads it.
// Local and cosmetic. docs/game-design/water-proto.md describes it; research: docs/research/ultra-water.md. Third-party
// notices: public/THIRD_PARTY_NOTICES.md. Serves DESIGN.md 1 (Toys before chores): the water is a reason to go in.
import * as THREE from 'three/webgpu';
import { softWall } from '../../entities/player/state.ts';
import { onFrame } from '../../loop.ts';
import { setCcd, teleport } from '../../physics/engine.ts';
import { PLAYER_R } from '../../constants.ts';
import { cam, camConstraints, me } from '../../player/player.ts';
import { precompile } from '../../render/precompile.ts';
import { camera, scene, sun } from '../../render/scene.ts';
import { seaU, waterMat } from '../../render/water-render.ts';
import { holdDay } from '../crossing/sky.ts';
import { bakeFoam } from './foam.ts';
import { islandHeight, rockObstacle } from './height.ts';
import { buildIsland } from './island.ts';
import { bakeShoreMap } from './shore.ts';
import { createOcean } from './surface.ts';
import { GRID, ISLAND_AT, SHORE, SPAWN } from './tuning.ts';
import { analyticWaves } from './waves.ts';

const t0 = performance.now();
const bake = bakeShoreMap(islandHeight, SHORE.extent, SHORE.size, rockObstacle);
void import('./spray.ts').then(({ startSpray }) => startSpray(bake));
const t1 = performance.now();
const foamTex = bakeFoam();
const t2 = performance.now();
const source =
  new URLSearchParams(location.search).get('waves') !== 'analytic'
    ? (await import('./fft.ts')).fftWaves()
    : analyticWaves();
const t3 = performance.now();
buildIsland(bake);
const ocean = createOcean(source, bake, foamTex);
scene.add(ocean.mesh);
ocean.mesh.visible = new URLSearchParams(location.search).get('ocean') !== 'off'; // for cost: `perf --query`, with and without
void precompile(ocean.mesh);
console.info(
  `[water] shore bake ${(t1 - t0).toFixed(0)} ms, foam ${(t2 - t1).toFixed(0)} ms, slope tiles ${(t3 - t2).toFixed(0)} ms, ` +
    `${ocean.mesh.geometry.attributes.position!.count} vertices`,
);

// The far plane and the near one with it, which is what buys depth precision out to the horizon.
camera.far = GRID.far;
camera.near = 0.25;
camera.updateProjectionMatrix();
softWall.at = Infinity; // this world runs well past the 510 m square the player's soft wall guards

// Stands in for what the water can't do yet: from below the surface draws nothing, so the camera stays above it.
camConstraints.push((_, pos) => {
  if (Math.hypot(pos.x - ISLAND_AT.x, pos.z - ISLAND_AT.z) > 40) pos.y = Math.max(pos.y, 0.4);
  return false;
});

const hemi = scene.children.find((o) => (o as THREE.HemisphereLight).isHemisphereLight) as
  THREE.HemisphereLight | undefined;
let hidGameSea = false,
  placed = false;
const FOG = new THREE.Color('#A4C8F0');
// day-night.ts runs updateSky at update -5, so this holds the crossing's late-morning palette over it, as sky.ts does there.
onFrame(
  () => {
    holdDay();
    const fog = scene.fog as THREE.Fog;
    fog.color.copy(FOG);
    fog.near = 500;
    fog.far = 5200;
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
    ocean.update(camera, seaU.uTime.value as number, sun, hemi);
    const b = me.body;
    if (b && !placed) {
      placed = true;
      setCcd(b, false);
      teleport(
        b,
        SPAWN.x,
        Math.max(islandHeight(SPAWN.x - ISLAND_AT.x, SPAWN.z - ISLAND_AT.z), 0) + PLAYER_R + 0.5,
        SPAWN.z,
      );
      b.velocity.set(0, 0, 0);
      cam.yaw = me.yaw = SPAWN.yaw;
    }
  },
  { phase: 'world', order: 41 }, // after the prototype bar places you (order 40)
);
