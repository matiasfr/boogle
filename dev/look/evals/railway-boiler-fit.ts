// The boiler fit as the room sees it (boiler-first-choice plan, steps 8 and 9), from `--rail-seed boiler-camp` (the
// boiler on the ground by the old train). With `--players 2` this is an `--eval` on both pages: player 2 is the fitter
// (set down by the boiler, a harness pose), player 1 the friend at the village, whose page the capture films. The
// friend sets window.__boilerShot once the fitter holds the boiler by the saddle, then keeps walking (the fitter's page
// sets it at once: a two-player warm-up ends only when every page meets --until, see coop-warp.ts); the fitter
// presses "Fit the boiler" once the friend has moved, so the press falls inside the capture.
// npm run look -- --rail-seed boiler-camp --players 2 --eval dev/look/evals/railway-boiler-fit.ts
//   --until window.__boilerShot --seconds 10 --video
//   --question "Does the friend get one boiler flourish where they stand, and keep walking through it?"
// BOILER lines: the friend's `reward.arrival` before the fit, after it and as a trace every 100 ms; PASS/FAIL checks.
// Solo (no `--players`, step 8's press as an `--action`): take it, walk to the saddle and fit it, watched side-on;
// BOILER PRESS logs the view frame of the press, the frame the boiler first moved and the frame trains were accepted.
// npm run look -- --rail-seed boiler-camp --action dev/look/evals/railway-boiler-fit.ts --video --seconds 14
//   --question "Does the boiler leave the rope on the press frame, and do two little guys hammer at the saddle?"
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const {
  boiler: boilerRow,
  inspectRailway,
  line2Trains,
  railRead,
  rw,
} = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { inputState } = (await import(
  '/src/player/input-state.ts' as string
)) as typeof import('../../../src/player/input-state.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { INTERP_MS } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type P = { x: number; y: number; z: number };
type BoilerView = P & {
  mine: boolean;
  saddle: P;
  seat: P;
  frame: number;
  fitting: { phase: string; pressFrame: number; movedFrame: number } | null;
  lastFit: { pressFrame: number; movedFrame: number; refused: boolean } | null;
};
const solo = !new URLSearchParams(location.search).has('player');
const fitter = solo || new URLSearchParams(location.search).get('player') === '2';
const w = window as Window & { __boilerShot?: boolean };
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const read = () => inspectRailway()!;
const trainsOn = () => line2Trains(rw());
const boiler = () => (read().line2View as unknown as { boiler: BoilerView }).boiler;
const arrival = () => read().reward.arrival;
function check(ok: unknown, label: string) {
  console.log(`BOILER ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) throw new Error(`BOILER FAIL ${label}`);
}
async function until(ok: () => unknown, label: string, ms = 600000) {
  const end = performance.now() + ms;
  while (!ok() && performance.now() < end) await wait(50);
  check(ok(), label);
}
/** The other player, from presence. */
function other() {
  for (const r of remotes.values()) {
    if (!r.visible || !r.entered) continue;
    const s = r.snaps.sample(performance.now() - INTERP_MS);
    if (s) return { x: s.b.p[0]!, y: s.b.p[1]!, z: s.b.p[2]! };
  }
  return null;
}
const landed = () => !!me.body && me.coyote > 0 && !me.swimming && !!railRead()?.ready();
const near = (p: { x: number; z: number } | null, q: { x: number; z: number }, r: number) =>
  !!p && Math.hypot(p.x - q.x, p.z - q.z) < r;
const bot = makeBot({ doneFlag: '__boilerDone' });

async function fit() {
  if (!solo) w.__boilerShot = true; // the friend's page times the capture; this page must not hold the warm-up
  await until(landed, 'fitter landed');
  check(!trainsOn(), 'trains are not running yet');
  const b = boiler();
  teleport(me.body!, b.x + 3, b.y + 1.2, b.z);
  me.body!.velocity.set(0, 0, 0);
  await wait(400);
  check(await bot.use(b.x, b.z, 'take the boiler', /^(Shoulder the boiler|Pick up)$/), 'boiler take offered');
  check(await bot.work(() => boiler().mine, 30000, 380), 'boiler accepted');
  const saddle = boiler().saddle;
  if (solo) {
    // Side-on to the old loco, the saddle in the middle of the frame and the camp's little guys in reach of it.
    const s = boiler().seat;
    window.__debugCam?.set([s.x + 1.5, s.y + 2.8, s.z - 8], [s.x, s.y - 0.5, s.z], 55);
  }
  await bot.walk(saddle.x, saddle.z, 4, { limit: 30000 });
  if (!solo) {
    // Wait for the friend's capture: they start walking as it starts.
    await until(() => other(), 'fitter sees the friend');
    const from = other()!;
    await until(() => !near(other(), from, 2), 'the friend is walking (their capture is on)', 1200000);
  }
  await wait(1500);
  let acceptedFrame = -1;
  const watch = setInterval(() => {
    if (acceptedFrame < 0 && trainsOn()) acceptedFrame = boiler().frame;
  }, 0);
  check(await bot.use(saddle.x, saddle.z, 'fit the boiler', /^Fit the boiler$/), 'boiler fit offered');
  // Read synchronously after the press, before any server message can be handled.
  const flying = boiler().fitting,
    atPress = { phase: flying?.phase ?? null, trains: trainsOn() };
  check(await bot.work(() => trainsOn(), 30000, 380), 'boiler fitted');
  clearInterval(watch);
  await bot.until(() => !boiler().fitting, 3000, 'landed');
  const f = boiler().lastFit;
  console.log(
    `BOILER PRESS ${JSON.stringify({ press: f?.pressFrame, moved: f?.movedFrame, accepted: acceptedFrame, refused: boiler().lastFit?.refused ?? null, atPress })}`,
  );
  check(atPress.phase === 'fly' && !atPress.trains, 'the flight starts on the press, before any answer');
  check(f && f.movedFrame === f.pressFrame, 'the boiler leaves the rope on the press frame');
  const guys = () => (read().line2View as unknown as { bolting: { guys: number; here: number } | null }).bolting;
  check(
    await bot.until(() => (guys()?.here ?? 0) >= 2, 3100, 'bolting'),
    'two little guys at the saddle before the wake ends',
  );
  console.log(`BOILER BOLTING ${JSON.stringify(guys())}`);
  if (solo) {
    await wait(4000);
    const lashed = (read().line2View as unknown as { trains: { lashed: boolean }[] }).trains.map((t) => t.lashed);
    check(lashed.every(Boolean), 'both locos lashed');
    bot.finish('boiler fit');
    return;
  }
  await wait(3000);
  const a = arrival();
  console.log(
    `BOILER FITTER ${JSON.stringify({ flourishes: a.flourishes, late: a.late, keys: a.keys, seen: a.seen })}`,
  );
  check(a.seen.includes('boiler') && !a.keys.includes('boiler'), 'the fitter is marked as shown, with no flourish');
}

async function friend() {
  await until(landed, 'friend landed');
  // A fresh friend is first shown the seed's earlier abilities, one late flourish each on landing: let those finish.
  let quiet = 0;
  while (quiet < 3000) {
    const n = arrival().flourishes;
    await wait(100);
    quiet = arrival().flourishes === n ? quiet + 100 : 0;
  }
  const before = arrival();
  console.log(
    `BOILER BEFORE ${JSON.stringify({ flourishes: before.flourishes, late: before.late, seen: before.seen })}`,
  );
  check(!before.keys.includes('boiler'), 'no boiler flourish before the fit');
  // The fitter holds it by the old train: the capture starts here.
  await until(() => boiler().mine === false && boilerRow(rw()).state === 'held', 'the fitter holds the boiler');
  await until(() => near(other(), boiler().saddle, 6), 'the fitter is at the saddle');
  w.__boilerShot = true;
  const rows: unknown[] = [];
  const start = performance.now();
  const trace = setInterval(() => {
    const a = arrival();
    rows.push({
      t: Math.round(performance.now() - start),
      trains: trainsOn(),
      held: inputState.held,
      card: read().reward.showing,
      badge: a.badge?.map((n) => +n.toFixed(2)),
      keys: a.keys.join(),
    });
  }, 100);
  // Walk to and fro by the village while it happens: a held input would stop Buddy.
  const p = me.body!.position;
  const home = { x: p.x, z: p.z };
  const walking = (async () => {
    for (let k = 0; k < 4 && !(trainsOn() && arrival().keys.includes('boiler')); k++)
      await bot.walk(home.x + (k % 2 ? 0 : 6), home.z + 3, 1, { limit: 6000 });
  })();
  await until(() => trainsOn(), 'friend sees trains on', 120000);
  await until(() => arrival().keys.includes('boiler'), 'friend boiler flourish played', 10000);
  check(!read().reward.showing && !inputState.held, 'no card and no hold at the boiler flourish');
  const moving = { x: me.body!.position.x, z: me.body!.position.z };
  await walking;
  await bot.walk(home.x - 4, home.z - 3, 1, { limit: 6000 });
  check(!near(me.body!.position, moving, 1), 'the friend kept moving after the flourish');
  await wait(1500);
  clearInterval(trace);
  console.log(`BOILER TRACE ${JSON.stringify(rows)}`);
  const a = arrival();
  console.log(`BOILER AFTER ${JSON.stringify({ flourishes: a.flourishes, late: a.late, keys: a.keys, seen: a.seen })}`);
  check(a.keys.filter((k) => k === 'boiler').length === 1 && a.late === before.late, 'one live boiler flourish');
}

background(fitter ? fit() : friend(), `boiler fit ${fitter ? 'fitter' : 'friend'}`);
export {};
