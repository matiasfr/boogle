// The existing Place opening and camera bounds, owned by the T1 scene rather than its mutable prototype run.
import type * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { hideControls } from '../../player/controls.ts';
import { softWall } from '../player/state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { physicsTime, raycastClosest, rayHit, setCcd, teleport, sweepSphere, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { carry } from '../../physics/platforms.ts';
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
  const posePolicy = createPosePolicy(H, insidePlace, (p) =>
    feet.some((foot) => outOf(foot, { x: p.x, z: p.z }, PLAYER_R + 0.2)),
  );
  const poseKey = `boogle.railway-pose.v0:${railwayRoomId(getRoomId())}:${identity.pid}`;
  let savedPose: ReturnType<typeof posePolicy.read> = null;
  const scenery = createPoseReadiness(physicsTime);
  let loaded = false,
    restorePending = false,
    poseClock = 0;
  const capturePose = () => {
    const body = me.body;
    if (!body || fallArrival.active || !scenery.ready()) return;
    const p = { x: body.position.x, z: body.position.z, yaw: me.yaw };
    savedPose = !carry.on && !me.swimming && posePolicy.safe(p) ? p : null;
  };
  const savePose = () => {
    try {
      localStorage.setItem(poseKey, JSON.stringify(savedPose && { ...savedPose, ground: H(savedPose.x, savedPose.z) }));
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
  const hit = rayHit();
  const surfaceAt = (x: number, y: number, z: number) => {
    const from = { x, y: y + 3, z };
    const hits = (['skip', 'only'] as const)
      .map((thin) => sweepSphere(from, { x, y: y - 1, z }, PLAYER_R, { mask: GROUP.SCENERY, thin }))
      .filter((h) => h >= 0);
    if (!hits.length || Math.abs(from.y - Math.min(...hits) - PLAYER_R - y) > 0.5) return false;
    const ray = raycastClosest(
      { x: x + 0.01, y: y + 3, z: z + 0.01 },
      { x: x + 0.01, y: y - 1, z: z + 0.01 },
      { mask: GROUP.SCENERY },
      hit,
    );
    return ray && hit.distance > 0 && Math.abs(hit.hitPointWorld.y - y) <= 0.5;
  };
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
  const restorePose = () => {
    const body = me.body;
    if (!body || fallArrival.active || !scenery.ready() || !savedPose || !posePolicy.safe(savedPose)) return;
    teleport(body, savedPose.x, H(savedPose.x, savedPose.z) + PLAYER_R + 0.4, savedPose.z);
    body.velocity.set(0, 0, 0);
    cam.yaw = me.yaw = savedPose.yaw;
  };
  const pagehide = () => {
    if (!loaded || !placed) return;
    capturePose();
    savePose();
  };
  window.addEventListener('pagehide', pagehide);
  owner.cleanup(() => window.removeEventListener('pagehide', pagehide));
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
    const home = ring.ringUnstuck(island, body.position.x, body.position.z);
    if (home) {
      teleport(body, home.x, home.y + PLAYER_R + 0.4, home.z);
      body.velocity.set(0, 0, 0);
      if (home.yaw !== undefined) cam.yaw = me.yaw = home.yaw;
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
        savedPose = { x, z, yaw: me.yaw };
        restorePose();
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
    teleport(body, best.x, Math.max(H(best.x, best.z), best.y + 0.12) + PLAYER_R + 0.4, best.z);
    body.velocity.set(0, 0, 0);
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
        if (!fallArrival.active && !insidePlace(body.position.x, body.position.z)) atSpawn();
        restorePending = true;
      }
      if (body && insidePlace(body.position.x, body.position.z)) {
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
      if (!loaded && poseReady) {
        loaded = true;
        try {
          savedPose = posePolicy.read(JSON.parse(localStorage.getItem(poseKey) ?? 'null'));
        } catch {
          savedPose = null;
        }
        restorePending = true;
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
        if (savedPose) restorePose();
        else if (landing && !fell) land(landing);
        landing = null; // once
        restorePending = false;
      }
      if (loaded && poseReady && !restorePending) {
        poseClock += dt;
        if (poseClock >= 5) {
          poseClock = 0;
          const before = JSON.stringify(savedPose);
          capturePose();
          if (JSON.stringify(savedPose) !== before) savePose();
        }
      }
    },
  };
}
