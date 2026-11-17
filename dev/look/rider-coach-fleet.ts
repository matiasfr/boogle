// R3 full-fleet same-frame draw/triangle comparison against the exact blockout builder.
// node --import ./dev/sim/hooks.ts dev/look/rider-coach-fleet.ts
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { startStack, launch, Game } from './lib.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { act, advance } from '../../src/sim/railway-seed-route.ts';
import { laySection } from '../../src/sim/railway-seed-legs.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { trains } from '../../src/sim/railway-rows.ts';
import { seedDoc } from './ring-mid-seed.ts';
import { createStore } from '../../server/src/store.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
const out = '.look/rider-coach-r3-polish/fleet';
fs.mkdirSync(out, { recursive: true });
const old = execFileSync('git', ['show', '09c5ac670:src/prefab/builders/coach-parts.ts'], { encoding: 'utf8' });
const factory = old
  .slice(old.indexOf("registerBuilder('railway.coach-parts', ") + "registerBuilder('railway.coach-parts', ".length)
  .trim()
  .slice(0, -2);
const seed = buildSeedWorld('boiler-long');
while (legRow(seed.w, 0).laid < 4) laySection(seed);
if (act(seed, 'a', 'rail.jump') !== 1) throw new Error('Air jump refused');
// Join all six under the real fleet rule before persisting the seed.
for (let i = 0; trains(seed.w).some((r, k) => k > 0 && r.phase === 2) && i < 30000; i++) advance(seed, 1);
if (trains(seed.w).some((r, k) => k > 0 && r.phase === 2)) throw new Error('Full fleet did not join');

const doc = await seedDoc(seed),
  stack = await startStack({ warp: true }),
  browser = await launch();
let stopped: number | undefined;
try {
  const store = createStore({ dataDir: stack.dataDir!, maxRooms: 2 });
  await store.init();
  const result = await store.write(railwayRoomId('coach-art-fleet'), {
    ...doc,
    writerId: SERVER_ID,
    updatedAt: new Date().toISOString(),
  });
  if (result.status !== 200) throw new Error('Seed refused');
  const g = await Game.open(browser, stack, {
    room: 'coach-art-fleet',
    out,
    size: [1200, 800],
    warp: true,
    sourceImports: true,
    query: 'debugcam=1',
  });
  await g.wait(1);
  const pid = Number(
    execFileSync('lsof', ['-t', `-iTCP:${new URL(stack.clockUrl!).port}`, '-sTCP:LISTEN'], { encoding: 'utf8' }).trim(),
  );
  process.kill(pid, 'SIGSTOP');
  stopped = pid;
  const setup = await g.eval(`
 window.__warp.pause();
 const S=await import('/src/render/scene.ts');
 const R=await import('/dev/look/rail-read.ts');
 const url=/from\\s+"([^"]*three_webgpu[^"]*)"/.exec(await(await fetch('/src/render/scene.ts')).text())[1];
 const THREE=await import(url);
 const {merged}=await import('/src/render/part-geometry.ts');
 const {RIDER_CAR}=await import('/src/entities/railway/cars.ts');
 const {TRADE}=await import('/src/sim/railway-trade-layout.ts');
 ${stripTypeScriptTypes(`const build=${factory};`)}
 const rows=R.inspectRailway().line2View.trains;
 const bodies=S.scene.getObjectsByProperty('name','rider-coach-body');
 if(bodies.length!==6||rows.slice(1).some(r=>r.phase===2))throw new Error('Six active coaches required');
 const pairs=[];for(const body of bodies){
   const under=body.parent.parent.getObjectByName('rider-coach-underframe');
   const beforeBody=build({kind:'body'}).object,beforeUnder=build({kind:'underframe'}).object;
   body.parent.add(beforeBody,beforeUnder);beforeBody.visible=beforeUnder.visible=false;
   pairs.push({body,under,beforeBody,beforeUnder});
 }
 S.scene.updateMatrixWorld(true);
 const box=new THREE.Box3();for(const body of bodies)box.union(new THREE.Box3().setFromObject(body));
 const centre=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.z,20);
 S.camera.position.copy(centre).add(new THREE.Vector3(span*.15,span*.9,span*.55));
 S.camera.lookAt(centre);S.camera.fov=75;S.camera.far=Math.max(S.camera.far,span*5);S.camera.updateProjectionMatrix();S.camera.updateMatrixWorld();
 const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(S.camera.projectionMatrix,S.camera.matrixWorldInverse));
 const visibility=bodies.map(body=>frustum.intersectsBox(new THREE.Box3().setFromObject(body)));
 if(visibility.some(v=>!v))throw new Error('Fleet outside camera');
 window.__fleetDraw=async before=>{
   for(const p of pairs){p.body.visible=p.under.visible=!before;p.beforeBody.visible=p.beforeUnder.visible=before;}
   const frame=S.renderer._nodes.nodeFrame;frame.frameId++;frame.deltaTime=0;
   S.renderer.info.reset();S.renderFrame();
   const counts={...S.renderer.info.render},png=S.canvas.toDataURL('image/png').split(',')[1];
   await S.renderer.backend.device.queue.onSubmittedWorkDone();return {counts,png};
 };
 const pools=[];S.scene.traverse(m=>{if(m.isInstancedMesh)pools.push({name:m.name,used:m.count,capacity:m.instanceMatrix.count});});
 return {rows,visibility,camera:{cam:S.camera.position.toArray(),look:centre.toArray(),fov:75},pools};
 `);
  const samples = [];
  for (const before of [true, false, true, false]) {
    const sample = (await g.eval(`return await window.__fleetDraw(${before});`)) as { counts: unknown; png: string };
    fs.writeFileSync(`${out}/${before ? 'before' : 'after'}.png`, Buffer.from(sample.png, 'base64'));
    samples.push({ before, counts: sample.counts });
  }
  process.kill(pid, 'SIGCONT');
  stopped = undefined;
  await g.eval('window.__warp.go(1)');
  const health = { backend: g.gfx, errors: g.healthErrors(), gfx: g.gfxErrors, frames: await g.fps(1000) };
  fs.writeFileSync(
    `${out}/manifest.json`,
    JSON.stringify(
      {
        setup,
        samples,
        health,
        baseline: '09c5ac670',
        limit: 'Full fleet across the route, frozen same-frame ABAB counts; no timing claim.',
      },
      null,
      2,
    ),
  );
  if (health.errors.length || health.gfx.length || health.frames <= 0) throw new Error(JSON.stringify(health));
  console.log(JSON.stringify({ samples, health }));
  await g.close();
} finally {
  if (stopped) process.kill(stopped, 'SIGCONT');
  await browser.close();
  await stack.close();
}
