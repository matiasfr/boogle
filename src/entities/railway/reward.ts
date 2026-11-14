// T1's conductor hat and T2's scarf: profiles commit before the common-box reveal begins. The boxes after them are
// ./crates-view.ts, mounted here on the same reveal queue.
// Construction is Server; eligibility is read-only, claims are personal Local. A claimed hat or scarf goes into the
// wardrobe (../wardrobe/state.ts), which owns what is worn and shows it to others.
import * as THREE from 'three/webgpu';
import type { RailwayAdapter } from '../../adapters/railway-session.ts';
import { createBrowserRailwayProfile } from '../../railway-profile-browser.ts';
import { claimsPruned } from '../../boot/world-reset.ts';
import { getRoomId } from '../../netplay/net.ts';
import { me } from '../../player/player.ts';
import { wardrobe } from '../wardrobe/state.ts';
import type { Interactable } from '../../player/hands.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { createRewardReveal } from '../../render/reward-reveal.ts';
import { T1_CRATE_PARTS, T1_REWARD, MULTI_AXE_REWARD } from '../../render/t1-reward-parts.ts';
import { confettiBurst, rewardDust, rewardSparkles } from '../../render/reward-particles.ts';
import { placeSound } from '../../render/place-sfx.ts';
import { thump } from '../../render/machine-sfx.ts';
import { GLIDE_REWARD, T2_REWARD } from './reward-data.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { claimCountsIn } from '../../world/railway-jump.ts';
import { createRailwayTools, inReach } from './tools.ts';
import { createAbilityArrival } from './ability-arrival.ts';
import { createTrophyPlinth } from './trophy-plinth.ts';
import { createStationBoxes } from './crates-view.ts';
import { job } from '../../sim/railway-rows.ts';
import { railPhase } from '../../sim/railway-queries-line1.ts';

export async function createRailwayReward(
  adapter: RailwayAdapter,
  owner: OwnedView,
  machineFrom?: (out: THREE.Vector3) => void,
) {
  const [{ softGlow }, { fanfare, pop }, shapes, props] = await Promise.all([
    import('../../place/look.ts'),
    import('../../render/fanfare.ts'),
    import('../../render/part-geometry.ts'),
    import('../../render/prop-kit.ts'),
  ]);
  // One reveal queue owns input/camera holding for both personal boxes and shared tools.
  const reveal = createRewardReveal({ parent: owner.root, fanfare, pop, softGlow });
  owner.cleanup(() => reveal.dispose());
  const first = await createStationReward(adapter, owner, reveal, 0, machineFrom);
  const second = await createStationReward(adapter, owner, reveal, 1, machineFrom);
  // The personal boxes after the scarf (Q2–Q6), through the same reveal queue.
  const boxes = await createStationBoxes(adapter, owner, reveal.youGot, rewardSeat, machineFrom);
  const tools = await createRailwayTools(adapter, owner, reveal, machineFrom);
  // Shared abilities: the finder's card above; everyone's own arrival and Home's trophy (co-op abilities, option E).
  // The glider's flourish badge: the folded wing from its card (reward-data.ts), on a material of its own.
  const glidePrize = shapes.merged(GLIDE_REWARD.parts);
  const glideMat = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.75, flatShading: true });
  // The boiler's: one copy of the engine's boiler (makeProp owns its geometry and materials), reused by each flourish.
  const boilerBadge = props.makeProp('boiler');
  owner.cleanup(() => {
    glidePrize.dispose();
    glideMat.dispose();
    boilerBadge.removeFromParent();
    boilerBadge.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      o.geometry.dispose();
      for (const m of [o.material].flat()) m.dispose();
    });
  });
  const arrival = createAbilityArrival(adapter, owner, {
    busy: reveal.gettingItem,
    jump: () => tools.inspect(),
    axeModel: (key) =>
      key === 'glide' ? new THREE.Mesh(glidePrize, glideMat) : key === 'boiler' ? boilerBadge : tools.axeModel(key),
  });
  const plinth = await createTrophyPlinth(adapter, owner, arrival.seen, reveal.gettingItem);
  return {
    inspect() {
      const t1 = first.inspect(),
        t2 = second.inspect(),
        toolState = tools.inspect();
      return {
        ...t1,
        claims: Math.max(t1.claims, t2.claims),
        t2,
        boxes: [
          { station: 'T1', ...t1 },
          { station: 'T2', ...t2 },
        ],
        tools: toolState,
        axeChest: toolState.axeChest,
        jumpDevice: toolState.jumpDevice,
        arrival: arrival.inspect(),
        plinth: plinth.inspect(),
        stationBoxes: boxes.inspect(),
        showing: reveal.gettingItem(),
      };
    },
    targets: () => [...first.targets(), ...second.targets(), ...boxes.targets(), ...tools.targets()],
    youGot: reveal.youGot,
    gettingItem: reveal.gettingItem,
    update(dt: number, now: number) {
      first.update(dt, now);
      second.update(dt, now);
      boxes.update(dt, now);
      tools.update(dt, now);
      reveal.updateGot(dt);
      arrival.update(dt);
      plinth.update(dt, now);
    },
    /** True when the air jump fired this step. */
    fixedPre: () => tools.fixedPre(),
    dispose() {
      first.dispose();
      second.dispose();
      tools.dispose();
    },
  };
}

