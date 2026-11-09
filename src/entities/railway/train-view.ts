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
import { whistle } from '../../render/machine-sfx.ts';
import { TRAIN_PHASE, TRAIN_HOME, trainAlong, type RailTrain } from '../../sim/railway-train.ts';

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
  const offsets = [3.7, 0, -3.7];
  const trains = [0, 1].map((k) => {
    if (look.LOOK.kit) kitModels ??= [kit.trainLook(2), kit.trainLook(2)];
    const model = look.LOOK.kit ? kitModels![k]! : wagon.wagonLook(2, false, owner);
    const cars = offsets.map((_, n) => {
      const car = rail.makeCar(
        n === 0 ? wagon.LOCO : wagon.TRAILER,
        model.cars[n]!,
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
        const stool = seats.seatMesh();
        stool.position.set(car.spec.hx - 0.2, car.hy, z);
        owner.add(stool);
        car.mesh.add(stool);
        owner.cleanup(
          seats.registerSeat({
            id: `railway:train${k}-${n}-seat${i}`,
            group: `railway:train${k}-${n}`,
            platform: car.platform,
            anchorView: true,
            at: { x: car.spec.hx - 0.2, y: car.hy + seats.seatHeight, z, yaw: Math.PI / 2 },
            exit: { x: 0, y: car.hy + PLAYER_R, z, yaw: Math.PI / 2 },
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
        if (!s.ready || (k === 1 && !secondVisible)) c.y = -60;
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
  function restore() {
    const s = adapter.inspect();
    clock = adapter.tickNow();
    secondVisible = s.line2.trains;
    flyingLogs = flyingRails = 0;
    unloading = false;
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
    },
    inspect: () => ({
      trains: trains.map((tr, k) => ({
        line: k,
        ...adapter.inspect().line2.train[k],
        along: trainAlong(adapter.inspect().line2.train[k]!, k, clock),
        cars: tr.cars.map((c) => ({ id: c.platform.id, x: c.x, y: c.y, z: c.z, riding: carry.on === c.platform })),
        crates: crates.deckCount(tr.deck),
      })),
      oldTrain: { shown: !adapter.inspect().line2.trains, rust: look.rustTrainU.value, stop: TRAIN_HOME[0] },
    }),
  };
}
