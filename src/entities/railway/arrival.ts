// The existing Place opening and camera bounds, owned by the T1 scene rather than its mutable prototype run.
import type * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { hideControls } from '../../player/controls.ts';
import { softWall } from '../player/state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { physicsTime, raycastClosest, rayHit, setCcd, teleport, sweepSphere, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { aboard, carry } from '../../physics/platforms.ts';
import { inputState } from '../../player/input-state.ts';
import {
  captureReturnSpot,
  createReturnSearch,
  haltLandings,
  type ReturnSpot,
  type ReturnPosition,
} from '../../place/return-spot.ts';
import { routeAreasPending } from '../route-greybox/state.ts';
import { returnKey, returnSettle, storedReturn } from '../../place/return-settle.ts';
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
export async function createRailwayArrival(owner: OwnedView, laidPath: () => readonly RecoveryPoint[]) {
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
    const stored = storedReturn(localStorage, poseKey, Date.now());
    hadRecord = stored.had;
    return stored.spot;
  };
  let savedPose = readSavedPose();
  let returning: ReturnType<typeof createReturnSearch> | null = null;
  let heldCandidate: ReturnPosition | null = null;
  if (!savedPose) returnSettle.done();
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
  const settled = (kind: string) => {
    returnSettle.done();
    unveil();
    bootMark('return-settled', { kind });
  };
  const areasSettled = (x: number, z: number) => !routeAreasPending(x, z) && !ring.ringAreaPending(x, z);
  const placeReturn = (p: ReturnPosition) => {
    const body = me.body;
    if (!body) return;
    teleport(body, p.x, p.y + PLAYER_R + 0.4, p.z);
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
      { standing, pos, yaw: me.yaw, standable: standing && posePolicy.standableAt(pos.x, pos.y, pos.z) },
      Date.now(),
    );
    return true;
  };
  const savePose = (force = false) => {
    if (!savedPose || fallArrival.active || !scenery.ready()) return;
    const fingerprint = JSON.stringify({ ...savedPose, at: 0 });
    if (!force && fingerprint === lastWritten && savedPose.at - lastWriteAt < 60000) return;
    try {
      localStorage.setItem(poseKey, JSON.stringify(savedPose));
      lastWritten = fingerprint;
      lastWriteAt = savedPose.at;
    } catch {
      // Unavailable local storage leaves the next visit at the ordinary spawn.
    }
  };
  // A jump room's landing (docs/plans/playtest-jump-in.md): with no saved pose here, everyone starts at the segment the
  // room was seeded for, standing on its terrain, pad or deck. undefined until the room's seed is known. A jump room
  // skips the first visit's fall (src/features/fall.ts); a page that showed one anyway (`intro=1`) keeps where it fell.
  let landing: JumpLand | null | undefined;
  let fell = fallArrival.active;
  // A room just replaced by a stage lands its players the same way (docs/plans/room-fast-forward.md): the reset took
  // their saved pose. A stage with no landing uses the usual spawn.
  void roomSeed().then((seed) => {
    landing = jumpOf(seed?.stage ?? replacedStage)?.land ?? null;
  });
  // The surface must be where the catalog says (a sphere swept down meets it within 0.5 m), else the usual spawn. A
  // friend already standing there moves you to a spot on a 1.4 m ring around it, so nobody lands on someone's head.
  const RING = [0, 1, 2, 3, 4, 5].map((k) => ({
    x: 1.4 * Math.sin((k * Math.PI) / 3),
    z: 1.4 * Math.cos((k * Math.PI) / 3),
  }));
  // Thin shapes count too: ring pads such as the summit deck are tiled in pieces under 1.6 m across. A ray down the
  // spot's centre must meet the surface as well, so a ring spot past a deck's edge (where the sphere's side still
  // touches it) is refused; a ray that starts inside a shape (an overhang over the spot) meets it at once and fails.
  // The ray runs a centimetre off the spot: one straight down a terrain cell's edge can miss the heightfield.
  const surfaceAt = posePolicy.surfaceAt;
  const taken = (x: number, y: number, z: number) =>
    [...remotes.values()].some((r) => {
      const p = r.entered ? r.avatar?.position : undefined;
      return !!p && Math.hypot(p.x - x, p.z - z) < 1.2 && Math.abs(p.y - y) < 3;
    });
  const land = (to: JumpLand) => {
    const body = me.body;
    if (!body) return;
    const spot = [{ x: 0, z: 0 }, ...RING]
      .map((d) => ({ x: to.x + d.x, z: to.z + d.z }))
      .find((p) => !taken(p.x, to.y, p.z) && surfaceAt(p.x, to.y, p.z));
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
    teleport(body, toWorld(SPAWN.x), H(toWorld(SPAWN.x), SPAWN.z) + PLAYER_R + 0.4, SPAWN.z);
    body.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = SPAWN.yaw;
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
      teleport(body, home.x, home.y + PLAYER_R + 0.4, home.z);
      body.velocity.set(0, 0, 0);
      if (home.yaw !== undefined) cam.yaw = me.yaw = home.yaw;
      remember(home.x, home.y, home.z);
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
        if (savedPose && !fell) returning = createReturnSearch(savedPose, haltLandings());
        else returnSettle.done();
        restorePending = true;
      }
      if (returning && body && !fallArrival.active) {
        if (coverLifted() && !veiled(heldCandidate !== null)) return; // on screen: black before the body moves
        const candidate = returning.current();
        if (candidate) {
          if (heldCandidate !== candidate) {
            heldCandidate = candidate;
            scenery.rebuilt();
          }
          placeReturn(candidate);
        }
        const result = returning.step(performance.now() / 1000, {
          settled: (p) => ready && tick > 0 && scenery.ready() && areasSettled(p.x, p.z),
          standable: (p) => !taken(p.x, p.y, p.z) && posePolicy.standableAt(p.x, p.y, p.z),
          near: (p, radii) => posePolicy.standableNear(p.x, p.y, p.z, radii, (x, y, z) => !taken(x, y, z)),
        });
        if (result.kind !== 'hold') {
          if (result.kind === 'land') {
            placeReturn(result.at);
            cam.yaw = me.yaw = savedPose!.yaw;
            cam.pitch = -0.14;
          } else atSpawn();
          settled(result.kind);
          returning = null;
          restorePending = false;
          landing = null;
        }
        return; // Never capture the held body, or query a second candidate in the same frame.
      }
      // An empty pose waits for the room's seed (one fetch, at most ten seconds) before it settles for the spawn.
      if (
        loaded &&
        restorePending &&
        poseReady &&
        body &&
        !fallArrival.active &&
        (savedPose || landing !== undefined)
      ) {
        if (!fell) {
          atSpawn();
          if (!hadRecord && landing) land(landing);
        }
        landing = null; // once
        restorePending = false;
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
