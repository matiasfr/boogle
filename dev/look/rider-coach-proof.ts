// Real-time production coach proofs. Each mode observes actual server boarding/arrival/departure; no mirror writes.
// node --import ./dev/sim/hooks.ts dev/look/rider-coach-proof.ts home|pier|curve|gorge|ring
import fs from 'node:fs';
import { startStack, launch, Game } from './lib.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { laySection } from '../../src/sim/railway-seed-legs.ts';
import { legRow } from '../../src/sim/railway-queries-route.ts';
import { trains } from '../../src/sim/railway-rows.ts';
import { railwayCheck } from '../../src/sim/railway-check.ts';
import { seedDoc } from './ring-mid-seed.ts';
import { createStore } from '../../server/src/store.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { RAIL_LINES, LINE2 } from '../../src/sim/railway-lines.ts';
import { line2World, line2Y } from '../../src/entities/railway/line2-path.ts';
import { coachCameras } from './rider-coach-cameras.ts';
const mode = process.argv[2];
if (!['home', 'pier', 'curve', 'gorge', 'ring'].includes(mode!)) throw new Error('Expected home|pier|curve|gorge|ring');
const art = process.argv.includes('--coach-art');
const out = art ? `.look/rider-coach-r3-polish/motion/${mode}` : `.look/rider-coach-r2b/finish/${mode}`;
fs.mkdirSync(out, { recursive: true });
const seed = buildSeedWorld(mode === 'home' || mode === 'pier' ? 'q6-done' : 'boiler-long');
if (mode === 'gorge') while (legRow(seed.w, 0).laid < 4) laySection(seed);
railwayCheck(seed.w, seed.t);
const slot = mode === 'home' || mode === 'pier' ? 1 : trains(seed.w).findIndex((r) => r.wagon);
const halt = mode === 'pier' ? 3 : mode === 'gorge' ? 9 : mode === 'ring' ? 5 : 0;
const stop = RAIL_LINES[LINE2]!.halts[halt]!.s / 100;
const p = line2World(stop - 4, 0, { x: 0, z: 0 });
const q = line2World(stop + 1, 0, { x: 0, z: 0 });
const len = Math.hypot(q.x - p.x, q.z - p.z),
  ux = (q.x - p.x) / len,
  uz = (q.z - p.z) / len;
