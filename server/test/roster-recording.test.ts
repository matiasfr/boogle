// Sync contract: execute identity's real replica-to-recording subscription in two isolated tab contexts.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks, stripTypeScriptTypes } from 'node:module';
import { ROSTER_SNAPSHOT_MS } from '../../src/proto/mark.ts';
import { ROSTER_CHANGE_MS } from '../../src/world/rules/roster.ts';
import { fixture } from './helpers/rail-tune.ts';
type Client = ReturnType<Awaited<ReturnType<typeof fixture>>['join']>;
type Record = { kind: string; fields: { name?: string; count?: number } };
const contexts: { client: Client; records: Record[] }[] = [];
export const context = (id: number) => contexts[id]!;
async function record(client: Client) {
  const id = contexts.length;
  const records: Record[] = [];
  contexts.push({ client, records });
  const url = new URL('../../src/features/identity.ts', import.meta.url);
  url.searchParams.set('roster-recording', String(id));
  const access = `import { context } from ${JSON.stringify(import.meta.url)}; const c = context(${id});`;
  const stubs: { [key: string]: string } = {
    '../world/game-world.ts': `${access} export const railwayMirror=c.client.mirror; export const rules={roster:railwayMirror.roster};`,
    './identity.css': '',
    '../loop.ts': 'export const onFrame=()=>{};',
    '../player/identity.ts': 'export const identity={pid:"test"};',
    '../player/player.ts': 'export const me={};',
    '../math.ts': 'export const sanitizeName=String;',
    '../netplay/net.ts': 'export const addPresenceField=()=>{}; export const onNetState=()=>{}; export const net={};',
    '../world/sync.ts': 'export const worldStatus=()=>({ready:true});',
    '../entities/railway/state.ts': `${access} export const railwayCommands=()=>c.client.adapter;`,
    '../proto/mark.ts': `${stripTypeScriptTypes(readFileSync(new URL('../../src/proto/mark.ts', import.meta.url), 'utf8'))}
      ${access}
      onPlayMark((kind,fields)=>c.records.push({kind,fields}));
      onRosterSnapshot(({rows,tick})=>{
        c.records.push({kind:'roster.begin',fields:{tick,count:rows.length}});
        rows.forEach(([pid,name,color],ordinal)=>c.records.push({kind:'roster.player',fields:{pid,name,color,ordinal,tick}}));
        c.records.push({kind:'roster.end',fields:{tick,count:rows.length}});
      });`,
  };
  const hooks = registerHooks({
    resolve(specifier, ctx, next) {
      if (ctx.parentURL === url.href && Object.hasOwn(stubs, specifier))
        return {
          url: `data:text/javascript;base64,${Buffer.from(stubs[specifier]!).toString('base64')}`,
          shortCircuit: true,
        };
      return next(specifier, ctx);
    },
  });
  try {
    await import(url.href);
  } finally {
    hooks.deregister();
  }
  return records;
}

test('every peer records replicated roster snapshots, including remote edits and changed refills', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const f = await fixture(t);
  const a = f.join('alice');
  const b = f.join('bob');
  const records = [await record(a), await record(b)];
  f.run(3);
  for (const entries of records) entries.length = 0; // complete empty initial snapshot
  a.adapter.act('who.set', { n: 'Ana', c: 2 });
  f.run();
  await f.settled();
  for (const entries of records) {
    assert.deepEqual(
      entries.map((r) => r.kind),
      ['roster.player'],
      'one incremental mark per peer',
    );
    entries.length = 0;
  }
  t.mock.timers.tick(ROSTER_SNAPSHOT_MS);
  for (const entries of records) {
    assert.deepEqual(
      entries.map((r) => r.kind),
      ['roster.begin', 'roster.player', 'roster.end'],
    );
    assert.equal(entries[1]!.fields.name, 'Ana');
    entries.length = 0;
  }
  assert.equal(b.accepted.length, 0, 'the remote recording does not depend on a local receipt');
  f.run(30);
  assert.ok(
    records.every((r) => r.length === 0),
    'unchanged packets do not repeat recordings',
  );
  b.disconnect();
  f.advanceTime(ROSTER_CHANGE_MS);
  a.adapter.act('who.set', { n: 'Annie', c: 3 });
  f.run();
  await f.settled();
  assert.equal(records[1]!.length, 0);
  b.reconnect();
  const late = f.join('late');
  const lateRecords = await record(late);
  f.run(3);
  t.mock.timers.tick(ROSTER_SNAPSHOT_MS);
  for (const entries of [...records, lateRecords]) {
    assert.equal(entries.filter((r) => r.kind === 'roster.player').length, entries === lateRecords ? 1 : 2);
    assert.equal(entries.find((r) => r.kind === 'roster.player')?.fields.name, 'Annie');
    assert.equal(entries.find((r) => r.kind === 'roster.end')?.fields.count, 1);
  }
});
