// J4 Works moments as a person does them, for `look --action` after `--eval railway-works-at.ts` (which poses the
// camera): `worksdo=take|strike0|strike1|foot|set|turn`. The bot walks up and presses what the game offers; the
// motion sheet then films what follows (the swing, the slab, the roll, the table).
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { STALL_SOCKETS } = (await import(
  '/src/entities/railway/works-shape.ts' as string
)) as typeof import('../../../src/entities/railway/works-shape.ts');
const doing = new URLSearchParams(location.search).get('worksdo') ?? '';
const bot = makeBot();
const socket = STALL_SOCKETS[0]!;
const moves: Record<string, [number, number, RegExp]> = {
  take: [919, 5.4, /Take the breaker/],
  strike0: [912.4, 17.6, /Strike the seam/],
  strike1: [1119, 82, /Strike the seam/],
  foot: [1088, 50, /Shoulder a footing/],
  set: [socket.x, socket.z, /Set the footing/],
  turn: [918, 12, /Turn the table/],
};
const move = moves[doing];
if (!move) throw new Error(`Choose worksdo=${Object.keys(moves).join('|')}`);
if (doing === 'strike0' || doing === 'strike1') {
  // The breaker first, from the pedestal: the strike needs it in hand.
  if (inspectRailway()!.works.breaker === 1 && !(await bot.use(919, 5.4, 'the breaker', /Take the breaker/)))
    throw new Error('no breaker');
  await bot.wait(600);
}
// Stand a few metres short of it on the pose's side (the eval put us there), so the walk is short and on camera.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/proto/place/land.ts' as string)) as typeof import('../../../src/proto/place/land.ts');
const p = me.body!.position,
  d = Math.hypot(p.x - move[0], p.z - move[1]);
if (d > 4) {
  const x = move[0] + ((p.x - move[0]) / d) * 3.5,
    z = move[1] + ((p.z - move[1]) / d) * 3.5;
  teleport(me.body!, x, Math.max(H(x, z), p.y - 0.85) + 0.85, z);
  me.body!.velocity.set(0, 0, 0);
  await bot.wait(300);
}
if (!(await bot.use(move[0], move[1], doing, move[2]))) throw new Error(`worksdo=${doing} was not offered`);
console.log(`WORKS ACT ${doing} ${JSON.stringify(inspectRailway()!.works)}`);
export {};
