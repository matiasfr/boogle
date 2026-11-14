// Ring Island's footbridge and the trains under it (docs/plans/ring-summit-path.md, design review finding 7), once
// stack section 1 is laid. Staging teleports only; the fall and the landing are the game's.
//   npm run look -- --rail-seed stack-laid-1 --query bridgetrain=probe --eval dev/look/evals/ring-bridge-train.ts \
//     --until window.__bridgeTrain
//   bridgetrain=probe  watch for 90 s: which cars pass under the deck, how fast and how high
//   bridgetrain=drop   stand outside the parapet over a track and step off as a train comes: do you land on a roof?
// Prints `BRIDGETRAIN ...` lines and sets `window.__bridgeTrain`. Run with --real: warped, the drawn cars' positions
// saw-tooth and cannot be timed. Riding a train under the deck with the follow camera is not staged here yet.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { input } = (await import('/src/player/input.ts' as string)) as typeof import('../../../src/player/input.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railReady } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const ring = (await import(
  '/src/entities/ring-island/state.ts' as string
)) as typeof import('../../../src/entities/ring-island/state.ts');
const { summitBridge, SUMMIT_BRIDGE } = (await import(
  '/src/entities/ring-island/path.ts' as string
)) as typeof import('../../../src/entities/ring-island/path.ts');
const { PLAYER_R } = (await import('/src/constants.ts' as string)) as typeof import('../../../src/constants.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');

const page = window as Window & { __bridgeTrain?: boolean; __bridgeTrainStarted?: boolean };
const mode = new URLSearchParams(location.search).get('bridgetrain') ?? 'probe';
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`BRIDGETRAIN ${text}`);
const f2 = (n: number) => +n.toFixed(2);
type Car = { id: number; x: number; y: number; z: number; riding: boolean };
type Train = { slot: number; line: number; cars: Car[] };
const trains = () => (inspectRailway()?.line2View as unknown as { trains?: Train[] } | undefined)?.trains ?? [];

