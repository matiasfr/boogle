// One accepted line, one machine. Flights and rigid poses display the ledger and never transfer material.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter, RailwayAccepted, RailwayCorrection } from '../../adapters/railway.ts';
import { RAILWAY_T1 as T1 } from '../../sim/railway-layout.ts';
import { LINE1_STATIONS } from '../../sim/railway-line-layout.ts';
import { account as accountRow, beam as beamRow, job as jobRow, rail as railRow } from '../../sim/railway-rows.ts';
import { activeStation, railJobs, timingOf } from '../../sim/railway-queries.ts';
import { railPanelCount, railPanelStock, railPhase } from '../../sim/railway-queries-line1.ts';
import { railCounts } from '../../sim/railway-queries-line2.ts';
import { lineFeed, lineSchedule, lineLayDistance, type LineTiming } from '../../sim/railway-line-schedule.ts';
import { createOwnedView } from '../../render/owned-view.ts';
import { createWakePresentation } from '../../render/wake-presentation.ts';
import { me } from '../../player/player.ts';
import type { Interactable } from '../../player/hands.ts';
import type { FrameCtx } from '../../loop.ts';
import { clank, thump, whistle } from '../../render/machine-sfx.ts';
import { createRailwaySources } from './sources.ts';
import { createRailwayReward } from './reward.ts';
import { registerRailwayYouGot } from './state.ts';
import { createRailwayArrival } from './arrival.ts';
import { createRailwayOpening } from './opening-view.ts';
import { createRailwayPath } from './path.ts';
import { createRailwayPanelView } from './panel-view.ts';
import { createRailwayLine2 } from './line2-view.ts';
import { createRailwayShelf } from './shelf-view.ts';
import { createRailwayCart } from './cart-view.ts';
import { createRailwayTrains } from './train-view.ts';
import { createRailwayHalts } from './halts-view.ts';
import { createRailwayHook } from './hook-shot.ts';
import { createRailwayGlide } from './glide.ts';
import { stepMoves } from './move-order.ts';
import { worksPreview } from './works-flag.ts';

