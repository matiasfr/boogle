// Line two's Local views over accepted state: the forge rising and pouring, its rails rack, the machine on the quarry line,
// Q1-Q6 frames, depot racks, route-v2 decks, both gates, the summit switch, Far Head, the boiler and the pier show.
// Geometry and colliders are rebuilt from accepted construction state; nothing here transfers material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Interactable } from '../../player/hands.ts';
import type { Body } from '../../physics/engine.ts';
import type { Got } from '../../render/reward-reveal.ts';
import { me } from '../../player/player.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { emit } from '../../render/particles.ts';
import { commitPieces } from '../../render/haul-pieces.ts';
import { readableGlow, readableUnlit } from '../../render/readable-unlit.ts';
import { LINE2_FORGE, LINE2_STATIONS, Q7, line2Panels, line2Routes, pierLaid } from '../../sim/railway-line2-layout.ts';
import {
  line2Active,
  line2Completed,
  line2GateOpen,
  line2KitOwed,
  line2Trains,
} from '../../sim/railway-queries-line2.ts';
import { aboard, line2Jobs, type QJobRead } from '../../sim/railway-queries.ts';
import { freeCarryIgnoringBig, railPhase } from '../../sim/railway-queries-line1.ts';
import {
  account,
  forge as forgeRow,
  job as line1Job,
  qjob,
  rail as railRow,
  shed as shedRow,
  type ReadWorld,
} from '../../sim/railway-rows.ts';
import { RING_Q7_FRAME } from '../../sim/railway-ring-layout.ts';
import { Q7_DECK_UP, q7Spot } from './q7-site.ts';
import { lineFeed, lineLayDistance, linePanelCount } from '../../sim/railway-line-schedule.ts';
import { createRailwayPanelView, type PanelState } from './panel-view.ts';
import { HOOK_REWARD } from './reward-data.ts';
import { createRailwaySeaGate } from './sea-gate-view.ts';
import { forgeRailsOffered, waitsForTrainOn } from './forge-offer.ts';
import { createRailwayGlideDevice } from './glide-device-view.ts';
import { createGateRig, gateEyes } from './gate-rig.ts';
import { createRailwayFarHead } from './far-head-view.ts';
import { createRailwayBoiler } from './boiler-view.ts';
import { createRailwayPier } from './pier-view.ts';
import { createForgeFinish } from './forge-finish.ts';
import { stockSign } from './stock-sign.ts';
import { createCameraPullOut } from '../../render/camera-pull-out.ts';
import { playSharedMoment } from './shared-moment.ts';
import { uiSound } from '../../ui/ui-sound.ts';

/** Rail pairs each stretch lays, one per commit. */
const STRETCH_PAIRS = LINE2_STATIONS.map((station) => line2Panels(station).length);
type Rail = typeof import('./rail-kit.ts');
type Machine = ReturnType<Rail['buildMachine']>;
/** The rack's sign keeps the train until the first kit is off it: so the flip back to the count lands as the train
 * unloads at Far Head, not at the fit 500 m away. Trains run, and the kit is still to load or still aboard. */
const kitComing = (w: ReadWorld, active: number) => {
  if (!line2Trains(w) || active < 0 || LINE2_STATIONS[active]!.feed !== 'train' || qjob(w, active).start >= 0)
    return false;
  const owed = line2KitOwed(w);
  return owed.logs + owed.rails + aboard(w, 'logs') + aboard(w, 'rails') > 0;
};

