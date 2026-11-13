// The fourth car (docs/plans/fourth-car.md, V1): steel's car on a fitted line 2 train. One eval, the case picked by
// `?steelcar=<case>`; each waits on the room's rows at server ticks, sets the look's camera itself (from where the
// cars are drawn) and then raises `window.__carDone`. Lines it prints start `CAR `.
//   npm run look -- --rail-seed boiler-long --query steelcar=village --eval dev/look/evals/steel-car.ts \
//     --until window.__carDone --wall 600 --name car4-village
// Cases, from `boiler-long` unless said:
//   scout    every line 2 stand for 150 s, with the cars' places (no picture worth keeping)
//   village  the wagon's train standing at the Village, four cars behind the engine, from the platform's side
//   top      the same stand from straight above its steel car: the garage stand's nearer leg beside it
//   plain    a plain fitted train standing at the Village
//   steel    (`steel-home`) installs through the garage, then a fitted train standing with steel on its steel car
//   join     (`stack-fresh-1`, `--real --video`) a shed train joins the fitted line: its steel car grows in with it
//   beat     (`steel-home`, `--real --video`) installs, then a standard train runs in and couples at the platform
//   tail     the same, with the player standing on the track where the car appears; prints where they end
//   pier-l, pier-r  (`--real --video`) rides a steel car home, asks for the Pier from its deck and steps off it there,
//            to the left or right of the line's heading (`&walk=<ticks>` holds the stick that long, 5 by default)
const { me, cam } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { triggerAction } = (await import(
  '/src/player/controls.ts' as string
)) as typeof import('../../../src/player/controls.ts');
const { background } = (await import('/src/async.ts' as string)) as typeof import('../../../src/async.ts');
const { garage } = (await import(
  '/src/entities/railway/garage-state.ts' as string
)) as typeof import('../../../src/entities/railway/garage-state.ts');
const { GARAGE_GEO, polarAt } = (await import(
  '/src/entities/railway/garage-geo.ts' as string
)) as typeof import('../../../src/entities/railway/garage-geo.ts');
const { SHED_TABLE } = (await import(
  '/src/sim/railway-works-layout.ts' as string
)) as typeof import('../../../src/sim/railway-works-layout.ts');
const { LINE2, RAIL_LINES } = (await import(
  '/src/sim/railway-lines.ts' as string
)) as typeof import('../../../src/sim/railway-lines.ts');
const { LINE_SLOTS, fleetJoin } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { legsLaid } = (await import(
  '/src/sim/railway-queries-route.ts' as string
)) as typeof import('../../../src/sim/railway-queries-route.ts');
const { TRAIN_PHASE, trainAlong, fleetOf } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { line2World, line2Lat, line2Y } = (await import(
  '/src/entities/railway/line2-path.ts' as string
)) as typeof import('../../../src/entities/railway/line2-path.ts');
const { steelCarOffset, STEEL_CAR } = (await import(
  '/src/entities/railway/cars.ts' as string
)) as typeof import('../../../src/entities/railway/cars.ts');
const { inspectRailway, line, rail, railAt, railReady, rw, shed, train, trainStops } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');

type V = { x: number; y: number; z: number };
const mode = new URLSearchParams(location.search).get('steelcar') ?? 'village';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const say = (text: string) => console.log(`CAR ${text}`);
const done = () => ((window as Window & { __carDone?: boolean }).__carDone = true);
const ticks = async (n: number) => {
  for (const until = railAt() + n; railAt() < until;) await wait(15);
};
const r2 = (n: number) => +n.toFixed(2);
if (!(await railReady(30_000))) throw new Error('steel-car: the railway never became ready');
while (!me.body || !me.entered) await wait(100);
const body = me.body;
const slots = LINE_SLOTS[LINE2]!;
const VILLAGE = 0,
  PIER = 3;
