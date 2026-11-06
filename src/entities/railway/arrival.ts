// The existing Place opening and camera bounds, owned by the T1 scene rather than its mutable prototype run.
import type * as THREE from 'three/webgpu';
import { PLAYER_R } from '../../constants.ts';
import { me, cam, camConstraints } from '../../player/player.ts';
import { hideControls } from '../../player/controls.ts';
import { haulHooks } from '../../player/haul-variant.ts';
import { softWall } from '../player/state.ts';
import { fallArrival } from '../../fall/arrival.ts';
import { physicsTime, setCcd, teleport, sweepSphere, type Body } from '../../physics/engine.ts';
import { GROUP } from '../../physics/physics.ts';
import { carry } from '../../physics/platforms.ts';
import { camera, scene } from '../../render/scene.ts';
import { atmosphere } from '../../render/sky.ts';
import type { OwnedView } from '../../render/owned-view.ts';
import { registerRailwayRecovery } from './state.ts';
import { identity } from '../../player/identity.ts';
import { getRoomId } from '../../netplay/net.ts';
import { railwayRoomId } from '../../world/railway-namespace.ts';
import { createPoseReadiness } from './pose-readiness.ts';

type RecoveryPoint = { x: number; y: number; z: number };
export async function createRailwayArrival(owner: OwnedView, laidPath: () => readonly RecoveryPoint[]) {
  const [
    { H, insidePlace, PATH_SAMPLES },
    { SPAWN, toWorld, ORIGIN, VILLAGE },
    { registerPlaceShore },
    { CROSSING },
    ,
    { SHORE_SAMPLES },
    { feet, outOf },
    { createPosePolicy },
  ] = await Promise.all([
    import('../../proto/place/land.ts'),
    import('../../proto/place/layout.ts'),
    import('../../proto/place/water.ts'),
    import('../../proto/crossing/tuning.ts'),
    import('../../proto/place/place.css'),
    import('../../proto/place/terrain.ts'),
    import('../../proto/place/sites.ts'),
    import('../../proto/place/pose.ts'),
  ]);
  owner.cleanup(registerPlaceShore());
  const old = { wall: softWall.at, near: camera.near, far: camera.far, moved: haulHooks.moved };
  const wasFresh = document.body.classList.contains('place-fresh');
  document.body.classList.add('place-fresh');
  hideControls(['respawn', 'use', 'toss', 'guest-crouch', 'guest-punch']);
  haulHooks.moved = () => true;
  softWall.at = Infinity;
  camera.near = 0.25;
  camera.far = CROSSING.fogFar * 1.3;
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
    haulHooks.moved = old.moved;
    camera.near = old.near;
    camera.far = old.far;
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
      if (!loaded && poseReady) {
        loaded = true;
        try {
          savedPose = posePolicy.read(JSON.parse(localStorage.getItem(poseKey) ?? 'null'));
        } catch {
          savedPose = null;
        }
        restorePending = true;
      }
      if (loaded && restorePending && poseReady && body && !fallArrival.active) {
        restorePose();
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
      if (atmosphere.underground <= 0 && scene.fog) {
        const fog = scene.fog as THREE.Fog;
        fog.near = 170;
        fog.far = 1500;
      }
    },
  };
}
