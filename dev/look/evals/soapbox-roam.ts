// The finish and driving on (src/proto/soapbox/, docs/game-design/soapbox.md, "After the finish"): the pilot runs the
// course (dev/look/evals/soapbox-pilot.ts), crosses the line and keeps driving across the flat lowland toward the court.
// The sheet starts about 25 m before the finish. window.__roam is a trace every 200 ms: [s, state, x, z, m/s, heave,
// pitch, roll, the Interact verb].
// BOOGLE_QUERY=proto=soapbox npm run look -- --eval dev/look/evals/soapbox-roam.ts --hud --warm 0.2 --seconds 12 --frames 16
// The pilot sometimes wipes out on the course (it says so; run it again). &again=<s> (in the query): that long after the finish brake to a stop, press Interact (Back to the top) and run again.
const { drive, obstacle } = (await import(
  '/dev/look/evals/soapbox-pilot.ts' as string
)) as typeof import('./soapbox-pilot.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { groundHeight } = (await import(
  '/src/island/terrain.ts' as string
)) as typeof import('../../../src/island/terrain.ts');
const { interactTarget } = (await import(
  '/src/player/hands.ts' as string
)) as typeof import('../../../src/player/hands.ts');
const box = window.__soapbox as {
  S: { heading: number; seated: boolean };
  ride: { heave: number; pitch: number; roll: number };
  run: { state: string; time: number };
  FINISH: { x: number; z: number };
  body: { position: { x: number; z: number }; velocity: { x: number; z: number } };
};
const q = new URLSearchParams(location.search);
const again = q.has('again') ? Number(q.get('again')) : 0;
const OPEN_GROUND: [number, number][] = [
  [-52, -36],
  [-40, -22],
  [-25, -8],
  [-8, 8],
  [8, 20],
];
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const p = box.body.position,
  v = box.body.velocity;
const speed = () => Math.hypot(v.x, v.z);

await drive({});
const trace: unknown[][] = [];
(window as unknown as { __roam: unknown }).__roam = trace;
const t0 = performance.now();
const iv = setInterval(() => {
  const r = box.ride;
  trace.push([
    +((performance.now() - t0) / 1000).toFixed(1),
    box.run.state,
    Math.round(p.x),
    Math.round(p.z),
    +speed().toFixed(1),
    +r.heave.toFixed(3),
    +r.pitch.toFixed(3),
    +r.roll.toFixed(3),
    interactTarget()?.verb ?? '',
  ]);
  if (!box.S.seated) clearInterval(iv);
}, 200);

// Drive on in the background once the run is done.
void (async () => {
  for (let k = 0; k < 400 && box.run.state !== 'done'; k++) await sleep(50);
  const done = performance.now();
  console.log('[soapbox-roam] finished', box.run.state, box.run.time);
  let wp = 0;
  const step = () => {
    if (!box.S.seated) return;
    if (again && performance.now() - done > again * 1000) {
      input.stickX = input.triggerR = 0;
      input.triggerL = speed() > 0.5 ? 1 : 0;
      if (speed() < 1.2) {
        input.triggerL = 0;
        console.log('[soapbox-roam] stopped: Interact reads', interactTarget()?.verb);
        interactTarget()?.run?.();
        console.log('[soapbox-roam] after it, the run is', box.run.state);
        void drive({}).then(() => console.log('[soapbox-roam] second run on'));
        return;
      }
      requestAnimationFrame(step);
      return;
    }
    while (wp < OPEN_GROUND.length - 1 && Math.hypot(OPEN_GROUND[wp]![0] - p.x, OPEN_GROUND[wp]![1] - p.z) < 5) wp++;
    const [tx, tz] = OPEN_GROUND[wp]!;
    const err = wrap(Math.atan2(-(tx - p.x), -(tz - p.z)) - box.S.heading);
    let steer = Math.max(-1, Math.min(1, -err * 2.5));
    // round whatever solid thing is close ahead, on the side it already lies off
    const o = obstacle(p.x, p.z);
    if (o) {
      const fx = -Math.sin(box.S.heading),
        fz = -Math.cos(box.S.heading),
        dx = o[0] - p.x,
        dz = o[1] - p.z;
      const ahead = dx * fx + dz * fz,
        side = dx * -fz + dz * fx; // + to the right
      if (ahead > 0 && ahead < 9 && Math.abs(side) < 2.5) steer = side > 0 ? -1 : 1;
    }
    // and keep off the water: low ground ahead, turn for the higher side
    const at = (off: number) => {
      const h = box.S.heading + off;
      return groundHeight(p.x - Math.sin(h) * 9, p.z - Math.cos(h) * 9);
    };
    if (at(0) < 1.2) steer = at(0.7) > at(-0.7) ? -1 : 1; // + heading is left
    input.stickX = steer;
    input.triggerR = Math.max(0, Math.min(1, (10 - speed()) / 3));
    input.triggerL = 0;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
})();

// Hold the sheet back until the finish is close (&after=<s>: that long past the finish, out on the flat).
const after = q.has('after') ? Number(q.get('after')) : -1;
for (let k = 0; k < 400 && Math.hypot(p.x - box.FINISH.x, p.z - box.FINISH.z) > 25; k++) await sleep(50);
if (after >= 0) {
  for (let k = 0; k < 400 && box.run.state !== 'done' && box.S.seated; k++) await sleep(50);
  await sleep(after * 1000);
}
if (!box.S.seated)
  throw new Error('the pilot wiped out or reached the water, run it again: ' + JSON.stringify(trace.slice(-3)));
setTimeout(() => (window as unknown as { __debugCam?: { clear(): void } }).__debugCam?.clear(), 400); // after look.ts freezes its view

export {}; // a module for the type checker; look.ts strips this line (an eval body, not imported)
