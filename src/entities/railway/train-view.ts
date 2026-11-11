// Local train presentation. Server rows and the shared mover clock alone choose the decks' poses.
import * as THREE from 'three/webgpu';
import {
  railStopsNow,
  railTrainAsked,
  railTrainHeld,
  type RailwayAdapter,
  type RailwayAccepted,
} from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Platform } from '../../physics/platforms.ts';
import { carry } from '../../physics/platforms.ts';
import { FIXED, PLAYER_R, reducedMotion } from '../../constants.ts';
import { camera } from '../../render/scene.ts';
type CabFace = import('./engine-kit.ts').CabFace;
import { setShapes, stepAlpha, type Shape } from '../../physics/engine.ts';
import { me } from '../../player/player.ts';
import { remotes } from '../../netplay/net.ts';
import { createWakePresentation } from '../../render/wake-presentation.ts';
import { emit } from '../../render/particles.ts';
import { whistle, thump, bell, cordPull } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { GOLD_ROPE } from '../../render/gold-rope.ts';
import {
  LINE_HALTS,
  TRAIN_PHASE,
  TRAIN_HOME,
  trainAlong,
  trainRequestable,
  type RailTrain,
} from '../../sim/railway-train.ts';
import { LINE2, RAIL_TRAINS } from '../../sim/railway-lines.ts';
import { pierLaid } from '../../sim/railway-line2-layout.ts';
import type { Interactable } from '../../player/hands.ts';
import { createBoxBatch, footingParts, footingFrame } from './works-box-view.ts';

const BRASS = '#c79a3e';
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

// Place's kit owns one page-lifetime wheel batch and animation hook. Reuse its models (one a train, three in v26)
// across view lifetimes rather than consuming another twelve slots each on every remount. The view owns the drawn
// geometry copies.
let kitModels: ReturnType<typeof import('../../place/look-kit.ts').trainLook>[] | null = null;

