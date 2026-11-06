// Historical source-fragment replays through level-check --replay, plus the current crate check --physics uses. Fixtures are PARTLY, never full-build proof.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { Quaternion } from 'three/src/math/Quaternion.js';
import { Vector3 } from 'three/src/math/Vector3.js';
import { sourceFunction, sourceModule, sourceTextFunction } from './source.ts';

type Point = { x: number; y: number; z: number };
type Station = { id?: string; label: string; s: number; to: number; side: number };
type Line = { len: number; xs: number[]; zs: number[] };
type Link = { id: string; line: Line; dir: number; stations: Station[] };
type Layout = Record<string, unknown> & {
  ORIGIN: { x: number; z: number };
  LINKS: Link[];
  LINES: Record<string, Line>;
  STUB: { camp: number; village: number; east: number };
  lineAt: (line: Line, s: number, out: { x: number; z: number; ux: number; uz: number }) => void;
  railY: (line: Line, s: number) => number;
};
type Terrain = { H: (x: number, z: number) => number; PATH_SAMPLES: number[][][] };
type Provenance = { file: string; sha256: string; snapshot: string };
const output = path.resolve('.look/level-check/replays');
const THREE = { Quaternion, Object3D: { DEFAULT_UP: new Vector3(0, 1, 0) } };
const sha = (source: string) => createHash('sha256').update(source).digest('hex');

function snapshot(ref: string) {
  const commit = execFileSync('git', ['rev-parse', ref], { encoding: 'utf8' }).trim();
  const provenance: Provenance[] = [];
  const read = (file: string) => {
    const source = execFileSync('git', ['show', `${commit}:${file}`], { encoding: 'utf8', maxBuffer: 8e6 });
    const saved = path.join(output, commit, file);
    fs.mkdirSync(path.dirname(saved), { recursive: true });
    fs.writeFileSync(saved, source);
    provenance.push({ file, sha256: sha(source), snapshot: path.relative(process.cwd(), saved) });
    return source;
  };
  const math = sourceModule<Record<string, unknown>>(read('src/math-pure.ts'), {});
  const layout = sourceModule<Layout>(read('src/proto/place/layout.ts'), math);
  return { commit, provenance, read, math, layout };
}

type Snapshot = ReturnType<typeof snapshot>;
function terrain(s: Snapshot, oldLand = false): Terrain {
  const file = oldLand ? 'src/proto/place/land.ts' : 'src/proto/place/terrain.ts';
  let source = s.read(file);
  if (oldLand)
    source = source.slice(
      0,
      source.indexOf(
        '// ---------------------------------------------------------------- the mesh and the heightfield',
      ),
    );
  return sourceModule<Terrain>(source, { ...s.math, ...s.layout });
}
function frameAt(s: Snapshot, H?: Terrain['H']) {
  const source = s.read('src/proto/place/stations.ts');
  const OUT = sourceTextFunction<number>(source, 'OUT', {});
  if (!source.includes('function frameBesideLine')) {
    const start = source.indexOf('  lineAt(', source.indexOf('export function buildStation'));
    const end = source.indexOf('  const at = new THREE.Vector3', start);
    if (start < 0 || end < start || !H) throw new Error('Old station pose extraction anchors changed');
    return (spec: Station, line: Line, dir: number) =>
      sourceModule<Point & { yaw: number }>(
        source.slice(start, end),
        {
          ...s.layout,
          H,
          spec,
          line,
          dir,
          OUT,
          P: { x: 0, z: 0, ux: 0, uz: 1 },
        },
        ['x', 'y', 'z', 'yaw'],
      );
  }
  return sourceTextFunction<(spec: Station, line: Line, dir: number) => Point & { yaw: number }>(
    source,
    'frameBesideLine',
    { ...s.layout, P: { x: 0, z: 0, ux: 0, uz: 1 }, OUT },
  );
}
const CRATE_MARGIN = 3.5; // src/proto/place/run.ts handCrate
const CRATE_SAMPLES = [
  [0, 0],
  [CRATE_MARGIN, 0],
  [-CRATE_MARGIN, 0],
  [0, CRATE_MARGIN],
  [0, -CRATE_MARGIN],
];
const railPrefix = (source: string) =>
  source.slice(
    source.indexOf('const P:'),
    source.indexOf('// ---------------------------------------------------------------- track:'),
  );