async function run() {
  if (!(await railReady())) throw new Error('ring-bridge-train: the railway never became ready');
  while (!me.body) await wait(50);
  const b = me.body;
  const g = await ring.islandGround();
  const { a, b: far, middle, rail } = summitBridge(g),
    span = Math.hypot(far.x - a.x, far.z - a.z),
    ux = (far.x - a.x) / span,
    uz = (far.z - a.z) / span;
  const deckY = (a.y + far.y) / 2;
  /** Along the deck from its middle (m, toward the summit side) and along the track from it (m, sign by -uz, ux). */
  const rel = (p: { x: number; z: number }) => ({
    across: (p.x - middle.x) * ux + (p.z - middle.z) * uz,
    along: -(p.x - middle.x) * uz + (p.z - middle.z) * ux,
  });
  const stage = async (x: number, y: number, z: number) => {
    teleport(b, x, y + PLAYER_R + 0.05, z);
    b.velocity.set(0, 0, 0);
    input.keys.clear();
  };
  const where = () => ({ x: f2(b.position.x), y: f2(b.position.y), z: f2(b.position.z) });
  const cars = () =>
    trains().flatMap((t) =>
      t.cars.map((c) => ({ slot: t.slot, ...c, ...rel(c), d: Math.hypot(c.x - middle.x, c.z - middle.z) })),
    );
  // Stand on the deck's middle so the near view and the trains around the bridge are up.
  await stage(middle.x, deckY, middle.z);
  const end = performance.now() + 30000;
  while (!ring.ringIslandNear.mounted && performance.now() < end) await wait(50);
  await wait(1500);
  say(
    `start ${JSON.stringify({ mode, at: where(), deckY: f2(deckY), rail, standing: me.coyote > 0, trains: trains().length })}`,
  );

  if (mode === 'probe') {
    const seen = new Map<string, { slot: number; id: number; across: number; y: number; t: number; along: number }[]>();
    const t0 = performance.now();
    while (performance.now() - t0 < 90000) {
      for (const c of cars())
        if (Math.abs(c.along) < 40 && Math.abs(c.across) < 14) {
          const k = `${c.slot}:${c.id}`;
          if (!seen.has(k)) seen.set(k, []);
          seen.get(k)!.push({
            slot: c.slot,
            id: c.id,
            across: f2(c.across),
            y: f2(c.y),
            t: f2((performance.now() - t0) / 1000),
            along: f2(c.along),
          });
        }
      await wait(50);
    }
    for (const [k, rows] of seen) {
      const first = rows[0]!,
        last = rows[rows.length - 1]!;
      say(
        `pass ${k} ${JSON.stringify({ samples: rows.length, across: first.across, y: first.y, from: [first.t, first.along], to: [last.t, last.along], speed: f2((last.along - first.along) / Math.max(0.01, last.t - first.t)) })}`,
      );
    }
    say(
      `probe ${JSON.stringify({ carsSeenUnder: seen.size, all: cars().map((c) => ({ slot: c.slot, id: c.id, d: f2(c.d) })) })}`,
    );
  } else {
    // Wait for cars on the two tracks under the deck (the seed starts a train leaving the halt through the bridge;
    // the halt's other roads lie further across and lower), then measure their speed along the track over 0.4 s.
    type Seen = ReturnType<typeof cars>[number];
    const under = () =>
      cars().filter((c) => Math.abs(c.across) < 4 && Math.abs(c.y - rail - 0.75) < 0.5 && Math.abs(c.along) < 45);
    let pick: (Seen & { speed: number }) | null = null;
    const t0 = performance.now();
    while (!pick && performance.now() - t0 < 240000) {
      const was = under();
      if (was.length) {
        const tWas = performance.now();
        await wait(400);
        const dt = (performance.now() - tWas) / 1000;
        const moved = was
          .map((w) => ({ w, c: cars().find((c) => c.slot === w.slot && c.id === w.id)! }))
          .map(({ w, c }) => ({
            ...c,
            speed: (c.along - w.along) / dt,
          }))
          .filter((c) => Math.abs(c.speed) > 0.5 && Math.abs(c.speed) < 40);
        // The car with the furthest still to go to the deck (or, all past it, the nearest).
        moved.sort((p, q) => q.along * -Math.sign(q.speed) - p.along * -Math.sign(p.speed));
        pick = moved[moved.length >> 1] ?? null; // the middle of the train
      } else await wait(50);
    }
    if (!pick) {
      say(`${mode} ${JSON.stringify({ staged: false, why: 'no car passed under the deck in 240 s' })}`);
    } else {
      const find = () => cars().find((c) => c.slot === pick!.slot && c.id === pick!.id)!;
      say(
        `picked ${JSON.stringify({ slot: pick.slot, id: pick.id, along: f2(pick.along), across: f2(pick.across), y: f2(pick.y), speed: f2(pick.speed) })}`,
      );
      {
        // Outside the parapet over this car's track, feet at the deck's height: step off when the car is as far
        // away as it travels during the fall (measured from a still fall first, then one corrected try).
        const side = (SUMMIT_BRIDGE.width / 2 + 0.6) * Math.sign(pick.speed); // the side the train leaves by
        const fall = 0.72; // measured: 0.86 s from the deck to the track bed, a roof is about 3 m nearer
        const c = find(),
          lead = c.along + pick.speed * fall; // where the car will be when you land
        const over = (along: number) => ({
          x: middle.x + ux * c.across - uz * along,
          z: middle.z + uz * c.across + ux * along,
        });
        // Step off the deck's edge if the car is still to come; else from the deck's height straight over it.
        const p = Math.sign(lead - side) === Math.sign(pick.speed) ? over(lead) : over(side);
        if (p.x === over(side).x)
          while ((find().along + pick.speed * fall - side) * Math.sign(pick.speed) < 0) await wait(8);
        await stage(p.x, deckY, p.z);
        say(
          `stepped off ${JSON.stringify({ rel: rel(b.position), car: f2(find().along), fromDeckEdge: p.x === over(side).x })}`,
        );
        const tDrop = performance.now();
        let landed: Record<string, unknown> | null = null;
        const rows: Record<string, unknown>[] = [];
        for (let k = 0; k < 400; k++) {
          await wait(16);
          const c = find();
          if (!landed && me.coyote > 0 && performance.now() - tDrop > 200)
            landed = {
              t: f2((performance.now() - tDrop) / 1000),
              at: where(),
              carAlong: f2(c.along),
              riding: c.riding,
            };
          if (k % 30 === 0)
            rows.push({
              t: f2((performance.now() - tDrop) / 1000),
              at: where(),
              rel: rel(b.position),
              car: { along: f2(c.along), y: f2(c.y), riding: c.riding },
              standing: me.coyote > 0,
            });
        }
        const anyRiding = trains().some((t) => t.cars.some((c) => c.riding));
        say(
          `drop ${JSON.stringify({ staged: true, fallGuessS: f2(fall), landed, ridingAtEnd: anyRiding, at: where(), rail, rows })}`,
        );
      }
    }
  }
  page.__bridgeTrain = true;
}
if (!page.__bridgeTrainStarted) {
  page.__bridgeTrainStarted = true;
  background(run(), 'ring bridge train');
}
export {};
