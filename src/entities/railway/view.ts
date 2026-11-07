// One accepted line, one machine. Flights and rigid poses display the ledger and never transfer material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import { RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import { LINE1_STATIONS } from '../../sim/railway-line-layout.ts';
import { lineFeed, lineSchedule, lineLayDistance, type LineTiming } from '../../sim/railway-line-schedule.ts';
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
import { createRailwayPath } from './path.ts';
import { createRailwayPanelView } from './panel-view.ts';
import { createRailwayLine2 } from './line2-view.ts';

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
  const line = layout.LINKS[0]!;
  const machine = rail.buildMachine(owner, 'panels');
  const track = rail.buildTrack(line, (_k, kind, x, y, z) => rail.thud(machine, kind, x, y, z), owner, 'panels');
  const frames = line.stations.map((spec) =>
    stations.buildStation(spec, stations.frameBesideLine(spec, line.line, line.dir), owner),
  );
  machine.at(line.line, T1.fromCm / 100, line.dir, 2.4);
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
  const line2 = await createRailwayLine2(adapter, owner, machine, sources.bundleOrigin);
  if (look.LOOK.contact) kit.installContact([machine.flatbed, machine.loco], sources.inspect(), owner);
  const reward = await createRailwayReward(adapter, owner, (out) =>
    out.set(machine.flatbed.x, machine.flatbed.y + 0.5, machine.flatbed.z),
  );
  const wake = createWakePresentation(machine, owner, { fanfare: sounds.fanfare, dustRing: pieces.dustRing });
  const path = await createRailwayPath(owner);
  let state = adapter.inspect();
  const opened = () => state.stations[2]?.completion === 1;
  const opening = await createRailwayOpening(owner, {
    machine: () => ({ mesh: machine.flatbed.mesh, top: machine.flatbed.spec.top }),
    traffic: [machine.loco, machine.flatbed],
    station: () => frames[state.activeStation]!,
    busy: () => state.phase === 'feeding' || state.phase === 'laying',
    awake: () => state.phase !== 'asleep' && state.phase !== 'waking',
    hush: () => reward.inspect().busy,
    pathOpen: opened,
  });
  // hard: rebuild from the state (first join); soft: the state came again after a lost connection or a resync, and
  // the machine eases to it (it catches up at twice its speed) unless it is more than 12 m off.
  let rebuild: 'hard' | 'soft' | null = 'hard',
    everReady = false,
    shownTick = -1,
    sinceTick = 0,
    visualHead = T1.fromCm / 100,
    targetHead = visualHead,
    setback = 2.4;
  let unload = 0,
    wasReady = false,
    liveWake = false,
    previousPhase = state.phase,
    previousOpen = false;
  const feedLaunched = [0, 0, 0];
  let deposits: { active: () => boolean; station: number; kind: number }[] = [];
  const from = new THREE.Vector3(),
    to = new THREE.Vector3(),
    wakeAt = new THREE.Vector3();
  const jobElapsed = (index: number) => {
    const job = state.stations[index]!;
    return (
      job.elapsed +
      (index === state.activeStation && job.start >= 0 && !job.completion && state.ready ? sinceTick * 10 : 0)
    );
  };
  // A station's schedule and feed are pure in its timing, which is pinned when the job is funded: they are worked out
  // again only when it changes, not every frame.
  const plans = LINE1_STATIONS.map((spec) => ({
    spec,
    timing: null as LineTiming | null,
    schedule: null as ReturnType<typeof lineSchedule> | null,
    feed: [] as ReturnType<typeof lineFeed>,
  }));
  const sameTiming = (a: LineTiming, b: LineTiming) => {
    for (const k in a) if (a[k as keyof LineTiming] !== b[k as keyof LineTiming]) return false;
    for (const k in b) if (!(k in a)) return false;
    return true;
  };
  const planOf = (index: number, timing: LineTiming) => {
    const plan = plans[index]!;
    if (!plan.schedule || !plan.timing || !sameTiming(plan.timing, timing)) {
      plan.schedule = lineSchedule(plan.spec, timing);
      plan.feed = lineFeed(plan.spec, timing);
      plan.timing = timing;
    }
    return plan as { schedule: ReturnType<typeof lineSchedule>; feed: ReturnType<typeof lineFeed> };
  };
  const head = () => {
    if (opened()) return 19; // Waiting point on the pre-existing village stub; no forge turn or train activation.
    const spec = LINE1_STATIONS[state.activeStation]!,
      job = state.stations[state.activeStation]!;
    if (job.completion) return spec.toCm / 100;
    if (job.start < 0) return spec.fromCm / 100;
    const { schedule } = planOf(state.activeStation, job.timing);
    return (
      (spec.fromCm -
        Math.min(
          spec.fromCm - spec.toCm,
          lineLayDistance(jobElapsed(state.activeStation) - schedule.depositTicks - schedule.feedTicks, job.timing),
        )) /
      100
    );
  };
  const panels = createRailwayPanelView(
    machine,
    track,
    () => state,
    () => visualHead,
    (end, unit) => {
      const p = rail.besideLine(line.line, end, 0);
      clank(p.x, p.z);
      // Contact dust once per stock unit, as before the pairs: smaller commits add no smoke.
      if (unit) pieces.dustRing(p.x, layout.railY(line.line, end) + 0.1, p.z, 4, 0.5, 0.12);
    },
    owner,
  );
  function restoreMotion() {
    const spec = LINE1_STATIONS[state.activeStation]!,
      job = state.stations[state.activeStation]!;
    visualHead = targetHead = head();
    setback = 2.4;
    if (state.phase === 'laying') setback = Math.min(machine.F, 2.4 + spec.fromCm / 100 - visualHead);
    else {
      const finished = opened() ? job : state.stations[state.activeStation - 1];
      if (finished?.completion) {
        const seconds = Math.max(0, state.tick - finished.lastTick) / 10;
        const speed = finished.timing.cruiseCmPerTick / 10;
        const parkSeconds = (machine.F - 2.4) / speed;
        setback = Math.max(2.4, machine.F - speed * seconds);
        if (opened()) visualHead = Math.max(19, 30 - Math.max(0, seconds - parkSeconds) * layout.TUNE.runSpeed);
      }
    }
    machine.at(line.line, visualHead, line.dir, setback);
    machine.snap();
  }
  function accepted(event: RailwayAccepted) {
    state = adapter.inspect();
    if (event.op === 'rail.wake') {
      liveWake = true;
      wake.start();
      return;
    }
    if (event.op !== 'rail.deposit' && event.op !== 'rail.beamDeposit') return;
    const index = event.op === 'rail.beamDeposit' ? 2 : LINE1_STATIONS.findIndex((spec) => spec.id === event.station);
    const station = frames[index],
      job = state.stations[index];
    if (!station || !job) return;
    const kind = event.op === 'rail.beamDeposit' ? 2 : (event.kind ?? 0);
    const account = state.accounts.find((row) => row.pid === event.pid);
    // As this deposit left them (several can share one packet): the actor's balance and the station's count.
    const carried = event.carried ?? (kind === 1 ? (account?.stone ?? 0) : (account?.carry ?? 0));
    const current =
      event.level ??
      (kind === 1 ? job.stoneStock + job.stoneAllocation + job.stoneUsed : job.stock + job.allocation + job.used);
    for (let n = 0; n < event.accepted; n++) {
      if (!sources.bundleOrigin(event.pid, carried + event.accepted - n - 1, from)) continue;
      const slot = Math.max(0, current - event.accepted + n);
      const active = pieces.send(
        kind === 1 ? 'stone' : 'log',
        from,
        kind === 1 ? station.stoneAt(slot, to) : kind === 2 ? station.at : station.logSlot(slot, to),
        {
          dur: kind === 2 ? 0.5 : 0.32,
          apex: 0.9,
          size: kind === 2 ? [4, 4] : [1, 2.2],
          land: () => {
            sounds.knock(0.7, 1);
            thump(station.x, station.z);
          },
        },
        owner,
      );
      deposits.push({ active, station: index, kind });
    }
  }
  owner.cleanup(adapter.onAccepted(accepted));
  // A predicted wake or deposit the server did not take (replication R1b; Local presentation): the machine settles back
  // asleep with a thump; logs you were shown going into a frame lift out and return to your back.
  owner.cleanup(
    adapter.onCorrected((c: RailwayCorrection) => {
      state = adapter.inspect();
      const e = c.event;
      if (e.op === 'rail.wake') {
        liveWake = false;
        wake.reset(-1);
        machine.wake(false, true);
        thump(machine.flatbed.x, machine.flatbed.z);
        return;
      }
      if (e.op !== 'rail.deposit') return;
      const index = LINE1_STATIONS.findIndex((spec) => spec.id === e.station);
      const station = frames[index];
      if (!station) return;
      const kind = e.kind ?? 0;
      const held = kind === 1 ? state.stoneCarry : state.carry;
      for (let n = 0; n < c.lost; n++) {
        const slot = Math.max(0, (e.level ?? 0) - 1 - n);
        const at = kind === 1 ? station.stoneAt(slot, from) : station.logSlot(slot, from);
        if (!sources.bundleOrigin(state.pid, held - c.lost + n, to)) continue;
        pieces.send(
          kind === 1 ? 'stone' : 'log',
          at,
          to,
          { dur: 0.3, apex: 0.8, land: () => sounds.pop(3, 0.4) },
          owner,
        );
      }
      clank(station.x, station.z);
    }),
  );
  owner.cleanup(
    adapter.onReset((soft) => {
      rebuild = soft && rebuild !== 'hard' ? 'soft' : 'hard';
    }),
  );
  owner.cleanup(() => sources.dispose());
  owner.cleanup(() => reward.dispose());
  owner.cleanup(() => wake.dispose());
  function snapshot() {
    deposits = [];
    pieces.clearTrips(owner);
    liveWake = false;
    machine.wake(state.phase !== 'asleep' && state.phase !== 'waking', true);
    wake.reset(state.awake < 0 ? -1 : (state.tick - state.awake) / 10);
    state.stations.forEach((job, index) => {
      const schedule = lineSchedule(LINE1_STATIONS[index]!, job.timing);
      feedLaunched[index] =
        job.start < 0
          ? 0
          : lineFeed(LINE1_STATIONS[index]!, job.timing).filter(
              (flight) => flight.launchMs <= (job.elapsed - schedule.depositTicks) * 100,
            ).length;
    });
    restoreMotion();
    panels.restore();
    arrival.sceneryRebuilt();
    previousPhase = state.phase;
    previousOpen = opened();
    path.update(opened(), true);
    line2.snapshot();
  }
  machine.onStep = (dt) => {
    if (line2.working()) return line2.step(dt);
    const previousBody = visualHead + setback;
    const speed = state.stations[state.activeStation]!.timing.cruiseCmPerTick / 10;
    const spec = LINE1_STATIONS[state.activeStation]!;
    const stop = opened() ? 30 : (state.phase === 'laying' ? spec.toCm : spec.fromCm) / 100;
    const layTarget = Math.max(stop, targetHead);
    if (visualHead > layTarget) {
      // Behind the accepted head (a state that came back after a lost connection), it catches up at twice its speed.
      const step = Math.min(visualHead - layTarget, speed * dt * (visualHead - layTarget > 1 ? 2 : 1));
      visualHead -= step;
      setback = Math.min(machine.F, setback + step);
    } else if (state.phase !== 'laying') {
      // After closure roll onto accepted track before approaching the next frame or waiting point.
      if (setback > 2.4) setback = Math.max(2.4, setback - speed * dt);
      else if (opened()) visualHead = Math.max(targetHead, visualHead - layout.TUNE.runSpeed * dt);
    }
    machine.at(line.line, visualHead, line.dir, setback);
    const distance = previousBody - (visualHead + setback);
    if (distance > 0) machine.moved(distance);
  };
  return {
    root: owner.root,
    owner,
    prePhysics: () => sources.prePhysics(),
    fixedPre: () => reward.fixedPre(),
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
      // Readiness returning after a lost connection is no rebuild: only the first readiness, or a hard reset, is.
      const hard = rebuild === 'hard' || (state.ready && !wasReady && !everReady);
      const reconstructed = hard || rebuild === 'soft'; // either way, nothing that happened meanwhile plays its fanfare
      if (hard) snapshot();
      else if (rebuild === 'soft' && Math.abs(head() - visualHead) > 12) restoreMotion();
      rebuild = null;
      wasReady = state.ready;
      everReady ||= state.ready;
      if (previousPhase === 'waking' && state.phase !== 'waking' && state.phase !== 'asleep') {
        machine.wake(true, !liveWake);
        liveWake = false;
      }
      deposits = deposits.filter((flight) => flight.active());
      state.stations.forEach((job, index) => {
        const station = frames[index]!,
          spec = LINE1_STATIONS[index]!;
        const { schedule, feed } = planOf(index, job.timing);
        const feedMs = (jobElapsed(index) - schedule.depositTicks) * 100;
        const wanted = job.start < 0 ? 0 : feed.filter((flight) => flight.launchMs <= feedMs).length;
        while (feedLaunched[index]! < wanted) {
          const flight = feed[feedLaunched[index]!]!;
          feedLaunched[index]!++;
          // A caught-up accepted clock can already have consumed this flight; never replay it into stock.
          if (flight.landMs <= feedMs) continue;
          const origin =
            flight.kind === 'stone'
              ? station.stoneAt(flight.slot, from)
              : flight.kind === 'beam'
                ? station.at
                : station.logSlot(flight.slot, from);
          pieces.send(
            flight.kind === 'stone' ? 'stone' : 'log',
            origin,
            station.feederEnd,
            {
              dur: (flight.landMs - flight.launchMs) / 1000,
              apex: flight.kind === 'beam' ? 0.6 : 0.15,
              size: flight.kind === 'beam' ? [4, 4] : [2.2, 2.2],
              aim: (out) => void machine.worldCradle(out),
              land: () => clank(station.x, station.z),
            },
            owner,
          );
        }
        const launched = feed.slice(0, feedLaunched[index]);
        const stockOf = (kind: number) =>
          deposits.filter((flight) => flight.station === index && flight.kind === kind).length;
        station.have.logs = job.start >= 0 ? spec.bill[0] : job.stock;
        station.have.stone = job.start >= 0 ? spec.bill[1] : job.stoneStock;
        station.have.beam = index === 2 && (state.beam?.state === 'allocated' || state.beam?.state === 'used') ? 1 : 0;
        station.drawStock({
          logs:
            job.start >= 0
              ? spec.bill[0] - launched.filter((f) => f.kind === 'log').length
              : Math.max(0, job.stock - stockOf(0)),
          stone:
            job.start >= 0
              ? spec.bill[1] - launched.filter((f) => f.kind === 'stone').length
              : Math.max(0, job.stoneStock - stockOf(1)),
          rails: 0,
          beam: Math.max(0, station.have.beam - launched.filter((f) => f.kind === 'beam').length - stockOf(2)),
        });
        station.setTag(
          index === state.activeStation && !job.completion && state.phase !== 'asleep' && state.phase !== 'waking',
        );
        if (index === state.activeStation) {
          const entered = feed.filter((f) => f.kind === 'log' && f.landMs <= feedMs).length;
          const fraction = Math.min(
            1,
            Math.max(0, (spec.fromCm / 100 - visualHead) / ((spec.fromCm - spec.toCm) / 100)),
          );
          if (!line2.working()) machine.setCradle(Math.min(entered, Math.ceil(spec.bill[0] * (1 - fraction))));
        }
      });
      targetHead = head();
      // One machine: line two takes its panel frame and rack once it has crossed.
      machine.onPanelFrame = line2.working() ? line2.panelFrame : panels.frame;
      if (!line2.working()) panels.update(dt);
      line2.update(dt);
      if (!previousOpen && opened() && !reconstructed) {
        sounds.fanfare(true);
        whistle(machine.flatbed.x, machine.flatbed.z);
      }
      path.update(opened(), reconstructed);
      previousOpen = opened();
      previousPhase = state.phase;
      unload -= dt;
      const p = me.body?.position,
        station = frames[state.activeStation]!;
      if (
        state.ready &&
        state.phase === 'idle' &&
        p &&
        unload <= 0 &&
        Math.hypot(p.x - station.x, p.z - station.z) <= layout.TUNE.reachStation
      ) {
        if (state.beam?.state === 'held' && state.beam.holder === state.pid && state.activeStation === 2) {
          if (adapter.beamDeposit(state.beam.revision)) unload = layout.TUNE.unloadS;
        } else if (
          state.availableCarry > 0 &&
          state.stations[state.activeStation]!.stock < LINE1_STATIONS[state.activeStation]!.bill[0] &&
          adapter.deposit(1, 0)
        )
          unload = layout.TUNE.unloadS;
        else if (
          state.stoneCarry > 0 &&
          state.stations[state.activeStation]!.stoneStock < LINE1_STATIONS[state.activeStation]!.bill[1] &&
          adapter.deposit(1, 1)
        )
          unload = layout.TUNE.unloadS;
      }
      wake.update(dt);
      arrival.update(dt, state.ready, state.tick);
      sources.update(dt, now);
      pieces.updatePieces(dt, owner);
      reward.update(dt, now);
      opening.update(dt);
      if (state.ready)
        opening.numbers(
          {
            money: state.counts.score,
            logs: state.stations.reduce((sum, job) => sum + job.delivered, 0),
            metres: T1.fromCm / 100 - Math.max(30, visualHead),
          },
          reconstructed,
        );
      owner.update(ctx);
    },
    targets(): Interactable[] {
      const targets = [...sources.targets(), ...reward.targets(), ...line2.targets()];
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
      panelCursor: track.cursor,
      machineSetback: setback,
      station: {
        x: frames[state.activeStation]!.x,
        y: frames[state.activeStation]!.y,
        z: frames[state.activeStation]!.z,
        shown: frames[state.activeStation]!.shown.logs,
      },
      machine: { x: machine.flatbed.x, y: machine.flatbed.y, z: machine.flatbed.z },
      trees: sources.inspect(),
      reward: reward.inspect(),
      pathOpen: opened(),
      line2View: line2.inspect(),
    }),
    dispose: () => owner.dispose(),
  };
}
export type RailwayView = Awaited<ReturnType<typeof createRailwayView>>;
