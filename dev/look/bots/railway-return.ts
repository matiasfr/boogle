// Real reload proof. sessionStorage holds observations, never a seeded return record.
import { background } from '../../../src/async.ts';
import { me } from '../../../src/player/player.ts';
import { teleport } from '../../../src/physics/engine.ts';
import { jumpOf } from '../../../src/world/railway-jump.ts';
import { railRead } from '../rail-read.ts';

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
    const after = { ...body.position };
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