export async function createRailwayView(adapter: RailwayAdapter) {
  const owner = createOwnedView();
  const connection = document.createElement('div');
  connection.setAttribute('role', 'status');
  connection.style.cssText =
    'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);padding:8px 14px;border-radius:12px;background:#211e19e8;color:#fff1d8;font:14px system-ui;pointer-events:none;z-index:40';
  connection.hidden = true;
  document.body.append(connection);
  owner.cleanup(() => connection.remove());
  const [land, rail, stations, pieces, layout, sounds, kit, look, seats] = await Promise.all([
    import('../../place/land.ts'),
    import('./rail-kit.ts'),
    import('./stations.ts'),
    import('../../place/pieces.ts'),
    import('../../place/layout.ts'),
    import('../../render/fanfare.ts'),
    import('../../place/look-kit.ts'),
    import('../../place/look.ts'),
    import('./seat.ts'),
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
  // The reward owns the one reveal queue; line two's devices show through it too.
  const reward = await createRailwayReward(adapter, owner, (out) =>
    out.set(machine.flatbed.x, machine.flatbed.y + 0.5, machine.flatbed.z),
  );
  owner.cleanup(registerRailwayYouGot(reward.youGot));
  let demo = () => {};
  const line2 = await createRailwayLine2(
    adapter,
    owner,
    machine,
    sources.bundleOrigin,
    reward.youGot,
    () => demo(),
    reward.gettingItem,
    () => !!seats.seated(),
  );
  const hook = await createRailwayHook(adapter, owner);
  demo = hook.demo;
  const glide = await createRailwayGlide(adapter, owner, () => hook.inspect().pulling);
  const shelf = await createRailwayShelf(adapter, owner, sources.bundleOrigin);
  const cart = await createRailwayCart(
    adapter,
    owner,
    line2.depotPlace,
    line2.depotYaw,
    line2.depotSlot,
    shelf.railSlot,
  );
  const trains = await createRailwayTrains(adapter, owner, seats, line2.depotPlace);
  line2.boilerSeat(trains.boilerSeat);
  trains.holdBoiler(line2.boilerFlying);
  const halts = await createRailwayHalts(adapter, owner);
  // `?home=b`: Home drawn as one terminus station (docs/plans/home-station.md, step 3). Look only.
  const homeStation = (await import('../../place/home-station.ts')).homeLayout()
    ? await import('./home-station-view.ts').then((m) => m.createHomeStation(adapter, owner))
    : null;
  const flying = () => ({
    logs: cart.flying().logs + trains.trainFlying().logs,
    rails: cart.flying().rails + trains.trainFlying().rails,
  });
  line2.holdDepot(flying);
  shelf.holdRails(flying);
  const works = worksPreview()
    ? await import('./works-live.ts').then((m) =>
        m.createRailwayWorksLive(adapter, owner, {
          seated: () => !!seats.seated(),
          busy: () => reward.inspect().busy,
          toPier: () => trains.footFlying().toPier,
        }),
      )
    : null;
  if (works) trains.footPlaces(works.footPlaces);
  if (look.LOOK.contact)
    kit.installContact(
      [machine.flatbed, machine.loco],
      sources.inspect().filter((tree) => !tree.cleared),
      owner,
    );
  const wake = createWakePresentation(machine, owner, { fanfare: sounds.fanfare, dustRing: pieces.dustRing });
  const path = await createRailwayPath(owner);
  // What the line reads, each time it asks (the rows are replaced, so none is kept): the facade's world is the predicted
  // copy while an action is pending. The session's own `ready` and the opening's inspection have no read yet (M10 b).
  const world = () => adapter.read.world();
  // One tick, one phase and one panel state for a whole frame, taken at the frame's entry (update, targets, accepted,
  // corrected): the facade's tick is live, so a frame that straddled a boundary would miss the waking -> idle edge, and
  // railPhase is not cheap. Main's inspect() held one tick the same way.
  let frameTick = adapter.read.tick();
  let framePhase: ReturnType<typeof railPhase> | null = null;
  let framePanel: ReturnType<typeof panelNow> | null = null;
  const beginFrame = () => {
    frameTick = adapter.read.tick();
    framePhase = null;
    framePanel = null;
  };
  const tick = () => frameTick;
  const phaseNow = () => (framePhase ??= railPhase(world(), frameTick, frameTick));
  const activeNow = () => activeStation(world());
  const jobAt = (index: number) => railJobs(world(), tick())[index]!;
  const ready = () => adapter.inspect().ready;
  const panelNow = () => ({
    phase: phaseNow(),
    activeStation: activeNow(),
    panelStock: railPanelStock(world(), tick()),
    panelCount: railPanelCount(world(), tick()),
  });
  const panelState = () => (framePanel ??= panelNow());
  const opened = () => jobRow(world(), 2).completion === 1;
  const opening = await createRailwayOpening(owner, {
    // top: the deck in the mesh frame (the chairs stand on it), not the car spec height above the rails.
    machine: () => ({ mesh: machine.flatbed.mesh, top: machine.flatbed.hy }),
    traffic: [machine.loco, machine.flatbed],
    station: () => frames[activeNow()]!,
    busy: () => phaseNow() === 'feeding' || phaseNow() === 'laying',
    // The station hands ride the chairs while it lays: one gives way to a player in their chair (folk seat k = chair k).
    chairTaken: (seat) => seats.seatHeld(`machine-deck-${seat}`),
    awake: () => phaseNow() !== 'asleep' && phaseNow() !== 'waking',
    hush: () => reward.inspect().busy,
    pathOpen: opened,
    progress: () => adapter.inspect(),
    driver: trains.driverSeat,
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
    previousPhase = phaseNow(),
    previousOpen = false;
  const feedLaunched = [0, 0, 0];
  let deposits: { active: () => boolean; station: number; kind: number }[] = [];
  const from = new THREE.Vector3(),
    to = new THREE.Vector3(),
    wakeAt = new THREE.Vector3();
  const jobElapsed = (index: number) => {
    const { job, run } = jobAt(index);
    return run.elapsed + (index === activeNow() && job.start >= 0 && !job.completion && ready() ? sinceTick * 10 : 0);
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
    const active = activeNow(),
      spec = LINE1_STATIONS[active]!,
      { job } = jobAt(active);
    if (job.completion) return spec.toCm / 100;
    if (job.start < 0) return spec.fromCm / 100;
    const timing = timingOf(job);
    const { schedule } = planOf(active, timing);
    return (
      (spec.fromCm -
        Math.min(
          spec.fromCm - spec.toCm,
          lineLayDistance(jobElapsed(active) - schedule.depositTicks - schedule.feedTicks, timing),
        )) /
      100
    );
  };
  const panels = createRailwayPanelView(
    machine,
    track,
    panelState,
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
    works?.restore();
    const active = activeNow(),
      spec = LINE1_STATIONS[active]!;
    visualHead = targetHead = head();
    setback = 2.4;
    if (phaseNow() === 'laying') setback = Math.min(machine.F, 2.4 + spec.fromCm / 100 - visualHead);
    else {
      const finished = opened() ? jobAt(active) : active > 0 ? jobAt(active - 1) : undefined;
      if (finished?.job.completion) {
        const seconds = Math.max(0, tick() - finished.run.lastTick) / 10;
        const speed = finished.job.cruiseCmPerTick / 10;
        const parkSeconds = (machine.F - 2.4) / speed;
        setback = Math.max(2.4, machine.F - speed * seconds);
        if (opened()) visualHead = Math.max(19, 30 - Math.max(0, seconds - parkSeconds) * layout.TUNE.runSpeed);
      }
    }
    machine.at(line.line, visualHead, line.dir, setback);
    machine.snap();
  }
  function accepted(event: RailwayAccepted) {
    beginFrame();
    trains.accepted(event);
    works?.accepted(event);
    if (event.op === 'rail.wake') {
      liveWake = true;
      wake.start();
      return;
    }
    if (event.op !== 'rail.deposit' && event.op !== 'rail.beamDeposit') return;
    const index = event.op === 'rail.beamDeposit' ? 2 : LINE1_STATIONS.findIndex((spec) => spec.id === event.station);
    const station = frames[index],
      read = index >= 0 ? jobAt(index) : undefined;
    if (!station || !read) return;
    const job = { ...read.job, ...read.run };
    const kind = event.op === 'rail.beamDeposit' ? 2 : (event.kind ?? 0);
    const account = accountRow(world(), event.pid);
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
      beginFrame();
      works?.corrected(c);
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
      const mine = accountRow(world(), adapter.read.pid);
      const held = (kind === 1 ? mine?.stone : mine?.carry) ?? 0;
      for (let n = 0; n < c.lost; n++) {
        const slot = Math.max(0, (e.level ?? 0) - 1 - n);
        const at = kind === 1 ? station.stoneAt(slot, from) : station.logSlot(slot, from);
        if (!sources.bundleOrigin(adapter.read.pid, held - c.lost + n, to)) continue;
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
    machine.wake(phaseNow() !== 'asleep' && phaseNow() !== 'waking', true);
    const awake = railRow(world()).awake;
    wake.reset(awake < 0 ? -1 : (tick() - awake) / 10);
    railJobs(world(), tick()).forEach(({ job, run }, index) => {
      const timing = timingOf(job);
      const schedule = lineSchedule(LINE1_STATIONS[index]!, timing);
      feedLaunched[index] =
        job.start < 0
          ? 0
          : lineFeed(LINE1_STATIONS[index]!, timing).filter(
              (flight) => flight.launchMs <= (run.elapsed - schedule.depositTicks) * 100,
            ).length;
    });
    restoreMotion();
    panels.restore();
    arrival.sceneryRebuilt();
    previousPhase = phaseNow();
    previousOpen = opened();
    path.update(opened(), true);
    line2.snapshot();
    trains.restore();
    halts.restore();
  }
  machine.onStep = (dt) => {
    if (line2.working()) return line2.step(dt);
    const previousBody = visualHead + setback;
    const speed = jobAt(activeNow()).job.cruiseCmPerTick / 10;
    const spec = LINE1_STATIONS[activeNow()]!;
    const stop = opened() ? 30 : (phaseNow() === 'laying' ? spec.toCm : spec.fromCm) / 100;
    const layTarget = Math.max(stop, targetHead);
    if (visualHead > layTarget) {
      // Behind the accepted head (a state that came back after a lost connection), it catches up at twice its speed.
      const step = Math.min(visualHead - layTarget, speed * dt * (visualHead - layTarget > 1 ? 2 : 1));
      visualHead -= step;
      setback = Math.min(machine.F, setback + step);
    } else if (phaseNow() !== 'laying') {
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
    prePhysics: () => {
      sources.prePhysics();
      line2.prePhysics();
      works?.prePhysics();
      hook.prePhysics();
    },
    fixedPre: () => {
      stepMoves(hook, reward, glide);
    },
    /** Railway-glide fixedPre (23), before the controller. */
    noteVelocity: glide.noteVelocity,
    update(ctx: FrameCtx) {
      const { dt, now } = ctx;
      beginFrame();
      const sessionReady = ready();
      connection.hidden = sessionReady;
      connection.textContent =
        adapter.read.status() === 'storage'
          ? 'Saving is paused. Your last saved progress is safe.'
          : 'Connecting to the railway…';
      if (tick() !== shownTick) {
        shownTick = tick();
        sinceTick = 0;
      } else sinceTick = Math.min(0.1, sinceTick + dt);
      // Readiness returning after a lost connection is no rebuild: only the first readiness, or a hard reset, is.
      const hard = rebuild === 'hard' || (sessionReady && !wasReady && !everReady);
      const reconstructed = hard || rebuild === 'soft'; // either way, nothing that happened meanwhile plays its fanfare
      if (hard) snapshot();
      else if (rebuild === 'soft' && Math.abs(head() - visualHead) > 12) restoreMotion();
      if (rebuild === 'soft') {
        trains.restore();
        halts.restore();
        works?.restore();
      }
      rebuild = null;
      wasReady = sessionReady;
      everReady ||= sessionReady;
      const phase = phaseNow();
      if (previousPhase === 'waking' && phase !== 'waking' && phase !== 'asleep') {
        machine.wake(true, !liveWake);
        liveWake = false;
      }
      deposits = deposits.filter((flight) => flight.active());
      const active = activeNow();
      railJobs(world(), tick()).forEach(({ job: row, run }, index) => {
        const job = { ...row, ...run };
        const station = frames[index]!,
          spec = LINE1_STATIONS[index]!;
        const { schedule, feed } = planOf(index, timingOf(row));
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
        const beamState = beamRow(world()).state;
        station.have.beam = index === 2 && (beamState === 'allocated' || beamState === 'used') ? 1 : 0;
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
        station.setTag(index === active && !job.completion && phase !== 'asleep' && phase !== 'waking');
        if (index === active) {
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
      // Reserve the accepted delivery before the receiving views draw it; pieces appear there on landing.
      cart.update(dt);
      trains.update(dt);
      halts.update(dt);
      homeStation?.update();
      works?.update(dt);
      line2.update(dt);
      hook.update(dt, now);
      glide.update(dt, now);
      shelf.update();
      if (!previousOpen && opened() && !reconstructed) {
        sounds.fanfare(true);
        whistle(machine.flatbed.x, machine.flatbed.z);
      }
      path.update(opened(), reconstructed);
      previousOpen = opened();
      previousPhase = phase;
      unload -= dt;
      const p = me.body?.position,
        station = frames[activeNow()]!;
      if (
        sessionReady &&
        phaseNow() === 'idle' &&
        p &&
        unload <= 0 &&
        Math.hypot(p.x - station.x, p.z - station.z) <= layout.TUNE.reachStation
      ) {
        const beam = beamRow(world()),
          mine = accountRow(world(), adapter.read.pid),
          stationJob = jobAt(activeNow()).job;
        if (beam.state === 'held' && beam.holder === adapter.read.pid && activeNow() === 2) {
          if (adapter.beamDeposit(beam.revision)) unload = layout.TUNE.unloadS;
        } else if (
          (mine?.carry ?? 0) > 0 &&
          stationJob.stock < LINE1_STATIONS[activeNow()]!.bill[0] &&
          adapter.deposit(1, 0)
        )
          unload = layout.TUNE.unloadS;
        else if (
          (mine?.stone ?? 0) > 0 &&
          stationJob.stoneStock < LINE1_STATIONS[activeNow()]!.bill[1] &&
          adapter.deposit(1, 1)
        )
          unload = layout.TUNE.unloadS;
      }
      wake.update(dt);
      arrival.update(dt, sessionReady, tick());
      sources.update(dt, now);
      pieces.updatePieces(dt, owner);
      reward.update(dt, now);
      opening.update(dt);
      if (sessionReady)
        opening.numbers(
          {
            money: railCounts(world(), tick()).score,
            logs: railJobs(world(), tick()).reduce((sum, { job }) => sum + job.delivered, 0),
            metres: T1.fromCm / 100 - Math.max(30, visualHead),
          },
          reconstructed,
        );
      owner.update(ctx);
    },
    lateUpdate: () => {
      sources.lateUpdate();
      line2.lateUpdate();
      works?.lateUpdate();
    },
    targets(): Interactable[] {
      beginFrame();
      const targets = [
        ...opening.targets(),
        ...sources.targets(),
        ...reward.targets(),
        ...line2.targets(),
        ...shelf.targets(),
        ...(works?.targets() ?? []),
        ...halts.targets(),
        ...trains.targets(),
      ];
      const p = me.body?.position;
      if (
        p &&
        ready() &&
        phaseNow() === 'asleep' &&
        Math.hypot(p.x * 100 - T1.wake.x, p.z * 100 - T1.wake.z) < T1.wake.reach
      )
        targets.push({
          id: 'place-wake',
          verb: 'Wake it up',
          at: wakeAt.set(machine.flatbed.x, machine.flatbed.y + 2.4, machine.flatbed.z),
          run: () => void adapter.wake(),
        });
      // The track layer's two chairs: Sit aboard with nothing else to press for; seated, Interact stands you up.
      return seats.withSeatTargets(targets);
    },
    inspect: () => ({
      ...adapter.inspect(), // the oracle's own spread; the adapter's fields go in M12
      owned: owner.counts(),
      head: visualHead,
      targetHead,
      panelCursor: track.cursor,
      machineSetback: setback,
      station: {
        x: frames[activeNow()]!.x,
        y: frames[activeNow()]!.y,
        z: frames[activeNow()]!.z,
        shown: frames[activeNow()]!.shown.logs,
      },
      machine: { x: machine.flatbed.x, y: machine.flatbed.y, z: machine.flatbed.z },
      trees: sources.inspect(),
      reward: reward.inspect(),
      hookShot: hook.inspect(),
      glider: glide.inspect(),
      pathOpen: opened(),
      line2View: { ...line2.inspect(), ...shelf.inspect(), ...cart.inspect(), ...trains.inspect(), ...halts.inspect() },
      // The Works and Roundhouse views' own inspection; `works` and `shed` are the adapter's accepted state (J3).
      worksView: works?.inspect() ?? null,
      crossingView: works?.crossingInspect() ?? null,
    }),
    dispose: () => owner.dispose(),
  };
}
export type RailwayView = Awaited<ReturnType<typeof createRailwayView>>;
