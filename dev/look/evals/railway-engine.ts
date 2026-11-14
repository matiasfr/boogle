// The train engine A with its walk-in cab (docs/plans/engine-previz.md, "Build plan: the picked engine"), on the live
// trains. Waits for line `&engineLine=` (0 or 1) to stand at its stop `&engineStop=`, then by `&engineShot=`:
//   halt    Buddy on the halt beside the engine, the camera side on
//   board   the same, then (as the --action) Buddy walks into the cab through the near door
//   cab     looking in at the near door (shut since the 10 November park) and the driver on his stool
//   glass   the driver through the open front window from the halt's front quarter; `ahead` from the track ahead
//   door    the driver through the near door's open window, from the halt at the door (Buddy stands back)
//   arrive  a wide still of the train at the halt, to see it clear the platform (and, at the Pier, the track layer)
//   ride    Buddy boards before the capture and the game's own camera rides out with him (use --video --seconds 8)
//   onboard Buddy on the halt on the follow camera; the --action walks him into the cab (the cutaway, train-view.ts)
//   alight  Buddy in the cab on the follow camera; the --action walks him out onto the halt
//   beside  Buddy on the halt against the cab by the near door, on the follow camera; the --action jumps him once
//           where he stands (the cab must stay whole: owner, 14 November), then walks him in (the roof lifts)
//           (--video --seconds 4; ENGINE CUT lines give his place in the car's frame and the cutaway's faces)
//   watch   --players 2: the first in the cab, the second on the halt, whose view keeps the cab whole
// npm run look -- --rail-seed trains-on --query 'engineShot=halt&engineLine=0&engineStop=0' \
//   --eval dev/look/evals/railway-engine.ts --until window.__placeDone --question "..."
// Board: add --action dev/look/evals/railway-engine.ts --video. Arrive at the Pier: --rail-seed q6-done, line 1, stop 3.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { ENGINE, ENGINE_CAB, ENGINE_STOOL } = (await import(
  '/src/entities/railway/engine.ts' as string
)) as typeof import('../../../src/entities/railway/engine.ts');
const { LINE_HALTS } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { makeBot } = (await import('/dev/look/bot.ts' as string)) as typeof import('../bot.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Car = { x: number; y: number; z: number };
type Train = { line: number; phase: number; at: number; cars: Car[]; doors: number[]; cut: Record<string, number> };
const q = new URLSearchParams(location.search);
const shot = q.get('engineShot') ?? 'halt',
  line = Number(q.get('engineLine') ?? 0),
  stop = Number(q.get('engineStop') ?? 0);
const w = window as Window & { __placeDone?: boolean; __engineFrame?: Frame };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const train = () => (inspectRailway()!.line2View as unknown as { trains: Train[] }).trains[line]!;
const standing = () => train().phase === 0 && train().at === stop && train().cars[0]!.y > -30;
type Frame = { x: number; y: number; z: number; fx: number; fz: number; side: number };
/** The engine's frame: its centre on the rail line, forward, and which side its halt is on (+1 is the car's +x). */
function frame(): Frame {
  const [a, b] = train().cars as [Car, Car];
  const l = Math.hypot(a.x - b.x, a.z - b.z),
    fx = (a.x - b.x) / l,
    fz = (a.z - b.z) / l;
  const halt = LINE_HALTS.find((h) => h.line === line && h.stop === stop)!;
  const rx = fz,
    rz = -fx;
  const side = Math.sign((halt.x / 100 - a.x) * rx + (halt.z / 100 - a.z) * rz) || 1;
  return { x: a.x, y: a.y - (0.4 + ENGINE.top) / 2, z: a.z, fx, fz, side };
}
/** A point in the engine's frame (x across, y over the rail line, z forward) in the world. */
function at(f: Frame, x: number, y: number, z: number): [number, number, number] {
  return [f.x + f.fz * x + f.fx * z, f.y + y, f.z - f.fx * x + f.fz * z];
}
const doorZ = (ENGINE_CAB.door.z[0] + ENGINE_CAB.door.z[1]) / 2;

if (w.__engineFrame) {
  // The --action: Buddy walks from the halt through the near doorway to the middle of the cab.
  const f = w.__engineFrame;
  const bot = makeBot();
  if (shot === 'beside') for (const ms of [100]) setTimeout(() => (me.jumpQueued = 0.2), ms);
  // `alight` walks the other way: out of the cab onto the halt.
  const [ix, , iz] = at(f, f.side * (shot === 'alight' ? 2.6 : 0.2), ENGINE_CAB.floor, doorZ);
  background(
    (async () => {
      if (shot === 'alight') await wait(1200);
      if (shot === 'beside') await wait(1000);
      const ok = await bot.walk(ix, iz, 0.35, { limit: 6000 });
      const p = me.body!.position;
      console.log(
        `ENGINE BOARD ${JSON.stringify({ ok, riding: carry.on?.id ?? null, feet: +(p.y - 0.45).toFixed(3), doors: train().doors })}`,
      );
    })(),
    'walk into the cab',
  );
} else {
  background(
    (async () => {
      while (!inspectRailway()?.line2View) await wait(100);
      // A full stand: wait for the train to leave and come back if it is part way through one.
      while (standing()) await wait(100);
      while (!standing()) await wait(50);
      const f = frame();
      w.__engineFrame = f;
      const cam = (p: [number, number, number], t: [number, number, number], fov = 50) =>
        window.__debugCam?.set(p, t, fov);
      const deck = 0.72;
      if (shot === 'beside') {
        // On the halt, 0.18 m off the cab's wall at the near doorway (the train stands 5 s: no walk up to it).
        teleport(me.body!, ...at(f, f.side * (ENGINE_CAB.hx + 0.45 + 0.18), deck + 0.6, doorZ));
        const clear = () => window.__debugCam?.clear();
        clear();
        setTimeout(clear, 0);
        setInterval(() => {
          const g = frame(),
            p = me.body!.position,
            dx = p.x - g.x,
            dz = p.z - g.z;
          const local = [g.fz * dx - g.fx * dz, p.y - 0.45 - g.y, g.fx * dx + g.fz * dz].map((v) => +v.toFixed(2));
          console.log(`ENGINE CUT ${JSON.stringify({ local, cut: train().cut })}`);
        }, 250);
      } else if (shot === 'onboard' || shot === 'alight') {
        // The game's own follow camera: Buddy on the halt by the near door (onboard) or in the cab (alight), and the
        // --action walks him in (or out) as the train stands.
        const [x, y, z] =
          shot === 'onboard'
            ? at(f, f.side * 2.6, deck + 1.0, doorZ)
            : at(f, f.side * 0.25, ENGINE_CAB.floor + 0.6, doorZ);
        teleport(me.body!, x, y, z);
        const clear = () => window.__debugCam?.clear();
        clear();
        setTimeout(clear, 0);
        setInterval(
          () => console.log(`ENGINE CUT ${JSON.stringify({ t: +performance.now().toFixed(0), cut: train().cut })}`),
          500,
        );
      } else if (shot === 'watch') {
        // Two players (--players 2): the first in the cab on the follow camera, the second on the halt looking at it,
        // whose cab must stay whole on their screen.
        if (q.get('player') === '2') {
          teleport(me.body!, ...at(f, f.side * 3.4, deck + 1.0, doorZ - 1.2));
          cam(at(f, f.side * 4.6, 2.6, doorZ - 3.2), at(f, 0, 1.9, doorZ), 50);
        } else {
          teleport(me.body!, ...at(f, f.side * 0.25, ENGINE_CAB.floor + 0.6, doorZ + 0.4));
          const clear = () => window.__debugCam?.clear();
          clear();
          setTimeout(clear, 0);
        }
        await wait(800);
        console.log(`ENGINE WATCH ${JSON.stringify({ player: q.get('player'), cut: train().cut })}`);
      } else if (shot === 'ride') {
        const [x, y, z] = at(f, f.side * 0.25, ENGINE_CAB.floor + 0.6, doorZ);
        teleport(me.body!, x, y, z);
        while (train().phase === 0) await wait(50);
        await wait(1500);
        console.log(`ENGINE RIDE ${JSON.stringify({ riding: carry.on?.id ?? null })}`);
        // Where he is in the cab, twice a second through the capture (x across, y his feet over the rail line, z along).
        setInterval(() => {
          const g = frame(),
            p = me.body!.position,
            dx = p.x - g.x,
            dz = p.z - g.z;
          const local = [g.fz * dx - g.fx * dz, p.y - 0.45 - g.y, g.fx * dx + g.fz * dz].map((v) => +v.toFixed(2));
          console.log(
            `ENGINE CAB ${JSON.stringify({ local, riding: carry.on?.id ?? null, doors: train().doors, cut: train().cut })}`,
          );
        }, 500);
        // The game's own follow camera rides with him (the harness froze a view before the warm-up).
        const clear = () => window.__debugCam?.clear();
        clear();
        setTimeout(clear, 0);
      } else {
        // `cab`: Buddy stands at the doorway's back post and the camera looks in past him.
        const [bx, by, bz] =
          shot === 'cab'
            ? at(f, f.side * 1.9, deck + 1.0, ENGINE_CAB.door.z[0] - 0.6)
            : at(f, f.side * 2.6, deck + 1.0, doorZ + (shot === 'halt' ? 0.4 : shot === 'door' ? -2.5 : 0));
        teleport(me.body!, bx, by, bz);
        const driver = at(f, ENGINE_STOOL.x, ENGINE_STOOL.seat + 0.55, ENGINE_STOOL.z);
        if (shot === 'arrive') cam(at(f, f.side * 7, 13, 3), at(f, f.side * 0.6, 1, 2.4), 60);
        // The open cab windows (owner, 10 November): the driver through the front glass from the platform's front
        // quarter and from the track ahead, and through the near door's window from the platform at the door.
        else if (shot === 'glass') cam(at(f, f.side * 3.4, 2.7, ENGINE_CAB.zFront + 5.5), driver, 40);
        else if (shot === 'ahead') cam(at(f, -0.4, 2.6, ENGINE_CAB.zFront + 9), driver, 30);
        else if (shot === 'door') cam(at(f, f.side * 3.2, 2.75, doorZ - 0.3), driver, 45);
        else if (shot === 'cab') cam(at(f, f.side * 2.7, 3.0, doorZ + 0.9), at(f, -0.4, 2.0, -1.0), 55);
        else cam(at(f, f.side * 6.5, 2.3, 3.6), at(f, 0, 1.9, -1.1), 50);
        await wait(400);
      }
      w.__placeDone = true;
    })(),
    'engine shot setup',
  );
}
export {};