export async function createRailwayTrains(
  adapter: RailwayAdapter,
  owner: OwnedView,
  seats: typeof import('./seat.ts'),
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
    if (look.LOOK.kit) kitModels ??= RAIL_TRAINS.map(() => kit.trainLook(2, () => false, engineKit));
    const model = look.LOOK.kit ? kitModels![slot]! : wagon.wagonLook(2, false, owner);
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
    const crateDeck = crates.deck(model.cars[2]!, () => {});
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
      let i = 0;
      for (const side of [1, -1])
        for (const bz of carKit.BENCH.z) {
          const z = side * bz;
          // Facing out (+x on the +x side) is yaw -side * pi/2: the game's yaw 0 faces -z, and turns toward -x.
          const yaw = -side * (Math.PI / 2);
          owner.cleanup(
            seats.registerSeat({
              id: `railway:train${slot}-${n}-seat${i++}`,
              group: `railway:train${slot}-${n}`,
              platform: car.platform,
              anchorView: true,
              // The drawn rider leans with the bench on a grade; the seat, capsule and wire stay level.
              frame: car.rock,
              forward: carKit.BENCH.forward,
              // The stowaway sits on the bench beside you (0.62 m to your right), not on the deck under it.
              perch: carKit.BENCH.seatTop,
              at: { x: side * carKit.BENCH.seatX, y: car.hy + seats.lowStoolAnchor, z, yaw },
              // Standing up puts you 0.4 m out in front of your seat, on the deck by its edge.
              exit: { x: side * 0.85, y: car.hy + PLAYER_R, z, yaw },
              available: () => car.y > -30,
            }),
          );
        }
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
    return {
      slot,
      line,
      model,
      cars,
      deck: crateDeck,
      solid: solidLoad,
      boiler,
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
  const wagonTrain = () => cargo.find((tr) => adapter.inspect().trains[tr.slot]!.wagon) ?? null;
  /** Every car of `tr`, the wagon behind it while it's coupled. */
  const carsOf = (tr: (typeof trains)[number]) => (wagonTrain() === tr ? [...tr.cars, wagonCar] : tr.cars);
  /** The up track's offset at s (m) for train `tr` on `row`'s track: 4 m left on track 0 between the turnouts, easing
   * over each 20 m turnout, and over Far Head's crossover onto today's track while the train is crossing (Local). */
  const formations = layout.LINKS.map((l) => layout.FORMATION[l.id]);
  function latOf(tr: (typeof trains)[number], row: Readonly<RailTrain>, s: number) {
    if (row.track) return 0;
    const f = formations[tr.line]!,
      c = f.crossover;
    if (crossing(tr, row) && c && s >= c[0]) return layout.crossLat(f, s) ?? 0;
    return layout.upLat(f, s) ?? 0;
  }
  const pierOpen = () => pierLaid(adapter.inspect().line2.completed);
  /** Whether a train on the up track takes Far Head's crossover, from the room's rows alone (a restore or a joining
   * tab draws it the same): every one while the pier is shut, and one the pier's opening caught on it (`turn`). */
  const crossing = (tr: (typeof trains)[number], row: Readonly<RailTrain>) =>
    row.track === 0 && formations[tr.line]!.crossover !== undefined && (row.turn || !pierOpen());
  const seatMatrix = new THREE.Matrix4();
  const askAt = new THREE.Vector3(),
    riderAt = new THREE.Vector3();
  /** Whether `pid` rides `tr` (your own feet on one of its cars; a friend's avatar within 6 m of one). */
  function riderOf(tr: (typeof trains)[number], pid: string) {
    if (pid === adapter.inspect().pid) return carsOf(tr).some((c) => c.platform === carry.on);
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
  const chimney = new THREE.Vector3(),
    smoke = new THREE.Color('#ece8e0');
  function step() {
    const s = adapter.inspect(),
      target = adapter.tickNow();
    if (clock < 0 || Math.abs(target - clock) > 3) clock = target;
    else clock += FIXED * 10 + Math.max(-0.02, Math.min(0.02, (target - clock) * 0.05));
    const coupled = wagonTrain();
    trains.forEach((tr) => {
      const row = s.trains[tr.slot]!,
        line = layout.LINKS[tr.line]!.line;
      // Asleep, a row stands at its home; awake, wherever the room's clock puts it.
      const along = trainAlong(row, tr.line, clock) / 100;
      tr.speed = s.line2.trains ? Math.abs(trainAlong(row, tr.line, clock + 0.1) - trainAlong(row, tr.line, clock)) : 0;
      const lat = (x: number) => latOf(tr, row, x);
      const hidden = !s.ready || (tr.line !== 0 && !secondVisible);
      tr.cars.forEach((c, n) => {
        rail.poseCarOnLine(c, line, along + offsets[n]!, 1, lat);
        if (hidden) c.y = -60;
      });
      if (tr === coupled) {
        rail.poseCarOnLine(wagonCar, line, along + offsets[WAGON]!, 1, lat);
        if (hidden) wagonCar.y = -60;
      }
      tr.solid();
    });
    if (!coupled) wagonCar.y = -60;
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
  const footFlights: { from: THREE.Vector3; slot: number; toPier: boolean; t: number }[] = [];
  let places: { works: FootPlace | null; pier: FootPlace | null } = { works: null, pier: null };
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
  const inbound = () => footFlights.filter((f) => !f.toPier).length;
  const toPier = () => footFlights.filter((f) => f.toPier).length;
  function drawWagon() {
    batch.begin();
    const coupled = wagonTrain();
    const foot = coupled ? adapter.inspect().trains[coupled.slot]!.foot : 0;
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
      const to = f.toPier ? places.pier!(f.slot, fv) : aboardWorld(f.slot, fv);
      const x = f.from.x + (to.x - f.from.x) * u,
        y = f.from.y + (to.y - f.from.y) * u + Math.sin(u * Math.PI) * 1.6,
        z = f.from.z + (to.z - f.from.z) * u;
      footingParts(batch, footingFrame(fm, x, y, z, wagonCar.yaw, Math.sin(u * Math.PI) * 0.3));
    }
    batch.commit();
  }
  function stepFootFlights(dt: number) {
    for (let i = footFlights.length - 1; i >= 0; i--) {
      const f = footFlights[i]!;
      f.t += dt;
      if (f.t < FOOT_HOP_S) continue;
      footFlights.splice(i, 1);
      const to = f.toPier ? places.pier!(f.slot, fv) : aboardWorld(f.slot, fv);
      thump(to.x, to.z);
      dustRing(to.x, to.y + 0.05, to.z, 6, 1, 0.2);
    }
  }
  /** The wagon's live arrival edges: at the quarry the footings the row took hop from the Works rack onto the cradle,
   * at the pier they hop off onto the pier rack. Racks and the wagon hold their shown count until each one lands. */
  function footArrivals(row: RailTrain, last: RailTrain) {
    if (!row.wagon || row.phase !== TRAIN_PHASE.STAND) return;
    const arrived = last.phase !== TRAIN_PHASE.STAND || last.at !== row.at;
    const works = adapter.inspect().works;
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
  }
  function restore() {
    const s = adapter.inspect();
    clock = adapter.tickNow();
    secondVisible = s.line2.trains;
    flyingLogs = flyingRails = 0;
    unloading = false;
    footFlights.length = 0;
    for (const tr of cargo) crates.clearCrates(tr.deck);
    wake.reset(s.line2.trains ? (clock - s.line2.trainsAt) / 10 : -1);
    trains.forEach((tr) => {
      const last = { ...s.trains[tr.slot]! };
      tr.last = last;
      tr.count = -1;
      drawLoad(tr, Math.ceil((last.logs + last.rails) / 8));
    });
    step();
    trains.forEach((tr) => tr.cars.forEach(rail.snapCar));
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
    trains.forEach((tr) => tr.cars.forEach((c) => rail.drawCar(c, stepAlpha())));
    rail.drawCar(wagonCar, stepAlpha());
    swingDoors(dt);
    cutCab(dt);
    drawWagon();
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
      platform === wagonCar.platform || trains.some((tr) => tr.cars.some((c) => c.platform === platform)),
    /** Aboard a running line: "Request stop: <halt>" for the next halt your own train would run through, from any of
     * its cars; greyed once it stops there anyway. The press pulls the bell cord on this tab and names the train
     * (docs/plans/generic-lines.md, 7: only it serves the ask); the bell rings when the server accepts it. */
    targets(): Interactable[] {
      const s = adapter.inspect(),
        b = me.body;
      if (!s.line2.trains || !b) return [];
      const tr = trains.find((t) => carsOf(t).some((c) => c.platform === carry.on));
      if (!tr) return [];
      const k = tr.line,
        n = railStopsNow(s, k).length;
      const ask = trainRequestable(s.trains[tr.slot]!, k, n, adapter.tickNow());
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
      const s = adapter.inspect(),
        tick = adapter.tickNow();
      trains.forEach((tr) => {
        const row = s.trains[tr.slot]!;
        // Amber: on its way to a request stop it will make, its riders' or a lever's it serves (so a train running
        // through a lit lever is dark, and the one behind it lit). Red: held, standing for the block or the headway.
        const lit = railTrainAsked(s, tr.slot, tick);
        if (lit !== tr.lamp.on) {
          tr.lamp.on = lit;
          tr.lamp.material.color.set(lit ? LAMP.on : LAMP.off);
        }
        const held = railTrainHeld(s, tr.slot, tick);
        if (held !== tr.hold.on) {
          tr.hold.on = held;
          tr.hold.material.color.set(held ? HOLD.on : HOLD.off);
        }
        tr.boiler.visible = s.line2.trains && !(tr.slot === 0 && boilerFlying());
        if (tr.boiler.visible !== tr.fitted()) tr.fit(tr.boiler.visible);
        if (tr.last && s.line2.trains && row.phase === TRAIN_PHASE.RUN && tr.last.phase !== TRAIN_PHASE.RUN)
          whistle(tr.cars[0]!.x, tr.cars[0]!.z);
        if (
          tr.line === LINE2 &&
          tr.last &&
          row.phase === TRAIN_PHASE.STAND &&
          row.at === 2 &&
          (tr.last.phase !== TRAIN_PHASE.STAND || tr.last.at !== 2) &&
          tr.last.logs + tr.last.rails > 0
        ) {
          unloading = true;
          flyingLogs = tr.last.logs;
          flyingRails = tr.last.rails;
          const count = crates.deckCount(tr.deck),
            logs = flyingLogs,
            rails = flyingRails;
          for (let i = 0; i < count; i++) {
            const to = depotPlace(5, new THREE.Vector3());
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
        if (!unloading || tr.line !== LINE2) drawLoad(tr, Math.ceil((row.logs + row.rails) / 8));
        if (tr.line === LINE2 && tr.last) footArrivals(row, tr.last);
        tr.last = { ...row };
        if (!s.line2.trains) return;
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
    footPlaces(set: { works: FootPlace | null; pier: FootPlace | null }) {
      places = set;
    },
    /** Footings in the air: onto the wagon from the Works rack, and off it to the pier rack. */
    footFlying: () => ({ toWagon: inbound(), toPier: toPier() }),
    inspect: () => ({
      trains: trains.map((tr) => ({
        slot: tr.slot,
        line: tr.line,
        ...adapter.inspect().trains[tr.slot],
        along: trainAlong(adapter.inspect().trains[tr.slot]!, tr.line, clock),
        cars: carsOf(tr).map((c) => ({ id: c.platform.id, x: c.x, y: c.y, z: c.z, riding: carry.on === c.platform })),
        crates: crates.deckCount(tr.deck),
        lashed: tr.boiler.visible,
        stopLamp: tr.lamp.on,
        holdLamp: tr.hold.on,
        crossing: crossing(tr, adapter.inspect().trains[tr.slot]!),
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
      oldTrain: { shown: !adapter.inspect().line2.trains, rust: look.rustTrainU.value, stop: TRAIN_HOME[0] },
      bolting: folk.bolting(),
    }),
  };
}
