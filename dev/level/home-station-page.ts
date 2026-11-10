// node --import ./dev/sim/hooks.ts dev/level/home-station-page.ts: writes docs/world/home-layout.html's data block from the code, so the 2D page and `?home=b` read
// the same numbers (docs/plans/home-station.md, step 2). Today is sampled with the flag off and B with BOOGLE_HOME=b,
// each in its own process because layout.ts reads the flag once; B's own shapes come from home-station.ts.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PAGE = 'docs/world/home-layout.html';
const SOURCES = [
  'src/proto/place/layout.ts',
  'src/proto/place/home-station.ts',
  'src/proto/wagon/cars.ts',
  'src/sim/railway-train.ts',
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

async function part(b: boolean) {
  const layout = await import('../../src/proto/place/layout.ts');
  const { frameBesideLine } = await import('../../src/proto/place/spatial-station.ts');
  const home = await import('../../src/proto/place/home-station.ts');
  const { LOCO, TRAILER, WAGON_CAR, TRAIN_OFFSETS } = await import('../../src/proto/wagon/cars.ts');
  const { TRAIN_STOPS } = await import('../../src/sim/railway-train.ts');
  const { LINE2_FORGE, LINE2_BOILER, LINE2_PACK, LINE2_STATIONS } =
    await import('../../src/sim/railway-line2-layout.ts');
  const { LINE1_AXE_STAND } = await import('../../src/sim/railway-line-layout.ts');
  const { WAGON_S, SHED_STALL, SHED_TABLE, WORKS_SEAMS } = await import('../../src/sim/railway-works-layout.ts');

  if (home.homeLayout() !== b) throw new Error('BOOGLE_HOME did not reach this process');
  const { LINES, lineAt } = layout;
  const lines = [LINES.north, LINES.east] as const;
  const at = { x: 0, z: 0, ux: 0, uz: 1 };
  const along = (road: 0 | 1, s: number, lat = 0) => {
    lineAt(lines[road], s, at);
    return { x: at.x - at.uz * lat, z: at.z + at.ux * lat, yaw: Math.atan2(at.ux, at.uz) };
  };
  const cm = (p: { x: number; z: number }) => ({ x: p.x / 100 - layout.ORIGIN.x, z: p.z / 100 });
  /** Today's lines start at their first sample; B's run back to the buffer stops. */
  const from = (road: 0 | 1) => (b ? Math.ceil(home.BUFFERS[road]) - 1 : 0);
  const polyline = (road: 0 | 1, s0: number, s1: number) => {
    const out: P[] = [];
    const step = s1 > s0 ? 1 : -1;
    for (let s = s0; step > 0 ? s < s1 : s > s1; s += step) out.push(pt(along(road, s)));
    out.push(pt(along(road, s1)));
    return out;
  };
  const sampled = (road: 0 | 1) => polyline(road, b ? home.BUFFERS[road] : 0, 200 + from(road));

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
  const q = (id: string) => {
    for (const link of layout.LINKS)
      for (const spec of link.stations)
        if (spec.id === id) {
          const f = frameBesideLine(spec, link.line, link.dir);
          return pt({ x: f.x - layout.ORIGIN.x, z: f.z });
        }
    throw new Error('no station ' + id);
  };
  const q2s = LINE2_STATIONS[1]!.fromCm / 100;
  const shared = {
    // `s0`: the s of each line's first point (B's run back to their buffer stops).
    lines: {
      l1: { pts: sampled(0), s0: b ? home.BUFFERS[0] : 0 },
      l2: { pts: sampled(1), s0: b ? home.BUFFERS[1] : 0 },
    },
    trains: trains(1),
    trainsAt: Object.fromEntries(ENGINE.map((f) => [String(f), trains(f)])),
  };
  const anchorsToday = () => ({
    forgeRack: pt(cm({ x: LINE2_FORGE.rackX, z: LINE2_FORGE.rackZ })),
    pedestal: pt(cm(LINE2_BOILER)),
    chest: pt(cm(LINE2_PACK)),
    axeStand: pt(cm(LINE1_AXE_STAND)),
    shelf: pt(layout.SHELF),
    cartStop: pt(layout.TURNTABLE),

    q1Frame: pt(cm(LINE2_STATIONS[0]!)),
    q2Rack: pt(along(1, q2s)),
    q2Frame: pt(cm(LINE2_STATIONS[1]!)),
    wagonWait: pt(along(1, WAGON_S / 100)),
    stallDoor: pt(cm(WORKS_SEAMS[0])),
    haltL1: pt(cm({ x: 92819, z: -434 })),
    haltL2: pt(cm({ x: 92779, z: 2617 })),
    crane: pt(layout.CRANE),
    dock: pt(layout.DOCK),
    stoneYard: pt(layout.YARD),
    spawn: pt(layout.SPAWN),
    square: [-98, 9] as P,
  });
  if (!b) {
    const halts = layout.HALTS.filter((h) => h.name.startsWith('Village')).map((h) => {
      const mid = (h.s0 + h.s1) / 2;
      const c = along(h.line as 0 | 1, mid, h.lat);
      const sign = Math.sign(h.lat);
      const roof = along(h.line as 0 | 1, mid - 4.8, h.lat + sign * 0.4);
      return {
        name: h.name,
        deck: bx({ x: c.x, z: c.z, w: 2.5, d: h.s1 - h.s0, yaw: c.yaw }),
        roof: bx({ x: roof.x, z: roof.z, w: 2.7, d: 8.4, yaw: c.yaw }),
      };
    });
    const table = cm(SHED_TABLE);
    const stall = cm(SHED_STALL);
    const town = [
      ...layout.TOWN.start.map((p) => ({ ...p, stage: 'start' })),
      ...layout.TOWN.wood.flatMap((g, i) => g.map((p) => ({ ...p, stage: 'wood ' + (i + 1) }))),
      ...layout.TOWN.stone.flatMap((g, i) => g.map((p) => ({ ...p, stage: 'stone ' + (i + 1) }))),
    ]
      .filter((p) => p.w && p.d && Math.hypot(p.x + 85, p.z - 10) < 70)
      .map((p) => ({ ...bx({ x: p.x, z: p.z, w: p.w!, d: p.d!, yaw: p.yaw ?? 0 }), type: p.type, stage: p.stage }));
    const rooms = Object.entries(layout.ROOM_PLOTS).map(([id, r]) => ({ ...bx(r), id }));
    return {
      today: {
        ...shared,
        table: { x: r2(layout.TURNTABLE.x), z: r2(layout.TURNTABLE.z), r: layout.TURNTABLE.r },
        halts,
        stall: [bx({ x: stall.x, z: stall.z - 2, w: 4.4, d: 9, yaw: Math.PI / 2 })],
        stallRoad: [
          pt({ x: table.x - 4.8 / Math.SQRT2, z: table.z + 4.8 / Math.SQRT2 }),
          pt({ x: stall.x + 4, z: stall.z - 2 }),
          pt({ x: stall.x - 4.5, z: stall.z - 2 }),
        ],
        forge: bx({ ...layout.FORGE, yaw: 0 }),
        anchors: anchorsToday(),
      },
      town,
      rooms,
    };
  }

  // ---------------------------------------------------------------- B, as planned
  const A = home.ISLAND_A,
    I = home.ISLAND,
    yaw = home.HALL.yaw;
  const axisBox = (a0: number, a1: number, c: number, w: number) => {
    const p = home.axisPoint((a0 + a1) / 2, c);
    return bx({ x: p.x, z: p.z, w, d: a1 - a0, yaw });
  };
  const edge = (road: 0 | 1) => {
    const h = home.ISLAND_HALTS[road]!;
    return pt(along(road, (h.s0 + h.s1) / 2, Math.sign(h.lat) * I.edge));
  };
  const stalls = home.STALLS.bearings.map((bearing) => {
    const f = home.stallFrame(bearing);
    return { b: bearing, door: pt(f.door), back: pt(f.back), open: bearing === home.STALLS.open, w: home.STALLS.width };
  });
  // The track layer's way round once the forge has turned it: out road 1 to the leg, the leg, back down road 2.
  const drive = [...polyline(0, 19, home.LEG.from), ...home.legPoints().map(pt), ...polyline(1, home.LEG.to, 7)];
  const length = drive.slice(1).reduce((m, p, i) => m + Math.hypot(p[0] - drive[i]![0], p[1] - drive[i]![1]), 0);
  return {
    B: {
      ...shared,
      table: { x: r2(home.TABLE.x), z: r2(home.TABLE.z), r: home.TABLE.r },
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
      anchors: {
        ...anchorsToday(),
        forgeRack: pt(home.PROPS.rack),
        pedestal: pt(home.PROPS.pedestal),
        shelf: pt(home.SHELF_B),
        cartStop: pt(along(1, 0)),
        q1Frame: q('Q1'),
        q2Frame: q('Q2'),
        stallDoor: pt(home.stallFrame(home.STALLS.open).door),
        haltL1: edge(0),
        haltL2: edge(1),
        crane: pt(home.PROPS.crane),
        dock: pt(home.PROPS.dock),
        stoneYard: pt(home.PROPS.yard),
      },
      numbers: {
        leg: r2(home.LEG.len),
        cartForgeCm: Math.round(home.CART_FORGE * 100),
        road2s: r2(home.ROAD2_S),
        roadGap: r2(home.ROAD_GAP),
        buffers: home.BUFFERS,
        hall: { w: home.HALL.w, d: home.HALL.d, height: home.HALL.height },
        island: I,
      },
    },
  };
}

const which = process.argv.indexOf('--part');
if (which >= 0) {
  console.log(JSON.stringify(await part(process.argv[which + 1] === 'b')));
} else {
  const run = (b: boolean) =>
    JSON.parse(
      execFileSync(
        process.execPath,
        ['--import', './dev/sim/hooks.ts', fileURLToPath(import.meta.url), '--part', b ? 'b' : 'today'],
        {
          cwd: ROOT,
          env: { ...process.env, BOOGLE_HOME: b ? 'b' : '' },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ),
    );
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
    ...run(false),
    ...run(true),
  };
  const html = fs.readFileSync(ROOT + PAGE, 'utf8');
  const open = '<script type="application/json" id="home-data">';
  const [head, rest] = html.split(open);
  const tail = rest!.slice(rest!.indexOf('</script>'));
  fs.writeFileSync(ROOT + PAGE, head + open + '\n' + JSON.stringify(data) + '\n' + tail);
  execFileSync(ROOT + 'node_modules/.bin/prettier', ['--write', PAGE], { cwd: ROOT, stdio: 'ignore' });
  console.log(`${PAGE}: data from ${data.sourceCommit.slice(0, 8)}; B's drive round ${data.B.drive.length} m`);
}
