// Setup for the instant-feedback capture (replication R1b): land, walk the opening path, wake the machine through
// ordinary input, then stand facing the nearest reachable ordinary tree. Pair with railway-instant-act.ts and
// &railLag=200 (added round trip on the railway's own messages), for example:
//   npm run look -- --eval dev/look/evals/railway-instant.ts --action dev/look/evals/railway-instant-act.ts \
//     --query 'shot=play&railLag=200' --video --seconds 16 --name instant-200
const { accounts, inspectRailway, rail, railAt, railPhase, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { fallArrival } = (await import(
  '/src/fall/arrival.ts' as string
)) as typeof import('../../../src/fall/arrival.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const [{ PATH_SAMPLES }, layout] = await Promise.all([
  import('/src/place/terrain.ts' as string) as Promise<typeof import('../../../src/place/terrain.ts')>,
  import('/src/place/layout.ts' as string) as Promise<typeof import('../../../src/place/layout.ts')>,
]);
const bot = makeBot({
  recover: () => {
    throw new Error('Instant-feedback capture needed recovery');
  },
});
const read = () => inspectRailway()!;
const phase = () => railPhase(rw(), railAt(), railAt());
const need = async (fn: () => unknown, what: string) => {
  if (!(await bot.until(fn, 300000))) throw new Error(what);
};
if (!(await bot.until(() => !!me.body && railRead()?.ready(), 300000))) {
  const r = railRead();
  throw new Error(
    `The railway never became ready: ${JSON.stringify(r && { status: r.status(), connected: r.debug().connected, synced: r.debug().synced, epoch: r.debug().epoch, accounts: accounts(r.world()).length })}`,
  );
}
await need(() => !fallArrival.active && me.coyote > 0 && !me.swimming, 'The arrival never landed');
for (let i = 0; i < PATH_SAMPLES[0]!.length; i += 3) {
  const point = PATH_SAMPLES[0]![i]!;
  if (!(await bot.walk(point[0] + layout.ORIGIN.x, point[1]))) throw new Error('Opening path blocked');
}
const machine = read().machine;
if (phase() === 'asleep' && !(await bot.use(machine.x, machine.z, 'wake the machine', /^Wake it up$/)))
  throw new Error('Wake was not offered');
// Two frames after the press (the hands read it on the next frame): well inside one 100 ms leg of a 200 ms trip.
const pressedAt = performance.now();
await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const wakeAtPress = { phase: phase(), ms: Math.round(performance.now() - pressedAt), pending: read().pending };
await need(() => phase() === 'idle', 'The machine never woke');
// The wake reveals the multi-axe; it holds the player until dismissed with Interact, as the route bot does.
await need(() => read().reward.showing, 'The multi-axe reveal never showed');
await bot.wait(1600);
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', bubbles: true }));
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', bubbles: true }));
await need(() => !read().reward.showing, 'The multi-axe reveal was not dismissed');
const p = me.body!.position;
const candidates = read()
  .trees.filter((t) => !t.cleared && t.remaining > 0 && t.id !== 28 && t.id !== 209 && t.id !== 232)
  .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z));
let tree: (typeof candidates)[number] | undefined;
for (const candidate of candidates.slice(0, 20)) {
  const route = await bot.plan(candidate.x, candidate.z, 2.6);
  if (!route.arrives || !route.path.every((point) => point.y >= 3)) continue;
  if (await bot.walk(candidate.x, candidate.z, 2.6)) {
    tree = candidate;
    break;
  }
}
if (!tree) throw new Error('Could not reach an ordinary tree to chop');
const q = me.body!.position;
cam.yaw = me.yaw = Math.atan2(-(tree.x - q.x), -(tree.z - q.z));
console.log(
  `RAILWAY INSTANT setup ${JSON.stringify({
    tree: tree.id,
    wakeAtPress,
    awake: rail(rw()).awake,
    lag: new URLSearchParams(location.search).get('railLag'),
  })}`,
);
export {};
