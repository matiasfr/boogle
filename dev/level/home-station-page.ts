// node --import ./dev/sim/hooks.ts dev/level/home-station-page.ts: writes docs/world/home-layout.html's data block
// from Home's owning layout and sim anchors, so the page and game read the same numbers.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PAGE = 'docs/world/home-layout.html';
const SOURCES = [
  'src/place/layout.ts',
  'src/place/home-station.ts',
  'src/entities/railway/cars.ts',
  'src/sim/railway-train.ts',
  'src/sim/railway-lines.ts',
  'src/sim/railway-line-layout.ts',
  'src/sim/railway-line2-layout.ts',
  'src/sim/railway-works-layout.ts',
  'src/sim/railway-cart.ts',
];
/** Engine lengths the page compares: today's, the floor the review set, and the wider one beside it. */
const ENGINE = [1, 1.25, 1.4];

type P = [number, number];
type Box = { x: number; z: number; w: number; d: number; yaw: number };
const r2 = (v: number) => Math.round(v * 100) / 100;
const pt = (p: { x: number; z: number }): P => [r2(p.x), r2(p.z)];
const bx = (b: Box): Box => ({ x: r2(b.x), z: r2(b.z), w: r2(b.w), d: r2(b.d), yaw: r2(b.yaw) });

async function part() {
  const layout = await import('../../src/place/layout.ts');
  const home = await import('../../src/place/home-station.ts');
  const { LOCO, TRAILER, WAGON_CAR, TRAIN_OFFSETS } = await import('../../src/entities/railway/cars.ts');
  const { TRAIN_STOPS } = await import('../../src/sim/railway-train.ts');
  const { LINE2_FORGE, LINE2_BOILER, LINE2_PACK, LINE2_STATIONS } =
    await import('../../src/sim/railway-line2-layout.ts');
  const { LINE1_AXE_STAND } = await import('../../src/sim/railway-line-layout.ts');
  const { WAGON_S, WORKS_SEAMS } = await import('../../src/sim/railway-works-layout.ts');
  const { RAIL_LINES } = await import('../../src/sim/railway-lines.ts');
  const { CART_ROAD } = await import('../../src/sim/railway-cart.ts');
  const { LINES, lineAt } = layout;
  const lines = [LINES.north, LINES.east] as const;
  const at = { x: 0, z: 0, ux: 0, uz: 1 };
  const along = (road: 0 | 1, s: number, lat = 0) => {
    lineAt(lines[road], s, at);
    return { x: at.x - at.uz * lat, z: at.z + at.ux * lat, yaw: Math.atan2(at.ux, at.uz) };
  };
  const cm = (p: { x: number; z: number }) => ({ x: p.x / 100 - layout.ORIGIN.x, z: p.z / 100 });
  /** Home's lines run back to their buffer stops. */
  const from = (road: 0 | 1) => Math.ceil(home.BUFFERS[road]) - 1;
  const polyline = (road: 0 | 1, s0: number, s1: number) => {
    const out: P[] = [];
    const step = s1 > s0 ? 1 : -1;
    for (let s = s0; step > 0 ? s < s1 : s > s1; s += step) out.push(pt(along(road, s)));
    out.push(pt(along(road, s1)));
    return out;
  };
  const sampled = (road: 0 | 1) => polyline(road, home.BUFFERS[road], 200 + from(road));

  /** The train at its first stop, its engine `f` times today's length and width, the gap behind its cab kept. */
  const trains = (f: number) => {
    const out: Record<string, (Box & { kind: string })[]> = {};
    for (const road of [0, 1] as const) {
      const s = TRAIN_STOPS[road]![0]! / 100;
      const cars = road ? 4 : 3;
      out[road ? 'l2' : 'l1'] = TRAIN_OFFSETS.slice(0, cars).map((o, k) => {
        const spec = k === 0 ? LOCO : k === 3 ? WAGON_CAR : TRAILER;
        const scale = k === 0 ? f : 1;
        const off = k === 0 ? o - spec.hz + spec.hz * f : o;
        const p = along(road, s + off);
        return {
          ...bx({ x: p.x, z: p.z, w: spec.hx * 2 * scale, d: spec.hz * 2 * scale, yaw: p.yaw }),
          kind: k ? 'car' : 'loco',
        };
      });
    }
    return out;
  };
  const q2s = LINE2_STATIONS[1]!.fromCm / 100;
  const shared = {
    // `s0`: each line's buffer stop.
    lines: {
      l1: { pts: sampled(0), s0: home.BUFFERS[0] },
      l2: { pts: sampled(1), s0: home.BUFFERS[1] },
    },
    trains: trains(1),
    trainsAt: Object.fromEntries(ENGINE.map((f) => [String(f), trains(f)])),
  };
  const anchors = () => ({
    forgeRack: pt(cm({ x: LINE2_FORGE.rackX, z: LINE2_FORGE.rackZ })),
    pedestal: pt(cm(LINE2_BOILER)),
    chest: pt(cm(LINE2_PACK)),
    axeStand: pt(cm(LINE1_AXE_STAND)),
    shelf: pt(layout.SHELF),
    cartStop: pt(home.cartRoadAt(CART_ROAD.forgeCm / 100, LINES)),
    q1Frame: pt(cm(LINE2_STATIONS[0]!)),
    q2Rack: pt(along(1, q2s)),
    q2Frame: pt(cm(LINE2_STATIONS[1]!)),
    wagonWait: pt(along(1, WAGON_S / 100)),
    stallDoor: pt(cm(WORKS_SEAMS[0])),
    haltL1: pt(cm(RAIL_LINES[0]!.halts[0]!.platforms[0]!)),
    haltL2: pt(cm(RAIL_LINES[1]!.halts[0]!.platforms[0]!)),
    crane: pt(layout.CRANE),
    dock: pt(layout.DOCK),
    stoneYard: pt(layout.YARD),
    spawn: pt(layout.SPAWN),
    square: [-98, 9] as P,
  });
  const town = [
    ...layout.TOWN.start.map((p) => ({ ...p, stage: 'start' })),
    ...layout.TOWN.wood.flatMap((g, i) => g.map((p) => ({ ...p, stage: 'wood ' + (i + 1) }))),
    ...layout.TOWN.stone.flatMap((g, i) => g.map((p) => ({ ...p, stage: 'stone ' + (i + 1) }))),
  ]
    .filter((p) => p.w && p.d && Math.hypot(p.x + 85, p.z - 10) < 70)
    .map((p) => ({ ...bx({ x: p.x, z: p.z, w: p.w!, d: p.d!, yaw: p.yaw ?? 0 }), type: p.type, stage: p.stage }));
  const rooms = Object.entries(layout.ROOM_PLOTS).map(([id, r]) => ({ ...bx(r), id }));
  const A = home.ISLAND_A,
    I = home.ISLAND,
    yaw = home.HALL.yaw;
  const axisBox = (a0: number, a1: number, c: number, w: number) => {
    const p = home.axisPoint((a0 + a1) / 2, c);
    return bx({ x: p.x, z: p.z, w, d: a1 - a0, yaw });
  };
  const stalls = home.STALLS.bearings.map((bearing) => {
    const f = home.stallFrame(bearing);
    return { b: bearing, door: pt(f.door), back: pt(f.back), open: bearing === home.STALLS.open, w: home.STALLS.width };
  });
  // The track layer's way round once the forge has turned it: out road 1 to the leg, the leg, back down road 2.
  const drive = [...polyline(0, 19, home.LEG.from), ...home.legPoints().map(pt), ...polyline(1, home.LEG.to, 7)];
  const length = drive.slice(1).reduce((m, p, i) => m + Math.hypot(p[0] - drive[i]![0], p[1] - drive[i]![1]), 0);
  return {
    town,
    rooms,
    home: {
      ...shared,
      table: { x: r2(home.TABLE.x), z: r2(home.TABLE.z), r: home.TABLE.r },
      forge: bx({ ...layout.FORGE, yaw: 0 }),
      island: axisBox(A.buffers, A.foot, home.ISLAND_C, I.width),
      apron: axisBox(A.buffers, A.apron, home.ISLAND_C, I.width),
      deck: axisBox(A.deck0, A.deck1, home.ISLAND_C, I.width),
      house: bx({ x: home.HALL.x, z: home.HALL.z, w: home.HALL.w, d: home.HALL.d, yaw }),
      roof: axisBox(A.deck0, A.deck1, home.ISLAND_C, I.width),
      spur: home.spurPoints().map(pt),
      leg: home.legPoints().map(pt),
      drive: { pts: drive, length: r2(length) },
      buffers: [0, 1].map((road) => pt(along(road as 0 | 1, home.BUFFERS[road as 0 | 1]))),
      stalls,
      anchors: anchors(),
      numbers: {
        leg: r2(home.LEG.len),
        cartForgeCm: CART_ROAD.forgeCm,
        road2s: r2(home.ROAD2_S),
        roadGap: r2(home.ROAD_GAP),
        buffers: home.BUFFERS,
        hall: { w: home.HALL.w, d: home.HALL.d, height: home.HALL.height },
        island: I,
      },
    },
  };
}

{
  const data = {
    sourceCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(),
    sourceHashes: Object.fromEntries(
      SOURCES.map((f) => [
        f,
        createHash('sha256')
          .update(fs.readFileSync(ROOT + f))
          .digest('hex'),
      ]),
    ),
    generator: 'node --import ./dev/sim/hooks.ts dev/level/home-station-page.ts',
    units: 'metres; Place-local x,z; north = -z; yaw is three.js rotation.y (w along local x, d along local z)',
    origin: { x: 1000, z: 0 },
    engine: ENGINE,
    ...(await part()),
  };
  const html = fs.readFileSync(ROOT + PAGE, 'utf8');
  const open = '<script type="application/json" id="home-data">';
  const [head, rest] = html.split(open);
  const tail = rest!.slice(rest!.indexOf('</script>'));
  fs.writeFileSync(ROOT + PAGE, head + open + '\n' + JSON.stringify(data) + '\n' + tail);
  execFileSync(ROOT + 'node_modules/.bin/prettier', ['--write', PAGE], { cwd: ROOT, stdio: 'ignore' });
  console.log(`${PAGE}: data from ${data.sourceCommit.slice(0, 8)}; Home's drive round ${data.home.drive.length} m`);
}
