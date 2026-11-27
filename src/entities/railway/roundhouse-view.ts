// The Roundhouse, live from accepted state: a rotunda of finished bays round the table (./rotunda-view.ts), which
// stand by stage (./rotunda-stage.ts). In its working bay the cracked slab opens on a strike, two footings raise the
// bay's door piers and the tarp slides off the shunter and wagon, the cradle bolts on, and the table's bridge turns
// for the shunter to push the wagon onto line 2. Local view: effects play on the press, accepted events and live
// edges, and restore snaps them; the shunt's pose comes only from `shed.ready` and the adapter's mover clock.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted, RailwayCorrection } from '../../adapters/railway-effects.ts';
import { LINE2 } from '../../sim/railway-lines.ts';
import { isTradeRefusal, type TradeRefusal } from '../../sim/railway.ts';
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
import { WORKS, SHED_STALL, SHED_TABLE } from '../../sim/railway-works-layout.ts';
import { SEAM_STALL } from '../../sim/railway-works.ts';
import {
  STALL_SLAB,
  SLAB_Z,
  PIER,
  STALL_RAIL,
  RAIL_HEAD,
  SHUNT,
  TABLE_RAIL,
  rimCut,
  STALL_SOCKETS,
  STALL_YAW,
  stallPoint,
  box,
  type WorksBox,
} from './works-shape.ts';
import { drawWorksBoxes, createBoxBatch, createLater, footingFrame, footingParts, FOOTING } from './works-box-view.ts';
import { createGhostOutlines } from '../../render/ghost-outline.ts';
import { createGarageView } from './garage-view.ts';
import { garageFacts, roomFacts } from './garage-state.ts';
import type { RoomFacts } from './garage-data.ts';
import level from '../../../content/built/levels/rotunda-home.json' with { type: 'json' };
import { playSharedMoment } from './shared-moment.ts';
import { showMomentBanner } from '../../ui/moment-banner.ts';
import { garageRow, mastFrom, polarAt } from './garage-geo.ts';
import { PARK, createShuntPath, shuntTargets } from './shunt-path.ts';
import { account, shed, trains, works as worksRow, type ReadWorld } from '../../sim/railway-rows.ts';
import { ROTUNDA_BLOCK, ROTUNDA_KIT } from '../../place/rotunda.ts';
import { bayCopies, createRotundaView } from './rotunda-view.ts';
import { BRIDGE, bridgeHalf, bridgeHandle, clearOfBridge, tableYaws } from './table-bridge.ts';
import { createTableRide } from './railhead-state.ts';
import { siteExit } from '../../place/site-clearance.ts';
import { outOf } from '../../place/sites.ts';
import { rotundaServing, rotundaStage } from './rotunda-stage.ts';
import { bayFrame, rotundaBays } from '../../place/rotunda.ts';
import { cameraHeld } from '../../render/buddy-frame.ts';
import { inputState } from '../../player/input-state.ts';
import { reducedMotion } from '../../constants.ts';

/** A refused install lowers the part and explains a trade hold. A refused bring wakes the chips. */
const refusedAtTable = (
  op: string,
  view: { denied(reason?: TradeRefusal): void; bringDenied(): void },
  reason?: string,
) => {
  if (op === 'rail.install') view.denied(reason && isTradeRefusal(reason) ? reason : undefined);
  else if (op === 'rail.bring') view.bringDenied();
};

/** Seconds: the door piers' build, the tarp's slide, the table's quarter turn. */
const BUILD_S = 3,
  TARP_S = 1.1,
  TURN_S = 2;
const FLOOR = 18.05,
  RAIL = STALL_RAIL;
