// Setup for the instant-feedback capture (replication R1b): wake the machine through ordinary input, then stand facing
// the nearest ordinary tree. Pair with railway-instant-act.ts and &railLag=200 (added round trip on the railway's own
// messages), for example:
//   npm run look -- --eval dev/look/evals/railway-instant.ts --action dev/look/evals/railway-instant-act.ts \
//     --query 'shot=play&railLag=200' --video --seconds 12 --name instant-200
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const bot = makeBot({
  recover: () => {
    throw new Error('Instant-feedback capture needed recovery');
  },
});
const read = () => inspectRailway()!;
if (!(await bot.until(() => inspectRailway()?.ready && me.body, 60000)))
  throw new Error('The railway never became ready');
const machine = read().machine;
if (read().phase === 'asleep' && !(await bot.use(machine.x, machine.z, 'wake the machine', /^Wake it up$/)))
  throw new Error('Wake was not offered');
// Two frames after the press (the hands read it on the next frame): well inside one 100 ms leg of a 200 ms trip.
const pressedAt = performance.now();
await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const wakeAtPress = { phase: read().phase, ms: Math.round(performance.now() - pressedAt), pending: read().pending };
if (!(await bot.until(() => read().phase === 'idle', 30000))) throw new Error('The machine never woke');
const p = me.body!.position;
const tree = read()
  .trees.filter((t) => !t.cleared && t.remaining > 0 && t.id !== 28 && t.id !== 209 && t.id !== 232)
  .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
if (!tree) throw new Error('No ordinary tree to chop');
if (!(await bot.walk(tree.x, tree.z, 2.6))) throw new Error('Could not reach the tree');
const q = me.body!.position;
cam.yaw = me.yaw = Math.atan2(-(tree.x - q.x), -(tree.z - q.z));
(window as Window & { __instantTree?: number }).__instantTree = tree.id;
console.log(
  `RAILWAY INSTANT setup ${JSON.stringify({
    tree: tree.id,
    wakeAtPress,
    awake: read().awake,
    lag: new URLSearchParams(location.search).get('railLag'),
  })}`,
);
export {};
