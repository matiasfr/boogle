// timeout 240 node dev/look/town-b2-reload.ts
// Real hold/buy/reload through the look harness. Response-only probes count the actual site effects; no shared edits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { Game, startStack, launch, enterGame, reportGfxErrors, sleep } from './lib.ts';
import { writeRailSeed } from './rail-seed.ts';

const stack = await startStack();
let browser: Awaited<ReturnType<typeof launch>> | undefined;
const label = 'town-b2-reload';
const pose = { cam: [896, 25, 23], look: [910, 21, 32] };
try {
  browser = await launch();
  await writeRailSeed(stack.dataDir!, label, 'house-ready');
  const g = await Game.open(browser, stack, { room: label, sourceImports: true, hud: true });
  await g.ctx.addInitScript(() => {
    Object.assign(window, { __b2Effects: { thump: 0, dust: 0, silent: 0, starts: [], frames: [] } });
    // Reapply the same inspection camera after navigation, including the first town frame.
    setInterval(() => window.__debugCam?.set([896, 25, 23], [910, 21, 32]), 100);
  });
  await g.ctx.route(/\/src\/place\/(sites|pieces)\.ts(?:\?|$)/, async (route) => {
    const response = await route.fetch();
    let body = await response.text();
    if (route.request().url().includes('/sites.ts')) {
      assert.ok(body.includes('function startSite(') && body.includes('set.update(dt);'), 'site probe anchors');
      body = body
        .replace(/\bthump\(/g, '(window.__b2Effects.thump++, thump)(')
        .replace(/\bdustRing\(/g, '(window.__b2Effects.dust++, dustRing)(')
        .replace(
          'site.t = -delay;',
          `site.t = -delay;
          if(site.id === 'plot.0') window.__b2Effects.starts.push({elapsed:-delay, thump:window.__b2Effects.thump,dust:window.__b2Effects.dust});`,
        )
        .replace(
          'set.update(dt);',
          `const beforeThump=window.__b2Effects.thump,beforeDust=window.__b2Effects.dust;
          set.update(dt);
          if(window.__b2Effects.starts.length && window.__b2Effects.frames.length < 12)
            window.__b2Effects.frames.push({thump:window.__b2Effects.thump-beforeThump,dust:window.__b2Effects.dust-beforeDust});`,
        );
    } else {
      assert.ok(body.includes('if (-delay >= fall) {'), 'silent landing probe anchor');
      body = body.replace('if (-delay >= fall) {', 'if (-delay >= fall) { window.__b2Effects.silent++;');
    }
    await route.fulfill({ response, body });
  });
  const ready = async () => {
    await enterGame(g.page, 60000);
    await g.page.waitForFunction(() => !!window.__debugCam && !!window.boogle?.sync, null, { timeout: 60000 });
    await g.eval(`const {railwayCommands}=await import('/src/entities/railway/state.ts');
      const {inspectTown}=await import('/src/entities/town/state.ts');
      const end=performance.now()+30000;
      while((!railwayCommands()?.read.ready() || !inspectTown()?.plots.length) && performance.now()<end)
        await new Promise(r=>setTimeout(r,50));
      window.__b2Read=()=>({tick:railwayCommands()?.read.tick(),plot:inspectTown()?.plots[0]});`);
    await g.view(pose);
  };
  // Warm the reload path before buying. The second reload below is the measured mid-build return.
  await g.page.reload({ waitUntil: 'domcontentloaded' });
  // Game.open masks the splash; navigation needs that same inspection-only mask again.
  await g.page.addStyleTag({ content: '.splash { display: none !important }' });
  await ready();
  await sleep(5000); // Let arrival restore its saved pose before the diagnostic teleport.
  await g.eval(`const {me,cam}=await import('/src/player/player.ts');
    const {teleport}=await import('/src/physics/engine.ts');
    teleport(me.body,904.6,18.9,33.4);me.body.velocity.set(0,0,0);cam.yaw=me.yaw=Math.PI;`);
  await sleep(2000);
  const motion = g.motion(label, { seconds: 18, frames: 19 }).then(
    (value) => ({ value }),
    (error) => ({ error }),
  );
  await g.eval(`const {triggerAction}=await import('/src/player/controls.ts');
    const {interactTarget}=await import('/src/player/hands.ts');
    const {me}=await import('/src/player/player.ts');
    if(interactTarget()?.id!=='town.plot.0.1'||!interactTarget()?.run)throw Error('board not offered: '+JSON.stringify({target:interactTarget()?.id,entered:me.entered,position:me.body?.position,read:window.__b2Read()}));
    triggerAction('interact','down');setTimeout(()=>triggerAction('interact','up'),1200);`);
  await g.page.waitForFunction(
    `window.__b2Read().plot.at >= 0 && window.__b2Read().tick >= window.__b2Read().plot.at + 50`,
    null,
    { timeout: 20000 },
  );
  const before = await g.eval('return {read:window.__b2Read(),effects:window.__b2Effects};');
  console.log('B2 BEFORE RELOAD', JSON.stringify(before));
  await g.page.reload({ waitUntil: 'domcontentloaded' });
  // Game.open masks the splash; navigation needs that same inspection-only mask again.
  await g.page.addStyleTag({ content: '.splash { display: none !important }' });
  await ready();
  const arrived = await g.eval('return {read:window.__b2Read(),effects:window.__b2Effects};');
  const captured = await motion;
  if ('error' in captured) throw captured.error;
  const sheet = captured.value;
  const after = await g.eval('return {read:window.__b2Read(),effects:window.__b2Effects};');
  await g.still(label);
  fs.writeFileSync(
    `.look/${label}-counters.json`,
    JSON.stringify({ before, arrived, after, sheet: sheet.sheet }, null, 2),
  );
  console.log('B2 AFTER RELOAD', JSON.stringify(after));
  assert.ok(after.effects.starts[0]?.elapsed >= 5 && after.effects.starts[0]?.elapsed < 10, 'returned mid-build');
  assert.ok(after.effects.silent > 0, 'past pieces placed silently');
  assert.ok(after.effects.frames[0]?.thump <= 1 && after.effects.frames[0]?.dust <= 1, 'no first-frame burst');
  assert.ok(after.effects.thump > 0 && after.effects.dust > 0, 'remaining landings still play');
  assert.equal(after.read.plot.state, 'done');
  reportGfxErrors([g]);
  assert.equal(g.gfx, 'webgpu');
  assert.ok((await g.fps(1000)) > 0, 'completed game frames advance');
  assert.deepEqual(g.healthErrors(), []);
  console.log('B2 RELOAD PASS', sheet.sheet);
} catch (error) {
  console.error('B2 RELOAD FAIL', error);
  throw error;
} finally {
  await browser?.close();
  await stack.close();
}
