// Browser-only input capture shared by the bake command and world-inputs. Read the actual initialized game:
// createStall adds a disc after props/state loads, so a reconstruction from the scatter alone misses an obstacle.
import type { BooglerLandBake } from '../src/world/boogler-land.ts';

export async function readBooglerLand(): Promise<BooglerLandBake> {
  const { baseCm, island } = await import('../src/island/index.ts');
  const { obstacles } = await import('../src/entities/props/state.ts');
  const { MAINLAND } = await import('../src/island/shape.ts');
  const { GRID_RES } = await import('../src/world/grid.ts');
  const bytes = new Uint8Array(baseCm.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < baseCm.length; i++) view.setInt16(i * 2, baseCm[i]!, true);
  const discs = (list: readonly { x: number; z: number; r: number }[]): [number, number, number][] =>
    list.map(({ x, z, r }) => [x, z, r]);
  return {
    n: GRID_RES,
    heights: btoa(Array.from(bytes, (v) => String.fromCharCode(v)).join('')),
    obstacles: discs(obstacles),
    keepOut: discs(island.keepOut),
    mainland: { ...MAINLAND },
  };
}
