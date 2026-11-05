// Focused art fixture, not a progression proof. Broker: --query 'proto=place&machineView=rear|ride|lay'.
// Two occupied seats and actual Interact/Jump from the staged rear step: --players 2 --real
// --query 'proto=place&coop=1&machineView=pair|forward|side&machineBeat=seated|exit'.
// For motion add --action dev/look/evals/track-layer-action.ts --curves --video --warm 0.
import type * as THREE from 'three/webgpu';
const q = new URLSearchParams(location.search);
const view = q.get('machineView') ?? 'rear';
const pair = q.get('coop') === '1';
const who = q.get('player') ?? '1';
const { machine } = (await import(
  '/src/proto/place/lines.ts' as string
)) as typeof import('../../../src/proto/place/lines.ts');
const { wakeNow, run } = (await import(
  '/src/proto/place/run.ts' as string
)) as typeof import('../../../src/proto/place/run.ts');
const { me } = (await import('/src/player/player.ts' as string)) as typeof import('../../../src/player/player.ts');
const { teleport, onPreStep } = (await import(
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
const { net, remotes } = await import('/src/netplay/net.ts' as string);
const hands = await import('/src/player/hands.ts' as string);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (fn: () => boolean, label: string) => {
  const end = performance.now() + 20000;
  while (!fn()) {
    if (performance.now() > end) throw new Error('MACHINE ' + label);
    await wait(50);
  }
};
await until(
  () => !!me.body && !!machine.loco.rock.getObjectByName('power_paint') && (!pair || remotes.size > 0),
  'model/body/partner not ready',
);
const marks = new Set<string>();
const acknowledged = new Set<string>();
const entered = new Set<string>();
if (pair)
  net.room.onMessage((m: { t: string; beat?: string; ack?: boolean }) => {
    if (m.t !== 'machineSeatProbe' || !m.beat) return;
    if (m.ack) acknowledged.add(m.beat);
    else {
      marks.add(m.beat);
      if (entered.has(m.beat)) net.room.send({ t: 'machineSeatProbe', beat: m.beat, ack: true });
    }
  });
const barrier = async (beat: string) => {
  if (!pair) return;
  entered.add(beat);
  if (marks.has(beat)) net.room.send({ t: 'machineSeatProbe', beat, ack: true });
  const timer = setInterval(() => net.room.send({ t: 'machineSeatProbe', beat }), 150);
  try {
    await until(() => marks.has(beat) && acknowledged.has(beat), beat);
  } finally {
    clearInterval(timer);
  }
};
await barrier('arrived');
if (pair) {
  await wait(1500); // Let the initial authority snapshot arrive before the staged wake.
  const place = window.__place as {
    coop: { debug(): { amAuthority: boolean }; skip(name: string, fn: () => void): void };
  };
  if (place.coop.debug().amAuthority) place.coop.skip('wake', wakeNow);
  await until(() => run.mode !== 'asleep' && run.mode !== 'waking', 'shared wake');
} else wakeNow();
await wait(400);
const car = machine.flatbed;
if (car.mesh.getObjectByName('track-layer-chairs')?.parent !== car.mesh)
  throw new Error('Chair shells must retain the body frame, without deck pitch or shudder');
const pose = { x: 0, y: 0, z: 0, yaw: 0 };
const put = (x: number, z: number) => {
  fromPlatform(car.platform, { x, y: car.hy + 0.48, z, yaw: Math.PI }, false, pose);
  teleport(me.body!, pose.x, pose.y, pose.z);
  me.body!.velocity.set(0, 0, 0);
};
const camera = () => {
  if (view === 'normal') return; // Retain the actual gameplay camera and its 62-degree lens.
  const rear = view !== 'lay';
  const eyeLocal =
    view === 'wheels'
      ? { x: 2.3, y: -0.12, z: -4.1 }
      : view === 'pair'
        ? { x: 4.5, y: 3.1, z: -2.9 }
        : view === 'forward'
          ? { x: 0, y: 3.5, z: -4.3 }
          : view === 'side'
            ? { x: 8, y: 4.3, z: -2.8 }
            : { x: 8, y: rear ? 4.8 : 4.5, z: rear ? -7 : 5.5 };
  fromPlatform(car.platform, { ...eyeLocal, yaw: 0 }, true, pose);
  const eye: [number, number, number] = [pose.x, pose.y, pose.z];
  fromPlatform(
    car.platform,
    {
      x: view === 'wheels' ? 0.5 : 0,
      y: view === 'wheels' ? -0.385 : 1.1,
      z: view === 'wheels' ? -3.7 : view === 'forward' ? 1.2 : view === 'pair' ? -0.6 : -1.3,
      yaw: 0,
    },
    true,
    pose,
  );
  window.__debugCam!.set(eye, [pose.x, pose.y, pose.z], 48);
};
camera();
const timer = setInterval(camera, 30);
setTimeout(() => clearInterval(timer), 120000);
put(who === '2' ? 0.55 : -0.55, -1.85);
await until(() => carry.on === car.platform, 'rear step did not support rider');
if (pair) {
  const i = who === '2' ? 1 : 0;
  const x = i === 0 ? -0.55 : 0.55;
  const press = () => {
    hands.interactDown();
    hands.interactUp();
  };
  const board = async () => {
    await until(() => hands.interactTarget()?.id === 'place-sit', 'Sit offered from rear step');
    press();
    await until(() => seatState().sitting === `machine-deck-${i}`, 'own chair granted');
    await wait(400);
    toPlatform(car.platform, me.body!.position, me.yaw, pose);
    if (Math.abs(pose.x - x) > 0.15 || Math.abs(pose.z + 0.9) > 0.15 || Math.cos(pose.yaw) > -0.99)
      throw new Error('Forward seat anchor/facing drift');
    console.log(`MACHINE ${who} FORWARD SEATED ` + JSON.stringify({ local: { ...pose }, state: seatState() }));
  };
  await board();
  await barrier('both occupied');
  await until(() => Object.keys(seatState().grants).length === 2, 'two seat grants');
  await barrier('both observed grants');
  if (i === 0) {
    await until(() => hands.interactTarget()?.id === 'place-stand', 'Stand up offered');
    press();
  } else {
    // Deliver the normal Jump request just before the seat step: a loaded frame can consume
    // the 150 ms queue in updateIntent before physics. This is an exit-contract check, not latency evidence.
    let pending = true;
    onPreStep(
      () => {
        if (!pending) return;
        pending = false;
        pressJump();
      },
      { order: 20.5 },
    );
  }
  await until(() => !seatState().sitting, 'exit released');
  releaseJump();
  await wait(400);
  toPlatform(car.platform, me.body!.position, me.yaw, pose);
  if (Math.abs(pose.x - x) > 0.2 || Math.abs(pose.z + 1.85) > 0.2 || carry.on !== car.platform)
    throw new Error('Machine exit missed the rear step');
  console.log(`MACHINE ${who} REAR STEP ${i === 0 ? 'INTERACT' : 'JUMP'} EXIT ` + JSON.stringify({ ...pose }));
  await barrier('both exited');
  await until(() => Object.keys(seatState().grants).length === 0, 'old grants released');
  await barrier('both observed release');
  if (q.get('machineBeat') !== 'exit') {
    await board();
    await barrier('both reboarded');
    await until(() => Object.keys(seatState().grants).length === 2, 'both capture grants');
    await wait(1000); // Settled local and remote seated poses before the still.
  }
} else if (view === 'normal') {
  sitDown();
  await until(() => !!seatState().sitting, 'normal-camera rider');
} else if (view === 'ride') {
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
