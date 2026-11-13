// npm run look -- --rail-seed stack-laid-2 --real --eval dev/look/evals/stack-kit.ts --query 'kit=car' \
//   --until 'window.__kitReady' --name kit-car
// npm run look -- --rail-seed stack-fresh-1 --real --eval dev/look/evals/stack-kit.ts --query 'kit=hop' \
//   --until 'window.__kitReady' --video --seconds 6 --frames 24 --name kit-hop
// npm run look -- --rail-seed stack-fresh-1 --real --eval dev/look/evals/stack-kit.ts --query 'kit=join' \
//   --until 'window.__kitReady' --video --seconds 5 --frames 20 --name kit-join
// The kit's looks on the stack line (docs/plans/greybox-route.md, leg 1 step 4b). `kit` picks one:
//   car    frames the kit car of a line 2 train that shows a number board, from `side` (1 or -1) of it; ready once
//          one stands at a halt (or after 40 s, moving)
//   hop    a fixed camera on the open section's rack and the track beside it; ready 1.5 s (15 server ticks) before a
//          train carrying kit the rack lacks comes to a stand there, so a real-time capture holds the hop
//   join   a fixed camera on line 2's first stop at the Village; ready 1.2 s before a shed train joins (the sim's own
//          fleetJoin, asked about the tick 12 on with today's rows), so a real-time capture holds the scale-in
// Everything waits on server ticks (a solo look's server runs in real time). Stands your body behind the camera (a
// staging teleport), so what is resident by distance is there. Prints `KIT ...` lines: every line 2 train's mark and
// cargo, the leg's rows, and each change of the flight or the scale while it watches.
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { inspectRailway, railRead, rw, railAt, train, rail, trainStops } = (await import(
  '/dev/look/rail-read.ts' as string
)) as typeof import('../rail-read.ts');
const { TRAIN_PHASE, trainArrives, fleetOf } = (await import(
  '/src/sim/railway-train.ts' as string
)) as typeof import('../../../src/sim/railway-train.ts');
const { LINE_SLOTS, fleetJoin } = (await import(
  '/src/sim/railway-trains.ts' as string
)) as typeof import('../../../src/sim/railway-trains.ts');
const { RAIL_LEGS, legRack, legS } = (await import(
  '/src/sim/railway-route.ts' as string
)) as typeof import('../../../src/sim/railway-route.ts');
const { legKitStop, legRackNeed, legRow, legsLaid, openLeg } = (await import(
  '/src/sim/railway-queries-route.ts' as string
)) as typeof import('../../../src/sim/railway-queries-route.ts');
const { line2World, line2Y, RING_S } = (await import(
  '/src/entities/railway/line2-path.ts' as string
)) as typeof import('../../../src/entities/railway/line2-path.ts');

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const query = new URLSearchParams(location.search);
const mode = query.get('kit') ?? 'car',
  side = Number(query.get('side') ?? 1);
const LINE2 = 1,
  LEG = 0;
type Car = { x: number; y: number; z: number };
type TrainView = { line: number; kitBoard: string; joinScale: number; crates: number; cars: Car[] };
type View = { trains?: TrainView[]; legKitFlying?: { logs: number; rails: number }; markerGrow?: number[] };
const view = () => inspectRailway()?.line2View as unknown as View | undefined;
const page = window as unknown as { __kitReady: boolean };
page.__kitReady = false;
const deadline = performance.now() + 60000;
while (!me.body || !me.entered || !railRead()?.whole() || !view()?.trains) {
  if (performance.now() > deadline) throw new Error('stack-kit: the player or the railway never came');
  await wait(100);
}
const slots = LINE_SLOTS[LINE2]!;
const report = () =>
  JSON.stringify({
    tick: railAt(),
    leg: (({ laid, logs, rails, start }) => ({ laid, logs, rails, start }))(legRow(rw(), LEG)),
    rack: { logs: rail(rw()).depot, rails: rail(rw()).depotRails },
    trains: slots.map((k) => {
      const t = train(rw(), k);
      return [k, t.phase, t.at, t.to, t.track, t.logs, t.rails, +!!t.legKit, view()!.trains![k]?.kitBoard ?? ''].join(
        ' ',
      );
    }),
  });
console.log('KIT rows (slot phase at to track logs rails legKit board)', report());

let cam: [number, number, number] = [0, 0, 0],
  look: [number, number, number] = [0, 0, 0];
const hold = () => {
  window.__debugCam!.set(cam, look, 50);
  const dx = cam[0] - look[0],
    dz = cam[2] - look[2],
    n = Math.hypot(dx, dz) || 1;
  teleport(me.body!, cam[0] + (dx / n) * 1.4, cam[1] - 0.3, cam[2] + (dz / n) * 1.4);
  me.body!.velocity.set(0, 0, 0);
};
const p = { x: 0, z: 0 };
const on = (s: number, lat: number, up: number): [number, number, number] => {
  line2World(s, lat, p);
  return [p.x, line2Y(s) + up, p.z];
};

