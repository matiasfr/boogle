// The forge's finished look (docs/plans/works-late-game.md, step 6), as an `--eval` from `--rail-seed crossing-finishing`:
// shoulder and set the last pier footing (the crossing is accepted live), then watch the forge from above the village
// until line 1's next train is home, and set `window.__forgeShot` so `--until` starts the real-time capture there.
// `&forge=before` only frames the forge (the before still). FORGE lines: the finish's stage as it goes.
// npm run look -- --rail-seed crossing-finishing --eval dev/look/evals/railway-forge-finish.ts --until window.__forgeShot
//   --cam 911,27,21 --look 919,19,-3 --video --seconds 30 --question "Do the beams come on line 1 and go up as the forge's roof?"
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

const query = new URLSearchParams(location.search);
const bot = makeBot({ doneFlag: '__forgeDone' });
const shot = window as Window & { __forgeShot?: boolean };
type Finish = { stage: string; beams: string[]; poles: number; cap: boolean; crew: unknown };
const finish = () => (inspectRailway()!.line2View as unknown as { forgeFinish: Finish }).forgeFinish;
const frame = () => window.__debugCam?.set([911, 27, 21], [919, 19, -3], 60);
function check(ok: unknown, label: string) {
  console.log(`FORGE ${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) throw new Error(`FORGE FAIL ${label}`);
}
async function run() {
  check(await bot.until(() => !!me.body && !!inspectRailway()?.ready, 60000, 'landed'), 'landed');
  if (query.get('forge') === 'before') {
    teleport(me.body!, 921, 20, 8);
    frame();
    console.log(`FORGE BEFORE ${JSON.stringify(finish())}`);
    shot.__forgeShot = true;
    bot.finish('forge before');
    return;
  }
  // The last pier footings (the seed leaves the last bent's pair): off the pier rack, onto the apron beside the jib,
  // set (railway-works-act.ts's pier, pierN=2).
  for (let n = 0; n < 2 && inspectRailway()!.works.crossing < 0; n++) {
    teleport(me.body!, 1399.7, 26, -356);
    me.body!.velocity.set(0, 0, 0);
    await bot.wait(600);
    check(await bot.use(1398.94, -361.77, 'shoulder a footing', /Shoulder a footing/), 'shoulder the footing');
    await bot.wait(600);
    teleport(me.body!, 1405.4, 25.4, -365.5);
    me.body!.velocity.set(0, 0, 0);
    await bot.wait(400);
    check(await bot.use(1405.54, -371.07, 'set the footing', /Set the footing/), 'set the footing');
    await bot.wait(800);
  }
  check(await bot.until(() => inspectRailway()!.works.crossing >= 0, 20000, 'crossing'), 'the crossing is accepted');
  // Home to watch: line 1 brings the beams.
  teleport(me.body!, 921, 20, 8);
  me.body!.velocity.set(0, 0, 0);
  frame();
  let last = '';
  const log = setInterval(() => {
    const f = finish();
    const line = JSON.stringify({ stage: f.stage, beams: f.beams.join(','), poles: +f.poles.toFixed(2), cap: f.cap });
    if (line !== last) console.log(`FORGE STAGE ${line}`);
    last = line;
  }, 200);
  check(await bot.until(() => finish().stage === 'ride', 5000, 'armed'), 'armed by the crossing');
  check(await bot.until(() => finish().stage !== 'ride', 240000, 'line 1 home'), 'line 1 brings the beams');
  shot.__forgeShot = true;
  check(await bot.until(() => finish().stage === 'done', 90000, 'done'), 'the forge is finished');
  clearInterval(log);
  console.log(`FORGE DONE ${JSON.stringify(finish())}`);
  bot.finish('forge finish');
}
background(run(), 'forge finish');
export {};
