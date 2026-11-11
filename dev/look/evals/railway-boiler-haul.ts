// The boiler on its rope (boiler-first-choice plan, step 6), an `--action` from `--rail-seed boiler`: take it at the
// pedestal, haul it the first 40 m of the bot's route (the village bypass and up onto line one's deck), stop, Drop.
// `&haul=camp` instead takes it where `--rail-seed boiler-camp` left it and walks 10 m downhill (the slope still).
// `&haul=help` (with `--players 2`): player 2 presses "Help carry" beside player 1, who hauls.
// npm run look -- --rail-seed boiler --action dev/look/evals/railway-boiler-haul.ts --video --seconds 40
//   --question "Does the boiler drag on its rope without popping, on the ground and up onto the deck?"
// HAUL lines: a trace every 250 ms (feet, the boiler's drawn centre and tail, the speed); PASS/FAIL checks.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway, railRead } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { remotes } = (await import('/src/netplay/net.ts' as string)) as typeof import('../../../src/netplay/net.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { LINKS, ORIGIN, lineAt, railY } = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');

type P = { x: number; y: number; z: number };
type BoilerView = P & {
  state: string;
  mine: boolean;
  hauled: boolean;
  helper: string | null;
  at: P;
  tail: P;
  saddle: P;
  saddleEcho: boolean;
};
const query = new URLSearchParams(location.search);
const mode = query.get('haul') ?? 'deck';
const second = query.get('player') === '2';
const read = () => inspectRailway()!;
const boiler = () => (read().line2View as unknown as { boiler: BoilerView }).boiler;
const bot = makeBot({ doneFlag: '__haulDone' });
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
function check(ok: unknown, label: string) {
  console.log(`HAUL ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) throw new Error(`HAUL FAIL ${label}`);
}
const point = (s: number) => {
  const p = lineAt(LINKS[0]!.line, s, { x: 0, z: 0, ux: 0, uz: 1 });
  return { ...p, x: p.x + ORIGIN.x };
};
const round = (p: P) => [+p.x.toFixed(2), +p.y.toFixed(2), +p.z.toFixed(2)];
function trace() {
  let last = { x: me.body!.position.x, z: me.body!.position.z, t: performance.now() };
  const id = setInterval(() => {
    const p = me.body!.position,
      t = performance.now(),
      b = boiler();
    const speed = Math.hypot(p.x - last.x, p.z - last.z) / ((t - last.t) / 1000);
    last = { x: p.x, z: p.z, t };
    console.log(
      `HAUL TRACE ${JSON.stringify({ t: Math.round(t), feet: round({ x: p.x, y: p.y - 0.45, z: p.z }), state: b.state, hauled: b.hauled, helper: b.helper, at: round(b.at), tail: round(b.tail), speed: +speed.toFixed(2), echo: b.saddleEcho })}`,
    );
  }, 250);
  return () => clearInterval(id);
}

async function take() {
  check(!!me.body && !!railRead()?.ready(), 'landed');
  const b = boiler();
  teleport(me.body!, b.x + 2.5, b.y + 1.2, b.z + 1);
  me.body!.velocity.set(0, 0, 0);
  await wait(600);
  check(await bot.use(b.x, b.z, 'pick up the boiler', /^Pick up$/), 'Pick up offered');
  check(await bot.until(() => boiler().hauled, 2000, 'hauled'), 'the rope is taken at once');
  check(await bot.work(() => boiler().mine, 30000, 380), 'the boiler is on its rope');
}

async function haul() {
  // The follow camera, not look's fixed pose: the boiler trails between it and Buddy. `&haulcam=side` instead watches
  // the haul go past from 7 m beside the bypass, at eye height (the rope and the tail side-on).
  if (query.get('haulcam') === 'side') {
    const q = point(20);
    const y = railY(LINKS[0]!.line, 20);
    const cam: [number, number, number] = [q.x + q.uz * 7 - q.ux * 3, y + 1.6, q.z - q.ux * 7 - q.uz * 3];
    window.__debugCam?.set(cam, [q.x, y + 0.6, q.z], 55);
  } else window.__debugCam?.clear();
  const stop = trace();
  await take();
  if (mode === 'saddle' || mode === 'echo') {
    // saddle: lens 4 (designer): from the pedestal at eye height with the boiler held, is the old train's saddle (or
    // its echo) in sight? echo (`--rail-seed boiler-camp`): the saddle echo close up. The still is the answer.
    const p = me.body!.position,
      s = boiler().saddle;
    if (mode === 'echo') window.__debugCam?.set([s.x - 2.5, s.y + 1.4, s.z + 4], [s.x, s.y, s.z], 50);
    else window.__debugCam?.set([p.x, p.y - 0.45 + 1.6, p.z], [s.x, s.y, s.z], 50);
    console.log(`HAUL SADDLE ${JSON.stringify({ from: round(p), saddle: round(s), echo: boiler().saddleEcho })}`);
    stop();
    bot.finish('saddle look');
    return;
  }
  if (mode === 'camp') {
    const p = me.body!.position;
    // Downhill from the camp toward the village (the boiler-camp seed leaves it by the old train).
    check(await bot.walk(p.x - 7, p.z + 7, 1, { limit: 20000 }), 'walked 10 m downhill');
  } else {
    if (mode === 'help') {
      // Wait for the friend's grip, then start the capture (--until window.__haulShot).
      check(await bot.until(() => boiler().helper !== null, 180000, 'helped'), 'a friend helps carry');
      (window as Window & { __haulShot?: boolean }).__haulShot = true;
      await bot.wait(3000); // the capture starts at real speed first
    }
    const village = point(14),
      join = point(30),
      far = point(42);
    check(await bot.walk(village.x, village.z, 1, { limit: 40000 }), 'to the village bypass');
    check(await bot.straight(village.x - village.uz * 4, village.z + village.ux * 4, 0.5, 15000), 'the bypass');
    check(await bot.straight(join.x - join.uz * 4, join.z + join.ux * 4, 0.5, 15000), 'beside the approach');
    check(await bot.straight(join.x, join.z, 0.5, 15000), 'up onto the deck');
    check(await bot.straight(far.x, far.z, 0.5, 15000), 'along the deck');
  }
  await wait(800);
  const before = boiler().tail;
  triggerAction('place-drop', 'down');
  triggerAction('place-drop', 'up');
  check(
    await bot.until(() => boiler().state === 'ground' || boiler().state === 'pedestal', 6000, 'dropped'),
    'Drop puts it down',
  );
  const after = boiler();
  console.log(`HAUL DROP ${JSON.stringify({ tail: round(before), lies: round(after), state: after.state })}`);
  await wait(1500);
  stop();
  bot.finish('boiler haul');
}

async function helper() {
  check(await bot.until(() => !!me.body && !!railRead()?.ready(), 60000, 'landed'), 'helper landed');
  check(await bot.until(() => boiler().state === 'held' && !boiler().mine, 120000, 'held'), 'the friend hauls');
  for (const r of remotes.values()) {
    const s = r.avatar?.position;
    if (!s) continue;
    teleport(me.body!, s.x + 1.5, s.y, s.z + 1.5);
    me.body!.velocity.set(0, 0, 0);
  }
  await wait(600);
  const at = boiler().tail;
  check(await bot.use(at.x, at.z, 'help carry', /^Help carry$/), 'Help carry offered');
  // Two pages end the warm-up only when both say so: the helper's grip is the cue on this page too.
  (window as Window & { __haulShot?: boolean }).__haulShot = true;
  // Follow the hauler at a shoulder's distance; `&follow=ease` steers nothing and leaves it to Help carry's ease toward
  // the grip (works-late-game step 4), logging any frame the claim drops.
  const stop = trace();
  const ease = query.get('follow') === 'ease';
  let dropped = 0;
  for (let k = 0; k < (ease ? 400 : 80) && boiler().state === 'held'; k++) {
    if (ease) {
      if (!read().line2View || boiler().helper === null) dropped++;
      await wait(150);
      continue;
    }
    for (const r of remotes.values()) {
      const s = r.avatar?.position;
      if (s && Math.hypot(s.x - me.body!.position.x, s.z - me.body!.position.z) > 2.2)
        await bot.walk(s.x + 1, s.z + 1, 1.2, { limit: 2000 });
    }
    await wait(150);
  }
  stop();
  if (ease) console.log(`HAUL HELPER ${JSON.stringify({ droppedSamples: dropped })}`);
  bot.finish('boiler helper');
}

background(second ? helper() : haul(), `boiler haul ${second ? 'helper' : 'hauler'}`);
export {};
