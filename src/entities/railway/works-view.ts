// Split-rock Works, live from accepted state: the throat seam opens on a strike, the kiln fills and lights, and every
// cast slides a footing down the roller road to the halt rack. Local view: topples, fire and flights play on the press
// (your own predicted kiln fill), on accepted events and on live edges, and snap without a show on restore.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway-session.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { Body } from '../../physics/engine.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { heldId } from '../../player/inventory.ts';
import { chuff, clank, thump } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { emit } from '../../render/particles.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { readableGlow, readableIntensity } from '../../render/readable-unlit.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import { playSharedMoment } from './shared-moment.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
import { reducedMotion } from '../../constants.ts';
import { goldMote } from './breaker-view.ts';
import { WORKS, WORKS_KILN, WORKS_RACK, WORKS_ROCKS, WORKS_SEAMS } from '../../sim/railway-works-layout.ts';
import { account, beam as beamRow, boiler, rock, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';
import { SEAM_THROAT } from '../../sim/railway-works.ts';
import { paintTwoLines, signBoard } from '../../render/sign-board.ts';
import { LINE_HALTS } from '../../sim/railway-train.ts';
import { onlyALoadIn, setDownThen } from './back-down.ts';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { SPLIT_ROCK_BOXES, THROAT_SLAB, ROLLER_ROAD, beam, box, type WorksBox } from './works-shape.ts';
import { drawWorksBoxes, createBoxBatch, createLater, footingFrame, footingParts } from './works-box-view.ts';

/** Seconds a cast footing takes down the roller road, and its hop onto the rack. */
const ROLL_S = 4,
  HOP_S = 0.45;
/** The throat slabs: tipping into the bowl, then sinking into rubble. */
const TOPPLE = { stagger: [0.08, 0, 0.14], fall: 0.95, sink: 1.2, rest: 0.9 } as const;
/** The stations' bill look (src/entities/railway/stations.ts). */
const BILL_LOOK = { ground: '#fff3d6', ink: '#2a1c10', rim: '#2a1c10' };

export async function createRailwayWorks(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: {
    contactIn: (id: number) => number;
    seated: () => boolean;
    busy: () => boolean;
  },
) {
  const { H, addStatic } = await import('../../place/land.ts');
  const kiln = { x: WORKS_KILN.x / 100, z: WORKS_KILN.z / 100 },
    rack = { x: WORKS_RACK.x / 100, z: WORKS_RACK.z / 100 };
  const throat = { x: WORKS_SEAMS[1].x / 100, z: WORKS_SEAMS[1].z / 100 };
  // The kiln's working face looks back down the cut toward the halt.
  const face = { x: throat.x - kiln.x, z: throat.z - kiln.z };
  {
    const n = Math.hypot(face.x, face.z);
    face.x /= n;
    face.z /= n;
  }
  const across = { x: -face.z, z: face.x },
    faceYaw = Math.atan2(face.x, face.z);
  const kilnGround = H(kiln.x + face.x * 3, kiln.z + face.z * 3);
  const at = (along: number, side: number) => ({
    x: kiln.x + face.x * along + across.x * side,
    z: kiln.z + face.z * along + across.z * side,
  });
  const boxes: WorksBox[] = [
    ...SPLIT_ROCK_BOXES,
    { ...box(kiln.x, 26.6, kiln.z, 5, 5, 3, -Math.PI / 4), colour: '#716d67' },
    { ...box(kiln.x + 1.5, 30, kiln.z - 1.5, 1.4, 9, 1.4), colour: '#595958' },
  ];
  // The loading frame on the kiln's face: two posts and a beam over a log cradle and a stone hopper.
  for (const side of [-2.4, 2.4]) {
    const p = at(2.9, side);
    boxes.push({ ...box(p.x, kilnGround + 1.5, p.z, 0.3, 3, 0.3, faceYaw), colour: '#6b5238' });
  }
  {
    // A sooty arch round the firing mouth, so the glow sits in a hole rather than on the wall.
    const m = at(2.53, 0);
    boxes.push({ ...box(m.x, kilnGround + 1, m.z, 2.3, 1.9, 0.12, faceYaw), colour: '#2c2825', solid: false });
    const p = at(2.9, 0);
    boxes.push({ ...box(p.x, kilnGround + 3.1, p.z, 5.2, 0.3, 0.32, faceYaw), colour: '#6b5238' });
    const c = at(3.5, 1.5);
    boxes.push({ ...box(c.x, kilnGround + 0.15, c.z, 1.6, 0.3, 1.5, faceYaw), colour: '#5d4630', solid: false });
    const h = at(3.5, -1.5);
    for (const [dx, dz, w, d] of [
      [0, -0.7, 1.5, 0.12],
      [0, 0.7, 1.5, 0.12],
      [-0.7, 0, 0.12, 1.5],
      [0.7, 0, 0.12, 1.5],
    ] as const) {
      const q = { x: h.x + across.x * dx + face.x * dz, z: h.z + across.z * dx + face.z * dz };
      boxes.push({ ...box(q.x, kilnGround + 0.45, q.z, w, 0.9, d, faceYaw), colour: '#55524a', solid: false });
    }
  }
  for (let i = 1; i < ROLLER_ROAD.length; i++) {
    const a = ROLLER_ROAD[i - 1]!,
      b = ROLLER_ROAD[i]!;
    const n = Math.ceil(Math.hypot(a.x - b.x, a.z - b.z) / 1.5);
    for (let j = 0; j < n; j++) {
      const p = { x: a.x + ((b.x - a.x) * j) / n, z: a.z + ((b.z - a.z) * j) / n };
      boxes.push({
        ...box(p.x, H(p.x, p.z) + 0.15, p.z, 2, 0.18, 0.32, Math.atan2(b.x - a.x, b.z - a.z)),
        colour: '#676963',
        solid: false,
      });
    }
    boxes.push({ ...beam(a, b, (H(a.x, a.z) + H(b.x, b.z)) / 2 + 0.12, 0.16, 0.2), colour: '#79766a', solid: false });
  }
  // The halt rack: a deck for six footings, three by two, and the broken sample beside it so the shape reads early.
  const rackY = H(rack.x, rack.z);
  const rackYaw = Math.atan2(
    ROLLER_ROAD.at(-1)!.x - ROLLER_ROAD.at(-2)!.x,
    ROLLER_ROAD.at(-1)!.z - ROLLER_ROAD.at(-2)!.z,
  );
  const rackAxis = { x: Math.sin(rackYaw), z: Math.cos(rackYaw) },
    rackSide = { x: rackAxis.z, z: -rackAxis.x };
  boxes.push({ ...box(rack.x, rackY + 0.2, rack.z, 4.2, 0.4, 3, rackYaw + Math.PI / 2), colour: '#68665e' });
  const sample = { x: rack.x + rackSide.x * 3.2, z: rack.z + rackSide.z * 3.2 };
  const sampleY = H(sample.x, sample.z);
  boxes.push(
    { ...box(sample.x - 0.3, sampleY + 0.55, sample.z, 0.6, 1.1, 1.2), colour: '#bdb6a6' },
    { ...box(sample.x + 0.3, sampleY + 0.35, sample.z, 0.6, 0.7, 1.2), colour: '#bdb6a6' },
  );
  await drawWorksBoxes(owner, boxes);
  const slotAt = (k: number, out: THREE.Vector3) => {
    const layer = Math.floor(k / 6),
      i = k % 6;
    const u = (i % 3) - 1,
      v = Math.floor(i / 3) - 0.5;
    return out.set(
      rack.x + rackSide.x * u * 1.35 + rackAxis.x * v * 1.35,
      rackY + 0.4 + layer * 0.95,
      rack.z + rackSide.z * u * 1.35 + rackAxis.z * v * 1.35,
    );
  };
  // The road's length table: footings ride it at a steady roll.
  const road = ROLLER_ROAD.map((p) => ({ ...p, y: H(p.x, p.z) + 0.3 }));
  const legs: number[] = [0];
  for (let i = 1; i < road.length; i++)
    legs.push(legs[i - 1]! + Math.hypot(road[i]!.x - road[i - 1]!.x, road[i]!.z - road[i - 1]!.z));
  const roadLength = legs.at(-1)!;
  function along(d: number, out: THREE.Vector3) {
    let i = 1;
    while (i < road.length - 1 && legs[i]! < d) i++;
    const a = road[i - 1]!,
      b = road[i]!;
    const u = Math.min(1, Math.max(0, (d - legs[i - 1]!) / (legs[i]! - legs[i - 1]! || 1)));
    out.set(a.x + (b.x - a.x) * u, 0, a.z + (b.z - a.z) * u);
    out.y = H(out.x, out.z) + 0.3;
    return Math.atan2(b.x - a.x, b.z - a.z);
  }

  // ---------------------------------------------------------------- moving parts: one draw
  const batch = createBoxBatch(owner, 320);

  // The trodden path and its fingerpost (designer, 9 November: the halt can't show the kiln, so send you 21 m up the
  // roller road, where the cut frames it). From the quarry halt's platform end by the rack, beside the road, to the
  // throat floor; shown once the breaker is taken (part 2: so a player who strikes the stall first is sent up the road
  // to the throat too). Paler than the track's dirt, no collider: no route changes.
  const halt = LINE_HALTS.find((h) => h.name === 'Quarry')!,
    haltAt = { x: halt.x / 100, z: halt.z / 100 };
  const pathSegments: { x: number; y: number; z: number; length: number; yaw: number; pitch: number }[] = [];
  const post = { x: 0, z: 0, yaw: 0 };
  /** The path's last leg (its last two points) and the side of the rollers it runs on. */
  const tail = { end: { x: 0, z: 0 }, before: { x: 0, z: 0 }, side: 1 };
  {
    const line = [...ROLLER_ROAD].reverse(); // rack, …, throat
    const normal = (a: { x: number; z: number }, b: { x: number; z: number }) => {
      const n = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return { x: -(b.z - a.z) / n, z: (b.x - a.x) / n };
    };
    // Beside the rollers on the halt's side of the first leg, mitred round each bend.
    const n0 = normal(line[0]!, line[1]!);
    const side = n0.x * (haltAt.x - line[0]!.x) + n0.z * (haltAt.z - line[0]!.z) > 0 ? 1.9 : -1.9;
    const offset = line.map((p, i) => {
      const a = normal(line[Math.max(0, i - 1)]!, line[Math.max(1, i)]!),
        b = normal(line[Math.min(i, line.length - 2)]!, line[Math.min(i + 1, line.length - 1)]!);
      const m = { x: a.x + b.x, z: a.z + b.z },
        k = (a.x * m.x + a.z * m.z) / (m.x * m.x + m.z * m.z || 1);
      return { x: p.x + m.x * k * side, z: p.z + m.z * k * side };
    });
    // It starts under the platform's edge, 4 m out from the halt toward the rack.
    const d = Math.hypot(offset[0]!.x - haltAt.x, offset[0]!.z - haltAt.z);
    const start = {
      x: haltAt.x + ((offset[0]!.x - haltAt.x) * 4) / d,
      z: haltAt.z + ((offset[0]!.z - haltAt.z) * 4) / d,
    };
    const points = [start, ...offset];
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!,
        b = points[i]!,
        n = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1.5);
      for (let j = 0; j < n; j++) {
        const u0 = j / n,
          u1 = (j + 1) / n;
        const x0 = a.x + (b.x - a.x) * u0,
          z0 = a.z + (b.z - a.z) * u0,
          x1 = a.x + (b.x - a.x) * u1,
          z1 = a.z + (b.z - a.z) * u1;
        const y0 = H(x0, z0),
          y1 = H(x1, z1),
          length = Math.hypot(x1 - x0, z1 - z0);
        pathSegments.push({
          x: (x0 + x1) / 2,
          y: (y0 + y1) / 2 + 0.03,
          z: (z0 + z1) / 2,
          length: length + 0.12,
          yaw: Math.atan2(x1 - x0, z1 - z0),
          pitch: -Math.atan2(y1 - y0, length),
        });
      }
    }
    tail.end = offset[offset.length - 1]!;
    tail.before = offset[offset.length - 2]!;
    tail.side = Math.sign(side);
    // The post stands just off the path where it leaves the platform, its arm pointing up the road.
    const out = normal(start, offset[0]!);
    post.x = offset[0]!.x + out.x * Math.sign(side) * 1.3;
    post.z = offset[0]!.z + out.z * Math.sign(side) * 1.3;
    post.yaw = Math.atan2(-(offset[1]!.z - offset[0]!.z), offset[1]!.x - offset[0]!.x);
  }
  const { paintBoard } = await import('../../place/signs.ts');
  const postY = H(post.x, post.z);
  const signMat = paintBoard([{ t: 'Kiln', px: 190 }], 1.2, 0.34);
  const front = new THREE.PlaneGeometry(1.2, 0.34),
    behind = new THREE.PlaneGeometry(1.2, 0.34).rotateY(Math.PI);
  const signGeo = mergeGeometries([front.translate(0, 0, 0.03), behind.translate(0, 0, -0.03)])!;
  front.dispose();
  behind.dispose();
  const sign = new THREE.Mesh(signGeo, signMat);
  signGeo.dispose();
  sign.castShadow = true;
  sign.position.set(post.x + Math.cos(post.yaw) * 0.62, postY + 2.25, post.z - Math.sin(post.yaw) * 0.62);
  sign.rotation.y = post.yaw;
  sign.visible = false;
  owner.add(sign);
  owner.cleanup(() => {
    signMat.map?.dispose();
    signMat.dispose();
  });
  // The kiln's bill (part 2, beat 8): the stations' own format, from the throat strike until the kiln lights, at the
  // throat's halt-side mouth beside the path's last leg (never on it), facing down the path. No collider or shadow.
  const bill = signBoard(owner, { w: 1.6, h: 0.8, px: 384, foot: 1.5, posts: 'two' });
  {
    const { end, before } = tail;
    const dir = { x: end.x - before.x, z: end.z - before.z },
      n = Math.hypot(dir.x, dir.z) || 1;
    dir.x /= n;
    dir.z /= n;
    // Back from the path's end toward the halt, then out to the side away from the rollers.
    const side = { x: -dir.z * tail.side, z: dir.x * tail.side };
    const x = end.x - dir.x * 4 + side.x * 2.4,
      z = end.z - dir.z * 4 + side.z * 2.4;
    bill.mesh.position.set(x, H(x, z) - 0.05, z);
    bill.mesh.rotation.y = Math.atan2(-dir.x, -dir.z);
  }
  bill.mesh.visible = false;
  let billPainted = '';
  function drawBill(on: boolean) {
    bill.mesh.visible = on;
    if (!on) return;
    const k = worksRow(wd);
    const small = `logs ${Math.min(k.logs, WORKS.kilnLogs)}/${WORKS.kilnLogs}  stone ${Math.min(k.stone, WORKS.kilnStone)}/${WORKS.kilnStone}`;
    if (small === billPainted) return;
    billPainted = small;
    paintTwoLines(bill, 'Kiln', small, BILL_LOOK);
    bill.painted();
  }
  function drawPath() {
    for (const s of pathSegments) batch.box(s.x, s.y, s.z, 1.6, 0.04, s.length, '#efdcb0', s.yaw, s.pitch);
    batch.box(post.x, postY + 1.2, post.z, 0.14, 2.6, 0.14, '#7f5630');
    // The arm's backing board, a hair behind the painted faces.
    batch.box(sign.position.x, sign.position.y, sign.position.z, 1.26, 0.4, 0.04, '#7f5630', post.yaw);
  }
  const glowMat = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#2a1206', emissive: '#ff6a10', emissiveIntensity: 1.7 }),
  );
  const mouthGeo = new THREE.BoxGeometry(1.5, 1.1, 0.04);
  const mouth = new THREE.Mesh(mouthGeo, glowMat);
  mouthGeo.dispose();
  {
    const p = at(2.61, 0);
    mouth.position.set(p.x, kilnGround + 0.9, p.z);
    mouth.rotation.y = faceYaw;
  }
  mouth.visible = false;
  owner.add(mouth);
  owner.cleanup(() => glowMat.dispose());
  const throatCamera = createCameraPullOut(deps.busy, true, deps.seated);
  const later = createLater();
  owner.cleanup(() => throatCamera.dispose());

  // The rows, re-read at the head of each entry (update, accepted, snap, targets): a refill swaps the world.
  let wd: ReadWorld = adapter.read.world();
  let slabBodies: Body[] = [];
  let open = false,
    topple = -1, // seconds into the throat's topple, -1 when none plays
    toppleDelay = 0,
    landed = 0,
    litShown = false,
    flare = 0,
    smoke = 0,
    fire = 0,
    poured = -1;
  const flights: { t: number }[] = [];
  const m = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    pivot = new THREE.Matrix4(),
    rot = new THREE.Matrix4(),
    back = new THREE.Matrix4(),
    local = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    normal = new THREE.Vector3(1, 0, 1).normalize(),
    edge = new THREE.Vector3(1, 0, -1).normalize();
  const flame = new THREE.Color('#ff7a1c'),
    ember = new THREE.Color('#ffb14a'),
    ash = new THREE.Color('#d9d4cb'),
    dust = new THREE.Color('#cfc6b3');

  function solid(shut: boolean) {
    if (!shut) {
      for (const body of slabBodies) owner.removeBody(body);
      slabBodies = [];
      return;
    }
    if (slabBodies.length) return;
    slabBodies = THROAT_SLAB.map((b) =>
      addStatic(
        { kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 },
        { x: b.x, y: b.y, z: b.z },
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw).clone(),
        undefined,
        owner,
      ),
    );
  }
  /** A throat slab's pose at `t` seconds into its topple (falling into the bowl about its inner foot, then sinking). */
  function slabPose(k: number, t: number) {
    const b = THROAT_SLAB[k]!;
    const u = Math.min(1, Math.max(0, (t - TOPPLE.stagger[k]!) / TOPPLE.fall));
    const angle = (Math.PI / 2) * u * u; // gravity: slow to start, fast to land
    const sink = Math.max(0, t - TOPPLE.stagger[k]! - TOPPLE.fall - TOPPLE.rest) / TOPPLE.sink;
    const foot = new THREE.Vector3(b.x, b.y - b.h / 2, b.z).addScaledVector(normal, b.d / 2);
    pivot.makeTranslation(foot.x, foot.y - Math.min(1, sink) * 1.4, foot.z);
    rot.makeRotationAxis(edge, angle);
    back.makeTranslation(-foot.x, -foot.y, -foot.z);
    local.compose(p.set(b.x, b.y, b.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw), s.set(b.w, b.h, b.d));
    return { matrix: m.copy(pivot).multiply(rot).multiply(back).multiply(local), u, gone: sink >= 1 };
  }
  function drawSlabs(dt: number) {
    if (topple >= 0) {
      if (toppleDelay > 0) toppleDelay = Math.max(0, toppleDelay - dt);
      else topple += dt;
      let all = true;
      THROAT_SLAB.forEach((b, k) => {
        const before = topple - dt;
        const pose = slabPose(k, topple);
        if (!pose.gone) {
          all = false;
          batch.matrix(pose.matrix, '#a49d8e');
        }
        const landAt = TOPPLE.stagger[k]! + TOPPLE.fall;
        if (before < landAt && topple >= landAt) {
          landed++;
          const c = new THREE.Vector3(b.x, b.y - b.h / 2, b.z).addScaledVector(normal, b.h / 2);
          thump(c.x, c.z);
          dustRing(c.x, H(c.x, c.z) + 0.1, c.z, 16, 3.4, 0.6);
          if (landed === 1) placeSound('treeLand', c.x, c.z);
        }
      });
      if (all) topple = -1;
    } else if (!open) {
      for (const b of THROAT_SLAB) batch.box(b.x, b.y, b.z, b.w, b.h, b.d, '#a49d8e', b.yaw);
      // The painted seam: a dark broken zigzag on the outside face.
      const seam = THROAT_SLAB[1]!;
      for (let i = 0; i < 4; i++)
        batch.box(
          seam.x - 0.55 + (i % 2) * 0.22,
          25.1 + i * 1.5,
          seam.z - 0.55 - (i % 2) * 0.22,
          0.18,
          1.7,
          0.18,
          '#433f39',
        );
    }
    if (open && topple < 0)
      // Rubble at the cut's sides once the slabs have gone into the ground.
      for (const [k, side] of [
        [0, -1],
        [2, 1],
      ] as const) {
        const b = THROAT_SLAB[k]!;
        for (let i = 0; i < 3; i++)
          batch.box(
            b.x + edge.x * side * (1.2 + i * 0.5) + normal.x * (1.5 + i),
            H(b.x, b.z) + 0.3,
            b.z + edge.z * side * (1.2 + i * 0.5) + normal.z * (1.5 + i),
            1.2 - i * 0.2,
            0.6 - i * 0.1,
            1 - i * 0.15,
            '#9c958a',
            k + i,
          );
      }
  }
  // Log i stacked crosswise in the cradle, four to a layer; stone i filling the hopper.
  const cradle = at(3.5, 1.5),
    hopper = at(3.5, -1.5);
  const LOG = [1.3, 0.28, 0.28] as const,
    STONE = [0.42, 0.3, 0.42] as const;
  const logAt = (i: number) => {
    const layer = Math.floor(i / 4),
      j = (i % 4) - 1.5;
    // Side by side across the 1.6 m cradle (they had stacked end to end in one 0.3 m column).
    p.set(cradle.x + across.x * j * 0.37, kilnGround + 0.45 + layer * 0.3, cradle.z + across.z * j * 0.37);
    return faceYaw + Math.PI / 2;
  };
  const stoneAt = (i: number) => {
    const layer = Math.floor(i / 4),
      u = (i % 2) - 0.5,
      v = (Math.floor(i / 2) % 2) - 0.5;
    p.set(
      hopper.x + across.x * u * 0.6 + face.x * v * 0.6,
      kilnGround + 0.25 + layer * 0.24,
      hopper.z + across.z * u * 0.6 + face.z * v * 0.6,
    );
    return i * 0.7;
  };
  function drawKiln() {
    const k = worksRow(wd);
    for (let i = 0; i < Math.min(k.logs, WORKS.kilnLogs); i++) {
      const yaw = logAt(i);
      batch.box(p.x, p.y, p.z, ...LOG, '#8a6238', yaw);
    }
    for (let i = 0; i < Math.min(k.stone, WORKS.kilnStone); i++) {
      const yaw = stoneAt(i);
      batch.box(p.x, p.y, p.z, ...STONE, '#b5ae9f', yaw);
    }
  }
  // The kiln's missing load as dashed gold ghosts, from the cut opening until it lights: each goes as its real piece
  // lands. One draw for all of them; rebuilt only when the counts change. Each ghost is a little smaller than its
  // piece and squared to the kiln, so neighbouring outlines stay apart and read as pieces, not a cage.
  const ghosts = createGhostOutlines(owner, 1200, 0.22, 0.13, 0.03);
  let ghostKey = '',
    ghostLogs = 0,
    ghostStone = 0,
    rockMote = 0,
    rockSide = 1;
  function drawGhosts() {
    const k = worksRow(wd),
      wants = open && k.lit < 0;
    const logs = wants ? Math.max(0, WORKS.kilnLogs - k.logs) : 0,
      stone = wants ? Math.max(0, WORKS.kilnStone - k.stone) : 0;
    const key = `${logs} ${stone}`;
    if (key === ghostKey) return;
    ghostKey = key;
    ghostLogs = logs;
    ghostStone = stone;
    ghosts.begin();
    for (let i = WORKS.kilnLogs - logs; i < WORKS.kilnLogs; i++) {
      const yaw = logAt(i);
      ghosts.box(p.x, p.y, p.z, LOG[0] - 0.1, LOG[1] - 0.08, LOG[2] - 0.08, yaw);
    }
    for (let i = WORKS.kilnStone - stone; i < WORKS.kilnStone; i++) {
      stoneAt(i);
      ghosts.box(p.x, p.y, p.z, STONE[0] - 0.1, STONE[1] - 0.08, STONE[2] - 0.1, faceYaw);
    }
    ghosts.commit();
  }
  /** The bowl's limestone rocks give off the breaker's gold motes while the hopper still wants stone. */
  function rockMotes(dt: number) {
    if (reducedMotion || !ghostStone) return;
    rockMote -= dt;
    if (rockMote > 0) return;
    rockMote = 0.2;
    rockSide *= -1;
    for (const spot of WORKS_ROCKS) {
      if (rock(wd, spot.id).left <= 0) continue;
      // Round the top of the drawn pile (about 1.3 m tall, 2.4 m across), clear of the stone.
      const a = Math.random() * Math.PI * 2;
      goldMote(spot.x / 100 + Math.cos(a) * 1, spot.y / 100 + 1.5, spot.z / 100 + Math.sin(a) * 1, rockSide, 0.3);
    }
  }
  function drawRack(dt: number) {
    for (let i = flights.length - 1; i >= 0; i--) {
      const f = flights[i]!;
      f.t += dt;
      if (f.t < ROLL_S) {
        const d = roadLength * Math.min(1, f.t / ROLL_S);
        const yaw = along(d, p);
        footingFrame(m, p.x, p.y, p.z, yaw);
        footingParts(batch, m);
        continue;
      }
      const u = Math.min(1, (f.t - ROLL_S) / HOP_S);
      const slot = slotAt(Math.max(0, worksRow(wd).rack - flights.length + flights.indexOf(f)), new THREE.Vector3());
      const end = road.at(-1)!;
      p.set(
        end.x + (slot.x - end.x) * u,
        end.y + (slot.y - end.y) * u + Math.sin(u * Math.PI) * 0.7,
        end.z + (slot.z - end.z) * u,
      );
      footingFrame(m, p.x, p.y, p.z, rackYaw);
      footingParts(batch, m);
      if (u >= 1) {
        flights.splice(i, 1);
        thump(slot.x, slot.z);
        dustRing(slot.x, slot.y + 0.05, slot.z, 8, 1.3, 0.25);
      }
    }
    const resting = Math.max(0, worksRow(wd).rack - flights.length);
    for (let i = 0; i < Math.min(resting, 12); i++) {
      slotAt(i, p);
      footingFrame(m, p.x, p.y, p.z, rackYaw);
      footingParts(batch, m);
    }
  }
  function effects(dt: number) {
    if (worksRow(wd).lit < 0) return;
    const chimney = { x: kiln.x + 1.5, y: 34.6, z: kiln.z - 1.5 };
    smoke -= dt;
    if (smoke <= 0) {
      smoke = 0.45;
      emit({
        x: chimney.x,
        y: chimney.y,
        z: chimney.z,
        vx: 0.5,
        vy: 1.8 + Math.random() * 0.6,
        vz: (Math.random() - 0.5) * 0.4,
        life: 4.5,
        size: 0.6,
        color: ash,
        alpha: 0.45,
        drag: 0.3,
        grow: [1, 4],
        fade: 0.6,
        shape: 'dust',
      });
    }
    // The mouth breathes: a slow flicker on the glow, and flame licking up out of its top edge.
    glowMat.emissiveIntensity = 1.7 + Math.sin(performance.now() / 90) * 0.25 + Math.sin(performance.now() / 37) * 0.15;
    fire -= dt;
    if (fire <= 0) {
      fire = 0.08;
      const lick = at(2.7, (Math.random() - 0.5) * 1.3);
      emit({
        x: lick.x,
        y: kilnGround + 1.35,
        z: lick.z,
        vx: face.x * 0.5,
        vy: 1.6 + Math.random() * 0.8,
        vz: face.z * 0.5,
        life: 0.5,
        size: 0.5,
        color: Math.random() < 0.5 ? ember : flame,
        intensity: readableIntensity() * 2.2,
        alpha: 0.85,
        grow: [1, 0.35],
        fade: 0.45,
        shape: 'dust',
      });
      const mouthAt = at(2.75, (Math.random() - 0.5) * 1.2);
      emit({
        x: mouthAt.x,
        y: kilnGround + 0.6 + Math.random() * 0.5,
        z: mouthAt.z,
        vx: face.x * 0.4,
        vy: 0.9 + Math.random() * 0.6,
        vz: face.z * 0.4,
        life: 0.6,
        size: 0.09,
        color: ember,
        intensity: readableIntensity() * 2,
        alpha: 0.9,
        shrink: 0.4,
        fade: 0.5,
        shape: 'glint',
      });
    }
  }
  function light() {
    // The whoosh: a heavy breath through the kiln, a burst of sparks out of the mouth and a rush up the chimney.
    const mouthAt = at(2.7, 0);
    chuff(mouthAt.x, mouthAt.z, 1);
    later.after(0.12, () => chuff(mouthAt.x, mouthAt.z, 1));
    later.after(0.26, () => chuff(mouthAt.x, mouthAt.z, 0.6));
    thump(mouthAt.x, mouthAt.z);
    flare = 1;
    for (let i = 0; i < 24; i++)
      emit({
        x: mouthAt.x,
        y: kilnGround + 0.9,
        z: mouthAt.z,
        vx: face.x * (2 + Math.random() * 2) + (Math.random() - 0.5) * 2,
        vy: 1.5 + Math.random() * 2.5,
        vz: face.z * (2 + Math.random() * 2) + (Math.random() - 0.5) * 2,
        life: 0.9,
        size: 0.1,
        color: ember,
        intensity: readableIntensity() * 2.4,
        alpha: 1,
        gravity: 4,
        shrink: 0.5,
        fade: 0.4,
        shape: 'glint',
      });
    for (let i = 0; i < 8; i++)
      emit({
        x: kiln.x + 1.5,
        y: 34.6,
        z: kiln.z - 1.5,
        vx: (Math.random() - 0.5) * 0.6,
        vy: 4 + i * 0.4,
        vz: (Math.random() - 0.5) * 0.6,
        life: 3,
        size: 0.7,
        color: ash,
        alpha: 0.6,
        drag: 0.5,
        grow: [1, 3],
        fade: 0.6,
        shape: 'dust',
      });
  }
  function startTopple(delay: number) {
    topple = 0;
    toppleDelay = delay;
    landed = 0;
  }
  function throatShow() {
    // From the halt side, aimed through the throat at the kiln's two bays: the slabs fall away out of frame, the
    // camera settles in the opened cut and holds a beat on the empty cradle and hopper with their gold ghosts.
    const bays = at(3.5, 0),
      from = at(22, -7),
      to = at(12, -2.5);
    throatCamera.play(
      new THREE.Vector3(from.x, kilnGround + 11, from.z),
      new THREE.Vector3(to.x, kilnGround + 4.5, to.z),
      new THREE.Vector3(bays.x, kilnGround + 0.6, bays.z),
      4.8,
      3.4,
    );
    return throatCamera.active();
  }
  const fromBack = new THREE.Vector3();
  function avatarBack(pid: string, out: THREE.Vector3) {
    const a =
      pid === adapter.read.pid ? me.avatar : [...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar;
    if (!a) return false;
    out.copy(a.position);
    out.y += 1.2;
    return true;
  }
  const kilnFlights: { from: THREE.Vector3; to: THREE.Vector3; t: number; kind: 0 | 1 }[] = [];
  function drawKilnFlights(dt: number) {
    for (let i = kilnFlights.length - 1; i >= 0; i--) {
      const f = kilnFlights[i]!;
      f.t += dt;
      const u = Math.min(1, f.t / 0.38);
      p.lerpVectors(f.from, f.to, u);
      p.y += Math.sin(u * Math.PI) * 0.9;
      if (f.kind === 0) batch.box(p.x, p.y, p.z, 1.2, 0.26, 0.26, '#8a6238', u * 4);
      else batch.box(p.x, p.y, p.z, 0.4, 0.3, 0.4, '#b5ae9f', u * 5);
      if (u >= 1) {
        kilnFlights.splice(i, 1);
        if (f.kind === 1) clank(f.to.x, f.to.z);
        else thump(f.to.x, f.to.z);
      }
    }
  }
  function snap() {
    wd = adapter.read.world();
    open = !!(worksRow(wd).seams & SEAM_THROAT);
    topple = -1;
    flights.length = 0;
    kilnFlights.length = 0;
    poured = worksRow(wd).poured;
    litShown = worksRow(wd).lit >= 0;
    flare = 0;
    later.clear();
    throatCamera.reset();
    solid(!open);
    ghostKey = '';
    billPainted = '';
  }
  snap();
  return {
    restore: snap,
    /** The halt rack's slot k (base centre), where the footing wagon's loads hop from (J5). */
    rackSlot: slotAt,
    update(dt: number) {
      throatCamera.update(dt);
      later.update(dt);
      wd = adapter.read.world();
      const w = worksRow(wd);
      const nowOpen = !!(w.seams & SEAM_THROAT);
      // Opened without a strike event here (a correction, or someone else's packet arriving first): no show then.
      if (nowOpen && !open && topple < 0) solid(false);
      if (!nowOpen && open) {
        topple = -1;
        solid(true);
      }
      open = nowOpen;
      if (poured < 0) poured = w.poured;
      while (poured < w.poured) {
        poured++;
        flights.push({ t: 0 });
        const start = road[0]!;
        clank(start.x, start.z);
      }
      if (poured > w.poured) poured = w.poured;
      const lit = w.lit >= 0;
      if (lit && !litShown) light();
      litShown = lit;
      flare = Math.max(0, flare - dt / 1.2);
      mouth.visible = lit;
      mouth.scale.setScalar(1 + flare * 0.35);
      batch.begin();
      drawSlabs(dt);
      const marked = w.breaker === 2;
      if (marked) drawPath();
      sign.visible = marked;
      drawBill(open && w.lit < 0);
      drawKiln();
      drawKilnFlights(dt);
      drawRack(dt);
      batch.commit();
      drawGhosts();
      rockMotes(dt);
      effects(dt);
    },
    accepted(e: RailwayAccepted) {
      wd = adapter.read.world();
      if (e.op === 'rail.strike' && e.id === 1) {
        const delay = e.pid === adapter.read.pid ? deps.contactIn(1) : 0;
        solid(false);
        startTopple(delay + 0.07);
        open = true;
        playSharedMoment('works throat', e, adapter.read.pid, throatShow);
        const c = new THREE.Vector3(throat.x, 24, throat.z);
        later.after(delay + 0.07, () => {
          clank(c.x, c.z);
          placeSound('treeFall', c.x, c.z);
          dustRing(c.x, H(c.x, c.z) + 0.3, c.z, 24, 4.5, 0.8, 1, 1.6);
          for (let i = 0; i < 10; i++)
            emit({
              x: c.x + edge.x * (i - 5) * 0.8,
              y: 24.5 + Math.random() * 6,
              z: c.z + edge.z * (i - 5) * 0.8,
              vx: -normal.x * 1.5,
              vy: 0.4,
              vz: -normal.z * 1.5,
              life: 2.6,
              size: 1.1,
              color: dust,
              alpha: 0.5,
              drag: 0.6,
              grow: [1, 3],
              fade: 0.5,
              shape: 'dust',
            });
        });
      }
      if (e.op === 'rail.kiln') {
        // Logs and stone leave the back for the cradle and the hopper as they were taken.
        if (!avatarBack(e.pid, fromBack)) return;
        const k = worksRow(wd);
        const n = Math.min(8, e.accepted);
        for (let i = 0; i < n; i++) {
          const kind: 0 | 1 = i < n / 2 && k.logs > 0 ? 0 : 1;
          const to = kind === 0 ? at(3.5, 1.5) : at(3.5, -1.5);
          kilnFlights.push({
            from: fromBack.clone(),
            to: new THREE.Vector3(to.x, kilnGround + 0.8, to.z),
            t: -i * 0.06,
            kind,
          });
        }
      }
      if (e.op === 'rail.footTake' && e.rack === 0) {
        slotAt(Math.max(0, worksRow(wd).rack), p);
        placeSound('shoulder', p.x, p.z);
        dustRing(p.x, p.y + 0.1, p.z, 6, 1, 0.2);
      }
    },
    corrected(c: RailwayCorrection) {
      if (c.event.op === 'rail.kiln') kilnFlights.length = 0;
    },
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!adapter.read.ready() || !p) return [];
      const rows = adapter.read.world(),
        pid = adapter.read.pid,
        w = worksRow(rows),
        mine = account(rows, pid),
        out: Interactable[] = [];
      const backFree = !mine?.carry && !mine?.stone && !mine?.rails && !mine?.foot;
      const free = backFree && beamRow(rows).holder !== pid && boiler(rows).holder !== pid && !heldId();
      if (
        w.seams & SEAM_THROAT &&
        w.lit < 0 &&
        Math.hypot(p.x - kiln.x, p.z - kiln.z) <= WORKS_KILN.reach / 100 - 0.4 &&
        Math.abs(p.y - WORKS_KILN.y / 100) <= 2.6
      ) {
        const c = at(3.2, 0);
        const fills =
          ((mine?.carry ?? 0) > 0 && w.logs < WORKS.kilnLogs) || ((mine?.stone ?? 0) > 0 && w.stone < WORKS.kilnStone);
        // Part 2, beat 9: an empty or wrong back meets the prompt with its reason, never silence.
        out.push(
          fills
            ? {
                id: 'railway-kiln',
                verb: 'Fill the kiln',
                at: new THREE.Vector3(c.x, kilnGround + 2.2, c.z),
                run: () => void adapter.fillKiln(),
              }
            : {
                id: 'railway-kiln',
                verb: 'Fill the kiln',
                at: new THREE.Vector3(c.x, kilnGround + 2.2, c.z),
                blocked: 'Bring logs or stone',
              },
        );
      }
      if (w.rack > 0 && Math.hypot(p.x - rack.x, p.z - rack.z) <= WORKS_RACK.reach / 100 - 0.4) {
        const top = slotAt(Math.max(0, w.rack - 1), new THREE.Vector3()).add(new THREE.Vector3(0, 1.6, 0));
        out.push(
          free
            ? {
                id: 'railway-foot-take-0',
                verb: 'Shoulder a footing',
                at: top,
                run: () => void adapter.shoulderFooting(0),
              }
            : onlyALoadIn(rows, pid)
              ? {
                  id: 'railway-foot-take-0',
                  verb: 'Shoulder a footing',
                  at: top,
                  run: () => void setDownThen(adapter, () => adapter.shoulderFooting(0), rack),
                }
              : { id: 'railway-foot-take-0', verb: 'Shoulder a footing', at: top, blocked: 'Empty your back first' },
        );
      }
      return out;
    },
    inspect: () => ({
      seams: worksRow(wd).seams,
      throatSolid: slabBodies.length > 0,
      toppling: topple >= 0,
      shot: throatCamera.inspect(),
      kiln: { logs: worksRow(wd).logs, stone: worksRow(wd).stone, lit: worksRow(wd).lit, glow: mouth.visible },
      ghosts: { logs: ghostLogs, stone: ghostStone, dashes: ghosts.count },
      path: sign.visible,
      bill: bill.mesh.visible ? billPainted : null,
      rack: Math.max(0, worksRow(wd).rack - flights.length),
      rollers: flights.length,
    }),
  };
}
