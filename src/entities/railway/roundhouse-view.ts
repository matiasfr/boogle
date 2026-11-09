// The smallest Roundhouse, live from accepted state: the cracked slab opens on a strike, two footings raise the stall
// frame and the tarp slides off the shunter and wagon, the cradle bolts on, and the table turns for the shunter to push
// the wagon onto line 2. Local view: effects play on the press, accepted events and live edges, and restore snaps
// them; the shunt's pose comes only from `shed.ready` and the adapter's mover clock.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
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
  STALL_SOCKETS,
  STALL_YAW,
  stallPoint,
  beam,
  box,
  type WorksBox,
} from './works-shape.ts';
import { drawWorksBoxes, createBoxBatch, createLater, footingFrame, footingParts } from './works-box-view.ts';

type Inspection = ReturnType<RailwayAdapter['inspect']>;
/** Seconds: the stall frame's build, the tarp's slide, the table's quarter turn. */
const BUILD_S = 3,
  TARP_S = 1.1,
  TURN_S = 2;
const FLOOR = 18.05,
  RAIL = 18.35;
/** Rule ticks per second (the railway sim runs at 10 Hz, as cart-view.ts says). */
const TICKS_PER_S = 10;
/** Along the stall's length (local z): the wagon parks at the door end, the shunter behind it, ready to push. */
const PARK = { wagon: -0.9, gap: 3.6 } as const;
const BRASS = '#c79a3e',
  STEEL = '#7c7c74';

