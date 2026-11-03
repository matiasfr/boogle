// The retained demo supplies its own sky, origin, look and shore fields to the production surface.
import type * as THREE from 'three/webgpu';
import { createOcean as createSurface, waterLighting } from '../../render/water/surface.ts';
import { ROCK } from './height.ts';
import { demoSky } from './sky.ts';
import { GRID, ISLAND_AT, LOOK } from './tuning.ts';
import { shoreFields, SHORE_WAVE, shoreNoisePhase, shoreGroup, shoreExposure, type ShoreBake } from './shore-nodes.ts';
import type { WaveSource } from './waves.ts';
export type { Ocean } from '../../render/water/surface.ts';
export const { waterSun, waterScatter, waterAbsorption, deepWater } = waterLighting(demoSky, LOOK);
export const createOcean = (source: WaveSource, bake: ShoreBake, foam: THREE.Texture) =>
  createSurface(source, shoreFields(bake), foam, {
    sky: demoSky,
    look: LOOK,
    grid: GRID,
    phaseOrigin: ISLAND_AT,
    shoreMotion: { wave: SHORE_WAVE, noisePhase: shoreNoisePhase, group: shoreGroup, exposure: shoreExposure },
    repeatColorCopy: new URLSearchParams(location.search).get('waterCopy') === 'repeat',
    foamObstacles: [{ x: ISLAND_AT.x + ROCK.x, z: ISLAND_AT.z + ROCK.z, radius: ROCK.r }],
  });