/** Rule ticks per second (the railway sim runs at 10 Hz, as cart-view.ts says). */
const TICKS_PER_S = 10;
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
  const [{ addStatic, H }, layout, home] = await Promise.all([
    import('../../place/land.ts'),
    import('../../place/layout.ts'),
    import('../../place/home-station.ts'),
  ]);
  const toWorld = (p: { x: number; z: number }) => ({ x: p.x + layout.ORIGIN.x, z: p.z });
  const boxes: WorksBox[] = [];
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

  // ---------------------------------------------------------------- the turntable: the pit and its kerb are the
  // rotunda's fixed table record; the bridge across the shallow pit is drawn here, since it turns
  // Garage step 4: the works copies off the table stand in their bays, drawn with the engine's own parts.
  const rotunda = createRotundaView(owner, await import('./engine-kit.ts'), { site: home.ROTUNDA_HOME, level });
  const anchor = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
  const table = toWorld(home.TABLE);
  const tableY = TABLE_RAIL;
  const R = home.TABLE.r;
  /** The deck's two rests: on the open stall's road and down the spur (./table-bridge.ts). */
  const yaws = tableYaws();
  /** The bridge's deck and where its handle stands when the deck's yaw is `yaw` (./table-bridge.ts, which the turn's
   * cue reads too). */
  const DECK = BRIDGE;
  const handleAt = (yaw: number) => bridgeHandle(table, R, yaw);

  // The train garage: the works copy stands on the table after coupling; the lever post opens its framed view.
  // Local: nothing is sent or saved. Every Install hold starts inside the server's reach.
  const garageGeo = garageRow().geo;
  const garagePost = polarAt(table, garageGeo.post);
  // The post, jib, stand and crew stand on the yard's ground beside the table, 0.3 m under the deck's rail height
  // (at the deck's height the empty stand's legs and the mast hung in the air).
  const garageStand = polarAt(table, garageGeo.stand);
  const garageGround = H(garageStand.x, garageStand.z);
  const garageView = await createGarageView(
    owner,
    { table, y: tableY, post: garagePost, ground: garageGround },
    // The mast is measured from the deck: it is taller by the deck's height over the yard, so the arm stays where it
    // reaches the engine's seat and clears a boiler held up under it.
    { ...garageGeo, mast: mastFrom(garageGeo, tableY, garageGround) },
    {
      // The deck is at rest when no choreography turns it, it is not catching up, and the shunter is home in the stall.
      restYaw: () =>
        (deckK === null || deckK <= 0) && !tableTurning && Math.abs(shunterA - (PARKED_A - PARK.gap)) < 0.05
          ? tableYaw
          : null,
      install: (line, rev, part) =>
        line === LINE2 ? adapter.installBoiler(rev, part) : adapter.installPart(line, part, rev),
      bring: (line, rev) => adapter.bringLine(line, rev),
      installHere: true,
      online: () => adapter.read.ready(),
    },
  );
  owner.cleanup(garageView.dispose);
  // The install is not predicted, so a refusal is no correction: the adapter says so directly and the part lowers.
  owner.cleanup(
    adapter.onRefused((r) => {
      refusedAtTable(r.intent.op, garageView, r.reason);
    }),
  );

  // ---------------------------------------------------------------- the shunt path: stall, door, table, line 2
  // Pure geometry (./shunt-path.ts): the stall road at the heights it is drawn at, the deck's turn, the spur, road 2.
  const path = createShuntPath();
  const { PARKED_A, TABLE_A, OUT_A, turnBy, ...shuntPath } = path;
  // The deck carries what stands on it (works-late-game step 5). `deckK` is the turn done (0..1) while the
  // choreography runs, null while the deck waits on road 0 for the upgrade and its hold.
  const wrap = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
  let deckK: number | null = null;
  /** A vehicle's centre at its own distance: the wagon's, or the shunter's (`PARK.gap` behind the wagon's). */
  const centreAt = (a: number, shunter: boolean, out: THREE.Vector3) =>
    shunter ? shuntPath.pairAt(a + PARK.gap, -PARK.gap, deckK, out) : shuntPath.pairAt(a, 0, deckK, out);

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
  let facts: RoomFacts = garageFacts(adapter.read);
  let slabBody: Body | null = null,
    wagonBody: Body | null = null,
    wagonBodyAt = NaN,
    deckBodyYaw = NaN,
    deckDrawn = NaN;
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
  let stageShown = 0;
  let stageRise: { from: number; to: number; seconds: number } | null = null;
  const deckBodies: Body[] = [];
  const ride = createTableRide(owner, table, R, tableY + 0.05);
  const lowering: { site: 0 | 1; slot: number; from: THREE.Vector3; t: number }[] = [];
  const bolts: { k: number; t: number }[] = []; // cradle pieces dropping on: k < 2 seats, else rail arms
  const m = new THREE.Matrix4(),
    f = new THREE.Matrix4(),
    p = new THREE.Vector3(),
    q = new THREE.Quaternion(),
    s = new THREE.Vector3(),
    e = new THREE.Euler(0, 0, 0, 'YXZ');
  const gold = new THREE.Color('#ffdc7a');

  /** The working bay's door frame in build order, bay-local: the two door piers on the set footings, then the lintel
   * over the door (the kit's sizes). When they stand, the rotunda's first stage stands with them: the bay's own shell
   * has the same piers, so these stop being drawn. */
  const pierW = 2 * (PIER.x - ROTUNDA_KIT.door.clear / 2),
    over = ROTUNDA_BLOCK.wall - ROTUNDA_KIT.door.high;
  const FRAME: [x: number, y: number, z: number, w: number, h: number, d: number, roll: number][] = [
    [-PIER.x, 18 + ROTUNDA_BLOCK.wall / 2, PIER.z, pierW, ROTUNDA_BLOCK.wall, ROTUNDA_BLOCK.reveal, 0],
    [PIER.x, 18 + ROTUNDA_BLOCK.wall / 2, PIER.z, pierW, ROTUNDA_BLOCK.wall, ROTUNDA_BLOCK.reveal, 0],
    [0, 18 + ROTUNDA_KIT.door.high + over / 2, PIER.z, ROTUNDA_KIT.door.clear, over, ROTUNDA_BLOCK.reveal, 0],
  ];
  function snapStage(stage: number) {
    stageRise = null;
    stageShown = stage;
    rotunda.show(stage, rotundaServing(wd));
  }
  function stageDust(from: number, to: number) {
    const before = rotundaBays(home.ROTUNDA_HOME, from);
    for (const bay of rotundaBays(home.ROTUNDA_HOME, to)) {
      if (before.includes(bay)) continue;
      const at = toWorld(bayFrame(home.ROTUNDA_HOME, bay).door);
      clank(at.x, at.z);
      dustRing(at.x, FLOOR + 0.1, at.z, 18, 3, 0.5);
    }
  }
  function drawStage(dt: number) {
    rotunda.occupy(rotundaServing(wd));
    rotunda.copies(bayCopies(facts));
    const target = rotundaStage(wd);
    // A restore goes through snap(); a rollback cancels the local rise. Opening the garage settles it before
    // the install's first frame. Steel arrives from a server tick, so its live row edge has no action receipt.
    if (target < (stageRise?.to ?? stageShown) || garageView.isOpen() || reducedMotion) {
      snapStage(target);
      return;
    }
    if (cameraHeld() || inputState.held || garageView.momentPlaying() || build < 1) return;
    if (!stageRise && target > stageShown) {
      stageRise = { from: stageShown, to: stageShown + 1, seconds: 0 };
      stageDust(stageRise.from, stageRise.to);
    }
    if (!stageRise) return;
    stageRise.seconds = Math.min(BUILD_S, stageRise.seconds + dt);
    const u = stageRise.seconds / BUILD_S;
    rotunda.rise(stageRise.to, smooth(u));
    if (u >= 1) {
      stageDust(stageRise.from, stageRise.to);
      snapStage(stageRise.to);
    }
  }
  const frameFrom = (k: number) => k / FRAME.length;
  function drawFrame(dt: number) {
    const prior = build;
    const target = shed(wd).stall >= WORKS.stall ? 1 : 0;
    if (build < target && !cameraHeld() && !inputState.held) build = Math.min(target, build + dt / BUILD_S);
    else if (build > target) build = Math.max(target, build - dt / 0.6);
    if (stageShown >= 1) return;
    FRAME.forEach(([x, y, z, w, h, d, roll], k) => {
      const start = frameFrom(k),
        span = 1 / FRAME.length;
      const u = Math.min(1, Math.max(0, (build - start) / span));
      if (u <= 0) return;
      // Each piece drops in from above and lands (Place's physical build, never a scale).
      const drop = (1 - u * u) * 3;
      const pt = stallPoint(x, z);
      batch.box(pt.x, y + drop, pt.z, w, h, d, '#cfc8ba', STALL_YAW, 0, roll);
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
        doorZ = SLAB_Z,
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
      // Rubble inside the open door, either side of the road and clear of the vehicles on it.
      for (const k of [-1, 1])
        for (let i = 0; i < 3; i++) {
          const pt = stallPoint(k * (1.95 + i * 0.1), SLAB_Z + 0.8 + i * 0.45);
          batch.box(pt.x, FLOOR + 0.2, pt.z, 0.9 - i * 0.2, 0.45 - i * 0.08, 0.8, '#8f8a80', i + k);
        }
      return;
    }
    batch.box(b.x, b.y, b.z, b.w, b.h, b.d, '#9a958b', b.yaw);
    // Cracks across the door's outer face.
    for (let i = 0; i < 3; i++) {
      const pt = stallPoint(-0.1 + (i % 2) * 0.22, SLAB_Z - 0.36);
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
  function vehicleFrame(a: number, out: THREE.Matrix4, shunter = false) {
    // Local +z points the way out: the shunter, behind, pushes the wagon ahead of it. The path is the track's rail
    // height: the frame rides over it between its two bogies, heading and pitched along them (./shunt-path.ts).
    const pose = shuntPath.poseAt(a, shunter, deckK);
    return out.compose(p.set(pose.x, pose.y, pose.z), q.setFromEuler(e.set(-pose.pitch, pose.yaw, 0)), s.set(1, 1, 1));
  }
  function drawWagon(frame: THREE.Matrix4) {
    batch.part(frame, 0, SHUNT.wagon.body.y, 0, 2.2, SHUNT.wagon.body.h, SHUNT.wagon.body.d, '#77766b');
    for (const x of [-SHUNT.gauge, SHUNT.gauge])
      for (const z of [-SHUNT.wagon.wheel.z, SHUNT.wagon.wheel.z])
        batch.part(frame, x, SHUNT.wagon.wheel.y, z, 0.25, SHUNT.wagon.wheel.h, SHUNT.wagon.wheel.d, '#3a3c3c');
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
    batch.part(frame, 0, SHUNT.shunter.body.y, 0, 2.2, SHUNT.shunter.body.h, SHUNT.shunter.body.d, '#4e5352');
    // The cab at the back; boiler, chimney and buffer beam forward, toward the wagon it pushes.
    batch.part(frame, 0, 1.75, -1.0, 2, 2.3, 1.4, '#87968b');
    batch.part(frame, 0, 3.0, -1.0, 2.2, 0.16, 1.7, '#4e5352');
    batch.part(frame, 0, 2.15, 1.25, 0.32, 0.8, 0.32, '#3c3f3e');
    batch.part(frame, 0, 0.55, 1.8, 2.3, 0.3, 0.2, '#a33a2c');
    for (const x of [-SHUNT.gauge, SHUNT.gauge])
      for (const z of [-SHUNT.shunter.wheel.z, SHUNT.shunter.wheel.z])
        batch.part(frame, x, SHUNT.shunter.wheel.y, z, 0.25, SHUNT.shunter.wheel.h, SHUNT.shunter.wheel.d, '#2f3131');
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
      [PARK.wagon + PARK.gap + 1, RAIL + SHUNT.ride + 3.05, 2.2, 0.18, 1.9],
      [PARK.wagon + PARK.gap, RAIL + SHUNT.ride + 1.65, 2.6, 0.6, 3.6],
      [PARK.wagon, RAIL + SHUNT.ride + 0.75, 2.8, 0.55, 3.3],
    ] as const) {
      const pt = stallPoint(off, z);
      batch.box(pt.x, y - slump, pt.z, w, h * (1 - tarp * 0.6), d, '#87968b', STALL_YAW, 0, tarp * 0.6);
    }
  }
  /** The deck waits on the stall road through the armed upgrade and its hold. Only the shunt's choreography
   * carries it to road 1, with the wagon aboard, then brings the shunter home. */
  function drawTable(dt: number) {
    const target = yaws[0]! + turnBy * (deckK ?? 0);
    const d = wrap(target - tableYaw);
    // Following the choreography it lands exactly; before it, it rests on road 0.
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
    // rail height), cut on the circle 3 cm inside the rim (`rimCut`): each road's rails stop 3 cm outside it, so a
    // resting deck meets the spur or a stall road across a 6 cm gap square to the road.
    for (const side of [-1, 1]) {
      const ox = Math.cos(drawn) * side * SHUNT.gauge,
        oz = -Math.sin(drawn) * side * SHUNT.gauge;
      batch.box(
        table.x + ox,
        tableY + RAIL_HEAD - 0.135 / 2,
        table.z + oz,
        0.1,
        0.135,
        rimCut(-1) * 2,
        '#4c5058',
        drawn,
      );
    }
    const deckTop = tableY + 0.05,
      deckY = deckTop - DECK.h / 2,
      length = R * 2 - 0.3;
    m.makeRotationY(drawn).setPosition(table.x, deckTop, table.z);
    // Timber deck at 18.35, 16 m overall. Narrow end boards keep the corners inside the r8.15 pit wall.
    batch.part(m, 0, -DECK.h / 2, 0, DECK.w, DECK.h, length, '#665746');
    for (const end of [-1, 1]) batch.part(m, 0, -DECK.h / 2, end * (R - 0.075), 2.8, DECK.h, 0.15, '#665746');
    for (let z = -7.4; z <= 7.4; z += 0.6) {
      batch.part(m, 0, 0.008, z, DECK.w, 0.016, 0.025, '#423f38');
      for (const x of [-SHUNT.gauge, SHUNT.gauge]) batch.part(m, x, 0.025, z, 0.24, 0.05, 0.16, '#697170');
    }
    for (const side of [-1, 1]) {
      const x = side * (DECK.w / 2 - 0.12);
      // Keep steel 2 cm inside the timber's top, outer sides and ends; flush faces fought from above and beside it.
      // The web stops at the flanges' inner faces, so it cannot fight their exposed tops/bottoms either.
      batch.part(m, x, -0.46, 0, 0.18, 0.7, length - 0.04, '#3e505b');
      batch.part(m, x, -0.065, 0, 0.2, 0.09, length - 0.04, '#68757b');
      batch.part(m, x, -0.855, 0, 0.24, 0.09, length - 0.04, '#68757b');
      for (let z = -7.1; z <= 7.1; z += 1.4) {
        batch.part(m, x + side * 0.11, -0.45, z, 0.07, 0.72, 0.11, '#647178');
        for (const y of [-0.16, -0.74]) batch.part(m, x + side * 0.155, y, z, 0.04, 0.055, 0.055, '#a59470');
      }
      // Short handrails leave both bridge ends and the central viewing/crossing area open.
      for (const end of [-1, 1]) {
        for (const z of [end * 4.8, end * 6.6]) batch.part(m, x, 0.47, z, 0.09, 0.94, 0.09, '#3e505b');
        batch.part(m, x, 0.94, end * 5.7, 0.1, 0.1, 1.9, '#a59470');
      }
    }
    // A handle on the bridge's end that travels with it: what you turn.
    const handle = handleAt(drawn);
    batch.box(handle.x, tableY + 0.6, handle.z, 0.16, 1, 0.16, BRASS, drawn);
    // The deck is solid where it rests; for a turn its boxes go (a turning deck would shove whoever is in the pit), and
    // whoever stands on it rides it round instead (./railhead-state.ts, createTableRide). They come back at the yaw it
    // stops at; a player inside them then (in the pit under it) is first moved out of its nearest side, at their own
    // height, still in the pit (../../place/site-clearance.ts).
    const still = !tableTurning && drawn === deckDrawn;
    deckDrawn = drawn;
    if (deckBodies.length && (!still || drawn !== deckBodyYaw)) {
      for (const body of deckBodies) owner.removeBody(body);
      deckBodies.length = 0;
    }
    if (still && !deckBodies.length) {
      const parts = [
        { x: 0, z: 0, y: deckY, half: bridgeHalf(R) },
        ...[-1, 1].map((end) => ({
          x: 0,
          z: end * (R - 0.075),
          y: deckY,
          half: { hx: 1.4, hy: DECK.h / 2, hz: 0.075 },
        })),
        ...[-1, 1].map((side) => ({
          x: side * (DECK.w / 2 - 0.12),
          z: 0,
          y: deckTop - 0.45,
          half: { hx: 0.12, hy: 0.45, hz: length / 2 },
        })),
      ];
      const b = me.body;
      if (b && !clearOfBridge(table, R, drawn, deckTop, b.position)) {
        const foot = { x: table.x, z: table.z, c: Math.cos(drawn), s: Math.sin(drawn), hw: DECK.w / 2, hd: R };
        const solids = parts.map((part) => ({ dx: part.x, dy: part.y, dz: part.z, ...part.half }));
        // Out of the deck's sides only, at their own height: stretched along, the foot leaves no way out of its ends
        // (past the end they would be put over the pit's wall onto the kerb).
        const ENDLESS = 50; // m added to the foot's half length: past any side exit, so outOf never picks an end
        const sideways: typeof outOf = (f, at, r) => outOf({ ...f, hd: f.hd + ENDLESS }, at, r);
        const exit = siteExit(b.position, foot, 0, solids, sideways, undefined, 0.05);
        if (exit) b.position.set(exit.x, b.position.y, exit.z);
      }
      for (const part of parts)
        deckBodies.push(
          addStatic(
            { kind: 'box', ...part.half },
            {
              x: table.x + Math.cos(drawn) * part.x + Math.sin(drawn) * part.z,
              y: part.y,
              z: table.z - Math.sin(drawn) * part.x + Math.cos(drawn) * part.z,
            },
            new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), drawn),
            undefined,
            owner,
          ),
        );
      deckBodyYaw = drawn;
    }
    ride.update(drawn, dt);
  }
  /** Where the wagon and shunter stand and how far the deck has turned, from `ready` and the mover clock alone
   * (./shunt-path.ts `shuntTargets`, which the spur's points read too). */
  const shuntAt = (tick: number) => shuntTargets(path, wd, tick);
  const smooth = (u: number) => u * u * (3 - 2 * u);
  let hidden = false,
    puffs = 0,
    shownTick = -Infinity,
    shownReady = -1;
  /** The room clock as the shunt shows it. It runs at real time, leaning at most half a step toward the room clock
   * (`tickNow`), so a correction (an RTT probe settling) slows or hurries the wagon instead of sending it back and
   * forth; it never runs backwards. A `ready` that changes live starts it no later than the roll-out's first tick
   * (`ready − rollTicks`), preserving the upgrade hold and starting from the parked pose even if the receipt is
   * late. More than 10 s adrift, or on a restore, it snaps to the room clock. */
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
    const t = shuntAt(shuntClock(dt, snapTo));
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
    snapStage(rotundaStage(wd));
    fittedShown = shed(wd).fitted >= 0;
    tableTurning = false;
    lowering.length = 0;
    bolts.length = 0;
    socketKey = '';

    lastCradle = shed(wd).cradle;
    lastRails = shed(wd).cradleRails;
    const t = shuntAt(shuntClock(0, true));
    wagonA = t.wagon;
    shunterA = t.shunter;
    deckK = t.k;
    tableYaw = yaws[0]! + turnBy * (deckK ?? 0);
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
      // The room's garage facts, once a frame: the table's garage and the bays' copies read the same.
      facts = garageFacts(adapter.read);
      garageView.update(dt, facts);
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
      drawStage(dt);
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
        playSharedMoment(
          e.part === 1 ? 'upgrade' : e.part >= 5 ? 'trade boiler' : 'longer boiler',
          e,
          adapter.read.pid,
          (mine) => {
            const pos = me.body?.position;
            const away = !pos || Math.hypot(pos.x - table.x, pos.z - table.z) > BANNER_BEYOND;
            if (e.part === 2 && away && !garageView.isOpen()) showMomentBanner(BANNER[0], BANNER[1], 4.5);
            garageView.accepted(mine, e.part);
            return false;
          },
        );
    },
    corrected(c: RailwayCorrection) {
      const e = c.event;
      if (e.op === 'rail.footSet') lowering.length = 0;
      if (e.op === 'rail.turn') asked = null;
      refusedAtTable(e.op, garageView);
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
      // inside the server's 10 m of the table less 0.4 m), and the player is held while the garage is open, so every
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
            at: new THREE.Vector3(garagePost.x, garageGround + 1.7, garagePost.z),
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
      // A press waits for the server's answer (`asked`), then offers the upgrade at the orange garage post.
      // The deck stays on road 0 until the installed upgrade's roll-out carries the wagon round.
      if (asked && (sh.table === asked.to || performance.now() >= asked.until)) asked = null;
      if (
        sh.stall >= WORKS.stall &&
        sh.fitted >= 0 &&
        sh.ready < 0 &&
        sh.table === 0 &&
        !tableTurning &&
        !asked &&
        Math.hypot(pos.x - anchor.x, pos.z - anchor.z) <= SHED_TABLE.reach / 100 - 0.6 &&
        Math.abs(pos.y - SHED_TABLE.y / 100) <= 2.6
      ) {
        const to = (1 - sh.table) as 0 | 1;
        const { x: hx, z: hz } = handleAt(tableYaw);
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
        rotunda: { ...rotunda.inspect(), rise: stageRise ? { ...stageRise } : null },
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
