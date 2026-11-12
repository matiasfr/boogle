// npm run look -- --rail-seed q6-done --players 2 --eval dev/look/evals/railway-engine-carry-spots.ts \
//   --until window.__placeDone --wall 2400 --question "Is each rider still on the engine at mid-ride?"
// The two engine spots railway-pier-parked-layer.ts found unridden: player 1 stands on the boiler's front (the smokebox
// end, on the barrel's top), player 2 drops into the cab (beside the stool, on the floor). Both board the same line-2
// train standing at the Village going up, then ride to `&mid=` cm along (default 37500, halfway to the Pier; `&mid=pier`
// rides into the Pier stop). Each logs `CARRY SPOT <spot> BOARDED|NEVER CARRIED|LOST|PASS` with where, the deck
// terms of its last steps on a loss and the rider's offset in the engine's frame every 2 s; ends on a still beside the
// engine, side on, from the rider's side.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, onPostStep, forEachContact } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { carry, platformById, toPlatform, fromPlatform } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { ENGINE_BOILER, ENGINE_CAB } = (await import(
  '/src/entities/railway/engine.ts' as string
)) as typeof import('../../../src/entities/railway/engine.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Car = { id?: string; x: number; y: number; z: number };
type Train = { line: number; slot: number; phase: number; at: number; track: number; along: number; cars: Car[] };
const VILLAGE = 0,
  PIER = 3;
const query = new URLSearchParams(location.search);
const spot = query.get('player') === '2' ? 'cab' : (query.get('spot') ?? 'boiler');
const midQ = query.get('mid') ?? '37500',
  toPier = midQ === 'pier',
  mid = toPier ? Infinity : Number(midQ);
const w = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const line2 = () => (inspectRailway()?.line2View as unknown as { trains: Train[] } | undefined)?.trains ?? [];
const r2 = (n: number) => +n.toFixed(2);
const pos = () => {
  const p = me.body!.position;
  return { x: r2(p.x), y: r2(p.y), z: r2(p.z) };
};
const say = (what: string, extra: unknown) => console.log(`CARRY SPOT ${spot} ${what} ${JSON.stringify(extra)}`);
setTimeout(() => window.__debugCam!.clear(), 100);

background(
  (async () => {
    while (!me.body || !inspectRailway()?.line2View) await wait(200);
    const standing = () =>
      line2().find((t) => t.line === 1 && t.phase === 0 && t.at === VILLAGE && t.track === 0 && t.cars[0]!.y > -30);
    let until = performance.now() + 1800000;
    while (!standing() && performance.now() < until) await wait(200);
    const train = standing();
    if (!train) throw new Error('no line-2 train stood at the Village going up');
    const slot = train.slot;
    const row = () => line2().find((t) => t.slot === slot)!;
    const engine = platformById(`railway:train${slot}-0`)!;
    // The engine's frame: its body's centre and its forward (+z in engine.ts is forward; check it against the train's
    // heading, car 0 toward car 1 reversed, so a flipped frame shows in the log rather than in a wrong spot).
    const out = { x: 0, y: 0, z: 0, yaw: 0 };
    const world = (x: number, y: number, z: number) => ({ ...fromPlatform(engine, { x, y, z, yaw: 0 }, false, out) });
    const [a, b] = train.cars,
      hx = a!.x - b!.x,
      hz = a!.z - b!.z;
    const c0 = world(0, 0, 0),
      f0 = world(0, 0, 1),
      fwd = Math.sign((f0.x - c0.x) * hx + (f0.z - c0.z) * hz);
    // Local y from the body's centre: the deck top at a spot, as the platform reads it, plus the rider's radius.
    const deckY = (x: number, z: number, feet: number) => engine.topAt!(x, z, feet);
    const boilerZ = fwd * (ENGINE_BOILER.zFront - 0.35),
      cabZ = fwd * ((ENGINE_CAB.zBack + ENGINE_CAB.zFront) / 2),
      cabX = 0.35;
    const at =
      spot === 'boiler'
        ? { x: 0, z: boilerZ, y: deckY(0, boilerZ, 99) + PLAYER_R + 0.05 }
        : { x: cabX, z: cabZ, y: deckY(cabX, cabZ, -99) + PLAYER_R + 0.3 };
    const drop = world(at.x, at.y, at.z);
    say('SETUP', { slot, fwd, local: { x: r2(at.x), y: r2(at.y), z: r2(at.z) }, world: pos(), drop });
    teleport(me.body, drop.x, drop.y, drop.z);
    // Every step: the rider's offset in the engine's frame, the deck gap and contacts, the last few kept for a loss.
    const steps: unknown[] = [];
    const local = { x: 0, y: 0, z: 0, yaw: 0 };
    onPostStep(() => {
      const l = toPlatform(engine, me.body!.position, 0, local);
      const feet = l.y - PLAYER_R;
      const hits: string[] = [];
      forEachContact(me.body!, (nx, ny, nz, other) => {
        hits.push(`${[nx, ny, nz].map(r2).join(',')}${other === engine.body ? '@engine' : ''}`);
      });
      steps.push({
        on: carry.on?.id ?? null,
        lx: r2(l.x),
        ly: r2(l.y),
        lz: r2(l.z * fwd),
        gap: r2(feet - (engine.topAt?.(l.x, l.z, feet) ?? engine.top)),
        dvy: r2(me.body!.velocity.y - engine.body.velocity.y),
        hits,
      });
      if (steps.length > 8) steps.shift();
    });
    const onTrain = () => row().cars.some((c) => c.id === carry.on?.id);
    until = performance.now() + 10000;
    while (!onTrain() && performance.now() < until && row().phase === 0) await wait(50);
    let lost = !onTrain();
    if (lost) say('NEVER CARRIED', { at: pos(), along: row().along, phase: row().phase, steps });
    else say('BOARDED', { on: carry.on?.id, at: pos(), local: steps.at(-1) });
    let ran = false,
      stoodSince = 0,
      nextTrace = 0;
    until = performance.now() + 600000;
    while (performance.now() < until) {
      const r = row();
      if (!lost && !onTrain()) {
        lost = true;
        say('LOST', { on: carry.on?.id ?? null, at: pos(), along: r.along, phase: r.phase, steps });
      }
      if (performance.now() > nextTrace) {
        nextTrace = performance.now() + 2000;
        const l = steps.at(-1) as { lx: number; ly: number; lz: number; on: string | null } | undefined;
        say('TRACE', { along: r.along, phase: r.phase, l });
      }
      ran ||= r.phase === 1;
      if (!toPier && r.along >= mid) break;
      if (toPier && ran && r.phase === 0 && r.at === PIER) {
        stoodSince ||= performance.now();
        if (performance.now() - stoodSince > 4000) break;
      } else stoodSince = 0;
      await wait(0);
    }
    say(lost ? 'FAIL' : 'PASS', { along: row().along, on: carry.on?.id ?? null, at: pos(), local: steps.at(-1) });
    // Side on to the engine from the rider's side, 7 m out, level with the boiler's top; kept on it while the look
    // captures (the train is still running).
    const side = spot === 'cab' ? 1 : -1;
    const aim = () => {
      const eye = world(side * 7, 3.2, fwd * -0.2),
        look = world(0, 1.4, fwd * -0.2);
      window.__debugCam!.set([eye.x, eye.y, eye.z], [look.x, look.y, look.z], 50);
    };
    aim();
    await wait(600);
    w.__placeDone = true;
    for (;;) {
      aim();
      await wait(16);
    }
  })().catch((error: unknown) => {
    console.log(`CARRY SPOT ${spot} ERROR ${error instanceof Error ? error.message : String(error)}`);
    w.__placeDone = true;
    throw error;
  }),
  'engine carry spots probe',
);
export {};