if (mode === 'car') {
  const marked = () =>
    slots.filter((k) => view()!.trains![k]?.kitBoard).sort((a, b) => train(rw(), a).phase - train(rw(), b).phase);
  const standing = (k: number) => train(rw(), k).phase === TRAIN_PHASE.STAND && train(rw(), k).at >= 0;
  let pick = -1;
  const began = performance.now();
  setInterval(() => {
    const now = marked();
    // Stay with a train once it stands; until then follow the first marked one.
    if (pick < 0 || !view()!.trains![pick]?.kitBoard || !standing(pick)) pick = now.find(standing) ?? now[0] ?? -1;
    if (pick < 0) return;
    const cars = view()!.trains![pick]!.cars,
      kit = cars[2]!,
      ahead = cars[1]!;
    const dx = ahead.x - kit.x,
      dz = ahead.z - kit.z,
      n = Math.hypot(dx, dz) || 1;
    cam = [
      kit.x + (-dz / n) * 5.5 * side - (dx / n) * 2.5,
      kit.y + 1.9,
      kit.z + (dx / n) * 5.5 * side - (dz / n) * 2.5,
    ];
    look = [kit.x, kit.y + 1.1, kit.z];
    hold();
    if (!page.__kitReady && (standing(pick) || performance.now() - began > 40000)) {
      console.log('KIT car', pick, standing(pick) ? 'standing' : 'moving', report());
      page.__kitReady = true;
    }
  }, 50);
} else if (mode === 'hop') {
  const laid = legRow(rw(), LEG).laid,
    leg = RAIL_LEGS[LEG]!;
  if (laid >= leg.sections.length) throw new Error('stack-kit: the leg is complete, no rack stands');
  const rackS = laid === 0 ? RING_S + 446 : legS(leg, leg.sections[laid - 1]!.toCm) / 100 - 18,
    rack = legRack(leg, laid);
  // Ring Island's rack is across the tracks from the train (west platform, lat -8.4); a railhead's is at lat +4.8.
  cam = laid === 0 ? on(rackS + 8, -5, 3.4) : on(rackS + 7.5, 6.6, 4.2);
  look = laid === 0 ? [rack.x / 100 + 2, rack.y / 100 + 0.6, rack.z / 100] : on(rackS - 2, 2.4, 1.6);
  hold();
  setInterval(hold, 100);
  const soon = () => {
    const k = openLeg(rw(), LINE2);
    if (k < 0) return false;
    const need = legRackNeed(rw(), k),
      at = legKitStop(rw(), k);
    return slots.some((s) => {
      const t = train(rw(), s);
      return (
        !!t.legKit &&
        ((t.logs > 0 && need.logs > 0) || (t.rails > 0 && need.rails > 0)) &&
        t.phase === TRAIN_PHASE.RUN &&
        t.to === at &&
        trainArrives(t, LINE2) - railAt() <= 15
      );
    });
  };
  let last = '';
  const began = performance.now();
  setInterval(() => {
    if (!page.__kitReady && soon()) {
      console.log('KIT hop: a kit train is 15 ticks out', report());
      page.__kitReady = true;
    }
    const f = view()!.legKitFlying!,
      text = `flying ${f.logs}+${f.rails} rack ${rail(rw()).depot}+${rail(rw()).depotRails} crates ${slots.map((k) => view()!.trains![k]?.crates).join(',')}`;
    if (page.__kitReady && text !== last)
      console.log('KIT hop', Math.round(performance.now() - began), 'ms', (last = text));
  }, 50);
} else if (mode === 'join') {
  const s0 = trainStops(rw(), LINE2)[0]! / 100;
  cam = on(s0 + 6, Number(query.get('lat') ?? 11), 5);
  look = on(s0 - 2, -2, 1.2);
  hold();
  setInterval(hold, 100);
  const shed = () => slots.filter((k) => train(rw(), k).phase === TRAIN_PHASE.SHED);
  /** Whether the sim's fleetJoin would bring a shed train out at `tick`, the rows as they are now. */
  const joins = (tick: number) => {
    let hit = false;
    fleetJoin(
      {
        row: (k: number) => train(rw(), k),
        set: () => void (hit = true),
        stops: (line: number) => trainStops(rw(), line),
        awake: rail(rw()).trains,
        fleet: (line: number) => fleetOf(line, legsLaid(rw())),
      } as never,
      LINE2,
      tick,
    );
    return hit;
  };
  console.log('KIT join: in the shed', JSON.stringify(shed()));
  let was = shed(),
    edge = -1,
    last = '';
  setInterval(() => {
    const now = shed(),
      tick = railAt();
    if (!page.__kitReady && now.length && joins(tick + 12) && !joins(tick)) {
      console.log('KIT join: a shed train joins in about 12 ticks', report());
      page.__kitReady = true;
    }
    const out = was.filter((k) => !now.includes(k));
    was = now;
    if (out.length) {
      edge = performance.now();
      console.log('KIT join edge: slot', out.join(','), 'ready', page.__kitReady, report());
    }
    if (edge < 0 || performance.now() - edge > 1500) return;
    const text = `scale ${slots.map((k) => view()!.trains![k]?.joinScale).join(',')} marker ${view()!.markerGrow?.join(',')}`;
    if (text !== last) console.log('KIT join', Math.round(performance.now() - edge), 'ms', (last = text));
  }, 30);
} else throw new Error('stack-kit: ?kit=car|hop|join');
export {};
