import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WORLD_SEEN_KEY,
  staleKeys,
  pruneClaims,
  resetForWorld,
  pruneProfiles,
  roomReborn,
  resetForRoom,
} from '../src/player/world-reset.ts';

function storage(seed: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(seed));
  return {
    get length() {
      return values.size;
    },
    key: (i) => [...values.keys()][i] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
    clear: () => values.clear(),
  };
}
const ns = { world: 'v19', rail: 'rail-v19' };
const claim = (world: string) => ({ world, station: 'T1', completion: 1, cosmetic: 'hat' });
const profile = (...worlds: string[]) => JSON.stringify({ version: 0, claims: worlds.map(claim) });

test('first boot prunes only stale namespaced progress and writes the world marker', () => {
  const s = storage({
    'boogle.visit.a': 'keep',
    'boogle.boogler': 'keep',
    'boogle.railway-seen.v0:rail-v18-a:p': 'old',
  });
  assert.deepEqual(resetForWorld(s, ns).removed, ['boogle.railway-seen.v0:rail-v18-a:p']);
  assert.equal(s.getItem(WORLD_SEEN_KEY), ns.world);
  assert.equal(s.getItem('boogle.visit.a'), 'keep');
  assert.equal(s.getItem('boogle.boogler'), 'keep');
});

test('only the first boot after a world bump starts the game over', () => {
  assert.equal(resetForWorld(storage({ 'boogle.name': 'Ana' }), ns).newWorld, false, 'no marker yet');
  const s = storage({ 'boogle.name': 'Ana', [WORLD_SEEN_KEY]: 'v18' });
  assert.equal(resetForWorld(s, ns).newWorld, true);
  assert.equal(resetForWorld(s, ns).newWorld, false, 'a reload in the same world is a returning visit');
  assert.equal(s.getItem('boogle.name'), 'Ana', 'the name stays to pre-fill the card');
});

test('same-world boots keep progress', () => {
  assert.deepEqual(
    staleKeys(['boogle.visit.a', 'boogle.boogler', 'boogle.railway-pose.v0:rail-v19-a:p'], 'v19', ns),
    [],
  );
});

test('v0 and v1 return spots obey room and world reset boundaries', () => {
  const mine = ['boogle.railway-pose.v0:rail-v19-a:p', 'boogle.railway-pose.v1:rail-v19-a:p'];
  const other = 'boogle.railway-pose.v1:rail-v19-ab:p';
  const s = storage(Object.fromEntries([...mine, other].map((key) => [key, 'value'])));
  assert.deepEqual(staleKeys([...mine, other], 'v19', ns), []);
  assert.deepEqual(resetForRoom(s, 'rail-v19-a', 'a').sort(), mine);
  assert.equal(s.getItem(other), 'value');
  assert.deepEqual(staleKeys([...mine, other], 'v19', { world: 'v20', rail: 'rail-v20' }), [...mine, other]);
});

test('a world bump clears the old world wardrobe and keeps this one', () => {
  const s = storage({
    'boogle.railway-wardrobe.v0:rail-v18-a:p': 'old',
    'boogle.railway-wardrobe.v0:rail-v19-a:p': 'mine',
  });
  assert.deepEqual(resetForWorld(s, ns).removed, ['boogle.railway-wardrobe.v0:rail-v18-a:p']);
  assert.equal(s.getItem('boogle.railway-wardrobe.v0:rail-v19-a:p'), 'mine');
});

test('town memory from an old rail namespace is removed', () => {
  assert.deepEqual(
    staleKeys(['boogle.railway-town.v0:rail-v18-a:p', 'boogle.railway-town.v0:rail-v19-a:p'], 'v19', ns),
    ['boogle.railway-town.v0:rail-v18-a:p'],
  );
});

test('found crystals and finds from an old rail namespace are removed', () => {
  assert.deepEqual(
    staleKeys(['boogle.railway-finds.v0:rail-v18-a:p', 'boogle.railway-finds.v0:rail-v19-a:p'], 'v19', ns),
    ['boogle.railway-finds.v0:rail-v18-a:p'],
  );
});

test("a jump room's seen arrival line from an old rail namespace is removed", () => {
  assert.deepEqual(
    staleKeys(
      ['boogle.jump.seen.v1:rail-v18-q1-done-a1b2c3', 'boogle.jump.seen.v1:rail-v19-q1-done-a1b2c3'],
      'v19',
      ns,
    ),
    ['boogle.jump.seen.v1:rail-v18-q1-done-a1b2c3'],
  );
});

test('several missed wipes reset all old-world progress, keeping identity, preferences and unrelated data', () => {
  const keep = [
    'boogle.name',
    'boogle.color',
    'boogle.pid',
    'boogle.key',
    'boogle.lastVisit',
    'boogle.graphics.v1',
    'boogle.detail.v1',
    'boogle.resolution',
    'boogle.volume',
    'boogle.muted',
    'boogle.loadDetails',
    'boogle.lastLaunch',
    'boogle.dev.any',
    'boogle.water-tuning.v1',
    'boogle.minis.any',
    'boogle-place-v4:a',
    'boogle-place-coop-v2:a',
    'boogle.world.any',
    'boogle.railway-seen.v0:rail-v22-a:p',
    'boogle.railway-pose.v0:rail-v22-a:p',
  ];
  const remove = [
    'boogle.visit.a',
    'boogle.visit.b',
    'boogle.boogler',
    ...['v16', 'v18', 'v21'].flatMap((v) => [
      `boogle.railway-seen.v0:rail-${v}-a:p`,
      `boogle.railway-pose.v0:rail-${v}-a:p`,
    ]),
    'boogle.railway-seen.v0:v22-a:p',
  ];
  const s = storage(Object.fromEntries([...keep, ...remove].map((key) => [key, 'value'])));
  s.setItem(WORLD_SEEN_KEY, 'v16');
  assert.deepEqual(resetForWorld(s, { world: 'v22', rail: 'rail-v22' }).removed, remove);
  for (const key of keep) assert.equal(s.getItem(key), 'value', key);
  for (const key of remove) assert.equal(s.getItem(key), null, key);
  assert.equal(s.getItem(WORLD_SEEN_KEY), 'v22');
});