function beside(s: Snapshot) {
  const selected = railPrefix(s.read('src/proto/place/rail.ts'));
  return sourceModule<{ besideLine: (line: Line, at: number, side: number) => { x: number; z: number } }>(
    selected,
    s.layout,
  ).besideLine;
}

async function frameReplay(ref: string) {
  const started = performance.now();
  const s = snapshot(ref),
    ground = terrain(s);
  const link = s.layout.LINKS[0]!;
  const station = link.stations.find((st) => st.id === 'T3')!;
  if (!station) throw new Error('Historical T3 is missing');
  const at = frameAt(s)(station, link.line, link.dir),
    y = ground.H(at.x, at.z);
  const source = s.read('src/proto/place/stations.ts');
  const start = source.indexOf('const turn = new THREE.Quaternion()', source.indexOf('export function buildStation'));
  const end = source.indexOf('  addFoot(', start);
  if (start < 0 || end < start) throw new Error('Frame collision extraction anchors changed');
  const boxes: { shape: { hx: number; hy: number; hz: number }; position: Point; rotation: Quaternion }[] = [];
  sourceModule(
    source.slice(start, end),
    {
      THREE,
      ...at,
      y,
      FRAME_D: sourceTextFunction<number>(source, 'FRAME_D', {}),
      FRAME_W: sourceTextFunction<number>(source, 'FRAME_W', {}),
      addStatic: (shape: { hx: number; hy: number; hz: number }, position: Point, rotation: Quaternion) =>
        boxes.push({ shape, position, rotation }),
    },
    [],
  );
  const constants = s.read('src/constants.ts');
  const PLAYER_R = sourceTextFunction<number>(constants, 'PLAYER_R', {});
  const HEAD_OFFSET = sourceTextFunction<number>(constants, 'HEAD_OFFSET', {});
  const makeBody = sourceTextFunction<(kinematic: boolean) => { shapes: { r: number; offset?: Point }[] }>(
    s.read('src/physics/physics.ts'),
    'makePlayerBody',
    {
      PLAYER_R,
      HEAD_OFFSET,
      PLAYER_MASS: 1,
      BODY: { DYNAMIC: 1, KINEMATIC: 2 },
      playerMat: null,
      NOT_SCENERY: 0,
      createBody: (value: unknown) => value,
    },
  );
  await import('../sim/hooks.ts');
  const RAPIER = await import('@dimforge/rapier3d');
  const player = makeBody(false);
  // Same declared stepped-up stance in both snapshots: 4 cm above the fixed frame's 0.56 m rail top.
  // This fixture proves a former invisible volume, not an entire ground-level approach or controller step-up.
  const stance = { x: at.x, y: y + 0.6 + PLAYER_R, z: at.z };
  const hits = boxes.flatMap((box, index) =>
    player.shapes.flatMap((sphere, sphereIndex) => {
      const position = {
        x: stance.x + (sphere.offset?.x ?? 0),
        y: stance.y + (sphere.offset?.y ?? 0),
        z: stance.z + (sphere.offset?.z ?? 0),
      };
      const hit = new RAPIER.Ball(sphere.r).intersectsShape(
        position,
        { x: 0, y: 0, z: 0, w: 1 },
        new RAPIER.Cuboid(box.shape.hx, box.shape.hy, box.shape.hz),
        box.position,
        box.rotation,
      );
      return hit ? [{ box: index, sphere: sphereIndex }] : [];
    }),
  );
  return {
    commit: s.commit,
    source: {
      file: 'src/proto/place/stations.ts',
      symbol: 'buildStation',
      fragmentSha256: sha(source.slice(start, end)),
    },
    stance,
    boxes,
    hits,
    blocked: hits.length > 0,
    provenance: s.provenance,
    elapsedMs: performance.now() - started,
  };
}

