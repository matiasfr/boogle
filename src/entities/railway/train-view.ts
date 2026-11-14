// Local train presentation. Server rows and the shared mover clock alone choose the decks' poses.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import type { RailwayAccepted } from '../../adapters/railway-effects.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Platform } from '../../physics/platforms.ts';
import { carry } from '../../physics/platforms.ts';
import { instantiate } from '../../prefab/instantiate.ts';
import { FIXED, PLAYER_R, reducedMotion } from '../../constants.ts';
import { camera } from '../../render/scene.ts';
type CabFace = import('./engine-kit.ts').CabFace;
import { setShapes, stepAlpha, teleport, type Shape } from '../../physics/engine.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { createWakePresentation } from '../../render/wake-presentation.ts';
import { emit } from '../../render/particles.ts';
import { whistle, thump, bell, cordPull, clank } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { readableIntensity } from '../../render/readable-unlit.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import {
  LINE_HALTS,
  TRAIN_PHASE,
  TRAIN_HOME,
  trainAlong,
  trainRequestable,
  type RailTrain,
} from '../../sim/railway-train.ts';
import { LINE2, RAIL_LINES, RAIL_TRAINS } from '../../sim/railway-lines.ts';
import { LINE2_STATIONS } from '../../sim/railway-line2-layout.ts';
import { STEEL } from '../../sim/railway-ring-layout.ts';
import { line2Active, line2Trains } from '../../sim/railway-queries-line2.ts';
import { aperture, rail as railRow, train as trainRow, works as worksRow } from '../../sim/railway-rows.ts';
import { railTrainAsked, railTrainHeld, trainStops } from '../../sim/railway-queries-trains.ts';
import { line2At, line2Lat, line2Y, endMergeM } from './line2-path.ts';
import { BOTTOM, type Car } from './car.ts';
import { STEEL_CAR, steelCarOffset } from './cars.ts';
import type { Interactable } from '../../player/hands.ts';
import { createBoxBatch, footingParts, footingFrame } from './works-box-view.ts';
import { createKitBoard, kitMarks, legKitFlight } from './kit-board.ts';
import { RAIL_LEGS, legRack } from '../../sim/railway-route.ts';
import { legKitStop, legRow, openLeg } from '../../sim/railway-queries-route.ts';

const BRASS = '#c79a3e';
/** Steel, the island's orange (ring-island/view.ts, ring-steel/view.ts). */
const STEEL_BLOCK = '#e8742c';
/** Far Head's stop on line 2: its facing crossover is the line's end until the pier is laid. */
const FAR_HEAD = 2;
/** The Railhead's stop on line 2: where the wagon's ring footings come off. */
const RAILHEAD = 4;
/** How fast the drawn merge follows the railhead (m/s): a bent in about 3 s, as the lever's slide. */
const MERGE_SLIDE = 7;
/** Whether line 2's open end (its last open stop) turns trains on a crossover (Ring Island's; the greybox route's High
 * Gorge): its up trains cross onto the down track there. Far Head's is read on its own (FAR_HEAD, and a train its
 * opening caught there). */
const crossoverEnd = (stops: readonly number[]) =>
  RAIL_LINES[LINE2]!.halts[stops.length - 1]?.end?.kind === 'crossover';
/** The passenger car's upgrade (roof, lamps; assets/src/passenger-car.py `car_upgrade`) is built and switched off: no
 * upgrade rule exists yet. The hook is here: pass what the room says about the car's upgrade in its place. */
const PASSENGER_CAR_UPGRADED = false;
const LAMP = { on: '#ffa31a', off: '#4b3a22' } as const;
/** The hold lamp (docs/plans/generic-lines.md, 4): red beside the stop lamp while the train stands held by the block
 * ahead or the headway at an end, doors open; out the moment it goes. */
const HOLD = { on: '#ff3b2a', off: '#3e2420' } as const;
/** Footings aboard stand in two stacks on the cradle's seats: slot k's centre in the wagon's rail frame. */
const aboardAt = (k: number) => ({ y: 0.63 + Math.floor(k / 2) * (0.9 + 0.02), z: k % 2 ? 0.8 : -0.8 });
const FOOT_HOP_S = 0.9;
/** The cab doors' default (docs/agent-calls.md): each swings out about 100° on its back post in 0.25 s when any
 * player is within 1.2 m of its doorway, and shuts 0.6 s after the last one leaves. A local view of positions every
 * tab already has: no state, op or presence of its own, and never solid. */
const DOOR = { open: (100 * Math.PI) / 180, swingS: 0.25, near: 1.2, holdS: 0.6 } as const;
/** Parked (owner, 10 November: "I don't think the engine needs to open its doors when we walk in yet"): the doors
 * stay shut as drawn; true brings the swing back. They were never solid, so walking in doesn't wait on them. */
const DOORS_SWING = false;
/** The cab's cutaway (owner, 11 November: with Buddy in the cab the follow camera saw its back wall), the rooms' recipe
 * (src/entities/town/rooms.ts): while you're in a cab or in its doorway, its roof lifts off and each wall on the camera's
 * side sinks to a kerb, on your tab alone. Colliders stay; a shadow-only shell keeps the cab's shade. Someone watching
 * from outside sees the cab whole, on theirs. Local: positions every tab already has, no state, op or presence. */
const CUT = {
  reveal: 0.24, // s for a wall or the roof to get out of the way (instant with reduced motion)
  nearWall: 0.8, // m inside a wall: a camera this close to it, or past it, has it cut away
  farWall: 1.5, // and it comes back only this far inside: no flicker at the line
  kerb: 0.1, // of a wall's height left standing, so the cab's outline still reads
  lift: 3, // m the roof rises as it goes
  door: 0.7, // m out from a doorway that counts as getting on or off
} as const;
type FootPlace = (k: number, out: THREE.Vector3) => THREE.Vector3;

