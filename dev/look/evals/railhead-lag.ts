// Railhead traveller Checkpoint B's lagged-tab proof (docs/plans/railhead-traveller.md): two players at
// `--rail-seed ring-set-3`, both standing on the platform through one haul, one tab lagged by `&railLag=400`.
//   npm run look -- --players 2 --real --rail-seed ring-set-3 --query debugcam=1 --query2 railLag=400
//     --eval dev/look/evals/railhead-lag.ts --until window.__railheadMove --warm 240 --frames 4 --seconds 12
//     --name traveller-lag
// The first page shoulders a footing off the rack and sets it at the jib (as railhead-move.ts does); both pages then
// stand on the platform. From the set until the deck has settled, every 50 ms each page records the wall clock
// (Date.now: one machine, one clock), its own `railheadView.shownU`, the haul's phase, the deck under its own player
// (`carry.on`) and where it draws the friend against the platform as it draws it. Prints `LAGTRACE <page> [rows]`
// once a second; dev/look/lag-trace.ts pairs the pages by wall time. `window.__railheadMove` turns true when the haul
// is told, for the stills; the trace runs on through the capture.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const haul = (await import(
  '/src/sim/railway-ring-haul.ts' as string
)) as typeof import('../../../src/sim/railway-ring-haul.ts');
const { RING_HEAD, ringAt, ringDeckY } = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { line2World, line2Y, RING_S } = (await import(
  '/src/entities/railway/line2-path.ts' as string
)) as typeof import('../../../src/entities/railway/line2-path.ts');
const page = window as unknown as Window & { __railheadMove?: boolean };
const second = new URLSearchParams(location.search).get('player') === '2';
const who = second ? 'p2' : 'p1';
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const say = (text: string) => console.log(`RAILHEAD LAG ${who} ${text}`);
type Railhead = { opened: boolean; settled: boolean; shownU: number };
const view = () =>
  (R.inspectRailway() as unknown as { worksView?: { railheadView?: Railhead } | null } | null)?.worksView?.railheadView;
setInterval(() => {
  const resume = document.querySelector<HTMLButtonElement>('.you-resume');
  if (resume?.getClientRects().length) resume.click();
}, 100);
for (let i = 0; !R.railRead()?.ready() || !me.body || !view()?.opened || !remotes.size; i++) {
  if (i > 1800) throw new Error('RAILHEAD LAG the railhead or the friend never came');
  await wait(100);
}
for (let i = 0; !view()!.settled; i++) {
  if (i > 900) throw new Error('RAILHEAD LAG the seed haul never settled');
  await wait(100);
}
const ap = () => R.aperture(R.rw());
const set0 = ap().set;
if (set0 % 2 !== 1 || ap().rack < 1) throw new Error(`RAILHEAD LAG needs an odd set and a racked footing: ${set0}`);
const head = RING_HEAD[set0 >> 1]!;
/** Stand on the platform, `back` m behind its end, mid-width (lat 4.05 m). */
const board = (back: number) => {
  const u = Math.round((view()!.shownU - back) * 100);
  const q = ringAt(u, 405);
  teleport(me.body!, q.x / 100, (ringDeckY(u) + 90) / 100 + 1, q.z / 100);
  me.body!.velocity.set(0, 0, 0);
};
if (second) {
  board(16);
  for (let i = 0; ap().set === set0; i++) {
    if (i > 6000) throw new Error('RAILHEAD LAG the first page never set the footing');
    await wait(100);
  }
} else {
  const bot = makeBot({ doneFlag: '__railheadLagBot' });
  teleport(me.body!, head.rack.x / 100 + 1.5, head.rack.y / 100 + 1, head.rack.z / 100);
  await wait(400);
  if (!(await bot.use(head.rack.x / 100, head.rack.z / 100, 'shoulder a footing', /Shoulder a footing/)))
    throw new Error('RAILHEAD LAG no shoulder');
  for (let i = 0; !R.railBack().foot; i++) {
    if (i > 100) throw new Error('RAILHEAD LAG no footing on the back');
    await wait(100);
  }
  if (!(await bot.use(head.jib.x / 100, head.jib.z / 100, 'set the footing', /Set the footing/)))
    throw new Error('RAILHEAD LAG no set');
  for (let i = 0; ap().set === set0; i++) {
    if (i > 100) throw new Error('RAILHEAD LAG the footing was not set');
    await wait(100);
  }
  for (const d of document.querySelectorAll<HTMLDivElement>('div'))
    if (d.style.top === '90px' && d.style.zIndex === '9999') d.remove();
  board(8);
}
const a = ap();
const end = haul.haulEnd(a);
const phase = () => haul.haulPhase(ap(), R.railAt());
say(`query ${location.search}`);
say(`set ${a.set} moved ${a.moved} from ${a.from} target ${haul.haulTarget(a)} end ${end}`);
/** The friend as this page draws it, against the platform as this page draws it: metres along from the platform's
 * back end (0 to 25 is on it), metres off its middle line (within 2.25 is on it), and height over its top. */
const friend = (u: number) => {
  const pos = [...remotes.values()].find((r) => r.avatar)?.avatar?.position;
  if (!pos) return null;
  let best = { along: NaN, off: Infinity };
  for (let s = u - 30; s <= u + 5; s += 0.1) {
    const q = ringAt(Math.round(s * 100), 405);
    const off = Math.hypot(pos.x - q.x / 100, pos.z - q.z / 100);
    if (off < best.off) best = { along: s - (u - 25), off };
  }
  const over = pos.y - (ringDeckY(Math.round((u - 25 + best.along) * 100)) + 90) / 100;
  return [+best.along.toFixed(2), +best.off.toFixed(2), +over.toFixed(2)];
};
const p = { x: 0, z: 0 };
const rows: unknown[] = [];
const trace = setInterval(() => {
  const v = view()!;
  const s = RING_S + v.shownU;
  line2World(s + 3, 11.5, p);
  const cx = p.x,
    cz = p.z;
  line2World(s - 12, 4, p);
  window.__debugCam?.set([cx, line2Y(s) + 6, cz], [p.x, line2Y(s - 12) + 1, p.z], 60);
  rows.push([
    Date.now(),
    +v.shownU.toFixed(3),
    +phase().toFixed(2),
    v.settled ? 1 : 0,
    carry.on?.id ?? null,
    friend(v.shownU),
  ]);
}, 50);
const flush = setInterval(() => {
  if (rows.length) console.log(`LAGTRACE ${who} ${JSON.stringify(rows.splice(0))}`);
  if (R.railAt() > end + 20 && view()!.settled) {
    clearInterval(trace);
    clearInterval(flush);
    if (rows.length) console.log(`LAGTRACE ${who} ${JSON.stringify(rows.splice(0))}`);
    say(`done at tick ${R.railAt()}`);
  }
}, 1000);
for (let i = 0; phase() < -5; i++) {
  if (i > 3000) throw new Error('RAILHEAD LAG the haul never came');
  await wait(10);
}
page.__railheadMove = true;
say(`told at phase ${phase().toFixed(2)} u ${view()!.shownU.toFixed(2)}`);
export {};
