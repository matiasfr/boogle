// Controller/contacts proof, not a ballistic sample: staged takeoffs, real held jump + air jump and movement inputs.
// node --import ./dev/sim/hooks.ts dev/look/rider-coach-roof.ts
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startStack, launch, Game } from './lib.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { act } from '../../src/sim/railway-seed-route.ts';
import { seedDoc } from './ring-mid-seed.ts';
import { createStore } from '../../server/src/store.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';

const out = '.look/rider-coach-r2b/final/roof-controller';
fs.mkdirSync(out, { recursive: true });
const seed = buildSeedWorld('boiler-long');
if (act(seed, 'a', 'rail.jump') !== 1) throw new Error('Air-jump unlock refused');
const doc = await seedDoc(seed);
const stack = await startStack({ warp: true });
const browser = await launch();
let stoppedServer: number | undefined;
try {
  const store = createStore({ dataDir: stack.dataDir!, maxRooms: 2 });
  await store.init();
  const written = await store.write(railwayRoomId('coach-roof'), {
    ...doc,
    writerId: SERVER_ID,
    updatedAt: new Date().toISOString(),
  });
  if (written.status !== 200) throw new Error(`seed refused: ${written.status}`);
  const g = await Game.open(browser, stack, {
    room: 'coach-roof',
    out,
    size: [1000, 700],
    warp: true,
    sourceImports: true,
    query: 'debugcam=1',
  });
  await g.wait(3);
  // Mac-only proof: stop our disposable server child after an actual Home arrival. The shared clock endpoint
  // deliberately cannot pause. No train row, mover or collider is patched; resume the child before cleanup.
  const fast = await fetch(stack.clockUrl!, { method: 'POST', body: '15' });
  if (!fast.ok) throw new Error(await fast.text());
  await g.eval("window.__warp.go(15); window.__railProof = await import('/dev/look/rail-read.ts');");
  if (
    (await g.waitFor(
      'window.__railProof.inspectRailway().line2View.trains.some(r=>r.longBoiler&&r.cars.length===6&&r.at===0&&r.phase===0)',
      { timeout: 180000, step: 30 },
    )) < 0
  )
    throw new Error('Home arrival missed');
  const port = new URL(stack.clockUrl!).port;
  const pid = Number(execFileSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim());
  if (!Number.isInteger(pid) || pid <= 1) throw new Error('No unique disposable server child');
  process.kill(pid, 'SIGSTOP');
  stoppedServer = pid;
  await g.eval("window.__warp.pause(); window.__roof = await import('/dev/look/evals/rider-coach-roof.ts');");
  const results: unknown[] = [];
  for (const kind of ['platform', 'bench', 'load'] as const) {
    const setup = await g.eval(`return await window.__roof.stage('${kind}');`);
    await g.still(`${kind}-start`);
    await g.eval('window.__roof.begin();');
    await g.motion(`${kind}-climb`, { frames: 8, every: 24 });
    const result = await g.eval('return window.__roof.finish();');
    await g.still(`${kind}-roof`);
    results.push({ kind, setup, result });
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log(kind, JSON.stringify(result).slice(0, 500));
    if (!(result as { reached: boolean }).reached) throw new Error(`${kind}: controller did not land on coach roof`);
  }
  const canopy = await g.eval('return window.__roof.canopyTarget();');
  if (canopy) {
    await g.eval(`window.__roof.begin(${JSON.stringify(canopy)});`);
    await g.motion('roof-to-canopy', { frames: 8, every: 24 });
    results.push({ kind: 'roof-to-canopy', result: await g.eval('return window.__roof.finish();') });
    const setup = await g.eval("return await window.__roof.stage('cab');");
    await g.still('cab-control-start');
    await g.eval(`window.__roof.begin(${JSON.stringify(canopy)});`);
    await g.motion('cab-to-canopy', { frames: 8, every: 24 });
    results.push({ kind: 'cab-to-canopy', setup, result: await g.eval('return window.__roof.finish();') });
  }
  await g.eval('window.__warp.go(1)');
  const health = { errors: g.healthErrors(), fps: await g.fps(1000), gfx: g.gfx };
  fs.writeFileSync(
    `${out}/results.json`,
    JSON.stringify(
      {
        results,
        health,
        scope:
          'Authoritative train held at stand; full player controller and Rapier run at fixed 60 Hz, all jumps/steering via production input. Only initial takeoff placements teleport; no velocity changes or contact grants during a jump. Sheets are stepped controller evidence, not real-time motion.',
      },
      null,
      2,
    ),
  );
  if (health.errors.length || health.fps <= 0) throw new Error(JSON.stringify(health));
  await g.close();
} finally {
  if (stoppedServer) process.kill(stoppedServer, 'SIGCONT');
  await browser.close();
  await stack.close();
}