function crateReplay(ref: string) {
  const started = performance.now();
  const s = snapshot(ref),
    ground = terrain(s, true),
    besideLine = beside(s);
  const spec = s.layout.LINKS[0]!;
  const frame = frameAt(s, ground.H);
  const stations = spec.stations.map((st) => {
    const at = frame(st, spec.line, spec.dir);
    return { spec: st, y: ground.H(at.x, at.z) };
  });
  const next = stations[2]!;
  let delivered: Point | undefined;
  const handCrate = sourceTextFunction<(line: unknown, to: number, side: number) => void>(
    s.read('src/proto/place/index.ts'),
    'handCrate',
    {
      ...s.layout,
      ...ground,
      besideLine,
      scratch: { set() {} },
      machine: { flatbed: { x: 0, y: 0, z: 0 } },
      deliver: (x: number, y: number, z: number) => {
        delivered = { x, y, z };
      },
    },
  );
  handCrate({ spec, stations }, stations[1]!.spec.to, stations[1]!.spec.side);
  if (!delivered) throw new Error('Historical handCrate did not deliver');
  const point: Point = delivered;
  const samples = CRATE_SAMPLES.map(([dx, dz]) => {
    const x = point.x + dx!,
      z = point.z + dz!,
      height = ground.H(x, z);
    return { x, z, height, delta: Math.abs(height - next.y) };
  });
  const primaryCandidates = [-spec.dir * 3.4, spec.dir * 3.4].map((along) => {
    const q = besideLine(spec.line, next.spec.s - spec.dir * 1.5 + along, next.spec.side * 5.4);
    const residuals = CRATE_SAMPLES.map(([dx, dz]) => Math.abs(ground.H(q.x + dx!, q.z + dz!) - next.y));
    return {
      ...q,
      residuals,
      centerAccepts: residuals[0]! <= 1,
      marginAccepts: residuals.every((delta) => delta <= 1),
    };
  });
  return {
    commit: s.commit,
    source: { file: 'src/proto/place/index.ts', symbol: 'handCrate' },
    delivered,
    stationHeight: next.y,
    samples,
    primaryCandidates,
    selectedPrimary: primaryCandidates.findIndex((q) => Math.hypot(q.x - point.x, q.z - point.z) < 1e-8),
    unsafeApproach: samples.some((q) => q.delta > 1),
    provenance: s.provenance,
    elapsedMs: performance.now() - started,
  };
}

