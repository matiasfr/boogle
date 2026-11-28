// The existing Place opening and camera bounds, owned by the T1 scene rather than its mutable prototype run.
import * as THREE from 'three/webgpu';
import { freeLanding } from '../../place/free-landing.ts';
import { HEAD_OFFSET, INTERP_MS, PLAYER_R, SEA } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { hideControls } from '../../player/controls.ts';
import { softWall } from '../player/state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import {
  capsuleOverlaps,
  physicsTime,
  raycastClosest,
  rayHit,
  setCcd,
  teleport,
  sweepSphere,
  type Body,
} from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { aboard, carry } from '../../physics/platforms.ts';
import { inputState } from '../../player/input-state.ts';
import {
  captureReturnSpot,
  createReturnSearch,
  searchLandings,
  haltLandings,
  yawToward,
  type ReturnSpot,
  type ReturnPosition,
} from '../../place/return-spot.ts';
import { routeAreasPending } from '../route-greybox/state.ts';
import type { ReturnHalts } from './return-halts.ts';
import { friendArrivalStep, friendDestination } from '../../place/friend-arrival.ts';
import { passengerSpot } from './arrival-deck.ts';
import { HALL } from '../../place/home-station.ts';
import { isFirstVisit } from '../../player/arrival.ts';
import { puff } from '../../render/fanfare.ts';
import { whistle } from '../../render/machine-sfx.ts';
import { worksLanding } from '../../fall/works-pad.ts';
import { boardToward } from './works-board-state.ts';
import { returnKey, returnSettle, storedReturn, writeReturn } from '../../place/return-settle.ts';
import { localStore } from '../../place/return-tuning.ts';
import { coverLifted } from '../../boot/cover-hold.ts';
import { bootMark } from '../../boot/timeline.ts';
import { camera } from '../../render/scene.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { registerRailwayRecovery } from './state.ts';
import { identity } from '../../player/identity.ts';
import { getRoomId, remotes } from '../../netplay/net.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { createPoseReadiness } from './pose-readiness.ts';
import { roomSeed } from '../../netplay/room-seed.ts';
import { replacedStage } from '../../boot/world-reset.ts';
import { jumpOf, type JumpLand } from '../../world/railway-jump.ts';

