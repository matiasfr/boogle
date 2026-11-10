// Local train presentation. Server rows and the shared mover clock alone choose the decks' poses.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import type { Platform } from '../../physics/platforms.ts';
import { carry } from '../../physics/platforms.ts';
import { FIXED, PLAYER_R } from '../../constants.ts';
import { stepAlpha } from '../../physics/engine.ts';
import { createWakePresentation } from '../../render/wake-presentation.ts';
import { emit } from '../../render/particles.ts';
import { whistle, thump } from '../../render/machine-sfx.ts';
import { dustRing } from '../../render/particle-effects.ts';
import { TRAIN_PHASE, TRAIN_HOME, trainAlong, type RailTrain } from '../../sim/railway-train.ts';
import { createBoxBatch, footingParts, footingFrame } from './works-box-view.ts';

const BRASS = '#c79a3e';
/** Footings aboard stand in two stacks on the cradle's seats: slot k's centre in the wagon's rail frame. */
const aboardAt = (k: number) => ({ y: 0.63 + Math.floor(k / 2) * (0.9 + 0.02), z: k % 2 ? 0.8 : -0.8 });
const FOOT_HOP_S = 0.9;
type FootPlace = (k: number, out: THREE.Vector3) => THREE.Vector3;

// Place's kit owns one page-lifetime wheel batch and animation hook. Reuse its two models across view lifetimes
// rather than consuming another twelve slots on every remount. The view owns the drawn geometry copies.
let kitModels: ReturnType<typeof import('../../proto/place/look-kit.ts').trainLook>[] | null = null;

