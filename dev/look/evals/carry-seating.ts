// driven by: npm run session -- start --rail-seed works-open --eval dev/look/evals/carry-seating.ts --size 1200x750
// Then: session eval 'window.__seatCam("back")' (or "side", "three"), session step 1, session still <name>.
// `--query seatLogs=2` keeps only two logs (a thin bundle under the heap). When ready it logs `SEATING heap top ...`:
// the heap's top against Buddy's head top, in metres above his feet (window.__seatMeasure() measures again).
// The three loads on one back at once (docs/plans/separate-capacities.md, step 4): real accepted chops at Home, strikes
// in the Works bowl and a forge-rack take fill 16 logs (the pack), 16 stone (the breaker) and 8 rails. Teleports only
// isolate the seating question, not route reachability. window.__seatReady is set once the back is full.
import type * as Three from 'three/webgpu';
const { me } = await import('/src/player/player.ts' as string);
const { teleport } = await import('/src/physics/engine.ts' as string);
const { railwayCommands, inspectRailway } = await import('/src/entities/railway/state.ts' as string);
const { account, forge } = await import('/src/sim/railway-rows.ts' as string);
const { capacityOf } = await import('/src/sim/railway-queries.ts' as string);
const { WORKS_ROCKS } = await import('/src/sim/railway-works-layout.ts' as string);
const { LINE2_FORGE } = await import('/src/sim/railway-line2-layout.ts' as string);
const { H } = await import('/src/place/terrain.ts' as string);
const { headwearTop } = await import('/src/render/head-clearance.ts' as string);
const threeUrl = /from\s+"([^"]*three_webgpu[^"]*)"/.exec(await (await fetch('/src/render/scene.ts')).text())?.[1];
if (!threeUrl) throw new Error('three module URL missing');
const THREE = (await import(threeUrl)) as typeof Three;
const { fallArrival } = await import('/src/fall/arrival.ts' as string);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(fn: () => unknown, what: string, ms = 30000) {
  const deadline = performance.now() + ms;
  while (!fn()) {
    if (performance.now() > deadline) throw new Error(`carry-seating: ${what} timed out`);
    await wait(50);
  }
}
const shot = window as Window & {
  __seatCam?: (k: string) => void;
  __seatMeasure?: () => string;
  __seatReady?: boolean;
};
const logs = Number(new URLSearchParams(location.search).get('seatLogs') ?? 16);
await until(() => railwayCommands()?.read.ready() && me.body && !fallArrival.active, 'the session');
const adapter = railwayCommands()!;
const mine = () => account(adapter.read.world(), adapter.read.pid);
const cap = (kind: number) => capacityOf(adapter.read.world(), kind);
if (cap(0) !== 16 || cap(1) !== 16 || cap(2) !== 8) throw new Error(`capacities ${cap(0)}/${cap(1)}/${cap(2)}`);
/** Presses `act` every 320 ms (past the swing cadence) until `done`, or `limit` presses. */
async function press(act: () => boolean, done: () => boolean, limit: number) {
  for (let k = 0; k < limit && !done(); k++) {
    act();
    await wait(320);
    await until(() => adapter.read.pending() === 0, 'a press settling');
  }
}
// 16 logs (or `seatLogs`) from the nearest standing trees at Home.
for (const tree of inspectRailway().trees.filter(
  (t: { remaining: number; cleared: boolean; id: number }) => t.remaining > 0 && !t.cleared && t.id !== 28,
)) {
  if ((mine()?.carry ?? 0) >= logs) break;
  teleport(me.body!, tree.x + 1.5, H(tree.x + 1.5, tree.z) + 0.5, tree.z);
  await wait(400);
  await press(
    () => adapter.chop(tree.id, 0, false),
    () =>
      (mine()?.carry ?? 0) >= logs ||
      inspectRailway().trees.find((t: { id: number }) => t.id === tree.id)!.remaining <= 0,
    12,
  );
}
// 16 stone from the Works bowl's two rocks.
for (const rock of WORKS_ROCKS) {
  teleport(me.body!, rock.x / 100 + 1.5, rock.y / 100 + 0.8, rock.z / 100);
  await wait(600);
  await press(
    () => adapter.mine(rock.id),
    () => (mine()?.stone ?? 0) >= 16,
    8,
  );
}
// 8 rails off the forge rack (once no Q station takes rails, it gives the cradle's 8).
const rackX = LINE2_FORGE.rackX / 100,
  rackZ = LINE2_FORGE.rackZ / 100;
teleport(me.body!, rackX + 1.2, H(rackX + 1.2, rackZ) + 0.5, rackZ);
await until(() => forge(adapter.read.world()).rack >= 8, 'the forge rack pouring 8 rails', 120000);
await press(
  () => adapter.forgeTake(),
  () => (mine()?.rails ?? 0) >= 8,
  4,
);
// A stroke can land more than `seatLogs` wants: the rest go down here as an accepted drop, out of the stills' frame.
const extra = (mine()?.carry ?? 0) - logs;
if (extra > 0) {
  const p = me.avatar!.position;
  adapter.drop(Math.round((p.x - 1.5) * 100), Math.round(p.y * 100), Math.round(p.z * 100), extra, 0);
  await until(() => adapter.read.pending() === 0 && mine()?.carry === logs, 'the extra logs going down');
}
const a = mine()!;
console.log(`SEATING back ${a.carry} logs, ${a.stone} stone, ${a.rails} rails`);
if (a.carry !== logs || a.stone !== 16 || a.rails !== 8) throw new Error('the back is not full');
// Step to open ground beside the rack and frame Buddy close, behind, beside or three-quarter.
const x = rackX + 4,
  z = rackZ + 3;
teleport(me.body!, x, H(x, z) + 0.5, z);
await wait(1200);
shot.__seatCam = (k: string) => {
  const av = me.avatar!;
  av.updateMatrixWorld();
  const p = av.getWorldPosition(new (av.position.constructor as typeof import('three').Vector3)());
  const back = av.getWorldDirection(new (av.position.constructor as typeof import('three').Vector3)());
  const side = { x: -back.z, z: back.x };
  const d = 4.2;
  const [dx, dz] =
    k === 'back'
      ? [back.x * d, back.z * d]
      : k === 'side'
        ? [side.x * d, side.z * d]
        : [(back.x + side.x) * d * 0.72, (back.z + side.z) * d * 0.72];
  window.__debugCam!.set([p.x + dx, p.y + 1.1, p.z + dz], [p.x, p.y + 0.9, p.z], 35);
};
shot.__seatMeasure = () => {
  const av = me.avatar!;
  av.updateMatrixWorld(true);
  const stone = av.getObjectByName('wear_carried_stone') as Three.InstancedMesh;
  stone.boundingBox = null; // the instances' bounds, measured afresh
  const heap = new THREE.Box3().setFromObject(stone).max.y;
  return `SEATING heap top ${(heap - av.position.y).toFixed(3)} m, head top ${(headwearTop(av) - av.position.y).toFixed(3)} m above the feet`;
};
console.log(shot.__seatMeasure());
shot.__seatCam('three');
shot.__seatReady = true;
export {};
