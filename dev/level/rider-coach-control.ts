// Inspection-only causal controls, before importing any sim module. No file or live-room mutations.
// R2B_CONTROL=baseline|cap|geometry|home|ring|tail|current node --import ./dev/level/rider-coach-control.ts ...
import { registerHooks } from 'node:module';
const mode = process.env.R2B_CONTROL ?? 'current';
if (
  !['baseline', 'cap', 'geometry', 'home', 'ring', 'tail', 'current', 'namespace', 'gorge', 'pre-gorge'].includes(mode)
)
  throw new Error(`Bad control: ${mode}`);
const enabled = (key: string) =>
  mode === 'current' ||
  (mode === 'pre-gorge' && key !== 'gorge') ||
  mode === key ||
  (mode === 'geometry' && key !== 'cap');
const changes = [
  ['/src/world/railway-server.ts', 'RIDER_SPAN = 1450', 'RIDER_SPAN = 1110', 'tail'],
  [
    '/src/sim/railway-world-lines.ts',
    'sCm: 319300, x: -5698, z: -195221, y: 370',
    'sCm: 319640, x: -5946, z: -195454, y: 358',
    'gorge',
  ],
  ['/src/sim/railway-trade-layout.ts', 'riderPlaces: 8,', 'riderPlaces: 4,', 'cap'],
  ['/src/sim/railway-lines.ts', 'behindCm: 1610', 'behindCm: 1270', 'tail'],
  ['/src/sim/railway-lines.ts', 's: 2165,', 's: 1825,', 'home'],
  ['/src/sim/railway-ring-layout.ts', 'u: RING_END_U + 340,', 'u: RING_END_U,', 'ring'],
  ['/src/sim/railway-ring-layout.ts', 's: RING_S_HEAD + RING_END_U + 340,', 's: RING_S_HEAD + RING_END_U,', 'ring'],
];
registerHooks({
  load(url, context, next) {
    const out = next(url, context);
    let source = out.source;
    if (mode === 'baseline' && url.endsWith('/src/world/namespace.ts'))
      source = String(source).replace("WORLD_NS = 'v57'", "WORLD_NS = 'v56'");
    for (const [file, from, to, key] of changes) {
      if (!url.endsWith(file!) || enabled(key!)) continue;
      source = String(source);
      if (source.split(from!).length !== 2) throw new Error(`Control source changed: ${file} ${from}`);
      source = source.replace(from!, to!);
    }
    return { ...out, source };
  },
});
