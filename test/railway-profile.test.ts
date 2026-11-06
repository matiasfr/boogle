// Headless persistence-contract proofs: no UI, DOM, network or historical reward effects.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { railwayClaimWorld } from '../src/entities/railway/reward-data.ts';
import {
  createRailwayProfile,
  MAX_RAILWAY_CLAIMS,
  MAX_RAILWAY_PROFILE_BYTES,
  type RailwayProfileLock,
  type RailwayEntitlement,
} from '../src/railway-profile.ts';

const T1: RailwayEntitlement = { world: 'railway-v1:room-one:g1', station: 'T1', completion: 1 };

test('production namespace changes preserve original short and hashed T1 claim-world identities', () => {
  assert.equal(railwayClaimWorld('room-one'), 't1v02-room-one');
  assert.equal(railwayClaimWorld('abcdefghijklmnopqrstuvwxyz-long-room'), 't1v02-abcdefghijklmnopqr-087rp9t');
});

function setup() {
  const values = new Map<string, string>([['boogle.place.old', 'untouched']]);
  const tails = new Map<string, Promise<unknown>>();
  const exclusive: RailwayProfileLock = <T>(name: string, work: () => T): Promise<T> => {
    const previous = tails.get(name) ?? Promise.resolve();
    const result = previous.then(work, work);
    tails.set(
      name,
      result.catch(() => {}),
    );
    return result;
  };
  let writes = 0;
  let fail = false;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem(key: string, text: string) {
      if (fail) throw new Error('storage refused');
      writes++;
      values.set(key, text);
    },
  };
  const open = (pid = 'alice') => createRailwayProfile({ pid, cosmetics: ['cap', 'scarf'], storage, exclusive });
  return { values, open, writes: () => writes, fail: (v: boolean) => (fail = v) };
}

test('claim and chosen cosmetic persist together before acceptance, without replay on reload', async () => {
  const h = setup();
  const profile = h.open();
  assert.deepEqual(profile.read().claims, []);
  const accepted = await profile.claim(T1, 'cap');
  assert.equal(accepted.status, 'accepted');
  assert.deepEqual(JSON.parse(h.values.get(profile.key)!), accepted.profile);
  assert.deepEqual(h.open().read(), accepted.profile);
  assert.equal(h.writes(), 1);
  const retried = await h.open().claim(T1, 'scarf');
  assert.equal(retried.status, 'claimed');
  assert.equal(retried.claim.cosmetic, 'cap');
  assert.equal(retried.profile.claims.length, 1);
  assert.equal(h.writes(), 1);
  assert.equal(h.values.get('boogle.place.old'), 'untouched');
});

test('refused writes consume neither entitlement nor cosmetic; retry accepts once', async () => {
  const h = setup();
  const profile = h.open();
  h.fail(true);
  await assert.rejects(profile.claim(T1, 'cap'), /storage refused/);
  assert.deepEqual(profile.read().claims, []);
  assert.equal(h.writes(), 0);
  assert.equal(h.values.has(profile.key), false);
  h.fail(false);
  assert.equal((await profile.claim(T1, 'scarf')).status, 'accepted');
  assert.equal(h.open().read().claims[0]?.cosmetic, 'scarf');
  assert.equal(h.writes(), 1);
});

test('T2 adds one independent atomic scarf claim without changing the original T1 entitlement', async () => {
  const h = setup(),
    profile = h.open();
  const first = await profile.claim(T1, 'cap');
  const t2: RailwayEntitlement = { ...T1, station: 'T2' };
  const results = await Promise.all([h.open().claim(t2, 'scarf'), h.open().claim(t2, 'cap')]);
  assert.deepEqual(
    results.map((result) => result.status),
    ['accepted', 'claimed'],
  );
  assert.deepEqual(profile.read().claims, [first.claim, { ...t2, cosmetic: 'scarf' }]);
  assert.equal((await profile.claim(T1, 'scarf')).claim.cosmetic, 'cap');
  assert.equal(h.writes(), 2);
  await assert.rejects(profile.claim({ ...T1, station: 'T3' as 'T1' }, 'scarf'), /Invalid railway/);
});

test('two tabs serialize claim acceptance, while a later visitor has a separate entitlement', async () => {
  const h = setup();
  const results = await Promise.all([h.open().claim(T1, 'cap'), h.open().claim(T1, 'scarf')]);
  assert.deepEqual(
    results.map((r) => r.status),
    ['accepted', 'claimed'],
  );
  assert.equal(h.writes(), 1);
  assert.deepEqual(results[0]?.claim, results[1]?.claim);
  assert.equal((await h.open('bob').claim(T1, 'scarf')).status, 'accepted');
  assert.equal(h.open('bob').read().claims[0]?.cosmetic, 'scarf');
  assert.equal(h.open().read().claims[0]?.cosmetic, 'cap');
});

test('bad, newer, duplicate and over-budget profiles are preserved and never replaced with a fallback', async () => {
  const h = setup();
  const profile = h.open();
  const row = { ...T1, cosmetic: 'cap' };
  for (const text of [
    '{',
    JSON.stringify({ version: 1, claims: [] }),
    JSON.stringify({ version: 0, claims: [row, row] }),
    JSON.stringify({ version: 0, claims: [{ ...row, cosmetic: 'unknown' }] }),
    JSON.stringify({ version: 0, claims: [{ ...row, completion: 0 }] }),
    JSON.stringify({ version: 0, claims: [], extra: true }),
    ' '.repeat(MAX_RAILWAY_PROFILE_BYTES + 1),
  ]) {
    h.values.set(profile.key, text);
    assert.throws(() => profile.read());
    await assert.rejects(profile.claim(T1, 'cap'));
    assert.equal(h.values.get(profile.key), text);
  }
  assert.equal(h.writes(), 0);
});

test('claim retention is bounded without forgetting old entitlements or minting another T1 completion', async () => {
  const h = setup();
  const profile = h.open();
  for (let i = 0; i < MAX_RAILWAY_CLAIMS; i++) await profile.claim({ ...T1, world: `room-${i}` }, 'cap');
  const before = h.values.get(profile.key);
  assert.ok(before && before.length <= MAX_RAILWAY_PROFILE_BYTES);
  await assert.rejects(profile.claim(T1, 'scarf'), /claim limit/);
  assert.equal(h.values.get(profile.key), before);
  assert.equal((await profile.claim({ ...T1, world: 'room-0' }, 'scarf')).status, 'claimed');
  await assert.rejects(profile.claim({ ...T1, completion: 2 as 1 }, 'cap'), /Invalid railway/);
  await assert.rejects(profile.claim(T1, 'unknown'), /Invalid railway/);
  assert.equal(h.writes(), MAX_RAILWAY_CLAIMS);
});

test('the maximum bounded profile fits its byte budget and round-trips without losing claims', async () => {
  const values = new Map<string, string>();
  const cosmetic = 'c'.repeat(64);
  const profile = createRailwayProfile({
    pid: 'p'.repeat(32),
    cosmetics: [cosmetic],
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, text) => void values.set(key, text),
    },
    exclusive: async (_name, work) => work(),
  });
  for (let i = 0; i < MAX_RAILWAY_CLAIMS; i++)
    await profile.claim({ ...T1, world: String(i).padStart(96, 'w') }, cosmetic);
  const text = values.get(profile.key)!;
  assert.ok(new TextEncoder().encode(text).byteLength <= MAX_RAILWAY_PROFILE_BYTES);
  assert.equal(profile.read().claims.length, MAX_RAILWAY_CLAIMS);
});
