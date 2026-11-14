// The track layer's hand crossing to the up track on a double panel (owner, 14 November: "teleporting too quickly to the
// other track"). From a live laying seed, frames the gantry and both tracks from above in the flatbed's own frame and
// prints how long each crossing takes in rendered frames and milliseconds (trolley x from the down seat to the up seat).
// With `--rail-seed q5-held` (dev/look/lay-seed.ts) it pulls the sea switch itself once the page is up, so the whole
// 29 s of Q5's laying is in front of the capture; it is ready after 14 crossings, with the machine at cruise.
//   npm run look -- --real --rail-seed q5-held --eval dev/look/evals/track-layer-cross.ts \
//     --until window.__crossReady --video --seconds 6 --name layer-cross --question "..."
// crossView: top (default, above and behind), side (eye height off the up track's side).
const { scene } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { inspectRailway, line2SeaOpen, railRead, rw } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import('/src/physics/engine.ts' as string)) as typeof import('../../../src/physics/engine.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const view = new URLSearchParams(location.search).get('crossView') ?? 'top';
const page = window as Window & { __crossReady?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
background(
  (async () => {
    let rig = scene.getObjectByName('panel-mechanism');
    for (let n = 0; !rig && n < 1200; n++) {
      await wait(100);
      rig = scene.getObjectByName('panel-mechanism');
    }
    const trolley = rig?.getObjectByName('panel-trolley-slide');
    if (!rig || !trolley) throw new Error('track-layer-cross: no panel mechanism in the scene');
    for (let n = 0; n < 600 && !(railRead()?.ready() && me.body); n++) await wait(100);
    if (!line2SeaOpen(rw())) {
      // A funded Q5 held at the sea gate: stand at the summit switch and pull it, as a player would.
      const sea = inspectRailway()!.line2View.sea!;
      for (let n = 0; n < 100 && !line2SeaOpen(rw()); n++) {
        teleport(me.body!, sea.x + 0.8, sea.y + 0.4, sea.z);
        await wait(200);
        const target = interactTarget();
        if (target?.id === 'railway-sea-switch') target.run?.();
      }
      console.log(`CROSS sea switch pulled=${line2SeaOpen(rw())}`);
    }
    let side = 0;
    const eye = rig.position.clone(),
      look = rig.position.clone();
    const camera = () => {
      if (!side) return;
      rig.updateWorldMatrix(true, false);
      if (view === 'side') {
        rig.localToWorld(eye.set(side * 13, 3.2, 9));
        rig.localToWorld(look.set(side * 1.5, 1.2, 3.5));
      } else {
        rig.localToWorld(eye.set(side * 2, 9.5, -3.5));
        rig.localToWorld(look.set(side * 2, 0.5, 4.5));
      }
      window.__debugCam!.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], view === 'side' ? 40 : 50);
    };
    // One sample per rendered frame: a crossing runs from 0.5 m off the down seat's side to 3.5 m.
    const crossings: { frames: number; ms: number; step: number }[] = [];
    let from = -1,
      frames = 0,
      step = 0,
      lastX = 0,
      printed = 0;
    let said = 0,
      seen = 0,
      traced = 0;
    const trace: string[] = [];
    const sample = (now: number) => {
      const x = Math.abs(trolley.position.x);
      seen++;
      // Once ready (the machine is at cruise), two seconds of every frame's trolley place: ms since the last, x, z.
      if (page.__crossReady && trace.length < 120) {
        trace.push(`${(now - traced).toFixed(0)}:${trolley.position.x.toFixed(1)},${trolley.position.z.toFixed(1)}`);
        if (trace.length % 40 === 0) console.log(`CROSS trace ${trace.slice(-40).join(' ')}`);
      }
      traced = now;
      if (now - said > 3000) {
        said = now;
        console.log(`CROSS probe frames=${seen} x=${trolley.position.x.toFixed(2)} z=${trolley.position.z.toFixed(2)}`);
      }
      if (x > 3.5 && !side) side = Math.sign(trolley.position.x);
      camera();
      const d = Math.abs(x - lastX);
      if (x > 0.5 && lastX <= 0.5 && x > lastX) {
        from = now;
        frames = 0;
        step = 0;
      }
      if (from >= 0 && x > lastX) {
        frames++;
        step = Math.max(step, d);
        if (x >= 3.5) {
          crossings.push({ frames, ms: now - from, step });
          from = -1;
        }
      }
      lastX = x;
      if (side && !page.__crossReady && crossings.length >= 14) page.__crossReady = true;
      if (crossings.length >= printed + 6) {
        printed = crossings.length;
        const last = crossings.slice(-6);
        const mid = (k: 'frames' | 'ms' | 'step') => last.map((c) => c[k]).sort((a, b) => a - b)[3]!;
        console.log(
          `CROSS n=${crossings.length} frames=${mid('frames')} ms=${mid('ms').toFixed(0)} largestStep=${mid('step').toFixed(2)}m`,
        );
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })(),
  'track layer crossing probe',
);
export {};
