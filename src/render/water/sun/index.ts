// Candidates A (`?water=sun`) and B (`?water=sun-depth`) behind the sea seam; loaded only when chosen, so Ultra's bundle
// and load are unchanged. Plan: docs/plans/water-sunshine.md.
import type { SeaSurface, SurfaceContext } from '../sea-surface.ts';
import { bakeWaveCell, WAVE_SIZE } from './art.ts';
import { createStaticCaustics } from './caustics.ts';
import { createCoast } from './coast.ts';
import { createSwellProvider } from './field.ts';
import { createSunOcean } from './surface.ts';

export function createSunSurface(context: SurfaceContext, depth: boolean): SeaSurface {
  const coast = createCoast();
  coast.sync();
  const waveTex = bakeWaveCell();
  const caustics = createStaticCaustics();
  const ocean = createSunOcean({ sky: context.sky, coast, waveTex, fog: context.fog, far: context.far, depth });
  const field = createSwellProvider(coast);
  return {
    ocean,
    provider: field.provider,
    receivers: { field: coast.field, caustics: caustics.sample },
    shelf: coast.shelfBelow,
    sprayAtlas: null,
    publish: field.publish,
    sync: coast.sync,
    afterOcean() {},
    prepare: async () => {},
    start() {},
    warmDraw() {},
    describe: () => ({
      surface: depth ? 'sun-depth' : 'sun',
      vertices: ocean.vertices(),
      field: field.inspect(),
      textureBytes: { wave: Math.round((WAVE_SIZE * WAVE_SIZE * 4 * 4) / 3), caustic: caustics.bytes },
      ...coast.inspect(),
    }),
    dispose() {
      ocean.dispose();
      caustics.dispose();
      waveTex.dispose();
      coast.dispose();
    },
  };
}