const stopM = (halt: number) => RAIL_LINES[LINE2]!.halts[halt]!.s / 100;
/** The drawn cars of a slot's train, by platform id's last part ('0', '1', '2', 'wagon', 'steel'). */
function cars(slot: number) {
  const view = inspectRailway() as unknown as {
    line2View: { trains: { cars: { id: string; x: number; y: number; z: number; riding: boolean }[] }[] };
  };
  const out: Record<string, V & { riding: boolean }> = {};
  for (const c of view.line2View.trains[slot]?.cars ?? [])
    out[c.id === 'railway:wagon' ? 'wagon' : c.id.slice(c.id.lastIndexOf('-') + 1)] = c;
  return out;
}
/** World place of s metres along line 2 on a row's track, at rail height. */
function onTrack(slot: number, s: number): V {
  const p = line2World(s, line2Lat(train(rw(), slot), s, trainStops(rw(), LINE2)), { x: 0, z: 0 });
  return { x: p.x, y: line2Y(s), z: p.z };
}
const along = (slot: number) => trainAlong(train(rw(), slot), LINE2, railAt()) / 100;
const standing = (slot: number, halt: number) => {
  const r = train(rw(), slot);
  return r.phase === TRAIN_PHASE.STAND && r.at === halt;
};
/** The camera, `back` metres behind `from` along the train, `out` to a side and `up`, looking at `at`. */
function view(from: V, ahead: V, at: V, back: number, out: number, up: number, fov?: number) {
  const ux = ahead.x - from.x,
    uz = ahead.z - from.z,
    len = Math.hypot(ux, uz) || 1;
  window.__debugCam!.set(
    [from.x - (ux / len) * back + (uz / len) * out, from.y + up, from.z - (uz / len) * back - (ux / len) * out],
    [at.x, at.y, at.z],
    fov,
  );
}
async function waitFor(what: string, test: () => number | undefined, forTicks = 6000) {
  const by = railAt() + forTicks;
  for (;;) {
    const slot = test();
    if (slot !== undefined) return slot;
    if (railAt() > by) throw new Error(`steel-car: ${what} never came in ${forTicks / 10} s`);
    await wait(15);
  }
}
/** Opens the garage at its post and holds the install, as a player does (dev/look/evals/garage-platform.ts). */
async function install() {
  const centre = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
  const post = GARAGE_GEO.a.post;
  const stood = polarAt(centre, { bearing: post.bearing + 6, r: post.r + 0.2 });
  teleport(body, stood.x, SHED_TABLE.y / 100 + 0.7, stood.z);
  body.velocity.set(0, 0, 0);
  cam.yaw = me.yaw = Math.atan2(stood.x - centre.x, stood.z - centre.z);
  await wait(1500);
  triggerAction('interact', 'down');
  triggerAction('interact', 'up');
  for (let k = 0; k < 80 && !garage.api?.isOpen(); k++) await wait(100);
  if (!garage.api?.snap().canInstall) throw new Error('steel-car: the garage did not open ready to install');
  await wait(900);
  triggerAction('interact', 'down');
  for (let k = 0; k < 200 && line(rw(), LINE2).boiler < 1; k++) await wait(50);
  triggerAction('interact', 'up');
  if (line(rw(), LINE2).boiler < 1) throw new Error('steel-car: the hold did not fit the boiler');
  for (let k = 0; k < 400 && garage.api.snap().phase !== 'idle'; k++) await wait(25);
  garage.api.close();
  say(`installed at tick ${railAt()}; trains wear ${JSON.stringify(slots.map((s) => train(rw(), s).boiler))}`);
}
const rowOf = (slot: number) => {
  const r = train(rw(), slot);
  return `slot ${slot} boiler ${r.boiler} wagon ${r.wagon} steel ${r.steel} track ${r.track} at ${r.at} to ${r.to}`;
};

