// Shot setup: inspect the real loading result, before any comparison capture.
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
const { eveningPreview, prepareEvening, skyCubeSize } = (await import(
  '/src/render/water/flags.ts' as string
)) as typeof import('../../../src/render/water/flags.ts');
type Cube = { cubeSize: number; bakes: number; mipLevels: number };
const sky = waterRuntime.inspect().sky as Cube & {
  ready: boolean;
  evening?: Cube;
  transition?: { current: string; phase: string };
};
const valid = (cube: Cube) =>
  cube.cubeSize === skyCubeSize && cube.bakes === 1 && cube.mipLevels === Math.log2(skyCubeSize) + 1;
if (!sky.ready || !valid(sky)) throw new Error('Day sky size/bake mismatch');
if (prepareEvening !== !!sky.evening || (sky.evening && !valid(sky.evening)))
  throw new Error('Prepared evening sky size/bake mismatch');
if (
  prepareEvening &&
  (sky.transition?.current !== (eveningPreview === '1' ? 'evening' : 'day') || sky.transition.phase !== 'idle')
)
  throw new Error('Prepared evening selection mismatch');
console.info('SKY SIZE CHECK ' + JSON.stringify(sky));
export {};