export function rewardSeat(
  line: import('../../place/layout.ts').LineSpec,
  besideLine: typeof import('./rail-kit.ts').besideLine,
  H: typeof import('../../place/terrain.ts').H,
  railY: typeof import('../../place/layout.ts').railY,
  frameOffset: number,
  stationIndex = 0,
  /** Across the track from the frame: line two's frames have depot racks on their own side. */
  across = false,
) {
  // The same safe-ground choice as Place's handCrate, including its next-frame placement and fallbacks. The last
  // station has no next frame, and its stretch ends out on the pier, so its box stands by its own frame instead
  // (Place's handCrate dropped it in the sea).
  const t1 = line.stations[stationIndex]!,
    next = line.stations[stationIndex + 1] ?? t1;
  const flip = across ? -1 : 1;
  const at = new THREE.Vector3();
  let placed = false;
  const nextAt = besideLine(line.line, next.s - line.dir * 1.5, flip * next.side * frameOffset);
  const nextY = H(nextAt.x, nextAt.z);
  // The last one tries the frame's far side first: the stretch before it already took the near side.
  const sides = next === t1 ? [line.dir * 3.4, -line.dir * 3.4] : [-line.dir * 3.4, line.dir * 3.4];
  for (const along of sides) {
    const q = besideLine(line.line, next.s - line.dir * 1.5 + along, flip * next.side * frameOffset);
    const ground = (x: number, z: number) => Math.abs(H(x, z) - nextY) <= 1;
    if (
      ![0, 3.5].every(
        (r) => ground(q.x + r, q.z) && ground(q.x - r, q.z) && ground(q.x, q.z + r) && ground(q.x, q.z - r),
      )
    )
      continue;
    at.set(q.x, H(q.x, q.z), q.z);
    placed = true;
    break;
  }
  if (!placed) {
    for (const [back, lat] of [
      [7, 3.2],
      [3, 3.2],
      [-3, 3.2],
      [-6, 3.2],
      [7, -3.6],
      [-6, -3.6],
    ]) {
      const s = t1.to - line.dir * back!;
      const q = besideLine(line.line, s, flip * t1.side * lat!);
      if (Math.abs(H(q.x, q.z) - railY(line.line, s)) > 1.4) continue;
      at.set(q.x, H(q.x, q.z), q.z);
      placed = true;
      break;
    }
  }
  if (!placed) {
    const q = besideLine(line.line, t1.to, flip * t1.side * 3.2);
    at.set(q.x, H(q.x, q.z), q.z);
  }
  return at;
}

