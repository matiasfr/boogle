// The stations trains stop at: a platform, a roof, a bench, a signal, a request lever and a map display. The owner asked
// "what is the platform", so they don't exist until there's a train to wait for: they drop into place, piece by piece,
// when trains come. Trains stop on request (owner, 10 November; docs/plans/works-late-game.md, step 1): each platform
// has a lever with one handle for its own way, plaqued with the end it goes to (docs/plans/generic-lines.md, v26: today's
// platforms serve the down track, the up platforms at Quarry and Far Head the up track), and the next train heading that
// way that can still brake stops; the signal's arm drops while a request stands. Far Head's up lever hangs chained until
// the pier is laid. Local over the server's request bits (`Line.req`, each train's `req`).
import * as THREE from 'three/webgpu';
import type { OwnedView } from '../../render/owned-view.ts';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { Interactable } from '../../player/hands.ts';
import { trainAlong, TRAIN_PHASE, reqHas, LINE_HALTS } from '../../sim/railway-train.ts';
import { LINE2, RAIL_HALTS, RAIL_LINES, RAIL_TRAINS } from '../../sim/railway-lines.ts';
import { railTrainHeld, trainStops } from '../../sim/railway-queries-trains.ts';
import { line2Completed, line2Trains } from '../../sim/railway-queries-line2.ts';
import { LINE_SLOTS } from '../../sim/railway-trains.ts';
import { ringHead } from '../../sim/railway-queries.ts';
import {
  aperture,
  line as lineRow,
  rail as railRow,
  train as trainRow,
  works as worksRow,
  type ReadWorld,
} from '../../sim/railway-rows.ts';
import { RING_HEAD, RING_S_HEAD } from '../../sim/railway-ring-layout.ts';
import { line2World, line2Y, RING_S } from './line2-path.ts';
import { createRequestLever, type RequestLever } from './request-lever.ts';
import { LINE2_GLIDE, pierLaid } from '../../sim/railway-line2-layout.ts';
import { WORKS_KILN, WORKS_SEAMS } from '../../sim/railway-works-layout.ts';
import { SEAM_STALL, SEAM_THROAT } from '../../sim/railway-works.ts';
import { clank, thump } from '../../render/machine-sfx.ts';
import { forEachStatic, teleport, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { carry } from '../../physics/platforms.ts';
import { HEAD_OFFSET, PLAYER_R, SEA } from '../../constants.ts';
import { uiSound } from '../../ui/ui-sound.ts';
import { me } from '../../player/player.ts';
import { roadPlaque } from './home-pictogram.ts';
import { createIslandBoards } from './island-boards.ts';
import { createUpPlatforms } from './up-platforms.ts';
import { displayYaw, haltDisplays, haltMap, haltRows, stackDisplays } from './halt-map.ts';
import { createBoxBatch } from './works-box-view.ts';
import { createRingMapTable } from './ring-map-table.ts';
import { ringIslandNear } from '../ring-island/state.ts';
import { createHaltKit } from './halt-kit.ts';

type Box = import('../../render/boxes.ts').Box;
type Line = import('../../place/layout.ts').Line;
type LinePoint = import('../../place/layout.ts').LinePoint;

export async function createRailwayHalts(adapter: RailwayAdapter, owner: OwnedView) {
  const [
    { flat },
    boxModule,
    landModule,
    layout,
    { boardMaterial },
    piecesModule,
    { ISLAND, ISLAND_LEVER, LEVER_REACH },
  ] = await Promise.all([
    import('../../render/flat.ts'),
    import('../../render/boxes.ts'),
    import('../../place/land.ts'),
    import('../../place/layout.ts'),
    import('../../place/look.ts'),
    import('../../place/pieces.ts'),
    import('../../place/home-station.ts'),
  ]);
  const { box, place } = boxModule,
    { H, addStatic: staticBody, slab: staticSlab } = landModule,
    { dropSet, dustRing } = piecesModule;
  const { ORIGIN, lineAt, railY } = layout;
  // The up track's platforms and plank crossings, standing with today's halt beside each (generic-lines step 2).
  const ups = createUpPlatforms(owner, { layout, boxes: boxModule, land: landModule, pieces: piecesModule });
  // The map's lines, replaced in place whenever line 2's stage changes (maps(), below).
  const mapLines = haltMap(layout).lines;
  let mapStage = '';
  const rows = haltRows(layout);
  // One display a halt, the Pier's too; the Home island's two edges share one.
  const boards = createIslandBoards(
    owner,
    mapLines,
    haltDisplays(layout).length,
    1.0,
    0.8,
    RAIL_TRAINS.map((t) => t.line),
  );
  const addStatic = (
    shape: Parameters<typeof staticBody>[0],
    at: Parameters<typeof staticBody>[1],
    q: THREE.Quaternion,
  ) => staticBody(shape, at, q, GROUP.SCENERY, owner);
  const slab = (ax: number, az: number, bx: number, bz: number, ya: number, yb: number, width = 2.5) =>
    staticSlab(ax, az, bx, bz, ya, yb, width, owner, undefined, 'grass');

  const P: LinePoint = { x: 0, z: 0, ux: 0, uz: 1 };
  const POST = '#7f5630',
    STONE = '#bdb8ac',
    ROOF = '#c4453a';
  const lateral = (l: number, out: { x: number; z: number }) => {
    out.x = P.x - P.uz * l + ORIGIN.x;
    out.z = P.z + P.ux * l + ORIGIN.z;
    return out;
  };
  /** A platform along one side of `line`, `s0` to `s1` metres along, at `lat` from the rails, with a ramp off its side.
   * An `island` halt is one edge of the island both village roads share: line 1's edge builds the deck, its
   * end ramps and a greybox canopy down the middle (no back ramp, no shelter), and each edge has its own signal, board
   * and destination plaque. Standing anywhere on the island is on both. */
  function makeHalt(
    name: string,
    k: number,
    line: Line,
    s0: number,
    s1: number,
    lat: number,
    stop: number,
    island = false,
    row = 0,
  ) {
    const boxes: Box[] = [];
    const hw = island ? ISLAND.width / 2 : 1.25,
      deck = !island || k === 0;
    const mid = (s0 + s1) / 2,
      half = (s1 - s0) / 2,
      sign = Math.sign(lat);
    const low = Math.min(railY(line, s0), railY(line, s1)) + 0.72;
    lineAt(line, mid, P);
    const yaw = Math.atan2(P.ux, P.uz);
    const c = lateral(lat, { x: 0, z: 0 });
    const part = (
      dl: number,
      dy: number,
      ds: number,
      w: number,
      h: number,
      d: number,
      color: string,
      tilt?: THREE.Euler,
    ) => {
      // In the platform's own frame: +z along the line, +x across, y from the ground under its middle.
      const b = box(c.x, c.z, place(dl, dy, ds, w, h, d, yaw, tilt), color);
      b.y = low;
      boxes.push(b);
      return b;
    };
    const ground = H(c.x, c.z);
    // The Pier halt stands over the sea: its one ramp comes up off the trestle's deck at its landward end.
    const overWater = ground < SEA;
    /** Ramps: off each end, and off the back at the middle; over the sea, only the landward end, from the deck. */
    const rampEnds = () => {
      const out: { ax: number; az: number; bx: number; bz: number; foot: number }[] = [];
      const a = { x: 0, z: 0 },
        b = { x: 0, z: 0 };
      const ramp = (foot: number) => out.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, foot });
      if (!deck) return out;
      const head = island ? ISLAND.headRamp : 6,
        end = island ? ISLAND.endRamp : 6;
      lineAt(line, s0, P);
      lateral(lat, a);
      lineAt(line, s0 - head, P);
      lateral(lat, b);
      ramp(overWater ? railY(line, s0 - head) + 0.05 : H(b.x, b.z) + 0.05);
      if (overWater) return out;
      lineAt(line, s1, P);
      lateral(lat, a);
      lineAt(line, s1 + end, P);
      lateral(lat, b);
      ramp(H(b.x, b.z) + 0.05);
      if (island) return out;
      lineAt(line, mid, P);
      lateral(lat + sign * 1.25, a);
      lateral(lat + sign * 7, b);
      ramp(H(b.x, b.z) + 0.05);
      return out;
    };
    // The deck, in lengths, with its edge stones.
    const lengths = deck ? Math.ceil((half * 2) / 6) : 0;
    for (let k = 0; k < lengths; k++) {
      const ds = -half + ((k + 0.5) * half * 2) / lengths;
      part(0, -0.5, ds, hw * 2, 0.5, (half * 2) / lengths + 0.02, STONE);
    }
    // A bright edge: this is the place.
    if (deck) for (const sl of [-1, 1]) part(sl * (hw - 0.15), -0.04, 0, 0.3, 0.05, half * 2, '#f2d36a');
    // Under it, down to the ground; over the sea, timber piles to the sea floor like the trestle's.
    if (deck && !overWater) part(0, ground - low, 0, hw * 2, low - 0.5 - ground, half * 2, '#9a9184');
    else if (deck)
      for (let ds = -half + 1; ds <= half - 1 + 1e-6; ds += (half * 2 - 2) / 3)
        for (const dl of [-0.9, 0.9]) part(dl, ground - low, ds, 0.4, low - 0.5 - ground, 0.4, '#a2743f');
    // Local +sign x points toward the rails. Face the train from the outer edge,
    // along from the middle entrance so the rear ramp and the aisle stay clear.
    const shelter = -4.8;
    const kit = createHaltKit(owner, row, false, c.x, low, c.z, yaw);
    for (const [, x, y, z, w, h, d, colour] of kit.parts) part(x, y - h / 2, z, w, h, d, colour);
    // The signal's mast, at the end the train comes in, on this edge.
    const mast = sign * (hw - 0.3);
    // The map display: a little stand at reading height with the island map on its face and both trains moving on
    // it (owner, 9 November: a real sign, not floating text; "Island map"; 10 November: "on a little display at the
    // station" rather than up the mast). Two short legs, a dark frame whose back is the plain panel, a roof-red cap.
    // At a halt it stands at the back edge in the shelter, between the bench and the post nearer the rear ramp, facing
    // the rails, so you read it where you wait and it is out of the aisle and the train's way. The Home island has one,
    // in its middle between the canopy posts, facing the head ramp you come up. No collider: it stops no one.
    const DISPLAY = island
      ? { across: 0, along: 0, faceAlong: true }
      : { across: -sign * 1.0, along: shelter + 2.25, faceAlong: false };
    const SHOW = { w: 1.0, h: 0.8, mid: 1.35 };
    const display = !island || k === 0;
    if (display) {
      // Sizes across and along the platform for a part `wide` along the face and `deep` through it.
      const sized = (wide: number, deep: number): [number, number] => (DISPLAY.faceAlong ? [wide, deep] : [deep, wide]);
      const frame = (dy: number, dh: number, wide: number, deep: number, color: string, dw = 0) => {
        const [w, d] = sized(wide, deep);
        const [ow, od] = sized(dw, 0);
        part(DISPLAY.across + ow, dy, DISPLAY.along + od, w, dh, d, color);
      };
      const bottom = SHOW.mid - SHOW.h / 2;
      for (const side of [-1, 1]) {
        frame(0, bottom, 0.07, 0.07, POST, side * 0.42);
        frame(0, 0.04, 0.1, 0.32, POST, side * 0.42);
      }
      frame(bottom - 0.04, SHOW.h + 0.08, SHOW.w + 0.08, 0.08, '#23262d');
      frame(SHOW.mid + SHOW.h / 2 + 0.04, 0.07, SHOW.w + 0.2, 0.22, ROOF);
    }
    const set = dropSet(
      boxes,
      (k) => {
        const b = boxes[k]!;
        if (k % 3 === 0) thump(b.x, b.z);
        dustRing(b.x, low, b.z, 4, 1.4, 0.2);
      },
      owner,
    );
    const plain = set.mesh.material as THREE.Material;
    const painted = boardMaterial(plain);
    set.mesh.material = painted;
    if (painted !== plain) owner.cleanup(() => painted.dispose());
    boxes.forEach((_, k) => set.snap(k, false));
    // The arm, its own thing: up for nothing coming, down for a train on its way.
    const arm = new THREE.Group();
    const armBlade = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.05), flat('#e8392a'));
    armBlade.position.x = 0.5;
    arm.add(armBlade);
    const cosY = Math.cos(yaw),
      sinY = Math.sin(yaw);
    {
      const ds = half - 0.8;
      arm.position.set(c.x + mast * cosY + ds * sinY, low + 4.2, c.z - mast * sinY + ds * cosY);
      arm.rotation.y = yaw + (sign > 0 ? 0 : Math.PI);
    }
    arm.visible = false;
    owner.add(arm);
    // The request lever, at the mast's foot on the platform side (no collider: it stops no one): one handle, this
    // platform's way, the end halt's way out and the down track's at a middle one (its up platform has its own lever).
    // Line 2's quarry and Far Head are middle halts once their line runs past them.
    const middle = k === 1 && (stop === 1 || stop === 2);
    const dir: -1 | 1 = stop === 0 ? 1 : -1;
    const lever: RequestLever = createRequestLever(owner, 1, sign);
    {
      // On the island each lever stands out on its own edge, under its mast (home-station.ts, ISLAND_LEVER): the two
      // are then more than twice the prompt's reach apart.
      const dl = island ? sign * (hw - ISLAND_LEVER.edge) : mast - sign * 0.5,
        ds = island ? half - ISLAND_LEVER.fromEnd : half - 0.8 - 0.6;
      lever.group.position.set(c.x + dl * cosY + ds * sinY, low, c.z - dl * sinY + ds * cosY);
      lever.group.rotation.y = yaw;
      lever.group.visible = false;
      lever.group.updateMatrixWorld(true);
    }
    // Where this edge's trains go, on its mast, facing along the deck.
    const plaque = island ? roadPlaque(k as 0 | 1) : null;
    if (plaque) {
      const ds = half - 0.8;
      plaque.mesh.position.set(c.x + mast * cosY + ds * sinY, low + 2.9, c.z - mast * sinY + ds * cosY);
      plaque.mesh.rotation.y = yaw;
      plaque.mesh.visible = false;
      owner.add(plaque.mesh);
      owner.cleanup(plaque.dispose);
    }
    // The island map, this halt ringed (the Home island's display rings both its stops).
    const board = (() => {
      if (!display) return -1;
      const at = new THREE.Vector3(
        c.x + DISPLAY.across * cosY + DISPLAY.along * sinY,
        low + SHOW.mid,
        c.z - DISPLAY.across * sinY + DISPLAY.along * cosY,
      );
      const here = island
        ? rows.filter((r) => r.island).map((r) => ({ line: r.line, stop: r.stop }))
        : [{ line: k, stop }];
      return boards.add(at, displayYaw(yaw, lat, island), 0.045, here);
    })();
    let boardOn = false;

    let bodies: Body[] = [];
    const addBodies = () => {
      const q = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw);
      const at = (dl: number, dy: number, ds: number) => ({
        x: c.x + dl * cosY + ds * sinY,
        y: low + dy,
        z: c.z - dl * sinY + ds * cosY,
      });
      if (deck) bodies.push(addStatic({ kind: 'box', hx: hw, hy: 0.25, hz: half }, at(0, -0.25, 0), q));
      if (deck && !overWater)
        bodies.push(
          addStatic(
            { kind: 'box', hx: hw, hy: (low - 0.5 - ground) / 2 + 0.2, hz: half },
            at(0, (ground - low - 0.5) / 2, 0),
            q,
          ),
        );
      for (const piece of ['shelter', 'bench', 'canopy', 'mast']) bodies.push(...kit.enable(piece));
      for (const r of rampEnds()) bodies.push(slab(r.bx, r.bz, r.ax, r.az, r.foot, low, hw * 2));
      // A halt can arrive around someone, including a partner who did not fit the boiler. Rapier cannot
      // lift a sphere already trapped between the ground and a new ramp. Only displace actual overlaps,
      // testing in each box's frame so the pitched ramps and every halt's orientation are covered.
      const player = me.body;
      if (!player) return;
      let trapped = false;
      const local = new THREE.Vector3(),
        inverse = new THREE.Quaternion();
      forEachStatic(GROUP.SCENERY, (body, shapes) => {
        if (!bodies.includes(body)) return;
        inverse.copy(body.quaternion).invert();
        for (const up of [0, HEAD_OFFSET]) {
          local
            .set(player.position.x, player.position.y + up, player.position.z)
            .sub(body.position)
            .applyQuaternion(inverse);
          for (const shape of shapes) {
            if (shape.kind !== 'box') continue;
            const dx = Math.max(0, Math.abs(local.x) - shape.hx);
            const dy = Math.max(0, Math.abs(local.y) - shape.hy);
            const dz = Math.max(0, Math.abs(local.z) - shape.hz);
            if (dx * dx + dy * dy + dz * dz < (PLAYER_R - 0.01) ** 2) trapped = true;
          }
        }
      });
      if (trapped) {
        // The middle lane clears the bench, posts and signal; keep the player's place along the halt.
        const ds = Math.max(
          -half + PLAYER_R,
          Math.min(half - PLAYER_R, (player.position.x - c.x) * sinY + (player.position.z - c.z) * cosY),
        );
        teleport(player, c.x + ds * sinY, Math.max(player.position.y, low + PLAYER_R + 0.05), c.z + ds * cosY);
        player.velocity.set(0, 0, 0);
        carry.on = null;
        carry.x = carry.y = carry.z = 0;
      }
    };
    // Drawn ramps, one mesh each: they're long, plain and don't change.
    const ramps = new THREE.Group();
    const rampMesh = (ax: number, az: number, bx: number, bz: number, ya: number, yb: number) => {
      const dx = bx - ax,
        dz = bz - az,
        len = Math.hypot(dx, dz),
        dy = yb - ya,
        full = Math.hypot(len, dy);
      const m = new THREE.Mesh(new THREE.BoxGeometry(hw * 2, 0.4, full), flat(STONE));
      m.quaternion.setFromEuler(new THREE.Euler(-Math.atan2(dy, len), Math.atan2(dx, dz), 0, 'YXZ'));
      m.position.set((ax + bx) / 2, (ya + yb) / 2 - 0.2, (az + bz) / 2);
      m.castShadow = m.receiveShadow = true;
      ramps.add(m);
    };
    for (const r of rampEnds()) rampMesh(r.bx, r.bz, r.ax, r.az, r.foot, low);
    lineAt(line, mid, P);
    ramps.visible = false;
    owner.add(ramps);
    let reveal = -1;

    const halt = {
      name,
      k,
      stop,
      lever,
      middle,
      island,
      dir,
      x: c.x,
      y: low,
      z: c.z,
      up: false,
      calling: false,
      /** The train's next stop is this halt: its ring blinks on the board. */
      cue: false,
      /** It's built: down the pieces come. */
      build(delay = 0) {
        if (halt.up) return;
        halt.up = true;
        boxes.forEach((_, k) => set.drop(k, 3.4, delay + k * 0.05));
        reveal = delay + boxes.length * 0.05;
        addBodies();
      },
      snap(on: boolean) {
        reveal = -1;
        set.clear();
        const removed = kit.disable();
        for (const b of bodies) if (!removed.has(b)) owner.removeBody(b);
        bodies = [];
        halt.up = on;
        boxes.forEach((_, k) => set.snap(k, on));
        ramps.visible = arm.visible = lever.group.visible = boardOn = on;
        if (plaque) plaque.mesh.visible = on;
        if (on) addBodies();
      },
      /** A body at (x, y, z) stands on it; margin retains an already occupied halt through edge jitter. */
      onIt(x: number, y: number, z: number, margin = 0) {
        if (!halt.up) return false;
        const dx = x - c.x,
          dz = z - c.z;
        const cosY = Math.cos(yaw),
          sinY = Math.sin(yaw);
        const l = dx * cosY - dz * sinY,
          s = dx * sinY + dz * cosY;
        return (
          Math.abs(l) < hw + 0.35 + margin && Math.abs(s) < half + 0.4 + margin && Math.abs(y - low) < 1.6 + margin
        );
      },
      /** The signal, for a train called here; false for nothing coming. */
      signal(on: boolean, quiet = false) {
        if (on && !halt.calling && !quiet) clank(c.x, c.z);
        halt.calling = on;
        arm.rotation.z = on ? -0.75 : 0;
      },
      update: (dt: number, cue: boolean) => {
        set.update(dt);
        if (reveal >= 0) {
          reveal -= dt;
          if (reveal <= 0) {
            ramps.visible = arm.visible = lever.group.visible = boardOn = true;
            if (plaque) plaque.mesh.visible = true;
          }
        }
        halt.cue = cue;
        if (board >= 0) boards.set(board, boardOn);
      },
    };
    return halt;
  }
  // Place's halts, then line 2's Pier halt, which opens with Q6 (by name: the Railhead and Ring Island follow it in the
  // catalog but have no row here, their platforms are other views').
  const PIER = rows.findIndex((r) => r.name === 'Pier');
  const halts = rows.map((h, row) =>
    makeHalt(h.name, h.line, layout.LINKS[h.line]!.line, h.s0, h.s1, h.lat, h.stop, h.island, row),
  );
  // The up platforms' levers (one handle, the up way), at the platform's end nearer its plank crossing, where you
  // come up onto it; standing with today's halt beside it.
  const upLevers = layout.UP_HALTS.map((u) => {
    const line = layout.LINKS[u.line]!.line,
      mid = (u.s0 + u.s1) / 2,
      half = (u.s1 - u.s0) / 2,
      sign = Math.sign(u.lat),
      low = Math.min(railY(line, u.s0), railY(line, u.s1)) + 0.72;
    lineAt(line, mid, P);
    const yaw = Math.atan2(P.ux, P.uz);
    const c = lateral(u.lat, { x: 0, z: 0 });
    const lever = createRequestLever(owner, 1, sign);
    const dl = sign * (1.25 - 0.8),
      ds = Math.sign(u.crossS - mid) * (half - 1.4);
    lever.group.position.set(
      c.x + dl * Math.cos(yaw) + ds * Math.sin(yaw),
      low,
      c.z - dl * Math.sin(yaw) + ds * Math.cos(yaw),
    );
    lever.group.rotation.y = yaw;
    lever.group.visible = false;
    lever.group.updateMatrixWorld(true);
    // The walk from it to today's platform side, for bots and evals: down its ramp toward the crossing, onto the
    // crossing's up end and across to its far end beside today's track.
    const toward = u.crossS > mid ? 1 : -1,
      endS = toward > 0 ? u.s1 : u.s0;
    const at = (s: number, l: number) => (lineAt(line, s, P), lateral(l, { x: 0, z: 0 }));
    const via = Math.abs(u.crossS - endS) <= 6 ? at(u.crossS, u.lat) : at(endS + toward * 6, u.lat);
    const path = [at(endS, u.lat), via, at(u.crossS, u.crossTo ?? layout.CROSSING_SPAN[1]), at(u.crossS, 1.5)];
    return { pair: u.pair, lever, centre: { x: c.x, y: low, z: c.z }, path };
  });
  /** Every platform's lever: halt `id` (its row, or its RAIL_HALTS id for the Railhead and Ring Island), its line and
   * stop, the way it asks for, and whether it stands now. `ring` is set on those two halts' levers, which stand on
   * platforms other views draw (the railhead's slides with `head`, the island's and the joint's are fixed). */
  type Spot = {
    id: number;
    line: number;
    stop: number;
    dir: -1 | 1;
    lever: RequestLever;
    up: boolean;
    ring?: { lat: number; u: () => number; shown: number; need: () => boolean };
  };
  const spots: Spot[] = [
    ...halts.map((h, k) => ({ id: k, line: h.k, stop: h.stop, dir: h.dir, lever: h.lever, up: false })),
    ...upLevers.map((u) => {
      const h = halts[u.pair]!;
      return { id: u.pair, line: h.k, stop: h.stop, dir: 1 as const, lever: u.lever, up: true };
    }),
  ];
  // Line 2's Railhead (stop 4) and Ring Island (stop 5): a lever on each platform, 2.45 m (east) or 0.5 m (west) off
  // the rails and a little short of the platform's north end. The railhead's east lever stands on the platform that
  // slides out with `head` (src/sim/railway-ring-layout.ts RING_HEAD), the other three are fixed.
  const RAILHEAD = 4,
    RING_ISLAND = 5;
  const ringHaltId = (stop: number) => LINE_HALTS.findIndex((h) => h.line === LINE2 && h.stop === stop);
  const ringSpot = (stop: number, up: boolean, lat: number, u: () => number, need: () => boolean, plaque = 1): Spot => {
    // The plaque faces away from the rails, onto the platform: the rails lie toward the centre line from `lat` (a stack
    // head's outward lever stands on the east platform too, so the side is the platform's, not the way's).
    const lever = createRequestLever(owner, 1, lat < 0 ? -1 : 1, plaque);
    lever.group.visible = false;
    return {
      id: ringHaltId(stop),
      line: LINE2,
      stop,
      dir: up ? 1 : -1,
      lever,
      up,
      ring: { lat, u, shown: u(), need },
    };
  };
  const wd0 = () => adapter.read.world();
  spots.push(
    // The railhead's east platform moves with `head`: its lever rides 6 m short of the platform's end (u in metres).
    ringSpot(
      RAILHEAD,
      false,
      2.45,
      () => RING_HEAD[ringHead(wd0())]!.u / 100 - 6,
      () => true,
    ),
    // The joint's west platform stands at bent 13 (footing 14); its lever is chained until the rivet.
    ringSpot(
      RAILHEAD,
      true,
      -6.3,
      () => 247.5 + 6,
      () => aperture(wd0()).set >= 14,
    ),
    // The island's levers stand at u 457: the server judges a lever ask from the halt's platform centre (u 448, reach
    // 12.6 m: railway-server.ts), and u 466 was 18 m from it, so every ask was refused. 457 is inside that reach, east
    // of the steel works' shed (u 448 to 455, lat 6.5 to 14), loader and yard stacks (lat 6.6 and 8.3) and 2.45 m
    // (down) and -6.3 m (up) from the track, on the platforms (u 428 to 468).
    ringSpot(
      RING_ISLAND,
      false,
      2.45,
      () => 457,
      () => true,
    ),
    ringSpot(
      RING_ISLAND,
      true,
      -6.3,
      () => 457,
      () => true,
    ),
  );
  // The stack line's halts (docs/plans/greybox-route.md, leg 1 step 4; the design review's answer g): one homeward lever
  // on each head's one platform (route-greybox/leg-view.ts draws it: lat +1.8 to +6.3, the 25 m before the section's
  // end), at the stop (10 m short of its end), while the head is a stop (a head closed behind passes both ways and
  // loses its lever); each old head gains a lever for the way on until it closes behind, 4 m further out (6 m short of
  // the end), so the two stand in the order of their ways: the homeward one nearer home, the outward one nearer the
  // railhead, more than twice the prompt's reach apart, both plaques facing the platform and twice the usual size (48
  // by 18 cm: the pair is told apart by them from across the platform). High Gorge's one lever
  // stands 4 m past its stop on its north platform. Both are inside the server's reach for rail.call (12.6 m from the
  // stop on the track's centre line: the outward one's knob is 4.7 m from it). No chained up lever at a line's end.
  const stackStops = RAIL_LINES[LINE2]!.halts.map((h, stop) => ({ h, stop })).filter((x) => x.h.leg);
  for (const { h, stop } of stackStops) {
    const stub = h.end?.kind === 'stub',
      u = (h.s - RING_S_HEAD) / 100 + (stub ? 0 : 4),
      shut = () => h.closesAt !== undefined && stopsNow[LINE2]!.length >= h.closesAt;
    spots.push(
      ringSpot(
        stop,
        false,
        2.45,
        () => u,
        () => !shut(),
        stub ? 2 : 1,
      ),
    );
    if (stub)
      spots.push(
        ringSpot(
          stop,
          true,
          2.45,
          () => u + 4,
          () => !shut() && stopsNow[LINE2]!.length > stop + 1,
          2,
        ),
      );
  }
  const ringSpots = spots.filter((x) => x.ring);
  // The stack line's departure boards (leg 1 step 4b; the design review's answer g): the halt map on a grey stand at
  // each head's platform and High Gorge's, up while trains stop there. Greybox: two legs, a dark back, a cap; one draw
  // for all four stands, rewritten when the line's stops change. No collider: it stops no one.
  const stackStands = createBoxBatch(owner, 16, false);
  stackStands.mesh.name = 'railway:stack-boards';
  const stackBoards = stackDisplays().map((d) => {
    const frame = new THREE.Matrix4().compose(
      new THREE.Vector3(d.at.x, d.at.y, d.at.z),
      new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, d.yaw),
      new THREE.Vector3(1, 1, 1),
    );
    return { ...d, frame, board: boards.add(new THREE.Vector3(d.at.x, d.at.y + 1.35, d.at.z), d.yaw, 0.045, d.here) };
  });
  let stackOpen = -1;
  /** Stands the stack line's boards for line 2's `open` stops (none while no train runs). */
  function stackBoardsFor(open: number) {
    if (open === stackOpen) return;
    stackOpen = open;
    stackStands.begin();
    for (const d of stackBoards) {
      const on = open > 0 && !d.shut(open);
      boards.set(d.board, on);
      if (!on) continue;
      for (const side of [-0.42, 0.42]) stackStands.part(d.frame, side, 0.475, 0, 0.07, 0.95, 0.07, '#6f7275');
      stackStands.part(d.frame, 0, 1.35, 0, 1.08, 0.88, 0.08, '#23262d');
      stackStands.part(d.frame, 0, 1.825, 0, 1.2, 0.07, 0.22, '#9c9ea1');
    }
    stackStands.commit();
  }
  let shown = false;
  /** Levers pulled on this tab and not yet answered: shown over at once (the press's own feedback), until then. */
  const pulled = new Map<Spot, number>();
  const PULL_HOLD_MS = 3000;
  const haltName = (line: number, stop: number) =>
    LINE_HALTS.find((r) => r.line === line && r.stop === stop)!.name.replace(/, line 2$/, '');
  /** The open stops of each line, read once a frame through the read facade (refreshStops). */
  let stopsNow: readonly (readonly number[])[] = [];
  const refreshStops = () => {
    const wd = adapter.read.world();
    stopsNow = [0, 1].map((line) => trainStops(wd, line));
  };
  refreshStops();
  /** Whether any train of `line` has the property `fn` reads off its row (no list built). */
  const someTrain = (w: ReadWorld, line: number, fn: (r: ReturnType<typeof trainRow>) => boolean) =>
    LINE_SLOTS[line]!.some((k) => fn(trainRow(w, k)));
  /** No train stands at this platform yet: its way is its halt's way in while that halt is the line's open end. */
  function chained(x: Spot) {
    const n = stopsNow[x.line]!.length;
    return (x.stop === 0 || x.stop === n - 1) && (x.stop === 0 ? x.dir < 0 : x.dir > 0);
  }
  /** The end a lever's way goes to: the line's open end that way. A chained lever names the halt that opens next (the
   * Pier at Far Head's, Ring Island at the joint's), or the line's last halt where none does. */
  function label(x: Spot) {
    if (x.dir < 0) return haltName(x.line, 0);
    // A chained lever never names a greybox route halt (a leg's, or a shut row's): Ring Island's reads Ring Island.
    const n = stopsNow[x.line]!.length,
      count = LINE_HALTS.filter((r, id) => r.line === x.line && !RAIL_HALTS[id]!.leg && !RAIL_HALTS[id]!.shut).length;
    const to = chained(x) ? Math.min(n, count - 1) : n - 1,
      h = RAIL_LINES[x.line]!.halts[to]!;
    // The stack line's moving end (placeholder name, the step 4 review's answer l; not The Boogler's).
    return h.leg && h.end?.kind === 'stub' ? 'Stack railhead' : haltName(x.line, to);
  }
  /** Whether a lever stands: its halt is up and its frame shown (an up lever with today's halt's). */
  const standing = (x: Spot) =>
    x.ring ? x.stop < stopsNow[x.line]!.length && x.ring.need() : halts[x.id]!.up && halts[x.id]!.lever.group.visible;
  /** Whether a lever stands over: the line's ask that way stands and no train of the line stands here leaving that way. */
  function over(x: Spot) {
    const w = adapter.read.world(),
      n = stopsNow[x.line]!.length;
    if (!reqHas(lineRow(w, x.line).req, x.stop, x.dir, n)) return false;
    return !someTrain(
      w,
      x.line,
      (r) => r.phase === TRAIN_PHASE.STAND && r.at === x.stop && (r.track ? -1 : 1) === x.dir,
    );
  }
  /** Rides the railhead's lever to its platform's end at `u` metres (the slide is `dt`-eased at 7 m/s: a bent in
   * about 3 s, with no prompt while it moves), and sets the others where they stand. */
  const leverAt = { x: 0, z: 0 },
    leverAhead = { x: 0, z: 0 };
  function placeRing(x: Spot, dt: number, snap: boolean) {
    const r = x.ring!,
      goal = r.u(),
      step = 7 * dt;
    r.shown = snap || Math.abs(goal - r.shown) > 25 ? goal : r.shown + Math.max(-step, Math.min(step, goal - r.shown));
    const s = RING_S + r.shown,
      p = line2World(s, r.lat, leverAt);
    // Every ring platform's deck is the bow's rail height plus 90 cm (RING_HEAD, RING_JOINT_UP, RING_HALT).
    x.lever.group.position.set(p.x, line2Y(s) + 0.9, p.z);
    const ahead = line2World(s + 1, r.lat, leverAhead);
    x.lever.group.rotation.y = Math.atan2(ahead.x - p.x, ahead.z - p.z);
    x.lever.group.updateMatrixWorld(true);
  }
  function levers(dt: number, snap = false) {
    const now = performance.now();
    for (const x of spots) {
      const lock = chained(x);
      if (x.ring) {
        placeRing(x, dt, snap);
        x.lever.group.visible = standing(x);
      } else if (x.up) x.lever.group.visible = standing(x);
      x.lever.label(0, label(x));
      x.lever.chained(lock);
      const until = pulled.get(x);
      if (until !== undefined && (now > until || over(x))) pulled.delete(x);
      x.lever.update(dt, [!lock && (over(x) || pulled.has(x))], snap);
    }
  }
  /** Whether halt `k` stands now: every halt once trains run, the Pier halt only once Q6 is laid. */
  const wanted = (k: number) => {
    const w = adapter.read.world();
    return line2Trains(w) && (k !== PIER || pierLaid(line2Completed(w)));
  };
  boards.redraw();
  // The boards' own smooth clock in ticks, pulled gently onto shared time (as train-view's), so markers glide.
  let clock = -1;
  const table = createRingMapTable(owner);
  let tableDrawn = false;
  /** Each train: whether its row was in the shed last frame (null: not yet seen since a restore), the seconds into
   * its marker's scale-in (-1: none) and the marker's size now (1 whole). */
  const inShed: (boolean | null)[] = RAIL_TRAINS.map(() => null),
    joining = RAIL_TRAINS.map(() => -1),
    grow = RAIL_TRAINS.map(() => 1);
  /** Each of today's platforms' signal: down while an ask stands for its way (the lever's, or a rider's on a train of
   * its line) or a train of its line stands at it leaving that way. */
  function signals(quiet = false) {
    const w = adapter.read.world();
    halts.forEach((h) => {
      const n = stopsNow[h.k]!.length;
      const asked =
        reqHas(lineRow(w, h.k).req, h.stop, h.dir, n) ||
        someTrain(
          w,
          h.k,
          (r) =>
            reqHas(r.req, h.stop, h.dir, n) ||
            (r.phase === TRAIN_PHASE.STAND && r.at === h.stop && (r.track ? -1 : 1) === h.dir),
        );
      h.signal(shown && h.up && asked, quiet);
    });
  }
  /** The boards: how far line 2 has got, every train where it is and whether it is held, each halt's ring
   * cue (a train of its line on its way there). */
  function maps(dt: number) {
    const w = adapter.read.world(),
      tick = adapter.read.tickNow();
    // The map follows line 2's stops (halt-map.ts): a redraw when the Pier is laid, Q7 is, the railhead moves out a
    // bent or the rivet is struck, and none in between.
    const open = trainStops(w, 1).length,
      head = open >= 5 ? ringHead(w) : 0;
    if (mapStage !== `${open}:${head}`) {
      mapStage = `${open}:${head}`;
      const next = haltMap(layout, { open, head });
      mapLines.splice(0, mapLines.length, ...next.lines);
      boards.redraw(next.scale);
      // Ring Island's map table carries the same map from the rivet on (the stack line is on it: `ties`).
      tableDrawn = !!next.lines[LINE2]?.ties;
      if (tableDrawn) table.draw(next.lines, next.scale);
    }
    table.set(shown && tableDrawn && ringIslandNear.mounted);
    stackBoardsFor(shown ? open : 0);
    // A shed train that joins gains its marker on that tick, growing over the second its cars do (train-view.ts's
    // JOIN_S; the step 4 review's answer f). A live edge only: `inShed` is null after a restore.
    RAIL_TRAINS.forEach((_t, k) => {
      const shed = trainRow(w, k).phase === TRAIN_PHASE.SHED;
      if (inShed[k] === true && !shed && shown) joining[k] = 0;
      inShed[k] = shed;
      const t = joining[k]!;
      grow[k] = t < 0 ? 1 : t * t * (3 - 2 * t);
      if (t >= 0) joining[k] = t + dt >= 1 ? -1 : t + dt;
    });
    boards.trains(
      // A fleet row in the shed (the greybox route) is on no board until it joins.
      RAIL_TRAINS.map(({ line }, k) =>
        shown && trainRow(w, k).phase !== TRAIN_PHASE.SHED ? trainAlong(trainRow(w, k), line, clock) / 100 : null,
      ),
      RAIL_TRAINS.map((_t, k) => {
        const r = trainRow(w, k);
        return shown && r.phase === TRAIN_PHASE.RUN ? r.to : null;
      }),
      RAIL_TRAINS.map((_t, k) => shown && railTrainHeld(w, k, tick)),
      grow,
    );
    halts.forEach((h) => {
      h.update(
        dt,
        someTrain(w, h.k, (r) => r.phase === TRAIN_PHASE.RUN && r.to === h.stop),
      );
    });
    // The Works in gold (docs/plans/works-signposting-2.md, beats 2, 4 and 8): each seam still to strike while the
    // breaker is out, then the kiln from the throat's opening until it lights.
    const wk = worksRow(w);
    boards.works(
      // The Works' two seams (WORKS_SEAMS[2] is Ring Island's rivet, R4's to draw).
      WORKS_SEAMS.slice(0, 2).map((p, i) =>
        wk.breaker === 2 && !(wk.seams & [SEAM_STALL, SEAM_THROAT][i]!) ? { x: p.x / 100, z: p.z / 100 } : null,
      ),
      wk.seams & SEAM_THROAT && wk.lit < 0 ? { x: WORKS_KILN.x / 100, z: WORKS_KILN.z / 100 } : null,
    );
    // The glider waiting on Needle Bell's summit: woken (Q5 laid) and not yet taken by the room.
    boards.glider(
      line2Completed(w) >= 5 && !railRow(w).glide ? { x: LINE2_GLIDE.x / 100, z: LINE2_GLIDE.z / 100 } : null,
    );
    boards.update(dt);
  }
  const tick = (dt: number) => {
    const target = adapter.read.tickNow();
    if (clock < 0 || Math.abs(target - clock) > 3) clock = target;
    else clock += dt * 10 + Math.max(-0.02, Math.min(0.02, (target - clock) * 0.05));
  };
  return {
    restore() {
      refreshStops();
      shown = line2Trains(adapter.read.world());
      inShed.fill(null);
      joining.fill(-1);
      pulled.clear();
      halts.forEach((h, k) => h.snap(wanted(k)));
      ups.update(0, (k) => halts[k]!.up, true);
      clock = adapter.read.tickNow();
      signals(true);
      levers(0, true);
    },
    /** The levers in reach: "Request stop" at an end halt, "Request stop: to <end>" at a middle one and on the Home
     * island, where two lines' levers stand on one deck (the end on the lever's plaque; the island's wording is a
     * placeholder, not The Boogler's); greyed while that request stands. A chained lever offers nothing. */
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!shown || !p) return [];
      refreshStops();
      const out: Interactable[] = [];
      for (const x of spots) {
        if (!standing(x) || chained(x)) continue;
        // The railhead's lever offers nothing while it slides out with the head.
        if (x.ring && Math.abs(x.ring.u() - x.ring.shown) > 0.05) continue;
        const at = x.lever.knob(0, new THREE.Vector3());
        if (Math.hypot(p.x - at.x, p.z - at.z) > LEVER_REACH || Math.abs(p.y - at.y) > 1.6) continue;
        const id = `railway-request-${x.id}-${x.up ? 'up' : 'down'}`;
        const named = x.ring
          ? x.stop > 0 && x.stop < stopsNow[x.line]!.length - 1
          : halts[x.id]!.middle || halts[x.id]!.island;
        const verb = named ? `Request stop: to ${label(x)}` : 'Request stop';
        if (over(x) || pulled.has(x)) out.push({ id, verb, at, blocked: 'Stop requested' });
        else
          out.push({
            id,
            verb,
            at,
            run: () => {
              if (!adapter.callTrain(x.id, x.dir)) return void uiSound('deny');
              pulled.set(x, performance.now() + PULL_HOLD_MS);
              clank(at.x, at.z);
            },
          });
      }
      return out;
    },
    update(dt: number) {
      refreshStops();
      const on = line2Trains(adapter.read.world());
      // Live edges only: trains coming drop every open halt in; Q6 completing drops the Pier halt in.
      const was = shown;
      shown = on;
      halts.forEach((h, k) => {
        const want = wanted(k);
        if (want && !h.up) h.build(was ? 0.3 : 0.3 + k * 0.3);
        else if (!want && h.up) h.snap(false);
      });
      ups.update(dt, (k) => halts[k]!.up);
      tick(dt);
      signals();
      levers(dt);
      maps(dt);
    },
    inspect: () => ({
      halts: halts.map((h) => ({
        name: h.name,
        line: h.k,
        stop: h.stop,
        x: h.x,
        y: h.y,
        z: h.z,
        up: h.up,
        calling: h.calling,
        cue: h.cue,
        /** Its platforms' levers (today's, then the up one's): where each knob is, the way it asks for, its plaque,
         * whether it can be pulled (`on`: standing and not chained), chained, and over. */
        lever: spots
          .filter((x) => x.id === halts.indexOf(h))
          .map((x) => {
            const p = x.lever.knob(0, new THREE.Vector3());
            return {
              dir: x.dir,
              platform: x.up ? ('up' as const) : ('down' as const),
              label: label(x),
              on: standing(x) && !chained(x),
              chained: chained(x),
              over: over(x),
              x: p.x,
              y: p.y,
              z: p.z,
            };
          }),
      })),
      /** The Railhead's and Ring Island's levers: where each knob is, the way it asks for, its plaque, whether it can be
       * pulled, chained, and the railhead's slide (metres out along the ring, shown and goal). */
      ringLevers: ringSpots.map((x) => {
        const p = x.lever.knob(0, new THREE.Vector3());
        return {
          halt: x.stop,
          platform: x.up ? ('up' as const) : ('down' as const),
          dir: x.dir,
          label: label(x),
          stands: standing(x),
          on: standing(x) && !chained(x),
          chained: chained(x),
          over: over(x),
          u: x.ring!.shown,
          goal: x.ring!.u(),
          x: p.x,
          y: p.y,
          z: p.z,
        };
      }),
      /** How many trains the shown boards mark held. */
      boardHeld: boards.heldMarks(),
      /** The boards' atlas texture memory in bytes (RGBA with mipmaps). */
      boardBytes: boards.bytes(),
      /** The Works' gold marks every shown display carries (seams still to strike, the cold kiln). */
      boardGold: boards.goldMarks(),
      /** Whether every shown display marks the waiting glider on Needle Bell's summit. */
      boardGlider: boards.gliderMark(),
      boardFaces: boards.faces(),
      ringMapTable: table.inspect(),
      markerGrow: grow.map((n) => +n.toFixed(3)),
      /** The up track's platforms (generic-lines step 2): each one's halt row, whether it stands, its deck's centre
       * and the walk from it to today's side over the plank crossing (UP_HALTS order, as upLevers). */
      upPlatforms: ups.inspect().map((g, i) => ({ ...g, ...upLevers[i]!.centre, path: upLevers[i]!.path })),
    }),
  };
}