function stackReplay(ref: string) {
  const started = performance.now();
  const s = snapshot(ref),
    ground = terrain(s);
  type Pad = { id: string; x: number; z: number; top: number; ring?: string };
  const tech = sourceModule<{ PADS: Pad[]; ringAt: (p: Pad) => Point; MOVE: { hookRange: number } }>(
    s.read('src/proto/place/tech-layout.ts'),
    s.layout,
  );
  const stack = tech.PADS.find((p) => p.id === 'stack')!;
  const playerRadius = sourceTextFunction<number>(s.read('src/constants.ts'), 'PLAYER_R', {});
  const routes = tech.PADS.filter((p) => p.ring === 'stack').map((p) => {
    const ring = tech.ringAt(p),
      distance = Math.hypot(ring.x - stack.x, ring.z - stack.z, ring.y - stack.top - playerRadius);
    return {
      target: p.id,
      ring,
      distance,
      inRange: distance <= tech.MOVE.hookRange,
      stance: 'Synthetic stationary player body at stack center, top + historical PLAYER_R',
    };
  });
  const spec = s.layout.LINKS.find((link) => link.id === 'quarry')!;
  // Q5 has opened Far Head, while Q6 (the pier) is still unbuilt: derive laid extent from the snapshot's own Q5.
  const laid = spec.stations.find((st) => st.id === 'Q5')!.to;
  const rail = s.read('src/proto/place/rail.ts');
  const basis = sourceModule<Record<string, unknown>>(railPrefix(rail), s.layout, ['P', 'lateral']);
  const uStart = rail.indexOf('  const u =', rail.indexOf('export function buildTrack'));
  const uEnd = rail.indexOf('\n  const boxes', uStart);
  const stubStart = rail.indexOf('  const stubbed =', uEnd);
  const stubEnd = rail.indexOf('\n  const add =', stubStart);
  const solidStart = rail.indexOf('  const solids: Solid[]');
  const solidEnd = rail.indexOf('  for (const l of legsAt)', solidStart);
  if ([uStart, uEnd, stubStart, stubEnd, solidStart, solidEnd].some((n) => n < 0))
    throw new Error('Historical slab fragment anchors changed');
  type FixtureSolid = { s?: number; u: number; on: { coordinates: number[] } | null; add: () => unknown };
  const { solids } = sourceModule<{ solids: FixtureSolid[] }>(
    rail.slice(uStart, uEnd) + rail.slice(stubStart, stubEnd) + rail.slice(solidStart, solidEnd),
    {
      ...s.layout,
      ...ground,
      ...basis,
      spec,
      line: spec.line,
      dir: spec.dir,
      TOP: sourceTextFunction<number>(rail, 'TOP', {}),
      DECK_W: sourceTextFunction<number>(rail, 'DECK_W', {}),
      BED_W: sourceTextFunction<number>(rail, 'BED_W', {}),
      slab: (...coordinates: number[]) => ({ coordinates }),
    },
    ['solids'],
  );
  solids.sort((a, b) => a.u - b.u);
  const grow = sourceTextFunction<(track: unknown, to: number) => void>(rail, 'growSolids', {});
  grow({ solids, nextSolid: 0 }, laid);
  const line = { spec, open: true, track: { solids } };
  const query = { x: 0, z: 0, ux: 0, uz: 1 };
  // Just beyond the final laid slab near Far Head; deliberately probes a proposed pose on the unbuilt pier.
  s.layout.lineAt(spec.line, laid + 12, query);
  const nearest = sourceTextFunction<(x: number, z: number) => number[]>(
    s.read('src/proto/place/verbs.ts'),
    'nearestSample',
    {
      ...s.layout,
      ...ground,
      lines: [line],
      run: { line, head: laid },
    },
  );
  const chosen = nearest(query.x + s.layout.ORIGIN.x, query.z);
  const activeDistance = Math.min(
    ...solids
      .filter((solid) => solid.on)
      .map((solid) => {
        const c = solid.on!.coordinates;
        return Math.hypot((c[0]! + c[2]!) / 2 - s.layout.ORIGIN.x - chosen[0]!, (c[1]! + c[3]!) / 2 - chosen[1]!);
      }),
  );
  const insideActiveSlabFootprint = solids
    .filter((solid) => solid.on)
    .some((solid) => {
      const c = solid.on!.coordinates;
      const dx = c[2]! - c[0]!,
        dz = c[3]! - c[1]!;
      const px = chosen[0]! + s.layout.ORIGIN.x - c[0]!,
        pz = chosen[1]! - c[1]!;
      const lengthSquared = dx * dx + dz * dz;
      const along = (px * dx + pz * dz) / lengthSquared;
      const lateral = Math.abs(px * dz - pz * dx) / Math.sqrt(lengthSquared);
      return along >= 0 && along <= 1 && lateral <= c[6]! / 2;
    });
  return {
    commit: s.commit,
    source: [
      { file: 'src/proto/place/tech-layout.ts', symbol: 'PADS/ringAt' },
      { file: 'src/proto/place/verbs.ts', symbol: 'nearestSample' },
    ],
    routes,
    hasRangeCompatibleReturn: routes.some((r) => r.inRange),
    recovery: {
      laid,
      query,
      chosen,
      nearestActiveTrackCenterM: activeDistance,
      insideActiveSlabFootprint,
      unsupportedTrackCandidate: !insideActiveSlabFootprint,
    },
    provenance: s.provenance,
    elapsedMs: performance.now() - started,
  };
}

