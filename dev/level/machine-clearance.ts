// Source-linked swept clearance for the current production machine; no browser, physics or game state.
import fs from 'node:fs';
import * as THREE from 'three/webgpu';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dequantize } from '@gltf-transform/functions';
import { MeshoptDecoder } from 'meshoptimizer';
import { sourceModule, sourceFunction } from './source.ts';
import {
  AXE_STAND,
  CRANE,
  FORMATION,
  LINKS,
  ORIGIN,
  RACK,
  ROCKS,
  STUB,
  UP_LAT,
  crossLat,
  lineAt,
  pathLamps,
  railY,
  upLat,
} from '../../src/place/layout.ts';
import { openingBuildings, openingStops, forgePlan, WOOD2 } from '../../src/place/opening-plans.ts';
import { frameBesideLine, stationColliders, stationStockCollider, OUT } from '../../src/place/spatial-station.ts';
import { chunkOf } from '../../src/entities/railway/track-chunks.ts';
import { RAILWAY_T1 } from '../../src/sim/railway-layout.ts';
import { LINE1_STATIONS, LINE1_AXE_STAND, LINE1_JUMP_DEVICE } from '../../src/sim/railway-line-layout.ts';
import { H } from '../../src/place/terrain.ts';
import {
  panelPose,
  panelEase,
  trackPanels,
  carriedPiece,
  sleeperStations,
  MAX_PANEL_LENGTH,
} from '../../src/entities/railway/track-panels.ts';
import { TREE_SOURCES } from '../../src/place/tree-sources.ts';
import { RECOVERY_RACK } from '../../src/sim/railway-supply.ts';
import { boxAt, place } from '../../src/render/box-plan.ts';
import { merged } from '../../src/render/part-geometry.ts';
import { T1_CRATE_PARTS } from '../../src/render/t1-reward-parts.ts';
import { PILLARS, PADS, DEVICES, p1LipClear } from '../../src/place/tech-layout.ts';
import { timberDecks } from './timber-track.ts';

