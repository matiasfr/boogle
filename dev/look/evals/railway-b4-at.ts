// Disposable accepted --rail-seed fixture. No route bot, no shared-state fabrication in the browser.
const { inspectRailwayLegacy } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, raycastClosest } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const rail = (await import('/src/entities/railway/rail-kit.ts' as string)) as typeof import('../../../src/entities/railway/rail-kit.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const { GROUP } = (await import(
  '/src/physics/physics.ts' as string
)) as typeof import('../../../src/physics/physics.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = performance.now() + 15000;
while ((!inspectRailwayLegacy()?.ready || (inspectRailwayLegacy()?.line2?.completed ?? 0) < 4) && performance.now() < until)
  await wait(50);
const state = inspectRailwayLegacy();
if (!state?.ready || !state.line2 || state.line2.completed < 4 || !me.body)
  throw new Error('B4 requires an accepted Q4-complete --rail-seed');
const query = new URLSearchParams(location.search);
const shot = window as Window & { __b4Prepared?: boolean };
const action = !!shot.__b4Prepared;
const mode = query.get('b4at') ?? 'q5';
const line = layout.LINKS[1]!.line;
let p: { x: number; y: number; z: number }, target: { x: number; y: number; z: number };
if (mode === 'summit') {
  p = { x: 1015, y: 102.85, z: -6 };
  target = state.line2View.sea;
} else if (mode === 'q5') {
  const f = state.line2View.frames[4]!;
  p = { x: f.x - 3, y: f.y + 0.85, z: f.z + 4 };
  const gate = (await import(
    '/src/place/tech-layout.ts' as string
  )) as typeof import('../../../src/place/tech-layout.ts');
  target = { x: gate.GATES.sea.x + layout.ORIGIN.x, y: gate.GATES.sea.y + 2, z: gate.GATES.sea.z };
} else if (mode === 'trestle' || mode === 'head') {
  const s = mode === 'head' ? 540 : 416,
    q = rail.besideLine(line, s, 0);
  p = { x: q.x, y: layout.railY(line, s) + 0.85, z: q.z };
  const aim = rail.besideLine(line, s - 55, 0);
  target = { x: aim.x, y: layout.railY(line, s - 55) + 1, z: aim.z };
} else throw new Error('Choose b4at=q5|summit|trestle|head');
teleport(me.body, p.x, p.y, p.z);
me.body.velocity.set(0, 0, 0);
cam.yaw = me.yaw = Math.atan2(-(target.x - p.x), -(target.z - p.z));
cam.pitch = -0.12;
if (mode === 'summit' && !action) {
  const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
  const bot = makeBot({
    recover: () => {
      throw new Error('B4 summit approach needed recovery');
    },
  });
  if (!(await bot.walk(target.x + 1.5, target.z, 0.3))) throw new Error('Could not approach the summit switch');
}
// A stationary authored camera makes the long route and the gate readable; the body remains on the deck.
const camera: [number, number, number] =
  mode === 'summit' ? [1027, 111, 7] : mode === 'q5' ? [p.x - 12, p.y + 10, p.z + 16] : [p.x + 12, p.y + 13, p.z + 22];
const aim: [number, number, number] = [target.x, target.y, target.z];
if (query.get('b4signal') === '1' && action) {
  camera.splice(0, 3, 1110, 95, 105);
  aim.splice(0, 3, 1105, 26, -19);
}
if (query.get('b4show') === '1') {
  camera.splice(0, 3, 1425, 58, -130);
  aim.splice(0, 3, 1340, 35, -158);
}
if (query.get('b4show') === 'village') {
  camera.splice(0, 3, 1006, 62, -45);
  aim.splice(0, 3, layout.VILLAGE.x + layout.ORIGIN.x, layout.VILLAGE.y + 22, layout.VILLAGE.z);
}
if (query.get('b4edge') === '1') {
  // The finishing track has not reached the head yet. Keep the diagnostic body on the already-solid rim.
  const rim = rail.besideLine(line, 280, 0);
  teleport(me.body, rim.x, layout.railY(line, 280) + 0.85, rim.z);
  me.body.velocity.set(0, 0, 0);
  if (inspectRailwayLegacy()!.line2.stations[4]!.completion === 1)
    throw new Error('Q5 finishing seed expired before mounting; live edge not observed');
  // completion is a terminal flag, not a progress fraction: watch the moving head before its final pairs.
  while (inspectRailwayLegacy()!.line2View.head < 532) await wait(50);
  if (inspectRailwayLegacy()!.line2View.head >= 546) throw new Error('Missed the live final-pair approach');
  let samples = 0;
  const timer = setInterval(() => {
    const state = inspectRailwayLegacy()!;
    console.log(
      `BFOUR edge ${JSON.stringify({
        completion: state.line2.stations[4]!.completion,
        lamps: state.line2View.trestleLamps,
        rockets: state.line2View.farHeadRockets,
        panels: state.line2View.panelCursor,
      })}`,
    );
    if (++samples >= 60) clearInterval(timer);
  }, 200);
}
window.__debugCam!.set(camera, aim, 65);
await wait(250);
if (state.line2.stations[4]?.completion === 1) {
  // Probe the solid walking surface every metre, including the Q4/Q5 seam. This does not replace a human walk.
  const hit = { hasHit: false, distance: 0, hitPointWorld: { x: 0, y: 0, z: 0 }, hitNormalWorld: { x: 0, y: 0, z: 0 } };
  let samples = 0,
    maxError = 0;
  const misses: { s: number; side: number; nearSupport: boolean }[] = [];
  for (let s = 285; s <= 546; s++)
    for (const side of [-1, 0, 1]) {
      const q = rail.besideLine(line, s, side),
        y = layout.railY(line, s);
      if (
        !raycastClosest({ x: q.x, y: y + 0.6, z: q.z }, { x: q.x, y: y - 0.3, z: q.z }, { mask: GROUP.SCENERY }, hit)
      ) {
        const nearby = (offset: number) => {
          const p = rail.besideLine(line, s + offset, side);
          return raycastClosest(
            { x: p.x, y: y + 0.6, z: p.z },
            { x: p.x, y: y - 0.3, z: p.z },
            { mask: GROUP.SCENERY },
            hit,
          );
        };
        misses.push({ s, side, nearSupport: nearby(-0.02) && nearby(0.02) });
        continue;
      }
      maxError = Math.max(maxError, Math.abs(hit.hitPointWorld.y - (y + 0.1)));
      samples++;
    }
  console.log(`BFOUR deck ${JSON.stringify({ samples, maxError, misses })}`);
}
console.log(`BFOUR pose ${mode} ${JSON.stringify(inspectRailwayLegacy()?.line2View)}`);
shot.__b4Prepared = true;
// Optional action body in the same permitted eval file; pressing uses the existing real-input bot.
if (query.get('b4pull') === '1' && action) {
  const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
  const bot = makeBot({
    recover: () => {
      throw new Error('B4 pull needed recovery');
    },
  });
  // The action invocation must keep the approached pose, rather than move back to the landing 3.2 m away.
  teleport(me.body, target.x + 1.5, 102.85, target.z);
  await wait(100);
  const offered = interactTarget();
  console.log(`BFOUR prompt ${JSON.stringify({ id: offered?.id, verb: offered?.verb })}`);
  if (offered?.id !== 'railway-sea-switch') throw new Error('Summit did not offer the sea switch');
  bot.press();
  if (!(await bot.until(() => !!inspectRailwayLegacy()?.line2?.sea, 2000, 'sea switch accepted')))
    throw new Error('Sea switch press was not accepted');
  console.log(`BFOUR pull ${JSON.stringify(inspectRailwayLegacy()?.line2View)}`);
}
// look applies its default pose after setup returns. Reapply this authored pose during its short warm-up.
setTimeout(() => window.__debugCam!.set(camera, aim, 65), 100);
for (const ms of [500, 2000, 6000, 10000])
  setTimeout(() => {
    const s = inspectRailwayLegacy(),
      v = s?.line2View;
    console.log(
      `BFOUR after ${ms} ${JSON.stringify({ completed: s?.line2?.completed, seaGateSolid: v?.seaGateSolid, lamps: v?.trestleLamps, rockets: v?.farHeadRockets, panels: v?.panelCursor, cart: v?.cart })}`,
    );
  }, ms);
export {};