/** Current T2 completion's actual handCrate candidate beside T3, with terrain-margin residuals. No collision inference. */
export async function auditCurrentCrate() {
  const started = performance.now();
  const layout = await import('../../src/proto/place/layout.ts');
  const ground = await import('../../src/proto/place/terrain.ts');
  const { frameBesideLine, OUT } = await import('../../src/proto/place/spatial-station.ts');
  const railSource = fs.readFileSync('src/proto/place/rail.ts', 'utf8');
  const railFragment = railPrefix(railSource);
  const { besideLine } = sourceModule<{
    besideLine: (line: unknown, at: number, side: number) => { x: number; z: number };
  }>(railFragment, layout);
  const spec = layout.LINKS.find((link) => link.id === 'timber')!;
  const stations = spec.stations.map((st) => {
    const at = frameBesideLine(st, spec.line, spec.dir);
    return { spec: st, y: ground.H(at.x, at.z) };
  });
  const recipient = stations.findIndex((st) => st.spec.id === 'T3');
  if (recipient < 1) throw new Error('T3 needs its actual preceding crate recipient');
  let delivered: Point | undefined;
  const handCrate = sourceFunction<(line: unknown, to: number, side: number) => void>(
    'src/proto/place/run.ts',
    'handCrate',
    {
      OUT,
      ...layout,
      ...ground,
      besideLine,
      scratch: { set() {} },
      machine: { flatbed: { x: 0, y: 0, z: 0 } },
      deliver: (x: number, y: number, z: number) => {
        delivered = { x, y, z };
      },
    },
  );
  const previous = stations[recipient - 1]!;
  handCrate({ spec, stations }, previous.spec.to, previous.spec.side);
  if (!delivered) throw new Error('Current handCrate did not deliver');
  const point: Point = delivered,
    stationHeight = stations[recipient]!.y;
  const samples = CRATE_SAMPLES.map(([dx, dz]) => {
    const x = point.x + dx!,
      z = point.z + dz!,
      height = ground.H(x, z);
    return { x, z, height, delta: Math.abs(height - stationHeight) };
  });
  return {
    source: { file: 'src/proto/place/run.ts', symbol: 'handCrate' },
    object: 'T3/reward-crate',
    delivered: point,
    stationHeight,
    samples,
    unsafeApproach: samples.some((sample) => sample.delta > 1),
    maximumHeightResidualM: Math.max(...samples.map((sample) => sample.delta)),
    marginM: CRATE_MARGIN,
    toleranceM: 1,
    method:
      'Executed current handCrate source with real pure terrain, frame pose and besideLine; delivery/machine animation are fixture dependencies.',
    limitations:
      'Cardinal terrain margins only: no continuous footprint, player stance, crate collider or delivery animation claim.',
    elapsedMs: performance.now() - started,
  };
}

export async function runReplays(): Promise<void> {
  const started = performance.now();
  fs.mkdirSync(output, { recursive: true });
  const cases: unknown[] = [];
  for (const [id, run] of [
    ['87104df0', frameReplay],
    ['a65eef4f', crateReplay],
    ['c9e654e7', stackReplay],
  ] as const) {
    try {
      const before = await run(`${id}^`),
        after = await run(id);
      const discriminated =
        ('blocked' in before && 'blocked' in after && before.blocked && !after.blocked) ||
        ('unsafeApproach' in before && 'unsafeApproach' in after && before.unsafeApproach && !after.unsafeApproach) ||
        ('recovery' in before &&
          'recovery' in after &&
          !before.hasRangeCompatibleReturn &&
          after.hasRangeCompatibleReturn &&
          before.recovery.unsupportedTrackCandidate &&
          !after.recovery.unsupportedTrackCandidate);
      const result = discriminated ? 'PARTLY' : 'MISSED';
      cases.push({
        id,
        result,
        discriminated,
        method: 'Executed isolated historical source fragments with explicit fixture state, not historical full game.',
        before,
        after,
      });
      console.log(
        `replay ${id}: ${result} (historical source fixtures executed; expected difference ${discriminated ? 'observed' : 'absent'})`,
      );
    } catch (error) {
      cases.push({ id, result: 'NOT RUN', error: String(error) });
      console.log(`replay ${id}: NOT RUN (${String(error)})`);
    }
  }
  const report = {
    schema: 1,
    adapterSha256: sha(fs.readFileSync('dev/level/replay.ts', 'utf8') + fs.readFileSync('dev/level/source.ts', 'utf8')),
    physics: JSON.parse(fs.readFileSync('node_modules/@dimforge/rapier3d/package.json', 'utf8')).version as string,
    cases,
    elapsedMs: performance.now() - started,
    limitations: [
      'Historical source fragments and fixture dependencies only; no historical renderer/controller build or regional completeness claim.',
      'Frame stance is explicitly stepped above low rails; stock, feeder, other regional creators and approach sweep are not covered.',
      'Crate margin rule repeats the historical fix policy; distinguishes terrain-edge placement, not collision or continuous safe approach.',
      'Stack return is a range-compatible declared edge; visibility cone, pull clearance, landing, continuous dry route and sleeper support are NOT RUN.',
      'Recovery executes historical nearestSample, slab generation and growSolids in a Far Head/pier fixture beyond the stack region. Horizontal active slab footprint only; no physics pose or reported runtime recovery-loop reproduction.',
    ],
  };
  fs.writeFileSync(path.join(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `replay report: ${path.relative(process.cwd(), output)}/report.json (${Math.round(report.elapsedMs)} ms)`,
  );
}
