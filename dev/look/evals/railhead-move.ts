// The railhead traveller's move (docs/plans/railhead-traveller.md, step 5), by real input at `--rail-seed ring-set-3`:
// shoulder a footing off the railhead rack, set it at the jib (the bent's second footing), and frame the traveller
// from the track side as its haul comes up. `window.__railheadMove` turns true half a second before it is told, so a
// motion sheet of 10 frames over 9 s shows: at rest, told (bell, lamps, chocks up, jib folding, line taking up its
// slack), the eased start, travel, the stop (chocks down, flare) and at rest again. The camera follows the deck.
//   npm run look -- --real --rail-seed ring-set-3 --query debugcam=1 --eval dev/look/evals/railhead-move.ts
//     --until window.__railheadMove --warm 120 --frames 10 --seconds 9 --name railhead-move
// `&still=mid` instead flags mid-travel and `&still=rest` the settled deck, for single stills (--frames 2), and
// `&cam=lever` frames the Railhead lever riding the deck. Prints `RAILHEAD MOVE ...` lines with the haul's phase.
const R = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const haul = (await import(
  '/src/sim/railway-ring-haul.ts' as string
)) as typeof import('../../../src/sim/railway-ring-haul.ts');
const { RING_HEAD } = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { line2World, line2Y, RING_S } = (await import(
  '/src/entities/railway/line2-path.ts' as string
)) as typeof import('../../../src/entities/railway/line2-path.ts');
const page = window as unknown as Window & { __railheadMove?: boolean };
const query = new URLSearchParams(location.search);
const still = query.get('still'),
  lever = query.get('cam') === 'lever';
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const say = (text: string) => console.log(`RAILHEAD MOVE ${text}`);
type Railhead = { opened: boolean; settled: boolean; shownU: number; traveller: Record<string, unknown> };
const view = () =>
  (R.inspectRailway() as unknown as { worksView?: { railheadView?: Railhead } | null } | null)?.worksView?.railheadView;
for (let i = 0; !R.railRead()?.ready() || !me.body || !view()?.opened; i++) {
  if (i > 900) throw new Error('RAILHEAD MOVE the railhead did not open');
  await wait(100);
}
// The seed's own haul (its first pair) runs out first.
for (let i = 0; !view()!.settled; i++) {
  if (i > 600) throw new Error('RAILHEAD MOVE the seed haul never settled');
  await wait(100);
}
const ap = () => R.aperture(R.rw());
const set0 = ap().set;
if (set0 % 2 !== 1 || ap().rack < 1) throw new Error(`RAILHEAD MOVE needs an odd set and a racked footing: ${set0}`);
const head = RING_HEAD[set0 >> 1]!;
const bot = makeBot({ doneFlag: '__railheadMoveBot' });
teleport(me.body!, head.rack.x / 100 + 1.5, head.rack.y / 100 + 1, head.rack.z / 100);
await wait(400);
if (!(await bot.use(head.rack.x / 100, head.rack.z / 100, 'shoulder a footing', /Shoulder a footing/)))
  throw new Error('RAILHEAD MOVE no shoulder');
for (let i = 0; !R.railBack().foot; i++) {
  if (i > 100) throw new Error('RAILHEAD MOVE no footing on the back');
  await wait(100);
}
if (!(await bot.use(head.jib.x / 100, head.jib.z / 100, 'set the footing', /Set the footing/)))
  throw new Error('RAILHEAD MOVE no set');
for (let i = 0; ap().set === set0; i++) {
  if (i > 100) throw new Error('RAILHEAD MOVE the footing was not set');
  await wait(100);
}
const phase = () => haul.haulPhase(ap(), R.railAt());
say(`set ${ap().set} moved ${ap().moved} from ${ap().from} phase ${phase()}`);
// The bot's notes are off the frame from here. Frame the deck from the sea side, ahead of its front, following it.
for (const d of document.querySelectorAll<HTMLDivElement>('div'))
  if (d.style.top === '90px' && d.style.zIndex === '9999') d.remove();
const ends = { at: 0 };
const p = { x: 0, z: 0 };
setInterval(() => {
  const resume = document.querySelector<HTMLButtonElement>('.you-resume');
  if (resume?.getClientRects().length) resume.click();
  const u = view()!.shownU;
  const s = RING_S + u;
  if (lever) {
    line2World(s - 12, 12, p);
    const cx = p.x,
      cz = p.z;
    line2World(s - 21, 2.3, p);
    window.__debugCam?.set([cx, line2Y(s) + 5, cz], [p.x, line2Y(s - 21) + 1.4, p.z], 55);
  } else {
    line2World(s + 3, 11.5, p);
    const cx = p.x,
      cz = p.z;
    line2World(s - 9, 3.5, p);
    window.__debugCam?.set([cx, line2Y(s) + 4.5, cz], [p.x, line2Y(s - 9) + 1, p.z], 60);
  }
}, 16);
const told = () => phase() >= -5;
const mid = () => phase() > haul.HAUL.ready + 15 && view()!.shownU < haul.haulTarget(ap()) / 100 - 4;
const rest = () => view()!.settled && R.railAt() > haul.haulEnd(ap()) + 10;
for (let i = 0; !(still === 'mid' ? mid() : still === 'rest' ? rest() : told()); i++) {
  if (i > 2000) throw new Error('RAILHEAD MOVE the haul never came');
  await wait(10);
}
page.__railheadMove = true;
ends.at = performance.now();
say(`flagged at phase ${phase().toFixed(2)} u ${view()!.shownU.toFixed(2)} end ${haul.haulEnd(ap())}`);
const log = setInterval(() => {
  const v = view()!;
  say(
    `t ${((performance.now() - ends.at) / 1000).toFixed(1)} s phase ${phase().toFixed(1)} u ${v.shownU.toFixed(2)} settled ${v.settled} rig ${JSON.stringify(v.traveller)}`,
  );
  if (performance.now() - ends.at > 12000) clearInterval(log);
}, 500);
export {};
