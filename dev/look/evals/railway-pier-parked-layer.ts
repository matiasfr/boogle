// npm run look -- --rail-seed q6-done --eval dev/look/evals/railway-pier-parked-layer.ts --until window.__placeDone \
//   --wall 2400 --question "At the Pier, does the parked track layer push a walker or a rider at the train's nose?"
// The parked-machine class (#1657) at line 2's last frontier with trains: from Q6 laid until Q7 the track layer stands
// parked at the rails' end (head s 742, flatbed s 738-741.2, loco s 734.4-737.4, on the one terminal track), beside the
// Pier platform (s 719-741, deck edge 1.65 m east of the track) and 1.7 m past the stopped engine's nose (s 732.7).
// 1. Walk: Buddy walks the platform's track edge (centre 0.45 m in from it) from s 722 to 740.6 past the machine.
// 2. Ride: board a line-2 train standing at the Village going up, stand on the engine's cab roof (the leading car), ride to
//    the Pier stop and stand there 4 s. Every step checks carry.on is a car of that train and logs any contact
//    with the machine's bodies. Logs `PIER LAYER PASS` or `PIER LAYER FAIL` with where; ends on a still beside the nose.
const { inspectRailway } = (await import(
  '/src/entities/railway/state.ts' as string
)) as typeof import('../../../src/entities/railway/state.ts');
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport, onPostStep, forEachContact } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { carry, platformById, toPlatform } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { LINES, railY } = (await import(
  '/src/place/layout.ts' as string
)) as typeof import('../../../src/place/layout.ts');
const { besideLine } = (await import(
  '/src/entities/railway/line-geometry.ts' as string
)) as typeof import('../../../src/entities/railway/line-geometry.ts');
const { PIER_EAST } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

type Car = { id?: string; x: number; y: number; z: number };
type Train = { line: number; slot: number; phase: number; at: number; track: number; along: number; cars: Car[] };
const VILLAGE = 0,
  PIER = 3;
const w = window as Window & { __placeDone?: boolean };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const line2 = () => (inspectRailway()?.line2View as unknown as { trains: Train[] } | undefined)?.trains ?? [];
const r2 = (n: number) => +n.toFixed(2);
const pos = () => {
  const p = me.body!.position;
  return { x: r2(p.x), y: r2(p.y), z: r2(p.z) };
};
const fail = (what: string, extra: unknown) => {
  console.log(`PIER LAYER FAIL ${what} ${JSON.stringify(extra)}`);
  throw new Error(what);
};
setTimeout(() => window.__debugCam!.clear(), 100);

