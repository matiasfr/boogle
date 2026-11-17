// R3 fixed-camera art proof. Cosmetic occupancy only; accepted train rows/physics are never rewritten.
// node --import ./dev/sim/hooks.ts dev/look/rider-coach-art.ts home|pier|pier-up|stage
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { stripTypeScriptTypes } from 'node:module';
import { startStack, launch, Game } from './lib.ts';
import { writeRailSeed } from './rail-seed.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { act } from '../../src/sim/railway-seed-route.ts';
import { RAIL_HALTS, LINE2 } from '../../src/sim/railway-lines.ts';
import { seedDoc } from './ring-mid-seed.ts';
import { createStore } from '../../server/src/store.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { buildAt } from '../codex/source.ts';
import { coachCameras } from './rider-coach-cameras.ts';
const mode = process.argv[2] ?? 'home';
if (!['home', 'pier', 'pier-up', 'stage'].includes(mode)) throw new Error('Expected home|pier|pier-up|stage');
const out = `.look/rider-coach-r3-polish/captures/${mode}`;
fs.mkdirSync(out, { recursive: true });
const provenance = buildAt(process.cwd());
const fixed = coachCameras as Record<string, { name: string; cam: number[]; look: number[]; fov: number }[]>;
const stack = await startStack({ warp: true }),
  browser = await launch();
