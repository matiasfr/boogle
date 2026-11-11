// J4 Works moments as a person does them, for `look --action` after `--eval railway-works-at.ts` (which poses the
// player): `worksdo=take|strike0|strike1|foot|set|turn`, and (J5) `pier`: shoulder a footing off the pier rack, then
// set it from the pier-head apron (pose `pierhead`, seed `crossing-finishing`; `pierN=2` sets both). The bot is set down a few metres short of the thing on the
// pose's side, walks up and presses what the game offers; the motion sheet then films what follows.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailwayLegacy } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { STALL_SOCKETS } = (await import(
  '/src/entities/railway/works-shape.ts' as string
)) as typeof import('../../../src/entities/railway/works-shape.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { H } = (await import('/src/place/land.ts' as string)) as typeof import('../../../src/place/land.ts');
const doing = new URLSearchParams(location.search).get('worksdo') ?? '';
const bot = makeBot();
const socket = STALL_SOCKETS[0]!;
type Move = [number, number, RegExp];
const BREAKER: Move = [919, 5.4, /Take the breaker/];
const moves: Record<string, Move> = {
  take: BREAKER,
  strike0: [912.4, 17.6, /Strike the seam/],
  strike1: [1119, 82, /Strike the seam/],
  foot: [1088, 50, /Shoulder a footing/],
  set: [socket.x, socket.z, /Set the footing/],
  turn: [918, 12, /Turn the table/],
  kiln: [1128, 87, /Fill the kiln/],
  pier: [1398.94, -361.77, /Shoulder a footing/],
};
const move = moves[doing];
if (!move) throw new Error(`Choose worksdo=${Object.keys(moves).join('|')}`);
const start = { x: me.body!.position.x, y: me.body!.position.y, z: me.body!.position.z };
/** Set down 3.5 m short of (x, z) on the side of `from`, then walk up and press it. */
async function doAt([tx, tz, verb]: Move, from: { x: number; y: number; z: number }) {
  const d = Math.hypot(from.x - tx, from.z - tz);
  if (d > 4) {
    const x = tx + ((from.x - tx) / d) * 3.5,
      z = tz + ((from.z - tz) / d) * 3.5;
    teleport(me.body!, x, Math.max(H(x, z), from.y - 0.85) + 0.85, z);
    me.body!.velocity.set(0, 0, 0);
    await bot.wait(300);
  }
  return bot.use(tx, tz, verb.source, verb);
}
if ((doing === 'strike0' || doing === 'strike1') && inspectRailwayLegacy()!.works.breaker === 1) {
  // The breaker first, from the pedestal: the strike needs it in hand.
  if (!(await doAt(BREAKER, { x: 922, y: 19, z: 9 }))) throw new Error('no breaker');
  await bot.wait(600);
}
let from = start;
if (doing === 'kiln') {
  // `--rail-seed works-stocked`: chop the bowl rock's last stone, then the fill lights the kiln live.
  const rock = inspectRailwayLegacy()!.works.rocks[0]!;
  if (!(await doAt([rock.x / 100, rock.z / 100, /Chop/], start))) throw new Error('no rock');
  if (!(await bot.work(() => inspectRailwayLegacy()!.works.rocks[0]!.remaining === 0, 20000)))
    throw new Error('the rock never gave its stone');
  await bot.wait(500);
  const p = me.body!.position;
  from = { x: p.x, y: p.y, z: p.z };
}
// `workscam=play`: hand the view back to the game's camera just before the press (the throat's pull-out shot).
if (new URLSearchParams(location.search).get('workscam') === 'play') window.__debugCam?.clear();
if (!(await doAt(move, from))) throw new Error(`worksdo=${doing} was not offered`);
// `pierN=2`: both footings on the rack, so the last pair raises its bent and the crossing's show plays.
for (let n = 0; doing === 'pier' && n < Number(new URLSearchParams(location.search).get('pierN') ?? 1); n++) {
  if (n > 0 && !(await doAt(move, start))) throw new Error('no second pier take');
  await bot.wait(600);
  // Onto the apron beside the jib (the track between has Q6's parked machine), then set it.
  teleport(me.body!, 1405.4, 25.4, -365.5);
  me.body!.velocity.set(0, 0, 0);
  await bot.wait(400);
  if (!(await bot.use(1405.54, -371.07, 'set the footing', /Set the footing/))) throw new Error('no pier set');
  await bot.wait(800);
}
if (doing === 'foot') {
  // Carry it back toward the camera, so the worn footing and the stoop face the shot.
  await bot.wait(700);
  await bot.walk(start.x, start.z, 1);
}
console.log(`WORKS ACT ${doing} ${JSON.stringify(inspectRailwayLegacy()!.works)}`);
for (const ms of [0, 200, 400, 700, 1000, 1500, 2000, 3000, 5000, 8000])
  setTimeout(() => {
    const view = inspectRailwayLegacy() as unknown as { worksView: unknown; works: unknown };
    console.log(`WORKS AFTER ${ms} ${JSON.stringify({ view: view.worksView, works: view.works })}`);
  }, ms);
export {};