// Everything waits in the background: the look sets its own camera when this eval returns, and each case's comes after.
const run = async () => {
  if (mode === 'scout') {
    const was = new Map<number, string>();
    for (const end = railAt() + 1500; railAt() < end; await wait(15))
      for (const slot of slots) {
        const r = train(rw(), slot),
          key = `${r.phase}/${r.at}`;
        if (was.get(slot) === key) continue;
        was.set(slot, key);
        if (r.phase !== TRAIN_PHASE.STAND) continue;
        await ticks(3);
        const c = cars(slot);
        say(
          `tick ${railAt()} stand ${rowOf(slot)} along ${r2(along(slot))} cars ${JSON.stringify(
            Object.fromEntries(Object.entries(c).map(([k, v]) => [k, [r2(v.x), r2(v.y), r2(v.z)]])),
          )}`,
        );
      }
    done();
  } else if (mode === 'village' || mode === 'top') {
    const slot = await waitFor("the wagon's train standing fitted at the Village", () =>
      slots.find((s) => train(rw(), s).wagon && train(rw(), s).boiler >= 1 && standing(s, VILLAGE)),
    );
    await ticks(8);
    const c = cars(slot);
    if (!c.steel || !c.wagon) throw new Error(`steel-car: slot ${slot} drew no steel car: ${Object.keys(c).join(',')}`);
    say(`${rowOf(slot)}; cars ${Object.keys(c).join(',')}; steel car at ${r2(c.steel.x)}, ${r2(c.steel.z)}`);
    if (mode === 'top') view(c.steel, c['2']!, c.steel, 0.02, 0, 15, 30);
    else view(c.steel, c['0']!, c['2']!, 5, Number(new URLSearchParams(location.search).get('side') ?? 1) * 7, 3.2, 55);
    done();
  } else if (mode === 'plain') {
    const stop = stopM(VILLAGE);
    // Standing, a few ticks after it stops: a fixed camera cannot hold a train that is leaving through the look's own delay.
    const slot = await waitFor('a plain fitted train standing at the Village', () =>
      slots.find((s) => !train(rw(), s).wagon && train(rw(), s).boiler >= 1 && standing(s, VILLAGE) && cars(s).steel),
    );
    await ticks(4);
    const c = cars(slot);
    say(`${rowOf(slot)}; ${r2(along(slot) - stop)} m from its stop; cars ${Object.keys(c).join(',')}`);
    view(c.steel!, c['0']!, c['2']!, 6, Number(new URLSearchParams(location.search).get('side') ?? 1) * 6, 3, 55);
    done();
  } else if (mode === 'steel') {
    await waitFor('steel in the bay', () => (shed(rw()).steel >= 1 ? 0 : undefined), 9000);
    say(`steel in the bay at tick ${railAt()}: ${shed(rw()).steel}`);
    await install();
    const slot = await waitFor(
      'a fitted train standing with steel aboard',
      () =>
        slots.find((s) => {
          const r = train(rw(), s);
          return r.boiler >= 1 && (r.steel ?? 0) > 0 && r.phase === TRAIN_PHASE.STAND && cars(s).steel;
        }),
      20000,
    );
    await ticks(5);
    const c = cars(slot);
    say(`${rowOf(slot)}; cars ${Object.keys(c).join(',')}`);
    view(c.steel!, c['0']!, c.steel!, 3.5, Number(new URLSearchParams(location.search).get('side') ?? 1) * 5, 3, 55);
    done();
  } else if (mode === 'beat' || mode === 'tail') {
    await install();
    const stop = stopM(VILLAGE);
    const slot = await waitFor(
      'a standard-boiler train running in to the Village',
      () =>
        slots.find((s) => {
          const r = train(rw(), s);
          return r.boiler === 0 && r.phase === TRAIN_PHASE.RUN && r.to === VILLAGE && Math.abs(along(s) - stop) < 40;
        }),
      3000,
    );
    const wagon = train(rw(), slot).wagon,
      tailS = stop + steelCarOffset(wagon);
    const tail = onTrack(slot, tailS),
      front = onTrack(slot, stop + 4);
    say(`${rowOf(slot)} is running in; its steel car will stand at s ${r2(tailS)}: ${r2(tail.x)}, ${r2(tail.z)}`);
    const side = Number(new URLSearchParams(location.search).get('side') ?? 1);
    view(tail, front, onTrack(slot, stop - 3), 7, side * 8, 3.5, 55);
    if (mode === 'tail') {
      // Standing on the track bed in the middle of where the car's deck will be.
      teleport(body, tail.x, tail.y + 0.6, tail.z);
      body.velocity.set(0, 0, 0);
      view(tail, front, tail, 6, side * 6, 3, 55);
    }
    done();
    background(
      (async () => {
        for (let k = 0; k < 4000 && train(rw(), slot).boiler === 0; k++) await wait(15);
        const t0 = railAt(),
          from = { x: body.position.x, y: body.position.y, z: body.position.z };
        say(`slot ${slot} wears boiler ${train(rw(), slot).boiler} at tick ${t0}; player at ${JSON.stringify(from)}`);
        let top = from.y,
          fastest = 0;
        for (const end = t0 + 40; railAt() < end; await wait(10)) {
          top = Math.max(top, body.position.y);
          fastest = Math.max(fastest, Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z));
        }
        const c = cars(slot).steel;
        const p = body.position;
        say(
          `after 4 s: steel car ${c ? `at ${r2(c.x)}, ${r2(c.y)}, ${r2(c.z)}` : 'NOT DRAWN'}; player at ${r2(p.x)}, ${r2(p.y)}, ${r2(p.z)}` +
            `; feet ${c ? r2(p.y - 0.45 - (c.y + (STEEL_CAR.top - 0.4) / 2)) : '?'} m over the deck top; highest y ${r2(top)}` +
            `; fastest ${r2(fastest)} m/s; from the car's centre ${c ? r2(Math.hypot(p.x - c.x, p.z - c.z)) : '?'} m` +
            `; riding the steel car ${c?.riding}; carried by ${carry.on?.id ?? 'nothing'}`,
        );
      })(),
      'steel car beat',
    );
  } else if (mode === 'pier-l' || mode === 'pier-r') {
    const stop = stopM(PIER);
    // No train stops at the Pier unasked: board a fitted train's steel car at the stack head, ride it home on the deck
    // and ask for the Pier from there, through the prompt and the real action, as a rider does.
    const slot = await waitFor(
      'a fitted train standing at the stack head',
      // `&wagon=1`: the wagon's train, whose steel car stands wholly off the Pier's deck (level finding 4).
      () =>
        slots.find(
          (s) =>
            train(rw(), s).boiler >= 1 &&
            standing(s, 5) &&
            cars(s).steel &&
            (!new URLSearchParams(location.search).get('wagon') || train(rw(), s).wagon),
        ),
      6000,
    );
    await ticks(3);
    const board = cars(slot).steel!;
    teleport(body, board.x, board.y + (STEEL_CAR.top - 0.4) / 2 + 0.5, board.z);
    body.velocity.set(0, 0, 0);
    say(`boarded the steel car of ${rowOf(slot)} at tick ${railAt()}`);
    let asked = -1,
      told = railAt();
    await waitFor(
      'the ride in to the Pier',
      () => {
        const r = train(rw(), slot),
          prompt = [...document.querySelectorAll<HTMLElement>('.prompt')].map((e) => e.innerText).join(' | ');
        if (asked < 0 && /Request stop: Pier/.test(prompt) && !/requested/i.test(prompt)) {
          triggerAction('interact', 'down');
          triggerAction('interact', 'up');
          asked = railAt();
          say(
            `pressed "${prompt.replace(/\s+/g, ' ')}" at tick ${asked}, ${r2(along(slot))} m along, carried by ${carry.on?.id ?? 'nothing'}`,
          );
        }
        if (railAt() >= told + 100) {
          told = railAt();
          say(
            `tick ${told}: ${rowOf(slot)} phase ${r.phase} req ${r.req} at ${r2(along(slot))} m; carried by ${carry.on?.id ?? 'nothing'}; prompt "${prompt.replace(/\s+/g, ' ')}"`,
          );
        }
        // Homeward the train's place falls towards the Pier's stop: asked, running and within 25 m of it (a request
        // stop is in the row's `req`, not its `to`).
        const d = along(slot) - stop;
        return asked >= 0 && r.phase === TRAIN_PHASE.RUN && d > 0 && d < 25 ? slot : undefined;
      },
      9000,
    );
    say(`riding in: carried by ${carry.on?.id ?? 'nothing'} at ${r2(along(slot))} m along`);
    const tailS = stop + steelCarOffset(train(rw(), slot).wagon);
    const tail = onTrack(slot, tailS),
      front = onTrack(slot, stop);
    const sign = mode === 'pier-l' ? -1 : 1;
    // How long the stick is held, in server ticks (`&walk=`): 5 is a step off the deck's side, 14 a walk on past it.
    const walk = Number(new URLSearchParams(location.search).get('walk') ?? 5);
    say(`${rowOf(slot)} is running in to the Pier; its steel car will stand at s ${r2(tailS)}`);
    view(tail, front, tail, 9, sign * 7, 5, 55);
    done();
    background(
      (async () => {
        for (let k = 0; k < 4000 && !standing(slot, PIER); k++) await wait(15);
        const tail = onTrack(slot, tailS),
          front = onTrack(slot, stop);
        if (!standing(slot, PIER)) return say(`slot ${slot} never stood at the Pier: ${rowOf(slot)}`);
        await ticks(2);
        const c = cars(slot).steel;
        if (!c) return say('NO STEEL CAR DRAWN at the Pier');
        const deck = c.y + (STEEL_CAR.top - 0.4) / 2;
        say(`stood at the Pier at tick ${railAt()}: carried by ${carry.on?.id ?? 'nothing'}`);
        if (carry.on?.id !== `railway:train${slot}-steel`) {
          say('NOT ABOARD after the ride: put back on the deck');
          teleport(body, c.x, deck + 0.5, c.z);
          body.velocity.set(0, 0, 0);
        }
        // Walk square off the car's side: forward is (-sin yaw, -cos yaw).
        const ux = front.x - tail.x,
          uz = front.z - tail.z,
          len = Math.hypot(ux, uz);
        const vx = (sign * uz) / len,
          vz = (-sign * ux) / len;
        cam.yaw = me.yaw = Math.atan2(-vx, -vz);
        await ticks(6);
        say(
          `on the deck at tick ${railAt()}: y ${r2(body.position.y)} (deck top ${r2(deck)}), carried by ${carry.on?.id ?? 'nothing'}`,
        );
        dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
        let low = body.position.y;
        const t0 = railAt();
        for (; railAt() < t0 + walk; await wait(10)) low = Math.min(low, body.position.y);
        dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
        for (; railAt() < t0 + 50; await wait(10)) low = Math.min(low, body.position.y);
        const p = { x: body.position.x, y: body.position.y, z: body.position.z };
        const off = (p.x - c.x) * vx + (p.z - c.z) * vz;
        say(
          `walked ${walk / 10} s off to the ${mode === 'pier-l' ? 'left' : 'right'}: after 5 s at ${r2(p.x)}, ${r2(p.y)}, ${r2(p.z)}; ${r2(off)} m out from the car's centre line` +
            `; feet ${r2(p.y - 0.45 - line2Y(tailS))} m over the rail; lowest y ${r2(low)}; speed ${r2(Math.hypot(body.velocity.x, body.velocity.y, body.velocity.z))} m/s` +
            `; coyote ${r2(me.coyote)}; carried by ${carry.on?.id ?? 'nothing'}`,
        );
        // Then back the way they came: can they get up again, or are they stuck?
        cam.yaw = me.yaw = Math.atan2(vx, vz);
        dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
        const t1 = railAt();
        for (; railAt() < t1 + 25; await wait(10));
        dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
        const q = body.position;
        say(
          `walked back 2.5 s: at ${r2(q.x)}, ${r2(q.y)}, ${r2(q.z)}; moved ${r2(Math.hypot(q.x - p.x, q.z - p.z))} m; coyote ${r2(me.coyote)}`,
        );
      })(),
      'pier walk-off',
    );
  } else if (mode === 'join') {
    // A shed train joining a fitted line (stack-kit.ts's own prediction): the camera on the tail of where it stands.
    const shedSlots = () => slots.filter((k) => train(rw(), k).phase === TRAIN_PHASE.SHED);
    const joins = (tick: number) => {
      let hit = false;
      fleetJoin(
        {
          row: (k: number) => train(rw(), k),
          set: () => void (hit = true),
          stops: (l: number) => trainStops(rw(), l),
          awake: rail(rw()).trains,
          fleet: (l: number) => fleetOf(l, legsLaid(rw())),
        } as never,
        LINE2,
        tick,
      );
      return hit;
    };
    const stop = stopM(VILLAGE);
    say(
      `in the shed ${JSON.stringify(shedSlots())}; the line's boiler ${line(rw(), LINE2).boiler}; steel in the bay ${shed(rw()).steel}`,
    );
    // The stack seeds have not installed: install first, so the joining train takes the fit as it stands there.
    if (line(rw(), LINE2).boiler < 1) await install();
    const first = shedSlots()[0];
    if (first === undefined) throw new Error('steel-car: no train in the shed');
    const tail = onTrack(first, stop + steelCarOffset(false)),
      front = onTrack(first, stop + 4);
    view(
      tail,
      front,
      onTrack(first, stop - 4),
      5,
      Number(new URLSearchParams(location.search).get('side') ?? 1) * 6,
      3,
      55,
    );
    await waitFor(
      'a shed train about to join',
      () => (shedSlots().length && joins(railAt() + 12) && !joins(railAt()) ? 0 : undefined),
      9000,
    );
    done();
    const before = shedSlots();
    let out: number | undefined;
    while (out === undefined) {
      out = before.find((k) => !shedSlots().includes(k));
      await wait(10);
    }
    const t0 = performance.now();
    say(`slot ${out} joined at tick ${railAt()}: ${rowOf(out)}`);
    let last = '';
    while (performance.now() - t0 < 1500) {
      const c = cars(out);
      const gap = c.steel && c['2'] ? r2(Math.hypot(c.steel.x - c['2'].x, c.steel.z - c['2'].z)) : -1;
      const pitch = c['1'] && c['2'] ? r2(Math.hypot(c['1'].x - c['2'].x, c['1'].z - c['2'].z)) : -1;
      const text = `steel car ${c.steel ? 'drawn' : 'not drawn'}, ${gap} m behind the kit car; the kit car ${pitch} m behind the passenger car`;
      if (text !== last) say(`join ${Math.round(performance.now() - t0)} ms: ${(last = text)}`);
      await wait(30);
    }
  } else throw new Error(`steel-car: unknown case ${mode}`);
};
background(run(), `steel car ${mode}`);
export {};
