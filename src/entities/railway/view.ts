// Accepted T1 state drives an owned view of the existing frame, feeder, machine and solid track.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted } from '../../adapters/railway.ts';
import { RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { createWakePresentation } from '../../render/wake-presentation.ts';
import { me } from '../../player/player.ts';
import type { Interactable } from '../../player/hands.ts';
import type { FrameCtx } from '../../loop.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { createRailwaySources } from './sources.ts';
import { createRailwayReward } from './reward.ts';
import { createRailwayArrival } from './arrival.ts';
import { createRailwayOpening } from './opening-view.ts';

export async function createRailwayView(adapter: RailwayAdapter) {
  const owner = createOwnedView();
  const connection = document.createElement('div');
  connection.setAttribute('role', 'status');
  connection.style.cssText =
    'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);padding:8px 14px;border-radius:12px;background:#211e19e8;color:#fff1d8;font:14px system-ui;pointer-events:none;z-index:40';
  connection.hidden = true;
  document.body.append(connection);
  owner.cleanup(() => connection.remove());
  const [land, rail, stations, pieces, layout, sounds, kit, look] = await Promise.all([
    import('../../proto/place/land.ts'),
    import('../../proto/place/rail.ts'),
    import('../../proto/place/stations.ts'),
    import('../../proto/place/pieces.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/minis/common.ts'),
    import('../../proto/place/look-kit.ts'),
    import('../../proto/place/look.ts'),
  ]);
  land.buildLand(owner);
  const line = layout.LINKS[0]!,
    spec = line.stations[0]!;
  const depositSeconds = T1.depositTicks / 10;
  const feedSeconds = T1.feedTicks / 10;
  const distance = (T1.fromCm - T1.toCm) / 100;
  const machine = rail.buildMachine(owner);
  const track = rail.buildTrack(line, (_k, kind, x, y, z) => rail.thud(machine, kind, x, y, z), owner);
  const station = stations.buildStation(spec, stations.frameBesideLine(spec, line.line, line.dir), owner);
  machine.at(line.line, T1.fromCm / 100, line.dir);
  machine.snap();
  machine.setRack(T1.starterRails);
  track.snapTo(track.u(T1.fromCm / 100));
  const arrival = await createRailwayArrival(owner, () =>
    track.solids.flatMap((solid) => {
      if (!solid.on || solid.s === undefined) return [];
      const at = layout.lineAt(line.line, solid.s, { x: 0, z: 0, ux: 0, uz: 0 });
      return [{ x: at.x + layout.ORIGIN.x, y: layout.railY(line.line, solid.s) + 0.2, z: at.z }];
    }),
  );
  const sources = await createRailwaySources(adapter, owner);
  if (look.LOOK.contact) kit.installContact([machine.flatbed, machine.loco], sources.inspect(), owner);
  const reward = await createRailwayReward(adapter, owner, (out) => {
    out.set(machine.flatbed.x, machine.flatbed.y + 0.5, machine.flatbed.z);
  });
  const wake = createWakePresentation(machine, owner, { fanfare: sounds.fanfare, dustRing: pieces.dustRing });
  let state = adapter.inspect();
  const opening = await createRailwayOpening(owner, {
    machine: () => ({ mesh: machine.flatbed.mesh, top: machine.flatbed.spec.top }),
    traffic: [machine.loco, machine.flatbed],
    station: () => station,
    busy: () => state.phase === 'feeding' || state.phase === 'laying',
    awake: () => state.phase !== 'asleep' && state.phase !== 'waking',
    hush: () => reward.inspect().busy,
  });
  let rebuild = true;
  let shownTick = -1,
    sinceTick = 0;
  let feedLaunched = 0;
  let visualHead = T1.fromCm / 100;
  let targetHead = visualHead;
  let unload = 0;
  let wasReady = false;
  let deposits: { active: () => boolean; n: number }[] = [];
  const from = new THREE.Vector3(),
    to = new THREE.Vector3(),
    wakeAt = new THREE.Vector3();
  let liveWake = false;
  let previousPhase = state.phase;

  function accepted(event: RailwayAccepted) {
    state = adapter.inspect();
    if (event.op === 'rail.wake') {
      liveWake = true;
      wake.start();
      return;
    }
    if (event.op !== 'rail.deposit') return;
    const account = state.accounts.find((row) => row.pid === event.pid);
    const carried = account?.carry ?? 0;
    for (let n = 0; n < event.accepted; n++) {
      if (!sources.bundleOrigin(event.pid, carried + event.accepted - n - 1, from)) continue;
      const slot = Math.max(0, state.stock + state.allocation + state.used - event.accepted + n);
      const active = pieces.send(
        'log',
        from,
        station.logSlot(slot, to),
        {
          dur: 0.32,
          apex: 0.9,
          size: [1, 2.2],
          land: () => {
            sounds.knock(0.7, 1);
            thump(station.x, station.z);
            pieces.dustRing(station.x, station.y + 0.4, station.z, 2, 0.8, 0.14);
          },
        },
        owner,
      );
      deposits.push({ active, n: 1 });
    }
  }
  owner.cleanup(adapter.onAccepted(accepted));
  owner.cleanup(
    adapter.onReset(() => {
      rebuild = true;
    }),
  );
  owner.cleanup(() => sources.dispose());
  owner.cleanup(() => reward.dispose());
  owner.cleanup(() => wake.dispose());
  const snapshot = () => {
    deposits = [];
    pieces.clearTrips(owner);
    liveWake = false;
    machine.wake(state.phase !== 'asleep' && state.phase !== 'waking', true);
    wake.reset(state.awake < 0 ? -1 : (state.tick - state.awake) / 10);
    const elapsed = state.elapsed / 10;
    feedLaunched =
      elapsed < depositSeconds ? 0 : Math.min(T1.bill, Math.floor((elapsed - depositSeconds) / layout.TUNE.feedS) + 1);
    visualHead = targetHead =
      T1.fromCm / 100 - Math.min(distance, Math.max(0, elapsed - depositSeconds - feedSeconds) * layout.TUNE.laySpeed);
    machine.at(line.line, visualHead, line.dir);
    machine.snap();
    track.snapTo(track.u(visualHead));
    arrival.sceneryRebuilt();
    previousPhase = state.phase;
  };
  // Platform order 10 calls this before moving either deck and before the controller's order 40.
  machine.onStep = (dt) => {
    const previous = visualHead;
    visualHead = Math.max(targetHead, visualHead - layout.TUNE.laySpeed * dt);
    machine.at(line.line, visualHead, line.dir);
    if (previous !== visualHead) machine.moved(previous - visualHead);
  };
  return {
    root: owner.root,
    owner,
    update(ctx: FrameCtx) {
      const { dt, now } = ctx;
      state = adapter.inspect();
      connection.hidden = state.ready;
      connection.textContent =
        state.status === 'storage'
          ? 'Saving is paused. Your last saved progress is safe.'
          : 'Connecting to the railway…';
      if (state.tick !== shownTick) {
        shownTick = state.tick;
        sinceTick = 0;
      } else sinceTick = Math.min(0.1, sinceTick + dt);
      const reconstructed = rebuild || (state.ready && !wasReady);
      if (reconstructed) {
        snapshot();
        rebuild = false;
      }
      wasReady = state.ready;
      const elapsed = state.elapsed / 10 + (state.start >= 0 && state.phase !== 'done' && state.ready ? sinceTick : 0);
      if (previousPhase === 'waking' && state.phase !== 'waking' && state.phase !== 'asleep') {
        machine.wake(true, !liveWake);
        liveWake = false;
      }
      if (state.phase === 'feeding' || state.phase === 'laying' || state.phase === 'done') {
        const wanted = Math.min(T1.bill, Math.max(0, Math.floor((elapsed - depositSeconds) / layout.TUNE.feedS) + 1));
        while (feedLaunched < wanted) {
          const slot = T1.bill - 1 - feedLaunched++;
          pieces.send(
            'log',
            station.logSlot(slot, from),
            station.feederEnd,
            {
              dur: 0.55,
              apex: 0.15,
              size: [2.2, 2.2],
              aim: (out) => void machine.worldCradle(out),
              land: () => clank(station.x, station.z),
            },
            owner,
          );
        }
      }
      targetHead =
        T1.fromCm / 100 -
        Math.min(distance, Math.max(0, elapsed - depositSeconds - feedSeconds) * layout.TUNE.laySpeed);
      if (state.phase === 'done') targetHead = T1.toCm / 100;
      track.layTo(track.u(visualHead));
      track.update(dt);
      deposits = deposits.filter((flight) => flight.active());
      const inFlight = deposits.reduce((n, flight) => n + flight.n, 0);
      const stocked = state.start >= 0 ? T1.bill - feedLaunched : Math.max(0, state.stock - inFlight);
      station.have.logs = state.start >= 0 ? T1.bill : state.stock;
      station.drawStock({ logs: stocked, rails: 0, stone: 0, beam: 0 });
      station.setTag(state.phase === 'idle' || state.phase === 'deposit' || state.phase === 'feeding');
      const enteredCradle = Math.min(
        T1.bill,
        Math.max(0, Math.floor((elapsed - depositSeconds - 0.55) / layout.TUNE.feedS) + 1),
      );
      const fraction = Math.min(1, Math.max(0, (T1.fromCm / 100 - visualHead) / distance));
      machine.setCradle(Math.min(enteredCradle, Math.ceil(T1.bill * (1 - fraction))));
      // Place's initial rack serves all of line 1, not only T1. Preserve its visible allowance after this stretch.
      machine.setRack(
        Math.ceil(
          T1.starterRails * Math.max(0, (visualHead - layout.STUB.village) / (layout.STUB.camp - layout.STUB.village)),
        ),
      );
      if (previousPhase !== 'done' && state.phase === 'done') whistle(station.x, station.z);
      previousPhase = state.phase;
      unload -= dt;
      const p = me.body?.position;
      if (
        state.ready &&
        state.phase === 'idle' &&
        p &&
        unload <= 0 &&
        state.availableCarry > 0 &&
        Math.hypot(p.x - station.x, p.z - station.z) <= layout.TUNE.reachStation
      ) {
        if (adapter.deposit()) unload = layout.TUNE.unloadS;
      }
      wake.update(dt);
      arrival.update(dt, state.ready, state.tick);
      sources.update(dt, now);
      pieces.updatePieces(dt, owner);
      reward.update(dt, now);
      opening.update(dt);
      if (state.ready)
        opening.numbers(
          { money: state.counts.score, logs: state.delivered, metres: T1.fromCm / 100 - visualHead },
          reconstructed,
        );
      owner.update(ctx);
    },
    targets(): Interactable[] {
      const targets = [...sources.targets(), ...reward.targets()];
      const p = me.body?.position;
      if (p && state.ready && state.phase === 'asleep' && machine.distance(p.x, p.z) < 6)
        targets.push({
          id: 'place-wake',
          verb: 'Wake it up',
          at: wakeAt.set(machine.flatbed.x, machine.flatbed.y + 2.4, machine.flatbed.z),
          run: () => void adapter.wake(),
        });
      return targets;
    },
    inspect: () => ({
      ...adapter.inspect(),
      owned: owner.counts(),
      head: visualHead,
      targetHead,
      station: { x: station.x, y: station.y, z: station.z, shown: station.shown.logs },
      machine: { x: machine.flatbed.x, y: machine.flatbed.y, z: machine.flatbed.z },
      trees: sources.inspect(),
      reward: reward.inspect(),
    }),
    dispose: () => owner.dispose(),
  };
}
export type RailwayView = Awaited<ReturnType<typeof createRailwayView>>;