let stopped: number | undefined;
const results: unknown[] = [];
try {
  const room = `coach-art-${mode}`;
  if (mode === 'pier-up') {
    const seed = buildSeedWorld('boiler-long');
    const id = RAIL_HALTS.findIndex((h) => h.line === LINE2 && h.stop === 3);
    if (act(seed, 'a', 'rail.call', { id, dir: -1 }) !== 1) throw new Error('Pier homeward call refused');
    const doc = await seedDoc(seed),
      store = createStore({ dataDir: stack.dataDir!, maxRooms: 2 });
    await store.init();
    const result = await store.write(railwayRoomId(room), {
      ...doc,
      writerId: SERVER_ID,
      updatedAt: new Date().toISOString(),
    });
    if (result.status !== 200) throw new Error('Pier homeward seed refused');
  } else await writeRailSeed(stack.dataDir!, room, mode === 'pier' ? 'q6-done' : 'boiler-long');
  const g = await Game.open(browser, stack, {
    room,
    out,
    size: [1200, 800],
    warp: true,
    sourceImports: true,
    query: 'debugcam=1',
  });
  if (mode === 'stage') {
    for (const light of ['studio', 'shipped'])
      for (const side of [-1, 1]) {
        const query = new URLSearchParams({
          asset: 'rider-coach',
          reference: '1',
          bounds: '0',
          grid: '0',
          play: '0',
          t: '1',
          light,
          exposure: light === 'studio' ? '1' : '0.16',
          cam: `${side * 4},2.7,6`,
          target: '0.7,1,0',
        });
        await g.eval(
          `document.getElementById('asset-motion-stage')?.remove(); history.replaceState(null,'','?stage='+encodeURIComponent(${JSON.stringify(query.toString())}));`,
        );
        await g.eval(
          stripTypeScriptTypes(fs.readFileSync('dev/look/evals/asset-stage.ts', 'utf8')).replace(
            /^export \{\};.*$/m,
            '',
          ),
        );
        await g.still(`${light}-${side}`);
        results.push(await g.eval('return document.querySelector("iframe").contentWindow.assetStage.inspect();'));
      }
    // Stage's Y-axis turntable (not the axle-spin diagnostic), with Buddy for scale.
    await g.eval(`const d=document.querySelector('iframe').contentDocument;d.getElementById('spin').checked=true;`);
    await g.page.screencast.start({
      path: '.look/rider-coach-r3-polish/stage-turntable.webm',
      size: { width: 1200, height: 800 },
      fps: 30,
    });
    try {
      await g.motion('turntable', { frames: 16, seconds: 10.5 });
    } finally {
      await g.page.screencast.stop();
    }
  } else {
    await g.eval(
      `window.__R=await import('/dev/look/rail-read.ts');window.__T=await import('/src/sim/railway-train.ts');`,
    );
    await fetch(stack.clockUrl!, { method: 'POST', body: '15' });
    await g.eval('window.__warp.go(15)');
    const condition =
      mode === 'home'
        ? 'r.wagon && r.phase===0 && r.at===0 && r.track===0'
        : mode === 'pier-up'
          ? 'r.phase===0 && r.at===3 && r.track===1'
          : 'k===1 && r.phase===0 && r.at===3';
    if (
      (await g.waitFor(
        `(()=>{const k=window.__R.inspectRailway().line2View.trains.findIndex((r,k)=>${condition} && r.depart+window.__T.TRAIN.dwellTicks-window.__R.railAt()>20);if(k<0)return false;window.__slot=k;window.__warp.pause();return true;})()`,
        {
          timeout: 180000,
          step: 20,
        },
      )) < 0
    )
      throw new Error(`${mode}: arrival missed`);
    const pid = Number(
      execFileSync('lsof', ['-t', `-iTCP:${new URL(stack.clockUrl!).port}`, '-sTCP:LISTEN'], {
        encoding: 'utf8',
      }).trim(),
    );
    process.kill(pid, 'SIGSTOP');
    stopped = pid;
    await g.eval(`window.__warp.pause();
      window.__S=await import('/src/render/scene.ts'); window.__F=await import('/src/place/folk.ts');
      window.__K=await import('/src/entities/railway/coach-kit.ts');
      const car=window.__R.inspectRailway().line2View.trains[window.__slot].cars[2];
      window.__coach=window.__S.scene.getObjectsByProperty('name','rider-coach-body').find(o=>{const v=window.__S.camera.position.clone();o.getWorldPosition(v);return Math.hypot(v.x-car.x,v.z-car.z)<1});
      if(!window.__coach)throw new Error('Production coach missing');
      const {me}=await import('/src/player/player.ts'),{teleport}=await import('/src/physics/engine.ts');
      teleport(me.body,car.x+4,car.y+3,car.z);
      await window.__warp.step(24); window.__warp.pause();
      window.__draw=async (pose,count)=>{
        const {camera,renderFrame,renderer}=window.__S;
        camera.position.set(...pose.cam);camera.lookAt(...pose.look);camera.fov=pose.fov;
        camera.updateProjectionMatrix();camera.updateMatrixWorld();
        window.__F.folk.setRiders(window.__slot,count,{mesh:window.__coach,top:.7,seats:window.__K.COACH_SEATS});
        // First update relocates newly enabled riders; the second reculls from their new places.
        window.__F.updateFolk(0); window.__F.updateFolk(0);
        const frame=renderer._nodes.nodeFrame;frame.frameId++;frame.deltaTime=0;
        const before=renderer.info.calls;renderFrame();
        const png=window.__S.canvas.toDataURL('image/png').split(',')[1];
        await renderer.backend.device.queue.onSubmittedWorkDone();
        if(renderer.info.calls<=before)throw new Error('No fresh draw');
        return png;
      };`);
    const row = await g.eval(
      'return {row:window.__R.train(window.__R.rw(),window.__slot),view:window.__R.inspectRailway().line2View.trains[window.__slot],seats:window.__K.COACH_SEATS};',
    );
    results.push(row);
    let cameras = fixed.counts!;
    if (mode.startsWith('pier'))
      cameras =
        (await g.eval(`const o=window.__coach; o.updateWorldMatrix(true,false); const v=window.__S.camera.position.clone();
      const at=(x,y,z)=>v.set(x,y,z).applyMatrix4(o.matrixWorld).toArray();
      return [-1,1].flatMap(s=>[{name:'side'+s+'-game',cam:at(s*10,5,-4),look:at(0,1.3,0),fov:62},{name:'side'+s+'-close',cam:at(s*3.5,2.1,0),look:at(0,1.3,0),fov:50}]);`)) as typeof cameras;
    for (const count of [8, 3, 0, 1, 4])
      for (const [i, pose] of cameras.entries()) {
        const png = (await g.eval(`return await window.__draw(${JSON.stringify(pose)},${count});`)) as string;
        const path = `${out}/count-${count}-c${i}-still.png`;
        fs.writeFileSync(path, Buffer.from(png, 'base64'));
        results.push({ count, camera: pose, path, cosmetic: true });
      }
    if (mode === 'home')
      for (const [i, pose] of fixed.home!.entries()) {
        const png = (await g.eval(`return await window.__draw(${JSON.stringify(pose)},8);`)) as string;
        const path = `${out}/approved-c${i}-still.png`;
        fs.writeFileSync(path, Buffer.from(png, 'base64'));
        results.push({ camera: pose, path });
      }
    results.push(
      await g.eval(
        `return window.__coach.children.filter(o=>o.name.startsWith('coach_step_')).map(o=>({name:o.name,angle:o.rotation.z,side:o.userData.side}));`,
      ),
    );
    process.kill(pid, 'SIGCONT');
    stopped = undefined;
  }
  await g.eval('window.__warp.go(1)');
  const health = { backend: g.gfx, errors: g.healthErrors(), gfx: g.gfxErrors, frames: await g.fps(1000) };
  fs.writeFileSync(`${out}/manifest.json`, JSON.stringify({ mode, provenance, results, health }, null, 2));
  if (health.errors.length || health.gfx.length || health.frames <= 0) throw new Error(JSON.stringify(health));
  console.log(`${mode}: ${results.length} records; ${JSON.stringify(health)}`);
  await g.close();
} finally {
  if (stopped) process.kill(stopped, 'SIGCONT');
  await browser.close();
  await stack.close();
}