test('claims prune only old worlds and preserve malformed profiles', () => {
  assert.equal(pruneClaims(profile('rail-v18-a', 'rail-v19-a'), ns.rail), profile('rail-v19-a'));
  assert.equal(pruneClaims(profile('rail-v18-a'), ns.rail), null);
  assert.equal(pruneClaims(profile('rail-v19-a'), ns.rail), undefined);
  for (const text of [
    'bad',
    'null',
    '{}',
    '{"version":1,"claims":[]}',
    '{"version":0,"claims":[{}]}',
    JSON.stringify({ version: 0, claims: [claim('rail-v18-a'), claim('rail-v18-a')] }),
  ])
    assert.equal(pruneClaims(text, ns.rail), undefined);
});

test('blocked storage never throws out of reset', () => {
  const s = storage({ 'boogle.visit.a': 'old', [WORLD_SEEN_KEY]: 'v18' });
  s.removeItem = () => {
    throw new Error('blocked');
  };
  assert.doesNotThrow(() => resetForWorld(s, ns));
  s.getItem = s.setItem = () => {
    throw new Error('blocked');
  };
  Object.defineProperty(s, 'length', {
    get() {
      throw new Error('blocked');
    },
  });
  assert.doesNotThrow(() => resetForWorld(s, ns));
});

test('profiles require a lock, re-read inside it and tolerate rejected locks', async () => {
  const key = 'boogle.railway-profile.v0.p';
  const s = storage({ [key]: profile('rail-v18-a') });
  await pruneProfiles(s, undefined, ns.rail);
  assert.equal(s.getItem(key), profile('rail-v18-a'));
  const locks = {
    request: async (name: string, options: LockOptions, work: () => void) => {
      assert.equal(name, key);
      assert.equal(options.mode, 'exclusive');
      s.setItem(key, profile('rail-v18-a', 'rail-v19-a'));
      work();
    },
  } as unknown as LockManager;
  await pruneProfiles(s, locks, ns.rail);
  assert.equal(s.getItem(key), profile('rail-v19-a'));
  const denied = { request: () => Promise.reject(new Error('denied')) } as unknown as LockManager;
  await assert.doesNotReject(pruneProfiles(s, denied, ns.rail));
  const immediate = {
    request: async (_name: string, _options: LockOptions, work: () => void) => work(),
  } as unknown as LockManager;
  s.setItem(key, profile('rail-v18-a'));
  await pruneProfiles(s, immediate, ns.rail);
  assert.equal(s.getItem(key), null);
});

test('a room is reborn only when its world changed since this browser last joined', () => {
  const s = storage();
  assert.equal(roomReborn(s, 'rail-v19-a', 'aaa'), false, 'first sight is not a reset');
  assert.equal(roomReborn(s, 'rail-v19-a', 'aaa'), false);
  assert.equal(roomReborn(s, 'rail-v19-b', 'bbb'), false, 'another room has its own world');
  assert.equal(roomReborn(s, 'rail-v19-a', 'ccc'), true);
  assert.equal(roomReborn(s, 'rail-v19-a', 'ccc'), false, 'only once');
  assert.deepEqual(resetForWorld(s, { world: 'v20', rail: 'rail-v20' }).removed.sort(), [
    'boogle.room-born.v0:rail-v19-a',
    'boogle.room-born.v0:rail-v19-b',
  ]);
});

test('a room reset forgets that room only, and its reward claims', () => {
  const s = storage({
    'boogle.name': 'Ana',
    'boogle.boogler': 'gone',
    'boogle.visit.a': 'gone',
    'boogle.visit.ab': 'keep',
    'boogle.room-born.v0:rail-v19-a': 'keep',
    'boogle.railway-pose.v0:rail-v19-a:p': 'gone',
    'boogle.railway-wardrobe.v0:rail-v19-a:p': 'gone',
    'boogle.jump.seen.v1:rail-v19-a': 'gone',
    'boogle.railway-pose.v0:rail-v19-ab:p': 'keep',
  });
  assert.deepEqual(resetForRoom(s, 'rail-v19-a', 'a').sort(), [
    'boogle.boogler',
    'boogle.jump.seen.v1:rail-v19-a',
    'boogle.railway-pose.v0:rail-v19-a:p',
    'boogle.railway-wardrobe.v0:rail-v19-a:p',
    'boogle.visit.a',
  ]);
  assert.equal(pruneClaims(profile('rail-v19-a', 'rail-v19-ab'), 'rail-v19', 'rail-v19-a'), profile('rail-v19-ab'));
  assert.equal(pruneClaims(profile('rail-v19-a'), 'rail-v19', 'rail-v19-a'), null);
});
