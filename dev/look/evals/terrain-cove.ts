// Matched terrain evidence through the existing broker/look harness. No alternate browser or renderer.
const q = new URLSearchParams(location.search);
const { me, cam } = await import('/src/player/player.ts' as string);
const { teleport, physicsTime, forEachContact } = await import('/src/physics/engine.ts' as string);
const { WALKABLE_NY } = await import('/src/constants.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { renderer, sun } = await import('/src/render/scene.ts' as string);
const { skyDebug } = await import('/src/render/sky.ts' as string);
const { observeGpu } = await import('/src/debug/prof-overlay.ts' as string);
const { background } = await import('/src/async.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
while (!me.body) await wait(80);
const reverse = q.get('coveShot') === 'reverse';
const wide = q.get('coveShot') === 'wide';
const previz = q.get('coveShot') === 'previz';
const swash = q.get('coveShot') === 'swash';
const owner = q.get('coveShot') === 'owner';
const turf = q.get('coveShot') === 'turf';
const arrival = q.get('coveShot') === 'arrival';
const x = arrival ? 813 : wide ? 801 : reverse ? 814 : 806,
  z = wide || arrival ? 10 : reverse ? 46 : q.get('coveWalk') === '1' ? 38 : 40;
teleport(me.body, x, H(x, z) + 1.2, z);
me.body.velocity.set(0, 0, 0);
// First path turn, facing the next authored knot (823,28). Keep the real follow arm/collision active.
cam.yaw = me.yaw = arrival ? -2.6344941492 : reverse ? 0.6 : -2.7;
cam.pitch = arrival ? -0.14 : -0.22;
cam.dist = 5.2;
setTimeout(() => {
  if (wide) window.__debugCam!.set([775, 9, 16], [806, 3, 43], 62);
  else if (previz) window.__debugCam!.set([775, 6, 16], [806, 3, 43], 62);
  else if (swash) window.__debugCam!.set([795.5, 2.2, 38.5], [802.1, 0.12, 43.3], 55);
  else if (turf) window.__debugCam!.set([806, 6, 45], [810, 4, 48], 55);
  // Reframe the owner's toe crop from the same wide camera station; original crop has no camera metadata.
  else if (owner) window.__debugCam!.set([775, 9, 16], [806, 2.4, 43], 28);
  else window.__debugCam!.clear();
}, 600);

// Same count method as dev/look/perf.ts: completed animation frames, shadows on/off, restored in finally.
async function counts() {
  const observer = await observeGpu();
  const autoShadow = sun.shadow.autoUpdate;
  const castShadow = sun.castShadow;
  const frame = async () => {
    const n = window.boogle!.prof.last.frames;
    while (window.boogle!.prof.last.frames === n) await wait(20);
    return { ...renderer.info.render };
  };
  try {
    await frame();
    const lit = await frame();
    skyDebug.shadowPass(false);
    // The frozen production sea does not run sky.update's debug setter each frame.
    sun.shadow.autoUpdate = false;
    sun.castShadow = false;
    sun.shadow.needsUpdate = false;
    await frame();
    const unshadowed = await frame();
    console.log(
      'WATER COVE_COUNTS ' +
        JSON.stringify({
          draws: lit.drawCalls,
          triangles: lit.triangles,
          shadowDraws: lit.drawCalls - unshadowed.drawCalls,
          shadowTriangles: lit.triangles - unshadowed.triangles,
          geometry: renderer.info.memory.geometries,
          measurement: observer.snapshot(),
          scope: 'separate completed frames; counts only, no timing interpretation',
        }),
    );
  } finally {
    skyDebug.shadowPass(true);
    sun.shadow.autoUpdate = autoShadow;
    sun.castShadow = castShadow;
    observer.stop();
  }
}
// Shadow toggling compiles alternate pipelines. Keep that diagnostic out of real-time motion captures.
if (q.get('coveWalk') !== '1' && !swash && !previz && !turf && !arrival)
  setTimeout(() => background(counts(), 'cove render counts'), 1200);
if (q.get('coveWalk') === '1') {
  (window as unknown as { __placeAct: () => void }).__placeAct = () =>
    background(
      (async () => {
        const { makeBot } = await import('/dev/look/bot.ts' as string);
        const bot = makeBot({ doneFlag: '__coveWalkDone' });
        const stopped = async (label: string) => {
          const body = me.body!;
          const brake = physicsTime();
          while (physicsTime() - brake < 0.5) await wait(20);
          const origin = { x: body.position.x, y: body.position.y, z: body.position.z };
          const start = physicsTime();
          let drift = 0,
            dryGrounded = true;
          while (physicsTime() - start < 8) {
            let supported = false;
            forEachContact(body, (_x: number, y: number) => {
              if (y > WALKABLE_NY) supported = true;
            });
            dryGrounded &&= supported && !me.swimming;
            drift = Math.max(
              drift,
              Math.hypot(body.position.x - origin.x, body.position.y - origin.y, body.position.z - origin.z),
            );
            await wait(20);
          }
          const speed = Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z);
          console.log(
            'PLAY COVE_STOP ' +
              JSON.stringify({ label, origin, seconds: physicsTime() - start, drift, speed, dryGrounded }),
          );
          const stable = drift <= 0.1 && speed <= 0.05 && dryGrounded;
          bot.check(`cove post-stop ${label}`, stable);
          if (!stable) throw new Error(`Cove post-stop failed: ${label}, drift=${drift}, speed=${speed}`);
        };
        await stopped('original 806,38 start');
        for (const [x, z] of [
          [808, 40],
          [810, 42],
          [810, 44],
          [810, 42],
          [808, 40],
          [806, 38],
        ]) {
          const reached = await bot.straight(x!, z!, 0.65, 30000);
          bot.check(`cove filmed leg ${x},${z}`, reached && !me.swimming);
          if (!reached || me.swimming) throw new Error(`Cove filmed leg failed: ${x},${z}`);
          await stopped(`${x},${z}`);
        }
        bot.finish('cove foot approach and return');
      })(),
      'cove camera walk',
    );
}
export {};
