// npm run look -- --rail-seed q1-done --query 'forge=before' --eval dev/look/evals/railway-forge-finish.ts --until window.__forgeShot --video --seconds 20
//  (without forge=before it waits for the forge to light: use the playthrough --to forge-lit segment)
// The forge's finished look (docs/plans/works-late-game.md, step 6; owner, 10 November: it finishes when it lights), as
// an `--eval` that watches the forge from above the village and sets `window.__forgeShot` once the show starts, so
// `--until` starts the real-time capture there. It needs the forge about to light (feed it in the page, or take the
// playthrough's `--to forge-lit` segment); `&forge=before` only frames the forge (the before still).
// FORGE lines: the finish's stage as it goes.
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
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
  check((await railReady(60000)) && (await bot.until(() => !!me.body, 60000, 'landed')), 'landed');
  if (query.get('forge') === 'before') {
    teleport(me.body!, 921, 20, 8);
    frame();
    console.log(`FORGE BEFORE ${JSON.stringify(finish())}`);
    shot.__forgeShot = true;
    bot.finish('forge before');
    return;
  }
  // Home to watch: the beams drop in the moment the forge lights.
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
  check(await bot.until(() => finish().stage !== 'idle', 120000, 'lit'), 'the lit forge starts the show');
  shot.__forgeShot = true;
  check(await bot.until(() => finish().stage === 'done', 90000, 'done'), 'the forge is finished');
  clearInterval(log);
  console.log(`FORGE DONE ${JSON.stringify(finish())}`);
  bot.finish('forge finish');
}
background(run(), 'forge finish');
export {};