background(
  (async () => {
    while (!me.body || !inspectRailway()?.line2View || !platformById('railway:T1:loco')) await wait(200);
    const loco = platformById('railway:T1:loco')!,
      flatbed = platformById('railway:T1:flatbed')!;
    const line = LINES.east;
    // The machine's bodies, and the platform's edge in world terms (lat +2.9 is the platform's centre: PIER_EAST).
    const centre = besideLine(line, 730, 2.9);
    console.log(
      `PIER LAYER SETUP ${JSON.stringify({
        loco: { x: r2(loco.body.position.x), y: r2(loco.body.position.y), z: r2(loco.body.position.z) },
        flatbed: { x: r2(flatbed.body.position.x), y: r2(flatbed.body.position.y), z: r2(flatbed.body.position.z) },
        platformCheck: r2(Math.hypot(centre.x - PIER_EAST.x / 100, centre.z - PIER_EAST.z / 100)),
      })}`,
    );
    const machineHits: unknown[] = [];
    onPostStep(() => {
      forEachContact(me.body!, (nx, ny, nz, other) => {
        if (other !== loco.body && other !== flatbed.body) return;
        machineHits.push({ who: other === loco.body ? 'loco' : 'flatbed', n: [nx, ny, nz].map(r2), at: pos() });
      });
    });
    // 1. The walk along the platform's track edge.
    const EDGE = 1.65 + 0.45,
      y = PIER_EAST.y / 100 + 1;
    const start = besideLine(line, 722, EDGE);
    teleport(me.body, start.x, y, start.z);
    await wait(1500);
    let worst = 0;
    const end = performance.now() + 30000;
    try {
      for (let s = 722; ;) {
        const p = me.body.position;
        // Nearest s on the line by a short local search, then a carrot 2 m ahead at the edge.
        let best = s,
          bestD = Infinity;
        for (let t = s - 2; t <= s + 3; t += 0.1) {
          const q = besideLine(line, t, EDGE),
            d = Math.hypot(q.x - p.x, q.z - p.z);
          if (d < bestD) [best, bestD] = [t, d];
        }
        s = best;
        // How far toward the track (west) Buddy is off the edge line: a push from the machine shows here.
        const c = besideLine(line, s, 0),
          lat = Math.hypot(p.x - c.x, p.z - c.z);
        worst = Math.max(worst, EDGE - lat);
        if (s >= 740.6) break;
        if (performance.now() > end) fail('walk timed out', { s: r2(s), at: pos() });
        const carrot = besideLine(line, Math.min(741, s + 2), EDGE);
        cam.yaw = me.yaw = Math.atan2(-(carrot.x - p.x), -(carrot.z - p.z));
        input.keys.add('KeyW');
        await wait(16);
      }
    } finally {
      input.keys.delete('KeyW');
    }
    const walk = { hits: machineHits.length, inward: r2(worst), on: carry.on?.id ?? null, at: pos() };
    console.log(`PIER LAYER WALK ${JSON.stringify(walk)}`);
    if (walk.hits || walk.on === flatbed.id || walk.on === loco.id)
      fail('walk touched the machine', machineHits.slice(0, 4));
    // 2. The ride into the Pier on the engine's nose.
    const standing = () =>
      line2().find((t) => t.line === 1 && t.phase === 0 && t.at === VILLAGE && t.track === 0 && t.cars[0]!.y > -30);
    let until = performance.now() + 1800000;
    while (!standing() && performance.now() < until) await wait(200);
    const train = standing();
    if (!train) fail('no line-2 train stood at the Village going up', {});
    const slot = train!.slot;
    const row = () => line2().find((t) => t.slot === slot)!;
    const heading = () => {
      const [a, b] = row().cars;
      const d = Math.hypot(a!.x - b!.x, a!.z - b!.z);
      return { x: (a!.x - b!.x) / d, z: (a!.z - b!.z) / d };
    };
    const nose = () => {
      const e = row().cars[0]!,
        h = heading();
      // On the cab roof, 1.2 m behind the engine's middle. (The boiler's front and the cab floor are measured in
      // railway-engine-carry-spots.ts: the sideways drift seen here was Rapier turning the engine about its centre of
      // mass, fixed in src/physics/backend-rapier.ts.)
      return { x: e.x - h.x * 1.2, y: e.y + 3.4, z: e.z - h.z * 1.2 };
    };
    const n = nose();
    teleport(me.body, n.x, n.y, n.z);
    until = performance.now() + 20000;
    while (!row().cars.some((c) => c.id === carry.on?.id) && performance.now() < until) await wait(50);
    if (!row().cars.some((c) => c.id === carry.on?.id)) fail(`never carried by train ${slot}`, { at: pos() });
    console.log(`PIER LAYER BOARDED ${JSON.stringify({ slot, on: carry.on?.id, at: pos() })}`);
    // The last few steps' deck terms against the boarded car and every contact, printed if the rider is lost.
    const boarded = platformById(carry.on!.id!)!;
    const steps: unknown[] = [];
    onPostStep(() => {
      const l = toPlatform(boarded, me.body!.position, 0, { x: 0, y: 0, z: 0, yaw: 0 });
      const feet = l.y - PLAYER_R;
      const hits: string[] = [];
      forEachContact(me.body!, (nx, ny, nz, other) => {
        const o = other.position;
        hits.push(`${[nx, ny, nz].map(r2).join(',')}@${o.x.toFixed(1)},${o.y.toFixed(1)},${o.z.toFixed(1)}`);
      });
      steps.push({
        on: carry.on?.id ?? null,
        lx: r2(l.x),
        lz: r2(l.z),
        gap: r2(feet - (boarded.topAt?.(l.x, l.z, feet) ?? boarded.top)),
        dvy: r2(me.body!.velocity.y - boarded.body.velocity.y),
        hits,
      });
      if (steps.length > 6) steps.shift();
    });
    machineHits.length = 0;
    let ran = false,
      stoodSince = 0;
    until = performance.now() + 600000;
    while (performance.now() < until) {
      const r = row(),
        on = carry.on?.id ?? null;
      if (!r.cars.some((c) => c.id === on))
        fail('rider lost', { on, at: pos(), along: r.along, phase: r.phase, steps });
      if (machineHits.length) fail('rider touched the machine', { along: r.along, hits: machineHits.slice(0, 4) });
      ran ||= r.phase === 1;
      if (ran && r.phase === 0 && r.at === PIER) {
        stoodSince ||= performance.now();
        if (performance.now() - stoodSince > 4000) break;
      } else if (ran && r.phase === 0 && r.at !== PIER) {
        // Stopped short of the Pier at a middle halt (an ask): the nose is still the rider's place; ride on.
        stoodSince = 0;
      }
      await wait(0);
    }
    if (!stoodSince) fail('the ride to the Pier timed out', { at: pos(), along: row().along });
    // The rider's air to the loco's end along the line (rider centre to loco centre, less the loco's half length and
    // the rider's radius), and the train's along.
    const h = heading(),
      p = me.body.position,
      l = loco.body.position;
    const air = (l.x - p.x) * h.x + (l.z - p.z) * h.z - 1.5 - 0.45;
    // The engine's nose (its frame's front, ENGINE.hz 2 m ahead of its centre) to the loco's near end.
    const e = row().cars[0]!,
      noseAir = (l.x - e.x) * h.x + (l.z - e.z) * h.z - 2 - 1.5;
    console.log(
      `PIER LAYER PASS ${JSON.stringify({ along: row().along, on: carry.on?.id, air: r2(air), noseAir: r2(noseAir), at: pos(), rail: r2(railY(line, row().along / 100)) })}`,
    );
    // Side on from the platform's far side, level with the gap: the rider on the nose, the parked loco beyond.
    const eye = besideLine(line, 733.5, 11),
      look = besideLine(line, 734, 0);
    window.__debugCam!.set([eye.x, p.y + 2.5, eye.z], [look.x, p.y - 1, look.z], 55);
    await wait(800);
    w.__placeDone = true;
  })().catch((error: unknown) => {
    console.log(`PIER LAYER FAIL ${error instanceof Error ? error.message : String(error)}`);
    w.__placeDone = true;
    throw error;
  }),
  'pier parked layer probe',
);
export {};
