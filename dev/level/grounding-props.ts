// Source-linked opening scenery inventory. Assemblies name their real supports, never terrain beneath a beam.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import type { OwnedView } from '../../src/render/owned-view.ts';
import { sourceModule, sourceFunction } from './source.ts';
import { openingStops, WOOD2 } from '../../src/place/opening-plans.ts';
import { CRANE, RACK, ORIGIN, LINKS, PATHS, lineAt, railY } from '../../src/place/layout.ts';
import { SHORE_COAST, SHORE_HOP, SHORE_LANDING } from '../../src/place/shore-layout.ts';
import { frameBesideLine, FRAME_D, FRAME_W, SPAN, OUT } from '../../src/place/spatial-station.ts';
import { H } from '../../src/place/terrain.ts';
import { SEA } from '../../src/constants.ts';
import { TREE_SOURCES } from '../../src/place/tree-sources.ts';
import { RECOVERY_RACK } from '../../src/sim/railway-supply.ts';
import { boxFootprint, sampleFootprint, type Footprint } from '../../src/place/support.ts';
import { merged } from '../../src/render/part-geometry.ts';
import { T1_CRATE_PARTS } from '../../src/render/t1-reward-parts.ts';

const TOLERANCE_CM = 5;
function measure(id: string, footprint: Footprint, base: number, top: number) {
  if (!Number.isFinite(base) || !Number.isFinite(top)) throw new Error(`${id}: invalid support height`);
  const g = sampleFootprint(footprint),
    gapCm = Math.max(0, (base - g.low) * 100),
    sinkCm = Math.max(0, (g.high - top) * 100);
  return {
    id,
    x: footprint.reduce((n, p) => n + p[0], 0) / footprint.length,
    z: footprint.reduce((n, p) => n + p[1], 0) / footprint.length,
    base,
    top,
    groundMin: g.low,
    groundMax: g.high,
    samples: g.samples,
    gapCm,
    sinkCm,
    failed: gapCm > TOLERANCE_CM || sinkCm > TOLERANCE_CM,
  };
}
function separation(a: Footprint, b: Footprint) {
  let gap = -Infinity;
  for (const polygon of [a, b])
    for (let k = 0; k < polygon.length; k++) {
      const p = polygon[k]!,
        q = polygon[(k + 1) % polygon.length]!,
        length = Math.hypot(q[0] - p[0], q[1] - p[1]);
      const project = (f: Footprint) => f.map((v) => (v[0] * (q[1] - p[1]) - v[1] * (q[0] - p[0])) / length);
      const ap = project(a),
        bp = project(b);
      gap = Math.max(gap, Math.min(...ap) - Math.max(...bp), Math.min(...bp) - Math.max(...ap));
    }
  return gap;
}
function hull(points: [number, number][]): Footprint {
  const sorted = points
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])
    .filter((p, i, a) => !i || p[0] !== a[i - 1]![0] || p[1] !== a[i - 1]![1]);
  const cross = (a: number[], b: number[], c: number[]) =>
    (b[0]! - a[0]!) * (c[1]! - a[1]!) - (b[1]! - a[1]!) * (c[0]! - a[0]!);
  const half = (list: [number, number][]) => {
    const out: [number, number][] = [];
    for (const p of list) {
      while (out.length >= 2 && cross(out[out.length - 2]!, out[out.length - 1]!, p) <= 0) out.pop();
      out.push(p);
    }
    out.pop();
    return out;
  };
  return [...half(sorted), ...half([...sorted].reverse())];
}
export async function checkPropGrounding() {
  const stops = openingStops();
  const rows = stops.map((p) => {
    const foot = boxFootprint(p.x, p.z, p.w, p.d, p.yaw),
      row = measure(p.id, foot, p.base, p.seat);
    if (p.supports.length) {
      let gap = 0;
      for (const id of p.supports) {
        const s = stops.find((s) => s.id === id);
        if (!s) throw new Error(`${p.id}: missing support ${id}`);
        gap = Math.max(
          gap,
          separation(foot, boxFootprint(s.x, s.z, s.w, s.d, s.yaw)),
          p.base - (s.base + s.h),
          s.base - (p.base + p.h),
        );
      }
      row.gapCm = Math.max(0, gap * 100);
      row.sinkCm = Math.max(0, (row.groundMax - p.base) * 100);
      row.failed = row.gapCm > TOLERANCE_CM || row.sinkCm > TOLERANCE_CM;
    }
    return { ...row, supports: p.supports.length ? p.supports : ['terrain'] };
  });
  for (const t of TREE_SOURCES)
    if (!t.cleared)
      rows.push({
        ...measure(`tree/${t.index}`, t.root.footprint, t.root.bottom, t.y + t.root.burial),
        supports: ['terrain (root skirt)'],
      });
  const mat = new THREE.MeshBasicNodeMaterial();
  const models = sourceModule<typeof import('../../src/place/opening-models.ts')>(
    fs.readFileSync('src/place/opening-models.ts', 'utf8'),
    { THREE, H, CRANE, RACK, ORIGIN, WOOD2, flat: () => mat },
  );
  const crane = models.craneModel(),
    rack = models.rackModel();
  for (const [id, group, expected] of [
    ['crane', crane.crane, 1],
    ['rack', rack.rackPosts, 4],
  ] as const) {
    group.updateMatrixWorld(true);
    let n = 0;
    group.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !obj.name.startsWith(id + '/support-')) return;
      const bounds = new THREE.Box3().setFromObject(obj);
      rows.push({
        ...measure(
          `${id}/foot-${n++}`,
          boxFootprint(
            (bounds.min.x + bounds.max.x) / 2,
            (bounds.min.z + bounds.max.z) / 2,
            bounds.max.x - bounds.min.x,
            bounds.max.z - bounds.min.z,
          ),
          bounds.min.y,
          bounds.min.y,
        ),
        supports: ['terrain'],
      });
    });
    if (n !== expected) throw new Error(`${id}: expected ${expected} bearing meshes, found ${n}`);
  }
  // Inspect the shipped rack's decoded post vertices, including node transforms and bevels.
  await MeshoptDecoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read('assets/built/recovery-rack.glb');
  await doc.transform(dequantize());
  const rx = RECOVERY_RACK.x / 100,
    rz = RECOVERY_RACK.z / 100,
    ry = H(rx, rz);
  let recoveryPosts = 0;
  for (const node of doc.getRoot().listNodes()) {
    if (!node.getName().startsWith('post_')) continue;
    recoveryPosts++;
    const matrix = new THREE.Matrix4().fromArray(node.getWorldMatrix()),
      points: THREE.Vector3[] = [];
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const pos = primitive.getAttribute('POSITION');
      if (!pos) continue;
      for (let k = 0; k < pos.getCount(); k++)
        points.push(new THREE.Vector3().fromArray(pos.getArray()!, k * 3).applyMatrix4(matrix));
    }
    const base = Math.min(...points.map((p) => p.y));
    const footprint = hull(points.filter((p) => p.y <= base + 0.05).map((p) => [rx + p.x, rz + p.z]));
    rows.push({
      ...measure('recovery-rack/' + node.getName(), footprint, ry + base, ry + 0.025),
      supports: ['terrain (25 mm bevel)'],
    });
  }
  if (recoveryPosts !== 4) throw new Error(`Recovery rack: expected four bearing posts, found ${recoveryPosts}`);
  // Cove supports are constructed by the production function; omit only terrain and mounted deck boards.
  const shore: THREE.Mesh[] = [];
  let coveUnderside = Infinity;
  const buildLand = sourceFunction<(owner: OwnedView) => void>('src/place/land.ts', 'buildLand', {
    THREE,
    SHORE_COAST,
    SHORE_HOP,
    SHORE_LANDING,
    ORIGIN,
    H,
    boxFootprint,
    sampleFootprint,
    GROUP: { SCENERY: 2 },
    FLAT: () => mat,
    TIMBER: () => mat,
    paletteMaterial: (source: THREE.Material) => source,
    spireRock: (s: string) => s,
    addStatic: () => {},
    plank: (
      _ax: number,
      _az: number,
      _bx: number,
      _bz: number,
      top: number,
      _topB: number,
      _width: number,
      _color: string,
      thick: number,
    ) => {
      coveUnderside = Math.min(coveUnderside, top - thick);
    },
    buildMesh: () => {},
    buildSpire: () => {},
    buildBridges: () => {},
    buildFar: () => {},
  });
  buildLand({ add: (m: THREE.Mesh) => shore.push(m) } as unknown as OwnedView);
  for (const [i, mesh] of shore.entries()) {
    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh),
      pos = mesh.geometry.getAttribute('position');
    const points = Array.from({ length: pos.count }, (_, k) =>
      new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld),
    );
    const footprint = hull(points.filter((p) => p.y <= bounds.min.y + 0.001).map((p) => [p.x, p.z]));
    rows.push({
      ...measure(
        'shore/foot-' + i,
        footprint,
        bounds.min.y,
        mesh.geometry.type === 'BoxGeometry' ? coveUnderside : bounds.min.y,
      ),
      supports: ['terrain'],
    });
  }
  // Run the actual kit placement function against decoded GLB support meshes, without loading rendering services.
  const kit = await io.read('assets/built/place-kit.glb');
  await kit.transform(dequantize());
  const instances: { name: string; matrix: THREE.Matrix4 }[] = [];
  const pict = new THREE.InstancedMesh(new THREE.BoxGeometry(), mat, 64);
  pict.count = 0;
  const stationKit = sourceFunction<(...args: unknown[]) => void>('src/place/look-kit.ts', 'stationKit', {
    THREE,
    // Match the default game's merged steel feeder; ground-contact supports are unchanged.
    LOOK: { mats: true },
    stationViews: () => ({ batches: new Map(), pict }),
    stationM: new THREE.Matrix4(),
    stationPiece: (name: string, _paint: unknown, matrix: THREE.Matrix4) =>
      instances.push({ name, matrix: matrix.clone() }),
    POST: 0,
    AMBER: 0,
    LONG: 0,
    SHORT: 0,
    FLOOR: 0,
    CREAM: 0,
    BED: 0,
    ROLLER: 0,
    DARK: 0,
  });
  for (const link of LINKS)
    for (const spec of link.stations) {
      const f = frameBesideLine(spec, link.line, link.dir),
        g = new THREE.Group();
      g.position.set(f.x, H(f.x, f.z), f.z);
      g.rotation.y = f.yaw;
      const away = f.lx * Math.cos(f.yaw) - f.lz * Math.sin(f.yaw) > 0 ? 1 : -1;
      instances.length = 0;
      stationKit(g, away, FRAME_D, FRAME_W, SPAN);
      for (const [i, instance] of instances.entries()) {
        if (!['frame_post', 'frame_floor', 'feeder_leg'].includes(instance.name)) continue;
        const node = kit
          .getRoot()
          .listNodes()
          .find((n) => n.getName() === instance.name);
        if (!node) throw new Error('Missing kit support ' + instance.name);
        const matrix = instance.matrix.clone().multiply(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
        const points: THREE.Vector3[] = [];
        for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
          const pos = primitive.getAttribute('POSITION')!;
          for (let k = 0; k < pos.getCount(); k++)
            points.push(new THREE.Vector3().fromArray(pos.getArray()!, k * 3).applyMatrix4(matrix));
        }
        const base = Math.min(...points.map((p) => p.y)),
          footprint = hull(points.filter((p) => p.y <= base + 0.035).map((p) => [p.x, p.z]));
        rows.push({
          ...measure(spec.id + '/' + instance.name + '-' + i, footprint, base, base + 0.03),
          supports: ['terrain (kit bevel)'],
        });
      }
    }
  // The river span is deliberately unsupported; each bank must support the full-width end strip. The deck is a chain of
  // planks: only the chain's two outer ends bear on the sand.
  type Strip = { footprint: Footprint; base: number; top: number };
  const chains: { a: Strip; b: Strip; bx: number; bz: number }[][] = [];
  const buildBridges = sourceFunction<(owner: OwnedView) => void>('src/place/land.ts', 'buildBridges', {
    THREE,
    PATHS,
    ORIGIN,
    H,
    SEA,
    BRIDGE: sourceFunction('src/place/land.ts', 'BRIDGE', {}),
    boxFootprint,
    sampleFootprint,
    beam: () => new THREE.Object3D(),
    FLAT: () => mat,
    TIMBER: () => mat,
    GROUP: { SCENERY: 2 },
    addStatic: () => {},
    plank: (
      ax: number,
      az: number,
      bx: number,
      bz: number,
      topA: number,
      topB: number,
      width: number,
      _color: string,
      thick: number,
    ) => {
      const yaw = Math.atan2(bx - ax, bz - az);
      const strip = (x: number, z: number, top: number) => ({
        footprint: boxFootprint(x, z, width, 0.25, yaw),
        base: top - thick,
        top,
      });
      const plank = { a: strip(ax, az, topA), b: strip(bx, bz, topB), bx, bz };
      const prev = chains.at(-1)?.at(-1);
      if (prev && Math.hypot(prev.bx - ax, prev.bz - az) < 1e-6) chains.at(-1)!.push(plank);
      else chains.push([plank]);
    },
  });
  buildBridges({ add: () => {} } as unknown as OwnedView);
  chains.forEach((chain, bridge) => {
    for (const [end, s] of [
      ['a', chain[0]!.a],
      ['b', chain.at(-1)!.b],
    ] as const)
      rows.push({
        ...measure(`bridge/${bridge}/${end}`, s.footprint, s.base, s.top),
        supports: ['terrain (bank bearing)'],
      });
  });
  // The settled reward is also a placed prop. Execute its real seat and mesh builders.
  const P = { x: 0, z: 0, ux: 0, uz: 1 };
  const lateral = sourceFunction('src/entities/railway/line-geometry.ts', 'lateral', { P, ORIGIN });
  const besideLine = sourceFunction<typeof import('../../src/entities/railway/rail-kit.ts').besideLine>(
    'src/entities/railway/line-geometry.ts',
    'besideLine',
    { P, lineAt, lateral },
  );
  const rewardSeat = sourceFunction<typeof import('../../src/entities/railway/reward.ts').rewardSeat>(
    'src/entities/railway/reward.ts',
    'rewardSeat',
    { THREE },
  );
  const crate = merged(T1_CRATE_PARTS);
  crate.computeBoundingBox();
  const bounds = crate.boundingBox!;
  for (const stationIndex of [0, 1] as const) {
    const at = rewardSeat(LINKS[0]!, besideLine, H, railY, OUT, stationIndex);
    rows.push({
      ...measure(
        `reward/T${stationIndex + 1}/settled-crate`,
        boxFootprint(at.x, at.z, bounds.max.x - bounds.min.x, bounds.max.z - bounds.min.z),
        at.y + bounds.min.y,
        at.y,
      ),
      supports: ['terrain'],
    });
  }
  crate.dispose();
  pict.geometry.dispose();
  pict.dispose();
  mat.dispose();
  return rows;
}
