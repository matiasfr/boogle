// Ring Island's footbridge and the trains under it (docs/plans/ring-summit-path.md, design review finding 7), once
// stack section 1 is laid. Staging teleports only; the fall and the landing are the game's.
//   npm run look -- --rail-seed stack-laid-1 --query bridgetrain=probe --eval dev/look/evals/ring-bridge-train.ts \
//     --until window.__bridgeTrain
//   bridgetrain=probe  watch for 90 s: which cars pass under the deck, how fast and how high
//   bridgetrain=drop   stand outside the parapet over a track and step off as a train comes: do you land on a roof?
//   bridgetrain=ride   stand on the highest car of a train standing near the bridge and ride it out under the deck:
//                      the least gap from each car's drawn envelope and from the rider's drawn figure to every solid
//                      of the bridge (deck, bent caps and posts, abutments), and a ray up from the rider's head to the
//                      real colliders. The camera holds an end-on view through the gap behind the train; take the
//                      still from the video (`--video --seconds 40`) at the logged `underAtS`.
// Prints `BRIDGETRAIN ...` lines and sets `window.__bridgeTrain` (in ride mode as the train moves off, so the video runs
// over the pass; the measure goes on and prints `ride` when the train is through). Run with --real: warped, the drawn
// cars' positions saw-tooth and cannot be timed.
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

  // ---------------------------------------------------------------- ride: the clearance under the deck
  // The bridge's solids in the bridge's frame (across the line from its middle, along the line, height), from the same
  // numbers view.ts builds them with: the deck from a to b (its top on the a-b line, `thick` deep, `width` wide) in 1 m
  // slices so its 6.4 % rise is kept; each bent's cap (0.5 across, 3.4 along, 0.4 deep under the deck) and its two
  // 0.5 m posts at 1.2 m either side of the deck's middle, down to the cutting's floor; and the two abutments (3.4 wide,
  // 1.2 deep under the deck's ends). The parapets stand on the deck, above all of these.
  type Box = { name: string; u0: number; u1: number; v0: number; v1: number; y0: number; y1: number };
  function bridgeBoxes(): Box[] {
    const B = SUMMIT_BRIDGE,
      top = (d: number) => a.y + ((far.y - a.y) * d) / span,
      u = (d: number) => d - span / 2;
    const out: Box[] = [];
    for (let d = 0; d < span; d++) {
      const d1 = Math.min(span, d + 1);
      out.push({
        name: 'deck',
        u0: u(d),
        u1: u(d1),
        v0: -B.width / 2,
        v1: B.width / 2,
        y0: Math.min(top(d), top(d1)) - B.thick,
        y1: Math.max(top(d), top(d1)),
      });
    }
    for (const d of B.bents) {
      const under = top(d) - B.thick;
      out.push({ name: 'bent cap', u0: u(d) - 0.25, u1: u(d) + 0.25, v0: -1.7, v1: 1.7, y0: under - 0.4, y1: under });
      for (const side of [-1.2, 1.2])
        out.push({
          name: 'bent post',
          u0: u(d) - 0.25,
          u1: u(d) + 0.25,
          v0: side - 0.25,
          v1: side + 0.25,
          y0: rail - 3,
          y1: under - 0.4,
        });
    }
    for (const [d0, d1] of [
      [-1.5, 0.5],
      [span - 0.5, span + 1.5],
    ] as const)
      out.push({
        name: 'abutment',
        u0: u(d0),
        u1: u(d1),
        v0: -1.7,
        v1: 1.7,
        y0: top(d0) - B.thick - 1.2,
        y1: Math.max(top(d0), top(d1)) - B.thick,
      });
    return out;
  }
  /** Every visible mesh's bounding box under `root`, its corners taken into the bridge's frame. */
  type Obj = {
    visible: boolean;
    matrixWorld: { elements: number[] };
    updateWorldMatrix(p: boolean, c: boolean): void;
    traverseVisible(fn: (o: Obj) => void): void;
    isMesh?: boolean;
    isInstancedMesh?: boolean;
    geometry?: {
      boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } } | null;
      computeBoundingBox(): void;
    };
  };
  function envelope(name: string, root: Obj): Box {
    const box = { name, u0: Infinity, u1: -Infinity, v0: Infinity, v1: -Infinity, y0: Infinity, y1: -Infinity };
    root.updateWorldMatrix(true, true);
    root.traverseVisible((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox!,
        e = o.matrixWorld.elements;
      if (!Number.isFinite(bb.min.x)) return;
      for (const x of [bb.min.x, bb.max.x])
        for (const y of [bb.min.y, bb.max.y])
          for (const z of [bb.min.z, bb.max.z]) {
            const w = {
              x: e[0]! * x + e[4]! * y + e[8]! * z + e[12]!,
              y: e[1]! * x + e[5]! * y + e[9]! * z + e[13]!,
              z: e[2]! * x + e[6]! * y + e[10]! * z + e[14]!,
            };
            const r = rel(w);
            box.u0 = Math.min(box.u0, r.across);
            box.u1 = Math.max(box.u1, r.across);
            box.v0 = Math.min(box.v0, r.along);
            box.v1 = Math.max(box.v1, r.along);
            box.y0 = Math.min(box.y0, w.y);
            box.y1 = Math.max(box.y1, w.y);
          }
    });
    return box;
  }
  /** The least distance between two boxes; negative (the deepest overlap) when they intersect. */
  const gap = (p: Box, q: Box) => {
    const d = [
      Math.max(p.u0 - q.u1, q.u0 - p.u1),
      Math.max(p.v0 - q.v1, q.v0 - p.v1),
      Math.max(p.y0 - q.y1, q.y0 - p.y1),
    ];
    return d.every((x) => x < 0) ? Math.max(...d) : Math.hypot(...d.map((x) => Math.max(0, x)));
  };
  async function ride() {
    const { scene } = (await import('/src/render/scene.ts' as string)) as {
      scene: Obj & { traverse(fn: (o: Obj & { position: { x: number; y: number; z: number } }) => void): void };
    };
    const { platformById } = (await import(
      '/src/physics/platforms.ts' as string
    )) as typeof import('../../../src/physics/platforms.ts');
    const { raycastClosest, rayHit } = (await import(
      '/src/physics/engine.ts' as string
    )) as typeof import('../../../src/physics/engine.ts');
    const { GROUP } = (await import(
      '/src/physics/physics.ts' as string
    )) as typeof import('../../../src/physics/physics.ts');
    const boxes = bridgeBoxes();
    type Seen = ReturnType<typeof cars>[number];
    /** The car's drawn root: the first group (top-most) standing exactly where the car is, read while it stands. */
    const meshOf = (c: Seen) => {
      let found: Obj | null = null;
      scene.traverse((o) => {
        if (found || !o.visible) return;
        const e = o.matrixWorld.elements;
        if (Math.hypot(e[12]! - c.x, e[13]! - c.y, e[14]! - c.z) < 0.05) found = o;
      });
      return found as Obj | null;
    };
    const tried = new Set<number>();
    const t0 = performance.now();
    while (performance.now() - t0 < 420000) {
      // A train standing within 250 m of the bridge (all its cars still over half a second), not tried before.
      const was = cars();
      await wait(500);
      const now = cars();
      const slots = [...new Set(now.map((c) => c.slot))].filter((slot) => {
        if (tried.has(slot)) return false;
        const list = now.filter((c) => c.slot === slot);
        return (
          list.some((c) => c.d < 250) &&
          list.every((c) => {
            const w = was.find((p) => p.slot === c.slot && p.id === c.id);
            return w && Math.hypot(w.x - c.x, w.z - c.z) < 0.05;
          })
        );
      });
      if (!slots.length) continue;
      const slot = slots[0]!;
      tried.add(slot);
      const train = now.filter((c) => c.slot === slot);
      const drawn = new Map(train.map((c) => [c.id, meshOf(c)] as const));
      // The rider stands on the car whose top a player can stand highest on: the worst case for the deck.
      const tops = train
        .map((c) => ({ c, top: c.y + (platformById(String(c.id))?.top ?? -Infinity) }))
        .sort((p, q) => q.top - p.top);
      say(
        `train ${JSON.stringify({ slot, cars: train.map((c) => ({ id: c.id, d: f2(c.d), across: f2(c.across), top: f2(tops.find((t) => t.c === c)!.top), drawn: !!drawn.get(c.id) })) })}`,
      );
      let rider: Seen | null = null;
      for (const { c, top } of tops) {
        if (!Number.isFinite(top)) continue;
        await stage(c.x, top, c.z);
        await wait(1200);
        if (cars().find((k) => k.slot === slot && k.id === c.id)?.riding) {
          rider = c;
          break;
        }
      }
      if (!rider) {
        say(`ride ${JSON.stringify({ slot, staged: false, why: 'could not stand aboard any car' })}`);
        continue;
      }
      const find = () => cars().find((k) => k.slot === slot && k.id === rider!.id)!;
      say(`aboard ${JSON.stringify({ slot, id: rider.id, at: where(), standing: me.coyote > 0 })}`);
      // Wait for it to move off, then for the way it goes: toward the deck or away.
      const start = find();
      const tWait = performance.now();
      while (Math.hypot(find().x - start.x, find().z - start.z) < 1 && performance.now() - tWait < 180000)
        await wait(50);
      const moved = find();
      const sign = Math.sign(moved.along - start.along);
      if (!sign || Math.sign(start.along) === sign) {
        say(
          `ride ${JSON.stringify({ slot, staged: false, why: sign ? 'it left away from the bridge' : 'it never moved' })}`,
        );
        await stage(middle.x, deckY, middle.z);
        continue;
      }
      // End-on through the gap: once the rider's car is 25 m short of the deck, the camera stands where it is then (on
      // the rider's own track; the cutting curves, so a point measured along the deck's square would be in the wall),
      // at the height midway between the top of the rider's figure and the deck's underside, looking at the deck.
      const over = (across: number, along: number) => ({
        x: middle.x + ux * across - uz * along,
        z: middle.z + uz * across + ux * along,
      });
      let cam: { eye: number[]; aim: number[] } | null = null;
      const aimCamera = (c: Seen) => {
        const deckUnder = a.y + ((far.y - a.y) * (c.across + span / 2)) / span - SUMMIT_BRIDGE.thick;
        const head = envelope('rider', me.avatar as unknown as Obj).y1,
          aim = over(c.across, 0),
          y = (head + deckUnder) / 2;
        cam = { eye: [f2(c.x), f2(y), f2(c.z)], aim: [f2(aim.x), f2(y), f2(aim.z)] };
        window.__debugCam!.set(cam.eye, cam.aim);
        window.__debugCam!.set = () => {};
      };
      const tFlag = performance.now();
      page.__bridgeTrain = true; // the look's capture (its video) starts now
      const least = new Map<string, { gap: number; t: number; along: number }>();
      const keep = (key: string, g: number, along: number) => {
        const t = f2((performance.now() - tFlag) / 1000);
        if (!least.has(key) || g < least.get(key)!.gap) least.set(key, { gap: f2(g), t, along: f2(along) });
      };
      let headRay = Infinity,
        underAtS: number | null = null,
        riding = 0,
        samples = 0,
        lastAlong = find().along;
      const hit = rayHit();
      const tRide = performance.now();
      while (performance.now() - tRide < 120000) {
        await wait(16);
        const c = find();
        if (underAtS === null && Math.sign(c.along) !== Math.sign(lastAlong))
          underAtS = f2((performance.now() - tFlag) / 1000);
        lastAlong = c.along;
        if (!cam && Math.abs(c.along) < 25) aimCamera(c);
        if (Math.abs(c.along) > 20) {
          if (underAtS !== null) break;
          continue;
        }
        samples++;
        if (c.riding) riding++;
        const body = envelope('rider', me.avatar as unknown as Obj);
        for (const q of boxes) keep(`rider ${q.name}`, gap(body, q), c.along);
        for (const k of cars().filter((k) => k.slot === slot)) {
          const m = drawn.get(k.id);
          if (!m) continue;
          const e = envelope(`car ${k.id}`, m);
          for (const q of boxes) keep(`car ${q.name}`, gap(e, q), k.along);
        }
        // The real colliders: a ray straight up from the top of the rider's figure.
        const p = b.position;
        if (Math.abs(rel(p).along) < SUMMIT_BRIDGE.width / 2)
          if (
            raycastClosest(
              { x: p.x, y: body.y1 + 0.01, z: p.z },
              { x: p.x, y: body.y1 + 20, z: p.z },
              { mask: GROUP.SCENERY },
              hit,
            )
          )
            headRay = Math.min(headRay, hit.hitPointWorld.y - body.y1);
      }
      say(
        `ride ${JSON.stringify({ slot, staged: true, rider: rider.id, underAtS, samples, ridingSamples: riding, headRayToCollider: Number.isFinite(headRay) ? f2(headRay) : null, least: Object.fromEntries(least), cam, at: where() })}`,
      );
      break;
    }
    page.__bridgeTrain = true;
  }
  if (mode === 'ride') {
    await ride();
    return;
  }
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
