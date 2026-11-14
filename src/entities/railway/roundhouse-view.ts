// The smallest Roundhouse, live from accepted state: the cracked slab opens on a strike, two footings raise the stall
// frame and the tarp slides off the shunter and wagon, the cradle bolts on, and the table turns for the shunter to push
// the wagon onto line 2. Local view: effects play on the press, accepted events and live edges, and restore snaps
// them; the shunt's pose comes only from `shed.ready` and the adapter's mover clock.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { Body } from '../../physics/engine.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { clank, thump, chuff } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { emit } from '../../render/particles.ts';
import { chips, dustRing } from '../../render/particle-effects.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { material } from '../../render/materials.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { WORKS, SHED_STALL, SHED_TABLE, WAGON_S } from '../../sim/railway-works-layout.ts';
import { SEAM_STALL } from '../../sim/railway-works.ts';
import {
  STALL_BOXES,
  STALL_SLAB,
  STALL_ROAD,
  STALL_RAIL,
  STALL_SOCKETS,
  STALL_YAW,
  stallPoint,
  box,
  type WorksBox,
} from './works-shape.ts';
import { drawWorksBoxes, createBoxBatch, createLater, footingFrame, footingParts, FOOTING } from './works-box-view.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
import { createGarageView } from './garage-view.ts';
import { roomFacts } from './garage-state.ts';
import { playSharedMoment } from './shared-moment.ts';
import { showMomentBanner } from '../../ui/moment-banner.ts';
import { garageRow, polarAt } from './garage-geo.ts';
import { account, shed, trains, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';

/** Seconds: the stall frame's build, the tarp's slide, the table's quarter turn. */
const BUILD_S = 3,
  TARP_S = 1.1,
  TURN_S = 2;
const FLOOR = 18.05,
  RAIL = STALL_RAIL;
/** Rule ticks per second (the railway sim runs at 10 Hz, as cart-view.ts says). */
const TICKS_PER_S = 10;
/** The roll-out's turn, as fractions of its `rollTicks` (11 s): push on, turn, back down the spur and push off. */
const ROLL = { turn: [0.36, 0.69] } as const;
/** The shunter's way home after the wagon waits on line 2 (ticks), and its turn back as fractions of it. */
const BACK_TICKS = 100;
const BACK = { turn: [0.3, 0.5] } as const;
/** Along the stall's length (local z): the wagon parks at the door end, the shunter behind it, ready to push. */
const PARK = { wagon: -0.9, gap: 3.6 } as const;
/** The longer boiler's banner for a player away from the table (placeholder lines, on main since build 2; none is The
 * Boogler's), and how far "away" is, in metres from the table's centre. */
const BANNER = ['Longer boiler installed', 'Line 2’s trains take it at the Village'] as const,
  BANNER_BEYOND = 30;
const BRASS = '#c79a3e',
  STEEL = '#7c7c74';

export async function createRailwayRoundhouse(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { contactIn: (id: number) => number },
) {
  const [{ addStatic }, layout, home] = await Promise.all([
    import('../../place/land.ts'),
    import('../../place/layout.ts'),
    import('../../place/home-station.ts'),
  ]);
  const toWorld = (p: { x: number; z: number }) => ({ x: p.x + layout.ORIGIN.x, z: p.z });
  const boxes: WorksBox[] = [...STALL_BOXES];
  for (const p of STALL_SOCKETS) {
    boxes.push({ ...box(p.x, 18.05, p.z, 0.9, 0.1, 0.9, STALL_YAW), colour: '#373c3b', solid: false });
    // The rim's four edge strips, squared to the stall (its local x and z turned by STALL_YAW).
    const c = Math.cos(STALL_YAW),
      sn = Math.sin(STALL_YAW);
    for (const offset of [-0.55, 0.55]) {
      boxes.push({
        ...box(p.x + c * offset, 18.17, p.z - sn * offset, 0.14, 0.24, 1.2, STALL_YAW),
        colour: '#a9a395',
        solid: false,
      });
      boxes.push({
        ...box(p.x + sn * offset, 18.17, p.z + c * offset, 1.2, 0.24, 0.14, STALL_YAW),
        colour: '#a9a395',
        solid: false,
      });
    }
  }
  // The stall road itself is the station's to draw, with the other yard track (./home-station-view.ts).
  await drawWorksBoxes(owner, boxes);

  // ---------------------------------------------------------------- the turntable (Place's junction disc is not
  // loaded in production: the Roundhouse draws its own at the same place and size)
  const anchor = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
  const table = toWorld(home.TABLE);
  const line2 = layout.LINKS[1]!.line;
  const tableY = layout.railY(line2, 0);
  const R = 4.8;
  const rim = STALL_ROAD[0]!;
  const yaws = [Math.atan2(rim.x - table.x, rim.z - table.z), 0];
  const spur = (home.TABLE.spur * Math.PI) / 180;
  yaws[1] = Math.atan2(Math.sin(spur), -Math.cos(spur));
  const discGeo = new THREE.CylinderGeometry(R, R, 0.24, 24);
  const disc = new THREE.Mesh(discGeo, material('stone', { colour: '#7f7a70' }));
  discGeo.dispose();
  disc.position.set(table.x, tableY - 0.1, table.z);
  disc.receiveShadow = true;
  owner.add(disc);
  addStatic(
    { kind: 'cylinder', rTop: R, rBottom: R, h: 0.24, segments: 12 },
    { x: table.x, y: tableY - 0.1, z: table.z },
    undefined,
    undefined,
    owner,
  );

  // The train garage: the works copy stands on the table after coupling; the lever post opens its framed view.
  // Local: nothing is sent or saved. Every Install hold starts inside the server's reach.
  const garageGeo = garageRow().geo;
  const garagePost = polarAt(table, garageGeo.post);
  const garageView = await createGarageView(owner, { table, y: tableY, post: garagePost, ground: tableY }, garageGeo, {
    // The deck is at rest when no choreography turns it, it is not catching up, and the shunter is home in the stall.
    restYaw: () =>
      (deckK === null || deckK <= 0) && !tableTurning && Math.abs(shunterA - (PARKED_A - PARK.gap)) < 0.05
        ? tableYaw
        : null,
    install: (rev) => adapter.installBoiler(rev),
    installHere: true,
    online: () => adapter.read.ready(),
  });
  owner.cleanup(garageView.dispose);
  // The install is not predicted, so a refusal is no correction: the adapter says so directly and the part lowers.
  owner.cleanup(
    adapter.onRefused((r) => {
      if (r.intent.op === 'rail.install') garageView.denied();
    }),
  );

  // ---------------------------------------------------------------- the shunt path: stall, door, table, line 2
  const pathPts: THREE.Vector3[] = [];
  const back = stallPoint(0, PARK.wagon + PARK.gap + 0.5);
  pathPts.push(new THREE.Vector3(back.x, RAIL, back.z));
  const parked = stallPoint(0, PARK.wagon);
  pathPts.push(new THREE.Vector3(parked.x, RAIL, parked.z));
  const door = stallPoint(0, -4);
  pathPts.push(new THREE.Vector3(door.x, RAIL, door.z));
  // The road ramps from the stall's ground-level rails at the door up to the deck's at the rim.
  pathPts.push(new THREE.Vector3(rim.x, tableY, rim.z));
  pathPts.push(new THREE.Vector3(table.x, tableY, table.z));
  const lengths = (pts: THREE.Vector3[]) => {
    const out: number[] = [0];
    for (let i = 1; i < pts.length; i++) out.push(out[i - 1]! + pts[i]!.distanceTo(pts[i - 1]!));
    return out;
  };
  /** The point at distance `a` along a polyline, carried straight on past either end (a bogie can stand beyond the
   * last point). */
  function polyAt(pts: THREE.Vector3[], along: number[], a: number, out: THREE.Vector3) {
    let i = 1;
    while (i < pts.length - 1 && along[i]! < a) i++;
    let u = (a - along[i - 1]!) / (along[i]! - along[i - 1]! || 1);
    if (i > 1) u = Math.max(0, u);
    if (i < pts.length - 1) u = Math.min(1, u);
    return out.lerpVectors(pts[i - 1]!, pts[i]!, u);
  }
  const cum = lengths(pathPts);
  const PARKED_A = cum[1]!; // the wagon's parked place along the path
  const TABLE_A = cum[4]!;
  const pathAt = (a: number, out: THREE.Vector3) => polyAt(pathPts, cum, a, out);
  /** The shunt past the table (home-station.ts `shuntPath()`; docs/plans/home-flip.md, F2), in two tracks. The
   * deck turns the pair so the shunter leaves first: `inPts` runs from the table's centre down the spur onto road 2
   * and on to the buffer, and the pair backs down it, the shunter leading, until the wagon's centre is at the cusp;
   * `outPts` is road 2 from the buffer outward, along which the shunter pushes the wagon to its wait. One distance
   * still places each vehicle: `cuspA` is the wagon's at the cusp, `outA` at its wait. */
  const shunt = (() => {
    const wagonS = WAGON_S / 100,
      buffer = home.BUFFERS[1];
    const { pts, cusp } = home.shuntPath(wagonS);
    const roadPoint = (s: number) => {
      const p = toWorld(home.roadAt(1, s));
      return new THREE.Vector3(p.x, layout.railY(line2, Math.max(0, s)), p.z);
    };
    // pts[3] is the table's centre and pts[cusp - 1] road 2 one metre short of the cusp: the spur at the table's height.
    const inPts = pts.slice(3, cusp).map((p) => {
      const w = toWorld(p);
      return new THREE.Vector3(w.x, tableY, w.z);
    });
    for (let s = home.SHUNT_CUSP_S; s > buffer; s--) inPts.push(roadPoint(s));
    inPts.push(roadPoint(buffer));
    const inCum = lengths(inPts);
    const outPts: THREE.Vector3[] = [];
    for (let s = buffer; s <= wagonS + 3; s++) outPts.push(roadPoint(s));
    const cuspW = inCum[cusp - 3]!; // the cusp's distance from the table's centre
    const cuspA = TABLE_A + PARK.gap + cuspW;
    return {
      inPts,
      inCum,
      outPts,
      outCum: lengths(outPts),
      buffer,
      cuspA,
      outA: cuspA + (wagonS - home.SHUNT_CUSP_S),
    };
  })();
  const OUT_A = shunt.outA; // its wait on line 2
  // The deck carries what stands on it (works-late-game step 5): drive on heading `hIn`, turn `turnBy` with the deck,
  // drive off heading `hOut`. `deckK` is the turn done (0..1) while the choreography runs, null while the deck simply
  // follows the accepted table.
  const tableAt = new THREE.Vector3(table.x, tableY, table.z);
  const headingOf = (from: THREE.Vector3, to: THREE.Vector3) => Math.atan2(to.x - from.x, to.z - from.z);
  const hIn = headingOf(pathAt(TABLE_A - 2, new THREE.Vector3()), tableAt);
  // The deck turns its stall end to the spur, so the pair leaves backwards, the shunter first.
  const hOut = headingOf(tableAt, shunt.inPts[1]!) + Math.PI;
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  const turnBy = wrap(hOut - hIn);
  /** Half the bogie spacing of the wagon and the shunter (their wheels sit at z ±1). */
  const BOGIE = 1;
  let deckK: number | null = null;
  /** The point `c` metres ahead of the wagon's centre along the pair (its bogies ±1; the shunter's centre
   * `PARK.gap` behind) when the wagon's distance is `a`. Up to its seat on the deck the pair is on the stall road or
   * turning with the deck; then it backs down `inPts` (the point ahead of the centre trails, nearer the table); past
   * the cusp it runs out along `outPts`. */
  function pairAt(a: number, c: number, out: THREE.Vector3) {
    const b = shunt,
      seated = TABLE_A + PARK.gap / 2;
    if (a <= seated) {
      const d = a + c - TABLE_A;
      if (deckK === null || Math.abs(d) >= R) return pathAt(a + c, out);
      const h = hIn + turnBy * Math.min(1, Math.max(0, deckK));
      return out.set(table.x + Math.sin(h) * d, tableY, table.z + Math.cos(h) * d);
    }
    if (a <= b.cuspA) return polyAt(b.inPts, b.inCum, a - seated - PARK.gap / 2 - c, out);
    return polyAt(b.outPts, b.outCum, home.SHUNT_CUSP_S + (a - b.cuspA) + c - b.buffer, out);
  }
  /** A vehicle's centre at its own distance: the wagon's, or the shunter's (`PARK.gap` behind the wagon's). */
  const centreAt = (a: number, shunter: boolean, out: THREE.Vector3) =>
    shunter ? pairAt(a + PARK.gap, -PARK.gap, out) : pairAt(a, 0, out);

  // ---------------------------------------------------------------- moving parts
  const batch = createBoxBatch(owner, 320);
  const boilerGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.7, 10);
  boilerGeo.rotateX(Math.PI / 2);
  const boiler = new THREE.Mesh(boilerGeo, material('stone', { colour: '#687f77' }));
  boilerGeo.dispose();
  boiler.castShadow = true;
  owner.add(boiler);
  const later = createLater();
  // The rows, re-read at the head of each entry (update, accepted, snap, targets): a refill swaps the world.
  let wd: ReadWorld = adapter.read.world();
  let slabBody: Body | null = null,
    wagonBody: Body | null = null,
    wagonBodyAt = NaN;
  let slabOpen = false,
    pop = -1, // seconds into the slab popping apart
    popDelay = 0,
    build = 0, // 0..1 stall frame
    tarp = 0, // 0..1 tarp off
    builtShown = false,
    fittedShown = false,
    tableYaw = 0,
    tableTurning = false,
    asked: { to: number; until: number } | null = null,
    wagonA = PARKED_A,
    shunterA = PARKED_A - PARK.gap;
  let lastCradle = 0,
    lastRails = 0;
  const lowering: { site: 0 | 1; slot: number; from: THREE.Vector3; t: number }[] = [];
  const bolts: { k: number; t: number }[] = []; // cradle pieces dropping on: k < 2 seats, else rail arms
  const m = new THREE.Matrix4(),
    f = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    e = new THREE.Euler(0, 0, 0, 'YXZ');
  const gold = new THREE.Color('#ffdc7a');

  /** Frame pieces in build order, stall-local: two portal posts on the set footings, then the walls and roof. The
   * side walls stand on the ruin's low walls (top 19.4) up under its cross beams (22.33); the back wall rises to the
   * same line. The two roof slopes rise inward (a positive roll lifts a slab's +x end in the batch's YXZ Euler), so
   * their eaves land on the ruin's posts at about 22.4 and they meet under the ridge pole at 23.65. */
  const FRAME: [x: number, y: number, z: number, w: number, h: number, d: number, roll: number][] = [
    [-1.5, 20.45, -3.7, 0.42, 3.9, 0.42, 0],
    [1.5, 20.45, -3.7, 0.42, 3.9, 0.42, 0],
    [0, 22.55, -3.7, 3.8, 0.42, 0.42, 0],
    [-2, 20.865, 0, 0.32, 2.93, 9, 0],
    [2, 20.865, 0, 0.32, 2.93, 9, 0],
    [0, 20.465, 4.5, 4.4, 3.73, 0.3, 0],
    [0, 23.65, 0.3, 0.3, 0.3, 9.6, 0],
    [-1.15, 23.05, 0.3, 2.6, 0.12, 9.6, 0.5],
    [1.15, 23.05, 0.3, 2.6, 0.12, 9.6, -0.5],
  ];
  const frameFrom = (k: number) => k / FRAME.length;
  function drawFrame(dt: number) {
    const prior = build;
    const target = shed(wd).stall >= WORKS.stall ? 1 : 0;
    if (build < target) build = Math.min(target, build + dt / BUILD_S);
    else if (build > target) build = Math.max(target, build - dt / 0.6);
    FRAME.forEach(([x, y, z, w, h, d, roll], k) => {
      const start = frameFrom(k),
        span = 1 / FRAME.length;
      const u = Math.min(1, Math.max(0, (build - start) / span));
      if (u <= 0) return;
      // Each piece drops in from above and lands (Place's physical build, never a scale).
      const drop = (1 - u * u) * 3;
      const pt = stallPoint(x, z);
      batch.box(pt.x, y + drop, pt.z, w, h, d, k < 3 ? '#6b5238' : '#8d8576', STALL_YAW, 0, roll);
      if (prior < start + span && build >= start + span && target === 1) {
        placeSound('shoulder', pt.x, pt.z);
        thump(pt.x, pt.z);
        dustRing(pt.x, y - h / 2, pt.z, 6, 1, 0.2);
      }
    });
    if (prior < 1 && build >= 1 && target === 1 && !builtShown) {
      builtShown = true;
      const c = stallPoint(0, 0);
      clank(c.x, c.z);
    }
  }
  function drawSlab(dt: number) {
    const b = STALL_SLAB;
    if (pop >= 0) {
      if (popDelay > 0) popDelay = Math.max(0, popDelay - dt);
      else pop += dt;
      const u = Math.min(1, pop / 0.7);
      const sink = Math.max(0, pop - 1.6) / 1;
      if (sink >= 1) pop = -1;
      // Three pieces: the sides tip outward about their outer feet, the middle drops and crumbles.
      const w = b.w / 3,
        base = b.y - b.h / 2,
        doorZ = -2.9,
        down = Math.min(1, sink) * 4;
      for (const k of [-1, 0, 1]) {
        if (k === 0) {
          const pt = stallPoint(0, doorZ);
          batch.box(pt.x, b.y - u * u * 1.6 - down, pt.z, w - 0.05, b.h, b.d, '#9a958b', b.yaw);
          continue;
        }
        // About the outer bottom edge: the centre swings from above the foot to beside it.
        const theta = (Math.PI / 2) * u * u;
        const rx = (-k * w) / 2,
          ry = b.h / 2;
        const x = k * 1.5 * w + rx * Math.cos(theta) + k * ry * Math.sin(theta);
        const y = base - k * rx * Math.sin(theta) + ry * Math.cos(theta);
        const pt = stallPoint(x, doorZ);
        batch.box(pt.x, y - down, pt.z, w - 0.05, b.h, b.d, '#9a958b', b.yaw, 0, -k * theta);
      }
      return;
    }
    if (slabOpen) {
      // Rubble either side of the open door.
      for (const k of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const pt = stallPoint(k * (2.6 + i * 0.35), -3.4 - i * 0.4);
          batch.box(pt.x, FLOOR + 0.2, pt.z, 0.9 - i * 0.2, 0.45 - i * 0.08, 0.8, '#8f8a80', i + k);
        }
      return;
    }
    batch.box(b.x, b.y, b.z, b.w, b.h, b.d, '#9a958b', b.yaw);
    // Cracks across the door's outer face.
    for (let i = 0; i < 3; i++) {
      const pt = stallPoint(-0.1 + (i % 2) * 0.22, -3.26);
      batch.box(pt.x, 18.8 + i * 0.8, pt.z, 0.14, 0.95, 0.14, '#464640', STALL_YAW);
    }
  }
  /** A footing seated in stall socket `k`, sunk to its band. */
  const socketFrame = (k: number, out: THREE.Matrix4) => {
    const sp = STALL_SOCKETS[k]!;
    return footingFrame(out, sp.x, FLOOR - 0.35, sp.z, STALL_YAW);
  };
  function drawSockets() {
    const resting = shed(wd).stall - lowering.filter((l) => l.site === 0).length;
    for (let k = 0; k < Math.min(2, resting); k++) footingParts(batch, socketFrame(k, m));
  }
  // A dashed gold ghost footing in each empty socket once the slab has fallen (docs/plans/works-signposting-2.md,
  // beat 4): "a block this shape goes here", the shape of the rack's sample and of every cast. Each goes as its
  // footing is set. Standing on the floor, a little smaller than a footing and squared to the stall. One draw.
  const socketGhosts = createGhostOutlines(owner, 200, 0.2, 0.12, 0.03);
  let socketKey = '';
  function drawSocketGhosts() {
    const from = slabOpen ? Math.min(WORKS.stall, shed(wd).stall) : WORKS.stall;
    const key = String(from);
    if (key === socketKey) return;
    socketKey = key;
    socketGhosts.begin();
    const h = FOOTING.h - 0.08;
    for (let k = from; k < Math.min(WORKS.stall, STALL_SOCKETS.length); k++) {
      const sp = STALL_SOCKETS[k]!;
      socketGhosts.box(sp.x, FLOOR + h / 2 + 0.02, sp.z, FOOTING.w - 0.1, h, FOOTING.w - 0.1, STALL_YAW);
    }
    socketGhosts.commit();
  }
  /** The vehicles' local frame at path distance `a` (origin on the rail, +z the way out). */
  const front = new THREE.Vector3(),
    rear = new THREE.Vector3();
  function vehicleFrame(a: number, out: THREE.Matrix4, shunter = false) {
    // Local +z points the way out: the shunter, behind, pushes the wagon ahead of it. The body sits between its two
    // bogies and faces along them, so its heading eases through every corner of the path and turns with the deck.
    const wagon = shunter ? a + PARK.gap : a,
      c = shunter ? -PARK.gap : 0;
    pairAt(wagon, c + BOGIE, front);
    pairAt(wagon, c - BOGIE, rear);
    p.addVectors(front, rear).multiplyScalar(0.5);
    return out.compose(p, q.setFromEuler(e.set(0, headingOf(rear, front), 0)), s.set(1, 1, 1));
  }
  function drawWagon(frame: THREE.Matrix4) {
    batch.part(frame, 0, 0.3, 0, 2.2, 0.35, 3.2, '#77766b');
    for (const x of [-0.85, 0.85]) for (const z of [-1, 1]) batch.part(frame, x, 0.05, z, 0.25, 0.5, 0.5, '#3a3c3c');
    const fitted = shed(wd).fitted >= 0;
    // Cradle: two footing seats on the deck and eight arms that hold the footings upright.
    const seats = Math.min(2, shed(wd).cradle);
    const rails = Math.min(8, shed(wd).cradleRails);
    const settling = (k: number) => {
      const b = bolts.find((bolt) => bolt.k === k);
      return b ? (1 - Math.min(1, b.t / 0.28)) ** 2 * 0.9 : 0;
    };
    for (let k = 0; k < 2; k++) {
      const z = k ? 0.8 : -0.8;
      batch.part(frame, 0, 0.55, z, 1.5, 0.16, 1.3, fitted ? BRASS : '#5d4630');
      const shown = k < seats - lowering.filter((l) => l.site === 1).length;
      if (shown) {
        f.multiplyMatrices(frame, m.makeTranslation(0, 0.63 + settling(k) * 0.4, z));
        footingParts(batch, f);
      }
    }
    for (let r = 0; r < rails; r++) {
      const x = r % 2 ? 0.95 : -0.95,
        z = [-1.35, -0.25, 0.25, 1.35][Math.floor(r / 2)]!;
      batch.part(frame, x, 1.05 + settling(2 + r), z, 0.1, 1.1, 0.1, fitted ? BRASS : STEEL);
    }
    if (fitted) for (const x of [-0.95, 0.95]) batch.part(frame, x, 1.62, 0, 0.12, 0.12, 2.9, BRASS);
  }
  function drawShunter(frame: THREE.Matrix4) {
    batch.part(frame, 0, 0.35, 0, 2.2, 0.5, 3.4, '#4e5352');
    // The cab at the back; boiler, chimney and buffer beam forward, toward the wagon it pushes.
    batch.part(frame, 0, 1.75, -1.0, 2, 2.3, 1.4, '#87968b');
    batch.part(frame, 0, 3.0, -1.0, 2.2, 0.16, 1.7, '#4e5352');
    batch.part(frame, 0, 2.15, 1.25, 0.32, 0.8, 0.32, '#3c3f3e');
    batch.part(frame, 0, 0.55, 1.8, 2.3, 0.3, 0.2, '#a33a2c');
    for (const x of [-0.85, 0.85])
      for (const z of [-1.1, 1.1]) batch.part(frame, x, 0.05, z, 0.25, 0.55, 0.55, '#2f3131');
    f.multiplyMatrices(frame, m.makeTranslation(0, 1.35, 0.45));
    boiler.matrixAutoUpdate = false;
    boiler.matrix.copy(f);
    boiler.matrixWorldNeedsUpdate = true;
  }
  function drawTarp() {
    if (tarp >= 1) return;
    // Sagging ridges over each vehicle; the tarp slides off sideways and slumps.
    const off = tarp * 3.2,
      slump = tarp * tarp * 1.6;
    for (const [z, y, w, h, d] of [
      [PARK.wagon + PARK.gap + 1, RAIL + 3.05, 2.2, 0.18, 1.9],
      [PARK.wagon + PARK.gap, RAIL + 1.65, 2.6, 0.6, 3.6],
      [PARK.wagon, RAIL + 0.75, 2.8, 0.55, 3.3],
    ] as const) {
      const pt = stallPoint(off, z);
      batch.box(pt.x, y - slump, pt.z, w, h * (1 - tarp * 0.6), d, '#87968b', STALL_YAW, 0, tarp * 0.6);
    }
  }
  /** The deck's yaw: the shunt's choreography while it runs (the deck carrying the wagon round), else the accepted
   * table's stop, eased at a quarter turn per TURN_S. */
  function drawTable(dt: number) {
    const target = deckK === null ? yaws[shed(wd).table]! : yaws[0]! + turnBy * deckK;
    const d = wrap(target - tableYaw);
    // Following the choreography it lands exactly; off it (a deck left turned before the cradle was fitted), it catches up.
    const step = (deckK === null ? Math.PI / 2 / TURN_S : Math.PI) * dt;
    const was = tableTurning;
    // Within the choreography the turn is its own phase, so the clank and the landing thump play once each.
    tableTurning = deckK === null ? Math.abs(d) > 0.002 : (deckK > 0 && deckK < 1) || Math.abs(d) > 0.05;
    if (tableTurning) {
      tableYaw += Math.abs(d) < 0.05 && deckK !== null ? d : Math.sign(d) * Math.min(Math.abs(d), step);
      if (!was) clank(table.x, table.z);
    } else if (was) {
      tableYaw = target;
      thump(table.x, table.z);
      clank(table.x, table.z);
    }
    // The garage turns the bridge with its works copy (the garage's camera pose, the show-off turn); the accepted
    // table and the prompts keep `tableYaw`.
    const drawn = garageView.deckYaw() ?? tableYaw;
    // The bridge's rails at the yard track's gauge and height (./yard-track.ts: a metre apart, heads 0.235 over the
    // rail height), a hand short of the rim at each end, so the spur and the stall road run straight on.
    for (const side of [-1, 1]) {
      const ox = Math.cos(drawn) * side * 0.5,
        oz = -Math.sin(drawn) * side * 0.5;
      batch.box(table.x + ox, tableY + 0.1675, table.z + oz, 0.1, 0.135, R * 2 - 0.1, '#4c5058', drawn);
    }
    batch.box(table.x, tableY + 0.05, table.z, 1.5, 0.1, R * 2 - 0.3, '#5c5046', drawn);
    // A handle on the rim that travels with the disc: what you turn.
    const hx = table.x + Math.sin(drawn + Math.PI / 2) * (R - 0.4),
      hz = table.z + Math.cos(drawn + Math.PI / 2) * (R - 0.4);
    batch.box(hx, tableY + 0.55, hz, 0.16, 1, 0.16, BRASS);
  }
  /**
   * Where the wagon and shunter stand and how far the deck has turned, from `ready` and the mover clock alone (so a
   * reload or a late joiner lands in the same pose). The roll-out, `rollTicks` up to `ready`: the shunter pushes the
   * wagon onto the deck, the deck turns with both on it, and it pushes the wagon off to its wait on line 2. Then, over
   * BACK_TICKS, the shunter backs onto the deck alone, the deck turns back to the stall road and it reverses home.
   * k is null before the roll-out, when the deck follows the accepted table.
   */
  function shuntTargets(tick: number): { wagon: number; shunter: number; k: number | null; hidden: boolean } {
    const sh = shed(wd),
      hidden = trains(wd).some((r) => r.wagon);
    const home = PARKED_A - PARK.gap,
      seated = TABLE_A + PARK.gap / 2; // the wagon's centre on the deck, the shunter's as far behind the middle
    if (sh.ready < 0) return { wagon: PARKED_A, shunter: home, k: hidden ? 0 : null, hidden };
    const phase = (u: number, from: number, to: number) => smooth(Math.min(1, Math.max(0, (u - from) / (to - from))));
    /** From `a0` to `a1` over `from`..`to`; by way of `cusp`, coming to rest there before it reverses. */
    const run = (u: number, from: number, to: number, a0: number, a1: number, cusp: number) => {
      const split = from + ((to - from) * Math.abs(cusp - a0)) / (Math.abs(cusp - a0) + Math.abs(a1 - cusp));
      return u < split ? a0 + (cusp - a0) * phase(u, from, split) : cusp + (a1 - cusp) * phase(u, split, to);
    };
    const cuspA = shunt.cuspA;
    // The shunter turns back where it sat on the deck on the way out.
    const deckStop = TABLE_A - PARK.gap / 2;
    const u = (tick - (sh.ready - WORKS.rollTicks)) / WORKS.rollTicks;
    if (u < 1) {
      const a =
        u < ROLL.turn[0]
          ? PARKED_A + (seated - PARKED_A) * phase(u, 0, ROLL.turn[0])
          : run(u, ROLL.turn[1], 1, seated, OUT_A, cuspA);
      return { wagon: a, shunter: a - PARK.gap, k: phase(u, ROLL.turn[0], ROLL.turn[1]), hidden };
    }
    const v = (tick - sh.ready) / BACK_TICKS,
      out = OUT_A - PARK.gap;
    const shunter =
      v < BACK.turn[0]
        ? run(v, 0, BACK.turn[0], out, deckStop, cuspA - PARK.gap)
        : deckStop + (home - deckStop) * phase(v, BACK.turn[1], 1);
    return { wagon: OUT_A, shunter, k: 1 - phase(v, BACK.turn[0], BACK.turn[1]), hidden };
  }
  const smooth = (u: number) => u * u * (3 - 2 * u);
  let hidden = false,
    puffs = 0,
    shownTick = -Infinity,
    shownReady = -1;
  /** The room clock as the shunt shows it. It runs at real time, leaning at most half a step toward the room clock
   * (`tickNow`), so a correction (an RTT probe settling) slows or hurries the wagon instead of sending it back and
   * forth; it never runs backwards. A `ready` that changes live starts it at the turn's own tick (`ready − rollTicks`),
   * so the roll-out starts from the parked pose whatever the clock says. More than 10 s adrift, or on a restore, it
   * snaps to the room clock. */
  function shuntClock(dt: number, snapTo: boolean) {
    const now = adapter.read.tickNow(),
      step = dt * TICKS_PER_S,
      ready = shed(wd).ready;
    if (snapTo || !Number.isFinite(shownTick) || Math.abs(now - shownTick) > 10 * TICKS_PER_S) shownTick = now;
    else if (ready !== shownReady && ready >= 0) shownTick = Math.min(now, ready - WORKS.rollTicks);
    else shownTick += step * (1 + Math.min(0.5, Math.max(-0.5, (now - shownTick) / 20)));
    shownReady = ready;
    return shownTick;
  }
  function drawShunt(dt: number, snapTo: boolean) {
    const t = shuntTargets(shuntClock(dt, snapTo));
    deckK = t.k;
    if (snapTo) {
      wagonA = t.wagon;
      shunterA = t.shunter;
    } else {
      // The clock drives the pose frame by frame (so the vehicles stay seated on the turning deck); a jump (a
      // cancelled roll-out) eases home at a walking pace rather than snapping.
      const ease = (from: number, to: number) => {
        const d = to - from;
        return Math.abs(d) < 0.5
          ? to
          : from + Math.sign(d) * Math.min(Math.abs(d), Math.max(1.6 * dt, Math.abs(d) * dt * 6));
      };
      const moving = Math.abs(t.shunter - shunterA) > 0.05;
      wagonA = ease(wagonA, t.wagon);
      shunterA = ease(shunterA, t.shunter);
      if (moving) {
        puffs += dt * 3;
        while (puffs >= 1) {
          puffs--;
          centreAt(shunterA, true, p);
          chuff(p.x, p.z, 0.3);
          emit({
            x: p.x,
            y: p.y + 3.2,
            z: p.z,
            vx: 0.3,
            vy: 1.4,
            vz: 0,
            life: 2,
            size: 0.3,
            color: new THREE.Color('#ece8e0'),
            alpha: 0.4,
            drag: 0.5,
            grow: [1, 3],
            fade: 0.6,
          });
        }
      }
    }
    hidden = t.hidden;
    const wagonFrame = vehicleFrame(wagonA, new THREE.Matrix4());
    if (!hidden) drawWagon(wagonFrame);
    const shunterFrame = vehicleFrame(shunterA, new THREE.Matrix4(), true);
    drawShunter(shunterFrame);

    // The parked wagon is something to stand on, in the stall or waiting on line 2.
    const parkedNow = !hidden && (Math.abs(wagonA - PARKED_A) < 0.02 || Math.abs(wagonA - OUT_A) < 0.02);
    const at = parkedNow ? wagonA : NaN;
    if (wagonBody && at !== wagonBodyAt) {
      owner.removeBody(wagonBody);
      wagonBody = null;
    }
    if (parkedNow && !wagonBody) {
      wagonFrame.decompose(p, q, s);
      p.y += 0.3;
      wagonBody = addStatic({ kind: 'box', hx: 1.1, hy: 0.2, hz: 1.6 }, p, q.clone(), undefined, owner);
      wagonBodyAt = at;
    }
  }
  function drawLowering(dt: number) {
    for (let i = lowering.length - 1; i >= 0; i--) {
      const l = lowering[i]!;
      l.t += dt;
      const u = Math.min(1, l.t / 0.65);
      const to = new THREE.Vector3();
      if (l.site === 0) socketFrame(l.slot, m).decompose(to, q, s);
      else {
        vehicleFrame(wagonA, f);
        m.multiplyMatrices(f, m.makeTranslation(0, 0.63, l.slot ? 0.8 : -0.8));
        m.decompose(to, q, s);
      }
      // Up off the back, over, and lowered gently into place.
      const lift = Math.sin(Math.min(1, u * 1.4) * Math.PI) * 0.9;
      p.lerpVectors(l.from, to, smooth(u));
      footingFrame(m, p.x, p.y + lift, p.z, STALL_YAW, (1 - u) * 0.4);
      footingParts(batch, m);
      if (u >= 1) {
        lowering.splice(i, 1);
        thump(to.x, to.z);
        clank(to.x, to.z);
        dustRing(to.x, to.y + 0.1, to.z, 10, 1.4, 0.3);
      }
    }
  }
  function solidSlab(shut: boolean) {
    if (!shut && slabBody) {
      owner.removeBody(slabBody);
      slabBody = null;
    }
    if (shut && !slabBody) {
      const b = STALL_SLAB;
      slabBody = addStatic(
        { kind: 'box', hx: b.w / 2, hy: b.h / 2, hz: b.d / 2 },
        { x: b.x, y: b.y, z: b.z },
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), b.yaw).clone(),
        undefined,
        owner,
      );
    }
  }
  function snap() {
    wd = adapter.read.world();
    later.clear();
    slabOpen = !!(worksRow(wd).seams & SEAM_STALL);
    solidSlab(!slabOpen);
    pop = -1;
    build = shed(wd).stall >= WORKS.stall ? 1 : 0;
    tarp = build;
    builtShown = build >= 1;
    fittedShown = shed(wd).fitted >= 0;
    tableTurning = false;
    lowering.length = 0;
    bolts.length = 0;
    socketKey = '';

    lastCradle = shed(wd).cradle;
    lastRails = shed(wd).cradleRails;
    const t = shuntTargets(shuntClock(0, true));
    wagonA = t.wagon;
    shunterA = t.shunter;
    deckK = t.k;
    tableYaw = deckK === null ? yaws[shed(wd).table]! : yaws[0]! + turnBy * deckK;
    garageView.restore();
  }
  snap();
  const avatarBack = (pid: string, out: THREE.Vector3) => {
    const a =
      pid === adapter.read.pid ? me.avatar : [...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar;
    if (!a) return false;
    out.copy(a.position);
    out.y += 1.3;
    return true;
  };
  const stallAt = { x: SHED_STALL.x / 100, z: SHED_STALL.z / 100 };
  return {
    restore: snap,
    update(dt: number) {
      later.update(dt);
      wd = adapter.read.world();
      garageView.update(dt, roomFacts(wd));
      const sh = shed(wd);
      const open = !!(worksRow(wd).seams & SEAM_STALL);
      if (open && !slabOpen && pop < 0) solidSlab(false);
      if (!open && slabOpen) {
        pop = -1;
        solidSlab(true);
      }
      slabOpen = open;
      // Cradle pieces arriving (your prediction, or someone's accepted fitting) bolt on one by one.
      for (let k = lastCradle; k < Math.min(2, sh.cradle); k++) bolts.push({ k, t: 0 });
      for (let k = lastRails; k < Math.min(8, sh.cradleRails); k++)
        bolts.push({ k: 2 + k, t: -(k - lastRails) * 0.12 });
      lastCradle = sh.cradle;
      lastRails = sh.cradleRails;

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i]!;
        const before = b.t;
        b.t += dt;
        if (before < 0.28 && b.t >= 0.28) {
          const c = stallPoint(0, PARK.wagon);
          clank(c.x, c.z);
        }
        if (b.t > 0.4) bolts.splice(i, 1);
      }
      if (sh.fitted >= 0 && !fittedShown) {
        fittedShown = true;
        // The brass cradle: a bright chord of clanks and a lift of gold motes off the wagon.
        const c = stallPoint(0, PARK.wagon);
        clank(c.x, c.z);
        later.after(0.15, () => clank(c.x, c.z));
        later.after(0.3, () => placeSound('boxRare', c.x, c.z));
        for (let i = 0; i < 18; i++)
          emit({
            x: c.x + (Math.random() - 0.5) * 2.2,
            y: 19.2 + Math.random() * 0.8,
            z: c.z + (Math.random() - 0.5) * 3,
            vx: 0,
            vy: 0.8 + Math.random() * 0.8,
            vz: 0,
            life: 1.6,
            size: 0.07,
            color: gold,
            intensity: readableIntensity() * 1.6,
            alpha: 0.9,
            shrink: 0.5,
            fade: 0.6,
            shape: 'glint',
          });
      }
      if (sh.fitted < 0) fittedShown = false;
      if (build >= 1 && tarp < 1) {
        const was = tarp;
        tarp = Math.min(1, tarp + dt / TARP_S);
        if (was === 0) {
          const c = stallPoint(0, 0);
          placeSound('beamScrape', c.x, c.z);
        }
      } else if (build <= 0) tarp = 0;
      drawSocketGhosts();
      batch.begin();
      drawSlab(dt);
      drawSockets();
      drawLowering(dt);
      drawFrame(dt);
      drawTarp();
      drawShunt(dt, false); // first: it sets the deck's turn
      drawTable(dt);
      batch.commit();
    },
    accepted(e: RailwayAccepted) {
      wd = adapter.read.world();
      if (e.op === 'rail.strike' && e.id === 0) {
        const delay = e.pid === adapter.read.pid ? deps.contactIn(0) : 0;
        solidSlab(false);
        slabOpen = true;
        pop = 0;
        popDelay = delay + 0.07;
        const b = STALL_SLAB;
        later.after(delay + 0.07, () => {
          placeSound('rockBreak', b.x, b.z);
          thump(b.x, b.z);
          clank(b.x, b.z);
          chips(b.x, b.y, b.z, 18, FLOOR, undefined, true, 1.4);
          dustRing(b.x, FLOOR + 0.1, b.z, 18, 2.8, 0.5, 1, 1.3);
        });
        later.after(delay + 0.8, () => {
          thump(b.x, b.z);
          dustRing(b.x, FLOOR + 0.1, b.z, 12, 2, 0.4);
        });
      }
      if (e.op === 'rail.footSet' && (e.site === 0 || e.site === 1)) {
        const from = new THREE.Vector3();
        if (!avatarBack(e.pid, from)) return;
        const slot = e.site === 0 ? Math.max(0, shed(wd).stall - 1) : Math.max(0, shed(wd).cradle - 1);
        lowering.push({ site: e.site, slot, from, t: 0 });
      }
      if (e.op === 'rail.turn') clank(table.x, table.z);
      if (e.op === 'rail.install')
        // The room's moment, on every page from the accepted install (never a restore or a late join): at the table
        // or in the garage it is the part going on; a page away from both gets the banner as its note.
        playSharedMoment('longer boiler', e, adapter.read.pid, (mine) => {
          const pos = me.body?.position;
          const away = !pos || Math.hypot(pos.x - table.x, pos.z - table.z) > BANNER_BEYOND;
          if (away && !garageView.isOpen()) showMomentBanner(BANNER[0], BANNER[1], 4.5);
          garageView.accepted(mine);
          return false;
        });
    },
    corrected(c: RailwayCorrection) {
      const e = c.event;
      if (e.op === 'rail.footSet') lowering.length = 0;
      if (e.op === 'rail.turn') asked = null;
      if (e.op === 'rail.install') garageView.denied();
    },
    targets(): Interactable[] {
      const pos = me.body?.position;
      if (!adapter.read.ready() || !pos) return [];
      wd = adapter.read.world();
      const mine = account(wd, adapter.read.pid),
        sh = shed(wd),
        out: Interactable[] = [];
      const nearStall =
        Math.hypot(pos.x - stallAt.x, pos.z - stallAt.z) <= SHED_STALL.reach / 100 - 0.4 &&
        Math.abs(pos.y - SHED_STALL.y / 100) <= 2.6;
      // The garage's post, offered in every state. It keeps the reach test (2.6 m of the post,
      // inside the server's 6 m of the table less 0.4 m), and the player is held while the garage is open, so every
      // Install hold is sent from inside the reach.
      if (
        !garageView.isOpen() &&
        Math.hypot(pos.x - garagePost.x, pos.z - garagePost.z) <= 2.6 &&
        Math.hypot(pos.x - anchor.x, pos.z - anchor.z) <= SHED_TABLE.reach / 100 - 0.4 &&
        Math.abs(pos.y - SHED_TABLE.y / 100) <= 2.6
      ) {
        const facts = roomFacts(wd);
        if (facts.boilerFitted && (facts.tableBusy || garageView.standing()))
          out.push({
            id: 'railway-garage',
            verb: facts.tableBusy ? 'The table’s busy' : 'Look at the engine',
            at: new THREE.Vector3(garagePost.x, tableY + 1.7, garagePost.z),
            ...(facts.tableBusy ? { blocked: 'The table’s busy' } : { run: () => garageView.open() }),
          });
      }
      if (nearStall && mine?.foot && worksRow(wd).seams & SEAM_STALL) {
        if (sh.stall < WORKS.stall) {
          const sp = STALL_SOCKETS[sh.stall]!;
          out.push({
            id: 'railway-foot-set-0',
            verb: 'Set the footing',
            at: new THREE.Vector3(sp.x, FLOOR + 1.6, sp.z),
            run: () => void adapter.setFooting(0),
          });
        } else if (sh.cradle < WORKS.cradle && !trains(wd).some((r) => r.wagon)) {
          const c = stallPoint(0, PARK.wagon);
          out.push({
            id: 'railway-foot-set-1',
            verb: 'Set the footing',
            at: new THREE.Vector3(c.x, 20.6, c.z),
            run: () => void adapter.setFooting(1),
          });
        }
      }
      if (nearStall && sh.stall >= WORKS.stall && (mine?.rails ?? 0) > 0 && sh.cradleRails < WORKS.cradleRails) {
        const c = stallPoint(0, PARK.wagon);
        out.push({
          id: 'railway-cradle',
          verb: 'Fit the cradle',
          at: new THREE.Vector3(c.x, 20.4, c.z),
          run: () => void adapter.fitCradle(),
        });
      }
      // The table: offered once the stall stands and the cradle is fitted (the sim refuses a turn before; owner,
      // 10 November: only when ready), while it is still, and never once the wagon is commissioned: the shunter's
      // choreography owns the deck from then on (not a toy after the wagon leaves).
      // A press waits for the server's answer (`asked`); the deck turns only with the accepted roll-out.
      if (asked && (sh.table === asked.to || performance.now() >= asked.until)) asked = null;
      if (
        sh.stall >= WORKS.stall &&
        sh.fitted >= 0 &&
        sh.ready < 0 &&
        !tableTurning &&
        !asked &&
        Math.hypot(pos.x - anchor.x, pos.z - anchor.z) <= SHED_TABLE.reach / 100 - 0.6 &&
        Math.abs(pos.y - SHED_TABLE.y / 100) <= 2.6
      ) {
        const to = (1 - sh.table) as 0 | 1;
        const hx = table.x + Math.sin(tableYaw + Math.PI / 2) * (R - 0.4),
          hz = table.z + Math.cos(tableYaw + Math.PI / 2) * (R - 0.4);
        out.push({
          id: 'railway-turn',
          verb: 'Turn the table',
          at: new THREE.Vector3(hx, tableY + 1.4, hz),
          run: () => {
            if (adapter.turnTable(to, sh.tableRev)) {
              asked = { to, until: performance.now() + 4000 };
              clank(hx, hz); // the handle's throw, on the press
            } else uiSound('deny');
          },
        });
      }
      return out;
    },
    inspect: () => {
      const w = new THREE.Vector3();
      centreAt(wagonA, false, w);
      return {
        garageView: { ...garageView.inspect(), here: true, post: garagePost, deckYaw: garageView.deckYaw() },
        slab: !slabOpen,
        slabSolid: !!slabBody,
        socketGhosts: socketGhosts.count,
        stall: { set: shed(wd).stall, frame: build, tarp },
        cradle: { seats: shed(wd).cradle, rails: shed(wd).cradleRails, fitted: shed(wd).fitted >= 0 },
        table: { state: shed(wd).table, yaw: tableYaw, turning: tableTurning, pending: asked?.to ?? null, k: deckK },
        wagon: {
          x: w.x,
          y: w.y,
          z: w.z,
          at: hidden
            ? 'train'
            : Math.abs(wagonA - PARKED_A) < 0.05
              ? 'stall'
              : Math.abs(wagonA - OUT_A) < 0.05
                ? 'line2'
                : 'rolling',
          along: wagonA,
          onTable: Math.abs(wagonA - TABLE_A) < 2,
          solid: !!wagonBody,
        },
        shunter: { along: shunterA, tick: adapter.read.tickNow(), shown: shownTick, ready: shed(wd).ready },
      };
    },
  };
}