const y = line2Y(stop);
const wide = mode === 'gorge' || mode === 'curve' || mode === 'ring';
let camera = [p.x - uz * (wide ? 30 : 10), y + (wide ? 15 : 5), p.z + ux * (wide ? 30 : 10)];
let target = [p.x, y + 1.1, p.z];
if (mode === 'pier') {
  // Across the track, below the canopy: the fourth rider fills this side's second opening.
  const c = line2World(stop - 3.55, -10, { x: 0, z: 0 });
  camera = [c.x, y + 3.5, c.z];
}
if (mode === 'ring') {
  // Opposite the loader canopy: both passenger cars remain visible.
  const c = line2World(stop - 5, -24, { x: 0, z: 0 });
  camera = [c.x, y + 12, c.z];
}
if (mode === 'gorge') {
  // Fixed north platform, looking toward Home: both passenger cars and the last car at the turn.
  const c = line2World(stop + 16, 4.05, { x: 0, z: 0 });
  const t = line2World(stop - 3.55, 0, { x: 0, z: 0 });
  camera = [c.x, y + 5, c.z];
  target = [t.x, y + 0.7, t.z];
}
if (art && (mode === 'home' || mode === 'pier')) {
  // Platform-facing low view: inspect the lowering pair, beneath the canopy.
  const c = line2World(stop - 3.55, mode === 'home' ? 8 : 10, { x: 0, z: 0 });
  const t = line2World(stop - 3.55, 0, { x: 0, z: 0 });
  camera = [c.x, y + 2.7, c.z];
  target = [t.x, y + 1.0, t.z];
}
if (art && mode === 'home') {
  const fixed = coachCameras.counts[2]!;
  camera = fixed.cam;
  target = fixed.look;
}
const doc = await seedDoc(seed);
const stack = await startStack({ warp: true });
const browser = await launch();
try {
  const room = `r2b-${mode}`;
  const store = createStore({ dataDir: stack.dataDir!, maxRooms: 2 });
  await store.init();
  const written = await store.write(railwayRoomId(room), {
    ...doc,
    writerId: SERVER_ID,
    updatedAt: new Date().toISOString(),
  });
  if (written.status !== 200) throw new Error(`seed refused: ${written.status}`);
  const g = await Game.open(browser, stack, {
    sourceImports: true,
    out,
    size: [1200, 800],
    room,
    warp: true,
    query: 'debugcam=1',
  });
  await g.eval(`
    const R = await import('/dev/look/rail-read.ts');
    const T = await import('/src/sim/railway-train.ts');
    const {me} = await import('/src/player/player.ts');
    const {teleport} = await import('/src/physics/engine.ts');
    teleport(me.body, ${camera[0]}, ${camera[1]}, ${camera[2]});
    window.__debugCam.set(${JSON.stringify(camera)}, ${JSON.stringify(target)}, 50);
    window.__coachProof = { R, T, slot: ${slot}, halt: ${halt}, samples: [] };
    const S = await import('/src/render/scene.ts');
    setInterval(() => {
      const x = window.__coachProof, r = R.train(R.rw(), x.slot);
      const sample = {wall: performance.now(), tick: R.railAt(), phase:r.phase, at:r.at, to:r.to, riders:r.riders, wagon:r.wagon, boiler:r.boiler, along:T.trainAlong(r,1,R.railAt()),steps:S.scene.getObjectsByProperty('name','rider-coach-body').map(o=>o.children.filter(c=>c.name.startsWith('coach_step_')).map(c=>({name:c.name,angle:c.rotation.z})))};
      const last = x.samples.at(-1);
      if (!last || last.tick !== sample.tick) x.samples.push(sample);
    }, 50);
  `);
  await g.wait(1);
  await fetch(stack.clockUrl!, { method: 'POST', body: '15' });
  await g.eval('window.__warp.go(15)');
  const ready = await g.waitFor(
    `(() => {const x=window.__coachProof, r=x.R.train(x.R.rw(),x.slot); return r.phase===1 && r.to===x.halt && x.T.trainArrives(r,1)-x.R.railAt() < 100 && x.T.trainArrives(r,1)-x.R.railAt() > 30;})()`,
    { timeout: 180000, step: 50 },
  );
  await fetch(stack.clockUrl!, { method: 'POST', body: '1' });
  await g.eval('window.__warp.go(1); window.__coachProof.samples.length=0;');
  if (ready < 0) throw new Error(`${mode}: approach not reached`);
  const video = `${out}/${mode}-realtime.webm`;
  await g.page.screencast.start({ path: video, size: { width: 1200, height: 800 }, fps: 30 });
  try {
    await Promise.all([
      g.motion(mode!, { frames: 18, seconds: wide ? 26 : 18 }),
      (async () => {
        const stood = await g.waitFor(
          `(() => {const x=window.__coachProof,r=x.R.train(x.R.rw(),x.slot);return r.phase===0&&r.at===x.halt;})()`,
          { timeout: 15000, step: 50 },
        );
        if (stood < 0) throw new Error(`${mode}: standing moment missed`);
        await g.wait(0.8);
        await g.still(`${mode}-standing`);
        const left = await g.waitFor(
          `(() => {const x=window.__coachProof,r=x.R.train(x.R.rw(),x.slot);return r.phase===1&&r.at===x.halt;})()`,
          { timeout: 12000, step: 50 },
        );
        if (left < 0) throw new Error(`${mode}: departure missed`);
        await g.wait(0.4);
        await g.still(`${mode}-departing`);
      })(),
    ]);
  } finally {
    await g.page.screencast.stop();
  }
  const samples = await g.eval('return window.__coachProof.samples;');
  const errors = g.healthErrors(),
    fps = await g.fps(1000);
  fs.writeFileSync(
    `${out}/proof.json`,
    JSON.stringify(
      { mode, slot, halt, stop, camera, target, seedTick: seed.t, samples, errors, fps, gfx: g.gfx },
      null,
      2,
    ),
  );
  if (errors.length || fps <= 0) throw new Error(JSON.stringify({ errors, fps }));
  await g.close();
} finally {
  await browser.close();
  await stack.close();
}
