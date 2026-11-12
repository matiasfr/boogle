// command: unknown, needs the beam checkpoint it follows: a --video/--curves run after dev/look/bots/railway.ts earns it (no doc or bot names the exact --query)
// A short ordinary-input beam walk for --video/--curves after the real-input beam checkpoint.
const { beam, inspectRailway, railPid, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const holds = () => beam(rw()).state === 'held' && beam(rw()).holder === railPid();
const state = inspectRailway();
if (!state || !holds() || !me.body) throw new Error('Beam motion needs the real-input T3 beam carried checkpoint');
const start = me.body.position;
const dx = state.station.x - start.x;
const dz = state.station.z - start.z;
const distance = Math.hypot(dx, dz);
if (distance < 5) throw new Error('Beam motion needs five metres before the T3 frame');
const target = { x: start.x + (dx / distance) * 5, z: start.z + (dz / distance) * 5 };
const bot = makeBot({
  recover: () => {
    throw new Error('Beam motion needed recovery');
  },
});
background(
  (async () => {
    if (!(await bot.straight(target.x, target.z, 0.5, 12000))) throw new Error('Beam walk did not reach five metres');
    if (!holds() || me.swimming) throw new Error('Beam walk did not retain its unique cargo on dry ground');
    console.log('RAILWAY BEAM MOTION walked five metres with unique beam');
  })(),
  'ordinary beam walk capture',
);
export {};
