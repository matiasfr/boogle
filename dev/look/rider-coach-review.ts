// Review proofs: accepted full-fleet seed, sixth-train wheels; real controller at Quarry/Ring and on departure.
// node --import ./dev/sim/hooks.ts dev/look/rider-coach-review.ts quarry|ring|fleet|moving
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { startStack, launch, Game } from './lib.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { act, advance } from '../../src/sim/railway-seed-route.ts';
import { laySection } from '../../src/sim/railway-seed-legs.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { trains } from '../../src/sim/railway-rows.ts';
import { RAIL_HALTS, LINE2 } from '../../src/sim/railway-lines.ts';
import { seedDoc } from './ring-mid-seed.ts';
import { createStore } from '../../server/src/store.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
const mode = process.argv[2] ?? 'fleet';
if (!['quarry', 'ring', 'fleet', 'moving'].includes(mode)) throw new Error('Expected quarry|ring|fleet|moving');
const out = `.look/rider-coach-r2b/review/${mode}`;
fs.mkdirSync(out, { recursive: true });
const seed = buildSeedWorld('boiler-long');
while (legRow(seed.w, 0).laid < 4) laySection(seed);
if (act(seed, 'a', 'rail.jump') !== 1) throw new Error('Air jump refused');
// Join all six under the real fleet rule before persisting the seed.
for (let i = 0; trains(seed.w).some((r, k) => k > 0 && r.phase === 2) && i < 30000; i++) advance(seed, 1);
if (trains(seed.w).some((r, k) => k > 0 && r.phase === 2)) throw new Error('Full fleet did not join');
const halt = mode === 'quarry' ? 1 : mode === 'ring' ? 5 : 0;
if (mode === 'quarry') {
  const id = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === halt);
  if (act(seed, 'a', 'rail.call', { id, dir: 1 }) !== 1) throw new Error('Quarry request refused');
}
const doc = await seedDoc(seed),
  stack = await startStack({ warp: true }),
  browser = await launch();
