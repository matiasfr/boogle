// npm run look -- --rail-seed ring-joined --eval dev/look/evals/railway-ring-home-carry.ts --until window.__placeDone \
//   --wall 2400 --question "Does the rider stay carried by the line-2 car past the parked track layer?"
// Add --query carryShot=flatbed to end the warm-up just past the parked track-layer flatbed (world z > -360) for a
// still mid-ride on the follow camera; the default ends at the Village and logs the verdict.
// A carry regression probe (src/physics/platforms.ts deckUnder): Buddy stands on the island's down platform, a line-2
// train already standing at the island (stop 5) is boarded by a teleport onto its passenger car (the island's homeward
// lever is out of the server's reach on main, so no train is called), and every frame of the ride home checks that
// carry.on is one of that train's cars. Logs `CARRY HOME PASS` or `CARRY HOME FAIL` with where the rider was lost.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, onPostStep, forEachContact } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
type Platform = import('../../../src/physics/platforms.ts').Platform;
const { carry, platformById, toPlatform } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { RING_HALT } = (await import(
  '/src/sim/railway-ring-layout.ts' as string
)) as typeof import('../../../src/sim/railway-ring-layout.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Car = { id?: string; x: number; y: number; z: number };
type Train = { line: number; slot: number; phase: number; at: number; cars: Car[] };
const ISLAND = 5,
  VILLAGE = 0;
const shot = new URLSearchParams(location.search).get('carryShot') ?? 'end';
const w = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const line2 = () => (inspectRailway()?.line2View as unknown as { trains: Train[] } | undefined)?.trains ?? [];
const pos = () => {
  const p = me.body!.position;
  return { x: +p.x.toFixed(2), y: +p.y.toFixed(2), z: +p.z.toFixed(2) };
};
setTimeout(() => window.__debugCam!.clear(), 100); // the game's own follow camera

background(
  (async () => {
    while (!me.body || !inspectRailway()?.line2View) await wait(200);
    teleport(me.body, RING_HALT.down.x / 100, RING_HALT.down.y / 100 + 1, RING_HALT.down.z / 100);
    const standing = () => line2().find((t) => t.line === 1 && t.phase === 0 && t.at === ISLAND && t.cars[1]!.y > -30);
    let end = performance.now() + 1800000;
    while (!standing() && performance.now() < end) await wait(200);
    const train = standing();
    if (!train) throw new Error('no line-2 train stood at the island');
    const slot = train.slot;
    const row = () => line2().find((t) => t.slot === slot)!;
    const car = row().cars[1]!;
    teleport(me.body, car.x, car.y + 1.6, car.z);
    end = performance.now() + 20000;
    while (!row().cars.some((c) => c.id === carry.on?.id) && performance.now() < end) await wait(50);
    if (!row().cars.some((c) => c.id === carry.on?.id)) throw new Error(`never carried by train ${slot}`);
    console.log(`CARRY HOME BOARDED ${JSON.stringify({ slot, on: carry.on?.id, at: pos() })}`);
    // Every fixed step: deckUnder's terms against the boarded car and the parked flatbed, kept for the last few steps
    // and printed when the deck under the rider changes.
    const boarded = platformById(carry.on!.id!)!;
    const terms = (p: Platform | null) => {
      if (!p) return null;
      const l = toPlatform(p, me.body!.position, 0, { x: 0, y: 0, z: 0, yaw: 0 });
      const feet = l.y - PLAYER_R;
      const r2 = (n: number) => +n.toFixed(3);
      return {
        lx: r2(l.x),
        lz: r2(l.z),
        hx: p.hx,
        hz: p.hz,
        gap: r2(feet - (p.topAt?.(l.x, l.z, feet) ?? p.top)),
        dvy: r2(me.body!.velocity.y - p.body.velocity.y),
      };
    };
    const steps: unknown[] = [];
    let was = carry.on?.id;
    onPostStep(() => {
      const hits: unknown[] = [];
      forEachContact(me.body!, (nx, ny, nz, other) => {
        const id = [boarded, platformById('railway:T1:flatbed'), platformById('railway:T1:loco')].find(
          (p) => p?.body === other,
        )?.id;
        const o = other.position;
        hits.push({
          n: [nx, ny, nz].map((v) => +v.toFixed(2)),
          who: id ?? `body@${o.x.toFixed(1)},${o.y.toFixed(1)},${o.z.toFixed(1)}`,
        });
      });
      steps.push({
        on: carry.on?.id ?? null,
        car: terms(boarded),
        flatbed: terms(platformById('railway:T1:flatbed')),
        hits,
      });
      if (steps.length > 8) steps.shift();
      if (carry.on?.id !== was) console.log(`CARRY HOME STEPS ${JSON.stringify(steps)}`);
      was = carry.on?.id;
    });
    let ran = false,
      last = carry.on?.id ?? null;
    end = performance.now() + 1800000;
    while (performance.now() < end) {
      const r = row(),
        on = carry.on?.id ?? null;
      if (on !== last) console.log(`CARRY HOME ON ${JSON.stringify({ from: last, to: on, at: pos() })}`);
      last = on;
      if (!r.cars.some((c) => c.id === on)) {
        const ahead = r.cars[1]!;
        console.log(
          `CARRY HOME FAIL ${JSON.stringify({ on, at: pos(), car: { x: +ahead.x.toFixed(1), z: +ahead.z.toFixed(1) }, phase: r.phase })}`,
        );
        await wait(1500); // the train pulls away from the dropped rider in the still
        w.__placeDone = true;
        return;
      }
      ran ||= r.phase === 1;
      if (shot === 'flatbed' && ran && me.body.position.z > -360) {
        console.log(`CARRY HOME PAST FLATBED ${JSON.stringify({ on, at: pos() })}`);
        // Side on from the east, a little ahead: the rider on the car, the parked flatbed behind (about z -372).
        const p = me.body.position;
        window.__debugCam!.set([p.x + 14, p.y + 5, p.z + 4], [p.x, p.y - 1, p.z - 8], 60);
        w.__placeDone = true;
        return;
      }
      if (ran && r.phase === 0 && r.at === VILLAGE) {
        console.log(`CARRY HOME PASS ${JSON.stringify({ on, at: pos() })}`);
        w.__placeDone = true;
        return;
      }
      await wait(0);
    }
    throw new Error('the ride home timed out');
  })().catch((error: unknown) => {
    console.log(`CARRY HOME FAIL ${error instanceof Error ? error.message : String(error)}`);
    w.__placeDone = true;
    throw error;
  }),
  'ring home carry probe',
);
export {};
