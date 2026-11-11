// The auto-paver stations of ?proto=place (Death Stranding's auto-pavers): an open frame with four amber posts and a log
// on its board, so it reads as a place something goes, and a short roller feeder toward the track. What you carry stacks
// in it piece by piece; when the frame has what it needs, those same logs roll into the machine's cradle
// (.look/previz/visible-materials/board.md, shots 1-3). Local.
import * as THREE from 'three/webgpu';
import { guardInstances } from '../../render/draw-count.ts';
import { material } from '../../render/materials.ts';
import { scene } from '../../render/scene.ts';
import { removeBody, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { flat } from '../../render/flat.ts';
import { GOLD_ROPE, createRope } from '../../render/gold-rope.ts';
import { paintTwoLines, signBoard } from '../../render/sign-board.ts';
import { H, addStatic } from '../../place/land.ts';
import { LOOK, STEEL, addBlob, boxPaint, lookBox, paint } from '../../place/look.ts';
import { kitBatch, stationKit } from '../../place/look-kit.ts';
import { FORGE, GOODS, ORIGIN, noStock, type Goods, type Station, type Stock } from '../../place/layout.ts';
import { RAIL_SIZE, logStackMesh, send, setStackLog, stackSlot } from '../../place/pieces.ts';
import { addFoot } from '../../place/sites.ts';
import {
  FRAME_D,
  FRAME_W,
  PER_ROW,
  RAIL_OUT,
  SPAN,
  stationColliders,
  stationStockCollider,
  type FrameAt,
} from '../../place/spatial-station.ts';
export { frameBesideLine, type FrameAt } from '../../place/spatial-station.ts';

export type StationRun = ReturnType<typeof buildStation>;
/** The bill's paint: ink on paper, like the village's boards (src/place/signs.ts). */
const BILL_LOOK = { ground: '#fff3d6', ink: '#2a1c10', rim: '#2a1c10' };
/** The same deposit flight locally and on a partner's screen. Origins and landing effects belong to the caller. */
export function flyToStock(
  st: StationRun,
  kind: Goods,
  n: number,
  from: THREE.Vector3,
  land: () => void,
  owner?: OwnedView,
) {
  if (kind === 'logs')
    send('log', from, st.logSlot(n, new THREE.Vector3()), { dur: 0.32, apex: 0.9, size: [1, 2.2], land }, owner);
  else if (kind === 'rails')
    send('rail', from, st.railSlot(n, new THREE.Vector3()), { dur: 0.36, apex: 0.9, land }, owner);
  else if (kind === 'stone')
    send('stone', from, st.stoneAt(n, new THREE.Vector3()), { dur: 0.34, apex: 0.9, land }, owner);
  else send('log', from, st.at, { dur: 0.5, apex: 1.4, size: [4, 4], land }, owner);
}
const stoneGeo = new THREE.DodecahedronGeometry(0.22, 0),
  stoneMat = material('stone');
stoneGeo.computeBoundingBox();
const stoneFoot = -stoneGeo.boundingBox!.min.y;
/** Two saddles across the frame's top at its post pairs, in the frame's own space (+z along the line). */
function saddles(g: THREE.Group) {
  const wood = flat('#8a6236'),
    rope = flat(GOLD_ROPE, 0.7);
  const tied: THREE.Mesh[] = [];
  const loose: ReturnType<typeof createRope>[] = [];
  const ring = new THREE.TorusGeometry(0.34, 0.065, 6, 18);
  const a = new THREE.Vector3(),
    b = new THREE.Vector3();
  for (const sz of [-1, 1]) {
    const z = (sz * FRAME_W) / 2;
    const part = (w: number, h: number, d: number, px: number, py: number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
      m.position.set(px, py, z);
      m.castShadow = true;
      g.add(m);
    };
    // A crossbar on the posts with two cheeks: a U the beam's underside (1.41 m) sits in.
    part(FRAME_D + 0.3, 0.2, 0.3, 0, 1.31);
    for (const sx of [-1, 1]) part(0.14, 0.34, 0.3, sx * 0.42, 1.55);
    for (const sx of [-1, 1]) {
      // A loose lashing hangs off each cheek, waiting.
      const r = createRope(g, rope, 6, 0.055);
      r.set(a.set(sx * 0.42, 1.72, z), b.set(sx * 0.7, 0.85, z + sz * 0.16), 0.08);
      loose.push(r);
    }
    const t = new THREE.Mesh(ring, rope);
    t.position.set(0, 1.7, z);
    t.castShadow = true;
    t.visible = false;
    g.add(t);
    tied.push(t);
  }
  return {
    tie(on: boolean) {
      for (const t of tied) t.visible = on;
      for (const r of loose) r.visible = !on;
    },
  };
}
export function buildStation(spec0: Station, place: FrameAt, owner?: OwnedView) {
  const { x, z, yaw, lx, lz } = place;
  const y = place.y ?? H(x, z);
  const at = new THREE.Vector3(x, y + 0.12, z);

  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const add = (w: number, h: number, d: number, color: string, px: number, py: number, pz: number) => {
    const m = new THREE.Mesh(lookBox(w, h, d), boxPaint(color, w, h, d));
    m.position.set(px, py, pz);
    m.castShadow = true;
    g.add(m);
    return m;
  };
  const away = lx * Math.cos(yaw) - lz * Math.sin(yaw) > 0 ? 1 : -1; // the track's on the frame's -away side
  if (LOOK.contact) {
    addBlob(x, y, z, FRAME_D + 1.4, FRAME_W + 1.4, yaw, owner);
    addBlob(
      x - lx * (FRAME_D / 2 + SPAN / 2),
      y,
      z - lz * (FRAME_D / 2 + SPAN / 2),
      SPAN + 1,
      1.5,
      yaw + Math.PI / 2,
      owner,
    );
  }
  if (LOOK.kit)
    stationKit(
      g,
      away,
      FRAME_D,
      FRAME_W,
      SPAN,
      spec0.id === 'T3' && new URLSearchParams(location.search).get('corner') === '1',
      owner,
    );
  else {
    // In the frame's own space: +z along the line, +x across it.
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        add(0.34, 1.25, 0.34, '#7f5630', (sx * FRAME_D) / 2, 0.62, (sz * FRAME_W) / 2);
        add(0.42, 0.28, 0.42, '#f2a51a', (sx * FRAME_D) / 2, 1.38, (sz * FRAME_W) / 2);
      }
    for (const sx of [-1, 1]) add(0.14, 0.4, FRAME_W, '#8a6236', (sx * FRAME_D) / 2, 0.36, 0);
    add(FRAME_D, 0.4, 0.14, '#8a6236', 0, 0.36, -FRAME_W / 2);
    add(FRAME_D, 0.4, 0.14, '#8a6236', 0, 0.36, FRAME_W / 2);
    add(FRAME_D, 0.1, FRAME_W, '#6e4c2a', 0, 0.06, 0);
    // The board with a log on it, on the side away from the track, where you walk up.
    add(0.08, 0.55, 1.1, '#efe0ba', away * (FRAME_D / 2 + 0.1), 0.42, 0);
    const pict = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.75, 8).rotateX(Math.PI / 2), flat('#3a2a1a'));
    pict.position.set(away * (FRAME_D / 2 + 0.15), 0.42, 0);
    g.add(pict);
    // Rollers from the frame toward the track.
    const feeder = new THREE.Group();
    const bed = new THREE.Mesh(new THREE.BoxGeometry(SPAN, 0.08, 0.9), flat('#4a4d55'));
    bed.position.y = 0.5;
    bed.castShadow = true;
    feeder.add(bed);
    const rollers = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.86, 8).rotateX(Math.PI / 2),
      flat('#a9adb5', 0.5),
      Math.round(SPAN / 0.3),
    );
    const o = new THREE.Object3D();
    for (let k = 0; k < rollers.count; k++) {
      o.position.set((k + 0.5) * 0.3 - SPAN / 2, 0.58, 0);
      o.updateMatrix();
      rollers.setMatrixAt(k, o.matrix);
    }
    rollers.frustumCulled = false;
    feeder.add(rollers);
    feeder.position.set(-away * (FRAME_D / 2 + SPAN / 2), 0, 0);
    for (const dx of [-SPAN / 2 + 0.2, SPAN / 2 - 0.2]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.7), flat('#3a3d44'));
      leg.position.set(dx, 0.25, 0);
      feeder.add(leg);
    }
    g.add(feeder);
  }
  if (owner) owner.add(g);
  else scene.add(g);
  // The empty frame is low rails and four posts, not a head-high solid block. In particular, T3 must not
  // trap the player or collapse the camera just as the first path opens. Stock gets its own body below.
  const turn = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
  const solids = stationColliders(place, y, !!spec0.rails);
  for (const solid of solids.frame) addStatic(solid.shape, solid.position, turn, GROUP.SCENERY, owner);
  addFoot(x, z, yaw, FRAME_D / 2 + 0.3, FRAME_W / 2 + 0.3, owner);
  addStatic(
    solids.feeder.shape,
    solids.feeder.position,
    new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, solids.feeder.yaw),
    GROUP.SCENERY,
    owner,
  );
  // The rails' bearers, beside the frame on the far side, for stations that ask for rails.
  const railAt = new THREE.Vector3(x + lx * RAIL_OUT, y, z + lz * RAIL_OUT);
  if (solids.rails) {
    addStatic(
      solids.rails.shape,
      solids.rails.position,
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, solids.rails.yaw),
      GROUP.SCENERY,
      owner,
    );
    for (const off of [-0.9, 0.9]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.2, 0.2), flat('#8a6236'));
      b.position.set(railAt.x + Math.sin(yaw) * off, y + 0.1, railAt.z + Math.cos(yaw) * off);
      b.rotation.y = yaw;
      b.castShadow = true;
      if (owner) owner.add(b);
      else scene.add(b);
    }
  }

  const logs = logStackMesh(Math.max(1, 56), owner);
  const rails = LOOK.kit
    ? kitBatch('rail', STEEL, Math.max(1, spec0.rails), owner)
    : new THREE.InstancedMesh(
        new THREE.BoxGeometry(RAIL_SIZE.x, RAIL_SIZE.y, RAIL_SIZE.z),
        LOOK.mats ? paint(STEEL) : flat('#4c5058', 0.6),
        Math.max(1, spec0.rails),
      );
  rails.castShadow = true;
  rails.frustumCulled = false;
  rails.count = 0;
  if (owner) owner.add(rails);
  else scene.add(rails);
  // Stone in a low heap beside the frame; the great beam, when it comes, across the frame's top.
  const stones = spec0.stone ? new THREE.InstancedMesh(stoneGeo, stoneMat, spec0.stone) : null;
  guardInstances(logs, `station ${spec0.id} logs`);
  guardInstances(rails, `station ${spec0.id} rails`);
  if (stones) guardInstances(stones, `station ${spec0.id} stone`);
  if (stones) {
    stones.castShadow = true;
    stones.frustumCulled = false;
    stones.count = 0;
    if (owner) owner.add(stones);
    else scene.add(stones);
  }
  const beam = spec0.beam
    ? new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.32, 5.6, 8).rotateX(Math.PI / 2), flat('#7a5430'))
    : null;
  if (beam) {
    beam.castShadow = true;
    beam.position.set(x, y + 1.7, z);
    beam.rotation.y = yaw;
    beam.visible = false;
    if (owner) owner.add(beam);
    else scene.add(beam);
  }
  // The great beam pass (C1): two empty timber saddles on the frame's top with loose gold lashings, a beam-shaped gap
  // from the moment the station opens; the lashings tie round the beam when it lands. Local, from accepted state.
  const lashings = beam ? saddles(g) : null;

  // The bill: a painted board on two posts at the frame's far end, facing along the line, so it reads over the low
  // frame as you walk up beside the track past the depot rack (owner, 9 November: signs in the world before hovering
  // text). Both faces carry it.
  const bill = signBoard(owner, { w: 2.2, h: 1.1, px: 512, foot: 1.5, posts: 'two' });
  const billEnd = FRAME_W / 2 + 0.8;
  // T3's full log pile hid the missing beam row. Keep the existing bill beside the pile,
  // on the source side, without moving the receiver, feeder or standing envelope.
  const billOut = spec0.id === 'T3' ? 4 : 0;
  let bx = x + Math.sin(yaw) * billEnd + lx * billOut,
    bz = z + Math.cos(yaw) * billEnd + lz * billOut,
    byaw = yaw;
  // The pack is on the working apron: put this existing bill before the building frontage, not between the follow
  // camera and the receiver as the player collects it. It stands out past the scaffold, facing out from the front.
  if (spec0.id === 'F1') {
    const fz = FORGE.z + ORIGIN.z;
    bz = fz - FORGE.d / 2 - 1.3;
    bx = x;
    byaw = 0;
  }
  bill.mesh.position.set(bx, place.y ?? H(bx, bz), bz);
  bill.mesh.rotation.y = byaw;
  if (!owner) scene.add(bill.mesh);
  let painted = '';

  const slot = new THREE.Vector3();
  const logSlot = (n: number, out = slot) => stackSlot(n, PER_ROW, at, yaw, out);
  const railSlot = (n: number, out = slot) => {
    const across = (n % 8) - 3.5,
      row = Math.floor(n / 8);
    return out.set(railAt.x + lx * across * 0.17, y + 0.28 + row * 0.18, railAt.z + lz * across * 0.17);
  };
  const stoneSlots: THREE.Vector3[] = [];
  for (let n = 0; n < (spec0.stone ?? 0); n++) {
    // Six grounded stones support the two upper stones of the bill's small pile.
    const upper = n >= 6,
      across = (upper ? n - 6 - 0.5 : (n % 3) - 1) * 0.38,
      along = upper ? 0 : (Math.floor(n / 3) - 0.5) * 0.38;
    const px = railAt.x + lx * across - lz * along,
      pz = railAt.z + lz * across + lx * along;
    let py = H(px, pz) + stoneFoot;
    if (upper) {
      const first = n - 6;
      py = Math.max(...[first, first + 1, first + 3, first + 4].map((k) => stoneSlots[k]!.y)) + 0.28;
    }
    stoneSlots.push(new THREE.Vector3(px, py, pz));
  }
  const stoneAt = (n: number, out = slot) => out.copy(stoneSlots[n] ?? railAt);
  const railM = new THREE.Matrix4(),
    railQ = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw),
    one = new THREE.Vector3(1, 1, 1);
  let stockBody: Body | null = null;
  let stockRows = 0;
  // Slots are fixed for this station; only a count change needs new instance data.
  let drawnLogs = -1,
    drawnRails = -1,
    drawnStones = -1;
  const run = {
    spec: spec0, // the forge's frame takes its next bill here
    at,
    x,
    z,
    y,
    yaw,
    /** Where a log leaves the rollers for the machine. */
    feederEnd: new THREE.Vector3(x - lx * (FRAME_D / 2 + SPAN), y + 0.7, z - lz * (FRAME_D / 2 + SPAN)),
    feederStart: new THREE.Vector3(x - lx * (FRAME_D / 2), y + 0.7, z - lz * (FRAME_D / 2)),
    have: noStock(), // landed
    coming: noStock(), // in the air
    shown: noStock(), // standing in the frame (the machine takes them down)
    logSlot,
    railSlot,
    stoneAt,
    drawStock(n: Stock) {
      logs.count = Math.max(0, Math.min(logs.instanceMatrix.count, n.logs));
      rails.count = Math.max(0, Math.min(rails.instanceMatrix.count, n.rails));
      if (stones) stones.count = Math.max(0, Math.min(stones.instanceMatrix.count, n.stone));
      const rows = Math.ceil(logs.count / PER_ROW);
      if (rows !== stockRows) {
        if (stockBody) {
          if (owner) owner.removeBody(stockBody);
          else removeBody(stockBody);
        }
        stockBody = null;
        stockRows = rows;
        if (rows) {
          // Read the same slot spacing as the visible logs; keep the pile solid only while it exists.
          const radius = stackSlot(0, PER_ROW, at, yaw, slot).y - at.y;
          const top = stackSlot((rows - 1) * PER_ROW, PER_ROW, at, yaw, slot).y + radius;
          const solid = stationStockCollider(place, y, top);
          stockBody = addStatic(solid.shape, solid.position, turn, GROUP.SCENERY, owner);
        }
      }
      run.shown.logs = n.logs;
      run.shown.rails = n.rails;
      run.shown.stone = n.stone;
      run.shown.beam = n.beam;
      logs.visible = logs.count > 0;
      if (logs.count !== drawnLogs) {
        drawnLogs = logs.count;
        for (let k = 0; k < logs.count; k++) setStackLog(logs, k, logSlot(k), yaw);
        logs.instanceMatrix.needsUpdate = true;
        if (logs.instanceColor) logs.instanceColor.needsUpdate = true;
      }
      if (rails.count !== drawnRails) {
        drawnRails = rails.count;
        for (let k = 0; k < rails.count; k++) rails.setMatrixAt(k, railM.compose(railSlot(k), railQ, one));
        rails.instanceMatrix.needsUpdate = true;
      }
      if (stones && stones.count !== drawnStones) {
        drawnStones = stones.count;
        for (let k = 0; k < stones.count; k++) stones.setMatrixAt(k, railM.compose(stoneAt(k), railQ, one));
        stones.instanceMatrix.needsUpdate = true;
      }
      if (beam) beam.visible = n.beam > 0;
      lashings?.tie(n.beam > 0);
    },
    /** The sign over it; off when it's not its turn or it's done. */
    setTag(on: boolean, status?: string) {
      bill.mesh.visible = on;
      if (!on) return;
      const parts = GOODS.filter((g) => run.need(g) > 0).map(
        (g) => `${g === 'beam' ? 'great beam' : g} ${run.have[g]}/${run.need(g)}`,
      );
      const big = status ?? run.spec.label.replace('Line 2, s', 'S'),
        small = parts.join('  ');
      if (big + '|' + small === painted) return;
      painted = big + '|' + small;
      paintTwoLines(bill, big, small, BILL_LOOK);
      bill.painted();
    },
    need: (kind: Goods) => run.spec[kind] ?? 0,
    full: () => GOODS.every((g) => run.have[g] >= run.need(g)),
    wants: (kind: Goods) => run.need(kind) - run.have[kind] - run.coming[kind],
  };
  run.setTag(false);
  return run;
}
