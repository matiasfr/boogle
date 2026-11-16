// The sea gate's pennant (owner, 15 November, on a sightline from the summit: "use your own judgement";
// decisions-controls.md): stills through the game's own follow camera, Buddy standing where a player would.
// `pennant=summit` (default): on Needle Bell's summit beside the glider (2 m from it, so the device is not in the
// way), facing the gate 160 m east.
// `pennant=foot`: on the ground at the gate's foot, looking up the far jamb. `pitch` sets the camera's pitch.
//   npm run look -- --rail-seed hook-earned --eval dev/look/evals/sea-pennant.ts --until window.__placeDone \
//     --frames 4 --seconds 2 --name sea-pennant-summit
//   npm run look -- --rail-seed q4-done --query pennant=foot --eval dev/look/evals/sea-pennant.ts \
//     --until window.__placeDone --frames 4 --seconds 2 --name sea-pennant-foot
const { railRead } = (await import('/dev/look/rail-read.ts' as string)) as typeof import('../rail-read.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const layout = (await import('/src/place/layout.ts' as string)) as typeof import('../../../src/place/layout.ts');
const tech = (await import(
  '/src/place/tech-layout.ts' as string
)) as typeof import('../../../src/place/tech-layout.ts');
const { LINE2_GLIDE, LINE2_SEA } = (await import(
  '/src/sim/railway-line2-layout.ts' as string
)) as typeof import('../../../src/sim/railway-line2-layout.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const page = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const foot = query.get('pennant') === 'foot';
for (let n = 0; !(railRead()?.ready() && me.body); n++) {
  if (n > 1200) throw new Error('PENNANT the railway never mounted');
  await wait(50);
}
const jamb = { x: LINE2_SEA.x / 100, z: LINE2_SEA.z / 100 };
const line = layout.LINKS[1]!.line;
// The foot: on the ground 17 m west of the jamb, clear of the parked machine (dropped from above, to land on it).
const spot = foot
  ? { x: jamb.x - 16, y: layout.railY(line, tech.GATES.sea.s) + 8, z: jamb.z + 5 }
  : { x: LINE2_GLIDE.x / 100 + 1, y: LINE2_GLIDE.y / 100 + 0.9, z: LINE2_GLIDE.z / 100 + 1.8 };
background(
  (async () => {
    const clear = setInterval(() => window.__debugCam?.clear(), 50); // look re-applies its pose after the warm-up
    for (let n = 0; n < 40; n++) {
      if (n < 3) {
        teleport(me.body!, spot.x, spot.y, spot.z);
        me.body!.velocity.set(0, 0, 0);
      }
      // The follow camera's yaw that looks from Buddy toward the jamb (as forge-cut.ts's yawToForge).
      cam.yaw = Math.atan2(me.body!.position.x - jamb.x, me.body!.position.z - jamb.z);
      cam.pitch = Number(query.get('pitch') ?? (foot ? 0.42 : -0.3));
      await wait(100);
    }
    const p = me.body!.position;
    console.log(
      `PENNANT ${foot ? 'foot' : 'summit'} at ${[p.x, p.y, p.z].map((v) => v.toFixed(1))} pitch ${cam.pitch}`,
    );
    page.__placeDone = true;
    setTimeout(() => clearInterval(clear), 20000);
  })(),
  'the pennant still',
);
export {};
