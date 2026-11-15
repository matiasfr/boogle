// Independent f83e49fa8 review reproduction. Accepted loose pieces must all render; overflow is recovered.
// node --import ./test/helpers/rail-no-audit.ts dev/look/review-heavy-load-piles.ts
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { startStack, launch, Game, reportGfxErrors } from './lib.ts';
import { seedDoc } from './ring-mid-seed.ts';
import { createStore } from '../../server/src/store.ts';
import { railwayRoomId } from '../../src/world/railway-namespace.ts';
import { SERVER_ID } from '../../src/net/ids.ts';
import { buildSeedWorld } from '../../src/sim/railway-seeds.ts';
import { apply, invariant, restore } from '../../src/sim/railway-drive.ts';
import { account, trees, piles, rail } from '../../src/sim/railway-rows.ts';
import { RAILWAY_SOURCES } from '../../src/sim/railway-layout.ts';
const seed = buildSeedWorld('awake');
const send = (op: string, fields: Record<string, number | boolean> = {}) => {
  const a = account(seed.w, 'a')!;
  return apply(seed.w, 'a', { op, epoch: a.epoch, request: a.request + 1, ...fields }, seed.t).accepted;
};
for (let i = 0; i < 129; i++) {
  while (account(seed.w, 'a')!.carry < 8) {
    const k = trees(seed.w).findIndex((t) => t.left > 0);
    assert.ok(send('rail.chop', { id: RAILWAY_SOURCES[k]![0], yaw: 0, collapsed: false }));
  }
  assert.equal(send('rail.drop', { n: 8, kind: 0, x: 90000 + (i % 16) * 10, z: Math.floor(i / 16) * 10, y: 0 }), 8);
}
assert.equal(invariant(seed.w), null);
assert.equal(restore(seed.w).hash(), seed.w.hash());
assert.equal(
  piles(seed.w).reduce((n, p) => n + p.n, rail(seed.w).rack),
  1032,
  'all accepted logs remain stored',
);
assert.equal(rail(seed.w).rack, 8, 'the oldest eight logs returned to the recovery rack');
console.log(
  'REVIEW piles',
  piles(seed.w).length,
  'logs',
  piles(seed.w).reduce((n, p) => n + p.n, 0),
  'save bytes',
  JSON.stringify(seed.w.snapshot()).length,
);
const stack = await startStack();
let browser: Awaited<ReturnType<typeof launch>> | undefined;
try {
  const store = createStore({ dataDir: stack.dataDir!, maxRooms: 2 });
  await store.init();
  const doc = await seedDoc(seed);
  assert.equal(
    (
      await store.write(railwayRoomId('review-piles'), {
        ...doc,
        writerId: SERVER_ID,
        updatedAt: new Date().toISOString(),
      })
    ).status,
    200,
  );
  browser = await launch();
  const g = await Game.open(browser, stack, { room: 'review-piles', sourceImports: true, hud: true, warp: false });
  await g.eval(`const {railwayCommands}=await import('/src/entities/railway/state.ts');
    while(!railwayCommands()?.read.ready())await new Promise(r=>setTimeout(r,50));
    await new Promise(r=>setTimeout(r,2000));`);
  const result = await g.eval(`const {scene}=await import('/src/render/scene.ts');
    const {railwayCommands}=await import('/src/entities/railway/state.ts');
    const {piles,rail}=await import('/src/sim/railway-rows.ts');
    const meshes=[];scene.traverse(o=>{if(o.isInstancedMesh&&o.instanceMatrix.count===1024)meshes.push({name:o.name,drawn:o.count,capacity:o.instanceMatrix.count,visible:o.visible});});
    return {piles:piles(railwayCommands().read.world()).length,logs:piles(railwayCommands().read.world()).reduce((n,p)=>n+p.n,0),recovered:rail(railwayCommands().read.world()).rack,meshes};`);
  console.log('REVIEW DRAW', JSON.stringify(result));
  await fs.writeFile('.look/review-pile-draw.json', JSON.stringify(result, null, 2));
  reportGfxErrors([g]);
  assert.equal(g.healthErrors().length, 0);
  const r = result as { logs: number; recovered: number; meshes: { name: string; drawn: number; visible: boolean }[] };
  assert.equal(r.logs + r.recovered, 1032, 'reload retains both loose and recovered logs');
  const logs = r.meshes.find((m) => m.visible && (m.name.includes('log') || m.name === 'haul pieces'))!;
  assert.ok(logs, 'live cargo mesh found');
  assert.equal(logs.drawn, r.logs, 'review: every accepted log remains visible after reload');
} finally {
  await browser?.close();
  await stack.close();
}
