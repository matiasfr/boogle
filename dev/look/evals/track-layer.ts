// Focused art fixture, not a progression proof. Broker: --query 'proto=place&machineView=rear|ride|lay'.
// For motion add --action dev/look/evals/track-layer-action.ts --curves --video --warm 0.
import type * as THREE from 'three/webgpu';
const q = new URLSearchParams(location.search);
const view = q.get('machineView') ?? 'rear';
const { machine } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { wakeNow, run } = (await import(
  '/src/proto/place/run.ts' as string
)) as typeof import('../../../src/proto/place/run.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport } = (await import(
  '/src/physics/engine.ts' as string
)) as typeof import('../../../src/physics/engine.ts');
const { carry, fromPlatform, toPlatform } = (await import(
  '/src/physics/platforms.ts' as string
)) as typeof import('../../../src/physics/platforms.ts');
const { sitDown, standUp, seatState } = (await import(
  '/src/proto/place/seat.ts' as string
)) as typeof import('../../../src/proto/place/seat.ts');
const { renderer } = (await import('/src/render/scene.ts' as string)) as typeof import('../../../src/render/scene.ts');
const { pressJump, releaseJump } = (await import(
  '/src/entities/player/state.ts' as string
)) as typeof import('../../../src/entities/player/state.ts');
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => boolean, label: string) => {
  const end = performance.now() + 20000;
  while (!fn()) {
    if (performance.now() > end) throw new Error('MACHINE ' + label);
    await wait(50);
  }
};
await until(() => !!me.body && !!machine.loco.rock.getObjectByName('power_paint'), 'model/body not ready');
wakeNow();
await wait(400);
const car = machine.flatbed;
const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const put = (x: number, z: number) => {
  fromPlatform(car.platform, { x, y: car.hy + 0.48, z, yaw: Math.PI }, false, pose);
  teleport(me.body!, pose.x, pose.y, pose.z);
  me.body!.velocity.set(0, 0, 0);
};
const camera = () => {
  const rear = view !== 'lay';
  fromPlatform(car.platform, { x: rear ? 6 : 7, y: rear ? 4.2 : 5.5, z: rear ? -7 : 6, yaw: 0 }, true, pose);
  const eye: [number, number, number] = [pose.x, pose.y, pose.z];
  fromPlatform(car.platform, { x: 0, y: 0.9, z: -0.7, yaw: 0 }, true, pose);
  window.__debugCam!.set(eye, [pose.x, pose.y, pose.z], 48);
};
camera();
const timer = setInterval(camera, 30);
setTimeout(() => clearInterval(timer), 120000);
put(-0.55, -1.85);
await until(() => carry.on === car.platform, 'rear step did not support rider');
if (view === 'ride') {
  for (const [i, x] of [-0.55, 0.55].entries()) {
    put(x, -1.85);
    await until(() => carry.on === car.platform, 'deck before sitting');
    sitDown();
    await until(() => seatState().sitting === `machine-deck-${i}`, `seat ${i} not granted`);
    await wait(300);
    toPlatform(car.platform, me.body!.position, me.yaw, pose);
    if (Math.abs(pose.x - x) > 0.15 || Math.abs(pose.z + 0.9) > 0.15) throw new Error('Machine anchor drift');
    console.log('MACHINE SEATED ' + JSON.stringify({ i, local: { ...pose }, state: seatState() }));
    if (i === 0) standUp();
    else {
      pressJump();
      await wait(80);
      releaseJump();
    }
    await until(() => !seatState().sitting, 'exit did not release');
    await wait(300);
    toPlatform(car.platform, me.body!.position, me.yaw, pose);
    if (Math.abs(pose.x - x) > 0.2 || Math.abs(pose.z + 1.85) > 0.2 || carry.on !== car.platform)
      throw new Error('Machine exit missed the rear step');
    console.log('MACHINE EXIT ' + JSON.stringify({ i, local: { ...pose } }));
  }
  sitDown();
  await until(() => !!seatState().sitting, 'recapture seat');
}
machine.setCradle(40); // Maximum-cargo clearance still; action restores the real bill through skipDelivery.
machine.setRack(12);
await wait(300);
let meshes = 0,
  triangles = 0,
  shadowMeshes = 0;
for (const root of [car.mesh, machine.loco.mesh])
  root.traverseVisible((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const n = (m as THREE.InstancedMesh).isInstancedMesh ? (m as THREE.InstancedMesh).count : 1;
    if (!n) return;
    meshes += Array.isArray(m.material) ? m.geometry.groups.length : 1;
    shadowMeshes += Number(m.castShadow);
    triangles += ((m.geometry.index?.count ?? m.geometry.getAttribute('position').count) / 3) * n;
  });
console.log(
  'MACHINE COUNTS ' +
    JSON.stringify({
      meshes,
      shadowMeshes,
      triangles,
      render: renderer.info.render,
      scope: 'machine hierarchy draw upper bound, full 40 logs/12 rails; scene counts are this camera, no timing claim',
    }),
);
console.log('MACHINE READY ' + JSON.stringify({ view, mode: run.mode, seat: seatState() }));
export {};