export async function createRailwayRoundhouse(
  adapter: RailwayAdapter,
  owner: OwnedView,
  deps: { contactIn: (id: number) => number },
) {
  const [{ addStatic }, layout] = await Promise.all([
    import('../../proto/place/land.ts'),
    import('../../proto/place/layout.ts'),
  ]);
  const boxes: WorksBox[] = [...STALL_BOXES];
  const part = (x: number, y: number, z: number, w: number, h: number, d: number, colour: `#${string}`) => {
    const p = stallPoint(x, z);
    boxes.push({ ...box(p.x, y, p.z, w, h, d, STALL_YAW), colour, solid: false });
  };
  for (const p of STALL_SOCKETS) {
    boxes.push({ ...box(p.x, 18.05, p.z, 0.9, 0.1, 0.9, STALL_YAW), colour: '#373c3b', solid: false });
    for (const offset of [-0.55, 0.55]) {
      boxes.push({ ...box(p.x + offset, 18.17, p.z, 0.14, 0.24, 1.2), colour: '#a9a395', solid: false });
      boxes.push({ ...box(p.x, 18.17, p.z + offset, 1.2, 0.24, 0.14), colour: '#a9a395', solid: false });
    }
  }
  for (let i = 1; i < STALL_ROAD.length; i++)
    for (const offset of [-0.75, 0.75]) {
      const a = STALL_ROAD[i - 1]!,
        b = STALL_ROAD[i]!;
      const length = Math.hypot(b.x - a.x, b.z - a.z);
      const side = { x: (offset * (b.z - a.z)) / length, z: (-offset * (b.x - a.x)) / length };
      boxes.push({
        ...beam({ x: a.x + side.x, z: a.z + side.z }, { x: b.x + side.x, z: b.z + side.z }, RAIL, 0.12, 0.14),
        colour: '#555b5b',
        solid: false,
      });
    }
  for (let z = -5; z < 5; z += 1) part(0, 18.2, z, 2, 0.15, 0.25, '#827c6e');
  await drawWorksBoxes(owner, boxes);

  // ---------------------------------------------------------------- the turntable (Place's junction disc is not
  // loaded in production: the Roundhouse draws its own at the same place and size)
  const table = { x: SHED_TABLE.x / 100, z: SHED_TABLE.z / 100 };
  const line2 = layout.LINKS[1]!.line;
  const lp = { x: 0, z: 0, ux: 0, uz: 0 };
  const lineAt = (s: number, out: THREE.Vector3) => {
    layout.lineAt(line2, s, lp);
    return out.set(lp.x + layout.ORIGIN.x, layout.railY(line2, s), lp.z);
  };
  const tableY = layout.railY(line2, 0);
  const R = 4.8;
  const rim = STALL_ROAD[0]!;
  const yaws = [Math.atan2(rim.x - table.x, rim.z - table.z), 0];
  layout.lineAt(line2, 0.5, lp);
  yaws[1] = Math.atan2(lp.ux, lp.uz);
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

  // ---------------------------------------------------------------- the shunt path: stall, door, table, line 2
  const pathPts: THREE.Vector3[] = [];
  const back = stallPoint(0, PARK.wagon + PARK.gap + 0.5);
  pathPts.push(new THREE.Vector3(back.x, RAIL, back.z));
  const parked = stallPoint(0, PARK.wagon);
  pathPts.push(new THREE.Vector3(parked.x, RAIL, parked.z));
  const door = stallPoint(0, -4);
  pathPts.push(new THREE.Vector3(door.x, RAIL, door.z));
  pathPts.push(new THREE.Vector3(rim.x, (RAIL + tableY) / 2, rim.z));
  pathPts.push(new THREE.Vector3(table.x, tableY, table.z));
  for (let s = 1; s <= WAGON_S / 100 + 0.01; s += 1)
    pathPts.push(lineAt(Math.min(s, WAGON_S / 100), new THREE.Vector3()));
  if (pathPts.at(-1)!.distanceTo(lineAt(WAGON_S / 100, new THREE.Vector3())) > 0.01)
    pathPts.push(lineAt(WAGON_S / 100, new THREE.Vector3()));
  const cum: number[] = [0];
  for (let i = 1; i < pathPts.length; i++) cum.push(cum[i - 1]! + pathPts[i]!.distanceTo(pathPts[i - 1]!));
  const PARKED_A = cum[1]!; // the wagon's parked place along the path
  const OUT_A = cum.at(-1)!; // its wait on line 2
  const TABLE_A = cum[4]!;
  function pathAt(a: number, out: THREE.Vector3) {
    const d = Math.min(cum.at(-1)!, Math.max(0, a));
    let i = 1;
    while (i < pathPts.length - 1 && cum[i]! < d) i++;
    const u = (d - cum[i - 1]!) / (cum[i]! - cum[i - 1]! || 1);
    out.lerpVectors(pathPts[i - 1]!, pathPts[i]!, Math.min(1, Math.max(0, u)));
    return Math.atan2(pathPts[i]!.x - pathPts[i - 1]!.x, pathPts[i]!.z - pathPts[i - 1]!.z);
  }

  // ---------------------------------------------------------------- moving parts
  const batch = createBoxBatch(owner, 320);
  const boilerGeo = new THREE.CylinderGeometry(0.7, 0.7, 1.7, 10);
  boilerGeo.rotateX(Math.PI / 2);
  const boiler = new THREE.Mesh(boilerGeo, material('stone', { colour: '#687f77' }));
  boilerGeo.dispose();
  boiler.castShadow = true;
  owner.add(boiler);
  const later = createLater();
  let state: Inspection = adapter.inspect();
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
    want: { to: number; until: number } | null = null,
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

  /** Frame pieces in build order, stall-local: two portal posts on the set footings, then the walls and roof. */
  const FRAME: [x: number, y: number, z: number, w: number, h: number, d: number, roll: number][] = [
    [-1.5, 20.45, -3.7, 0.42, 3.9, 0.42, 0],
    [1.5, 20.45, -3.7, 0.42, 3.9, 0.42, 0],
    [0, 22.55, -3.7, 3.8, 0.42, 0.42, 0],
    [-2, 20.2, 0, 0.32, 1.6, 9, 0],
    [2, 20.2, 0, 0.32, 1.6, 9, 0],
    [0, 20.2, 4.5, 4.4, 3.2, 0.3, 0],
    [0, 23.65, 0.3, 0.3, 0.3, 9.6, 0],
    [-1.15, 23.05, 0.3, 2.6, 0.12, 9.6, -0.5],
    [1.15, 23.05, 0.3, 2.6, 0.12, 9.6, 0.5],
  ];
  const frameFrom = (k: number) => k / FRAME.length;
  function drawFrame(dt: number) {
    const prior = build;
    const target = state.shed.stall >= WORKS.stall ? 1 : 0;
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
    const resting = state.shed.stall - lowering.filter((l) => l.site === 0).length;
    for (let k = 0; k < Math.min(2, resting); k++) footingParts(batch, socketFrame(k, m));
  }
  /** The vehicles' local frame at path distance `a` (origin on the rail, +z the way out). */
  function vehicleFrame(a: number, out: THREE.Matrix4) {
    // Local +z points the way out: the shunter, behind, pushes the wagon ahead of it.
    return out.compose(p, q.setFromEuler(e.set(0, pathAt(a, p), 0)), s.set(1, 1, 1));
  }
  function drawWagon(frame: THREE.Matrix4) {
    batch.part(frame, 0, 0.3, 0, 2.2, 0.35, 3.2, '#77766b');
    for (const x of [-0.85, 0.85]) for (const z of [-1, 1]) batch.part(frame, x, 0.05, z, 0.25, 0.5, 0.5, '#3a3c3c');
    const fitted = state.shed.fitted >= 0;
    // Cradle: two footing seats on the deck and eight arms that hold the footings upright.
    const seats = Math.min(2, state.shed.cradle);
    const rails = Math.min(8, state.shed.cradleRails);
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
      [PARK.wagon + PARK.gap + 1, 21.4, 2.2, 0.18, 1.9],
      [PARK.wagon + PARK.gap, 20.0, 2.6, 0.6, 3.6],
      [PARK.wagon, 19.1, 2.8, 0.55, 3.3],
    ] as const) {
      const pt = stallPoint(off, z);
      batch.box(pt.x, y - slump, pt.z, w, h * (1 - tarp * 0.6), d, '#87968b', STALL_YAW, 0, tarp * 0.6);
    }
  }
  function drawTable(dt: number) {
    const target =
      yaws[want && performance.now() < want.until && want.to !== state.shed.table ? want.to : state.shed.table]!;
    if (want && (state.shed.table === want.to || performance.now() >= want.until)) want = null;
    let d = target - tableYaw;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    const step = (Math.PI / 2 / TURN_S) * dt;
    const was = tableTurning;
    tableTurning = Math.abs(d) > 0.002;
    if (tableTurning) {
      const k = Math.min(Math.abs(d), step);
      tableYaw += Math.sign(d) * k;
      if (!was) clank(table.x, table.z);
    } else if (was) {
      tableYaw = target;
      thump(table.x, table.z);
      clank(table.x, table.z);
    }
    for (const side of [-1, 1]) {
      const ox = Math.cos(tableYaw) * side * 0.63,
        oz = -Math.sin(tableYaw) * side * 0.63;
      batch.box(table.x + ox, tableY + 0.1, table.z + oz, 0.1, 0.1, R * 2 - 0.6, '#3f4145', tableYaw);
    }
    batch.box(table.x, tableY + 0.04, table.z, 1.5, 0.08, R * 2 - 0.3, '#5c5046', tableYaw);
    // A handle on the rim that travels with the disc: what you turn.
    const hx = table.x + Math.sin(tableYaw + Math.PI / 2) * (R - 0.4),
      hz = table.z + Math.cos(tableYaw + Math.PI / 2) * (R - 0.4);
    batch.box(hx, tableY + 0.55, hz, 0.16, 1, 0.16, BRASS);
  }
  /** Where the wagon and shunter stand now, from `ready` and the mover clock alone. */
  function shuntTargets(tick: number) {
    const sh = state.shed,
      coupled = !!state.line2.train[1]?.wagon;
    if (coupled) {
      const since = sh.ready >= 0 ? tick - sh.ready : Infinity;
      const u = Math.min(1, Math.max(0, since / WORKS.rollTicks));
      return { wagon: OUT_A, shunter: OUT_A - PARK.gap + (PARKED_A - OUT_A) * smooth(u), hidden: true };
    }
    if (sh.ready < 0) return { wagon: PARKED_A, shunter: PARKED_A - PARK.gap, hidden: false };
    const u = Math.min(1, Math.max(0, (tick - (sh.ready - WORKS.rollTicks)) / WORKS.rollTicks));
    const a = PARKED_A + (OUT_A - PARKED_A) * smooth(u);
    if (u < 1) return { wagon: a, shunter: a - PARK.gap, hidden: false };
    const back = Math.min(1, Math.max(0, (tick - sh.ready) / WORKS.rollTicks));
    return { wagon: OUT_A, shunter: OUT_A - PARK.gap + (PARKED_A - OUT_A) * smooth(back), hidden: false };
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
    const now = adapter.tickNow(),
      step = dt * TICKS_PER_S,
      ready = state.shed.ready;
    if (snapTo || !Number.isFinite(shownTick) || Math.abs(now - shownTick) > 10 * TICKS_PER_S) shownTick = now;
    else if (ready !== shownReady && ready >= 0) shownTick = Math.min(now, ready - WORKS.rollTicks);
    else shownTick += step * (1 + Math.min(0.5, Math.max(-0.5, (now - shownTick) / 20)));
    shownReady = ready;
    return shownTick;
  }
  function drawShunt(dt: number, snapTo: boolean) {
    const t = shuntTargets(shuntClock(dt, snapTo));
    if (snapTo) {
      wagonA = t.wagon;
      shunterA = t.shunter;
    } else {
      // The clock drives the pose; a cancelled roll-out eases home at a walking pace rather than jumping.
      const ease = (from: number, to: number) => {
        const d = to - from;
        return Math.abs(d) < 0.02
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
          pathAt(shunterA, p);
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
    const shunterFrame = vehicleFrame(shunterA, new THREE.Matrix4());
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
    state = adapter.inspect();
    later.clear();
    slabOpen = !!(state.works.seams & SEAM_STALL);
    solidSlab(!slabOpen);
    pop = -1;
    build = state.shed.stall >= WORKS.stall ? 1 : 0;
    tarp = build;
    builtShown = build >= 1;
    fittedShown = state.shed.fitted >= 0;
    tableYaw = yaws[state.shed.table]!;
    tableTurning = false;
    want = null;
    lowering.length = 0;
    bolts.length = 0;

    lastCradle = state.shed.cradle;
    lastRails = state.shed.cradleRails;
    const t = shuntTargets(shuntClock(0, true));
    wagonA = t.wagon;
    shunterA = t.shunter;
  }
  snap();
  const avatarBack = (pid: string, out: THREE.Vector3) => {
    const a = pid === state.pid ? me.avatar : [...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar;
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
      state = adapter.inspect();
      const sh = state.shed;
      const open = !!(state.works.seams & SEAM_STALL);
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
      batch.begin();
      drawSlab(dt);
      drawSockets();
      drawLowering(dt);
      drawFrame(dt);
      drawTarp();
      drawTable(dt);
      drawShunt(dt, false);
      batch.commit();
    },
    accepted(e: RailwayAccepted) {
      state = adapter.inspect();
      if (e.op === 'rail.strike' && e.id === 0) {
        const delay = e.pid === state.pid ? deps.contactIn(0) : 0;
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
        const slot = e.site === 0 ? Math.max(0, state.shed.stall - 1) : Math.max(0, state.shed.cradle - 1);
        lowering.push({ site: e.site, slot, from, t: 0 });
      }
      if (e.op === 'rail.turn') clank(table.x, table.z);
    },
    corrected(c: RailwayCorrection) {
      const e = c.event;
      if (e.op === 'rail.footSet') lowering.length = 0;
      if (e.op === 'rail.turn') want = null;
    },
    targets(): Interactable[] {
      const pos = me.body?.position;
      if (!state.ready || !pos) return [];
      const sh = state.shed,
        out: Interactable[] = [];
      const nearStall =
        Math.hypot(pos.x - stallAt.x, pos.z - stallAt.z) <= SHED_STALL.reach / 100 - 0.4 &&
        Math.abs(pos.y - SHED_STALL.y / 100) <= 2.6;
      if (nearStall && state.foot && state.works.seams & SEAM_STALL) {
        if (sh.stall < WORKS.stall) {
          const sp = STALL_SOCKETS[sh.stall]!;
          out.push({
            id: 'railway-foot-set-0',
            verb: 'Set the footing',
            at: new THREE.Vector3(sp.x, FLOOR + 1.6, sp.z),
            run: () => void adapter.setFooting(0),
          });
        } else if (sh.cradle < WORKS.cradle && !state.line2.train[1]?.wagon) {
          const c = stallPoint(0, PARK.wagon);
          out.push({
            id: 'railway-foot-set-1',
            verb: 'Set the footing',
            at: new THREE.Vector3(c.x, 20.6, c.z),
            run: () => void adapter.setFooting(1),
          });
        }
      }
      if (nearStall && sh.stall >= WORKS.stall && state.railsCarry > 0 && sh.cradleRails < WORKS.cradleRails) {
        const c = stallPoint(0, PARK.wagon);
        out.push({
          id: 'railway-cradle',
          verb: 'Fit the cradle',
          at: new THREE.Vector3(c.x, 20.4, c.z),
          run: () => void adapter.fitCradle(),
        });
      }
      // The table: offered once the stall stands, while it is still, and never while the wagon is rolling out to
      // wait for its train (a turn back then would only send it home: no one can stall a friend's shunt).
      const rolling = sh.ready >= 0 && !state.line2.train[1]?.wagon;
      if (
        sh.stall >= WORKS.stall &&
        !rolling &&
        !tableTurning &&
        !want &&
        Math.hypot(pos.x - table.x, pos.z - table.z) <= SHED_TABLE.reach / 100 - 0.6 &&
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
            if (adapter.turnTable(to, sh.tableRev)) want = { to, until: performance.now() + 4000 };
            else uiSound('deny');
          },
        });
      }
      return out;
    },
    inspect: () => {
      const w = new THREE.Vector3();
      pathAt(wagonA, w);
      return {
        slab: !slabOpen,
        slabSolid: !!slabBody,
        stall: { set: state.shed.stall, frame: build, tarp },
        cradle: { seats: state.shed.cradle, rails: state.shed.cradleRails, fitted: state.shed.fitted >= 0 },
        table: { state: state.shed.table, yaw: tableYaw, turning: tableTurning, pending: want?.to ?? null },
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
        shunter: { along: shunterA, tick: adapter.tickNow(), shown: shownTick, ready: state.shed.ready },
      };
    },
  };
}