async function createStationReward(
  adapter: RailwayAdapter,
  owner: OwnedView,
  reveal: ReturnType<typeof createRewardReveal>,
  stationIndex: 0 | 1,
  machineFrom?: (out: THREE.Vector3) => void,
) {
  const reward = stationIndex === 0 ? T1_REWARD : T2_REWARD;
  const stationId = stationIndex === 0 ? 'T1' : 'T2';
  const completion = () => job(adapter.read.world(), stationIndex).completion;
  const [{ merged }, { softGlow }, { pop, knock }, { LINKS, railY }, { H }, { besideLine }, { dustRing }, { OUT }] =
    await Promise.all([
      import('../../render/part-geometry.ts'),
      import('../../place/look.ts'),
      import('../../render/fanfare.ts'),
      import('../../place/layout.ts'),
      import('../../place/land.ts'),
      import('./rail-kit.ts'),
      import('../../place/pieces.ts'),
      import('../../place/spatial-station.ts'),
    ]);
  const root = new THREE.Group();
  owner.root.add(root);
  const material = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.08 });
  const hatGeo = merged(reward.parts);
  const multiGeo = merged(MULTI_AXE_REWARD.parts);
  const crate = new THREE.Mesh(merged(T1_CRATE_PARTS), material);
  crate.castShadow = true;
  const glow = softGlow('#ffe9b0', 0.16, 'up');
  glow.mat.blending = THREE.NormalBlending;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.85, 1.8, 12, 1, true).translate(0, 2.2, 0), glow.mat);
  root.add(crate, beam);
  crate.visible = beam.visible = false;

  const at = rewardSeat(LINKS[0]!, besideLine, H, railY, OUT, stationIndex);
  crate.position.copy(at);
  beam.position.copy(at);
  const targetAt = at.clone().add(new THREE.Vector3(0, 1.3, 0));
  const from = at.clone();
  const boardMaterial = new THREE.MeshStandardNodeMaterial({ color: '#b57f44', roughness: 0.9 });
  const boards = new THREE.InstancedMesh(new THREE.BoxGeometry(0.72, 0.07, 0.22), boardMaterial, 14);
  boards.count = 0;
  boards.frustumCulled = false;
  boards.castShadow = true;
  root.add(boards);
  const flashGlow = softGlow('#fff0c0', 1);
  const flash = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), flashGlow.mat);
  const shaftGlow = softGlow('#ffe08a', 0.8, true);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 2.1, 40, 14, 1, true).translate(0, 20, 0),
    shaftGlow.mat,
  );
  flash.position.copy(at).y += 0.9;
  shaft.position.copy(at);
  flash.visible = shaft.visible = false;
  root.add(flash, shaft);
  const boardPose = new THREE.Object3D();
  const flying: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    a: number;
    va: number;
    t: number;
  }[] = [];
  let profile: ReturnType<typeof createBrowserRailwayProfile> | null = null;
  let error: string | null = null;
  let claimed = false,
    owned = false,
    busy = false,
    disposed = false;
  let claims = 0,
    revealCount = 0,
    revealT = -1,
    flight = 1,
    flare = 0;
  let previous = -1;
  let liveWake = false;
  let multiReveals = 0;
  // The multi-axe card is the waker's alone (docs/brainstorms/coop-abilities.md, option E); a friend's flourish is
  // ability-arrival.ts. The wake itself plays at once from the prediction, but the card waits for the server to
  // accept it: a refused wake settles the machine back asleep and shows no card.
  const offAccepted = adapter.onAccepted((event) => {
    if (stationIndex === 0 && event.op === 'rail.wake' && event.accepted > 0 && event.pid === adapter.read.pid)
      liveWake = true;
  });
  const offCorrected = adapter.onCorrected((c) => {
    if (stationIndex === 0 && c.event.op === 'rail.wake') liveWake = false;
  });
  const world = railwayRoomId(getRoomId());
  function load() {
    if (!profile) return;
    try {
      const value = profile.read();
      claims = value.claims.length;
      owned = value.claims.some((claim) => claim.cosmetic === reward.id && claimCountsIn(claim.world, world));
      claimed = value.claims.some(
        (claim) => claim.world === world && claim.station === stationId && claim.completion === 1,
      );
      error = null;
      // A claim the wardrobe hasn't heard of (an earlier visit, another tab, a reload mid-reveal) is put on, as the
      // reveal's end does. After that, what you wear is the wardrobe's.
      const mine = wardrobe();
      if (owned && revealT < 0 && mine && !mine.isOwned(reward.id)) mine.grant(reward.id, { wear: true });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Personal reward storage unavailable';
    }
  }
  try {
    profile = createBrowserRailwayProfile(adapter.read.pid, [T1_REWARD.id, T2_REWARD.id]);
    load();
  } catch (cause) {
    error = cause instanceof Error ? cause.message : 'Personal reward storage unavailable';
  }
  void claimsPruned.then(() => {
    if (!disposed) load();
  });
  const listeners = new AbortController();
  addEventListener(
    'storage',
    (event) => {
      if (event.key === profile?.key) load();
    },
    { signal: listeners.signal },
  );
  const offReset = adapter.onReset(() => {
    previous = -1;
    liveWake = false;
    flight = 1;
    load();
  });
  const sparks = (n: number, speed: number) => rewardSparkles(at.x, at.y + 0.8, at.z, n, speed);
  function burst() {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2,
        speed = 3 + Math.random() * 3.5;
      flying.push({
        x: at.x,
        y: at.y + 0.5,
        z: at.z,
        vx: Math.cos(a) * speed,
        vy: 4 + Math.random() * 5,
        vz: Math.sin(a) * speed,
        a: Math.random() * 6,
        va: 6 + Math.random() * 9,
        t: 0,
      });
    }
    confettiBurst(at.x, at.y + 0.8, at.z);
    sparks(34, 6);
    rewardDust(at.x, at.y + 0.1, at.z);
    placeSound('boxCommon', at.x, at.z);
    reveal.youGot({
      name: reward.name,
      line: reward.line,
      color: '#fff7e8',
      model: new THREE.Mesh(hatGeo, material),
      from: at.clone().add(new THREE.Vector3(0, 0.9, 0)),
      done: () => {
        revealT = -1;
        wardrobe()?.grant(reward.id, { wear: true }); // worn as it arrives
      },
    });
  }
  async function open() {
    if (busy || claimed || !profile || !adapter.read.ready() || completion() !== 1) return;
    busy = true;
    try {
      const result = await profile.claim({ world, station: stationId, completion: 1 }, reward.id);
      if (disposed) return;
      // The reveal starts first, so the wardrobe gets the claim at the reveal's end, not before the card.
      if (result.status === 'accepted') {
        revealT = 0;
        revealCount++;
      }
      load();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Personal reward storage unavailable';
    } finally {
      busy = false;
    }
  }
  function requestOpen() {
    void open();
  } // open owns both storage and lock failures.
  const api = {
    inspect: () => ({
      claims,
      claimed,
      owned,
      busy,
      error,
      revealCount,
      multiReveals,
      showing: reveal.gettingItem(),
      visible: crate.visible,
      x: at.x,
      y: at.y,
      z: at.z,
    }),
    targets(): Interactable[] {
      if (!crate.visible || flight < 1 || revealT >= 0 || busy || !inReach(at)) return [];
      return [
        {
          id: `railway-${stationId.toLowerCase()}-box`,
          verb: 'Open',
          at: targetAt,
          r: 3.4,
          ...(error ? { blocked: error } : { run: requestOpen }),
        },
      ];
    },
    update(dt: number, now: number) {
      const tickNow = adapter.read.tick();
      const phase = railPhase(adapter.read.world(), tickNow, tickNow);
      // No pending action: the server has answered every one of mine, the wake among them.
      if (
        liveWake &&
        adapter.read.ready() &&
        adapter.read.pending() === 0 &&
        phase !== 'asleep' &&
        phase !== 'waking'
      ) {
        liveWake = false;
        if (
          reveal.youGot({
            key: MULTI_AXE_REWARD.key,
            name: MULTI_AXE_REWARD.name,
            line: MULTI_AXE_REWARD.line,
            model: new THREE.Mesh(multiGeo, material),
          })
        )
          multiReveals++;
      }
      if (adapter.read.ready()) {
        if (previous === 0 && completion() === 1 && !claimed && machineFrom) {
          machineFrom(from);
          flight = 0;
        }
        previous = completion();
      }
      crate.visible = adapter.read.ready() && completion() === 1 && (!claimed || (revealT >= 0 && revealT < 0.12));
      beam.visible = crate.visible && revealT < 0;
      flare = Math.max(0, flare - dt / 1.6);
      glow.strength.value = 0.16 + flare * flare * 0.4;
      if (crate.visible && flight < 1) {
        flight = Math.min(1, flight + dt / 0.7);
        crate.position.lerpVectors(from, at, flight);
        crate.position.y += Math.sin(flight * Math.PI) * 2.4;
        crate.rotation.x = (1 - flight) * 3;
        if (flight === 1) {
          flare = 1;
          thump(at.x, at.z);
          knock(0.5, 0.9);
          dustRing(at.x, at.y + 0.1, at.z, 10, 2.4, 0.4);
          sparks(18, 3.4);
          pop(4, 0.6);
        }
      } else if (crate.visible && revealT < 0) {
        crate.position.copy(at).y += Math.max(0, Math.sin(now * 0.004)) * 0.06;
        crate.rotation.set(0, 0, Math.sin(now * 0.0035) * 0.02);
        if (Math.random() < dt * 3) sparks(1, 1.2);
      }
      if (revealT >= 0) {
        const old = revealT;
        revealT += dt;
        if (revealT < 0.12) {
          const w = Math.sin(revealT * 60) * 0.06 * (0.4 + revealT / 0.12);
          crate.rotation.set(w, 0, -w);
          crate.scale.setScalar(1 + (revealT / 0.12) * 0.14);
        }
        if (old < 0.12 && revealT >= 0.12) burst();
        const u = Math.max(0, revealT - 0.12),
          fb = Math.min(1, u / 0.42),
          fs = Math.min(1, u / 0.8);
        flash.visible = revealT >= 0.12 && fb < 1;
        flash.scale.setScalar(0.6 + fb * 6);
        flashGlow.strength.value = (1 - fb) * 1.1;
        shaft.visible = revealT >= 0.12 && fs < 1;
        shaft.scale.set(1 + fs * 0.3, 1, 1 + fs * 0.3);
        shaftGlow.strength.value = 0.7 * (1 - fs * fs);
      }
      for (let i = 0; i < flying.length; i++) {
        const f = flying[i]!;
        f.t += dt;
        f.vy -= 14 * dt;
        f.x += f.vx * dt;
        f.y += f.vy * dt;
        f.z += f.vz * dt;
        f.a += f.va * dt;
        const floor = H(f.x, f.z) + 0.05;
        if (f.y < floor) {
          f.y = floor;
          f.vy *= -0.3;
          f.vx *= 0.6;
          f.vz *= 0.6;
          f.va *= 0.5;
        }
        boardPose.position.set(f.x, f.y, f.z);
        boardPose.rotation.set(f.a, f.a * 0.6, 0);
        boardPose.updateMatrix();
        boards.setMatrixAt(i, boardPose.matrix);
      }
      if (flying[0] && flying[0].t > 2.4) flying.length = 0;
      boards.count = flying.length;
      if (boards.count) boards.instanceMatrix.needsUpdate = true;
      const p = me.body?.position;
      if (p && crate.visible && flight === 1 && revealT < 0 && !error && Math.hypot(p.x - at.x, p.z - at.z) < 1.25)
        requestOpen();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      offReset();
      offAccepted();
      offCorrected();
      listeners.abort();
      root.removeFromParent();
      for (const geometry of [
        crate.geometry,
        hatGeo,
        multiGeo,
        beam.geometry,
        boards.geometry,
        flash.geometry,
        shaft.geometry,
      ])
        geometry.dispose();
      for (const mat of [material, glow.mat, boardMaterial, flashGlow.mat, shaftGlow.mat]) mat.dispose();
      boards.dispose();
    },
  };
  owner.cleanup(api.dispose);
  return api;
}