export async function createRailwayTrains(
  adapter: RailwayAdapter,
  owner: OwnedView,
  seats: typeof import('../../proto/place/seat.ts'),
  depotPlace: (k: number, out: THREE.Vector3) => THREE.Vector3,
) {
  const [layout, rail, look, kit, wagon, crates, load, pieces, sounds, props] = await Promise.all([
    import('../../proto/place/layout.ts'),
    import('../../proto/place/rail.ts'),
    import('../../proto/place/look.ts'),
    import('../../proto/place/look-kit.ts'),
    import('../../proto/wagon/look.ts'),
    import('../../proto/net/crates.ts'),
    import('../../proto/place/train-load.ts'),
    import('../../proto/place/pieces.ts'),
    import('../../proto/minis/common.ts'),
    import('../../proto/place/carry-models.ts'),
  ]);
  let clock = -1,
    shudder = 0,
    secondVisible = false;
  // Line 2 has a fourth car, the footing wagon, behind its flatbeds; it waits under the land until it couples.
  const offsets = wagon.TRAIN_OFFSETS;
  const WAGON = 3;
  const wagonRock = new THREE.Group();
  const trains = [0, 1].map((k) => {
    if (look.LOOK.kit) kitModels ??= [kit.trainLook(2), kit.trainLook(2)];
    const model = look.LOOK.kit ? kitModels![k]! : wagon.wagonLook(2, false, owner);
    const cars = offsets.slice(0, k ? 4 : 3).map((_, n) => {
      const car = rail.makeCar(
        wagon.TRAIN_CARS[n]!,
        n === WAGON ? wagonRock : model.cars[n]!,
        () => {
          if (k === 0 && n === 0) step();
        },
        {},
        owner,
      );
      car.platform.id = `railway:train${k}-${n}`;
      car.platform.shared = true;
      car.speedLimit = 30;
      return car;
    });
    const deck = crates.deck(model.cars[2]!, () => {});
    for (const n of [1, 2]) {
      const car = cars[n]!;
      for (const [i, z] of [-0.8, 0.8].entries()) {
        // The track layer's low stool, down the middle of the deck (owner, 10 November); no solid, so the aisle and
        // a walk along the deck stay open. Riders face across the car, as before.
        const stool = seats.lowStoolMesh();
        stool.position.set(0, car.hy, z);
        stool.rotation.y = Math.PI / 2 + Math.PI;
        owner.add(stool);
        car.mesh.add(stool);
        owner.cleanup(
          seats.registerSeat({
            id: `railway:train${k}-${n}-seat${i}`,
            group: `railway:train${k}-${n}`,
            platform: car.platform,
            anchorView: true,
            at: { x: 0, y: car.hy + seats.lowStoolAnchor, z, yaw: Math.PI / 2 },
            // Standing up steps you back off the stool, onto the deck behind it.
            exit: { x: 0.6, y: car.hy + PLAYER_R, z, yaw: Math.PI / 2 },
            available: () => car.y > -30 && (n === 1 || crates.deckCount(deck) === 0),
          }),
        );
      }
    }
    // The kit shell already has the two open brass receivers; its boiler is hidden in Place's saved state.
    const boiler = props.makeBoiler();
    const boilerGeometries = new Set<THREE.BufferGeometry>();
    const boilerMaterials = new Set<THREE.Material>();
    boiler.traverse((part) => {
      if (!(part instanceof THREE.Mesh)) return;
      boilerGeometries.add(part.geometry);
      for (const mat of Array.isArray(part.material) ? part.material : [part.material]) boilerMaterials.add(mat);
    });
    boiler.position.set(0, 1.2, 0.5);
    boiler.rotation.y = Math.PI;
    owner.add(boiler);
    model.cars[0]!.add(boiler);
    owner.cleanup(() => {
      boiler.removeFromParent();
      for (const g of boilerGeometries) g.dispose();
      for (const m of boilerMaterials) m.dispose();
      for (const c of cars) c.mesh.visible = false;
      // A cached kit model must not retain the retired physics/seat graph. Its wheel callback sees no parent.
      for (const c of model.cars) c.removeFromParent();
      wagonRock.removeFromParent();
    });
    const solid = load.solidTrainLoad(cars[2]!, deck);
    return { model, cars, deck, solid, boiler, last: null as RailTrain | null, count: -1, puffs: 0, speed: 0 };
  });
  const first = trains[0]!;
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
    trains.forEach((tr, k) => {
      const row = s.line2.train[k]!;
      const along = s.line2.trains ? trainAlong(row, k, clock) / 100 : k === 0 ? 207 : 17;
      tr.speed = s.line2.trains ? Math.abs(trainAlong(row, k, clock + 0.1) - trainAlong(row, k, clock)) : 0;
      tr.cars.forEach((c, n) => {
        rail.poseCarOnLine(c, layout.LINKS[k]!.line, along + offsets[n]!, 1);
        if (!s.ready || (k === 1 && !secondVisible) || (n === WAGON && !row.wagon)) c.y = -60;
      });
      tr.solid();
    });
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
  const wagonCar = trains[1]!.cars[WAGON]!;
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
    const row = adapter.inspect().line2.train[1]!;
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
      const aboard = Math.max(0, row.foot - inbound());
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
    crates.clearCrates(trains[1]!.deck);
    wake.reset(s.line2.trains ? (clock - s.line2.trainsAt) / 10 : -1);
    trains.forEach((tr, k) => {
      tr.last = { ...s.line2.train[k]! };
      tr.count = -1;
      drawLoad(tr, Math.ceil((tr.last.logs + tr.last.rails) / 8));
    });
    step();
    trains.forEach((tr) => tr.cars.forEach(rail.snapCar));
  }
  owner.animate(({ now }) => {
    trains.forEach((tr) => tr.cars.forEach((c) => rail.drawCar(c, stepAlpha())));
    drawWagon();
    if (shudder)
      first.cars.forEach((c, n) => {
        c.rock.rotation.z = Math.sin(now * 0.073 + n * 1.3) * 0.018 * shudder;
        c.rock.position.x = Math.sin(now * 0.097 + n * 1.3) * 0.035 * shudder;
      });
  }, 7);
  owner.cleanup(() => crates.clearCrates(trains[1]!.deck));
  return {
    restore,
    accepted(e: RailwayAccepted) {
      if (e.op === 'rail.boilerFit')
        wake.start(() => {
          secondVisible = true;
        });
    },
    isTrain: (platform: Platform | null) => trains.some((tr) => tr.cars.some((c) => c.platform === platform)),
    trainFlying: () => ({ logs: flyingLogs, rails: flyingRails }),
    update(dt: number) {
      wake.update(dt);
      const s = adapter.inspect();
      trains.forEach((tr, k) => {
        const row = s.line2.train[k]!;
        tr.boiler.visible = s.line2.trains;
        if (tr.last && s.line2.trains && row.phase === TRAIN_PHASE.RUN && tr.last.phase !== TRAIN_PHASE.RUN)
          whistle(tr.cars[0]!.x, tr.cars[0]!.z);
        if (
          k === 1 &&
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
        if (!unloading || k === 0) drawLoad(tr, Math.ceil((row.logs + row.rails) / 8));
        if (k === 1 && tr.last) footArrivals(row, tr.last);
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
      trains: trains.map((tr, k) => ({
        line: k,
        ...adapter.inspect().line2.train[k],
        along: trainAlong(adapter.inspect().line2.train[k]!, k, clock),
        cars: tr.cars.map((c) => ({ id: c.platform.id, x: c.x, y: c.y, z: c.z, riding: carry.on === c.platform })),
        crates: crates.deckCount(tr.deck),
        ...(k === 1
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
    }),
  };
}