export async function checkMachineClearance() {
  const material = () => new THREE.MeshBasicNodeMaterial();
  const panels = sourceModule<typeof import('../../src/entities/railway/machine-panels.ts')>(
    fs.readFileSync('src/entities/railway/machine-panels.ts', 'utf8'),
    { THREE, carriedPiece, panelPose, panelEase },
  );
  const model = sourceModule<typeof import('../../src/entities/railway/machine-model.ts')>(
    fs.readFileSync('src/entities/railway/machine-model.ts', 'utf8'),
    { THREE, material, panelMechanism: panels.panelMechanism },
  );
  await MeshoptDecoder.ready;

  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read('assets/built/track-layer.glb');
  await doc.transform(dequantize());
  const source = new THREE.Group();
  for (const node of doc.getRoot().listNodes())
    for (const primitive of node.getMesh()?.listPrimitives() ?? []) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(primitive.getAttribute('POSITION')!.getArray()!), 3),
      );
      const indices = primitive.getIndices()?.getArray();
      if (indices) geometry.setIndex(Array.from(indices));
      const mesh = new THREE.Mesh(geometry, material());
      mesh.name = node.getName();
      mesh.applyMatrix4(new THREE.Matrix4().fromArray(node.getWorldMatrix()));
      source.add(mesh);
    }
  const stageRail = new THREE.BoxGeometry(0.1, 0.12, 3.05).translate(0, 0.06, 0);
  const assembly = model.machineModel(
    new THREE.Object3D(),
    new THREE.Object3D(),
    new THREE.Object3D(),
    (n) => new THREE.InstancedMesh(stageRail, material(), n),
  );
  assembly.install(source);
  const [power, deck] = assembly.cars.map((body, i) => {
    const frame = new THREE.Group();
    frame.add(body, assembly.runningGear[i]!);
    return frame;
  });
  deck!.add(assembly.chairs);
  const root = new THREE.Group();
  root.add(power!, deck!);
  const rig = assembly.panelRig;
  deck!.add(rig.root);
  const mat = new THREE.Matrix4();
  const unit = new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1, 0.5));
  const obstacles: { id: string; box: THREE.Box3; local: THREE.Box3; inverse: THREE.Matrix4 }[] = [];
  function obstacle(id: string, matrix: THREE.Matrix4) {
    const scale = new THREE.Vector3().setFromMatrixScale(matrix);
    const local = unit.clone();
    local.min.add(new THREE.Vector3(-0.25 / scale.x, -0.25 / scale.y, -0.25 / scale.z));
    local.max.add(new THREE.Vector3(0.25 / scale.x, 0.25 / scale.y, 0.25 / scale.z));
    obstacles.push({ id, box: local.clone().applyMatrix4(matrix), local, inverse: matrix.clone().invert() });
  }
  for (const b of [...openingBuildings(), { id: 'forge', boxes: forgePlan().scaffold }])
    for (const [i, p] of b.boxes.entries()) {
      const m = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).multiply(p.local);
      obstacle(b.id + '/' + i, m);
    }
  for (const p of openingStops())
    obstacle(
      p.id,
      new THREE.Matrix4().compose(
        new THREE.Vector3(p.x, p.base, p.z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw),
        new THREE.Vector3(p.w, p.h, p.d),
      ),
    );
  // Timber and stone decks built from the start (footbridges, the landing, every pad and its column): the machine's own
  // neighbours on the way. Walkways opened later, halts and the approaches are placed after it has passed.
  for (const deck of timberDecks().filter((d) => /^(footbridge|landing|pad)/.test(d.id))) {
    const [hx, hy, hz] = deck.half as [number, number, number];
    const basis = new THREE.Matrix4().makeBasis(deck.axes[0]!, deck.axes[1]!, deck.axes[2]!);
    const base = deck.center.clone().addScaledVector(deck.axes[1]!, -hy);
    obstacle(
      'deck/' + deck.id,
      new THREE.Matrix4()
        .makeTranslation(base.x, base.y, base.z)
        .multiply(basis)
        .multiply(new THREE.Matrix4().makeScale(hx * 2, hy * 2, hz * 2)),
    );
  }
  const roots = sourceModule<typeof import('../../src/render/tree-roots.ts')>(
    fs.readFileSync('src/render/tree-roots.ts', 'utf8'),
    { THREE },
  );
  const treeModule = sourceModule<typeof import('../../src/render/place-tree-view.ts')>(
    fs.readFileSync('src/render/place-tree-view.ts', 'utf8'),
    { THREE, createTreeRoots: roots.createTreeRoots },
  );
  const treeGroup = new THREE.Group();
  const trees = TREE_SOURCES.map((t) => ({
    ...t,
    work: 0,
    issued: 0,
    ceiling: 15,
    revision: 0,
    collapsed: false,
    scuff: false,
    hitAt: 0,
    cutYaw: 0,
    strokes: 0,
    shake: 0,
    fall: -1,
    fallYaw: 0,
    at: new THREE.Vector3(t.x, t.y, t.z),
    body: null,
    stump: null,
  }));
  const treeView = treeModule.createTreeView(trees, treeGroup, H, { flat: material, tree: material }, () => false, 15);
  for (const t of trees) treeView.pose(t, 0);
  function meshObstacle(id: string, mesh: THREE.Mesh, matrix: THREE.Matrix4) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox!;
    const sz = box.getSize(new THREE.Vector3());
    if (Math.min(sz.x, sz.y, sz.z) < 1e-5) return;
    obstacle(
      id,
      matrix
        .clone()
        .multiply(
          new THREE.Matrix4().makeTranslation((box.min.x + box.max.x) / 2, box.min.y, (box.min.z + box.max.z) / 2),
        )
        .scale(sz),
    );
  }
  treeGroup.updateWorldMatrix(true, true);
  let treePart = 0;
  treeGroup.traverse((o) => {
    if (!(o instanceof THREE.InstancedMesh)) return;
    for (let i = 0; i < o.count; i++) {
      o.getMatrixAt(i, mat);
      if (Math.abs(mat.determinant()) < 1e-8) continue;
      meshObstacle('tree/' + treePart + '/' + i, o, mat);
    }
    treePart++;
  });
  const models = sourceModule<typeof import('../../src/place/opening-models.ts')>(
    fs.readFileSync('src/place/opening-models.ts', 'utf8'),
    { THREE, H, CRANE, RACK, ORIGIN, WOOD2, flat: material },
  );
  const crane = models.craneModel();
  crane.jib.rotation.y = Math.PI / 2;
  let yardPart = 0;
  for (const group of [crane.crane, models.rackModel().rackPosts]) {
    group.updateWorldMatrix(true, true);
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) meshObstacle('yard/' + yardPart++, o, o.matrixWorld);
    });
  }
  const recovery = await io.read('assets/built/recovery-rack.glb');
  await recovery.transform(dequantize());
  for (const n of recovery.getRoot().listNodes())
    for (const p of n.getMesh()?.listPrimitives() ?? []) {
      const g = new THREE.BufferGeometry();
      g.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(p.getAttribute('POSITION')!.getArray()!), 3),
      );
      const at = new THREE.Matrix4()
        .makeTranslation(RECOVERY_RACK.x / 100, H(RECOVERY_RACK.x / 100, RECOVERY_RACK.z / 100), RECOVERY_RACK.z / 100)
        .multiply(new THREE.Matrix4().fromArray(n.getWorldMatrix()));
      meshObstacle('recovery/' + n.getName(), new THREE.Mesh(g), at);
    }
  for (const [i, r] of ROCKS.entries())
    obstacle(
      'rock/' + i,
      new THREE.Matrix4()
        .makeTranslation(r.x + ORIGIN.x, H(r.x + ORIGIN.x, r.z), r.z)
        .scale(new THREE.Vector3(r.r * 2.4, r.r * 2, r.r * 2.4)),
    );
  const line = LINKS[0]!;
  const pillar = PILLARS[0]!,
    pad = PADS.find((p) => p.id === 'p1')!,
    device = DEVICES.jump!;
  const base = Math.min(H(pillar.x + ORIGIN.x, pillar.z) - 0.5, pillar.top - 2.2);
  const height = pillar.top - 1.2 - base;
  for (let band = 0; band < 32; band++) {
    const r = pillar.r + 1.4 - (1.8 * band) / 32;
    obstacle(
      'p1/column/' + band,
      new THREE.Matrix4()
        .makeTranslation(pillar.x + ORIGIN.x, base + (height * band) / 32, pillar.z)
        .scale(new THREE.Vector3(r * 2, height / 32, r * 2)),
    );
  }
  obstacle(
    'p1/platform',
    new THREE.Matrix4()
      .makeTranslation(pad.x + ORIGIN.x, pad.top - 1.2, pad.z)
      .scale(new THREE.Vector3(pad.hx * 2, 1.2, pad.hz * 2)),
  );
  let lipPlaced = false;
  function placeLip() {
    if (!pillar.lipTo || lipPlaced) return;
    lipPlaced = true;
    const dx = pillar.lipTo.x - pillar.x,
      dz = pillar.lipTo.z - pillar.z;
    obstacle(
      'p1/lip',
      new THREE.Matrix4().compose(
        new THREE.Vector3(pillar.x + dx / 2 + ORIGIN.x, pillar.top - 0.54, pillar.z + dz / 2),
        new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, Math.atan2(dx, dz)),
        new THREE.Vector3(2.4, 0.5, Math.hypot(dx, dz)),
      ),
    );
  }
  obstacle(
    'p1/device',
    new THREE.Matrix4()
      .makeTranslation(device.x + ORIGIN.x, device.y, device.z)
      .scale(new THREE.Vector3(1.6, 1.7, 1.6)),
  );
  if (
    LINE1_JUMP_DEVICE.x !== Math.round((device.x + ORIGIN.x) * 100) ||
    LINE1_JUMP_DEVICE.z !== Math.round(device.z * 100)
  )
    throw new Error('Jump-device authority anchor disagrees with its visible drum');
  for (const spec of line.stations) {
    const frame = frameBesideLine(spec, line.line, line.dir);
    const pinned = LINE1_STATIONS.find((s) => s.id === spec.id)!;
    if (pinned.x !== Math.round(frame.x * 100) || pinned.z !== Math.round(frame.z * 100))
      throw new Error(spec.id + ': authoritative station anchor disagrees with the visible frame');
  }
  if (RAILWAY_T1.x !== LINE1_STATIONS[0]!.x || RAILWAY_T1.z !== LINE1_STATIONS[0]!.z)
    throw new Error('T1 authority anchors disagree');
  const axeX = AXE_STAND.x + ORIGIN.x,
    axeZ = AXE_STAND.z;
  if (LINE1_AXE_STAND.x !== Math.round(axeX * 100) || LINE1_AXE_STAND.z !== Math.round(axeZ * 100))
    throw new Error('Axe authority anchor disagrees with the stand');
  obstacle(
    'axe-stand',
    new THREE.Matrix4().makeTranslation(axeX, H(axeX, axeZ), axeZ).scale(new THREE.Vector3(2.2, 0.7, 2.2)),
  );
  const seatPoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const besideLine = sourceFunction<typeof import('../../src/entities/railway/rail-kit.ts').besideLine>(
    'src/entities/railway/line-geometry.ts',
    'besideLine',
    {
      P: seatPoint,
      lineAt,
      lateral: sourceFunction('src/entities/railway/line-geometry.ts', 'lateral', { P: seatPoint, ORIGIN }),
    },
  );
  const rewardSeat = sourceFunction<typeof import('../../src/entities/railway/reward.ts').rewardSeat>(
    'src/entities/railway/reward.ts',
    'rewardSeat',
    { THREE },
  );
  const crate = new THREE.Mesh(merged(T1_CRATE_PARTS), material());
  for (const index of [0, 1] as const) {
    const at = rewardSeat(line, besideLine, H, railY, OUT, index);
    meshObstacle(`T${index + 1}/reward-crate`, crate, new THREE.Matrix4().makeTranslation(at.x, at.y, at.z));
  }

  for (const spec of line.stations) {
    const f = frameBesideLine(spec, line.line, line.dir);
    const y = H(f.x, f.z);
    const c = stationColliders(f, y, false);
    for (const p of [...c.frame, c.feeder, stationStockCollider(f, y, y + 3)])
      obstacle(
        spec.id + '/' + p.id,
        new THREE.Matrix4().compose(
          new THREE.Vector3(p.position.x, p.position.y - p.shape.hy, p.position.z),
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.yaw),
          new THREE.Vector3(p.shape.hx * 2, p.shape.hy * 2, p.shape.hz * 2),
        ),
      );
  }
  const P = { x: 0, z: 0, ux: 0, uz: 0 },
    Q = { ...P };
  function poseCar(root: THREE.Object3D, s: number) {
    lineAt(line.line, s + 1.1, P);
    lineAt(line.line, s - 1.1, Q);
    root.position.set(
      (P.x + Q.x) / 2 + ORIGIN.x,
      (railY(line.line, s + 1.1) + railY(line.line, s - 1.1)) / 2,
      (P.z + Q.z) / 2 + ORIGIN.z,
    );
    root.rotation.set(0, Math.atan2(Q.x - P.x, Q.z - P.z), 0);
    const pitch = Math.atan2(railY(line.line, s + 1.1) - railY(line.line, s - 1.1), 2.2);
    root.children[0]!.rotation.x = pitch;
    assembly.runningGear[root === deck ? 1 : 0]!.children[0]!.rotation.x = pitch;
  }
  const failures = new Map<string, { label: string; mesh: string; obstacle: string }>();
  let count = 0;
  let sweptSamples = 0,
    largestJump = 0;
  const prior = new Map<string, THREE.Matrix4>();
  const triangle = new THREE.Triangle(),
    bounds = new THREE.Box3(),
    rel = new THREE.Matrix4();
  const beforePos = new THREE.Vector3(),
    afterPos = new THREE.Vector3(),
    beforeScale = new THREE.Vector3(),
    afterScale = new THREE.Vector3(),
    beforeRot = new THREE.Quaternion(),
    afterRot = new THREE.Quaternion();
  const sweepMatrix = new THREE.Matrix4(),
    sweepPos = new THREE.Vector3(),
    sweepScale = new THREE.Vector3(),
    sweepRot = new THREE.Quaternion();
  let acceptedPanels = 0;
  let lipOpenedAt = '';
  function inspect(label: string) {
    if (!lipPlaced && p1LipClear(acceptedPanels, deck!.position.z)) {
      placeLip();
      lipOpenedAt = label;
    }
    count++;
    root.updateWorldMatrix(true, true);
    const seen = new Set<string>();
    const nearby = obstacles.filter((o) => o.box.distanceToPoint(deck!.position) < 25);
    function inspectMesh(o: THREE.Mesh, current: THREE.Matrix4, id: string) {
      seen.add(id);
      const geometry = o.geometry;
      geometry.computeBoundingBox();
      const old = prior.get(id) ?? current;
      old.decompose(beforePos, beforeRot, beforeScale);
      current.decompose(afterPos, afterRot, afterScale);
      const radius = Math.max(geometry.boundingBox!.min.length(), geometry.boundingBox!.max.length());
      const bound =
        beforePos.distanceTo(afterPos) +
        radius *
          (Math.max(beforeScale.length(), afterScale.length()) * beforeRot.angleTo(afterRot) +
            beforeScale.distanceTo(afterScale));
      largestJump = Math.max(largestJump, bound);
      const steps = Math.max(1, Math.ceil(bound / 0.1));
      // The translation/rotation/scale arc bound covers the interval, including a quiet
      // restore or station transition. The 25 cm obstacle envelope exceeds each 10 cm step.
      for (let step = 1; step <= steps; step++) {
        const t = step / steps;
        sweepMatrix.compose(
          sweepPos.lerpVectors(beforePos, afterPos, t),
          sweepRot.slerpQuaternions(beforeRot, afterRot, t),
          sweepScale.lerpVectors(beforeScale, afterScale, t),
        );
        sweptSamples++;
        bounds.copy(geometry.boundingBox!).applyMatrix4(sweepMatrix);
        if (Math.max(bounds.min.distanceTo(deck!.position), bounds.max.distanceTo(deck!.position)) > 24.5)
          throw new Error('Machine outgrew its 25 m clearance broad phase');
        for (const ob of nearby) {
          if (!bounds.intersectsBox(ob.box)) continue;
          const key = o.name + ' / ' + ob.id;
          if (failures.has(key)) continue;
          rel.multiplyMatrices(ob.inverse, sweepMatrix);
          const pos = geometry.getAttribute('position'),
            idx = geometry.index;
          for (let i = 0; i < (idx?.count ?? pos.count); i += 3) {
            for (const [v, k] of [
              [triangle.a, 0],
              [triangle.b, 1],
              [triangle.c, 2],
            ] as const)
              v.fromBufferAttribute(pos, idx ? idx.getX(i + k) : i + k).applyMatrix4(rel);
            if (ob.local.intersectsTriangle(triangle)) {
              failures.set(key, { label, mesh: o.name, obstacle: ob.id });
              break;
            }
          }
        }
      }
      prior.set(id, current.clone());
    }
    root.traverseVisible((o) => {
      if (!(o instanceof THREE.Mesh) || !o.visible) return;
      if (o instanceof THREE.InstancedMesh) {
        for (let i = 0; i < o.count; i++) {
          const m = new THREE.Matrix4();
          o.getMatrixAt(i, m);
          inspectMesh(o, m.premultiply(o.matrixWorld), o.uuid + '/' + i);
        }
      } else inspectMesh(o, o.matrixWorld, o.uuid);
    });
    for (const id of prior.keys()) if (!seen.has(id)) prior.delete(id);
  }
  const trackPoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const trackFile = 'src/entities/railway/track.ts';
  const buildTrack = sourceFunction<typeof import('../../src/entities/railway/rail-kit.ts').buildTrack>(
    trackFile,
    'buildTrack',
    {
      THREE,
      P: trackPoint,
      ORIGIN,
      lateral: sourceFunction('src/entities/railway/line-geometry.ts', 'lateral', { P: trackPoint, ORIGIN }),
      STUB,
      lineAt,
      railY,
      H,
      place,
      trackPanels,
      carriedPiece,
      sleeperStations,
      chunkOf,
      TOP: sourceFunction(trackFile, 'TOP', {}),
      DECK_W: sourceFunction(trackFile, 'DECK_W', {}),
      BED_W: sourceFunction(trackFile, 'BED_W', {}),
      FORMATION,
      UP_LAT,
      upLat,
      crossLat,
      box: sourceFunction('src/render/boxes.ts', 'box', { boxAt, groundHeight: H }),
      dropSet: () => ({}),
      lookTrack: () => ({}),
    },
  );
  // dropSet and lookTrack are stubbed, so the track asks its owner only to run cleanups later; none run here.
  const noOwner = { cleanup() {}, removeBody() {} } as unknown as import('../../src/render/owned-view.ts').OwnedView;
  const track = buildTrack(line, () => {}, noOwner);
  const schedule = trackPanels(line),
    seat = new THREE.Vector3(),
    dir = new THREE.Vector3(),
    start = new THREE.Vector3(),
    toRig = new THREE.Matrix4();
  // The magazine holds a rail pair per track a panel lays (two where the up track runs).
  const pairsOf = schedule.map((_, k) => track.pairs(k));
  const lengths = schedule.flatMap((p, k) => Array<number>(pairsOf[k]!).fill(p.to - p.from));
  const pairsFrom = (index: number) => pairsOf.slice(index).reduce((n, k) => n + k, 0);
  const upSeat = new THREE.Vector3(),
    upDir = new THREE.Vector3();
  function at(s: number) {
    poseCar(deck!, s);
    poseCar(power!, s + model.MACHINE_GAP);
    assembly.update(0);
    root.updateWorldMatrix(true, true);
  }
  // The trolley's farthest run from the beam pivot, rig frame: the beam must reach it with the trolley's half length.
  let reach = 0,
    reachAt = '';
  const measureReach = (label: string) => {
    const r = Math.hypot(rig.trolley.position.x, rig.trolley.position.z);
    if (r > reach) [reach, reachAt] = [r, label];
  };
  const pairs = pairsFrom(0);
  at(line.stations[0]!.s + 2.4);
  rig.drawStack(pairs, lengths, false);
  rig.home(1, pairs);
  inspect('parked start');
  for (const [index, panel] of schedule.entries()) {
    acceptedPanels = schedule.slice(0, index).reduce((units, p) => units + p.stock, 0);
    const stage = line.stations[panel.stage]!;
    // The real stack and carried rail pair; falling track pieces are the track's own and are excluded.
    rig.drawStack(pairsFrom(index), lengths.slice(pairs - pairsFrom(index)), pairsOf[index]!);
    for (let step = 0; step <= 1000; step++) {
      const phase = step / 1000,
        head = line.line.len - (panel.from + (panel.to - panel.from) * phase),
        setback = Math.min(MAX_PANEL_LENGTH + 2.4, 2.4 + stage.s - head);
      at(head + setback);
      toRig.copy(rig.root.matrixWorld).invert();
      track.seat(index, seat, dir);
      seat.applyMatrix4(toRig);
      dir.transformDirection(toRig);
      track.panelStart(index, start).applyMatrix4(toRig);
      const up = track.seatUp(index, upSeat, upDir);
      if (up) {
        upSeat.applyMatrix4(toRig);
        upDir.transformDirection(toRig);
      }
      rig.pose(
        phase,
        pairsFrom(index),
        seat,
        Math.atan2(dir.x, dir.z),
        Math.asin(Math.max(-1, Math.min(1, dir.y))),
        start,
        track.carriedLength(index),
        up
          ? {
              seat: upSeat,
              yaw: Math.atan2(upDir.x, upDir.z),
              pitch: Math.asin(Math.max(-1, Math.min(1, upDir.y))),
            }
          : null,
      );
      inspect('panel ' + index + ' phase ' + phase);
      measureReach('panel ' + index + ' phase ' + phase);
    }
    rig.drawStack(pairsFrom(index + 1), lengths.slice(pairs - pairsFrom(index + 1)), false);
    if (index === schedule.length - 1 || schedule[index + 1]!.stage !== panel.stage) {
      if (index === schedule.length - 1) {
        // Production path.ts enables these only after T3, behind the already passed machine.
        for (const { s, l } of pathLamps((s) => upLat(FORMATION.timber, s) ?? 0)) {
          const at = besideLine(line.line, s, l);
          obstacle(
            `path-lamp/${s}/${l}`,
            new THREE.Matrix4()
              .makeTranslation(at.x, railY(line.line, s), at.z)
              .scale(new THREE.Vector3(0.26, 1.68, 0.26)),
          );
        }
      }
      const head = panel.end;
      const start = head + MAX_PANEL_LENGTH + 2.4;
      for (let k = 0; k <= 1500; k++) {
        const t = k / 500;
        at(Math.max(head + 2.4, start - t * 5));
        rig.home(Math.min(1, t / 0.65), pairsFrom(index + 1));
        inspect('return ' + index + ' ' + k);
        measureReach('return ' + index + ' ' + k);
      }
    }
  }
  for (let s = 32.4; s >= 21.4; s -= 0.01) {
    at(s);
    rig.home(1, 0);
    inspect('village park ' + s);
  }
  if (!lipPlaced) throw new Error('The completed line did not open its jump-pillar walkway');
  // The built beam must be the source constant and reach every trolley position with the trolley's 0.35 m half length.
  const beamMesh = rig.beam.getObjectByName('lay_gantry_beam') as THREE.Mesh | undefined;
  if (!beamMesh) throw new Error('track-layer.glb has no lay_gantry_beam');
  beamMesh.geometry.computeBoundingBox();
  const beamBox = beamMesh.geometry.boundingBox!.clone().applyMatrix4(beamMesh.matrix);
  const beamLength = beamBox.max.z - Math.max(0, beamBox.min.z);
  if (Math.abs(beamLength - panels.PANEL_BEAM_LENGTH) > 0.02)
    throw new Error(`Built beam is ${beamLength.toFixed(2)} m; machine-panels says ${panels.PANEL_BEAM_LENGTH} m`);
  if (reach + 0.35 > panels.PANEL_BEAM_LENGTH)
    throw new Error(
      `The trolley runs ${reach.toFixed(2)} m out (${reachAt}), past the ${panels.PANEL_BEAM_LENGTH} m beam`,
    );
  return {
    level: 'machine-clearance',
    samples: count,
    sweptSamples,
    largestTransformStepMetres: largestJump,
    clearanceMetres: 0.25,
    maximumSweepStepMetres: 0.1,
    obstacles: obstacles.length,
    lipOpenedAt,
    beamMetres: panels.PANEL_BEAM_LENGTH,
    trolleyReachMetres: Math.round(reach * 1000) / 1000,
    trolleyReachAt: reachAt,
    railPairs: pairs,
    failures: failures.size,
    contacts: [...failures.values()],
    coverage:
      'Current production T1-T3 route, parked/working/return/village approach; decoded rigid machine with source-driven wheels/rods, the rail stack, the carried rail pair and the slewing beam against authored buildings, stations/full stock, reward crates, standing trees, rocks, recovery rack, yard props, opening stops, the jump pillar/device and construction-derived lip and path lamps. Local 0.001-phase sampling plus bounded rigid interpolation and a 25 cm envelope. Dynamic players, dropped cargo and falling trees are excluded.',
  };
}
