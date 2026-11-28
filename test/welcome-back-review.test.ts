import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import test from 'node:test';
import type { WelcomeItem } from '../src/player/arrival.ts';
import { buildSeedWorld } from './helpers/rail.ts';

// Load the real welcome registrations with the browser entry points replaced.
const items = new Map<string, WelcomeItem>();
const pids = ['Me', 'Fern'];
const rows: string[][] = [];
let world: ReturnType<typeof buildSeedWorld>['w'] | null = null;
const fixture = {
  add: (item: WelcomeItem) => items.set(item.key, item),
  roster: { roster: { pids }, nameOf: (i: number) => pids[i], indexOf: (pid: string) => pids.indexOf(pid) },
  read: () => world && { status: () => 'ready', world: () => world },
  memory: { items: { friends: { Me: 0 }, laid: 0 } },
  rows,
};
Object.assign(globalThis, { welcomeFixture: fixture, addEventListener() {} });
const stubs: Record<string, string> = {
  'game-world.ts': 'export const rules={roster:f.roster}, railwayMirror=null',
  'welcome-back.css': '',
  'welcome-board.ts': 'export const publishWelcomeRows=rows=>f.rows.push(rows)',
  'entity.ts': 'export const defineKind=()=>{}, spawn=()=>{}, despawn=()=>{}',
  'player.ts': 'export const me={}',
  'identity.ts': "export const identity={pid:'Me'}",
  'net.ts': "export const getRoomId=()=>'island'",
  'sync.ts': 'export const worldStatus=()=>({})',
  'flags.ts': 'export const productionRailway=false',
  'state.ts': 'export const railwayWorldRead=f.read',
  'arrival.ts':
    'export const addWelcomeItem=f.add, roomMemory=()=>f.memory, showCard=()=>false, rememberVisit=()=>{}, welcomeLines=()=>[], nameList=names=>names.join(" and ")',
};
const hook = registerHooks({
  resolve(specifier, context, next) {
    const code = stubs[specifier.split('/').at(-1)!];
    if (context.parentURL?.endsWith('/features/welcome-back.ts') && code !== undefined)
      return {
        shortCircuit: true,
        url: 'data:text/javascript,' + encodeURIComponent('const f=globalThis.welcomeFixture;' + code),
      };
    return next(specifier, context);
  },
});
try {
  await import('../src/features/welcome-back.ts');
} finally {
  hook.deregister();
}
test('a returning player hears about Fern in a room without a railway', () => {
  world = null;
  const lines = [...items.values()].flatMap(
    (item) => item.since(fixture.memory.items[item.key as 'laid' | 'friends']) ?? [],
  );
  assert.match(lines.join(' '), /Fern/);
});
test('progress made during this visit is never labelled while you were away', () => {
  pids.splice(1);
  world = buildSeedWorld('awake').w;
  items.get('laid')!.save();
  assert.equal(rows.at(-1)?.[0], 'Room log');
  world = buildSeedWorld('q1-done').w;
  items.get('laid')!.save();
  assert.equal(rows.at(-1)?.[0], 'Room log');
});
test('a solo room log leaves the player out of the names row', () => {
  pids.splice(1);
  world = buildSeedWorld('awake').w;
  items.get('laid')!.save();
  assert.equal(rows.at(-1)?.[3], 'New friends \u00b7 \u2014');
});
test('a cached client can still compare its numeric laid item after a new client saves', () => {
  world = buildSeedWorld('awake').w;
  const saved = items.get('laid')!.save();
  // The cached client's actual reader only accepts a finite number.
  assert.equal(typeof saved, 'number');
});
test('a friend-only return preserves the card greeting without reporting a track change', () => {
  world = buildSeedWorld('awake').w;
  pids.splice(0, pids.length, 'Me', 'Fern');
  const lines = [...items.values()].flatMap(
    (item) => item.since(fixture.memory.items[item.key as 'laid' | 'friends']) ?? [],
  );
  assert.deepEqual(lines, ['Fern was here']);
});
test('a legacy track baseline still yields the original track sentence on the card', () => {
  world = buildSeedWorld('q1-done').w;
  const lines = items.get('laid')!.since(0);
  assert.equal(lines, '4 new stretches of track were laid');
});