export async function createRailwayTrains(
  adapter: RailwayAdapter,
  owner: OwnedView,
  depotPlace: (k: number, out: THREE.Vector3) => THREE.Vector3,
) {
  const [layout, rail, look, kit, wagon, crates, load, pieces, sounds, engineKit, carKit, shape, folk, land, { flat }] =
    await Promise.all([
      import('../../place/layout.ts'),
      import('./rail-kit.ts'),
      import('../../place/look.ts'),
      import('../../place/look-kit.ts'),
      import('../../render/wagon-look.ts'),
      import('../../render/crates.ts'),
      import('./train-load.ts'),
      import('../../place/pieces.ts'),
      import('../../render/fanfare.ts'),
      import('./engine-kit.ts'),
      import('./car-kit.ts'),
      import('./engine.ts'),
      import('../../place/folk.ts'),
      import('../../place/land.ts'),
      import('../../render/flat.ts'),
    ]);
  // The mark (boiler-first-choice plan, step 8): the gold rope it was hauled on stays lashed round each fitted boiler,
  // two rings and a knot in the rope's own material (shared with the rope; never disposed here).
  const lashMaterial = flat(GOLD_ROPE, 0.7);
  let clock = -1,
    shudder = 0,
    secondVisible = false;
  // The footing wagon, a fourth car behind whichever of line 2's trains it couples to (the sim's `wagon`, per row);
  // it waits under the land until then.
  const offsets = wagon.TRAIN_OFFSETS;
  const WAGON = 3;
  const wagonRock = new THREE.Group();
  // One train a RAIL_TRAINS slot (v26: line 1's, then line 2's two), each posed on its line from its own row.
  const trains = RAIL_TRAINS.map(({ line }, slot) => {
    const model = look.LOOK.kit ? kit.trainLook(2, () => false, owner, engineKit) : wagon.wagonLook(2, false, owner);
    if ('step' in model) owner.animate(model.step, 8);
    const cars = offsets.slice(0, WAGON).map((_, n) => {
      const car = rail.makeCar(
        wagon.TRAIN_CARS[n]!,
        model.cars[n]!,
        () => {
          if (slot === 0 && n === 0) step();
        },
        {},
        owner,
      );
      car.platform.id = `railway:train${slot}-${n}`;
      car.platform.shared = true;
      car.speedLimit = 30;
      return car;
    });
    // The engine is a compound (docs/plans/engine-previz.md, "Collider"): its deck box is the frame and footplate up to
    // the cab floor, and the cab's walls either side of each doorway, its roof, steps and (once fitted) the boiler stand
    // on it. Its decks are stacked: you ride the floor, the boiler's top or the roof, whichever your feet are on.
    const engine = cars[0]!,
      centre = -engine.rock.position.y; // the body's centre over the rail line
    const solid = (b: ReturnType<typeof shape.engineSolids>[number]): Shape => ({
      kind: 'box',
      hx: (b.x[1] - b.x[0]) / 2,
      hy: (b.y[1] - b.y[0]) / 2,
      hz: (b.z[1] - b.z[0]) / 2,
      offset: { x: (b.x[0] + b.x[1]) / 2, y: (b.y[0] + b.y[1]) / 2 - centre, z: (b.z[0] + b.z[1]) / 2 },
    });
    const deck: Shape = { kind: 'box', hx: engine.spec.hx, hy: engine.hy, hz: engine.spec.hz };
    let fitted = true;
    const fit = (on: boolean) => {
      fitted = on;
      setShapes(engine.body, [deck, ...shape.engineSolids(on).map(solid)]);
    };
    fit(false);
    engine.platform.topAt = (x, z, feet) =>
      shape.engineDeckAt(x, z, feet === undefined ? -Infinity : feet + centre, fitted) - centre;
    const crateDeck = crates.deck(model.cars[2]!, () => {}, owner.root);
    // Car 2 carries the cargo (the deck above): a freight car, loaded or empty, with stakes and boards and no seats
    // (owner, 10 November: "if there's cargo then it shouldnt have seats"). Car 1 is the passenger car, a knifeboard of four seats.
    const fittings = wagon.cargoFittings(owner);
    // On the rock with the deck, as the passenger car's bench is: level boards on a pitched deck cross its planks.
    fittings.position.y = cars[2]!.hy - cars[2]!.rock.position.y;
    owner.add(fittings);
    cars[2]!.rock.add(fittings);
    {
      const n = 1,
        car = cars[n]!;
      // The knifeboard (docs/plans/passenger-car-previz.md, Four): one back-to-back bench down the middle, two seats a
      // side, riders facing out over the halt decks. The fittings are the kit's (car-kit.ts); the bench has no solid,
      // so the aisle and a walk along the deck stay open, and Sit snaps you on, as the stools did.
      // On the car's rock, so the bench takes the deck's pitch on a grade and its shudder (owner, 10 November: "the
      // sitting and bench do not follow the normal of the rail"); the rock's origin sits under the mesh's.
      const fit = carKit.passengerCar(PASSENGER_CAR_UPGRADED);
      fit.position.y = car.hy - carKit.CAR_DECK - car.rock.position.y;
      owner.add(fit);
      car.rock.add(fit);
      instantiate(
        'railway.car-bench',
        {
          id: `railway:train${slot}-${n}`,
          prefab: 'railway.car-bench',
          pos: [0, car.hy, 0],
          parent: car.platform.id,
        },
        {
          owner,
          parent: { platform: car.platform, root: car.mesh, frame: car.rock },
          gates: { open: () => car.y > -30 },
        },
      ).setEnabled(true);
    }
    // The fitted boiler: the same part that waits on its pedestal and is hauled on the rope (boiler-view.ts), set in
    // the engine's saddles with its back end in the cab as the backhead, and the gold rope lashed round it.
    const boiler = engineKit.makeEngineBoiler();
    boiler.add(engineKit.engineLashing(lashMaterial));
    const boilerGeometries = new Set<THREE.BufferGeometry>();
    const boilerMaterials = new Set<THREE.Material>();
    boiler.traverse((part) => {
      if (!(part instanceof THREE.Mesh) || part.material === lashMaterial) return;
      boilerGeometries.add(part.geometry);
      for (const mat of Array.isArray(part.material) ? part.material : [part.material]) boilerMaterials.add(mat);
    });
    boiler.position.copy(engineKit.BOILER_CENTRE);
    owner.add(boiler);
    model.cars[0]!.add(boiler);
    // The longer boiler (ring-island-build2, V2): its body and boiler stand in for the short ones while the train's row
    // wears boiler 1 (`rail.install`, taken up at the Village). The cab, doors, drivers and collider are the short
    // engine's; the frame's extra 0.5 m ahead is drawn only.
    const long = engineKit.engineLong(lashMaterial);
    const longParts = [long.body, long.boiler, long.lashing];
    for (const part of longParts) {
      part.visible = false;
      owner.add(part);
      model.cars[0]!.add(part);
    }
    owner.cleanup(() => longParts.forEach((part) => part.removeFromParent()));
    // The stop lamp (docs/plans/works-late-game.md, step 1): amber on the cab's roof at its front, lit while the train
    // runs to a stop someone asked for, so the platform sees it is coming in. Out when it stops.
    const lampMaterial = new THREE.MeshBasicNodeMaterial({ color: LAMP.off });
    const stopLamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.12), lampMaterial);
    stopLamp.position.set(0, shape.ENGINE_CAB.roofTop + 0.08, shape.ENGINE_CAB.zFront);
    owner.add(stopLamp);
    model.cars[0]!.add(stopLamp);
    const holdMaterial = new THREE.MeshBasicNodeMaterial({ color: HOLD.off });
    const holdLamp = new THREE.Mesh(stopLamp.geometry, holdMaterial);
    holdLamp.position.set(0.32, shape.ENGINE_CAB.roofTop + 0.08, shape.ENGINE_CAB.zFront);
    owner.add(holdLamp);
    model.cars[0]!.add(holdLamp);
    owner.cleanup(() => {
      stopLamp.removeFromParent();
      holdLamp.removeFromParent();
      stopLamp.geometry.dispose();
      lampMaterial.dispose();
      holdMaterial.dispose();
    });
    owner.cleanup(() => {
      boiler.removeFromParent();
      for (const g of boilerGeometries) g.dispose();
      for (const m of boilerMaterials) m.dispose();
      for (const c of cars) c.mesh.visible = false;
      // A cached kit model must not retain the retired physics/seat graph. Its wheel callback sees no parent.
      for (const c of model.cars) c.removeFromParent();
    });
    const solidLoad = load.solidTrainLoad(cars[2]!, crateDeck);
    // Steel's own car (docs/plans/fourth-car.md, V1), one a line 2 train, built as the wagon's car is: the last car
    // while the train's row wears the longer boiler, under the land otherwise. A flat deck you can stand on, no seats.
    const steelRock = new THREE.Group();
    const steel = line === LINE2 ? rail.makeCar(STEEL_CAR, steelRock, () => {}, {}, owner) : null;
    if (steel) {
      steel.platform.id = `railway:train${slot}-steel`;
      steel.platform.shared = true;
      steel.speedLimit = 30;
      owner.cleanup(() => {
        steel.mesh.visible = false;
        steelRock.removeFromParent();
      });
    }
    return {
      slot,
      line,
      model,
      cars,
      steel,
      /** The steel car is coupled as drawn: the row wears the longer boiler and a live fit's puff has covered it. */
      carOn: false,
      deck: crateDeck,
      solid: solidLoad,
      // Line 2's kit car says whose kit it carries (./kit-board.ts; the greybox route's step 4 review, answer j).
      board:
        line === LINE2
          ? createKitBoard(owner, model.cars[2]!, wagon.TRAIN_CARS[2]!.top, wagon.TRAIN_CARS[2]!.hz)
          : null,
      boiler,
      long,
      wears: 0,
      /** The platform beat (docs/plans/garage-install-moment.md, G5): this view has drawn the train since the last
       * restore, and the seconds into its longer boiler going on, or -1. */
      seen: false,
      beat: -1,
      /** Seconds into its scale-in after joining from the shed (JOIN_S), or -1. */
      join: -1,
      lamp: { mesh: stopLamp, material: lampMaterial, on: false },
      hold: { mesh: holdLamp, material: holdMaterial, on: false },
      fit,
      fitted: () => fitted,
      doors: ((model as { doors?: THREE.Object3D[] }).doors ?? []).map((mesh) => ({ mesh, angle: 0, held: 0 })),
      cab: (model as { cab?: ReturnType<typeof engineKit.engineBodyWithCab> }).cab ?? null,
      cut: { roof: 0, back: 0, front: 0, left: 0, right: 0 } as Record<CabFace, number>,
      last: null as RailTrain | null,
      count: -1,
      puffs: 0,
      speed: 0,
    };
  });
  /** The platform beat's times, seconds from the row's change: the swap under the puff, the squash's length, the toot. */
  const BEAT = { swap: 0.4, couple: 0.7, squash: 0.18, toot: 1.2 } as const;
  const BEAT_STEAM = new THREE.Color('#e9eef2');
  /** A shed train's scale-in (the greybox route's step 4 review, answer f: "shed trains, no shed"): the second its
   * cars take to grow where it joins, standing at the Village, so no train blinks into being. */
  const JOIN_S = 1;
  /** How high over the rails a kit crate's arc tops out when its rack is across a track (m, the crate's centre):
   * 1.3 m over an engine's cab roof (ENGINE_CAB.roofTop, 3.3 m), 0.6 m for its far corner as it tumbles. */
  const HOP_OVER = 4.6;
  const beatAt = new THREE.Vector3();
  const first = trains[0]!;
  /** Line 2's trains: the ones that carry the kit and the footing wagon. */
  const cargo = trains.filter((tr) => tr.line === LINE2);
  const wagonCar = rail.makeCar(wagon.TRAIN_CARS[WAGON]!, wagonRock, () => {}, {}, owner);
  wagonCar.platform.id = 'railway:wagon';
  wagonCar.platform.shared = true;
  wagonCar.speedLimit = 30;
  owner.cleanup(() => {
    wagonCar.mesh.visible = false;
    wagonRock.removeFromParent();
  });
  /** The train the footing wagon is coupled to now, or null. */
  const wagonTrain = () => cargo.find((tr) => trainRow(adapter.read.world(), tr.slot).wagon) ?? null;
  /** The cars that grow in with a joining train: its own, and its steel car (a fleet row that joins after the install
   * takes the fit as it stands there, so the car comes on mid-growth and stays coupled). */
  const grown = (tr: (typeof trains)[number]) => (tr.steel ? [...tr.cars, tr.steel] : tr.cars);
  /** Every car of `tr`, the wagon behind it while it's coupled and its steel car while it has one. */
  const carsOf = (tr: (typeof trains)[number]) => [
    ...tr.cars,
    ...(wagonTrain() === tr ? [wagonCar] : []),
    ...(tr.steel && tr.carOn ? [tr.steel] : []),
  ];
  /** The up track's offset at s (m) for train `tr` on `row`'s track. Line 1 and line 2 before the pier: 4 m left
   * between the turnouts, easing over each 20 m turnout, and over Far Head's crossover onto today's track while the
   * train is crossing. Line 2 once the pier is laid reads the open end from the room's rows (./line2-path.ts: the
   * Pier's stub, the Railhead's stub that moves with `head`, Ring Island's crossover). Local. */
  const formations = layout.LINKS.map((l) => layout.FORMATION[l.id]);
  /** The open stops of line 2 and where its end merges, read once a frame through the read facade (step). */
  let stops2: readonly number[] = trainStops(adapter.read.world(), LINE2),
    merge2 = endMergeM(stops2),
    mergeShown = merge2;
  function latOf(tr: (typeof trains)[number], row: Readonly<RailTrain>, s: number) {
    if (tr.line === LINE2) return line2Lat(row, s, stops2, mergeShown);
    if (row.track) return 0;
    const f = formations[tr.line]!,
      c = f.crossover;
    if (crossing(tr, row) && c && s >= c[0]) return layout.crossLat(f, s) ?? 0;
    return layout.upLat(f, s) ?? 0;
  }
  /** Whether a train on the up track takes a crossover, from the room's rows alone (a restore or a joining tab draws
   * it the same): Far Head's while it is line 2's end, or for a train the pier's opening caught on it (`turn` and
   * bound for Far Head: a train Q7 turns at the Pier is not on it), and Ring Island's once it is the end. */
  const crossing = (tr: (typeof trains)[number], row: Readonly<RailTrain>) =>
    row.track === 0 &&
    formations[tr.line]!.crossover !== undefined &&
    (tr.line === LINE2
      ? stops2.length - 1 === FAR_HEAD || (row.turn && row.to === FAR_HEAD) || crossoverEnd(stops2)
      : row.turn);
  /** Poses a car of line 2 on the path that goes on past the layout's pier head (./line2-path.ts). */
  const a2 = { x: 0, z: 0, ux: 0, uz: 1 },
    b2 = { x: 0, z: 0, ux: 0, uz: 1 };
  function poseOnLine2(c: Car, s: number, lat: (s: number) => number) {
    line2At(s + 1.1, a2);
    line2At(s - 1.1, b2);
    const la = lat(s + 1.1),
      lb = lat(s - 1.1);
    a2.x -= a2.uz * la;
    a2.z += a2.ux * la;
    b2.x -= b2.uz * lb;
    b2.z += b2.ux * lb;
    c.x = (a2.x + b2.x) / 2 + layout.ORIGIN.x;
    c.z = (a2.z + b2.z) / 2 + layout.ORIGIN.z;
    c.yaw = Math.atan2(a2.x - b2.x, a2.z - b2.z);
    const ya = line2Y(s + 1.1),
      yb = line2Y(s - 1.1);
    c.y = (ya + yb) / 2 + BOTTOM + c.hy;
    c.pitch = Math.atan2(ya - yb, 2.2);
  }
  const seatMatrix = new THREE.Matrix4();
  const askAt = new THREE.Vector3(),
    riderAt = new THREE.Vector3();
  /** Whether `pid` rides `tr` (your own feet on one of its cars; a friend's avatar within 6 m of one). */
  function riderOf(tr: (typeof trains)[number], pid: string) {
    if (pid === adapter.read.pid) return carsOf(tr).some((c) => c.platform === carry.on);
    const avatar = [...remotes.values()].find((r) => r.pid === pid && r.entered)?.avatar;
    if (!avatar) return false;
    avatar.getWorldPosition(riderAt);
    return carsOf(tr).some((c) => Math.hypot(c.x - riderAt.x, c.z - riderAt.z) < 6);
  }
  let boilerFlying = () => false;
  const wake = createWakePresentation(
    {
      flatbed: first.cars[1]!,
      loco: first.cars[0]!,
      look: first.model,
      shudder: (a) => {
        shudder = a;
        if (!a)
          first.cars.forEach((c) => {
            c.rock.rotation.z = c.rock.position.x = 0;
          });
      },
      setRust: (v) => {
        look.rustTrainU.value = v;
      },
      setFire: () => {},
      setLamps: () => {},
      setSlip: (rate) => {
        const m = first.model as { slip?: { rate: number } };
        if (m.slip) m.slip.rate = rate;
      },
      distance: (x, z) => Math.hypot(first.cars[1]!.x - x, first.cars[1]!.z - z),
    },
    owner,
    { fanfare: sounds.fanfare, dustRing: pieces.dustRing },
  );
  let flyingLogs = 0,
    flyingRails = 0,
    unloading = false;
  // Hidden only until the first whole state is in, never for a full pending window (read.whole()).
  const chimney = new THREE.Vector3(),
    smoke = new THREE.Color('#ece8e0');
  function step() {
    const w = adapter.read.world(),
      target = adapter.read.tickNow(),
      on = line2Trains(w),
      shown = adapter.read.whole();
    stops2 = trainStops(w, LINE2);
    merge2 = endMergeM(stops2);
    if (clock < 0 || Math.abs(target - clock) > 3) clock = target;
    else clock += FIXED * 10 + Math.max(-0.02, Math.min(0.02, (target - clock) * 0.05));
    const coupled = wagonTrain();
    trains.forEach((tr) => {
      const row = trainRow(w, tr.slot),
        line = layout.LINKS[tr.line]!.line;
      // Asleep, a row stands at its home; awake, wherever the room's clock puts it.
      const along = trainAlong(row, tr.line, clock) / 100;
      tr.speed = on ? Math.abs(trainAlong(row, tr.line, clock + 0.1) - trainAlong(row, tr.line, clock)) : 0;
      const lat = (x: number) => latOf(tr, row, x);
      // A fleet row in the shed (the greybox route) is not on the line until it joins.
      const hidden = !shown || (tr.line !== 0 && !secondVisible) || row.phase === TRAIN_PHASE.SHED;
      const pose = (c: Car, at: number) =>
        tr.line === LINE2 ? poseOnLine2(c, at, lat) : rail.poseCarOnLine(c, line, at, 1, lat);
      // Joining, the cars grow from the train's middle (car 1's spot): each car's place along the track closes in
      // by its scale, so the couplings stay shut.
      tr.cars.forEach((c, n) => {
        pose(c, along + offsets[n]! * c.mesh.scale.x);
        if (hidden) c.y = -60;
      });
      if (tr === coupled) {
        pose(wagonCar, along + offsets[WAGON]!);
        if (hidden) wagonCar.y = -60;
      }
      if (tr.steel) {
        const was = tr.steel.y > -30;
        pose(tr.steel, along + steelCarOffset(row.wagon) * tr.steel.mesh.scale.x);
        if (hidden || !tr.carOn) tr.steel.y = -60;
        else if (!was) standClear(tr.steel);
      }
      tr.solid();
    });
    if (!coupled) wagonCar.y = -60;
  }
  /** A car that arrives where you stand (the steel car couples under a puff, at the tail, where the room is after an
   * install) would close its box round you: nothing pushes a player out of a kinematic body. You are set on its deck
   * instead, where you stood, on this tab alone; the deck's edge lets you slide off if you were at its side. */
  function standClear(c: Car) {
    const b = me.body;
    if (!b) return;
    const rx = b.position.x - c.x,
      rz = b.position.z - c.z,
      cos = Math.cos(c.yaw),
      sin = Math.sin(c.yaw);
    const top = c.y + c.hy;
    if (
      Math.abs(rx * cos - rz * sin) >= c.spec.hx + PLAYER_R ||
      Math.abs(rx * sin + rz * cos) >= c.spec.hz + PLAYER_R ||
      b.position.y - PLAYER_R >= top ||
      b.position.y + PLAYER_R <= top - c.spec.top
    )
      return;
    teleport(b, b.position.x, top + PLAYER_R + 0.02, b.position.z);
    b.velocity.set(b.velocity.x, Math.max(0, b.velocity.y), b.velocity.z);
  }
  function drawLoad(tr: typeof first, count: number) {
    if (tr.count === count) return;
    for (const c of tr.deck.held) c?.mesh.removeFromParent();
    tr.deck.held.fill(null);
    for (let i = 0; i < count; i++) crates.putCrate(tr.deck, i, 'fill');
    tr.count = count;
    tr.solid();
  }
  // ---------------------------------------------------------------- the footing wagon and its footings
  const batch = createBoxBatch(owner, 96);
  const footFlights: { from: THREE.Vector3; slot: number; toPier: boolean; toRing?: boolean; t: number }[] = [];
  let places: { works: FootPlace | null; pier: FootPlace | null; ring?: FootPlace | null } = {
    works: null,
    pier: null,
  };
  const fm = new THREE.Matrix4(),
    lm = new THREE.Matrix4(),
    fv = new THREE.Vector3(),
    fq = new THREE.Quaternion(),
    fsc = new THREE.Vector3();
  /** World centre of the base of aboard slot `k`, and the wagon's yaw. */
  function aboardWorld(k: number, out: THREE.Vector3) {
    const a = aboardAt(k);
    fm.multiplyMatrices(wagonRock.matrixWorld, lm.makeTranslation(0, a.y, a.z));
    fm.decompose(out, fq, fsc);
    return out;
  }
  const inbound = () => footFlights.filter((f) => !f.toPier && !f.toRing).length;
  const toPier = () => footFlights.filter((f) => f.toPier).length;
  const toRing = () => footFlights.filter((f) => f.toRing).length;
  /** Where a flying footing lands: the wagon's slot, the pier rack's or the railhead rack's. */
  const landing = (f: (typeof footFlights)[number], out: THREE.Vector3) =>
    f.toRing ? places.ring!(f.slot, out) : f.toPier ? places.pier!(f.slot, out) : aboardWorld(f.slot, out);
  function drawWagon() {
    batch.begin();
    const coupled = wagonTrain();
    const foot = coupled ? trainRow(adapter.read.world(), coupled.slot).foot : 0;
    if (wagonCar.mesh.visible) {
      wagonCar.mesh.updateMatrixWorld(true);
      const frame = wagonRock.matrixWorld;
      batch.part(frame, 0, 0.3, 0, 2.2, 0.35, 3.2, '#77766b');
      for (const x of [-0.85, 0.85]) for (const z of [-1, 1]) batch.part(frame, x, 0.05, z, 0.25, 0.5, 0.5, '#3a3c3c');
      // The fitted brass cradle: two seats, eight arms and the top rails that hold the stacks upright.
      for (const z of [-0.8, 0.8]) batch.part(frame, 0, 0.55, z, 1.5, 0.16, 1.3, BRASS);
      for (let r = 0; r < 8; r++)
        batch.part(frame, r % 2 ? 0.95 : -0.95, 1.05, [-1.35, -0.25, 0.25, 1.35][r >> 1]!, 0.1, 1.1, 0.1, BRASS);
      for (const x of [-0.95, 0.95]) batch.part(frame, x, 1.62, 0, 0.12, 0.12, 2.9, BRASS);
      const aboard = Math.max(0, foot - inbound());
      for (let k = 0; k < aboard; k++) {
        const a = aboardAt(k);
        footingParts(batch, fm.multiplyMatrices(frame, lm.makeTranslation(0, a.y, a.z)));
      }
    }
    for (const f of footFlights) {
      if (f.t < 0) {
        // Not off yet: it still stands where it was, on the rack or the wagon.
        footingParts(batch, footingFrame(fm, f.from.x, f.from.y, f.from.z, wagonCar.yaw));
        continue;
      }
      const u = Math.min(1, f.t / FOOT_HOP_S);
      const to = landing(f, fv);
      const x = f.from.x + (to.x - f.from.x) * u,
        y = f.from.y + (to.y - f.from.y) * u + Math.sin(u * Math.PI) * 1.6,
        z = f.from.z + (to.z - f.from.z) * u;
      footingParts(batch, footingFrame(fm, x, y, z, wagonCar.yaw, Math.sin(u * Math.PI) * 0.3));
    }
    batch.commit();
  }
  // Steel riding home on a line 2 train (ruling C: any train's, up to STEEL.trip), two abreast: on its steel car once
  // it has one, on the kit car's deck until then. The steel car is drawn here too (greybox: a flatbed, low stakes and
  // an orange stripe down each side). It is aboard when the row says so, with no hop from the works' rack or into the
  // Roundhouse bay.
  const STEEL_CAR_PARTS = 15;
  const steelBatch = createBoxBatch(owner, RAIL_TRAINS.length * (STEEL.trip + STEEL_CAR_PARTS));
  function drawSteel() {
    steelBatch.begin();
    const w = adapter.read.world();
    for (const tr of trains) {
      const car = tr.steel && tr.steel.mesh.visible ? tr.steel : null;
      if (car) {
        car.mesh.updateMatrixWorld(true);
        const f = car.rock.matrixWorld,
          { hx, hz, top } = car.spec;
        steelBatch.part(f, 0, top - 0.2, 0, hx * 2, 0.4, hz * 2, '#6f7275');
        for (const x of [-0.85, 0.85])
          for (const z of [-1, 1]) steelBatch.part(f, x, 0.15, z, 0.25, 0.5, 0.5, '#3a3c3c');
        for (const x of [-hx, hx]) {
          steelBatch.part(f, x, top - 0.2, 0, 0.05, 0.16, hz * 2 - 0.1, STEEL_BLOCK);
          for (const z of [-hz + 0.15, hz - 0.15])
            steelBatch.part(f, x * 0.96, top + 0.15, z, 0.1, 0.3, 0.1, '#1e1e22');
        }
      }
      const kitCar = tr.cars[2]!,
        n = tr.line === LINE2 && line2Trains(w) ? Math.min(trainRow(w, tr.slot).steel ?? 0, STEEL.trip) : 0;
      if (!n || kitCar.y < -30) continue;
      const frame = car ? car.rock : tr.model.cars[2]!;
      frame.updateWorldMatrix(true, false);
      for (let i = 0; i < n; i++)
        steelBatch.part(
          frame.matrixWorld,
          i % 2 ? 0.45 : -0.45,
          (car ? car.spec : wagon.TRAIN_CARS[2]!).top + 0.2,
          -0.9 + (i >> 1) * 0.9,
          0.8,
          0.4,
          0.5,
          STEEL_BLOCK,
        );
    }
    steelBatch.commit();
  }
  function stepFootFlights(dt: number) {
    for (let i = footFlights.length - 1; i >= 0; i--) {
      const f = footFlights[i]!;
      f.t += dt;
      if (f.t < FOOT_HOP_S) continue;
      footFlights.splice(i, 1);
      const to = landing(f, fv);
      thump(to.x, to.z);
      dustRing(to.x, to.y + 0.05, to.z, 6, 1, 0.2);
    }
  }
  /** The wagon's live arrival edges: at the quarry the footings the row took hop from the Works rack onto the cradle,
   * at the pier they hop off onto the pier rack. Racks and the wagon hold their shown count until each one lands. */
  function footArrivals(row: RailTrain, last: RailTrain) {
    if (!row.wagon || row.phase !== TRAIN_PHASE.STAND) return;
    const arrived = last.phase !== TRAIN_PHASE.STAND || last.at !== row.at;
    const works = worksRow(adapter.read.world());
    if (arrived && row.at === 1 && row.foot > last.foot && places.works) {
      wagonCar.mesh.updateMatrixWorld(true);
      for (let i = 0; i < row.foot - last.foot; i++)
        footFlights.push({
          // The rack has already given them: they were its top footings, above what it keeps.
          from: places.works(works.rack + i, new THREE.Vector3()),
          slot: last.foot + i,
          toPier: false,
          t: -0.3 * i,
        });
    }
    if (arrived && row.at === 3 && row.foot < last.foot && places.pier) {
      wagonCar.mesh.updateMatrixWorld(true);
      const n = last.foot - row.foot;
      for (let i = 0; i < n; i++)
        footFlights.push({
          from: aboardWorld(last.foot - 1 - i, new THREE.Vector3()),
          slot: works.pierRack - 1 - i,
          toPier: true,
          t: -0.3 * i,
        });
    }
    // Past the Pier the wagon's footings are the ring's: they hop off at the Railhead onto its rack (R4b mounts
    // `places.ring`; without it the footings just leave the wagon).
    if (arrived && row.at === RAILHEAD && row.foot < last.foot && places.ring) {
      wagonCar.mesh.updateMatrixWorld(true);
      const n = last.foot - row.foot,
        rack = aperture(adapter.read.world()).rack;
      for (let i = 0; i < n; i++)
        footFlights.push({
          from: aboardWorld(last.foot - 1 - i, new THREE.Vector3()),
          slot: rack - 1 - i,
          toPier: false,
          toRing: true,
          t: -0.3 * i,
        });
    }
  }
  function restore() {
    const w = adapter.read.world(),
      on = line2Trains(w);
    clock = adapter.read.tickNow();
    stops2 = trainStops(w, LINE2);
    merge2 = mergeShown = endMergeM(stops2);
    secondVisible = on;
    flyingLogs = flyingRails = 0;
    legKitFlight.logs = legKitFlight.rails = 0;
    unloading = false;
    footFlights.length = 0;
    for (const tr of cargo) crates.clearCrates(tr.deck);
    wake.reset(on ? (clock - railRow(w).trains) / 10 : -1);
    trains.forEach((tr) => {
      const last = { ...trainRow(w, tr.slot) };
      tr.last = last;
      tr.count = -1;
      // A restore or a late join shows the rows only: no beat, and the next frame's fit is not an edge.
      tr.seen = false;
      tr.beat = -1;
      tr.join = -1;
      for (const c of grown(tr)) {
        c.mesh.scale.setScalar(1);
        c.rock.position.y = -(BOTTOM + c.hy);
      }
      tr.carOn = on && (last.boiler ?? 0) >= 1;
      tr.model.cars[0]!.scale.set(1, 1, 1);
      drawLoad(tr, Math.ceil((last.logs + last.rails) / 8));
    });
    step();
    trains.forEach((tr) => {
      tr.cars.forEach(rail.snapCar);
      if (tr.steel) rail.snapCar(tr.steel);
    });
    rail.snapCar(wagonCar);
  }
  // ---------------------------------------------------------------- the cab doors
  const near = new THREE.Vector3(),
    toCar = new THREE.Matrix4();
  const people: THREE.Vector3[] = [];
  function swingDoors(dt: number) {
    if (!DOORS_SWING) return;
    people.length = 0;
    if (me.body) people.push(near.set(me.body.position.x, me.body.position.y - PLAYER_R, me.body.position.z).clone());
    for (const r of remotes.values()) if (r.entered && r.avatar) people.push(r.avatar.position.clone());
    for (const tr of trains) {
      const loco = tr.model.cars[0]!;
      if (!tr.doors.length || !tr.cars[0]!.mesh.visible) continue;
      toCar.copy(loco.matrixWorld).invert();
      const c = shape.ENGINE_CAB,
        mid = (c.door.z[0] + c.door.z[1]) / 2,
        half = (c.door.z[1] - c.door.z[0]) / 2;
      tr.doors.forEach((d, i) => {
        const side = i === 0 ? 1 : -1;
        const by = people.some((p) => {
          near.copy(p).applyMatrix4(toCar);
          const dz = Math.max(0, Math.abs(near.z - mid) - half);
          return Math.hypot(near.x - side * c.hx, dz) <= DOOR.near && Math.abs(near.y - c.floor) < 2.5;
        });
        d.held = by ? DOOR.holdS : Math.max(0, d.held - dt);
        const goal = d.held > 0 ? DOOR.open : 0,
          rate = (DOOR.open / DOOR.swingS) * dt;
        d.angle += Math.max(-rate, Math.min(rate, goal - d.angle));
        d.mesh.rotation.y = side * d.angle;
      });
    }
  }
  // ---------------------------------------------------------------- the cab cutaway
  const cabLocal = new THREE.Vector3(),
    camLocal = new THREE.Vector3();
  let cutTrain: (typeof trains)[number] | null = null;
  /** Your feet in `tr`'s cab, or in its doorway; `keep` widens it, so a step back out doesn't flicker it. */
  function inCab(tr: (typeof trains)[number], keep: boolean) {
    const c = shape.ENGINE_CAB,
      p = cabLocal,
      m = keep ? 0.25 : 0;
    const inside =
      Math.abs(p.x) < c.hx + m &&
      p.z > c.zBack - m &&
      p.z < c.zFront + m &&
      p.y > c.floor - 0.3 &&
      p.y < c.roofUnder - 0.6 + m;
    const doorway =
      Math.abs(p.x) < c.hx + CUT.door + m &&
      p.z > c.door.z[0] - 0.15 - m &&
      p.z < c.door.z[1] + 0.15 + m &&
      p.y > c.step - 0.35 &&
      p.y < c.floor + 0.5;
    return tr.cars[0]!.mesh.visible && (inside || doorway);
  }
  function cutCab(dt: number) {
    const b = me.body;
    const step = reducedMotion ? 1 : dt / CUT.reveal;
    // Which cab you're in: the one you were in, while you still are, else any you've stepped into.
    let found: typeof cutTrain = null;
    if (b) {
      const p = b.interpolatedPosition;
      for (const tr of trains) {
        if (!tr.cab) continue;
        const loco = tr.model.cars[0]!;
        toCar.copy(loco.matrixWorld).invert();
        cabLocal.set(p.x, p.y - PLAYER_R, p.z).applyMatrix4(toCar);
        if (inCab(tr, tr === cutTrain)) {
          found = tr;
          camLocal.copy(camera.position).applyMatrix4(toCar);
          break;
        }
      }
    }
    cutTrain = found;
    const c = shape.ENGINE_CAB;
    for (const tr of trains) {
      if (!tr.cab) continue;
      const on = tr === found;
      let any = false;
      for (const f of engineKit.CAB_FACES) {
        let hide = on;
        if (on && f !== 'roof') {
          const gap = tr.cut[f] > 0 ? CUT.farWall : CUT.nearWall,
            q = camLocal;
          const toWall =
            f === 'back' ? q.z - c.zBack : f === 'front' ? c.zFront - q.z : f === 'right' ? c.hx - q.x : q.x + c.hx;
          hide = toWall < gap;
        }
        const t = (tr.cut[f] = hide ? Math.min(1, tr.cut[f] + step) : Math.max(0, tr.cut[f] - step));
        if (t > 0) any = true;
        const mesh = tr.cab.faces[f],
          e = t * t * (3 - 2 * t);
        mesh.visible = f !== 'roof' || t < 1;
        if (f === 'roof') mesh.position.y = e * CUT.lift;
        else sink(mesh, 1 - (1 - CUT.kerb) * e);
      }
      // A door sinks with its wall.
      tr.doors.forEach((d, i) => {
        const t = tr.cut[i === 0 ? 'right' : 'left'];
        sink(d.mesh, 1 - (1 - CUT.kerb) * t * t * (3 - 2 * t));
      });
      tr.cab.shadow.visible = any;
    }
  }
  /** Squash `mesh` (its geometry in the car's frame, its origin on the car's) down onto the cab floor. */
  function sink(mesh: THREE.Object3D, s: number) {
    mesh.scale.y = s;
    mesh.position.y = shape.ENGINE_CAB.floor * (1 - s);
  }
  owner.animate(({ now, dt }) => {
    trains.forEach((tr) => {
      tr.cars.forEach((c) => rail.drawCar(c, stepAlpha()));
      if (tr.steel) rail.drawCar(tr.steel, stepAlpha());
    });
    rail.drawCar(wagonCar, stepAlpha());
    swingDoors(dt);
    cutCab(dt);
    drawWagon();
    drawSteel();
    if (shudder)
      first.cars.forEach((c, n) => {
        c.rock.rotation.z = Math.sin(now * 0.073 + n * 1.3) * 0.018 * shudder;
        c.rock.position.x = Math.sin(now * 0.097 + n * 1.3) * 0.035 * shudder;
      });
  }, 7);
  owner.cleanup(() => {
    for (const tr of cargo) crates.clearCrates(tr.deck);
  });
  return {
    restore,
    accepted(e: RailwayAccepted) {
      if (e.op === 'rail.call') {
        // A request from aboard rings that train's bell for everyone in earshot; a lever's sounds at its halt. The
        // event names the train when it's yours; a friend's is found by who rides which.
        const line = LINE_HALTS[e.id]?.line;
        const tr = e.train !== undefined ? trains[e.train] : trains.find((t) => t.line === line && riderOf(t, e.pid));
        const loco = tr?.cars[0];
        if (!tr || tr.line !== line || !loco || !riderOf(tr, e.pid)) return;
        bell(loco.x, loco.z);
        return;
      }
      if (e.op !== 'rail.boilerFit') return;
      wake.start(() => {
        secondVisible = true;
      });
      // Two of the camp's little guys run to the loco's side and bolt the boiler on (step 8).
      const loco = first.cars[0]!,
        out = wagon.TRAIN_CARS[0]!.hx + 0.5;
      const x = loco.x + Math.cos(loco.yaw) * out,
        z = loco.z - Math.sin(loco.yaw) * out;
      folk.boltAt(x, z, land.H(x, z));
    },
    /** The hauled boiler is still flying to this loco's saddle (boiler-view.ts). */
    holdBoiler(fn: () => boolean) {
      boilerFlying = fn;
    },
    /** Where the old loco's boiler sits, as a world matrix (the hauled boiler flies to it; boiler-view.ts). */
    boilerSeat(): THREE.Matrix4 {
      first.boiler.updateWorldMatrix(true, false);
      return seatMatrix.copy(first.boiler.matrixWorld);
    },
    /** The little guy's stool on the engine of line `k`'s `n`th train (folk.ts), once it runs: his feet on the
     * footrest, facing forward. Folk has a driver a train. */
    driverSeat(k: number, n: number) {
      const tr = trains.filter((t) => t.line === k)[n];
      if (!tr || !tr.boiler.visible || tr.cars[0]!.y < -30) return null;
      const st = shape.ENGINE_STOOL;
      return { mesh: tr.model.cars[0]!, top: st.footrest, up: st.seat - st.footrest - 0.035, x: st.x, z: st.z, yaw: 0 };
    },
    isTrain: (platform: Platform | null) =>
      platform === wagonCar.platform ||
      trains.some((tr) => tr.steel?.platform === platform || tr.cars.some((c) => c.platform === platform)),
    /** Aboard a running line: "Request stop: <halt>" for the next halt your own train would run through, from any of
     * its cars; greyed once it stops there anyway. The press pulls the bell cord on this tab and names the train
     * (docs/plans/generic-lines.md, 7: only it serves the ask); the bell rings when the server accepts it. */
    targets(): Interactable[] {
      const w = adapter.read.world(),
        b = me.body;
      if (!line2Trains(w) || !b) return [];
      const tr = trains.find((t) => carsOf(t).some((c) => c.platform === carry.on));
      if (!tr) return [];
      const k = tr.line;
      // The open stops, not their count: a count reads the railhead at its last head.
      const ask = trainRequestable(trainRow(w, tr.slot), k, trainStops(w, k), adapter.read.tickNow());
      if (!ask) return [];
      const id = LINE_HALTS.findIndex((h) => h.line === k && h.stop === ask.stop);
      const halt = LINE_HALTS[id];
      if (!halt) return [];
      const at = askAt.set(b.position.x, b.position.y + 1.2, b.position.z);
      const verb = `Request stop: ${halt.name}`;
      if (ask.requested) return [{ id: 'railway-request-aboard', verb, at, blocked: 'Stop requested' }];
      return [
        {
          id: 'railway-request-aboard',
          verb,
          at,
          run: () => {
            cordPull(at.x, at.z);
            adapter.callTrain(id, ask.dir as -1 | 1, tr.slot);
          },
        },
      ];
    },
    trainFlying: () => ({ logs: flyingLogs, rails: flyingRails }),
    update(dt: number) {
      wake.update(dt);
      // The end's merge slides with a moving railhead (one bent, 20 m, in about 3 s) rather than jumping the trains on
      // the turnout; a change of end (the rivet) is not a slide.
      mergeShown =
        Math.abs(merge2 - mergeShown) > 25
          ? merge2
          : mergeShown + Math.max(-MERGE_SLIDE * dt, Math.min(MERGE_SLIDE * dt, merge2 - mergeShown));
      const w = adapter.read.world(),
        tick = adapter.read.tickNow(),
        on = line2Trains(w);
      // Each line's open stops, worked out once for the frame and shared by the lamps.
      const stops = [trainStops(w, 0), trainStops(w, LINE2)];
      const marks = kitMarks(w, tick);
      trains.forEach((tr) => {
        const row = trainRow(w, tr.slot);
        tr.board?.set(marks.get(tr.slot) ?? '');
        // Joined from the shed on a live tick: its cars grow in over JOIN_S (their bodies are whole at once).
        if (tr.seen && tr.last?.phase === TRAIN_PHASE.SHED && row.phase !== TRAIN_PHASE.SHED) tr.join = 0;
        if (tr.join >= 0) {
          tr.join += dt;
          const u = reducedMotion ? 1 : Math.min(1, tr.join / JOIN_S),
            s = Math.max(0.02, u * u * (3 - 2 * u));
          // Each car grows from the rails under it (its frame hangs BOTTOM + hy under the body's centre).
          for (const c of grown(tr)) {
            c.mesh.scale.setScalar(s);
            c.rock.position.y = -(BOTTOM + c.hy) / s;
          }
          if (u >= 1) tr.join = -1;
        }
        // Amber: on its way to a request stop it will make, its riders' or a lever's it serves (so a train running
        // through a lit lever is dark, and the one behind it lit). Red: held, standing for the block or the headway.
        const lit = railTrainAsked(w, tr.slot, tick, stops[tr.line]);
        if (lit !== tr.lamp.on) {
          tr.lamp.on = lit;
          tr.lamp.material.color.set(lit ? LAMP.on : LAMP.off);
        }
        const held = railTrainHeld(w, tr.slot, tick);
        if (held !== tr.hold.on) {
          tr.hold.on = held;
          tr.hold.material.color.set(held ? HOLD.on : HOLD.off);
        }
        const worn = on && !(tr.slot === 0 && boilerFlying()),
          fit = on ? (row.boiler ?? 0) : 0;
        // The platform beat: the train's own row took the longer boiler on a live tick (it stands at the Village). A
        // puff of steam covers the swap, then a clank and a short squash, then a toot. Riders keep their seats: no
        // collider or seat changes.
        const loco = tr.model.cars[0]!;
        if (tr.seen && fit === 1 && tr.wears === 0 && tr.beat < 0 && !reducedMotion) {
          tr.beat = 0;
          tr.model.chimneyTop.getWorldPosition(beatAt);
          // The same steam at the tail, where the steel car comes on (posed there already, under the land).
          const kitCar = tr.cars[2]!,
            tail = tr.steel;
          for (let i = 0; i < (tail ? 32 : 18); i++)
            emit({
              x: (i < 18 ? beatAt.x : tail!.x) + (Math.random() - 0.5) * (i < 18 ? 1.6 : 3),
              y: (i < 18 ? beatAt.y - 0.9 : kitCar.y) + Math.random() * 1.2,
              z: (i < 18 ? beatAt.z : tail!.z) + (Math.random() - 0.5) * (i < 18 ? 1.6 : 3),
              vx: (Math.random() - 0.5) * 0.7,
              vy: 0.5 + Math.random() * 0.9,
              vz: (Math.random() - 0.5) * 0.7,
              life: 1.4,
              size: 0.7,
              color: BEAT_STEAM,
              // Bright enough to read as white steam over the red barrel (plain particles draw dim in daylight).
              intensity: readableIntensity() * 1.3,
              alpha: 0.9,
              grow: [1, 2.6],
              fade: 0.6,
              shape: 'dust',
            });
        }
        let wears = fit;
        if (tr.beat >= 0) {
          const before = tr.beat;
          tr.beat += dt;
          const at = (t: number) => before < t && tr.beat >= t;
          if (tr.beat < BEAT.swap) wears = 0;
          if (at(BEAT.swap)) clank(tr.cars[0]!.x, tr.cars[0]!.z);
          // The coupling: the steel car is on the tail from the swap, and its own clank lands there after the engine's.
          if (at(BEAT.couple) && tr.steel) clank(tr.steel.x, tr.steel.z);
          const u = (tr.beat - BEAT.swap) / BEAT.squash;
          const k = u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
          loco.scale.set(1 + 0.04 * k, 1 - 0.07 * k, 1 + 0.04 * k);
          if (at(BEAT.toot)) whistle(tr.cars[0]!.x, tr.cars[0]!.z);
          if (tr.beat >= BEAT.toot || fit !== 1) {
            tr.beat = -1;
            loco.scale.set(1, 1, 1);
          }
        }
        tr.seen = true;
        // A restore, a late join and reduced motion have no beat: the car is there with the row.
        tr.carOn = !!wears;
        if (wears !== tr.wears) {
          tr.wears = wears;
          if (tr.cab) tr.cab.body.visible = !wears;
          tr.long.body.visible = !!wears;
          const c = wears ? tr.long.chimney : shape.ENGINE_BOILER.chimney;
          tr.model.chimneyTop.position.set(0, c.y, c.z);
        }
        tr.boiler.visible = worn && !wears;
        tr.long.boiler.visible = tr.long.lashing.visible = worn && !!wears;
        if (worn !== tr.fitted()) tr.fit(worn);
        if (tr.last && on && row.phase === TRAIN_PHASE.RUN && tr.last.phase !== TRAIN_PHASE.RUN)
          whistle(tr.cars[0]!.x, tr.cars[0]!.z);
        // A train-fed job's kit unloads at its own halt: Q6's at Far Head, Q7's at the Pier, onto that job's rack.
        const kit = tr.line === LINE2 ? LINE2_STATIONS[line2Active(w)] : undefined;
        if (
          kit?.feed === 'train' &&
          tr.last &&
          row.phase === TRAIN_PHASE.STAND &&
          row.at === kit.kitStop &&
          (tr.last.phase !== TRAIN_PHASE.STAND || tr.last.at !== kit.kitStop) &&
          tr.last.logs + tr.last.rails > 0
        ) {
          unloading = true;
          flyingLogs = tr.last.logs;
          flyingRails = tr.last.rails;
          const count = crates.deckCount(tr.deck),
            logs = flyingLogs,
            rails = flyingRails;
          for (let i = 0; i < count; i++) {
            const to = depotPlace(LINE2_STATIONS.indexOf(kit), new THREE.Vector3());
            to.y += 0.5;
            crates.hopOff(tr.deck, i, to, i * 0.09, () => {
              // A partially owed kit may contain unequal timber and steel. Divide each accepted total over the
              // visible crates so every piece is released exactly once, including a short final crate.
              const share = (n: number) => Math.floor((n * (i + 1)) / count) - Math.floor((n * i) / count);
              flyingLogs = Math.max(0, flyingLogs - share(logs));
              flyingRails = Math.max(0, flyingRails - share(rails));
              if (!flyingLogs && !flyingRails) {
                unloading = false;
                tr.count = -1;
              }
            });
          }
        }
        // A leg's kit hops from the car to its rack (the greybox route's step 4 review, answer b: 8 m over the up
        // track at Ring Island, then onto each railhead's), drawn as the Q kits' unload is. The rows moved the units
        // on the tick the train stood; the rack's view draws each once its crate lands (legKitFlight).
        const leg = tr.line === LINE2 && tr.last?.legKit ? openLeg(w, LINE2) : -1;
        if (leg >= 0 && tr.last && row.phase === TRAIN_PHASE.STAND && row.at === legKitStop(w, leg) && tr.count > 0) {
          const logs = tr.last.logs - row.logs,
            rails = tr.last.rails - row.rails,
            keep = Math.ceil((row.logs + row.rails) / 8),
            count = tr.count - keep;
          if (logs >= 0 && rails >= 0 && logs + rails > 0 && count > 0) {
            const rack = legRack(RAIL_LEGS[leg]!, legRow(w, leg).laid);
            legKitFlight.logs += logs;
            legKitFlight.rails += rails;
            // A rack across a track (Ring Island's, 8.4 m over the up track): the arc tops out HOP_OVER above the
            // rails, so a tumbling crate (0.71 m to its far corner) clears a cab roof (3.3 m) standing under it.
            const kitCar = tr.cars[2]!,
              far = Math.hypot(rack.x / 100 - kitCar.x, rack.z / 100 - kitCar.z) > 6,
              over = far ? kitCar.y - (BOTTOM + kitCar.hy) + HOP_OVER : undefined;
            for (let i = 0; i < count; i++) {
              const to = new THREE.Vector3(rack.x / 100, rack.y / 100 + 0.5, rack.z / 100);
              const share = (n: number) => Math.floor((n * (i + 1)) / count) - Math.floor((n * i) / count);
              crates.hopOff(
                tr.deck,
                keep + i,
                to,
                i * 0.09,
                () => {
                  legKitFlight.logs = Math.max(0, legKitFlight.logs - share(logs));
                  legKitFlight.rails = Math.max(0, legKitFlight.rails - share(rails));
                },
                over,
              );
            }
            tr.count = keep;
          }
        }
        if (!unloading || tr.line !== LINE2) drawLoad(tr, Math.ceil((row.logs + row.rails) / 8));
        if (tr.line === LINE2 && tr.last) footArrivals(row, tr.last);
        tr.last = { ...row };
        if (!on) return;
        tr.puffs += tr.speed * dt * 0.25 + (tr.speed < 0.1 ? dt / 2 : 0);
        if (tr.puffs >= 1) {
          tr.model.chimneyTop.getWorldPosition(chimney);
          for (; tr.puffs >= 1; tr.puffs--)
            emit({
              x: chimney.x,
              y: chimney.y,
              z: chimney.z,
              vx: 1.2,
              vy: 1.5 + Math.random() * 0.8,
              vz: (Math.random() - 0.5) * 0.6,
              life: 2.4,
              size: 0.3,
              color: smoke,
              alpha: 0.35,
              drag: 0.6,
              grow: [1, 3.2],
              fade: 0.6,
            });
        }
      });
      crates.updateCrates(dt);
      stepFootFlights(dt);
    },
    /** Where footings hop from and to: the Works rack's slot k and the pier rack's (views mounted later set these). */
    footPlaces(set: { works: FootPlace | null; pier: FootPlace | null; ring?: FootPlace | null }) {
      places = set;
    },
    /** Footings in the air: onto the wagon from the Works rack, and off it to the pier rack. */
    footFlying: () => ({ toWagon: inbound(), toPier: toPier(), toRing: toRing() }),
    inspect: () => ({
      trains: trains.map((tr) => ({
        line: tr.line,
        ...trainRow(adapter.read.world(), tr.slot),
        along: trainAlong(trainRow(adapter.read.world(), tr.slot), tr.line, clock),
        cars: carsOf(tr).map((c) => ({ id: c.platform.id, x: c.x, y: c.y, z: c.z, riding: carry.on === c.platform })),
        crates: crates.deckCount(tr.deck),
        kitBoard: tr.board?.mark() ?? '',
        joinScale: +tr.cars[0]!.mesh.scale.x.toFixed(3),
        lashed: tr.boiler.visible || tr.long.boiler.visible,
        longBoiler: tr.long.body.visible,
        stopLamp: tr.lamp.on,
        holdLamp: tr.hold.on,
        crossing: crossing(tr, trainRow(adapter.read.world(), tr.slot)),
        doors: tr.doors.map((d) => +((d.angle * 180) / Math.PI).toFixed(0)),
        cut: Object.fromEntries(Object.entries(tr.cut).map(([f, t]) => [f, +t.toFixed(2)])),
        ...(tr === wagonTrain()
          ? {
              wagon: {
                shown: wagonCar.mesh.visible,
                x: wagonCar.x,
                y: wagonCar.y,
                z: wagonCar.z,
                flying: footFlights.length,
              },
            }
          : {}),
      })),
      legKitFlying: { ...legKitFlight },
      oldTrain: { shown: !line2Trains(adapter.read.world()), rust: look.rustTrainU.value, stop: TRAIN_HOME[0] },
      bolting: folk.bolting(),
    }),
  };
}