let stopped: number | undefined;
try {
  const store = createStore({ dataDir: stack.dataDir!, maxRooms: 2 });
  await store.init();
  const written = await store.write(railwayRoomId(`coach-review-${mode}`), {
    ...doc,
    writerId: SERVER_ID,
    updatedAt: new Date().toISOString(),
  });
  if (written.status !== 200) throw new Error(`seed refused ${written.status}`);
  const g = await Game.open(browser, stack, {
    room: `coach-review-${mode}`,
    out,
    size: [1200, 800],
    warp: true,
    sourceImports: true,
    query: 'debugcam=1',
  });
  await g.eval(
    "window.__railProof=await import('/dev/look/rail-read.ts'); window.__roof=await import('/dev/look/evals/rider-coach-roof.ts');",
  );
  const condition =
    mode === 'fleet' ? 'r.phase===1&&r.along>130000&&r.along<270000&&k===6' : `r.line===1&&r.phase===0&&r.at===${halt}`;
  await fetch(stack.clockUrl!, { method: 'POST', body: '10' });
  await g.eval('window.__warp.go(10)');
  if (
    (await g.waitFor(`window.__railProof.inspectRailway().line2View.trains.some((r,k)=>${condition})`, {
      timeout: 180000,
      step: 30,
    })) < 0
  )
    throw new Error(`${mode}: arrival missed`);
  const port = new URL(stack.clockUrl!).port;
  const pid = Number(execFileSync('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim());
  if (!Number.isInteger(pid) || pid <= 1) throw new Error('No disposable child PID');
  process.kill(pid, 'SIGSTOP');
  stopped = pid;
  await g.eval(
    `window.__warp.pause(); window.__slot=window.__railProof.inspectRailway().line2View.trains.findIndex((r,k)=>${condition}); window.__roof.select(window.__slot);`,
  );
  const results: unknown[] = [];
  if (mode === 'fleet') {
    const info = await g.eval(`
   const R=window.__railProof;
   const {me}=await import('/src/player/player.ts'),{teleport}=await import('/src/physics/engine.ts');
   const before=R.inspectRailway().line2View.trains[6].cars[0];
   teleport(me.body,before.x+4,before.y+3,before.z); await window.__warp.step(120);
   // Re-read after warm-up: a RUN row keeps predicting after the disposable server is paused.
   const rows=R.inspectRailway().line2View.trains,r=rows[6],a=r.cars[0],b=r.cars.at(-1);
   const d=Math.hypot(a.x-b.x,a.z-b.z),ux=(a.x-b.x)/d,uz=(a.z-b.z)/d,x=(a.x+b.x)/2,z=(a.z+b.z)/2,y=a.y;
   window.__debugCam.set([x+uz*14-ux*5,y+3,z-ux*14-uz*5],[x,y+.5,z],55);
   await window.__warp.step(2);
   return {slot:6,fleet:rows.map(r=>({line:r.line,phase:r.phase})),train:r};`);
    results.push(info);
    await g.still('sixth-train-wheels');
  } else {
    const setup = await g.eval("return await window.__roof.stage('platform');");
    await g.still('platform-start');
    await g.eval('window.__roof.begin();');
    await g.motion('platform-to-roof', { frames: 8, every: 24 });
    const climb = await g.eval('return window.__roof.finish();');
    results.push({ kind: 'platform-to-roof', setup, result: climb });
    await g.still('on-roof');
    if (mode === 'moving') {
      const setup = await g.eval("return await window.__roof.stage('bench');");
      process.kill(pid, 'SIGCONT');
      stopped = undefined;
      await fetch(stack.clockUrl!, { method: 'POST', body: '1' });
      await g.eval('window.__warp.go(1)');
      if (
        (await g.waitFor('window.__railProof.inspectRailway().line2View.trains[window.__slot].phase===1', {
          timeout: 120000,
          step: 20,
        })) < 0
      )
        throw new Error('Departure missed');
      await g.eval('window.__roof.begin(undefined,true);');
      await g.motion('moving-coach', { frames: 12, seconds: 4 });
      results.push({ kind: 'moving-coach', setup, result: await g.eval('return window.__roof.finish();') });
    } else {
      const raised = await g.eval('return window.__roof.canopyTarget();');
      const target = raised ?? {
        ...(setup as { staged: { x: number; y: number; z: number } }).staged,
        source: 'adjacent platform; no raised collider within the nearby scan',
      };
      results.push({ kind: 'nearest-raised-target', target });
      if (target) {
        await g.eval(`window.__roof.begin(${JSON.stringify(target)});`);
        await g.motion('roof-exit', { frames: 8, every: 24 });
        results.push({ kind: 'roof-exit', result: await g.eval('return window.__roof.finish();') });
        const setup = await g.eval("return await window.__roof.stage('cab');");
        await g.eval(`window.__roof.begin(${JSON.stringify(target)});`);
        await g.motion('cab-control', { frames: 8, every: 24 });
        results.push({ kind: 'cab-control', setup, result: await g.eval('return window.__roof.finish();') });
      }
    }
  }
  await g.eval('window.__warp.go(1)');
  const pools = await g.eval(
    `const {scene}=await import('/src/render/scene.ts'); const pools=[]; scene.traverse(m=>{if(m.isInstancedMesh) pools.push({name:m.name,used:m.count,capacity:m.instanceMatrix.count,geometry:m.geometry.type,parent:m.parent?.name});}); return pools;`,
  );
  const health = { errors: g.healthErrors(), fps: await g.fps(1000), gfx: g.gfx };
  fs.writeFileSync(`${out}/results.json`, JSON.stringify({ mode, results, health, pools }, null, 2));
  if (health.errors.length || health.fps <= 0) throw new Error(JSON.stringify(health));
  console.log(mode, 'completed', JSON.stringify(health));
  await g.close();
} finally {
  if (stopped) process.kill(stopped, 'SIGCONT');
  await browser.close();
  await stack.close();
}