export async function createRailwayLine2(
  adapter: RailwayAdapter,
  owner: OwnedView,
  machine: Machine,
  bundleOrigin: (pid: string, count: number, out: THREE.Vector3) => boolean,
  /** The railway's one reveal queue (reward.ts): devices show "You got" like the jump device does. */
  youGot: (got: Got) => boolean,
  hookShown?: () => void,
  rewardBusy: () => boolean = () => false,
  seated: () => boolean = () => false,
) {
  const [layout, rail, stations, pieces, land, plans, tech, shapes, flatMod, sounds, look, kit, props, carry] =
    await Promise.all([
      import('../../place/layout.ts'),
      import('./rail-kit.ts'),
      import('./stations.ts'),
      import('../../place/pieces.ts'),
      import('../../place/land.ts'),
      import('../../place/opening-plans.ts'),
      import('../../place/tech-layout.ts'),
      import('../../render/part-geometry.ts'),
      import('../../render/flat.ts'),
      import('../../render/fanfare.ts'),
      import('../../place/look.ts'),
      import('../../place/look-kit.ts'),
      import('../../render/prop-kit.ts'),
      import('../../render/carry-models.ts'),
    ]);
  const { flat } = flatMod;
  const ox = layout.ORIGIN.x;
  // The same pull-out as Place's glider reveal, now owned by this view and queued behind its reward cards.
  const switchCamera = createCameraPullOut(rewardBusy, true, seated);
  owner.cleanup(() => switchCamera.dispose());
  let switchKind: 'sea' | 'quarry' | 'farHead' | null = null;
  function showSwitch(kind: 'sea' | 'quarry') {
    switchKind = kind;
    const gate = tech.GATES[kind];
    const source = kind === 'sea' ? tech.SEA_SWITCH : tech.LEVER;
    const from = new THREE.Vector3(source.x + ox - 12, source.y + 14, source.z + 22);
    const to = new THREE.Vector3(
      gate.x + ox - (kind === 'sea' ? 12 : 18),
      gate.y + (kind === 'sea' ? 12 : 16),
      gate.z + (kind === 'sea' ? 16 : 24),
    );
    const focus = new THREE.Vector3(gate.x + ox, gate.y + 2.5, gate.z);
    switchCamera.play(from, to, focus, 3.2, kind === 'sea' ? 1.2 : 3.2);
    return switchCamera.active();
  }
  const quarry = layout.LINKS[1]!;
  /** Q7's frame is at s 710 on line 2's path (RING_Q7_FRAME's comment); its heading is the line's there. */
  const RING_Q7_FRAME_S = 710;
  const P7 = { x: 0, z: 0, ux: 0, uz: 1 };
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const partMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  // Display-range glows and ink, as in Place (readable-unlit.ts): at the scene's surface gain they would read near black.
  const glow = readableGlow(
    new THREE.MeshStandardNodeMaterial({ color: '#39e6c6', emissive: '#39e6c6', emissiveIntensity: 1.2 }),
  );
  const teal = readableUnlit(new THREE.MeshBasicNodeMaterial({ color: '#39e6c6' }));
  materials.push(partMat, glow, teal);
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material = partMat) => {
    geometries.push(geometry);
    const m = new THREE.Mesh(geometry, material);
    m.castShadow = m.receiveShadow = true;
    owner.add(m);
    return m;
  };
  const STONE = '#917b5e',
    STONE2 = '#b6a080',
    BRASS = '#c79a3e';
  const rd = adapter.read;
  // What this view works out from the rows is worked out once for a world and a tick (a press makes a new predicted
  // world, a packet a new tick), however many of its parts ask: the stretch taking materials, and line 2's jobs with
  // their timed fields at the tick. A job row in the list is live (rows are written in place), and nothing here holds
  // one across a call that can run a rule.
  let seenW: ReadWorld | null = null,
    seenAt = -1,
    seenActive = -1,
    seenJobs: QJobRead[] | null = null;
  function seen(w: ReadWorld) {
    const at = rd.tick();
    if (w !== seenW || at !== seenAt) {
      seenW = w;
      seenAt = at;
      seenActive = line2Active(w);
      seenJobs = null;
    }
  }
  const activeIn = (w: ReadWorld) => (seen(w), seenActive);
  const jobsIn = (w: ReadWorld) => (seen(w), (seenJobs ??= line2Jobs(w, seenAt)));

  // ---------------------------------------------------------------- the forge
  // The furnace/output opening stays clear in the front wall, as in the prototype: the lit mouth shows through it.
  const plan = plans.openForgeMouth(plans.forgePlan());
  const { pieces: forgePieces, FRAME, WALLS, ROOFED } = plan;
  const TOTAL = forgePieces.length;
  const HAND = FRAME + (WALLS - FRAME) + (TOTAL - ROOFED);
  const KS = [...forgePieces.keys()];
  // Frame, then walls and chimney; the roof waits for trains (slice 5).
  const ORDER = [...KS.filter((k) => k < WALLS), ...KS.filter((k) => k >= ROOFED)];
  const [F1, F2] = LINE2_FORGE.bills;
  const piecesFor = (logs: number) =>
    logs <= F1
      ? Math.round((logs / F1) * FRAME)
      : Math.min(HAND, FRAME + Math.round(((logs - F1) / F2) * (HAND - FRAME)));
  const building = pieces.dropSet(
    forgePieces,
    (k) => {
      const b = forgePieces[k]!;
      thump(b.x, b.z);
      pieces.dustRing(b.x, b.y + 0.6, b.z, 6, 2, 0.3);
    },
    owner,
  );
  building.mesh.material = look.boardMaterial(building.mesh.material as THREE.Material);
  materials.push(building.mesh.material as THREE.Material);
  forgePieces.forEach((_, k) => building.snap(k, false));
  let shownPieces = 0;
  let wallsBody: Body | null = null;
  const chimneyTop = new THREE.Vector3(plan.smoke!.x, plan.smoke!.y + 0.2, plan.smoke!.z);
  const smokeCol = new THREE.Color(look.LOOK.light ? '#d9d5cc' : '#5d5a55');
  let smokeAcc = 0;
  const mouth = mesh(
    new THREE.BoxGeometry(2.8, 1.8, 0.1),
    readableGlow(new THREE.MeshStandardNodeMaterial({ color: '#3a1a08', emissive: '#ff5a0a', emissiveIntensity: 1.3 })),
  );
  materials.push(mouth.material as THREE.Material);
  mouth.position.set(plans.X, plan.y + 1.5, plans.Z + plans.D / 2 - 0.5);
  mouth.visible = false;
  const forgeFrame = stations.buildStation(
    layout.FORGE_BILLS[0]!,
    { x: layout.toWorld(layout.FORGE_FRAME.x), z: layout.FORGE_FRAME.z, yaw: Math.PI / 2, lx: 0, lz: -1 },
    owner,
  );
  // The rails rack the forge pours onto: posts come from the opening view; the steel is drawn here.
  const RX = LINE2_FORGE.rackX / 100,
    RZ = LINE2_FORGE.rackZ / 100,
    RY = land.H(RX, RZ);
  const RACK_SHOWN = 48;
  const racked = look.LOOK.kit
    ? kit.kitBatch('rail', look.STEEL, RACK_SHOWN, owner)
    : new THREE.InstancedMesh(
        new THREE.BoxGeometry(pieces.RAIL_SIZE.x, pieces.RAIL_SIZE.y, pieces.RAIL_SIZE.z),
        flat('#4c5058', 0.6),
        RACK_SHOWN,
      );
  // kitBatch only swaps in the kit's geometry: like every other kit batch, the caller puts it in the scene.
  owner.add(racked);
  racked.castShadow = true;
  racked.frustumCulled = false;
  racked.count = 0;
  const rackSlot = (k: number, out: THREE.Vector3) =>
    out.set(RX - 1 + (k % 8) * 0.285, RY + 0.46 + Math.floor(k / 8) * 0.19, RZ);
  const rackFrom = new THREE.Vector3(RX, RY + 1.6, RZ);
  const m4 = new THREE.Matrix4();
  const tmp = new THREE.Vector3();
  let drawnRack = -1;
  function drawRack(n: number) {
    n = Math.max(0, Math.min(RACK_SHOWN, n));
    if (n === drawnRack) return;
    drawnRack = n;
    racked.count = n;
    for (let k = 0; k < n; k++) racked.setMatrixAt(k, m4.makeTranslation(rackSlot(k, tmp)));
    racked.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the quarry line, its frames and the depot rack
  const track = rail.buildTrack(quarry, (_k, kind, x, y, z) => rail.thud(machine, kind, x, y, z), owner, 'panels');
  const frames = quarry.stations
    .slice(0, LINE2_STATIONS.length)
    .map((spec) => stations.buildStation(spec, stations.frameBesideLine(spec, quarry.line, quarry.dir), owner));
  // Place's quarry link frames Q1-Q6, the ones the laying machine works at; `machined` is those. Q7 (v27) is laid on the
  // pier's piled deck (call 55): its frame is the sim's (RING_Q7_FRAME) at the trestle's deck height, a frame like the
  // others for deposits, feeds, tags and the depot rack, but the machine stays parked at the pier head while its deck is
  // laid (./ring-deck.ts), so everything that follows the machine reads `machined`.
  const MACHINED = frames.length;
  const machined = (k: number) => k >= 0 && k < MACHINED;
  /** Q7's frame is built once the pier is laid (its deck, ./crossing-view.ts, stands from Q6): before then there is
   * nothing for it to stand on. It stays for the page's life. */
  function ensureQ7Frame() {
    if (frames.length > MACHINED || !pierLaid(line2Completed(adapter.read.world()))) return;
    layout.lineAt(quarry.line, RING_Q7_FRAME_S, P7);
    const out = { x: -P7.uz, z: P7.ux };
    frames.push(
      stations.buildStation(
        // "Line 2, station 7" follows the others' board ("Station 7"); the plan names no label for it.
        {
          id: 'Q7',
          s: 742,
          to: 862,
          side: 1,
          logs: 20,
          rails: 20,
          label: 'Line 2, station 7',
          crate: true,
          rack: 'train',
        },
        {
          x: RING_Q7_FRAME.x / 100,
          z: RING_Q7_FRAME.z / 100,
          yaw: Math.atan2(P7.ux, P7.uz),
          lx: out.x,
          lz: out.z,
          y: layout.railY(quarry.line, RING_Q7_FRAME_S) + Q7_DECK_UP,
        },
        owner,
      ),
    );
  }
  const framed = (k: number) => k >= 0 && k < frames.length;
  track.snapTo(track.u(layout.STUB.east));
  const depotLogs = pieces.logStackMesh(32, owner);
  depotLogs.count = 0;
  // The open ends of the rack and its logs face the path's approach, including on bends.
  const rackParts: Parameters<typeof shapes.merged>[0] = [];
  for (const x of [-1.1, 1.1]) {
    rackParts.push(['b', x, 0.08, 0, 0.2, 0.16, 1.6, '#8a6236']);
    for (const z of [-0.8, 0.8]) rackParts.push(['b', x, 0.65, z, 0.14, 1.3, 0.14, '#7f5630']);
  }
  const depotRack = mesh(shapes.merged(rackParts));
  depotRack.visible = false;
  // The rack's board stands on its own post beside the rack, its face toward the rack's open ends and the approach.
  const depotSign = stockSign(owner, 'logs');
  depotSign.board.visible = false;
  const depotYaw = (k: number) => frames[k]!.yaw - Math.PI / 2;
  const deck7 = { x: 0, y: 0, z: 0, yaw: 0 };
  const depotAt = new THREE.Vector3();
  const depotPlace = (k: number, out: THREE.Vector3) => {
    const f = frames[k]!;
    // On the approach beside the frame: clear its posts, feeder, parked machine and Q5's gate jambs.
    // Use the frame's tangent; normalizing a vector toward the frame crowded the pile against it on bends.
    // The full 3.2 m pickup zone stays inside the server's 7 m reach except Q6's dry approach rack below.
    out.set(f.x - Math.sin(f.yaw) * 3.4, 0, f.z - Math.cos(f.yaw) * 3.4);
    if (k === Q7) {
      // On the pier's piled deck, south of the frame (q7-site.ts), and over the sea: the deck's height, not the ground's.
      const d = q7Spot('rack', deck7);
      return out.set(d.x, d.y + 0.16, d.z);
    }
    if (LINE2_STATIONS[k]!.feed === 'train') {
      const p = rail.besideLine(quarry.line, LINE2_STATIONS[k]!.fromCm / 100 - 8, quarry.stations[k]!.side * 7.5);
      out.set(p.x, 0, p.z);
    }
    out.y = land.H(out.x, out.z) + 0.16; // the bearer tops, shared by unload flights and pickup targets
    return out;
  };
  const depotSlot = (k: number, n: number, out: THREE.Vector3) =>
    pieces.stackSlot(n, 4, depotPlace(k, depotAt), depotYaw(k), out);
  let drawnDepot = '';
  let cartFlying = () => ({ logs: 0 });
  function drawDepot(k: number, n: number, train: boolean) {
    const key = `${k}:${n}:${train}`;
    if (key === drawnDepot) return;
    drawnDepot = key;
    depotRack.visible = framed(k) && LINE2_STATIONS[k]!.depot;
    depotSign.board.visible = depotRack.visible;
    if (!depotRack.visible) {
      commitPieces(depotLogs, 0);
      return;
    }
    depotPlace(k, depotAt);
    depotRack.position.copy(depotAt).y -= 0.16;
    depotRack.rotation.y = depotYaw(k);
    depotSign.board.position
      .set(-1.2, 0, -1.55)
      .applyAxisAngle(THREE.Object3D.DEFAULT_UP, depotYaw(k))
      .add(depotRack.position);
    depotSign.board.position.y =
      k === Q7 ? depotAt.y - 0.16 : land.H(depotSign.board.position.x, depotSign.board.position.z);
    depotSign.board.rotation.y = depotYaw(k) + Math.PI / 2;
    depotSign.set(n);
    depotSign.show(train ? 'train' : 'logs');
    const shown = Math.min(32, n);
    for (let i = 0; i < shown; i++) pieces.setStackLog(depotLogs, i, depotSlot(k, i, tmp), depotYaw(k));
    // logStackMesh starts hidden. Commit visibility and colour uploads along with its matrices.
    commitPieces(depotLogs, shown);
  }

  // ---------------------------------------------------------------- route v2: the hook walk, the quarry ramp, the drive
  type Deck = { kind: 'hook' | 'quarry'; mesh: THREE.Mesh; body: Body | null };
  const decks: Deck[] = [];
  const width = tech.SERVICE_WIDTH;
  // The hook walk leaves the finished deck flush with its plank top, so stepping on never dips.
  const DECK_TOP = tech.HOOK_FLUSH.top; // the track's walkable top over rail height (rail.ts TOP)
  for (const kind of ['hook', 'quarry'] as const) {
    const points = tech.SERVICE_ROUTES[kind].map((p, i) => ({
      x: p.x,
      z: p.z,
      y: p.y + (kind === 'hook' && i < tech.HOOK_FLUSH.points ? DECK_TOP : 0),
    }));
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1]!,
        b = points[i]!;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        dy = b.y - a.y;
      const run = Math.hypot(dx, dz);
      const length = Math.hypot(run, dy);
      const deck = mesh(
        shapes.merged([
          ['b', 0, 0, 0, width, 0.35, length + 0.4, STONE2],
          ...[-1, 1].map((side): Parameters<typeof shapes.merged>[0][number] => [
            'b',
            side * (width / 2 - 0.06),
            0.18,
            0,
            0.12,
            0.02,
            length,
            BRASS,
          ]),
        ]),
      );
      deck.rotation.set(-Math.atan2(dy, run), Math.atan2(dx, dz), 0, 'YXZ');
      const normal = new THREE.Vector3(0, 0.175, 0).applyQuaternion(deck.quaternion);
      deck.position.set(ox + (a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2).sub(normal);
      deck.name = `route-${kind}-${i}`;
      deck.visible = false;
      decks.push({ kind, mesh: deck, body: null });
    }
  }
  const lever = tech.LEVER;
  // Two separated drive sockets stay visible; Q3 supplies the missing coupling between them.
  const sockets = mesh(
    shapes.merged([
      ['b', -0.5, 0.7, 0.3, 0.35, 0.3, 0.35, BRASS],
      ['b', 0.8, 0.7, -0.6, 0.35, 0.3, 0.35, BRASS],
    ]),
  );
  sockets.position.set(ox + lever.x, lever.y, lever.z);
  const drive = mesh(new THREE.BoxGeometry(0.28, 0.28, Math.hypot(1.3, 0.9)), glow);
  drive.rotation.y = Math.atan2(1.3, -0.9);
  drive.position.set(ox + lever.x + 0.15, lever.y + 0.7, lever.z - 0.15);
  drive.name = 'route-winch-drive';
  drive.visible = false;
  const winch = mesh(
    shapes.merged([
      ['c', 0, 0.7, 0, 0.42, 1, 0.42, '#6b5a3a', 0, Math.PI / 2],
      ['b', -0.6, 0.35, 0, 0.12, 0.7, 0.8, '#4e4c46'],
      ['b', 0.6, 0.35, 0, 0.12, 0.7, 0.8, '#4e4c46'],
    ]),
  );
  winch.position.set(lever.x + ox + 0.8, lever.y, lever.z - 0.6);
  const leverArm = new THREE.Group();
  leverArm.position.set(lever.x + ox - 0.5, lever.y + 0.15, lever.z + 0.3);
  leverArm.rotation.z = 0.75;
  const arm = mesh(
    shapes.merged([
      ['b', 0, 0.6, 0, 0.12, 1.3, 0.12, BRASS],
      ['s', 0, 1.3, 0, 0.17, 0.17, 0.17, '#d8392b'],
    ]),
  );
  leverArm.add(arm);
  owner.add(leverArm);
  const leverTarget = new THREE.Vector3(lever.x + ox - 0.5, lever.y + 1.4, lever.z + 0.3);
  // Pads: the quarry apron and pillar p2's top, solid from the start; the apron is 2.2 m up.
  const stonePad = (hx: number, hz: number, thick: number) =>
    shapes.merged([
      ['b', 0, -0.08, 0, hx * 2, thick - 0.16, hz * 2, STONE],
      ['b', 0, thick / 2 - 0.08, 0, hx * 2, 0.16, hz * 2, '#c6b28d'],
      ['b', 0, -thick / 2 + 0.06, 0, hx * 2 + 0.04, 0.12, hz * 2 + 0.04, '#6f604b'],
    ]);
  for (const id of ['apron', 'p2']) {
    const p = tech.padById(id);
    const pad = mesh(stonePad(p.hx, p.hz, 1.2));
    pad.position.set(p.x + ox, p.top - 0.6, p.z);
    land.addStatic({ kind: 'box', hx: p.hx, hy: 0.6, hz: p.hz }, pad.position, undefined, undefined, owner);
    if (id === 'apron') {
      const base = land.H(p.x + ox, p.z) - 0.5;
      const body = mesh(new THREE.BoxGeometry(p.hx * 2 - 0.2, p.top - 1.2 - base, p.hz * 2 - 0.2), flat(STONE, 0.9));
      body.position.set(p.x + ox, (p.top - 1.2 + base) / 2, p.z);
      land.addStatic(
        { kind: 'box', hx: p.hx - 0.1, hy: (p.top - 1.2 - base) / 2, hz: p.hz - 0.1 },
        body.position,
        undefined,
        undefined,
        owner,
      );
    }
  }
  const pillar = tech.PILLARS[1]!;
  const pillarBase = Math.min(land.H(pillar.x + ox, pillar.z) - 0.5, pillar.top - 2.2);
  const pillarH = pillar.top - 1.2 - pillarBase;
  const column = mesh(new THREE.CylinderGeometry(pillar.r - 0.4, pillar.r + 1.4, pillarH, 7), flat(STONE, 0.9));
  column.position.set(pillar.x + ox, pillarBase + pillarH / 2, pillar.z);
  land.addStatic(
    { kind: 'cylinder', rTop: pillar.r - 0.4, rBottom: pillar.r + 1.4, h: pillarH, segments: 7 },
    column.position,
    undefined,
    undefined,
    owner,
  );
  const hook = tech.DEVICES.hook;
  const hookAt = new THREE.Vector3(hook.x + ox, hook.y, hook.z);
  const drum = mesh(
    shapes.merged([
      ['c', 0, 0.35, 0, 0.72, 0.7, 0.72, '#55524a'],
      ['c', 0, 0.78, 0, 0.56, 0.16, 0.56, '#6d6a60'],
      ['c', 0, 0.9, 0, 0.5, 0.06, 0.5, '#c79a3e'],
    ]),
  );
  drum.position.copy(hookAt);
  land.addStatic(
    { kind: 'cylinder', rTop: 0.6, rBottom: 0.72, h: 0.9, segments: 8 },
    { x: hookAt.x, y: hook.y + 0.45, z: hookAt.z },
    undefined,
    undefined,
    owner,
  );
  const hookRing = mesh(new THREE.TorusGeometry(0.72, 0.05, 8, 26), teal);
  const hookCore = mesh(new THREE.OctahedronGeometry(0.26), teal);
  hookRing.position.copy(hookAt).y += 1.45;
  hookRing.rotation.x = Math.PI / 2;
  hookCore.position.copy(hookRing.position);
  const hookTarget = hookAt.clone().add(new THREE.Vector3(0, 2.2, 0));
  const hookPrize = shapes.merged(HOOK_REWARD.parts);
  geometries.push(hookPrize);
  // The quarry gate: two jambs under a headstock, and the slab across the bed hung from it, solid until it drops. Its
  // chains run from the slab's top over the headstock's sheaves to the lever's winch and pay out as it sinks (gate-rig.ts).
  const G = tech.GATES.quarry;
  const SLAB = tech.GATE_SLAB;
  const gateQ = new THREE.Quaternion().setFromAxisAngle(THREE.Object3D.DEFAULT_UP, G.yaw);
  const gateRig = createGateRig(
    owner,
    { land, shapes, flat, partMat },
    {
      x: G.x + ox,
      y: G.y,
      z: G.z,
      yaw: G.yaw,
      slab: SLAB,
      winch: { x: winch.position.x, y: lever.y + 0.7, z: winch.position.z, r: 0.42 },
    },
  );
  const slab = mesh(
    shapes.merged([
      ['b', 0, 0, 0, SLAB.w, SLAB.h, SLAB.d, STONE2],
      ['b', 0, SLAB.h / 2 - 0.3, SLAB.d / 2 + 0.01, SLAB.w - 0.6, 0.2, 0.04, '#39e6c6'],
      ...gateEyes(SLAB),
    ]),
  );
  slab.quaternion.copy(gateQ);
  const slabUp = G.y + SLAB.h / 2,
    slabDown = slabUp - SLAB.h - 0.6;
  slab.position.set(G.x + ox, slabUp, G.z);
  let slabBody: Body | null = null;
  let slabT = -1;
  const seaGate = createRailwaySeaGate(adapter, owner, { layout, tech, land, shapes, flat, sounds, partMat, glow });
  const glideDevice = createRailwayGlideDevice(adapter, owner, { land, shapes, partMat, glow, youGot });
  const farHead = createRailwayFarHead(owner, {
    layout,
    rail,
    land,
    flat,
    sounds,
    busy: rewardBusy,
    shot: (from, to, at, seconds) => {
      switchKind = 'farHead';
      switchCamera.play(from, to, at, seconds);
    },
  });
  const boiler = createRailwayBoiler(
    adapter,
    owner,
    { land, props, carry, engine: await import('./engine-kit.ts'), sounds, pieces, flat, youGot },
    chimneyTop,
  );
  const pier = createRailwayPier(owner, { layout, rail, sounds, adapter, track });
  // The forge's roof, chimney cap and workshop once the crossing is done (works-late-game step 6).
  const finish = await createForgeFinish(adapter, owner, {
    plan,
    building,
    unseal: () => {
      if (!wallsBody) return;
      owner.removeBody(wallsBody);
      wallsBody = null;
    },
  });

  // ---------------------------------------------------------------- the machine on line two
  const TURN_HEAD = layout.STUB.east;
  let visualHead = TURN_HEAD,
    targetHead = TURN_HEAD,
    setback = 2.4,
    sinceTick = 0,
    shownTick = -1;
  const feedLaunched = [0, 0, 0];
  let deposits: { active: () => boolean; station: number; kind: number }[] = [];
  const from = new THREE.Vector3();
  /** The machine has crossed to line two: the forge is lit and the turn has played. */
  const working = () => {
    const lit = forgeRow(rd.world()).lit;
    return lit >= 0 && rd.tick() >= lit + LINE2_FORGE.turnTicks;
  };
  const activeIndex = () => {
    const active = activeIn(rd.world());
    // Q6's frame once the active job is not the machine's (all laid, or Q7): the machine parks at the pier's end.
    return machined(active) ? active : MACHINED - 1;
  };
  const jobElapsed = (k: number) => {
    const w = rd.world(),
      { job, run } = jobsIn(w)[k]!;
    return run.elapsed + (k === activeIn(w) && job.start >= 0 && !job.completion && rd.ready() ? sinceTick * 10 : 0);
  };
  const phaseOf = (k: number) => {
    const { job, run } = jobsIn(rd.world())[k]!;
    if (job.completion) return 'done';
    if (job.start < 0) return 'idle';
    const feed = lineFeed(LINE2_STATIONS[k]!, job);
    const feedEnd = Math.ceil(job.depositMs / 100) + Math.ceil(Math.max(0, ...feed.map((f) => f.landMs)) / 100);
    return run.elapsed < Math.ceil(job.depositMs / 100) ? 'deposit' : run.elapsed < feedEnd ? 'feeding' : 'laying';
  };
  const head = () => {
    const k = activeIndex(),
      spec = LINE2_STATIONS[k]!,
      job = jobsIn(rd.world())[k]!.job;
    if (job.completion) return spec.toCm / 100;
    if (job.start < 0) return spec.fromCm / 100;
    const depositTicks = Math.ceil(job.depositMs / 100);
    const feed = lineFeed(spec, job);
    const feedTicks = Math.ceil(Math.max(0, ...feed.map((f) => f.landMs)) / 100);
    return (
      (spec.fromCm +
        Math.min(spec.toCm - spec.fromCm, lineLayDistance(jobElapsed(k) - depositTicks - feedTicks, job))) /
      100
    );
  };
  const panelState = (): PanelState => {
    const jobs = jobsIn(rd.world());
    let count = 0;
    for (let k = 0; k < jobs.length; k++) {
      const { job, run } = jobs[k]!;
      if (machined(k) && job.start >= 0) count += linePanelCount(LINE2_STATIONS[k]!, run.elapsed, job);
    }
    const k = activeIndex(),
      job = jobs[k]!.job;
    const before = STRETCH_PAIRS.slice(0, k).reduce((n, pairs) => n + pairs, 0);
    const stock = job.start >= 0 && !job.completion ? STRETCH_PAIRS[k]! - (count - before) : 0;
    return { phase: phaseOf(k), activeStation: k, panelStock: Math.max(0, stock), panelCount: count };
  };
  const panels = createRailwayPanelView(
    machine,
    track,
    panelState,
    () => visualHead,
    (end, unit) => {
      const p = rail.besideLine(quarry.line, end, 0);
      clank(p.x, p.z);
      // Contact dust once per stock unit, as before the pairs: smaller commits add no smoke.
      if (unit) pieces.dustRing(p.x, layout.railY(quarry.line, end) + 0.1, p.z, 4, 0.5, 0.12);
    },
    owner,
  );
  function step(dt: number) {
    const previous = visualHead - setback;
    const k = activeIndex(),
      job = jobsIn(rd.world())[k]!.job;
    const speed = job.cruiseCmPerTick / 10;
    const laying = phaseOf(k) === 'laying';
    if (visualHead < targetHead) {
      const s = Math.min(targetHead - visualHead, speed * dt);
      visualHead += s;
      setback = Math.min(machine.F, setback + s);
    } else if (!laying && setback > 2.4) setback = Math.max(2.4, setback - speed * dt);
    machine.at(quarry.line, visualHead, 1, setback);
    const moved = visualHead - setback - previous;
    if (moved > 0) machine.moved(moved);
  }
  // The forge's lighting is the server's to decide (a predicted deposit that fills it waits): its fanfare plays when the
  // mirror shows it lit, never on a rebuild.
  let litShown = forgeRow(rd.world()).lit;
  // Rails the mirror has poured that are still flying from the mouth to the rack (Local): the rack shows each as it lands.
  let pouredShown = forgeRow(rd.world()).poured,
    pouring = 0,
    pourGeneration = 0;
  function restore() {
    ensureQ7Frame();
    switchCamera.reset();
    switchKind = null;
    deposits = [];
    const w = rd.world(),
      f = forgeRow(w),
      jobs = jobsIn(w);
    litShown = f.lit;
    pouredShown = f.poured;
    pouring = 0;
    pourGeneration++;
    for (let k = 0; k < jobs.length; k++) {
      if (!framed(k)) continue;
      const { job, run } = jobs[k]!;
      const spec = LINE2_STATIONS[k]!;
      const depositTicks = Math.ceil(job.depositMs / 100);
      feedLaunched[k] =
        job.start < 0
          ? 0
          : lineFeed(spec, job).filter((fl) => fl.launchMs <= (run.elapsed - depositTicks) * 100).length;
    }
    seaGate.restore(railRow(w).sea);
    glideDevice.restore(line2Completed(w));
    farHead.restore(jobs[4]!.job.completion === 1);
    boiler.restore();
    pier.restore(jobs[5]!.job.completion === 1);
    visualHead = targetHead = working() ? head() : TURN_HEAD;
    setback = 2.4;
    if (working()) {
      const k = activeIndex();
      if (phaseOf(k) === 'laying') setback = Math.min(machine.F, 2.4 + visualHead - LINE2_STATIONS[k]!.fromCm / 100);
      machine.at(quarry.line, visualHead, 1, setback);
      machine.snap();
    }
    panels.restore();
    // Walls are solid only once the accepted second bill has started; rebuild from state like the decks and gate.
    if (wallsBody && f.used <= F1) {
      owner.removeBody(wallsBody);
      wallsBody = null;
    }
    shownPieces = piecesFor(f.used);
    building.clear();
    forgePieces.forEach((_, k) => building.snap(k, false));
    for (let n = 0; n < shownPieces; n++) building.snap(ORDER[n]!, true);
    finish.restore(); // after the pieces: it snaps the roof back on once the crossing is done
    drawnDepot = '';
  }

  // ---------------------------------------------------------------- accepted effects
  function accepted(event: RailwayAccepted) {
    const w = rd.world(),
      pid = rd.pid;
    seaGate.accepted(event);
    glideDevice.accepted(event);
    boiler.accepted(event);
    if (event.op === 'rail.seaSwitch') playSharedMoment('sea gate', event, pid, () => showSwitch('sea'));
    if (event.op === 'rail.forgeTake') {
      const railsHeld = account(w, pid)?.rails ?? 0;
      for (let n = 0; n < event.accepted - (event.returned ?? 0); n++)
        deposits.push({
          station: -2,
          kind: 2,
          active: pieces.send(
            'rail',
            rackFrom,
            rackFrom,
            {
              dur: 0.3,
              apex: 0.9,
              aim: (out) => void bundleOrigin(event.pid, railsHeld, out),
              land: () => sounds.pop(3, 0.4),
            },
            owner,
          ),
        });
      return;
    }
    if (event.op === 'rail.depotTake') {
      const taken = event.accepted - (event.returned ?? 0);
      const carried = event.carried ?? account(w, event.pid)?.carry ?? 0;
      const active = activeIn(w),
        depot = railRow(w).depot;
      for (let n = 0; n < taken; n++) {
        depotSlot(Math.max(0, active), depot + taken - n - 1, from);
        pieces.send(
          'log',
          from,
          from,
          { dur: 0.3, delay: n * 0.025, apex: 0.9, aim: (out) => void bundleOrigin(event.pid, carried, out) },
          owner,
        );
      }
      return;
    }
    if (event.op === 'rail.lever') {
      playSharedMoment('quarry gate', event, pid, () => showSwitch('quarry'));
      slabT = 0;
      whistle(G.x + ox, G.z);
      clank(lever.x + ox, lever.z);
      return;
    }
    if (event.op === 'rail.hook') {
      // Only the finder gets the card; everyone else's flourish is ability-arrival.ts (co-op abilities, option E).
      if (event.pid !== pid) return;
      placeSound('pickupJump', hookAt.x, hookAt.z);
      // The reveal brings its own fanfare and card, as the jump device's does (tools.ts).
      youGot({
        key: 'hook',
        name: HOOK_REWARD.name,
        line: HOOK_REWARD.line,
        model: new THREE.Mesh(hookPrize, partMat),
        from: hookRing.position.clone(),
        done: () => hookShown?.(),
      });
      return;
    }
    if (event.op !== 'rail.deposit') return;
    const forge = event.station === 'F';
    const k = forge ? -1 : LINE2_STATIONS.findIndex((s) => s.id === event.station);
    if (!forge && !framed(k)) return;
    const frame = forge ? forgeFrame : frames[k]!;
    const kind = event.kind === 2 ? 2 : 0;
    const actor = account(w, event.pid);
    // As this deposit left them (several can share one packet): the actor's balance and the frame's count.
    const carried = event.carried ?? (kind === 2 ? (actor?.rails ?? 0) : (actor?.carry ?? 0));
    const job = forge ? null : qjob(w, k);
    const current = job ? (event.level ?? (kind === 2 ? job.railDelivered : job.delivered)) : 0;
    for (let n = 0; n < event.accepted; n++) {
      if (!bundleOrigin(event.pid, carried + event.accepted - n - 1, from)) continue;
      const slot = Math.max(0, current - event.accepted + n);
      const target = forge
        ? frame.feederEnd
        : kind === 2
          ? frame.railSlot(slot, new THREE.Vector3())
          : frame.logSlot(slot, new THREE.Vector3());
      const active = pieces.send(
        kind === 2 ? 'rail' : 'log',
        from,
        target,
        {
          dur: 0.32,
          apex: 0.9,
          size: kind === 2 ? undefined : [1, 2.2],
          land: () => {
            sounds.knock(0.7, 1);
            thump(frame.x, frame.z);
          },
        },
        owner,
      );
      deposits.push({ active, station: k, kind });
    }
  }
  // A predicted line-two action the server did not take (replication R1b; Local presentation): rails or logs you were
  // shown taking go back to the rack or the depot (or to whoever got them), deposits lift out of the frame back to you,
  // and a lever you were shown pulling swings back with a clank.
  const UP_08 = new THREE.Vector3(0, 0.8, 0);
  function corrected(c: RailwayCorrection) {
    const w = rd.world(),
      pid = rd.pid,
      stock = railRow(w);
    const e = c.event;
    seaGate.corrected(c);
    boiler.corrected(c);
    if ((e.op === 'rail.seaSwitch' && !stock.sea) || (e.op === 'rail.lever' && !stock.lever)) switchCamera.cancel();
    if (e.op === 'rail.lever') {
      clank(lever.x + ox, lever.z);
      return;
    }
    const rails = e.op === 'rail.forgeTake' || ('kind' in e && e.kind === 2);
    const mine = account(w, pid);
    const held = (rails ? mine?.rails : mine?.carry) ?? 0;
    const home =
      e.op === 'rail.forgeTake'
        ? rackFrom
        : e.op === 'rail.depotTake'
          ? depotPlace(framed(activeIn(w)) ? activeIn(w) : 0, new THREE.Vector3()).add(UP_08)
          : null;
    if (home) {
      for (let n = 0; n < c.lost; n++) {
        if (!bundleOrigin(pid, held + c.lost - n - 1, from)) continue;
        const winner = c.winner;
        pieces.send(
          rails ? 'rail' : 'log',
          from,
          home,
          {
            dur: 0.3,
            apex: 0.8,
            aim: winner
              ? (out) => {
                  const a = account(rd.world(), winner);
                  bundleOrigin(winner, (rails ? a?.rails : a?.carry) ?? 0, out);
                }
              : undefined,
            land: () => sounds.knock(0.3, 0.6),
          },
          owner,
        );
      }
      return;
    }
    if (e.op !== 'rail.deposit') return;
    const forge = e.station === 'F';
    const k = forge ? -1 : LINE2_STATIONS.findIndex((s) => s.id === e.station);
    if (!forge && !framed(k)) return;
    const frame = forge ? forgeFrame : frames[k]!;
    for (let n = 0; n < c.lost; n++) {
      const slot = Math.max(0, (e.level ?? 0) - 1 - n);
      const at = forge
        ? frame.feederEnd
        : rails
          ? frame.railSlot(slot, new THREE.Vector3())
          : frame.logSlot(slot, new THREE.Vector3());
      if (!bundleOrigin(pid, held - c.lost + n, from)) continue;
      pieces.send(
        rails ? 'rail' : 'log',
        at,
        from.clone(),
        { dur: 0.3, apex: 0.8, land: () => sounds.pop(3, 0.4) },
        owner,
      );
    }
    clank(frame.x, frame.z);
  }
  const offAccepted = adapter.onAccepted(accepted);
  const offCorrected = adapter.onCorrected(corrected);
  // After a lost connection or a resync the views carry on from the new state rather than rebuild (and snap).
  const offReset = adapter.onReset((soft) => {
    if (!soft) restore();
  });
  owner.cleanup(() => {
    offAccepted();
    offCorrected();
    offReset();
    for (const g of geometries) g.dispose();
    for (const m of materials) m.dispose();
  });

  // ---------------------------------------------------------------- per frame
  let unload = 0,
    wasWorking = false,
    nudged = false,
    nudges = 0;
  const wake = new THREE.Vector3();
  function syncSolids(w: ReadWorld, completed: number) {
    for (const deck of decks) {
      const on = line2Routes(completed)[deck.kind];
      deck.mesh.visible = on;
      if (on && !deck.body) {
        deck.mesh.geometry.computeBoundingBox();
        const size = deck.mesh.geometry.boundingBox!.getSize(wake);
        deck.body = land.addStatic(
          { kind: 'box', hx: size.x / 2, hy: 0.175, hz: size.z / 2 },
          deck.mesh.position,
          deck.mesh.quaternion,
          undefined,
          owner,
        );
      } else if (!on && deck.body) {
        owner.removeBody(deck.body);
        deck.body = null;
      }
    }
    drive.visible = line2Routes(completed).quarry;
    const down = line2GateOpen(w);
    if (down && slabBody) {
      owner.removeBody(slabBody);
      slabBody = null;
    }
    if (!down && !slabBody) {
      slabBody = land.addStatic(
        { kind: 'box', hx: SLAB.w / 2, hy: SLAB.h / 2, hz: SLAB.d / 2 },
        { x: G.x + ox, y: slabUp, z: G.z },
        gateQ,
        undefined,
        owner,
      );
    }
    if (slabT < 0) slab.position.y = down ? slabDown : slabUp;
  }
  const api = {
    /** Line two owns the machine once the forge is lit and the turn has played. */
    working,
    /** The boiler's haul pace (before the controller) and its rope (after Buddy's final pose). */
    prePhysics: () => boiler.prePhysics(),
    /** The old loco's boiler (train-view.ts), where a fit lands. */
    boilerSeat: (fn: () => THREE.Matrix4) => boiler.seatFrom(fn),
    boilerFlying: () => boiler.flying(),
    lateUpdate: () => boiler.lateUpdate(),
    step,
    panelFrame: (dt: number) => panels.frame(dt),
    snapshot() {
      restore();
      wasWorking = working();
    },
    update(dt: number) {
      switchCamera.update(dt);
      // The frame's rows: the world is read once, here, and so is the tick; nothing below holds a row across a call
      // that can run a rule (depositLine2 is the last thing this does).
      const w = rd.world(),
        tick = rd.tick(),
        pid = rd.pid;
      const fg = forgeRow(w),
        stock = railRow(w),
        active = activeIn(w),
        jobs = jobsIn(w),
        completed = line2Completed(w),
        gateOpen = line2GateOpen(w);
      const owed = waitsForTrainOn(w, active);
      if (tick !== shownTick) {
        shownTick = tick;
        sinceTick = 0;
      } else sinceTick = Math.min(0.1, sinceTick + dt);
      // The forge: pieces follow accepted logs; the mouth glows when lit; rails stand on the rack.
      const wantPieces = piecesFor(fg.used);
      while (shownPieces < wantPieces) building.drop(ORDER[shownPieces++]!, 3.2, 0.3);
      building.update(dt);
      finish.update(dt);
      mouth.visible = fg.lit >= 0;
      if (litShown < 0 && fg.lit >= 0) {
        sounds.fanfare(true);
        whistle(plans.X, plans.Z);
        pieces.dustRing(plans.X, plan.y + 0.4, plans.Z, 16, 3.2, 0.5);
      }
      litShown = fg.lit;
      if (fg.lit >= 0) {
        // Lit: the chimney smokes and each poured rail flies out of the mouth onto the rack, as in the prototype.
        smokeAcc += dt * 3;
        for (; smokeAcc >= 1; smokeAcc--)
          emit({
            x: chimneyTop.x + (Math.random() - 0.5) * 0.4,
            y: chimneyTop.y,
            z: chimneyTop.z + (Math.random() - 0.5) * 0.4,
            vx: 0.5,
            vy: 3.2 + Math.random(),
            vz: 0,
            life: 5,
            size: 1.1,
            grow: [1, 3.4],
            alpha: 0.75,
            fade: 0.5,
            color: smokeCol,
            drag: 0.2,
          });
      }
      if (fg.poured < pouredShown) pouredShown = fg.poured;
      const fresh = fg.poured - pouredShown;
      pouredShown = fg.poured;
      // A burst (a rebuild or a long hitch) just stands on the rack; ordinary pours arrive one at a time.
      for (let n = 0; fresh <= 4 && n < fresh; n++) {
        const to = rackSlot(Math.max(0, fg.rack - fresh + n), new THREE.Vector3());
        const generation = pourGeneration;
        pouring++;
        pieces.send(
          'rail',
          mouth.position,
          to,
          {
            dur: 0.55,
            apex: 1.1,
            land: () => {
              if (generation !== pourGeneration) return;
              pouring = Math.max(0, pouring - 1);
              clank(to.x, to.z);
              pieces.dustRing(to.x, to.y, to.z, 2, 0.6, 0.1);
            },
          },
          owner,
        );
      }
      const walls = fg.used > F1 && !finish.open();
      if (walls && !wallsBody)
        wallsBody = land.addStatic(
          { kind: 'box', hx: plans.W / 2, hy: plans.HIGH / 2, hz: plans.D / 2 },
          { x: plans.X, y: plan.y + plans.HIGH / 2, z: plans.Z },
          undefined,
          undefined,
          owner,
        );
      const inFlight = deposits.filter((d) => d.station === -2 && d.active()).length;
      drawRack(Math.max(0, fg.rack - pouring) + inFlight);
      deposits = deposits.filter((d) => d.active());
      const forgeStage = fg.used < F1 ? 0 : 1;
      forgeFrame.spec = layout.FORGE_BILLS[forgeStage]!;
      forgeFrame.have.logs = forgeStage ? fg.used - F1 : fg.used;
      forgeFrame.drawStock({ logs: 0, rails: 0, stone: 0, beam: 0 });
      const pathOpen = line1Job(w, 2).completion === 1;
      // railPhase is not cheap: asked only when the other two conditions hold.
      forgeFrame.setTag(pathOpen && fg.lit < 0 && railPhase(w, tick, tick) === 'done');
      // The machine crosses once the forge is lit.
      const now = working();
      if (now && !wasWorking) {
        whistle(machine.flatbed.x, machine.flatbed.z);
        restore();
      }
      wasWorking = now;
      // Q frames: stock, feed flights into the machine, tags.
      for (let k = 0; k < jobs.length; k++) {
        if (!framed(k)) continue;
        const job = jobs[k]!.job;
        const spec = LINE2_STATIONS[k]!,
          frame = frames[k]!;
        const feed = lineFeed(spec, job);
        const depositTicks = Math.ceil(job.depositMs / 100);
        const feedMs = (jobElapsed(k) - depositTicks) * 100;
        const wanted = job.start < 0 ? 0 : feed.filter((f) => f.launchMs <= feedMs).length;
        while (feedLaunched[k]! < wanted) {
          const f = feed[feedLaunched[k]!]!;
          feedLaunched[k]!++;
          if (f.landMs <= feedMs) continue;
          pieces.send(
            f.kind === 'stone' ? 'rail' : 'log',
            f.kind === 'stone' ? frame.railSlot(f.slot, from) : frame.logSlot(f.slot, from),
            frame.feederEnd,
            {
              dur: (f.landMs - f.launchMs) / 1000,
              apex: 0.15,
              size: f.kind === 'stone' ? undefined : [2.2, 2.2],
              aim: (out) => void machine.worldCradle(out),
              land: () => clank(frame.x, frame.z),
            },
            owner,
          );
        }
        const launched = feed.slice(0, feedLaunched[k]);
        const flying = (kind: number) => deposits.filter((d) => d.station === k && d.kind === kind).length;
        frame.have.logs = job.start >= 0 ? spec.bill[0] : job.stock;
        frame.have.rails = job.start >= 0 ? spec.bill[1] : job.railStock;
        frame.drawStock({
          logs:
            job.start >= 0
              ? spec.bill[0] - launched.filter((f) => f.kind === 'log').length
              : Math.max(0, job.stock - flying(0)),
          rails:
            job.start >= 0
              ? spec.bill[1] - launched.filter((f) => f.kind === 'stone').length
              : Math.max(0, job.railStock - flying(2)),
          stone: 0,
          beam: 0,
        });
        const gated = spec.gate === 'quarry' ? !gateOpen : spec.gate === 'sea' ? !stock.sea : false;
        const waiting = gated && job.stock === spec.bill[0] && job.railStock === spec.bill[1];
        frame.setTag(
          now && k === active && job.start < 0 && !owed,
          waiting ? `Pull the ${spec.gate === 'quarry' ? 'lever' : 'switch'} to start` : undefined,
        );
        if (now && k === activeIndex()) {
          const entered = feed.filter((f) => f.kind === 'log' && f.landMs <= feedMs).length;
          const fraction = Math.min(
            1,
            Math.max(0, (visualHead - spec.fromCm / 100) / ((spec.toCm - spec.fromCm) / 100)),
          );
          machine.setCradle(Math.min(entered, Math.ceil(spec.bill[0] * (1 - fraction))));
        }
      }
      if (now) {
        targetHead = head();
        panels.update(dt);
      }
      drawDepot(active, Math.max(0, stock.depot - cartFlying().logs), owed || kitComing(w, active));
      depotSign.update(dt);
      syncSolids(w, completed);
      seaGate.update(dt, stock.sea);
      glideDevice.update(dt, completed);
      farHead.update(dt, jobs[4]!.job.completion === 1);
      boiler.update(dt);
      pier.update(dt, jobs[5]!.job.completion === 1);
      ensureQ7Frame();
      if (slabT >= 0) {
        slabT += dt;
        const u = Math.min(1, slabT / 1.5);
        slab.position.y = slabUp - (slabUp - slabDown) * (u * u * (3 - 2 * u));
        if (u >= 1) {
          slabT = -1;
          thump(G.x + ox, G.z);
          pieces.dustRing(G.x + ox, G.y + 0.4, G.z, 16, 5, 0.5);
        }
      }
      gateRig.pose(slab.position.y);
      leverArm.rotation.z += ((stock.lever ? -0.85 : 0.75) - leverArm.rotation.z) * Math.min(1, dt * 10);
      for (const o of [hookRing, hookCore]) o.visible = completed >= 2 && !stock.hook;
      hookRing.rotation.z += dt * 0.7;
      hookCore.rotation.y += dt * 1.2;
      // Auto-unload at the forge frame and the active Q frame, as on line one.
      unload -= dt;
      const p = me.body?.position;
      if (!rd.ready() || !p) return;
      const mine = account(w, pid),
        carry = mine?.carry ?? 0,
        railsCarry = mine?.rails ?? 0;
      const near = (x: number, z: number) => Math.hypot(p.x - x, p.z - z) <= layout.TUNE.reachStation;
      // A loaded arrival at station 6 before trains: the frame takes nothing, so its rack sign answers once, without
      // words (one bob, one puff, a soft tick); it re-arms only once you leave reach.
      const arrived = owed && framed(active) && near(frames[active]!.x, frames[active]!.z);
      if (arrived && !nudged && (carry > 0 || railsCarry > 0)) {
        nudged = true;
        nudges++;
        depotSign.nudge();
        uiSound('tick');
      } else if (!arrived) nudged = false;
      if (unload > 0) return;
      if (pathOpen && fg.used < LINE2_FORGE.logs && carry > 0 && near(forgeFrame.x, forgeFrame.z)) {
        if (adapter.depositLine2('F', 1, 0)) unload = layout.TUNE.unloadS;
        return;
      }
      const k = active;
      if (!now || !framed(k)) return;
      const job = jobs[k]!.job,
        spec = LINE2_STATIONS[k]!,
        frame = frames[k]!;
      // Retry both materials while in reach, even after a refused attempt. Gates only hold laying.
      if (job.start >= 0 || owed || !near(frame.x, frame.z)) return;
      if (carry > 0 && job.stock < spec.bill[0] && adapter.depositLine2(spec.id, 1, 0)) unload = layout.TUNE.unloadS;
      else if (railsCarry > 0 && job.railStock < spec.bill[1] && adapter.depositLine2(spec.id, 1, 2))
        unload = layout.TUNE.unloadS;
    },
    /** Where the depot rack for stretch k stands (the rails shelf stands beside it: shelf-view.ts). */
    depotPlace,
    /** Which way the depot rack for stretch k is turned (its local -z end carries its boards). */
    depotYaw,
    depotSlot,
    /** Pieces the cart is heaving onto the rack (cart-view.ts): shown once they land. */
    holdDepot(fn: () => { logs: number }) {
      cartFlying = fn;
    },
    targets(): Interactable[] {
      const p = me.body?.position;
      if (!p || !rd.ready()) return [];
      const w = rd.world(),
        active = activeIn(w),
        stock = railRow(w),
        completed = line2Completed(w),
        quarryRoute = line2Routes(completed).quarry;
      const out: Interactable[] = [...seaGate.targets(p, stock.sea), ...glideDevice.targets(p, completed)];
      out.push(...boiler.targets());
      const full = freeCarryIgnoringBig(w, rd.pid) <= 0 ? { blocked: 'Your back is full' } : {};
      if (
        forgeRow(w).rack > 0 &&
        forgeRailsOffered(active, line2Trains(w), shedRow(w).cradleRails, account(w, rd.pid)?.rails ?? 0) &&
        Math.hypot(p.x - RX, p.z - RZ) <= 3
      )
        out.push({
          id: 'railway-forge-rails',
          verb: 'Take rails',
          at: rackFrom,
          run: () => void adapter.forgeTake(),
          ...full,
        });
      if (stock.depot > 0 && framed(active) && !waitsForTrainOn(w, active)) {
        depotPlace(active, from);
        if (
          Math.hypot(p.x - from.x, p.z - from.z) <= 3.2 &&
          (LINE2_STATIONS[active]!.feed !== 'train' ||
            Math.hypot(p.x - frames[active]!.x, p.z - frames[active]!.z) <= 7)
        )
          out.push({
            id: 'railway-depot-logs',
            verb: 'Pick up',
            at: from.clone().setY(from.y + 1),
            run: () => void adapter.depotTake(),
            ...full,
          });
      }
      // The lever is always there to try; before Q3 the uncoupled drive means a pull does nothing.
      if (!stock.lever && Math.hypot(p.x - leverTarget.x, p.z - leverTarget.z) < 3 && p.y > lever.y - 0.2)
        out.push({
          id: 'railway-quarry-lever',
          verb: 'Pull',
          at: leverTarget,
          run: () => {
            if (!quarryRoute) {
              clank(leverTarget.x, leverTarget.z);
              return;
            }
            void adapter.pullLever();
          },
        });
      if (
        completed >= 2 &&
        !stock.hook &&
        Math.hypot(p.x - hookAt.x, p.z - hookAt.z) <= 3 &&
        Math.abs(p.y - hookAt.y) <= 2.2
      )
        out.push({ id: 'railway-hook-device', verb: 'Take it', at: hookTarget, run: () => void adapter.claimHook() });
      return out;
    },
    inspect: () => {
      const w = rd.world(),
        active = activeIn(w),
        stock = railRow(w),
        completed = line2Completed(w);
      return {
        working: working(),
        ...seaGate.inspect(),
        ...glideDevice.inspect(),
        switchCamera: { ...switchCamera.inspect(), kind: switchKind },
        ...farHead.inspect(),
        ...boiler.inspect(),
        ...pier.inspect(),
        trainOwed: waitsForTrainOn(w, active),
        q6Sign: { kind: depotSign.kind, visible: depotSign.board.visible, nudges },
        q6Rack: (() => {
          const p = depotPlace(5, new THREE.Vector3());
          return {
            x: p.x,
            y: p.y,
            z: p.z,
            ground: land.H(p.x, p.z),
            frameDistance: Math.hypot(p.x - frames[5]!.x, p.z - frames[5]!.z),
            shown: active === 5 ? depotLogs.count : 0,
          };
        })(),
        head: visualHead,
        targetHead,
        setback,
        panelCursor: track.cursor,
        forgePieces: shownPieces,
        forgeFinish: finish.inspect(),
        forgeLit: mouth.visible,
        rackShown: racked.count,
        depotShown: depotLogs.count,
        routes: decks.map((d) => ({ kind: d.kind, visible: d.mesh.visible, solid: !!d.body })),
        drive: drive.visible,
        gateSolid: !!slabBody,
        lever: { x: leverTarget.x, y: lever.y, z: leverTarget.z, pulled: stock.lever },
        hook: { x: hookAt.x, y: hookAt.y, z: hookAt.z, available: completed >= 2 && !stock.hook },
        forgeFrame: { x: forgeFrame.x, y: forgeFrame.y, z: forgeFrame.z },
        forgeRack: { x: RX, y: RY, z: RZ },
        frames: frames.map((f) => ({ x: f.x, y: f.y, z: f.z })),
        depot: framed(active) ? depotPlace(active, new THREE.Vector3()).toArray() : null,
        routePoints: {
          hook: tech.SERVICE_ROUTES.hook.map((q) => [q.x + ox, q.y, q.z]),
          quarry: tech.SERVICE_ROUTES.quarry.map((q) => [q.x + ox, q.y, q.z]),
        },
        machine: { x: machine.flatbed.x, y: machine.flatbed.y, z: machine.flatbed.z },
      };
    },
  };
  restore();
  return api;
}
export type RailwayLine2View = Awaited<ReturnType<typeof createRailwayLine2>>;
