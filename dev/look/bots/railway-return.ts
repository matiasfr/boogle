// Real reload proof. sessionStorage holds observations, never a seeded return record.
import { background } from '../../../src/async.ts';
import { me } from '../../../src/player/player.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { jumpOf } from '../../../src/world/railway-jump.ts';
import { railRead } from '../rail-read.ts';
import { aboard, platformById, fromPlatform } from '../../../src/physics/platforms.ts';
import { identity } from '../../../src/player/identity.ts';
import { getRoomId } from '../../../src/netplay/net.ts';
import { railwayRoomId } from '../../../src/world/railway-namespace.ts';
import { PLAYER_R } from '../../../src/constants.ts';
import type { ReturnSpot } from '../../../src/place/return-spot.ts';

const KEY = 'look.railway-return';
let started = false;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
async function run() {
  const deadline = performance.now() + 60000;
  while (!me.body || !me.entered || !railRead()?.ready()) {
    if (performance.now() > deadline) throw new Error('railway-return: player and railway never ready');
    await wait(100);
  }
  const body = me.body;
  const previous = sessionStorage.getItem(KEY);
  if (previous) {
    await wait(6000);
    const before = JSON.parse(previous) as { x: number; y: number; z: number };
    const after = { x: body.position.x, y: body.position.y, z: body.position.z };
    const result = { before, after, distance: Math.hypot(after.x - before.x, after.z - before.z) };
    document.documentElement.dataset.railwayReturn = JSON.stringify(result);
    console.log(`RAILWAY RETURN ${JSON.stringify(result)}`);
    sessionStorage.removeItem(KEY);
    return;
  }
  const land = jumpOf('gorge-reached')!.land!;
  // Hold while distance-resident scenery mounts, then stand normally for a full save interval.
  for (let k = 0; k < 50; k++) {
    teleport(body, land.x, land.y + 0.9, land.z);
    body.velocity.set(0, 0, 0);
    await wait(100);
  }
  await wait(6000);
  if (new URLSearchParams(location.search).get('returnSave') === '1') {
    const key = `boogle.railway-pose.v1:${railwayRoomId(getRoomId())}:${identity.pid}`;
    const record = () => JSON.parse(localStorage.getItem(key) ?? 'null') as ReturnSpot | null;
    const platform = record();
    if (!platform || Math.hypot(platform.x - land.x, platform.z - land.z) > 2 || platform.ride)
      throw new Error(`railway-return: no standing Gorge record: ${JSON.stringify(platform)}`);
    const train = platformById('railway:train0-1');
    if (!train) throw new Error('railway-return: train0 passenger deck is not mounted');
    const local = { x: 0, y: (train.topAt?.(0, 0, 99) ?? train.top) + PLAYER_R + 0.15, z: 0, yaw: 0 };
    const at = fromPlatform(train, local, false, { ...local });
    teleport(body, at.x, at.y, at.z);
    body.velocity.set(0, 0, 0);
    await wait(6000);
    if (!aboard()) throw new Error('railway-return: failed to stand aboard the train');
    const riding = record();
    teleport(body, land.x + 120, 1, land.z + 120);
    body.velocity.set(0, 0, 0);
    await wait(6000);
    if (!me.swimming) throw new Error('railway-return: sea probe did not reach swimming');
    const sea = record();
    const same = (p: ReturnSpot | null) =>
      !!p?.ride && p.x === platform.x && p.y === platform.y && p.z === platform.z && p.yaw === platform.yaw;
    if (!same(riding) || !same(sea))
      throw new Error(`railway-return: lost the standing spot: ${JSON.stringify({ platform, riding, sea })}`);
    const result = { platform, riding, sea };
    document.documentElement.dataset.railwayReturn = JSON.stringify(result);
    console.log(`RAILWAY RETURN SAVES ${JSON.stringify(result)}`);
    return;
  }
  const before = { x: body.position.x, y: body.position.y, z: body.position.z };
  console.log(`RAILWAY RETURN BEFORE ${JSON.stringify(before)}`);
  sessionStorage.setItem(KEY, JSON.stringify(before));
  location.reload();
}
export function start() {
  if (started) return;
  started = true;
  background(run(), 'railway-return eval');
}
