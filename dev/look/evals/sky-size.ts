// Shot setup: inspect the real loading result, before any comparison capture.
const { waterRuntime } = (await import(
  '/src/render/water-render.ts' as string
)) as typeof import('../../../src/render/water-render.ts');
type Cube = { cubeSize: number; bakes: number; mipLevels: number };
const sky = waterRuntime.inspect().sky as Cube & {
  ready: boolean;
  evening?: Cube;
  transition?: { current: string; phase: string };
};
const query = new URLSearchParams(location.search);
const size = query.get('skySize');
const expectedSize = size === '256' ? 256 : size === '512' ? 512 : 1024;
const prepared = query.get('evening') === '1' || query.get('evening') === 'preview';
const valid = (cube: Cube) =>
  cube.cubeSize === expectedSize && cube.bakes === 1 && cube.mipLevels === Math.log2(expectedSize) + 1;
if (!sky.ready || !valid(sky)) throw new Error('Day sky size/bake mismatch');
if (prepared !== !!sky.evening || (sky.evening && !valid(sky.evening)))
  throw new Error('Prepared evening sky size/bake mismatch');
if (
  prepared &&
  (sky.transition?.current !== (query.get('evening') === '1' ? 'evening' : 'day') || sky.transition.phase !== 'idle')
)
  throw new Error('Prepared evening selection mismatch');
console.info('SKY SIZE CHECK ' + JSON.stringify(sky));
export {};
