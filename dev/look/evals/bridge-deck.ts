// npm run look -- --rail-seed works-lit --eval dev/look/evals/bridge-deck.ts --cam 950.5548479191359,22.5133319989323,15.1780941687349 --look 944.5548479191359,18.35,19.1780941687349 --fov 50 --warm 3 --name bridge-deck
// A close view 30 degrees above the resting bridge: both timber/steel long edges, away from the end handrails.
const { railReady } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
if (!(await railReady()) || !me.body) throw new Error('Bridge capture: railway not ready');
teleport(me.body, 954, 19.2, 14);
me.body.velocity.set(0, 0, 0);
export {};