type RecoveryPoint = { x: number; y: number; z: number };
export async function createRailwayArrival(
  owner: OwnedView,
  laidPath: () => readonly RecoveryPoint[],
  halts: ReturnHalts,
) {
  const [
    { H: placeH, insidePlace: inPlace, PATH_SAMPLES },
    { SPAWN, toWorld, ORIGIN, VILLAGE },
    { registerPlaceShore },
    ,
    ,
    { SHORE_SAMPLES },
    { feet, outOf },
    { createPosePolicy },
  ] = await Promise.all([
    import('../../place/land.ts'),
    import('../../place/layout.ts'),
    import('../../place/water.ts'),
    import('./railway.css'),
    import('../town/town.css'),
    import('../../place/terrain.ts'),
    import('../../place/sites.ts'),
    import('../../place/pose.ts'),
  ]);
  // Ring Island's ground (src/entities/ring-island/) counts as land for the camera, the saved pose and recovery: a pose
  // on the island is kept and restored; past the gap, Get unstuck puts you on our side (ringUnstuck, call 31).
  const ring = await import('../ring-island/state.ts');
  const island = await ring.islandGround();
  const insidePlace = (x: number, z: number) => inPlace(x, z) || island.onIsland(x, z);
  const H = (x: number, z: number) => (inPlace(x, z) ? placeH(x, z) : island.islandH(x, z));
  owner.cleanup(registerPlaceShore());
  const old = { wall: softWall.at, near: camera.near };
  const wasFresh = document.body.classList.contains('place-fresh');
  document.body.classList.add('place-fresh');
  hideControls(['respawn', 'use', 'toss', 'guest-crouch', 'guest-punch']);
  softWall.at = Infinity;
  camera.near = 0.25;
  camera.updateProjectionMatrix();
  const constraint = (_look: THREE.Vector3, position: THREE.Vector3) => {
    if (insidePlace(position.x, position.z)) position.y = Math.max(position.y, H(position.x, position.z) + 0.5);
    return false;
  };
  camConstraints.push(constraint);
  let placed: Body | null = null;
  const posePolicy = createPosePolicy(
    H,
    insidePlace,
    (p) => feet.some((foot) => outOf(foot, { x: p.x, z: p.z }, PLAYER_R + 0.2)),
    { raycastClosest, rayHit },
  );
  const poseKey = returnKey(railwayRoomId(getRoomId()), identity.pid);
  // Read before first placement, so a pending return is not discarded by the Home-only spawn guard.
  let hadRecord = false;
  const readSavedPose = (): ReturnSpot | null => {
    const stored = storedReturn(localStore(), poseKey, Date.now());
    hadRecord = stored.had;
    return stored.spot;
  };
  let savedPose = readSavedPose();
  let returning: ReturnType<typeof createReturnSearch> | null = null;
  let heldCandidate: ReturnPosition | null = null;
  const ordinaryVisit = isFirstVisit() || !!replacedStage;
  let presenceSince: number | null = null;
  let friend: { x: number; z: number } | null = null;
  let steam: ReturnPosition | null = null;
  if (!savedPose && ordinaryVisit) returnSettle.done();
  owner.cleanup(returnSettle.done);
  // Nobody sees the move (docs/plans/resume-where-you-were.md, step 5). The loading cover waits for the search
  // (src/features/return-cover.ts). If the world is already on screen when a candidate is tried (a slow room: the
  // cover gave up waiting), the screen goes black first: a 250 ms fade when the body has not moved yet, a cut when it
  // is already being held somewhere, and a 250 ms fade back once it stands where it will stay.
  const VEIL_MS = 250;
  const veil = document.createElement('div');
  veil.className = 'railway-return-veil';
  veil.setAttribute('aria-hidden', 'true');
  owner.cleanup(() => veil.remove());
  let veilAt = -1;
  const veiled = (cut: boolean) => {
    if (veilAt < 0) {
      veilAt = performance.now() - (cut ? VEIL_MS : 0);
      veil.classList.toggle('cut', cut);
      document.body.append(veil);
      void veil.offsetWidth; // the style is computed at 0 before the class turns it on, so the fade plays
      veil.classList.add('on');
    }
    return performance.now() - veilAt >= VEIL_MS;
  };
  const unveil = () => {
    if (veilAt < 0) return;
    veilAt = -1;
    veil.classList.remove('on', 'cut');
    setTimeout(() => veil.remove(), VEIL_MS + 50);
  };
  // The body is placed 0.4 m above its surface: the cover and the pose stay held until it has touched down (or
  // 0.6 s on), so the last of the placement is not a small drop on screen.
  let touchdown: { kind: string; at: number } | null = null;
  const settled = (kind: string) => {
    touchdown = null;
    returnSettle.done();
    unveil();
    bootMark('return-settled', { kind });
  };
  const areasSettled = (x: number, z: number) => !routeAreasPending(x, z) && !ring.ringAreaPending(x, z);
  const placeReturn = (p: ReturnPosition, lift = 0.4) => {
    const body = me.body;
    if (!body) return;
    teleport(body, p.x, p.y + PLAYER_R + lift, p.z);
    body.velocity.set(0, 0, 0);
  };
  const scenery = createPoseReadiness(physicsTime);
  let lastWritten = '',
    lastWriteAt = 0;
  let loaded = false,
    restorePending = !!savedPose,
    poseClock = 0;
  const capturePose = () => {
    const body = me.body;
    if (!body || fallArrival.active || !scenery.ready()) return false;
    const pos = { x: body.position.x, y: body.position.y - PLAYER_R, z: body.position.z };
    const standing = me.coyote > 0 && !me.swimming && !me.down && !aboard() && !inputState.seated;
    savedPose = captureReturnSpot(
      savedPose,
      {
        standing,
        pos,
        yaw: me.yaw,
        standable: standing && posePolicy.standableAt(pos.x, pos.y, pos.z),
        halt: halts.next(aboard()?.id), // riding a train: a reload gets off where it was going
      },
      Date.now(),
    );
    return true;
  };
  const savePose = (force = false) => {
    if (!savedPose || fallArrival.active || !scenery.ready()) return;
    const fingerprint = JSON.stringify({ ...savedPose, at: 0 });
    if (!force && fingerprint === lastWritten && savedPose.at - lastWriteAt < 60000) return;
    // Unavailable local storage leaves the next visit at the ordinary spawn.
    if (!writeReturn(poseKey, savedPose)) return;
    lastWritten = fingerprint;
    lastWriteAt = savedPose.at;
  };
  // A jump room's landing (docs/plans/playtest-jump-in.md): with no saved pose here, everyone starts at the segment the
  // room was seeded for, standing on its terrain, pad or deck. undefined until the room's seed is known. A jump room
  // skips the first visit's fall (src/features/fall.ts); a page that showed one anyway (`intro=1`) keeps where it fell.
  let landing: JumpLand | null | undefined;
  let landingDeadline: number | null = null;
  let fell = fallArrival.active;
  // A room just replaced by a stage lands its players the same way (docs/plans/room-fast-forward.md): the reset took
  // their saved pose. A stage with no landing uses the usual spawn.
  void roomSeed().then((seed) => {
    landing = jumpOf(seed?.stage ?? replacedStage)?.land ?? null;
  });
  // Thin shapes count too: ring pads such as the summit deck are tiled in pieces under 1.6 m across. A ray down the
  // spot's centre must meet the surface as well, so a ring spot past a deck's edge (where the sphere's side still
  // touches it) is refused; a ray that starts inside a shape (an overhang over the spot) meets it at once and fails.
  // The ray runs a centimetre off the spot: one straight down a terrain cell's edge can miss the heightfield.
  const surfaceAt = posePolicy.surfaceAt;
  // Presence can arrive before the remote's first drawn avatar. Read the same interpolation window as its view.
  const enteredPoses = () =>
    [...remotes.values()].flatMap((r) => {
      const p = r.entered && r.snaps.sample(performance.now() - INTERP_MS)?.b.p;
      return p ? [{ x: p[0]!, y: p[1]!, z: p[2]! }] : [];
    });
  const taken = (x: number, y: number, z: number) =>
    [...remotes.values()].some((r) => {
      const p = r.entered ? r.avatar?.position : undefined;
      return !!p && Math.hypot(p.x - x, p.z - z) < 1.2 && Math.abs(p.y - y) < 3;
    });
  const landingSpot = (to: RecoveryPoint) => freeLanding(to, (x, z) => !taken(x, to.y, z) && surfaceAt(x, to.y, z));
  const land = (to: JumpLand) => {
    const body = me.body;
    if (!body) return;
    const spot = landingSpot(to);
    if (!spot) {
      console.warn(`[jump-in] no free surface at the landing (${to.x}, ${to.y}, ${to.z}); keeping the spawn`);
      return;
    }
    teleport(body, spot.x, to.y + PLAYER_R + 0.4, spot.z);
    body.velocity.set(0, 0, 0);
    if (to.yaw !== undefined) cam.yaw = me.yaw = to.yaw;
    cam.pitch = -0.14;
  };
  const pagehide = () => {
    if (!loaded || !placed || restorePending) return;
    if (capturePose()) savePose(true);
  };
  const visibility = () => {
    if (document.visibilityState === 'hidden') pagehide();
  };
  window.addEventListener('pagehide', pagehide);
  document.addEventListener('visibilitychange', visibility);
  owner.cleanup(() => window.removeEventListener('pagehide', pagehide));
  owner.cleanup(() => document.removeEventListener('visibilitychange', visibility));
  const atSpawn = () => {
    const body = me.body;
    if (!body) return;
    const pad = worksLanding();
    teleport(body, pad.x, H(pad.x, pad.z) + PLAYER_R + 0.4, pad.z);
    body.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = pad.yaw;
    cam.pitch = -0.14;
  };
  // Preserve Place's nearby-ground search and nearest existing path fallback, with only this view's laid deck.
  const getUnstuck = () => {
    const body = me.body;
    if (!body || !scenery.ready()) return;
    carry.on = null;
    carry.x = carry.y = carry.z = carry.spin = 0;
    // Recovery found this surface explicitly; the coyote timer need not have caught up yet.
    const remember = (x: number, y: number, z: number) => {
      savedPose = captureReturnSpot(
        savedPose,
        { standing: true, standable: posePolicy.standableAt(x, y, z), pos: { x, y, z }, yaw: me.yaw },
        Date.now(),
      );
      savePose(true);
    };
    const home = ring.ringUnstuck(island, body.position.x, body.position.z);
    if (home) {
      const spot = landingSpot(home) ?? home;
      teleport(body, spot.x, home.y + PLAYER_R + 0.4, spot.z);
      body.velocity.set(0, 0, 0);
      if (home.yaw !== undefined) cam.yaw = me.yaw = home.yaw;
      remember(spot.x, home.y, spot.z);
      return;
    }
    for (let radius = 2; radius <= 40; radius += 2) {
      const count = Math.ceil((2 * Math.PI * radius) / 2);
      for (let k = 0; k < count; k++) {
        const angle = (k / count) * Math.PI * 2;
        const x = body.position.x + Math.cos(angle) * radius;
        const z = body.position.z + Math.sin(angle) * radius;
        if (!posePolicy.safe({ x, z, yaw: me.yaw })) continue;
        const h = H(x, z);
        if (
          [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ].some(([dx, dz]) => Math.abs(H(x + dx!, z + dz!) - h) > 0.5)
        )
          continue;
        const from = { x, y: h + 128, z };
        const to = { x, y: h + PLAYER_R + 0.4, z };
        if (
          (['skip', 'only'] as const).some(
            (thin) => sweepSphere(from, to, PLAYER_R, { mask: GROUP.SCENERY, thin }) >= 0,
          )
        )
          continue;
        teleport(body, x, h + PLAYER_R + 0.4, z);
        body.velocity.set(0, 0, 0);
        remember(x, h, z);
        return;
      }
    }
    let best = { x: toWorld(SPAWN.x), y: VILLAGE.y, z: SPAWN.z },
      distance = Infinity;
    const consider = (point: RecoveryPoint) => {
      const d = (point.x - body.position.x) ** 2 + (point.z - body.position.z) ** 2;
      if (d < distance) {
        distance = d;
        best = point;
      }
    };
    for (const path of [...PATH_SAMPLES, SHORE_SAMPLES])
      for (let k = 0; k < path.length; k += 2) {
        const point = path[k]!;
        if (point[2] > 1.6) consider({ x: point[0] + ORIGIN.x, y: point[2], z: point[1] });
      }
    for (const point of laidPath()) consider(point);
    const y = Math.max(H(best.x, best.z), best.y + 0.12);
    teleport(body, best.x, y + PLAYER_R + 0.4, best.z);
    body.velocity.set(0, 0, 0);
    remember(best.x, y, best.z);
  };
  owner.cleanup(registerRailwayRecovery(getUnstuck));
  owner.cleanup(() => {
    if (placed) setCcd(placed, true);
    const k = camConstraints.indexOf(constraint);
    if (k >= 0) camConstraints.splice(k, 1);
    softWall.at = old.wall;
    camera.near = old.near;
    camera.updateProjectionMatrix();
    if (!wasFresh) document.body.classList.remove('place-fresh');
  });
  return {
    sceneryRebuilt: scenery.rebuilt,
    update(dt: number, ready: boolean, tick: number) {
      const body = me.body;
      if (body && body !== placed) {
        placed = body;
        setCcd(body, false);
        if (!fallArrival.active && !savedPose && !insidePlace(body.position.x, body.position.z)) atSpawn();
        restorePending = true;
      }
      if (body && !restorePending && insidePlace(body.position.x, body.position.z)) {
        const h = H(body.position.x, body.position.z);
        if (body.position.y < h - 0.8) {
          teleport(body, body.position.x, h + PLAYER_R + 0.3, body.position.z);
          body.velocity.set(0, 0, 0);
        }
      }
      // Accepted state and a completed Rapier step are both required. snapshot() can rebuild
      // colliders in this same update, before the broad phase knows a partner's new track exists.
      const poseReady = ready && tick > 0 && scenery.ready();
      fell ||= fallArrival.active;
      if (!loaded && ready && tick > 0 && body) {
        loaded = true;
        savedPose = readSavedPose();
        presenceSince = performance.now();
        restorePending = true;
      }
      if (presenceSince !== null) {
        const poses = enteredPoses();
        const step = friendArrivalStep(
          ordinaryVisit || fell || !returnSettle.pending(),
          !!savedPose && !fell,
          ready && halts.running(),
          poses.length,
          performance.now() - presenceSince,
        );
        if (step === 'wait') return;
        presenceSince = null;
        if (step === 'resume') {
          returning = createReturnSearch(savedPose, haltLandings(), (halt) => halts.stands(halt.line!, halt.stop!));
        } else if (step === 'choose') {
          const { standing, works } = halts.friends();
          const destination = friendDestination(poses, standing, { x: toWorld(HALL.x), z: HALL.z }, works);
          if (destination && returnSettle.claimPlacement()) {
            friend = destination.friend;
            returning = searchLandings(destination.platforms);
          }
        }
        if (!returning) returnSettle.done();
      }
      if (steam && coverLifted() && !touchdown) {
        puff(steam.x, steam.y + 0.7, steam.z, 7, 0.6, new THREE.Color(0xdee5e4));
        const yaw = me.yaw + Math.PI / 2;
        whistle(steam.x + 26 * Math.sin(yaw), steam.z + 26 * Math.cos(yaw));
        steam = null;
      }
      if (returning && body && !fallArrival.active) {
        if (coverLifted() && !veiled(heldCandidate !== null)) return; // on screen: black before the body moves
        const candidate = returning.current();
        if (candidate) {
          if (heldCandidate !== candidate) {
            heldCandidate = candidate;
            scenery.rebuilt();
          }
          // Request distant scenery from above the platform. An occupied arrival point never pushes its rider.
          placeReturn(candidate, friend ? 12 : 0.4);
        }
        const haltOpen =
          !friend || (!!candidate && ready && halts.running() && halts.stands(candidate.line!, candidate.stop!));
        const visitors = friend ? enteredPoses() : null;
        const available = (x: number, y: number, z: number) =>
          !taken(x, y, z) &&
          (!visitors ||
            (y > SEA &&
              !visitors.some((p) => Math.hypot(p.x - x, p.z - z) < 1.2 && Math.abs(p.y - y) < 3) &&
              !capsuleOverlaps({ x, y: y + PLAYER_R + 0.02, z }, PLAYER_R, HEAD_OFFSET, { of: body })));
        const result = returning.step(performance.now() / 1000, {
          settled: (p) => ready && tick > 0 && scenery.ready() && areasSettled(p.x, p.z),
          deck: friend && haltOpen ? (p) => passengerSpot(halts, p, available) : undefined,
          standable: (p) => haltOpen && available(p.x, p.y, p.z) && posePolicy.standableAt(p.x, p.y, p.z),
          near: (p, radii) => (haltOpen ? posePolicy.standableNear(p.x, p.y, p.z, radii, available) : null),
        });
        if (result.kind !== 'hold') {
          if (result.kind === 'land') {
            placeReturn(result.at, friend ? 0.02 : 0.4);
            // Your own spot keeps the way you faced; a fallback halt faces its track, the boarding edge.
            let track = result.from.track;
            if (friend) track = result.deck ? friend : (track ?? friend);
            else if (result.from.line !== undefined && result.from.stop !== undefined)
              track = boardToward(result.from.line, result.from.stop, result.at) ?? track;
            cam.yaw = me.yaw =
              track && Math.hypot(result.at.x - track.x, result.at.z - track.z) > 0.5
                ? yawToward(result.at, track)
                : (savedPose?.yaw ?? me.yaw);
            if (friend && !result.deck && !halts.passengerDecks(result.from.line!, result.from.stop!).length)
              steam = { ...result.at, ...result.from.track };
            cam.pitch = -0.14;
          } else atSpawn();
          touchdown = { kind: result.kind, at: performance.now() };
          returning = null;
          restorePending = false;
          landing = null;
        }
        return; // Never capture the held body, or query a second candidate in the same frame.
      }
      // Not before 150 ms: the coyote timer from wherever the body stood before the move has run out by then.
      const placedFor = touchdown ? performance.now() - touchdown.at : 0;
      if (touchdown && ((placedFor > 150 && me.coyote > 0) || placedFor > 600)) settled(touchdown.kind);
      // An empty pose waits for the room's seed (one fetch, at most ten seconds) before it settles for the spawn.
      if (
        loaded &&
        restorePending &&
        (poseReady || landingDeadline !== null) &&
        body &&
        !fallArrival.active &&
        (savedPose || landing !== undefined)
      ) {
        if (!fell) {
          let canLand = !hadRecord && !!landing;
          if (canLand && landing && (!areasSettled(landing.x, landing.z) || !poseReady)) {
            // Like a saved return, the held body requests the destination's distance-mounted scenery.
            landingDeadline ??= performance.now() + 20_000;
            if (performance.now() < landingDeadline) {
              if (!coverLifted() || veiled(false)) placeReturn(landing);
              return;
            }
            console.warn(`[jump-in] landing scenery was not ready at (${landing.x}, ${landing.z}); keeping the spawn`);
            canLand = false;
          }
          atSpawn();
          if (canLand && landing) land(landing);
          if (landingDeadline !== null) unveil();
        }
        landingDeadline = null;
        landing = null; // once
        restorePending = false;
        returnSettle.done();
      }
      if (loaded && poseReady && !restorePending) {
        poseClock += dt;
        if (poseClock >= 5) {
          poseClock = 0;
          if (capturePose()) savePose();
        }
      }
    },
  };
}
